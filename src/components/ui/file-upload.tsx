import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LucideUploadCloud, LucideCamera, LucideFile, LucideX, LucideCheck } from 'lucide-react-native';
import { api, UPLOAD_FILE_PATH } from '../../lib/api';
import { SecureStorage } from '../../lib/storage';
import { AUTH_TOKEN_KEY } from '../../lib/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface UploadedFile {
    uri: string;
    name: string;
    type: string;
    size: number;
    serverPath?: string;
}

interface FileUploadProps {
    label?: string;
    onUpload?: (file: UploadedFile) => void;
    onRemove?: () => void;
    initialFile?: UploadedFile | null;
    accept?: string[];
    error?: string;
    disabled?: boolean;
    allowMultiple?: boolean;
}

export function FileUpload({
    label,
    onUpload,
    onRemove,
    initialFile = null,
    accept = ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    error,
    disabled = false,
    allowMultiple = false,
}: FileUploadProps) {
    const [file, setFile] = useState<UploadedFile | null>(initialFile);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const isFileTypeAllowed = (mimeType: string): boolean => {
        if (accept.includes('*/*')) return true;
        return accept.some(accepted => {
            if (accepted.endsWith('/*')) {
                const prefix = accepted.replace('/*', '');
                return mimeType.startsWith(prefix);
            }
            return accepted === mimeType;
        });
    };

    const pickFromGallery = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant gallery access to upload files.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await handleSelectedAsset(result.assets[0]);
        }
    }, []);

    const pickFromCamera = useCallback(async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera access to capture photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await handleSelectedAsset(result.assets[0]);
        }
    }, []);

    const pickFromDocuments = useCallback(async () => {
        try {
            if (Platform.OS === 'android') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Please grant storage access to upload documents.');
                    return;
                }
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: accept,
                copyToCacheDirectory: true,
                multiple: allowMultiple,
            });

            if (result.canceled) {
                return;
            }

            const assets = result.assets || [];

            if (assets.length > 0) {
                const asset = assets[0];

                if (!isFileTypeAllowed(asset.mimeType || '')) {
                    Alert.alert(
                        'Invalid File Type',
                        `Please select a valid file type: ${accept.join(', ')}`
                    );
                    return;
                }

                const fileSize = asset.size || 0;
                if (fileSize > MAX_FILE_SIZE) {
                    Alert.alert('File Too Large', 'File must be under 5 MB.');
                    return;
                }

                const uploadFile: UploadedFile = {
                    uri: asset.uri,
                    name: asset.name || `document_${Date.now()}`,
                    type: asset.mimeType || 'application/octet-stream',
                    size: fileSize,
                };

                setFile(uploadFile);
                await uploadToServer(uploadFile);
            }
        } catch (error) {
            console.error('Document picker error:', error);
            Alert.alert('Error', 'Failed to pick document. Please try again.');
        }
    }, [accept, allowMultiple]);

    const handleSelectedAsset = async (asset: ImagePicker.ImagePickerAsset) => {
        const fileSize = asset.fileSize || 0;
        if (fileSize > MAX_FILE_SIZE) {
            Alert.alert('File Too Large', 'File must be under 5 MB.');
            return;
        }

        const fileName = asset.fileName || `upload_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        const uploadFile: UploadedFile = {
            uri: asset.uri,
            name: fileName,
            type: mimeType,
            size: fileSize,
        };

        setFile(uploadFile);
        await uploadToServer(uploadFile);
    };

    const uploadToServer = async (fileToUpload: UploadedFile) => {
        setUploading(true);
        setProgress(0);

        try {
            const baseURL = api.defaults.baseURL?.replace(/\/+$/, '');

            if (!baseURL) {
                throw new Error('API base URL is not configured.');
            }

            const uploadPath = UPLOAD_FILE_PATH.replace(/^\/+/, '');
            const uploadUrl = `${baseURL}/${uploadPath}`;

            const accessToken = await SecureStorage.getItem(AUTH_TOKEN_KEY);

            if (!accessToken) {
                throw new Error('Authentication token is missing. Please log in again.');
            }

            if (fileToUpload.size > MAX_FILE_SIZE) {
                throw new Error('The selected file exceeds the 5MB upload limit.');
            }

            const formData = new FormData();

            // ✅ Directly append the file as an object (React Native way)
            // This works without creating a File object
            formData.append('file', {
                uri: fileToUpload.uri,
                name: fileToUpload.name,
                type: fileToUpload.type,
            } as any);

            console.log('[FILE UPLOAD START]', {
                uploadUrl,
                uri: fileToUpload.uri,
                fileName: fileToUpload.name,
                fileSize: fileToUpload.size,
                mimeType: fileToUpload.type,
            });

            // ✅ Use fetch (not axios) - this works!
            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'X-Client-Type': 'mobile',
                },
                body: formData,
            });

            const responseText = await uploadResponse.text();

            console.log('[FILE UPLOAD RESPONSE]', {
                status: uploadResponse.status,
                ok: uploadResponse.ok,
                responseText: responseText.substring(0, 200),
            });

            let uploadBody;
            try {
                uploadBody = responseText ? JSON.parse(responseText) : undefined;
            } catch {
                throw new Error(`Upload server returned an invalid response with status ${uploadResponse.status}.`);
            }

            if (!uploadResponse.ok || !uploadBody?.success || !uploadBody.data) {
                const message = uploadBody?.error?.message ||
                    uploadBody?.message ||
                    `File upload failed with status ${uploadResponse.status}`;
                throw new Error(message);
            }

            const uploadedFile = uploadBody.data;

            const serverPath = uploadedFile.filePath ||
                uploadedFile.path ||
                uploadedFile.url;

            const uploaded: UploadedFile = {
                ...fileToUpload,
                serverPath,
                name: uploadedFile.fileName || fileToUpload.name,
                size: uploadedFile.size || fileToUpload.size,
            };

            setFile(uploaded);
            onUpload?.(uploaded);

        } catch (err: any) {
            console.error('[FILE UPLOAD ERROR]', {
                message: err.message,
                stack: err.stack,
            });

            // Handle specific error cases
            if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
                Alert.alert(
                    'Session Expired',
                    'Your session has expired. Please log in again.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Navigate to login
                            }
                        }
                    ]
                );
            } else if (err.message?.includes('timeout') || err.message?.includes('slow')) {
                Alert.alert('Upload Timeout', 'The upload took too long. Please try again with a smaller file.');
            } else if (err.message?.includes('Network') || err.message?.includes('internet')) {
                Alert.alert('Network Error', 'Please check your internet connection and try again.');
            } else {
                Alert.alert('Upload Error', err.message || 'Failed to upload file. Please try again.');
            }
            removeFile();
        } finally {
            setUploading(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        setProgress(0);
        onRemove?.();
    };

    const showPicker = () => {
        const options: any[] = [];

        const acceptsImages = accept.some(a => a.startsWith('image/'));
        const acceptsDocuments = accept.some(a =>
            a.includes('pdf') ||
            a.includes('document') ||
            a.includes('word') ||
            a.includes('text')
        );

        if (acceptsImages) {
            options.push(
                { text: 'Take Photo', onPress: pickFromCamera },
                { text: 'Choose from Gallery', onPress: pickFromGallery }
            );
        }

        if (acceptsDocuments) {
            options.push(
                { text: 'Choose Document', onPress: pickFromDocuments }
            );
        }

        if (options.length === 0) {
            options.push(
                { text: 'Take Photo', onPress: pickFromCamera },
                { text: 'Choose from Gallery', onPress: pickFromGallery },
                { text: 'Choose Document', onPress: pickFromDocuments }
            );
        }

        options.push({ text: 'Cancel', style: 'cancel' });

        Alert.alert('Upload File', 'Choose a source', options);
    };

    const isImage = file?.type?.startsWith('image/');

    return (
        <View className="mb-4">
            {label && <Text className="text-sm font-medium text-foreground mb-2">{label}</Text>}

            {file ? (
                <View className="border border-border rounded-lg overflow-hidden bg-card">
                    {isImage && file.uri && (
                        <Image
                            source={{ uri: file.uri }}
                            className="w-full h-40"
                            resizeMode="cover"
                        />
                    )}
                    <View className="p-3 flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 mr-2">
                            {!isImage && <LucideFile size={20} color="hsl(325 45% 32%)" />}
                            <View className="ml-2 flex-1">
                                <Text className="text-sm text-foreground" numberOfLines={1}>
                                    {file.name}
                                </Text>
                                <Text className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                </Text>
                            </View>
                        </View>

                        {uploading ? (
                            <View className="flex-row items-center">
                                <ActivityIndicator size="small" color="hsl(325 45% 32%)" />
                                <Text className="text-xs text-primary ml-2">{progress}%</Text>
                            </View>
                        ) : file.serverPath ? (
                            <View className="flex-row items-center">
                                <LucideCheck size={16} color="hsl(142 72% 29%)" />
                                <Text className="text-xs text-success ml-1">Uploaded</Text>
                            </View>
                        ) : null}

                        {!uploading && !disabled && (
                            <TouchableOpacity
                                onPress={removeFile}
                                className="ml-2 p-1"
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <LucideX size={18} color="hsl(0 72% 38%)" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {uploading && (
                        <View className="h-1 bg-muted">
                            <View
                                className="h-1 bg-primary"
                                style={{ width: `${progress}%` }}
                            />
                        </View>
                    )}
                </View>
            ) : (
                <TouchableOpacity
                    className={`border-2 border-dashed rounded-lg p-6 items-center justify-center ${error ? 'border-error' : 'border-border'
                        } ${disabled ? 'opacity-50' : ''}`}
                    onPress={showPicker}
                    disabled={disabled || uploading}
                    activeOpacity={0.7}
                >
                    <LucideUploadCloud size={32} color="hsl(220 9% 46%)" />
                    <Text className="text-sm text-muted-foreground mt-2 text-center">
                        Tap to upload a file
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                        {accept.includes('image/*') && 'Images · '}
                        {accept.some(a => a.includes('pdf')) && 'PDF · '}
                        {accept.some(a => a.includes('document') || a.includes('word')) && 'Documents · '}
                        Max 5 MB
                    </Text>
                </TouchableOpacity>
            )}

            {error && <Text className="text-xs text-error mt-1">{error}</Text>}
        </View>
    );
}