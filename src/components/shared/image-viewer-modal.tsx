import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, Modal,
    Alert,
    Platform, ActivityIndicator
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

import {
    LucideX,
    LucideDownload,
    LucideShare2
} from 'lucide-react-native';
;

interface ImageViewerModalProps {
    visible: boolean;
    onClose: () => void;
    images: { url: string; fileName?: string }[];
    initialIndex?: number;
}

export default function ImageViewerModal({
    visible,
    onClose,
    images,
    initialIndex = 0
}: ImageViewerModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isLoading, setIsLoading] = useState(false);

    // Get the document directory - FIXED
    const getDocumentDirectory = () => {
        // In Expo, documentDirectory is available directly
        if (FileSystem.documentDirectory) {
            return FileSystem.documentDirectory;
        }
        // Fallback for older versions
        return FileSystem.documentDirectory || `${FileSystem.cacheDirectory}downloads/`;
    };

    const handleDownload = async () => {
        try {
            setIsLoading(true);
            const imageUrl = images[currentIndex]?.url;
            if (!imageUrl) return;

            // Request permission for media library
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to save images.');
                return;
            }

            // Download the image
            const fileName = images[currentIndex]?.fileName || `image_${Date.now()}.jpg`;
            const fileUri = `${getDocumentDirectory()}${fileName}`;

            const downloadResult = await FileSystem.downloadAsync(
                imageUrl,
                fileUri
            );

            if (downloadResult.status === 200) {
                // Save to media library
                const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
                await MediaLibrary.createAlbumAsync('Download', asset, false);

                Alert.alert('Success', 'Image saved to gallery!');
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to download image. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            const imageUrl = images[currentIndex]?.url;
            if (!imageUrl) return;

            // For sharing, we need to download the file first
            setIsLoading(true);
            const fileName = images[currentIndex]?.fileName || `image_${Date.now()}.jpg`;
            const fileUri = `${getDocumentDirectory()}${fileName}`;

            const downloadResult = await FileSystem.downloadAsync(
                imageUrl,
                fileUri
            );

            if (downloadResult.status === 200 && (await Sharing.isAvailableAsync())) {
                await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Share Image',
                });
            } else {
                throw new Error('Share failed');
            }
        } catch (error) {
            console.error('Share error:', error);
            if (error instanceof Error && error.message !== 'User cancelled') {
                Alert.alert('Error', 'Failed to share image. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fixed renderIndicator - must return ReactElement
    const renderIndicator = (currentIndex?: number, allSize?: number) => {
        if (!allSize || allSize <= 1) {
            return <View />;
        }

        return (
            <View className="absolute bottom-20 left-0 right-0 flex-row justify-center items-center">
                <View className="bg-black/50 px-4 py-2 rounded-full">
                    <Text className="text-white text-sm">
                        {(currentIndex || 0) + 1} / {allSize}
                    </Text>
                </View>
            </View>
        );
    };

    const renderHeader = () => (
        <View className="absolute top-0 left-0 right-0 z-50 flex-row justify-between items-center p-4 bg-black/50" style={{ paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
            <TouchableOpacity onPress={onClose} className="p-2">
                <LucideX size={24} color="white" />
            </TouchableOpacity>

            <Text className="text-white text-sm font-medium">
                {(currentIndex || 0) + 1} / {images.length}
            </Text>

            <View className="flex-row">
                <TouchableOpacity onPress={handleShare} className="p-2 mr-2">
                    <LucideShare2 size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDownload} className="p-2">
                    <LucideDownload size={22} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderFooter = () => (
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-black/50">
            <Text className="text-white text-sm text-center" numberOfLines={2}>
                {images[currentIndex || 0]?.fileName || 'Image'}
            </Text>
        </View>
    );

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black">
                {renderHeader()}

                <ImageViewer
                    imageUrls={images.map(img => ({
                        url: img.url,
                        props: { source: { uri: img.url } }
                    }))}
                    index={initialIndex}
                    onSwipeDown={onClose}
                    enableSwipeDown={true}
                    saveToLocalByLongPress={false}
                    loadingRender={() => (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="white" />
                        </View>
                    )}
                    renderIndicator={renderIndicator}
                    onChange={(index?: number) => {
                        if (index !== undefined) {
                            setCurrentIndex(index);
                        }
                    }}
                    style={{ backgroundColor: 'black' }}
                    backgroundColor="black"
                />

                {renderFooter()}

                {isLoading && (
                    <View className="absolute inset-0 bg-black/50 justify-center items-center">
                        <ActivityIndicator size="large" color="white" />
                    </View>
                )}
            </View>
        </Modal>
    );
}
