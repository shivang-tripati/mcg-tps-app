import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    LucideArrowLeft,
    LucideMapPin,
    LucideCalendar,
    LucideTruck,
    LucideUser,
    LucideBuilding2,
    LucideFileText,
    LucideCheckCircle,
    LucideXCircle,
    LucidePlay,
    LucideScale,
    LucideQrCode,
    LucideExternalLink
} from 'lucide-react-native';
import {
    useAdminPermit,
    useApprovePermit,
    useRejectPermit,
    useStartTransit,
    useRecordWeighment,
    useCompletePermit,
    usePermitQRCode
} from '../../../hooks/use-admin-permits';
import { StatusBadge } from '../../../components/ui/status-badge';
import { PermitStatus, WeighmentStatus } from '../../../types/database';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

export default function AdminPermitDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'weighments' | 'audit'>('overview');

    // API Hooks
    const { data: response, isLoading, refetch } = useAdminPermit(id);
    const permit = response?.data;

    // QR Code Query - only fetch if status allows
    const showQRCode = permit ? ['APPROVED', 'IN_TRANSIT', 'COMPLETED'].includes(permit.status) : false;
    const { data: qrResponse } = usePermitQRCode(id, showQRCode);
    const qrData = qrResponse?.data;

    // Action Mutations
    const approveMutation = useApprovePermit();
    const rejectMutation = useRejectPermit();
    const startTransitMutation = useStartTransit();
    const recordWeighmentMutation = useRecordWeighment();
    const completeMutation = useCompletePermit();

    // Modals State
    const [isApproveModalVisible, setIsApproveModalVisible] = useState(false);
    const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
    const [isWeighmentModalVisible, setIsWeighmentModalVisible] = useState(false);

    // Form State
    // Simplified date input for prototype (YYYY-MM-DD)
    const [validUntil, setValidUntil] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [firstWeight, setFirstWeight] = useState('');
    const [secondWeight, setSecondWeight] = useState('');
    const [weighmentNotes, setWeighmentNotes] = useState('');

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </SafeAreaView>
        );
    }

    if (!permit) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <Text className="text-foreground">Permit not found</Text>
                <Button onPress={() => router.back()} className="mt-4">
                    <Text className="text-white">Go Back</Text>
                </Button>
            </SafeAreaView>
        );
    }

    // Action Handlers
    const handleApprove = async () => {
        try {
            // Basic validation for prototype
            if (!validUntil) return Alert.alert('Error', 'Please enter valid until date');

            await approveMutation.mutateAsync({
                id,
                data: { validUntil: new Date(validUntil).toISOString() }
            });
            setIsApproveModalVisible(false);
            Alert.alert('Success', 'Permit approved successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to approve permit');
        }
    };

    const handleReject = async () => {
        try {
            if (rejectionReason.length < 10) return Alert.alert('Error', 'Reason must be at least 10 characters');

            await rejectMutation.mutateAsync({
                id,
                data: { reason: rejectionReason }
            });
            setIsRejectModalVisible(false);
            Alert.alert('Success', 'Permit rejected');
        } catch (error) {
            Alert.alert('Error', 'Failed to reject permit');
        }
    };

    const handleStartTransit = async () => {
        try {
            await startTransitMutation.mutateAsync(id);
            Alert.alert('Success', 'Transit started');
        } catch (error) {
            Alert.alert('Error', 'Failed to start transit');
        }
    };

    const handleRecordWeighment = async () => {
        try {
            if (!firstWeight || !secondWeight) return Alert.alert('Error', 'Please enter both weights');

            await recordWeighmentMutation.mutateAsync({
                permitId: id,
                plantId: permit.plant.id,
                firstWeight: parseFloat(firstWeight),
                secondWeight: parseFloat(secondWeight),
                notes: weighmentNotes
            });
            setIsWeighmentModalVisible(false);
            setFirstWeight('');
            setSecondWeight('');
            setWeighmentNotes('');
            refetch(); // Ensure list updates immediately
            Alert.alert('Success', 'Weighment recorded');
        } catch (error) {
            Alert.alert('Error', 'Failed to record weighment');
        }
    };

    const handleComplete = async () => {
        try {
            await completeMutation.mutateAsync(id);
            Alert.alert('Success', 'Permit completed');
        } catch (error) {
            Alert.alert('Error', 'Failed to complete permit');
        }
    };

    // Permission Logic
    const canApprove = [PermitStatus.SUBMITTED, PermitStatus.UNDER_REVIEW].includes(permit.status as any);
    const canReject = [PermitStatus.SUBMITTED, PermitStatus.UNDER_REVIEW].includes(permit.status);
    const canStartTransit = permit.status === PermitStatus.APPROVED;
    const canRecordWeighment = permit.status === PermitStatus.IN_TRANSIT;
    const canComplete = permit.status === PermitStatus.IN_TRANSIT && permit.weighments.length > 0;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
            {/* Header */}
            <View className="flex-row items-center p-4 border-b border-border bg-card">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <LucideArrowLeft size={24} color="hsl(240 5% 26%)" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground">{permit.permitNumber}</Text>
                    <Text className="text-xs text-muted-foreground">
                        Created {new Date(permit.createdAt).toLocaleDateString()}
                    </Text>
                </View>
                <StatusBadge status={permit.status} />
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-border bg-card">
                {(['overview', 'evidence', 'weighments', 'audit'] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        className={`flex-1 py-3 items-center border-b-2 ${activeTab === tab ? 'border-primary' : 'border-transparent'}`}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text className={`text-sm font-medium capitalize ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'}`}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView className="flex-1">
                {activeTab === 'overview' && (
                    <View className="p-4 mb-2 space-y-6">
                        {/* Logic Section or Error Section */}
                        {permit.rejectionReason && (
                            <View className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                                <Text className="text-destructive font-bold mb-1">Rejection Reason</Text>
                                <Text className="text-destructive">{permit.rejectionReason}</Text>
                            </View>
                        )}

                        {/* QR Code Section */}
                        {showQRCode && qrData && (
                            <View className="bg-card p-4 rounded-lg mb-2 border border-border items-center">
                                <Text className="font-semibold mb-4">Verification QR Code</Text>
                                <Image
                                    source={{ uri: qrData.qrCode }}
                                    className="w-48 h-48 mb-4 bg-white p-2 rounded-lg"
                                />
                                <TouchableOpacity
                                    className="flex-row items-center"
                                    onPress={() => Linking.openURL(qrData.verificationUrl)}
                                >
                                    <Text className="text-primary mr-2">Open Verification Page</Text>
                                    <LucideExternalLink size={16} color="hsl(325 45% 32%)" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Details Sections */}
                        <View className="bg-card mb-2 p-4 rounded-lg border border-border">
                            <Text className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Permit Details</Text>
                            <View className="space-y-4">
                                <View className="flex-row m-2  items-start">
                                    <LucideFileText size={20} className="text-muted-foreground mr-3 mt-0.5" color="hsl(215 20.2% 65.1%)" />
                                    <View className='ml-2'>
                                        <Text className="text-sm text-foreground font-medium">Waste Type</Text>
                                        <Text className="text-sm text-muted-foreground capitalize">
                                            {permit.wasteType.replace(/_/g, ' ').toLowerCase()}
                                        </Text>
                                    </View>
                                </View>
                                {(permit.estimatedWeight || permit.estimatedVolume) && (
                                    <View className="flex-row m-2  items-start">
                                        <LucideScale size={20} className="text-muted-foreground mr-3 mt-0.5" color="hsl(215 20.2% 65.1%)" />
                                        <View className='ml-2'>
                                            <Text className="text-sm text-foreground font-medium">Quantity</Text>
                                            <Text className="text-sm text-muted-foreground">
                                                {permit.estimatedWeight ? `${permit.estimatedWeight} kg` : `${permit.estimatedVolume} m³`}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View className="bg-card p-4 mb-2 rounded-lg border border-border">
                            <Text className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Location & Logistics</Text>
                            <View className="space-y-4">
                                <View className="flex-row items-start m-2">
                                    <LucideMapPin size={20} className="text-muted-foreground mr-3 mt-0.5" color="hsl(215 20.2% 65.1%)" />
                                    <View className='ml-2'>
                                        <Text className="text-sm text-foreground font-medium">Pickup Location</Text>
                                        <Text className="text-sm text-muted-foreground">
                                            {permit.pickupAddress}, {permit.pickupCity}, {permit.pickupState}
                                        </Text>
                                    </View>
                                </View>
                                <View className="flex-row items-start m-2">
                                    <LucideBuilding2 size={20} className="text-muted-foreground mr-3 mt-0.5" color="hsl(215 20.2% 65.1%)" />
                                    <View className='ml-2'>
                                        <Text className="text-sm text-foreground font-medium">Destination Plant</Text>
                                        <Text className="text-sm text-muted-foreground">{permit.plant.name}</Text>
                                        <Text className="text-xs text-muted-foreground">{permit.plant.address}, {permit.plant.city}</Text>
                                    </View>
                                </View>
                                {permit.driverName && (
                                    <View className="flex-row items-start m-2">
                                        <LucideUser size={20} className="text-muted-foreground mr-3 mt-0.5" color="hsl(215 20.2% 65.1%)" />
                                        <View className='ml-2'>
                                            <Text className="text-sm text-foreground font-medium">Driver</Text>
                                            <Text className="text-sm text-muted-foreground">{permit.driverName} ({permit.driverPhone})</Text>
                                        </View>
                                    </View>
                                )}
                                {permit.vehicleNumber && (
                                    <View className="flex-row items-start m-2">
                                        <LucideTruck size={20} className="text-muted-foreground mr-3 mt-0.5" color="hsl(215 20.2% 65.1%)" />
                                        <View className='ml-2'>
                                            <Text className="text-sm text-foreground font-medium">Vehicle</Text>
                                            <Text className="text-sm text-muted-foreground">{permit.vehicleNumber} {permit.vehicleType ? `(${permit.vehicleType})` : ''}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {activeTab === 'evidence' && (
                    <View className="p-4 grid grid-cols-2 gap-4">
                        {permit.wasteEvidences.length === 0 ? (
                            <Text className="text-muted-foreground text-center mt-4">No evidence photos uploaded.</Text>
                        ) : (
                            permit.wasteEvidences.map((evidence) => (
                                <View key={evidence.id} className="bg-card rounded-lg overflow-hidden border border-border mb-4">
                                    <Image source={{ uri: evidence.filePath }} className="w-full h-40 bg-gray-100" />
                                    {evidence.description && (
                                        <View className="p-2">
                                            <Text className="text-xs text-muted-foreground">{evidence.description}</Text>
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'weighments' && (
                    <View className="p-4">
                        {permit.weighments.length === 0 ? (
                            <Text className="text-muted-foreground text-center mt-4">No weighments recorded yet.</Text>
                        ) : (
                            permit.weighments.map((w) => (
                                <View key={w.id} className="bg-card p-4 rounded-lg border border-border mb-4">
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="font-semibold">{w.weighmentNumber}</Text>
                                        <Text className="text-xs text-muted-foreground">
                                            {w.weighedAt ? new Date(w.weighedAt).toLocaleDateString() : 'Pending'}
                                        </Text>
                                    </View>
                                    <View className="flex-row justify-between text-sm">
                                        <Text className="text-muted-foreground">First Weight:</Text>
                                        <Text>{w.firstWeight} kg</Text>
                                    </View>
                                    <View className="flex-row justify-between text-sm mt-1">
                                        <Text className="text-muted-foreground">Second Weight:</Text>
                                        <Text>{w.secondWeight} kg</Text>
                                    </View>
                                    <View className="flex-row justify-between text-sm mt-2 pt-2 border-t border-border">
                                        <Text className="font-semibold">Net Weight:</Text>
                                        <Text className="font-semibold">{w.netWeight} kg</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'audit' && (
                    <View className="p-4">
                        {/* Simple Audit Trail visualization based on dates */}
                        <View className="bg-card p-4 rounded-lg border border-border space-y-4">
                            <View className="flex-row">
                                <View className="w-8 items-center pt-1"><LucideFileText size={16} color="hsl(215 20.2% 65.1%)" /></View>
                                <View>
                                    <Text className="font-medium">Created</Text>
                                    <Text className="text-xs text-muted-foreground">{new Date(permit.createdAt).toLocaleString()}</Text>
                                </View>
                            </View>
                            {permit.submittedAt && (
                                <View className="flex-row">
                                    <View className="w-8 items-center pt-1"><LucideCheckCircle size={16} color="hsl(38 92% 38%)" /></View>
                                    <View>
                                        <Text className="font-medium">Submitted</Text>
                                        <Text className="text-xs text-muted-foreground">{new Date(permit.submittedAt).toLocaleString()}</Text>
                                    </View>
                                </View>
                            )}
                            {permit.approvedAt && (
                                <View className="flex-row">
                                    <View className="w-8 items-center pt-1"><LucideCheckCircle size={16} color="hsl(142 72% 29%)" /></View>
                                    <View>
                                        <Text className="font-medium">Approved</Text>
                                        <Text className="text-xs text-muted-foreground">{new Date(permit.approvedAt).toLocaleString()}</Text>
                                        {permit.approvedBy && <Text className="text-xs text-muted-foreground">By: {permit.approvedBy.name}</Text>}
                                    </View>
                                </View>
                            )}
                            {permit.transitStartedAt && (
                                <View className="flex-row">
                                    <View className="w-8 items-center pt-1"><LucideTruck size={16} color="hsl(217 91% 60%)" /></View>
                                    <View>
                                        <Text className="font-medium">Transit Started</Text>
                                        <Text className="text-xs text-muted-foreground">{new Date(permit.transitStartedAt).toLocaleString()}</Text>
                                    </View>
                                </View>
                            )}
                            {permit.completedAt && (
                                <View className="flex-row">
                                    <View className="w-8 items-center pt-1"><LucideCheckCircle size={16} color="hsl(142 72% 29%)" /></View>
                                    <View>
                                        <Text className="font-medium">Completed</Text>
                                        <Text className="text-xs text-muted-foreground">{new Date(permit.completedAt).toLocaleString()}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Bottom Padding for visual space */}
                <View className="h-24" />
            </ScrollView>

            {/* Action Buttons Bar */}
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border flex-row gap-3">
                {canApprove && (
                    <Button className="flex-1 bg-primary" onPress={() => setIsApproveModalVisible(true)}>
                        <LucideCheckCircle size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Approve</Text>
                    </Button>
                )}
                {canReject && (
                    <Button className="flex-1 bg-destructive" onPress={() => setIsRejectModalVisible(true)}>
                        <LucideXCircle size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Reject</Text>
                    </Button>
                )}
                {canStartTransit && (
                    <Button className="flex-1 bg-blue-600" onPress={handleStartTransit}>
                        <LucidePlay size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Start Transit</Text>
                    </Button>
                )}
                {canRecordWeighment && (
                    <Button className="flex-1 bg-orange-600" onPress={() => setIsWeighmentModalVisible(true)}>
                        <LucideScale size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Weighment</Text>
                    </Button>
                )}
                {canComplete && (
                    <Button className="flex-1 bg-green-700" onPress={handleComplete}>
                        <LucideCheckCircle size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Complete</Text>
                    </Button>
                )}
            </View>

            {/* Approve Modal */}
            <Modal animationType="slide" transparent={true} visible={isApproveModalVisible} onRequestClose={() => setIsApproveModalVisible(false)}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-background rounded-t-xl p-6">
                        <Text className="text-xl font-bold mb-4">Approve Permit</Text>
                        <Text className="text-sm text-muted-foreground mb-4">Set validity date for this permit.</Text>

                        <Text className="mb-2 font-medium">Valid Until (YYYY-MM-DD)</Text>
                        <TextInput
                            className="bg-input text-foreground p-3 rounded-lg mb-6 border border-border"
                            placeholder="e.g., 2026-12-31"
                            placeholderTextColor="gray"
                            value={validUntil}
                            onChangeText={setValidUntil}
                        />

                        <Button onPress={handleApprove} className="mb-3">
                            <Text className="text-white font-semibold">Confirm Approval</Text>
                        </Button>
                        <Button variant="outline" onPress={() => setIsApproveModalVisible(false)}>
                            <Text className="text-foreground">Cancel</Text>
                        </Button>
                    </View>
                </View>
            </Modal>

            {/* Reject Modal */}
            <Modal animationType="slide" transparent={true} visible={isRejectModalVisible} onRequestClose={() => setIsRejectModalVisible(false)}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-background rounded-t-xl p-6">
                        <Text className="text-xl font-bold mb-4 text-destructive">Reject Permit</Text>

                        <Text className="mb-2 font-medium">Reason for Rejection</Text>
                        <TextInput
                            className="bg-input text-foreground p-3 rounded-lg mb-6 border border-border h-24"
                            placeholder="Enter detailed reason (min 10 chars)..."
                            placeholderTextColor="gray"
                            multiline
                            textAlignVertical="top"
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                        />

                        <Button onPress={handleReject} className="bg-destructive mb-3">
                            <Text className="text-white font-semibold">Confirm Rejection</Text>
                        </Button>
                        <Button variant="outline" onPress={() => setIsRejectModalVisible(false)}>
                            <Text className="text-foreground">Cancel</Text>
                        </Button>
                    </View>
                </View>
            </Modal>

            {/* Weighment Modal */}
            <Modal animationType="slide" transparent={true} visible={isWeighmentModalVisible} onRequestClose={() => setIsWeighmentModalVisible(false)}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-background rounded-t-xl p-6">
                        <Text className="text-xl font-bold mb-4">Record Weighment</Text>

                        <Text className="mb-2 font-medium">First Weight (kg)</Text>
                        <TextInput
                            className="bg-input text-foreground p-3 rounded-lg mb-4 border border-border"
                            placeholder="0.0"
                            placeholderTextColor="gray"
                            keyboardType="numeric"
                            value={firstWeight}
                            onChangeText={setFirstWeight}
                        />

                        <Text className="mb-2 font-medium">Second Weight (kg)</Text>
                        <TextInput
                            className="bg-input text-foreground p-3 rounded-lg mb-4 border border-border"
                            placeholder="0.0"
                            placeholderTextColor="gray"
                            keyboardType="numeric"
                            value={secondWeight}
                            onChangeText={setSecondWeight}
                        />

                        <Text className="mb-2 font-medium">Notes (Optional)</Text>
                        <TextInput
                            className="bg-input text-foreground p-3 rounded-lg mb-6 border border-border"
                            placeholder="Any observations..."
                            placeholderTextColor="gray"
                            value={weighmentNotes}
                            onChangeText={setWeighmentNotes}
                        />

                        <Button onPress={handleRecordWeighment} className="mb-3">
                            <Text className="text-white font-semibold">Save Weighment</Text>
                        </Button>
                        <Button variant="outline" onPress={() => setIsWeighmentModalVisible(false)}>
                            <Text className="text-foreground">Cancel</Text>
                        </Button>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
