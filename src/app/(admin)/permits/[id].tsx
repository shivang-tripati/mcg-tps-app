import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    LucideArrowLeft,
    LucideMapPin,
    LucideTruck,
    LucideUser,
    LucideBuilding2,
    LucideFileText,
    LucideCheckCircle,
    LucideXCircle,
    LucidePlay,
    LucideScale,
    LucideExternalLink,
    LucideCalendar,
    LucideClipboardList,
    LucideImage,
    LucideCamera,

} from 'lucide-react-native';
import {
    useAdminPermit,
    useStartTransit,
    useCompletePermit,
    usePermitQRCode
} from '../../../hooks/use-admin-permits';
import { StatusBadge } from '../../../components/ui/status-badge';
import { PermitStatus } from '../../../types/database';
import { Button } from '../../../components/ui/button';
import { resolveEvidenceFileUrl } from '../../../lib/utils';
import ApprovePermitModal from '../../../components/modals/approve-permit-modal';
import RejectPermitModal from '../../../components/modals/reject-permit-modal';
import RecordWeighmentModal from '../../../components/modals/record-weighment-modal';
import { showToast } from '../../../lib/toast';

// Helper to format date
const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDateShort = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

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
    const startTransitMutation = useStartTransit();
    const completeMutation = useCompletePermit();

    // Modals State
    const [isApproveModalVisible, setIsApproveModalVisible] = useState(false);
    const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
    const [isWeighmentModalVisible, setIsWeighmentModalVisible] = useState(false);

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
    const handleStartTransit = async () => {
        try {
            await startTransitMutation.mutateAsync(id);
            showToast.success('Transit Started', 'Permit is now in transit');
        } catch (error) {
            console.error('Start transit error:', error);
        }
    };

    const handleComplete = async () => {
        try {
            await completeMutation.mutateAsync(id);
            showToast.success('Permit Completed', 'The permit has been completed successfully');
        } catch (error) {
            console.error('Complete error:', error);
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
            <View className="flex-row items-center px-4 border-b border-border bg-card">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <LucideArrowLeft size={24} color="hsl(240 5% 26%)" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground">{permit.permitNumber}</Text>
                    <Text className="text-xs text-muted-foreground">
                        Created {formatDateShort(permit.createdAt)}
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

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
                {activeTab === 'overview' && (
                    <View className="p-4 mb-2 space-y-4 gap-y-4">
                        {/* Rejection Reason */}
                        {permit.rejectionReason && (
                            <View className="bg-error/10 p-4 rounded-lg border border-error/20">
                                <Text className="text-error font-bold mb-1">Rejection Reason</Text>
                                <Text className="text-error">{permit.rejectionReason}</Text>
                            </View>
                        )}

                        {/* QR Code Section */}
                        {showQRCode && qrData && (
                            <View className="bg-card p-4 rounded-lg border border-border items-center">
                                <Text className="font-semibold mb-4">Verification QR Code</Text>
                                <Image
                                    source={{ uri: qrData.qrCode }}
                                    className="w-48 h-48 mb-4 bg-white p-2 rounded-lg"
                                    resizeMode="contain"
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

                        {/* Permit Details Section */}
                        <View className="bg-card p-4 rounded-lg border border-border">
                            <View className="flex-row items-center mb-3">
                                <LucideFileText size={18} color="hsl(325 45% 32%)" />
                                <Text className="text-sm font-semibold text-foreground ml-2">Permit Details</Text>
                            </View>
                            <View className="space-y-3">
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Permit Number</Text>
                                    <Text className="text-sm font-medium text-foreground">{permit.permitNumber}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Token</Text>
                                    <Text className="text-sm font-mono text-foreground">{permit.token}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Waste Type</Text>
                                    <Text className="text-sm font-medium text-foreground capitalize">
                                        {permit.wasteType.replace(/_/g, ' ').toLowerCase()}
                                    </Text>
                                </View>
                                {(permit.estimatedWeight || permit.estimatedVolume) && (
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-muted-foreground">Estimated Quantity</Text>
                                        <Text className="text-sm font-medium text-foreground">
                                            {permit.estimatedWeight ? `${permit.estimatedWeight} kg` : `${permit.estimatedVolume} m³`}
                                        </Text>
                                    </View>
                                )}
                                {permit.wasteDescription && (
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-muted-foreground">Description</Text>
                                        <Text className="text-sm font-medium text-foreground flex-1 text-right ml-4">
                                            {permit.wasteDescription}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Location & Logistics Section */}
                        <View className="bg-card p-4 rounded-lg border border-border">
                            <View className="flex-row items-center mb-3">
                                <LucideMapPin size={18} color="hsl(325 45% 32%)" />
                                <Text className="text-sm font-semibold text-foreground ml-2">Location & Logistics</Text>
                            </View>
                            <View className="space-y-3">
                                {/* Pickup Location */}
                                <View>
                                    <Text className="text-xs text-muted-foreground mb-1">Pickup Location</Text>
                                    <Text className="text-sm text-foreground">
                                        {permit.pickupAddress}
                                    </Text>
                                    <Text className="text-sm text-muted-foreground">
                                        {permit.pickupCity}, {permit.pickupState} - {permit.pickupPincode}
                                    </Text>
                                </View>

                                {/* Destination Plant */}
                                <View className="pt-2 border-t border-border">
                                    <Text className="text-xs text-muted-foreground mb-1">Destination Plant</Text>
                                    <Text className="text-sm font-medium text-foreground">{permit.plant.name}</Text>
                                    <Text className="text-sm text-muted-foreground">
                                        {permit.plant.code} • {permit.plant.address}, {permit.plant.city}
                                    </Text>
                                </View>

                                {/* Project Info */}
                                {permit.project && (
                                    <View className="pt-2 border-t border-border">
                                        <Text className="text-xs text-muted-foreground mb-1">Project</Text>
                                        <Text className="text-sm font-medium text-foreground">{permit.project.name}</Text>
                                        <Text className="text-sm text-muted-foreground">
                                            {permit.project.address}, {permit.project.city}
                                        </Text>
                                        {permit.project.company && (
                                            <Text className="text-sm text-muted-foreground">
                                                Company: {permit.project.company.name}
                                            </Text>
                                        )}
                                    </View>
                                )}

                                {/* Driver & Vehicle */}
                                {(permit.driverName || permit.vehicleNumber) && (
                                    <View className="pt-2 border-t border-border">
                                        {permit.driverName && (
                                            <View className="flex-row justify-between mb-1">
                                                <Text className="text-sm text-muted-foreground">Driver</Text>
                                                <Text className="text-sm font-medium text-foreground">
                                                    {permit.driverName} {permit.driverPhone ? `(${permit.driverPhone})` : ''}
                                                </Text>
                                            </View>
                                        )}
                                        {permit.vehicleNumber && (
                                            <View className="flex-row justify-between">
                                                <Text className="text-sm text-muted-foreground">Vehicle</Text>
                                                <Text className="text-sm font-medium text-foreground">
                                                    {permit.vehicleNumber} {permit.vehicleType ? `(${permit.vehicleType})` : ''}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Validity Section */}
                        {(permit.validFrom || permit.validUntil) && (
                            <View className="bg-card p-4 rounded-lg border border-border">
                                <View className="flex-row items-center mb-3">
                                    <LucideCalendar size={18} color="hsl(325 45% 32%)" />
                                    <Text className="text-sm font-semibold text-foreground ml-2">Validity</Text>
                                </View>
                                <View className="space-y-2">
                                    {permit.validFrom && (
                                        <View className="flex-row justify-between">
                                            <Text className="text-sm text-muted-foreground">Valid From</Text>
                                            <Text className="text-sm font-medium text-foreground">{formatDate(permit.validFrom)}</Text>
                                        </View>
                                    )}
                                    {permit.validUntil && (
                                        <View className="flex-row justify-between">
                                            <Text className="text-sm text-muted-foreground">Valid Until</Text>
                                            <Text className="text-sm font-medium text-foreground">{formatDate(permit.validUntil)}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* User Info Section */}
                        <View className="bg-card p-4 rounded-lg border border-border">
                            <View className="flex-row items-center mb-3">
                                <LucideUser size={18} color="hsl(325 45% 32%)" />
                                <Text className="text-sm font-semibold text-foreground ml-2">User Information</Text>
                            </View>
                            <View className="space-y-2">
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Name</Text>
                                    <Text className="text-sm font-medium text-foreground">{permit.user.name}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Email</Text>
                                    <Text className="text-sm font-medium text-foreground">{permit.user.email}</Text>
                                </View>
                                {permit.user.phone && (
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-muted-foreground">Phone</Text>
                                        <Text className="text-sm font-medium text-foreground">{permit.user.phone}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Approval Info */}
                        {(permit.approvedBy || permit.rejectedBy) && (
                            <View className="bg-card p-4 rounded-lg border border-border">
                                <View className="flex-row items-center mb-3">
                                    <LucideCheckCircle size={18} color="hsl(325 45% 32%)" />
                                    <Text className="text-sm font-semibold text-foreground ml-2">Approval Info</Text>
                                </View>
                                <View className="space-y-2">
                                    {permit.approvedBy && permit.approvedAt && (
                                        <>
                                            <View className="flex-row justify-between">
                                                <Text className="text-sm text-muted-foreground">Approved By</Text>
                                                <Text className="text-sm font-medium text-foreground">{permit.approvedBy.name}</Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-sm text-muted-foreground">Approved At</Text>
                                                <Text className="text-sm font-medium text-foreground">{formatDate(permit.approvedAt)}</Text>
                                            </View>
                                        </>
                                    )}
                                    {permit.rejectedBy && permit.rejectionReason && (
                                        <>
                                            <View className="flex-row justify-between">
                                                <Text className="text-sm text-muted-foreground">Rejected By</Text>
                                                <Text className="text-sm font-medium text-foreground">{permit.rejectedBy.name}</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'evidence' && (
                    <View className="p-4">
                        <View className="flex-row items-center mb-4">
                            <LucideImage size={18} color="hsl(325 45% 32%)" />
                            <Text className="text-sm font-semibold text-foreground ml-2">Waste Evidence Photos</Text>
                        </View>
                        {permit.wasteEvidences.length === 0 ? (
                            <View className="bg-card p-8 rounded-lg border border-border items-center">
                                <LucideCamera size={48} color="hsl(240 3.8% 46.1%)" opacity={0.5} />
                                <Text className="text-muted-foreground text-center mt-4">No evidence photos uploaded.</Text>
                            </View>
                        ) : (
                            <View className="flex-row flex-wrap gap-2">
                                {permit.wasteEvidences.map((evidence) => (
                                    <View key={evidence.id} className="bg-card rounded-lg overflow-hidden border border-border w-[48%] mb-4">
                                        <Image
                                            source={{ uri: resolveEvidenceFileUrl(evidence.filePath) }}
                                            className="w-full h-48 bg-gray-100"
                                            resizeMode="cover"
                                        />
                                        <View className="p-2">
                                            {evidence.description && (
                                                <Text className="text-xs text-muted-foreground">{evidence.description}</Text>
                                            )}
                                            <Text className="text-xs text-muted-foreground mt-1">
                                                {formatDateShort(evidence.createdAt)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'weighments' && (
                    <View className="p-4">
                        <View className="flex-row items-center mb-4">
                            <LucideScale size={18} color="hsl(325 45% 32%)" />
                            <Text className="text-sm font-semibold text-foreground ml-2">Weighments</Text>
                        </View>
                        {permit.weighments.length === 0 ? (
                            <View className="bg-card p-8 rounded-lg border border-border items-center">
                                <LucideScale size={48} color="hsl(240 3.8% 46.1%)" opacity={0.5} />
                                <Text className="text-muted-foreground text-center mt-4">No weighments recorded yet.</Text>
                            </View>
                        ) : (
                            permit.weighments.map((w) => (
                                <View key={w.id} className="bg-card p-4 rounded-lg border border-border mb-4">
                                    <View className="flex-row justify-between items-center mb-2">
                                        <Text className="font-semibold text-foreground">{w.weighmentNumber}</Text>
                                        <StatusBadge status={w.status} />
                                    </View>
                                    <View className="space-y-1">
                                        <View className="flex-row justify-between">
                                            <Text className="text-sm text-muted-foreground">First Weight</Text>
                                            <Text className="text-sm font-medium text-foreground">{w.firstWeight || 'N/A'} kg</Text>
                                        </View>
                                        <View className="flex-row justify-between">
                                            <Text className="text-sm text-muted-foreground">Second Weight</Text>
                                            <Text className="text-sm font-medium text-foreground">{w.secondWeight || 'N/A'} kg</Text>
                                        </View>
                                        <View className="flex-row justify-between pt-2 border-t border-border">
                                            <Text className="text-sm font-semibold text-foreground">Net Weight</Text>
                                            <Text className="text-sm font-bold text-primary">{w.netWeight || 'N/A'} kg</Text>
                                        </View>
                                        {w.weighedAt && (
                                            <View className="flex-row justify-between pt-1">
                                                <Text className="text-xs text-muted-foreground">Weighed At</Text>
                                                <Text className="text-xs text-muted-foreground">{formatDate(w.weighedAt)}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'audit' && (
                    <View className="p-4">
                        <View className="flex-row items-center mb-4">
                            <LucideClipboardList size={18} color="hsl(325 45% 32%)" />
                            <Text className="text-sm font-semibold text-foreground ml-2">Audit Trail</Text>
                        </View>
                        <View className="bg-card p-4 rounded-lg border border-border">
                            {/* Created */}
                            <View className="flex-row items-start mb-4">
                                <View className="w-8 items-center">
                                    <LucideFileText size={16} color="hsl(215 20.2% 65.1%)" />
                                </View>
                                <View className="flex-1 ml-2">
                                    <Text className="font-medium text-foreground">Created</Text>
                                    <Text className="text-xs text-muted-foreground">{formatDate(permit.createdAt)}</Text>
                                    <Text className="text-xs text-muted-foreground">By: {permit.user.name}</Text>
                                </View>
                            </View>

                            {/* Submitted */}
                            {permit.submittedAt && (
                                <View className="flex-row items-start mb-4">
                                    <View className="w-8 items-center">
                                        <LucideCheckCircle size={16} color="hsl(38 92% 38%)" />
                                    </View>
                                    <View className="flex-1 ml-2">
                                        <Text className="font-medium text-foreground">Submitted</Text>
                                        <Text className="text-xs text-muted-foreground">{formatDate(permit.submittedAt)}</Text>
                                        <Text className="text-xs text-muted-foreground">By: {permit.user.name}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Approved */}
                            {permit.approvedAt && permit.approvedBy && (
                                <View className="flex-row items-start mb-4">
                                    <View className="w-8 items-center">
                                        <LucideCheckCircle size={16} color="hsl(142 72% 29%)" />
                                    </View>
                                    <View className="flex-1 ml-2">
                                        <Text className="font-medium text-foreground">Approved</Text>
                                        <Text className="text-xs text-muted-foreground">{formatDate(permit.approvedAt)}</Text>
                                        <Text className="text-xs text-muted-foreground">By: {permit.approvedBy.name}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Transit Started */}
                            {permit.transitStartedAt && (
                                <View className="flex-row items-start mb-4">
                                    <View className="w-8 items-center">
                                        <LucideTruck size={16} color="hsl(217 91% 60%)" />
                                    </View>
                                    <View className="flex-1 ml-2">
                                        <Text className="font-medium text-foreground">Transit Started</Text>
                                        <Text className="text-xs text-muted-foreground">{formatDate(permit.transitStartedAt)}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Completed */}
                            {permit.completedAt && (
                                <View className="flex-row items-start mb-4">
                                    <View className="w-8 items-center">
                                        <LucideCheckCircle size={16} color="hsl(142 72% 29%)" />
                                    </View>
                                    <View className="flex-1 ml-2">
                                        <Text className="font-medium text-foreground">Completed</Text>
                                        <Text className="text-xs text-muted-foreground">{formatDate(permit.completedAt)}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Rejection */}
                            {permit.rejectionReason && permit.rejectedBy && (
                                <View className="flex-row items-start">
                                    <View className="w-8 items-center">
                                        <LucideXCircle size={16} color="hsl(0 84% 60%)" />
                                    </View>
                                    <View className="flex-1 ml-2">
                                        <Text className="font-medium text-error">Rejected</Text>
                                        <Text className="text-xs text-muted-foreground">By: {permit.rejectedBy.name}</Text>
                                        <Text className="text-xs text-error mt-1">Reason: {permit.rejectionReason}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                <View className="h-24" />
            </ScrollView>

            {/* Action Buttons Bar */}
            <View className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-background border-t border-border flex-row gap-3 flex-wrap">
                {canApprove && (
                    <Button className="flex-1 min-w-[45%] bg-primary" onPress={() => setIsApproveModalVisible(true)}>
                        <LucideCheckCircle size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Approve</Text>
                    </Button>
                )}
                {canReject && (
                    <Button className="flex-1 min-w-[45%] bg-error" onPress={() => setIsRejectModalVisible(true)}>
                        <LucideXCircle size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Reject</Text>
                    </Button>
                )}
                {canStartTransit && (
                    <Button className="flex-1 min-w-[45%] bg-blue-600" onPress={handleStartTransit} loading={startTransitMutation.isPending}>
                        <LucidePlay size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Start Transit</Text>
                    </Button>
                )}
                {canRecordWeighment && (
                    <Button className="flex-1 min-w-[45%] bg-orange-600" onPress={() => setIsWeighmentModalVisible(true)}>
                        <LucideScale size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Weighment</Text>
                    </Button>
                )}
                {canComplete && (
                    <Button className="flex-1 min-w-[45%] bg-green-700" onPress={handleComplete} loading={completeMutation.isPending}>
                        <LucideCheckCircle size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold">Complete</Text>
                    </Button>
                )}
            </View>

            {/* Modals */}
            <ApprovePermitModal
                visible={isApproveModalVisible}
                onClose={() => setIsApproveModalVisible(false)}
                permitId={id}
                onSuccess={() => {
                    refetch();
                    setIsApproveModalVisible(false);
                }}
            />

            <RejectPermitModal
                visible={isRejectModalVisible}
                onClose={() => setIsRejectModalVisible(false)}
                permitId={id}
                onSuccess={() => {
                    refetch();
                    setIsRejectModalVisible(false);
                }}
            />

            <RecordWeighmentModal
                visible={isWeighmentModalVisible}
                onClose={() => setIsWeighmentModalVisible(false)}
                permitId={id}
                plantId={permit.plant.id}
                onSuccess={() => {
                    refetch();
                    setIsWeighmentModalVisible(false);
                }}
            />
        </SafeAreaView>
    );
}