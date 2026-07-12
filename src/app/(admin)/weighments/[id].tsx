import { View, Text, ScrollView, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
    LucideScale,
    LucideFileText,
    LucideCreditCard,
    LucideFactory,
    LucideCalendar,
    LucideExternalLink
} from 'lucide-react-native';
import { useWeighment } from '../../../hooks/use-admin';
import { WeighmentStatus, PaymentStatus } from '../../../types/database';

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

export default function WeighmentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: response, isLoading } = useWeighment(id);

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

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            <ScrollView className="flex-1">
                {/* Header Card */}
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
                        </View>
                    </View>
                </View>

                {/* Weighment Slip */}
                {weighment.fileUrl && (
                    <View className="px-4 mb-4">
                        <Text className="text-lg font-semibold text-foreground mb-3">Weighment Slip</Text>
                        <TouchableOpacity
                            className="bg-card rounded-xl p-4 border border-border flex-row items-center"
                            onPress={() => Linking.openURL(weighment.fileUrl!)}
                        >
                            <LucideFileText size={24} color="hsl(325 45% 32%)" />
                            <Text className="text-sm text-foreground ml-3 flex-1">View Weighment Slip PDF</Text>
                            <LucideExternalLink size={16} color="hsl(240 3.8% 46.1%)" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Notes */}
                {weighment.notes && (
                    <View className="px-4 mb-4">
                        <Text className="text-lg font-semibold text-foreground mb-3">Notes</Text>
                        <View className="bg-card rounded-xl p-4 border border-border">
                            <Text className="text-sm text-muted-foreground">{weighment.notes}</Text>
                        </View>
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
                                <LucideScale size={14} color="hsl(142 72% 29%)" />
                                <Text className="text-sm text-muted-foreground ml-2">
                                    Approved: {new Date(weighment.approvedAt).toLocaleString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
