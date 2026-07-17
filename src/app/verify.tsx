import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
    LucideScan,
    LucideX,
    LucideCheckCircle,
    LucideXCircle,
    LucideFileText,
    LucideArrowLeft,
    LucideKeyboard,
    LucideImage,
    Scan,
    Truck,
    Package,
    Weight,
    User,
    Clock,
    Building2,
    AlertCircle
} from 'lucide-react-native';
import { Button } from '../components/ui/button';
import { TimeRemainingCard } from '../components/ui/time-remaining-card';
import axios from 'axios';
import { formatDate, formatDateTime, calculateTimeLeft } from '../lib/utils';

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

// ✅ Move getReasonText outside the component
const getReasonText = (validityStatus: string): string => {
    switch (validityStatus) {
        case 'EXPIRED': return 'PERMIT EXPIRED';
        case 'NOT_YET_VALID': return 'NOT YET ACTIVE';
        case 'REVOKED': return 'PERMIT REVOKED';
        case 'SUSPENDED': return 'PERMIT SUSPENDED';
        case 'INACTIVE': return 'PERMIT INACTIVE';
        case 'PENDING': return 'PENDING APPROVAL';
        case 'REJECTED': return 'PERMIT REJECTED';
        case 'NA': return 'NOT AVAILABLE';
        default: return validityStatus || 'INVALID STATUS';
    }
};

export default function VerifyScreen() {
    const router = useRouter();
    const isFocused = useIsFocused();
    const isScanningRef = useRef(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [processingImage, setProcessingImage] = useState(false);
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
        setVerifying(true);
        setError(null);
        setVerifiedPermit(null);

        try {
            // Extract token from QR code or manual input
            const tokenMatch = data.match(/verify\/([a-f0-9-]{36})/i) ||
                data.match(/token=([a-f0-9-]{36})/i) ||
                data.match(/^([a-f0-9-]{36})$/i);

            if (!tokenMatch) {
                throw new Error('Invalid format. Please enter a valid UUID token.');
            }

            const token = tokenMatch[1];

            // Call public verification endpoint
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
        if (isScanningRef.current || showManualInput) return;
        isScanningRef.current = true;
        setScanned(true);
        await processVerification(data);
    };

    const handleManualSubmit = async () => {
        const cleanedToken = manualToken.trim();
        if (!cleanedToken) {
            setError('Please enter a token');
            setScanned(true);
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(cleanedToken)) {
            setError('Invalid token format. Must be a valid UUID (e.g. 123e4567-e89b-12d3-a456-426614174000).');
            setScanned(true);
            return;
        }

        isScanningRef.current = true;
        setScanned(true);
        await processVerification(cleanedToken);
    };

    const resetScanner = () => {
        isScanningRef.current = false;
        setScanned(false);
        setVerifying(false);
        setProcessingImage(false);
        setVerifiedPermit(null);
        setError(null);
        setManualToken('');
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
                <Text className="text-muted-foreground mt-2 text-center mb-6">
                    Please enable camera permissions in your device settings to scan QR codes.
                </Text>

                <Button
                    label="Open Settings"
                    onPress={() => Linking.openSettings()}
                    className="w-full mb-4"
                />

                <TouchableOpacity
                    className="bg-primary px-6 py-4 rounded-lg flex-row items-center w-full justify-center mb-4"
                    onPress={() => setShowManualInput(true)}
                >
                    <LucideKeyboard size={20} color="white" />
                    <Text className="text-white font-semibold ml-2 text-base">Enter Token Manually</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="mt-4 p-2"
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text className="text-primary font-semibold">Back to Login</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Show verification result
    if (scanned && !verifying && !processingImage) {
        const verification = verifiedPermit?.verification;
        const isActive = verification?.isActive ?? false;
        const vStyle = verifiedPermit ? getVerificationStyle(isActive) : null;
        const StatusIcon = vStyle?.icon || LucideFileText;

        // ✅ Calculate timeLeft with proper properties using the utility function
        const timeLeft = calculateTimeLeft(
            verifiedPermit?.validFrom,
            verifiedPermit?.validUntil
        );

        const auditTime = verification?.checkedAt
            ? new Date(verification.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase();

        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: '#f1f5f9' }}>
                {/* ═══════════════════════════════════════ */}
{/* HEADER - Enhanced with better hierarchy */}
{/* ═══════════════════════════════════════ */}
<View style={{
    backgroundColor: '#8F1D3F',
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
}}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity 
            onPress={resetScanner} 
            style={{ 
                padding: 8,
                marginRight: 12,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.15)',
            }}
            activeOpacity={0.7}
        >
            <LucideArrowLeft size={22} color="white" />
        </TouchableOpacity>
        
        <View style={{ flex: 1 }}>
            <Text style={{ 
                color: 'white', 
                fontSize: 20, 
                fontWeight: '700',
                letterSpacing: 0.3,
            }}>
                Verification Result
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <View style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: 3, 
                    backgroundColor: isActive ? '#4ade80' : '#fca5a5' 
                }} />
                <Text style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: 12,
                    fontWeight: '500',
                }}>
                    {isActive ? 'Active Permit' : 'Inactive Permit'}
                </Text>
                <Text style={{ 
                    color: 'rgba(255,255,255,0.3)', 
                    fontSize: 12,
                }}>
                    •
                </Text>
                <Text style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: 12,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>

        {/* Optional: Quick action button */}
        <TouchableOpacity 
            style={{ 
                padding: 8,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.1)',
            }}
            onPress={resetScanner}
            activeOpacity={0.7}
        >
            <LucideScan size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
    </View>
</View>

{/* ═══════════════════════════════════════ */}
{/* MAIN CONTENT */}
{/* ═══════════════════════════════════════ */}
<ScrollView 
    className="flex-1" 
    contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16, paddingTop: 16 }}
    showsVerticalScrollIndicator={false}
>
    {error ? (
        /* ─── Error State ─── */
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 40 }}>
            <View style={{
                backgroundColor: 'white',
                borderRadius: 20,
                padding: 32,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
                elevation: 4,
            }}>
                <View style={{
                    backgroundColor: '#fee2e2',
                    borderRadius: 60,
                    padding: 20,
                    marginBottom: 16,
                }}>
                    <LucideXCircle size={56} color="#dc2626" />
                </View>
                
                <Text style={{ 
                    fontSize: 24, 
                    fontWeight: '700', 
                    color: '#1e293b',
                    marginBottom: 4,
                }}>
                    Verification Failed
                </Text>
                
                <View style={{
                    backgroundColor: '#fee2e2',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 20,
                    marginBottom: 12,
                }}>
                    <Text style={{ 
                        color: '#dc2626', 
                        fontSize: 10, 
                        fontWeight: '700',
                        letterSpacing: 1.5,
                    }}>
                        ERROR
                    </Text>
                </View>
                
                <Text style={{ 
                    color: '#64748b', 
                    textAlign: 'center',
                    lineHeight: 22,
                    marginBottom: 24,
                }}>
                    {error}
                </Text>
                
                <TouchableOpacity
                    style={{
                        backgroundColor: '#dc2626',
                        paddingVertical: 14,
                        paddingHorizontal: 32,
                        borderRadius: 12,
                        width: '100%',
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                    onPress={resetScanner}
                    activeOpacity={0.8}
                >
                    <LucideArrowLeft size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>
                        Try Again
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        backgroundColor: 'transparent',
                        paddingVertical: 14,
                        paddingHorizontal: 32,
                        borderRadius: 12,
                        width: '100%',
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                        marginTop: 12,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                    }}
                    onPress={() => {
                        resetScanner();
                        setTimeout(pickImage, 100);
                    }}
                    activeOpacity={0.8}
                >
                    <LucideImage size={18} color="#475569" />
                    <Text style={{ color: '#475569', fontWeight: '600', fontSize: 15 }}>
                        Pick from Gallery
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    ) : verifiedPermit && vStyle && verification ? (
        <>
            {/* ─── HERO STATUS CARD ─── */}
            <View style={{
                backgroundColor: 'white',
                borderRadius: 20,
                padding: 24,
                alignItems: 'center',
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: 1,
                borderColor: '#f1f5f9',
            }}>
                {/* Status Badge */}
                <View style={{
                    backgroundColor: vStyle.iconBg,
                    borderRadius: 50,
                    padding: 16,
                    marginBottom: 12,
                }}>
                    <StatusIcon size={44} color={vStyle.iconColor} />
                </View>

                {/* Status Title */}
                <Text style={{ 
                    fontSize: 22, 
                    fontWeight: '700', 
                    color: '#1e293b',
                    marginBottom: 4,
                }}>
                    {vStyle.title}
                </Text>
                
                {/* Status Chip */}
                <View style={{
                    backgroundColor: vStyle.badgeBg,
                    paddingHorizontal: 14,
                    paddingVertical: 4,
                    borderRadius: 20,
                    marginBottom: 12,
                }}>
                    <Text style={{ 
                        color: vStyle.badgeText, 
                        fontSize: 11, 
                        fontWeight: '700',
                        letterSpacing: 0.5,
                    }}>
                        {verification.validityStatus.replace(/_/g, ' ')}
                    </Text>
                </View>

                {/* Divider */}
                <View style={{
                    width: 40,
                    height: 2,
                    backgroundColor: '#e2e8f0',
                    borderRadius: 1,
                    marginVertical: 8,
                }} />

                {/* Permit Number */}
                <Text style={{
                    color: '#0f172a',
                    fontSize: 18,
                    fontWeight: '700',
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    letterSpacing: 0.5,
                    marginBottom: 4,
                }}>
                    {verifiedPermit.permitNumber}
                </Text>
                
                {/* Token ID */}
                <Text style={{
                    color: '#94a3b8',
                    fontSize: 12,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                }}>
                    Token: {verifiedPermit.id.substring(0, 14)}...
                </Text>

                {/* ─── TIME REMAINING ─── */}
                {isActive && timeLeft && (
                    <View style={{ width: '100%', marginTop: 12 }}>
                        <TimeRemainingCard 
                            timeLeft={timeLeft}
                            expiryDate={verifiedPermit?.validUntil || undefined}
                            isExpired={timeLeft.percentage === 0}
                        />
                    </View>
                )}

                {/* ─── INACTIVE REASON ─── */}
                {!isActive && (
                    <View style={{
                        marginTop: 12,
                        width: '100%',
                        padding: 12,
                        backgroundColor: '#fef2f2',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#fecaca',
                        alignItems: 'center',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AlertCircle size={16} color="#dc2626" />
                            <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600' }}>
                                {getReasonText(verification.validityStatus)}
                            </Text>
                        </View>
                        {verifiedPermit?.validUntil && (
                            <Text style={{ color: '#b91c1c', fontSize: 11, marginTop: 4 }}>
                                Expired: {formatDateTime(verifiedPermit.validUntil)}
                            </Text>
                        )}
                    </View>
                )}
            </View>

            {/* ─── PERMIT DETAILS CARD ─── */}
            <View style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#f1f5f9',
            }}>
                <Text style={{
                    color: '#94a3b8',
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 12,
                }}>
                    Permit Details
                </Text>

                {/* Details Grid */}
                <View style={{ gap: 12 }}>
                    {verifiedPermit.vehicleNumber && (
                        <DetailRow 
                            icon={Truck} 
                            label="Vehicle" 
                            value={verifiedPermit.vehicleNumber} 
                            monospace 
                        />
                    )}
                    {verifiedPermit.driverName && (
                        <DetailRow 
                            icon={User} 
                            label="Driver" 
                            value={verifiedPermit.driverName} 
                        />
                    )}
                    <DetailRow 
                        icon={Package} 
                        label="Material" 
                        value={verifiedPermit.wasteType.replace(/_/g, ' ')} 
                    />
                    {verifiedPermit.estimatedWeight && (
                        <DetailRow 
                            icon={Weight} 
                            label="Est. Weight" 
                            value={`${verifiedPermit.estimatedWeight} kg`} 
                        />
                    )}
                </View>
            </View>

            {/* ─── SECURITY & OPS ─── */}
            {(verifiedPermit.plant || verifiedPermit.validFrom || verifiedPermit.validUntil) && (
                <View style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                }}>
                    <Text style={{
                        color: '#94a3b8',
                        fontSize: 11,
                        fontWeight: '600',
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        marginBottom: 12,
                    }}>
                        Security & Operations
                    </Text>

                    <View style={{ gap: 12 }}>
                        {verifiedPermit.plant && (
                            <View>
                                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '500' }}>
                                    Designated Plant
                                </Text>
                                <Text style={{ 
                                    color: '#1e293b', 
                                    fontSize: 16, 
                                    fontWeight: '700',
                                    marginTop: 2,
                                }}>
                                    {verifiedPermit.plant.name}
                                </Text>
                                <Text style={{ 
                                    color: '#94a3b8', 
                                    fontSize: 12,
                                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                                }}>
                                    {verifiedPermit.plant.code}
                                </Text>
                            </View>
                        )}

                        {(verifiedPermit.validFrom || verifiedPermit.validUntil) && (
                            <View style={{ gap: 6, marginTop: 4 }}>
                                {verifiedPermit.validFrom && (
                                    <DateRow 
                                        label="Activation" 
                                        date={verifiedPermit.validFrom} 
                                    />
                                )}
                                {verifiedPermit.validUntil && (
                                    <DateRow 
                                        label="Expiry" 
                                        date={verifiedPermit.validUntil}
                                        isExpired={['EXPIRED', 'REVOKED', 'SUSPENDED'].includes(verifiedPermit.status)}
                                    />
                                )}
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* ─── SOURCE ENTITY ─── */}
            {(verifiedPermit.user || verifiedPermit.company || verifiedPermit.project) && (
                <View style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                }}>
                    <Text style={{
                        color: '#94a3b8',
                        fontSize: 11,
                        fontWeight: '600',
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        marginBottom: 12,
                    }}>
                        Source Entity
                    </Text>

                    {verifiedPermit.user && (
                        <Text style={{ 
                            color: '#1e293b', 
                            fontSize: 18, 
                            fontWeight: '700',
                            marginBottom: 4,
                        }}>
                            {verifiedPermit.user.name}
                        </Text>
                    )}

                    {(verifiedPermit.project?.company || verifiedPermit.company) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Building2 size={16} color="#94a3b8" />
                            <Text style={{ color: '#475569', fontSize: 14 }}>
                                {verifiedPermit.project?.company?.name || verifiedPermit.company?.name}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* ─── AUDIT FOOTER ─── */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                marginBottom: 8,
            }}>
                <Clock size={12} color="#94a3b8" />
                <Text style={{ 
                    color: '#94a3b8', 
                    fontSize: 10, 
                    fontWeight: '600',
                    letterSpacing: 0.5,
                }}>
                    AUDIT: {auditTime}
                </Text>
            </View>

            {/* ─── SCAN AGAIN BUTTON ─── */}
            <TouchableOpacity
                style={{
                    backgroundColor: '#1e293b',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 8,
                }}
                onPress={resetScanner}
                activeOpacity={0.8}
            >
                <Scan size={18} color="white" />
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>
                    Verify Another Permit
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={{
                    backgroundColor: 'transparent',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                }}
                onPress={() => {
                    resetScanner();
                    setTimeout(pickImage, 100);
                }}
                activeOpacity={0.8}
            >
                <LucideImage size={18} color="#475569" />
                <Text style={{ color: '#475569', fontWeight: '600', fontSize: 15 }}>
                    Pick from Gallery
                </Text>
            </TouchableOpacity>
        </>
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
                    className="flex-1"
                >
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                        keyboardShouldPersistTaps="handled"
                        className="flex-1 p-6"
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
                                onSubmitEditing={handleManualSubmit}
                                returnKeyType="go"
                            />
                            <Button
                                label={verifying ? "Verifying..." : "Verify Permit"}
                                onPress={handleManualSubmit}
                                loading={verifying}
                            />
                        </View>
                    </ScrollView>
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
                ) : (
                    <View className="flex-1 bg-black items-center justify-center" />
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
                    className="bg-secondary py-3 rounded-lg flex-row items-center justify-center border border-border mb-3"
                    onPress={() => setShowManualInput(true)}
                >
                    <LucideKeyboard size={20} color="hsl(240 3.8% 46.1%)" />
                    <Text className="text-foreground font-medium ml-2">Enter Token Manually</Text>
                </TouchableOpacity>

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





// Helper component for detail rows
const DetailRow = ({ icon: Icon, label, value, monospace }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Icon size={16} color="#64748b" />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '500', letterSpacing: 0.5 }}>
                {label}
            </Text>
            <Text style={{ 
                color: '#1e293b', 
                fontSize: 14, 
                fontWeight: '600',
                fontFamily: monospace ? (Platform.OS === 'ios' ? 'Menlo' : 'monospace') : undefined,
            }}>
                {value}
            </Text>
        </View>
    </View>
);

// Helper component for date rows
const DateRow = ({ label, date, isExpired }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '500' }}>
            {label}
        </Text>
        <Text style={{ 
            color: isExpired ? '#dc2626' : '#1e293b',
            fontSize: 13,
            fontWeight: '600',
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        }}>
            {formatDateTime(date)}
        </Text>
    </View>
);