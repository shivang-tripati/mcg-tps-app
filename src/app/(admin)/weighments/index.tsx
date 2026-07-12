import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LucideScale, LucideChevronRight, LucideFileText } from 'lucide-react-native';
import { useWeighments } from '../../../hooks/use-admin';
import { Weighment } from '../../../types/admin';
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

export default function WeighmentsListScreen() {
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState<string>('');
    const { data: response, isLoading, refetch } = useWeighments({ status: statusFilter });

    const weighments = response?.data || [];

    const renderWeighmentCard = ({ item }: { item: Weighment }) => {
        const statusStyle = getStatusStyle(item.status);
        const paymentStyle = getPaymentStyle(item.paymentStatus);

        return (
            <TouchableOpacity
                className="bg-card rounded-xl p-4 border border-border mb-3 shadow-sm"
                onPress={() => router.push(`/(admin)/weighments/${item.id}` as any)}
            >
                <View className="flex-row items-start">
                    <View className="p-3 rounded-xl bg-rose-100 mr-3">
                        <LucideScale size={24} color="hsl(346 77% 50%)" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                            <Text className="text-sm font-semibold text-foreground mr-2">
                                {item.weighmentNumber}
                            </Text>
                            <View className={`px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
                                <Text className={`text-[10px] font-bold ${statusStyle.text}`}>
                                    {item.status}
                                </Text>
                            </View>
                        </View>
                        
                        {/* Fixed: Added conditional rendering with null checks */}
                        {item.permit && (
                            <View className="flex-row items-center mb-1">
                                <LucideFileText size={12} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-xs text-muted-foreground ml-1">
                                    {item.permit.permitNumber || 'N/A'}
                                </Text>
                            </View>
                        )}
                        
                        {/* Fixed: Added null check for plant */}
                        {item.plant && (
                            <Text className="text-xs text-muted-foreground mb-2">
                                {item.plant.name || ''} {item.plant.code ? `(${item.plant.code})` : ''}
                            </Text>
                        )}
                        
                        <View className="flex-row gap-2 flex-wrap">
                            {/* Fixed: Added null check for netWeight */}
                            {item.netWeight !== null && item.netWeight !== undefined && (
                                <View className="bg-muted px-2 py-1 rounded-md">
                                    <Text className="text-[10px] text-muted-foreground">
                                        {item.netWeight} kg
                                    </Text>
                                </View>
                            )}
                            
                            <View className={`px-2 py-1 rounded-md ${paymentStyle.bg}`}>
                                <Text className={`text-[10px] ${paymentStyle.text}`}>
                                    {item.paymentStatus || 'PENDING'}
                                </Text>
                            </View>
                            
                            {/* Fixed: Added null check for paymentAmount */}
                            {item.paymentAmount !== null && item.paymentAmount !== undefined && (
                                <View className="bg-muted px-2 py-1 rounded-md">
                                    <Text className="text-[10px] text-muted-foreground">
                                        ₹{item.paymentAmount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <LucideChevronRight size={20} color="hsl(240 3.8% 46.1%)" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            {/* Status Filter */}
            <View className="px-4 py-3 border-b border-border">
                <View className="flex-row gap-2 flex-wrap">
                    {['', WeighmentStatus.PENDING, WeighmentStatus.APPROVED, WeighmentStatus.REJECTED].map((status) => {
                        const isActive = statusFilter === status;
                        return (
                            <TouchableOpacity
                                key={status || 'all'}
                                className={`px-3 py-2 rounded-lg ${isActive ? 'bg-primary' : 'bg-muted'}`}
                                onPress={() => setStatusFilter(status)}
                            >
                                <Text className={`text-xs font-medium ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                                    {status === '' ? 'All' : status}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                </View>
            ) : (
                <FlatList
                    data={weighments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderWeighmentCard}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
                    ListEmptyComponent={
                        <View className="items-center py-12">
                            <LucideScale size={48} color="hsl(240 3.8% 46.1%)" opacity={0.5} />
                            <Text className="text-muted-foreground mt-4">No weighments found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}