import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { CameraView, Camera } from 'expo-camera';
import { LucideScan, LucideX } from 'lucide-react-native';

export default function ScanScreen() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        setScanned(true);

        // Try to extract permit ID from QR code data
        // Expected format: https://example.com/permits/{id} or just the ID
        const permitIdMatch = data.match(/permits\/([a-f0-9-]{36})/i) || data.match(/^([a-f0-9-]{36})$/i);

        if (permitIdMatch) {
            const permitId = permitIdMatch[1];
            Alert.alert(
                'Permit Found',
                'Navigate to permit details?',
                [
                    { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
                    {
                        text: 'View',
                        onPress: () => router.push(`/permits/${permitId}` as any)
                    },
                ]
            );
        } else {
            Alert.alert(
                'Invalid QR Code',
                'This does not appear to be a valid permit QR code.',
                [{ text: 'OK', onPress: () => setScanned(false) }]
            );
        }
    };

    if (hasPermission === null) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <Text className="text-foreground">Requesting camera permission...</Text>
            </SafeAreaView>
        );
    }

    if (hasPermission === false) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
                <LucideX size={64} color="hsl(0 72% 38%)" />
                <Text className="text-foreground text-xl font-bold mt-4">No Camera Access</Text>
                <Text className="text-muted-foreground mt-2 text-center">
                    Please enable camera permissions in your device settings to scan QR codes.
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 pt-4 pb-3 bg-primary">
                <Text className="text-white text-2xl font-bold">Scan QR Code</Text>
                <Text className="text-white/90 text-sm mt-1">Point camera at permit QR code</Text>
            </View>

            {/* Camera View */}
            <View className="flex-1">
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
                >
                    {/* Overlay with scanning frame */}
                    <View className="flex-1 bg-black/30 items-center justify-center">
                        <View className="w-64 h-64 border-4 border-white rounded-lg bg-transparent">
                            <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                            <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                            <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                            <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                        </View>

                        {scanned && (
                            <TouchableOpacity
                                className="mt-8 bg-primary px-6 py-3 rounded-lg"
                                onPress={() => setScanned(false)}
                            >
                                <Text className="text-white font-semibold">Tap to Scan Again</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </CameraView>
            </View>

            {/* Instructions */}
            <View className="px-6 py-4 bg-card border-t border-border">
                <View className="flex-row items-center">
                    <LucideScan size={20} color="hsl(325 45% 32%)" />
                    <Text className="text-foreground ml-2">Align QR code within the frame</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
