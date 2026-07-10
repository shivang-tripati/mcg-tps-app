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
import { LucideUploadCloud, LucideCamera, LucideFile, LucideX, LucideCheck } from 'lucide-react-native';
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
    accept?: ('image/*' | 'application/pdf')[];
    /** Error message to display */
    error?: string;
    /** Disable the upload area */
    disabled?: boolean;
}

export function FileUpload({
    label,
    onUpload,
    onRemove,
    initialFile = null,
    accept = ['image/*', 'application/pdf'],
    error,
    disabled = false,
}: FileUploadProps) {
    const [file, setFile] = useState<UploadedFile | null>(initialFile);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

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
            formData.append('file', {
                uri: fileToUpload.uri,
                name: fileToUpload.name,
                type: fileToUpload.type,
            } as any);

            const response = await api.post(UPLOAD_FILE_PATH, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(pct);
                    }
                },
            });

            if (response.data.success) {
                const serverPath = response.data.data?.filePath || response.data.data?.path || response.data.data?.url;
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
        Alert.alert('Upload File', 'Choose a source', [
            { text: 'Camera', onPress: pickFromCamera },
            { text: 'Gallery', onPress: pickFromGallery },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const isImage = file?.type?.startsWith('image/');

    return (
        <View className="mb-4">
            {label && <Text className="text-sm font-medium text-foreground mb-2">{label}</Text>}

            {file ? (
                /* ───── File Preview ───── */
                <View className="border border-border rounded-lg overflow-hidden bg-card">
                    {isImage && (
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
                        Tap to upload a photo or document
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                        Images or PDF · Max 5 MB
                    </Text>
                </TouchableOpacity>
            )}

            {error && <Text className="text-xs text-error mt-1">{error}</Text>}
        </View>
    );
}
