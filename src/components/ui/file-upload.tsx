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
import { LucideUploadCloud, LucideCamera, LucideFile, LucideX, LucideCheck, LucideFolderOpen } from 'lucide-react-native';
import { api, UPLOAD_FILE_PATH } from '../../lib/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface UploadedFile {
    uri: string;
    name: string;
    type: string;
    size: number;
    serverPath?: string; // Path returned from the upload API
}

interface FileUploadProps {
    /** Label displayed above the upload area */
    label?: string;
    /** Called when a file is successfully uploaded to the server */
    onUpload?: (file: UploadedFile) => void;
    /** Called when the file is removed */
    onRemove?: () => void;
    /** An already-uploaded file to display as the initial state */
    initialFile?: UploadedFile | null;
    /** Accepted MIME types */
    accept?: string[];
    /** Error message to display */
    error?: string;
    /** Disable the upload area */
    disabled?: boolean;
    /** Allow multiple file types */
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

    // Check if file type is allowed
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

    // Pick from gallery (images only)
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

    // Pick from camera (images only)
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

    // Pick from documents (PDF, Word, etc.)
    const pickFromDocuments = useCallback(async () => {
        try {
            // Request permissions for Android
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
            
            // Handle single or multiple files
            if (assets.length > 0) {
                // For now, handle only the first file
                // If you need multiple files, you'll need to modify the state to handle arrays
                const asset = assets[0];
                
                // Validate file type
                if (!isFileTypeAllowed(asset.mimeType || '')) {
                    Alert.alert(
                        'Invalid File Type',
                        `Please select a valid file type: ${accept.join(', ')}`
                    );
                    return;
                }

                // Validate file size
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
            const formData = new FormData();
            
            // For React Native, we need to append the file properly
            const fileData: any = {
                uri: fileToUpload.uri,
                name: fileToUpload.name,
                type: fileToUpload.type,
            };
            
            formData.append('file', fileData);

            const response = await api.post(UPLOAD_FILE_PATH, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(pct);
                    }
                },
            });

            if (response.data.success) {
                const serverPath = response.data.data?.filePath || 
                                  response.data.data?.path || 
                                  response.data.data?.url;
                const uploaded: UploadedFile = { ...fileToUpload, serverPath };
                setFile(uploaded);
                onUpload?.(uploaded);
            } else {
                Alert.alert('Upload Failed', response.data.error?.message || 'Could not upload file.');
                removeFile();
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            Alert.alert('Upload Error', err.response?.data?.error?.message || 'Failed to upload file.');
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
        // Build options based on what's accepted
        const options: any[] = [];
        
        // If images are accepted, show camera and gallery
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

        // If no specific types, show all options
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
                /* ───── File Preview ───── */
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

                    {/* Upload progress bar */}
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
                /* ───── Upload Area ───── */
                <TouchableOpacity
                    className={`border-2 border-dashed rounded-lg p-6 items-center justify-center ${
                        error ? 'border-error' : 'border-border'
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