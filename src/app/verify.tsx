import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { CameraView, Camera } from 'expo-camera';
import {
    LucideScan,
    LucideX,
    LucideCheckCircle,
    LucideXCircle,
    LucideFileText,
    LucideUser,
    LucideBuilding2,
    LucideFactory,
    LucideTruck,
    LucideCalendar,
    LucideArrowLeft,
    LucideKeyboard
} from 'lucide-react-native';
import { Button } from '../components/ui/button';
import axios from 'axios';

// Use the same API base URL
const IP_ADDRESS = '192.168.0.103';
const PORT = '3000';
const API_URL = `http://${IP_ADDRESS}:${PORT}/api/v1`;

interface VerifiedPermit {
    id: string;
    permitNumber: string;
    status: string;
    wasteType: string;
    estimatedWeight?: number | null;
    validFrom?: string | null;
    validUntil?: string | null;
    driverName?: string | null;
    vehicleNumber?: string | null;
    plant?: {
        name: string;
        code: string;
    };
    user?: {
        name: string;
    };
    company?: {
        name: string;
    } | null;
}

export default function VerifyScreen() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verifiedPermit, setVerifiedPermit] = useState<VerifiedPermit | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Manual Entry State
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualToken, setManualToken] = useState('');

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const processVerification = async (data: string) => {
        setScanned(true);
        setVerifying(true);
        setError(null);
        setVerifiedPermit(null);

        try {
            // Extract token from QR code or manual input
            // Expected formats:
            // - https://example.com/verify/{token}
            // - Just the token UUID
            const tokenMatch = data.match(/verify\/([a-f0-9-]{36})/i) ||
                data.match(/token=([a-f0-9-]{36})/i) ||
                data.match(/^([a-f0-9-]{36})$/i);

            if (!tokenMatch) {
                throw new Error('Invalid format. Please enter a valid UUID token.');
            }

            const token = tokenMatch[1];

            // Call public verification endpoint
            const response = await axios.get(`${API_URL}/permits/verify/${token}`);

            if (response.data.success) {
                setVerifiedPermit(response.data.data);
            } else {
                throw new Error('Permit not found');
            }
        } catch (err: any) {
            setError(err.response?.data?.error?.message || err.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
        if (!scanned && !showManualInput) {
            await processVerification(data);
        }
    };

    const handleManualSubmit = async () => {
        if (!manualToken.trim()) {
            setError('Please enter a token');
            setScanned(true); // To show error view
            return;
        }
        await processVerification(manualToken.trim());
    };

    const resetScanner = () => {
        setScanned(false);
        setVerifying(false);
        setVerifiedPermit(null);
        setError(null);
        setManualToken('');
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED':
            case 'COMPLETED':
                return { bg: 'bg-green-100', text: 'text-green-700', icon: LucideCheckCircle, iconColor: 'hsl(142 72% 29%)' };
            case 'IN_TRANSIT':
                return { bg: 'bg-blue-100', text: 'text-blue-700', icon: LucideTruck, iconColor: 'hsl(217 91% 60%)' };
            case 'REJECTED':
            case 'CANCELLED':
            case 'EXPIRED':
                return { bg: 'bg-red-100', text: 'text-red-700', icon: LucideXCircle, iconColor: 'hsl(0 72% 50%)' };
            default:
                return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: LucideFileText, iconColor: 'hsl(38 92% 38%)' };
        }
    };

    if (hasPermission === null) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                <Text className="text-foreground mt-4">Requesting camera permission...</Text>
            </SafeAreaView>
        );
    }

    if (hasPermission === false && !showManualInput) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
                <LucideX size={64} color="hsl(0 72% 38%)" />
                <Text className="text-foreground text-xl font-bold mt-4">No Camera Access</Text>
                <Text className="text-muted-foreground mt-2 text-center">
                    Please enable camera permissions in your device settings to scan QR codes.
                </Text>
                <TouchableOpacity
                    className="mt-6 bg-primary px-6 py-3 rounded-lg flex-row items-center"
                    onPress={() => setShowManualInput(true)}
                >
                    <LucideKeyboard size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">Enter Token Manually</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="mt-4"
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text className="text-primary">Back to Login</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Show verification result
    if (scanned && !verifying) {
        const statusStyle = verifiedPermit ? getStatusStyle(verifiedPermit.status) : null;
        const StatusIcon = statusStyle?.icon || LucideFileText;

        return (
            <SafeAreaView className="flex-1 bg-background">
                {/* Header */}
                <View className="px-4 py-4 bg-primary flex-row items-center">
                    <TouchableOpacity onPress={resetScanner} className="mr-3">
                        <LucideArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xl font-bold">Verification Result</Text>
                        <Text className="text-white/80 text-sm">Permit details</Text>
                    </View>
                </View>

                <ScrollView className="flex-1 p-4">
                    {error ? (
                        <View className="bg-red-50 rounded-xl p-6 border border-red-200 items-center">
                            <LucideXCircle size={64} color="hsl(0 72% 50%)" />
                            <Text className="text-red-700 text-xl font-bold mt-4">Verification Failed</Text>
                            <Text className="text-red-600 mt-2 text-center">{error}</Text>
                            <TouchableOpacity
                                className="mt-6 bg-red-600 px-6 py-3 rounded-lg"
                                onPress={resetScanner}
                            >
                                <Text className="text-white font-semibold">Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    ) : verifiedPermit && statusStyle ? (
                        <View>
                            {/* Status Card */}
                            <View className={`${statusStyle.bg} rounded-xl p-6 items-center mb-4`}>
                                <StatusIcon size={64} color={statusStyle.iconColor} />
                                <Text className={`text-2xl font-bold mt-4 ${statusStyle.text}`}>
                                    {verifiedPermit.status.replace('_', ' ')}
                                </Text>
                                <Text className="text-lg font-mono mt-2">{verifiedPermit.permitNumber}</Text>
                            </View>

                            {/* Permit Details */}
                            <View className="bg-card rounded-xl border border-border p-4 mb-4">
                                <Text className="text-lg font-semibold text-foreground mb-4">Permit Details</Text>

                                <View className="gap-3">
                                    <View className="flex-row items-center">
                                        <LucideFileText size={18} color="hsl(240 3.8% 46.1%)" />
                                        <View className="ml-3">
                                            <Text className="text-xs text-muted-foreground">Waste Type</Text>
                                            <Text className="text-sm font-medium text-foreground">
                                                {verifiedPermit.wasteType.replace('_', ' ')}
                                            </Text>
                                        </View>
                                    </View>

                                    {verifiedPermit.estimatedWeight && (
                                        <View className="flex-row items-center">
                                            <LucideFileText size={18} color="hsl(240 3.8% 46.1%)" />
                                            <View className="ml-3">
                                                <Text className="text-xs text-muted-foreground">Estimated Weight</Text>
                                                <Text className="text-sm font-medium text-foreground">
                                                    {verifiedPermit.estimatedWeight} kg
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {verifiedPermit.plant && (
                                        <View className="flex-row items-center">
                                            <LucideFactory size={18} color="hsl(240 3.8% 46.1%)" />
                                            <View className="ml-3">
                                                <Text className="text-xs text-muted-foreground">Destination Plant</Text>
                                                <Text className="text-sm font-medium text-foreground">
                                                    {verifiedPermit.plant.name} ({verifiedPermit.plant.code})
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {verifiedPermit.user && (
                                        <View className="flex-row items-center">
                                            <LucideUser size={18} color="hsl(240 3.8% 46.1%)" />
                                            <View className="ml-3">
                                                <Text className="text-xs text-muted-foreground">Issued To</Text>
                                                <Text className="text-sm font-medium text-foreground">
                                                    {verifiedPermit.user.name}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {verifiedPermit.company && (
                                        <View className="flex-row items-center">
                                            <LucideBuilding2 size={18} color="hsl(240 3.8% 46.1%)" />
                                            <View className="ml-3">
                                                <Text className="text-xs text-muted-foreground">Company</Text>
                                                <Text className="text-sm font-medium text-foreground">
                                                    {verifiedPermit.company.name}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Vehicle/Driver Info */}
                            {(verifiedPermit.driverName || verifiedPermit.vehicleNumber) && (
                                <View className="bg-card rounded-xl border border-border p-4 mb-4">
                                    <Text className="text-lg font-semibold text-foreground mb-4">Transport Details</Text>
                                    <View className="gap-3">
                                        {verifiedPermit.driverName && (
                                            <View className="flex-row items-center">
                                                <LucideUser size={18} color="hsl(240 3.8% 46.1%)" />
                                                <View className="ml-3">
                                                    <Text className="text-xs text-muted-foreground">Driver</Text>
                                                    <Text className="text-sm font-medium text-foreground">
                                                        {verifiedPermit.driverName}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                        {verifiedPermit.vehicleNumber && (
                                            <View className="flex-row items-center">
                                                <LucideTruck size={18} color="hsl(240 3.8% 46.1%)" />
                                                <View className="ml-3">
                                                    <Text className="text-xs text-muted-foreground">Vehicle Number</Text>
                                                    <Text className="text-sm font-medium text-foreground font-mono">
                                                        {verifiedPermit.vehicleNumber}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Validity */}
                            {(verifiedPermit.validFrom || verifiedPermit.validUntil) && (
                                <View className="bg-card rounded-xl border border-border p-4 mb-4">
                                    <Text className="text-lg font-semibold text-foreground mb-4">Validity Period</Text>
                                    <View className="flex-row gap-4">
                                        {verifiedPermit.validFrom && (
                                            <View className="flex-1 items-center bg-muted rounded-lg py-3">
                                                <LucideCalendar size={18} color="hsl(240 3.8% 46.1%)" />
                                                <Text className="text-xs text-muted-foreground mt-1">From</Text>
                                                <Text className="text-sm font-medium text-foreground">
                                                    {new Date(verifiedPermit.validFrom).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        )}
                                        {verifiedPermit.validUntil && (
                                            <View className="flex-1 items-center bg-muted rounded-lg py-3">
                                                <LucideCalendar size={18} color="hsl(240 3.8% 46.1%)" />
                                                <Text className="text-xs text-muted-foreground mt-1">Until</Text>
                                                <Text className="text-sm font-medium text-foreground">
                                                    {new Date(verifiedPermit.validUntil).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Scan Again Button */}
                            <TouchableOpacity
                                className="bg-primary py-4 rounded-xl items-center mb-4"
                                onPress={resetScanner}
                            >
                                <Text className="text-white font-semibold text-base">Verify Another Permit</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Manual Input View
    if (showManualInput) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                {/* Header */}
                <View className="px-6 py-4 bg-primary flex-row items-center">
                    <TouchableOpacity onPress={() => setShowManualInput(false)} className="mr-3">
                        <LucideArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xl font-bold">Manual Verification</Text>
                        <Text className="text-white/80 text-sm">Enter permit token</Text>
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="flex-1 p-6 justify-center"
                >
                    <View className="bg-card p-6 rounded-xl border border-border shadow-sm">
                        <Text className="text-lg font-semibold mb-4 text-foreground">Enter Permit Token</Text>
                        <TextInput
                            className="bg-background border border-border rounded-lg p-4 mb-4 text-foreground font-mono"
                            placeholder="Enter unique token UUID"
                            placeholderTextColor="hsl(240 3.8% 46.1%)"
                            value={manualToken}
                            onChangeText={setManualToken}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Button
                            label={verifying ? "Verifying..." : "Verify Permit"}
                            onPress={handleManualSubmit}
                            loading={verifying}
                        />


                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Camera View
    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 pt-4 pb-3 bg-primary flex-row justify-between items-center">
                <View>
                    <Text className="text-white text-2xl font-bold">Verify Permit</Text>
                    <Text className="text-white/90 text-sm mt-1">Scan QR code</Text>
                </View>
                <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                    <Text className="text-white/80 font-medium">Login</Text>
                </TouchableOpacity>
            </View>

            {/* Camera View */}
            <View className="flex-1">
                {verifying ? (
                    <View className="flex-1 items-center justify-center bg-black/80">
                        <ActivityIndicator size="large" color="white" />
                        <Text className="text-white mt-4">Verifying permit...</Text>
                    </View>
                ) : (
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                        }}
                    >
                        {/* Overlay with scanning frame */}
                        <View className="flex-1 bg-black/40 items-center justify-center">
                            <View className="w-72 h-72 border-4 border-white/50 rounded-lg bg-transparent">
                                <View className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                                <View className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                                <View className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                                <View className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-lg" />
                            </View>
                        </View>
                    </CameraView>
                )}
            </View>

            {/* Instructions & Manual Toggle */}
            <View className="px-6 py-4 bg-card border-t border-border">
                <View className="flex-row items-center justify-center mb-4">
                    <LucideScan size={20} color="hsl(325 45% 32%)" />
                    <Text className="text-foreground ml-2 text-center">
                        Position the QR code within the frame to verify
                    </Text>
                </View>

                <TouchableOpacity
                    className="bg-secondary py-3 rounded-lg flex-row items-center justify-center border border-border"
                    onPress={() => setShowManualInput(true)}
                >
                    <LucideKeyboard size={20} color="hsl(240 3.8% 46.1%)" />
                    <Text className="text-foreground font-medium ml-2">Enter Token Manually</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
