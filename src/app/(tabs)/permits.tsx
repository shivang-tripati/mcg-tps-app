import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LucideFilter, LucidePlus } from 'lucide-react-native';
import { usePermits } from '../../hooks/use-permits';

const STATUS_COLORS = {
    DRAFT: 'hsl(220 9% 46%)',
    SUBMITTED: 'hsl(38 92% 38%)',
    UNDER_REVIEW: 'hsl(38 92% 38%)',
    APPROVED: 'hsl(142 72% 29%)',
    IN_TRANSIT: 'hsl(325 45% 32%)',
    COMPLETED: 'hsl(142 72% 29%)',
    EXPIRED: 'hsl(0 72% 38%)',
    REJECTED: 'hsl(0 72% 38%)',
    CANCELLED: 'hsl(220 9% 46%)',
};

export default function PermitsScreen() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const { data, isLoading, refetch, isRefetching } = usePermits({ page, limit: 20 });

    const permits = data?.data || [];
    const meta = data?.meta;

    const renderPermitCard = ({ item }: any) => (
        <TouchableOpacity
            className="bg-card border border-border rounded-lg p-4 mb-3"
            onPress={() => router.push(`/permits/${item.id}` as any)}
        >
            <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{item.permitNumber}</Text>
                    <Text className="text-sm text-muted-foreground mt-1">
                        {item.wasteType === 'CND_SEGREGATED' ? 'C&D Segregated' : 'C&D Unsegregated'}
                    </Text>
                </View>
                <View
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]}15` }}
                >
                    <Text
                        className="text-xs font-medium"
                        style={{ color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] }}
                    >
                        {item.status.replace('_', ' ')}
                    </Text>
                </View>
            </View>

            {item.plant && (
                <Text className="text-sm text-muted-foreground">
                    To: {item.plant.name} ({item.plant.city})
                </Text>
            )}

            {item.vehicleNumber && (
                <Text className="text-sm text-muted-foreground mt-1">
                    Vehicle: {item.vehicleNumber}
                </Text>
            )}

            <Text className="text-xs text-muted-foreground mt-2">
                Created: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 pt-4 pb-3 bg-primary">
                <View className="flex-row items-center justify-between">
                    <Text className="text-white text-2xl font-bold">Permits</Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity className="p-2">
                            <LucideFilter size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="p-2"
                            onPress={() => router.push('/permits/new' as any)}
                        >
                            <LucidePlus size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* List */}
            <View className="flex-1 px-6 pt-4">
                {isLoading && !isRefetching ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                    </View>
                ) : (
                    <FlatList
                        data={permits}
                        renderItem={renderPermitCard}
                        keyExtractor={(item) => item.id}
                        refreshControl={
                            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
                        }
                        ListEmptyComponent={
                            <View className="items-center justify-center py-12">
                                <Text className="text-muted-foreground text-center">No permits found</Text>
                                <TouchableOpacity
                                    className="mt-4 bg-primary px-6 py-3 rounded-lg"
                                    onPress={() => router.push('/permits/new' as any)}
                                >
                                    <Text className="text-white font-semibold">Create Your First Permit</Text>
                                </TouchableOpacity>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
