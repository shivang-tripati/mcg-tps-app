import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../components/ui/button';
import {
    LucideScan,
    LucideX,
    LucideCheckCircle,
    LucideXCircle,
    LucideFileText,
    LucideUser,
    LucideBuilding2,
    LucideTruck,
    LucideArrowLeft,
    LucidePackage,
    LucideClock,
    LucideWeight,
    LucideHash,
    LucideImage
} from 'lucide-react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
    project?: {
        name: string;
        company: { name: string };
    };
    verification: {
        validityStatus: 'NOT_YET_VALID' | 'VALID' | 'EXPIRED' | 'NA';
        timeRemaining: { hours: number; minutes: number; text: string } | null;
        isActive: boolean;
        checkedAt: string;
    };
}

export default function ScanScreen() {
    const router = useRouter();
    const isFocused = useIsFocused();
    const isScanningRef = useRef(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [processingImage, setProcessingImage] = useState(false);
    const [verifiedPermit, setVerifiedPermit] = useState<VerifiedPermit | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const processVerification = async (data: string) => {
        setVerifying(true);
        setError(null);
        setVerifiedPermit(null);

        try {
            // Extract token from QR code
            // Supported formats:
            // - https://example.com/verify?token={uuid}
            // - https://example.com/verify/{uuid}
            // - Just the UUID
            const tokenMatch = data.match(/token=([a-f0-9-]{36})/i) ||
                data.match(/verify\/([a-f0-9-]{36})/i) ||
                data.match(/^([a-f0-9-]{36})$/i);

            if (!tokenMatch) {
                throw new Error('Invalid QR code format. Could not find a valid permit token.');
            }

            const token = tokenMatch[1];

            const response = await axios.get(`${API_URL}/verify`, {
                params: { token }
            });

            if (response.data.success) {
                setVerifiedPermit(response.data.data);
                Haptics.notificationAsync(
                    response.data.data.verification.isActive
                        ? Haptics.NotificationFeedbackType.Success
                        : Haptics.NotificationFeedbackType.Error
                );
            } else {
                throw new Error('Permit not found');
            }
        } catch (err: any) {
            setError(err.response?.data?.error?.message || err.message || 'Verification failed');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setVerifying(false);
        }
    };

    const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
        if (isScanningRef.current) return;
        isScanningRef.current = true;
        setScanned(true);
        await processVerification(data);
    };

    const resetScanner = () => {
        isScanningRef.current = false;
        setScanned(false);
        setVerifying(false);
        setProcessingImage(false);
        setVerifiedPermit(null);
        setError(null);
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                setError('Sorry, we need media library permissions to make this work!');
                setScanned(true);
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                isScanningRef.current = true;
                setScanned(true);
                setProcessingImage(true);
                setError(null);

                const scannedResults = await Camera.scanFromURLAsync(result.assets[0].uri, ['qr']);

                if (scannedResults && scannedResults.length > 0) {
                    setProcessingImage(false);
                    await processVerification(scannedResults[0].data);
                } else {
                    setProcessingImage(false);
                    setError('No QR code found in the selected image.');
                }
            }
        } catch (err: any) {
            setProcessingImage(false);
            setError('Failed to process image: ' + err.message);
            setScanned(true);
        }
    };

    const getVerificationStyle = (isActive: boolean) => {
        if (isActive) {
            return {
                icon: LucideCheckCircle,
                iconColor: '#16a34a',
                iconBg: '#dcfce7',
                badgeBg: '#16a34a',
                badgeText: '#ffffff',
                title: 'Permit Verified',
            };
        }
        return {
            icon: LucideXCircle,
            iconColor: '#dc2626',
            iconBg: '#fee2e2',
            badgeBg: '#dc2626',
            badgeText: '#ffffff',
            title: 'Invalid Permit',
        };
    };

    const getReasonText = (validityStatus: string) => {
        switch (validityStatus) {
            case 'EXPIRED': return 'EXPIRED';
            case 'NOT_YET_VALID': return 'NOT YET ACTIVE';
            default: return 'REJECTED / BLACKLISTED';
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

    if (hasPermission === false) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
                <LucideX size={64} color="hsl(0 72% 38%)" />
                <Text className="text-foreground text-xl font-bold mt-4">No Camera Access</Text>
                <Text className="text-muted-foreground mt-2 text-center mb-6">
                    Please enable camera permissions in your device settings to scan QR codes.
                </Text>

                <Button
                    label="Open Settings"
                    onPress={() => Linking.openSettings()}
                    className="w-full mb-4"
                />
            </SafeAreaView>
        );
    }

    // Show verification result
    if (scanned && !verifying && !processingImage) {
        const verification = verifiedPermit?.verification;
        const isActive = verification?.isActive ?? false;
        const vStyle = verifiedPermit ? getVerificationStyle(isActive) : null;
        const StatusIcon = vStyle?.icon || LucideFileText;
        const timeLeft = verification?.timeRemaining;
        const auditTime = verification?.checkedAt
            ? new Date(verification.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase();

        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: '#f1f5f9' }}>
                {/* Header */}
                <View className="px-4 py-4 flex-row items-center bg-primary">
                    <TouchableOpacity onPress={resetScanner} className="mr-3" style={{ padding: 4 }}>
                        <LucideArrowLeft size={22} color="white" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-white text-lg font-bold">Verification Result</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.6)' }} className="text-xs">Permit details</Text>
                    </View>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                    {error ? (
                        <View className="p-4">
                            <View className="bg-white rounded-2xl p-8 items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}>
                                <View style={{ backgroundColor: '#fee2e2', borderRadius: 50, padding: 16 }}>
                                    <LucideXCircle size={48} color="#dc2626" />
                                </View>
                                <Text className="text-xl font-bold mt-5" style={{ color: '#1e293b' }}>Verification Failed</Text>
                                <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginTop: 8 }}>
                                    <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>ERROR</Text>
                                </View>
                                <Text className="mt-4 text-center" style={{ color: '#64748b', lineHeight: 20 }}>{error}</Text>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#dc2626', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 24, width: '100%', alignItems: 'center' }}
                                    onPress={resetScanner}
                                >
                                    <Text className="text-white font-semibold">Try Again</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{ backgroundColor: 'transparent', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 12, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                    onPress={() => {
                                        resetScanner();
                                        setTimeout(pickImage, 100);
                                    }}
                                >
                                    <LucideImage size={18} color="#475569" />
                                    <Text style={{ color: '#475569', fontWeight: '600' }}>Pick from Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : verifiedPermit && vStyle && verification ? (
                        <View className="p-4">
                            {/* HERO STATUS CARD */}
                            <View className="bg-white rounded-2xl p-6 items-center mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, overflow: 'hidden' }}>
                                <View style={{ backgroundColor: vStyle.iconBg, borderRadius: 50, padding: 16 }}>
                                    <StatusIcon size={40} color={vStyle.iconColor} />
                                </View>

                                <View className="flex-row items-center mt-4" style={{ gap: 8 }}>
                                    <Text className="text-xl font-bold" style={{ color: '#1e293b' }}>
                                        {vStyle.title}
                                    </Text>
                                    <View style={{ backgroundColor: vStyle.badgeBg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 }}>
                                        <Text style={{ color: vStyle.badgeText, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>
                                            {verification.validityStatus.replace('_', ' ')}
                                        </Text>
                                    </View>
                                </View>

                                <View className="flex-row items-center mt-3" style={{ gap: 16 }}>
                                    <Text style={{ color: '#64748b', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                                        {verifiedPermit.permitNumber}
                                    </Text>
                                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1' }} />
                                    <Text style={{ color: '#94a3b8', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                                        TOKEN ID: {verifiedPermit.id.substring(0, 14)}...
                                    </Text>
                                </View>

                                {isActive && timeLeft && (
                                    <View style={{
                                        backgroundColor: '#1e293b',
                                        borderRadius: 14,
                                        paddingVertical: 14,
                                        paddingHorizontal: 24,
                                        marginTop: 16,
                                        width: '100%',
                                        alignItems: 'center',
                                    }}>
                                        <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Time Remaining</Text>
                                        <Text style={{ color: 'white', fontSize: 26, fontWeight: '700', marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: -1 }}>
                                            {timeLeft.text}
                                        </Text>
                                    </View>
                                )}

                                {!isActive && (
                                    <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' }}>
                                        <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>
                                            REASON: {getReasonText(verification.validityStatus)}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* PERMIT PAYLOAD DETAILS */}
                            <View className="bg-white rounded-2xl mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                                <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
                                    <Text style={{ color: '#1e293b', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                                        Permit Payload Details
                                    </Text>
                                    <View className="flex-row items-center" style={{ gap: 6 }}>
                                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' }} />
                                        <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '600' }}>Electronic Manifest</Text>
                                    </View>
                                </View>

                                <View style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 20 }} />

                                <View className="px-5 py-4" style={{ gap: 20 }}>
                                    {verifiedPermit.vehicleNumber && (
                                        <View className="flex-row items-start" style={{ gap: 14 }}>
                                            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, padding: 8, marginTop: 2 }}>
                                                <LucideTruck size={18} color="#64748b" />
                                            </View>
                                            <View>
                                                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Vehicle / Fleet</Text>
                                                <Text style={{ color: '#1e293b', fontSize: 16, fontWeight: '700', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                                                    {verifiedPermit.vehicleNumber}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {verifiedPermit.driverName && (
                                        <View className="flex-row items-start" style={{ gap: 14 }}>
                                            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, padding: 8, marginTop: 2 }}>
                                                <LucideUser size={18} color="#64748b" />
                                            </View>
                                            <View>
                                                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Authorized Driver</Text>
                                                <Text style={{ color: '#1e293b', fontSize: 16, fontWeight: '600', marginTop: 2 }}>
                                                    {verifiedPermit.driverName}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    <View className="flex-row items-start" style={{ gap: 14 }}>
                                        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, padding: 8, marginTop: 2 }}>
                                            <LucideHash size={18} color="#64748b" />
                                        </View>
                                        <View>
                                            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Consolidated ID</Text>
                                            <Text style={{ color: '#1e293b', fontSize: 16, fontWeight: '700', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                                                {verifiedPermit.permitNumber}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-start" style={{ gap: 14 }}>
                                        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, padding: 8, marginTop: 2 }}>
                                            <LucidePackage size={18} color="#64748b" />
                                        </View>
                                        <View>
                                            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Material Category</Text>
                                            <Text style={{ color: '#1e293b', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                                                {verifiedPermit.wasteType.replace(/_/g, ' ')}
                                            </Text>
                                        </View>
                                    </View>

                                    {verifiedPermit.estimatedWeight && (
                                        <View className="flex-row items-start" style={{ gap: 14 }}>
                                            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, padding: 8, marginTop: 2 }}>
                                                <LucideWeight size={18} color="#64748b" />
                                            </View>
                                            <View>
                                                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Load Estimate</Text>
                                                <Text style={{ color: '#1e293b', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                                                    {verifiedPermit.estimatedWeight} kg
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* SECURITY & OPS */}
                            {(verifiedPermit.plant || verifiedPermit.validFrom || verifiedPermit.validUntil) && (
                                <View className="bg-white rounded-2xl mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                                    <View className="px-5 pt-5 pb-3">
                                        <Text style={{ color: '#1e293b', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                                            Security & Ops
                                        </Text>
                                    </View>

                                    <View style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 20 }} />

                                    <View className="px-5 py-4" style={{ gap: 16 }}>
                                        {verifiedPermit.plant && (
                                            <View>
                                                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Designated Plant</Text>
                                                <Text style={{ color: '#1e293b', fontSize: 18, fontWeight: '700', marginTop: 4 }}>
                                                    {verifiedPermit.plant.name}
                                                </Text>
                                                <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 }}>
                                                    {verifiedPermit.plant.code}
                                                </Text>
                                            </View>
                                        )}

                                        {(verifiedPermit.validFrom || verifiedPermit.validUntil) && (
                                            <View style={{ gap: 8 }}>
                                                {verifiedPermit.validFrom && (
                                                    <View className="flex-row items-center justify-between" style={{ paddingVertical: 4 }}>
                                                        <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '500' }}>Activation</Text>
                                                        <Text style={{ color: '#1e293b', fontSize: 14, fontWeight: '700' }}>
                                                            {new Date(verifiedPermit.validFrom).toLocaleDateString()}
                                                        </Text>
                                                    </View>
                                                )}
                                                {verifiedPermit.validUntil && (
                                                    <View className="flex-row items-center justify-between" style={{ paddingVertical: 4 }}>
                                                        <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '500' }}>Expiry</Text>
                                                        <Text style={{
                                                            color: verification.validityStatus === 'EXPIRED' ? '#dc2626' : '#1e293b',
                                                            fontSize: 14,
                                                            fontWeight: '700'
                                                        }}>
                                                            {new Date(verifiedPermit.validUntil).toLocaleDateString()}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* SOURCE ENTITY */}
                            {(verifiedPermit.user || verifiedPermit.company || verifiedPermit.project) && (
                                <View className="bg-white rounded-2xl mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                                    <View className="px-5 pt-5 pb-3">
                                        <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                                            Source Entity
                                        </Text>
                                    </View>

                                    <View className="px-5 pb-5" style={{ gap: 8 }}>
                                        {verifiedPermit.user && (
                                            <View>
                                                <Text style={{ color: '#1e293b', fontSize: 20, fontWeight: '700' }}>
                                                    {verifiedPermit.user.name}
                                                </Text>
                                            </View>
                                        )}

                                        {(verifiedPermit.project?.company || verifiedPermit.company) && (
                                            <View className="flex-row items-center mt-1" style={{ gap: 10 }}>
                                                <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, padding: 8 }}>
                                                    <LucideBuilding2 size={18} color="#64748b" />
                                                </View>
                                                <View>
                                                    <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Company</Text>
                                                    <Text style={{ color: '#1e293b', fontSize: 14, fontWeight: '600', marginTop: 1 }}>
                                                        {verifiedPermit.project?.company?.name || verifiedPermit.company?.name}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* AUDIT TIMESTAMP */}
                            <View style={{
                                backgroundColor: '#1e293b',
                                borderRadius: 50,
                                paddingVertical: 14,
                                paddingHorizontal: 24,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 8,
                                gap: 8,
                            }}>
                                <LucideClock size={14} color="white" />
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }}>
                                    AUDIT TIMESTAMP: {auditTime}
                                </Text>
                            </View>

                            {/* Scan Again */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#1e293b',
                                    paddingVertical: 16,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                    marginTop: 8,
                                    marginBottom: 8,
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                                onPress={resetScanner}
                            >
                                <LucideScan size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Scan Another Permit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: 'transparent',
                                    paddingVertical: 16,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                    marginBottom: 16,
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 8,
                                    borderWidth: 1,
                                    borderColor: '#cbd5e1',
                                }}
                                onPress={() => {
                                    resetScanner();
                                    setTimeout(pickImage, 100);
                                }}
                            >
                                <LucideImage size={18} color="#475569" />
                                <Text style={{ color: '#475569', fontWeight: '600', fontSize: 15 }}>Pick from Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Camera View
    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 pt-4 pb-3 bg-primary">
                <Text className="text-white text-2xl font-bold">Scan QR Code</Text>
                <Text className="text-white/90 text-sm mt-1">Point camera at permit QR code</Text>
            </View>

            {/* Camera View */}
            <View className="flex-1">
                {processingImage ? (
                    <View className="flex-1 items-center justify-center bg-black/80">
                        <ActivityIndicator size="large" color="white" />
                        <Text className="text-white mt-4">Reading QR from image...</Text>
                    </View>
                ) : verifying ? (
                    <View className="flex-1 items-center justify-center bg-black/80">
                        <ActivityIndicator size="large" color="white" />
                        <Text className="text-white mt-4">Verifying permit...</Text>
                    </View>
                ) : isFocused ? (
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                        }}
                    >
                        <View className="flex-1 bg-black/40 items-center justify-center">
                            <View className="w-72 h-72 border-4 border-white/50 rounded-lg bg-transparent">
                                <View className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                                <View className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                                <View className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                                <View className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-lg" />
                            </View>
                        </View>
                    </CameraView>
                ) : (
                    <View className="flex-1 bg-black items-center justify-center" />
                )}
            </View>

            {/* Instructions */}
            <View className="px-6 py-4 bg-card border-t border-border">
                <View className="flex-row items-center justify-center mb-4">
                    <LucideScan size={20} color="hsl(325 45% 32%)" />
                    <Text className="text-foreground ml-2">Position the QR code within the frame to verify</Text>
                </View>

                <TouchableOpacity
                    className="bg-secondary py-3 rounded-lg flex-row items-center justify-center border border-border"
                    onPress={pickImage}
                >
                    <LucideImage size={20} color="hsl(240 3.8% 46.1%)" />
                    <Text className="text-foreground font-medium ml-2">Choose from Gallery</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
