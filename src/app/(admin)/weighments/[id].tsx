import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Linking,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    LucideScale,
    LucideFileText,
    LucideCreditCard,
    LucideFactory,
    LucideCalendar,
    LucideExternalLink,
    LucideArrowLeft,
    LucideCheckCircle,
    LucideXCircle,
    LucideAlertCircle,
    LucideDownload,
    LucideFileCheck2,
} from 'lucide-react-native';
import { useWeighment } from '../../../hooks/use-admin';
import { useWeighmentActions } from '../../../hooks/use-weighments';
import { WeighmentStatus, PaymentStatus } from '../../../types/database';
import { Button } from '../../../components/ui/button';
import { showToast } from '../../../lib/toast';
import { PRIMARY } from '../../../data/contant';

const getStatusStyle = (status: WeighmentStatus) => {
    switch (status) {
        case WeighmentStatus.APPROVED:
            return { bg: 'bg-green-100', text: 'text-green-700' };
        case WeighmentStatus.REJECTED:
            return { bg: 'bg-red-100', text: 'text-red-700' };
        default:
            return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    }
};

const getPaymentStyle = (status: PaymentStatus) => {
    switch (status) {
        case PaymentStatus.PAID:
            return { bg: 'bg-green-100', text: 'text-green-700' };
        case PaymentStatus.FAILED:
            return { bg: 'bg-red-100', text: 'text-red-700' };
        default:
            return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    }
};

// ✅ Helper function to get full URL for file access
const getFullUrl = (path: string) => {
    if (!path) return null;

    // If it's already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Get the base URL from environment
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || '';

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // ✅ The file is served from the API route /api/v1/uploads/[...path]
    // The path in the database already includes the folder structure
    // For example: /uploads/public/weighments/file.pdf
    const url = `${baseUrl}${cleanPath}`;

    console.log('📄 Generated PDF URL:', url);
    console.log('📄 Base URL:', baseUrl);
    console.log('📄 Clean Path:', cleanPath);

    return url;
};

// ✅ Helper function to open PDF
const openPDF = async (url: string) => {
    try {
        const fullUrl = getFullUrl(url);

        if (!fullUrl) {
            Alert.alert('Error', 'Invalid file URL');
            return;
        }

        console.log('Opening PDF:', fullUrl);

        // Check if the URL is accessible
        const supported = await Linking.canOpenURL(fullUrl);

        if (supported) {
            await Linking.openURL(fullUrl);
        } else {
            Alert.alert(
                'Cannot Open File',
                'No application found to open this PDF. Please download it manually.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Copy URL',
                        onPress: () => {
                            // Copy URL to clipboard
                            // You'll need to import Clipboard from 'react-native'
                            Alert.alert('URL Copied', fullUrl);
                        }
                    }
                ]
            );
        }
    } catch (error) {
        console.error('Error opening PDF:', error);
        Alert.alert('Error', 'Could not open the PDF file. Please try again later.');
    }
};

export default function WeighmentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data: response, isLoading, refetch } = useWeighment(id);
    const { markPaid, approve, reject } = useWeighmentActions(id || '');

    // Modal states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);

    // Form states
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    const resetPaymentForm = () => {
        setPaymentAmount('');
        setPaymentMethod('');
        setPaymentReference('');
    };

    const resetRejectForm = () => {
        setRejectionReason('');
    };

    const handleMarkPaid = async () => {
        if (!paymentAmount || !paymentReference) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            await markPaid.mutateAsync({
                paymentAmount: parseFloat(paymentAmount),
                paymentMethod: paymentMethod || undefined,
                paymentReference,
            });
            setShowPaymentModal(false);
            resetPaymentForm();
            refetch();
            showToast.success('Success', 'Payment marked as paid');
        } catch (error: any) {
            showToast.error('Error', error?.message || 'Failed to mark as paid');
        }
    };

    const handleApprove = async () => {
        try {
            await approve.mutateAsync();
            setShowApproveConfirm(false);
            refetch();
            showToast.success('Success', 'Weighment approved successfully');
        } catch (error: any) {
            showToast.error('Error', error?.message || 'Failed to approve weighment');
        }
    };

    const handleReject = async () => {
        if (!rejectionReason || rejectionReason.length < 10) {
            Alert.alert('Error', 'Rejection reason must be at least 10 characters');
            return;
        }

        try {
            await reject.mutateAsync({ reason: rejectionReason });
            setShowRejectModal(false);
            resetRejectForm();
            refetch();
            showToast.success('Success', 'Weighment rejected');
        } catch (error: any) {
            showToast.error('Error', error?.message || 'Failed to reject weighment');
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </SafeAreaView>
        );
    }

    const weighment = response?.data;

    if (!weighment) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <Text className="text-muted-foreground">Weighment not found</Text>
            </SafeAreaView>
        );
    }

    const statusStyle = getStatusStyle(weighment.status);
    const paymentStyle = getPaymentStyle(weighment.paymentStatus);
    const isPending = weighment.status === WeighmentStatus.PENDING;
    const isPaid = weighment.paymentStatus === PaymentStatus.PAID;
    const isApproved = weighment.status === WeighmentStatus.APPROVED;
    const isRejected = weighment.status === WeighmentStatus.REJECTED;

    // ✅ Get the full URL for the PDF
    const pdfUrl = weighment.fileUrl ? getFullUrl(weighment.fileUrl) : null;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-border bg-card">
                <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
                    <LucideArrowLeft size={24} color="hsl(325 45% 32%)" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground">{weighment.weighmentNumber}</Text>
                    <Text className="text-xs text-muted-foreground">Weighment Details</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <View className={`px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
                        <Text className={`text-xs font-bold ${statusStyle.text}`}>
                            {weighment.status}
                        </Text>
                    </View>
                    {isPaid && (
                        <View className="px-2 py-0.5 rounded-full bg-green-100">
                            <Text className="text-xs font-bold text-green-700">Paid</Text>
                        </View>
                    )}
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Action Buttons */}
                {/* Action Buttons */}
                {isPending && (
                    <View className="mx-4 mt-4 bg-card rounded-xl border border-border p-4">
                        <View className="flex-row flex-wrap gap-2">
                            {!isPaid && (
                                <Button
                                    label="Mark as Paid"
                                    onPress={() => setShowPaymentModal(true)}
                                    variant="secondary"
                                    className="flex-1 min-w-[120px]"
                                >
                                    <LucideCreditCard size={16} color={PRIMARY} />
                                </Button>
                            )}
                            {isPaid && (
                                <Button
                                    label="Approve"
                                    onPress={() => setShowApproveConfirm(true)}
                                    variant="outline"
                                    className="flex-1 min-w-[120px]"
                                >
                                    <LucideCheckCircle size={16} color="green" />
                                </Button>
                            )}
                            <Button
                                label="Reject"
                                onPress={() => setShowRejectModal(true)}
                                variant="secondary"
                                className="flex-1 min-w-[120px]"
                            >
                                <LucideXCircle size={16} color="red" />
                            </Button>
                        </View>
                    </View>
                )}

                {/* Download PDF Button - ✅ Fixed to use full URL */}
                {isApproved && pdfUrl && (
                    <View className="mx-4 mt-4">
                        <TouchableOpacity
                            className="bg-primary rounded-xl p-4 flex-row items-center justify-center"
                            onPress={() => openPDF(pdfUrl)}
                        >
                            <LucideDownload size={20} color="white" />
                            <Text className="text-white font-semibold ml-2">Download Weighment Slip</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Rejection Reason Alert */}
                {isRejected && weighment.rejectionReason && (
                    <View className="mx-4 mt-4 bg-red-50 rounded-xl border border-red-200 p-4">
                        <View className="flex-row items-start gap-3">
                            <LucideAlertCircle size={20} color="#dc2626" />
                            <View className="flex-1">
                                <Text className="font-medium text-red-800">Rejection Reason</Text>
                                <Text className="text-red-700 mt-1 text-sm">{weighment.rejectionReason}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Weighment Details */}
                <View className="bg-card m-4 rounded-xl border border-border p-4">
                    <View className="flex-row items-center mb-4">
                        <View className="p-3 rounded-xl bg-rose-100 mr-3">
                            <LucideScale size={28} color="hsl(346 77% 50%)" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-foreground">{weighment.weighmentNumber}</Text>
                            <View className="flex-row items-center mt-1 gap-2">
                                <View className={`px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
                                    <Text className={`text-xs font-bold ${statusStyle.text}`}>
                                        {weighment.status}
                                    </Text>
                                </View>
                                <View className={`px-2 py-0.5 rounded-full ${paymentStyle.bg}`}>
                                    <Text className={`text-xs font-bold ${paymentStyle.text}`}>
                                        {weighment.paymentStatus}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Permit & Plant Info */}
                    <View className="gap-3 mb-4">
                        {weighment.permit && (
                            <View className="flex-row items-center">
                                <LucideFileText size={16} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-muted-foreground text-sm ml-2">
                                    Permit: {weighment.permit.permitNumber}
                                </Text>
                            </View>
                        )}
                        {weighment.plant && (
                            <View className="flex-row items-center">
                                <LucideFactory size={16} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-muted-foreground text-sm ml-2">
                                    {weighment.plant.name} ({weighment.plant.code})
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Weighment Data */}
                    <View className="bg-muted rounded-lg p-4">
                        <Text className="text-sm font-semibold text-foreground mb-3">Weighment Data</Text>
                        <View className="flex-row gap-2">
                            <View className="flex-1 items-center bg-card rounded-lg py-3 border border-border">
                                <Text className="text-xs text-muted-foreground">First</Text>
                                <Text className="text-lg font-bold text-foreground">
                                    {weighment.firstWeight ? `${weighment.firstWeight} kg` : '-'}
                                </Text>
                                {weighment.firstWeighmentAt && (
                                    <Text className="text-[10px] text-muted-foreground">
                                        {new Date(weighment.firstWeighmentAt).toLocaleTimeString()}
                                    </Text>
                                )}
                            </View>
                            <View className="flex-1 items-center bg-card rounded-lg py-3 border border-border">
                                <Text className="text-xs text-muted-foreground">Second</Text>
                                <Text className="text-lg font-bold text-foreground">
                                    {weighment.secondWeight ? `${weighment.secondWeight} kg` : '-'}
                                </Text>
                                {weighment.secondWeighmentAt && (
                                    <Text className="text-[10px] text-muted-foreground">
                                        {new Date(weighment.secondWeighmentAt).toLocaleTimeString()}
                                    </Text>
                                )}
                            </View>
                            <View className="flex-1 items-center bg-primary/10 rounded-lg py-3 border border-primary/20">
                                <Text className="text-xs text-muted-foreground">Net</Text>
                                <Text className="text-lg font-bold text-primary">
                                    {weighment.netWeight ? `${weighment.netWeight} kg` : '-'}
                                </Text>
                            </View>
                        </View>
                        {weighment.notes && (
                            <View className="mt-3 pt-3 border-t border-border">
                                <Text className="text-xs text-muted-foreground">Notes</Text>
                                <Text className="text-sm text-foreground mt-1">{weighment.notes}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Payment Info */}
                <View className="px-4 mb-4">
                    <Text className="text-lg font-semibold text-foreground mb-3">Payment Details</Text>
                    <View className="bg-card rounded-xl p-4 border border-border">
                        <View className="flex-row items-center mb-3">
                            <LucideCreditCard size={20} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-sm font-medium text-foreground ml-2">Payment Information</Text>
                        </View>
                        <View className="gap-2">
                            <View className="flex-row justify-between">
                                <Text className="text-sm text-muted-foreground">Amount</Text>
                                <Text className="text-sm font-semibold text-foreground">
                                    {weighment.paymentAmount ? `₹${weighment.paymentAmount}` : '-'}
                                </Text>
                            </View>
                            {weighment.paymentMethod && (
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Method</Text>
                                    <Text className="text-sm text-foreground">{weighment.paymentMethod}</Text>
                                </View>
                            )}
                            {weighment.paymentReference && (
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Reference</Text>
                                    <Text className="text-sm text-foreground font-mono">{weighment.paymentReference}</Text>
                                </View>
                            )}
                            {weighment.paidAt && (
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Paid At</Text>
                                    <Text className="text-sm text-foreground">
                                        {new Date(weighment.paidAt).toLocaleString()}
                                    </Text>
                                </View>
                            )}
                            {weighment.paidBy && (
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Paid By</Text>
                                    <Text className="text-sm text-foreground">{weighment.paidBy.name}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Approval Details */}
                {weighment.approvedAt && (
                    <View className="px-4 mb-4">
                        <Text className="text-lg font-semibold text-foreground mb-3">Approval Details</Text>
                        <View className="bg-card rounded-xl p-4 border border-border">
                            <View className="flex-row items-center mb-2">
                                <LucideFileCheck2 size={20} color="hsl(142 72% 29%)" />
                                <Text className="text-sm font-medium text-foreground ml-2">Approved</Text>
                            </View>
                            {weighment.approvedBy && (
                                <View className="flex-row justify-between">
                                    <Text className="text-sm text-muted-foreground">Approved By</Text>
                                    <Text className="text-sm text-foreground font-medium">{weighment.approvedBy.name}</Text>
                                </View>
                            )}
                            <View className="flex-row justify-between mt-1">
                                <Text className="text-sm text-muted-foreground">Approved At</Text>
                                <Text className="text-sm text-foreground">
                                    {new Date(weighment.approvedAt).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Weighment Slip - ✅ Fixed with proper URL */}
                {pdfUrl && (
                    <View className="px-4 mb-4">
                        <Text className="text-lg font-semibold text-foreground mb-3">Weighment Slip</Text>
                        <TouchableOpacity
                            className="bg-card rounded-xl p-4 border border-border flex-row items-center"
                            onPress={() => openPDF(pdfUrl)}
                        >
                            <LucideFileText size={24} color="hsl(325 45% 32%)" />
                            <Text className="text-sm text-foreground ml-3 flex-1">View Weighment Slip PDF</Text>
                            <LucideExternalLink size={16} color="hsl(240 3.8% 46.1%)" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Timestamps */}
                <View className="px-4 mb-6">
                    <Text className="text-lg font-semibold text-foreground mb-3">Timeline</Text>
                    <View className="bg-card rounded-xl p-4 border border-border gap-2">
                        <View className="flex-row items-center">
                            <LucideCalendar size={14} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-sm text-muted-foreground ml-2">
                                Created: {new Date(weighment.createdAt).toLocaleString()}
                            </Text>
                        </View>
                        {weighment.weighedAt && (
                            <View className="flex-row items-center">
                                <LucideScale size={14} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-sm text-muted-foreground ml-2">
                                    Weighed: {new Date(weighment.weighedAt).toLocaleString()}
                                </Text>
                            </View>
                        )}
                        {weighment.approvedAt && (
                            <View className="flex-row items-center">
                                <LucideCalendar size={14} color="hsl(142 72% 29%)" />
                                <Text className="text-sm text-muted-foreground ml-2">
                                    Approved: {new Date(weighment.approvedAt).toLocaleString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Payment Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showPaymentModal}
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1 justify-end bg-black/50"
                >
                    <View className="bg-background rounded-t-2xl p-6 pb-8">
                        <View className="items-center mb-4">
                            <View className="w-12 h-1 rounded-full bg-muted" />
                        </View>
                        <Text className="text-xl font-bold text-foreground mb-2">Mark as Paid</Text>
                        <Text className="text-sm text-muted-foreground mb-4">
                            Enter payment details for this weighment
                        </Text>

                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-2">Payment Amount (₹) *</Text>
                            <TextInput
                                className="bg-input text-foreground p-3 rounded-lg border border-border"
                                placeholder="Enter amount"
                                placeholderTextColor="#9ca3af"
                                keyboardType="decimal-pad"
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-2">Payment Method</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'].map((method) => (
                                    <TouchableOpacity
                                        key={method}
                                        className={`px-4 py-2 rounded-lg border ${paymentMethod === method ? 'bg-primary border-primary' : 'bg-input border-border'}`}
                                        onPress={() => setPaymentMethod(method)}
                                    >
                                        <Text className={paymentMethod === method ? 'text-white' : 'text-foreground'}>
                                            {method}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-2">Payment Reference *</Text>
                            <TextInput
                                className="bg-input text-foreground p-3 rounded-lg border border-border"
                                placeholder="Transaction ID or receipt number"
                                placeholderTextColor="#9ca3af"
                                value={paymentReference}
                                onChangeText={setPaymentReference}
                            />
                        </View>

                        <View className="flex-row gap-3 mt-2">
                            <TouchableOpacity
                                className="flex-1 bg-primary py-3 rounded-xl"
                                onPress={handleMarkPaid}
                                disabled={markPaid.isPending}
                            >
                                <Text className="text-white font-semibold text-center">
                                    {markPaid.isPending ? 'Processing...' : 'Confirm Payment'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-muted py-3 rounded-xl"
                                onPress={() => {
                                    setShowPaymentModal(false);
                                    resetPaymentForm();
                                }}
                            >
                                <Text className="text-foreground font-semibold text-center">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Reject Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showRejectModal}
                onRequestClose={() => setShowRejectModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1 justify-end bg-black/50"
                >
                    <View className="bg-background rounded-t-2xl p-6 pb-8">
                        <View className="items-center mb-4">
                            <View className="w-12 h-1 rounded-full bg-muted" />
                        </View>
                        <Text className="text-xl font-bold text-foreground mb-2">Reject Weighment</Text>
                        <Text className="text-sm text-muted-foreground mb-4">
                            Please provide a reason for rejection
                        </Text>

                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-2">Rejection Reason *</Text>
                            <TextInput
                                className="bg-input text-foreground p-3 rounded-lg border border-border min-h-[100px]"
                                placeholder="Enter reason for rejection (min 10 characters)"
                                placeholderTextColor="#9ca3af"
                                value={rejectionReason}
                                onChangeText={setRejectionReason}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                            {rejectionReason.length > 0 && rejectionReason.length < 10 && (
                                <Text className="text-error text-xs mt-1">
                                    Minimum 10 characters required
                                </Text>
                            )}
                        </View>

                        <View className="flex-row gap-3 mt-2">
                            <TouchableOpacity
                                className="flex-1 bg-red-600 py-3 rounded-xl"
                                onPress={handleReject}
                                disabled={reject.isPending}
                            >
                                <Text className="text-white font-semibold text-center">
                                    {reject.isPending ? 'Processing...' : 'Confirm Rejection'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-muted py-3 rounded-xl"
                                onPress={() => {
                                    setShowRejectModal(false);
                                    resetRejectForm();
                                }}
                            >
                                <Text className="text-foreground font-semibold text-center">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Approve Confirmation Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showApproveConfirm}
                onRequestClose={() => setShowApproveConfirm(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-background rounded-t-2xl p-6 pb-8">
                        <View className="items-center mb-4">
                            <View className="w-12 h-1 rounded-full bg-muted" />
                        </View>
                        <Text className="text-xl font-bold text-foreground mb-2">Approve Weighment</Text>
                        <View className="mb-4">
                            <Text className="text-sm text-muted-foreground">
                                Are you sure you want to approve this weighment? This will:
                            </Text>
                            <View className="mt-3 gap-2">
                                <View className="flex-row items-center gap-2">
                                    <LucideCheckCircle size={16} color="hsl(142 72% 29%)" />
                                    <Text className="text-sm text-muted-foreground">Mark the weighment as APPROVED</Text>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <LucideCheckCircle size={16} color="hsl(142 72% 29%)" />
                                    <Text className="text-sm text-muted-foreground">Mark the associated permit as COMPLETED</Text>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <LucideCheckCircle size={16} color="hsl(142 72% 29%)" />
                                    <Text className="text-sm text-muted-foreground">Generate a PDF weighment slip</Text>
                                </View>
                            </View>
                        </View>

                        <View className="flex-row gap-3 mt-2">
                            <TouchableOpacity
                                className="flex-1 bg-primary py-3 rounded-xl"
                                onPress={handleApprove}
                                disabled={approve.isPending}
                            >
                                <Text className="text-white font-semibold text-center">
                                    {approve.isPending ? 'Processing...' : 'Confirm Approval'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-muted py-3 rounded-xl"
                                onPress={() => setShowApproveConfirm(false)}
                            >
                                <Text className="text-foreground font-semibold text-center">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}