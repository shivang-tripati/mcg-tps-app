import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LucideFilter, LucideSearch, LucideX } from 'lucide-react-native';
import { useAdminPermits } from '../../../hooks/use-admin-permits';
import { StatusBadge } from '../../../components/ui/status-badge';
import { PermitStatus } from '../../../types/database';

export default function AdminPermitsScreen() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

    // Debounce search could be added here, currently relying on direct state passed to hook
    // Ideally, pass a debounced value to the hook
    const { data: response, isLoading, refetch, isRefetching } = useAdminPermits({
        page,
        limit: 20,
        status: statusFilter,
        search: searchQuery
    });

    const permits = response?.data || [];
    const meta = response?.meta;

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        setPage(1); // Reset to first page on search
    };

    const applyStatusFilter = (status: string | undefined) => {
        setStatusFilter(status);
        setPage(1);
        setIsFilterModalVisible(false);
    };

    const renderPermitCard = ({ item }: any) => (
        <TouchableOpacity
            className="bg-card border border-border rounded-lg p-4 mb-3 shadow-sm"
            onPress={() => router.push(`/(admin)/permits/${item.id}`)}
        >
            <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{item.permitNumber}</Text>
                    <Text className="text-sm text-muted-foreground mt-1">
                        {item.wasteType === 'CND_SEGREGATED' ? 'C&D Segregated' : 'C&D Unsegregated'}
                    </Text>
                </View>
                <StatusBadge status={item.status} />
            </View>

            <View className="mt-2 space-y-1">
                {item.project && (
                    <Text className="text-sm text-muted-foreground">
                        Project: <Text className="text-foreground">{item.project.name}</Text>
                    </Text>
                )}
                {item.plant && (
                    <Text className="text-sm text-muted-foreground">
                        To: <Text className="text-foreground">{item.plant.name}</Text>
                    </Text>
                )}
                <Text className="text-xs text-muted-foreground mt-2">
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Header */}
            <View className="px-4 py-3 border-b border-border bg-card">
                <Text className="text-2xl font-bold text-foreground mb-4">Manage Permits</Text>

                <View className="flex-row gap-2">
                    <View className="flex-1 flex-row items-center bg-background border border-input rounded-lg px-3 h-12">
                        <LucideSearch size={20} className="text-muted-foreground mr-2" color="hsl(215 20.2% 65.1%)" />
                        <TextInput
                            className="flex-1 text-foreground h-full"
                            placeholder="Search by permit #, vehicle..."
                            value={searchQuery}
                            onChangeText={handleSearch}
                            placeholderTextColor="hsl(215 20.2% 65.1%)"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')} className="p-1">
                                <LucideX size={16} color="hsl(215 20.2% 65.1%)" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        className={`w-12 h-12 items-center justify-center rounded-lg border ${statusFilter ? 'bg-primary border-primary' : 'bg-background border-input'}`}
                        onPress={() => setIsFilterModalVisible(true)}
                    >
                        <LucideFilter size={20} color={statusFilter ? 'white' : 'hsl(215 20.2% 65.1%)'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* List */}
            <View className="flex-1 px-4 pt-4 bg-background">
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
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 20 }}
                        onEndReached={() => {
                            if (meta && page < meta.totalPages) {
                                setPage(p => p + 1);
                            }
                        }}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            isRefetching && permits.length > 0 ? (
                                <View className="py-4">
                                    <ActivityIndicator size="small" color="hsl(325 45% 32%)" />
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>

            {/* Filter Modal */}
            <Modal
                transparent={true}
                visible={isFilterModalVisible}
                onRequestClose={() => setIsFilterModalVisible(false)}
                animationType="fade"
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setIsFilterModalVisible(false)}
                >
                    <Pressable
                        className="bg-card w-full rounded-t-xl p-6 shadow-xl"
                        onPress={e => e.stopPropagation()}
                    >
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-foreground">Filter by Status</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} className="p-1">
                                <LucideX size={24} className="text-muted-foreground" color="hsl(215 20.2% 65.1%)" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row flex-wrap gap-2 mb-8">
                            <TouchableOpacity
                                className={`px-4 py-2 rounded-full border ${!statusFilter ? 'bg-primary border-primary' : 'bg-background border-input'}`}
                                onPress={() => applyStatusFilter(undefined)}
                            >
                                <Text className={`font-medium ${!statusFilter ? 'text-white' : 'text-foreground'}`}>All</Text>
                            </TouchableOpacity>
                            {Object.values(PermitStatus).map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    className={`px-4 py-2 rounded-full border ${statusFilter === status ? 'bg-primary border-primary' : 'bg-background border-input'}`}
                                    onPress={() => applyStatusFilter(status)}
                                >
                                    <Text className={`font-medium ${statusFilter === status ? 'text-white' : 'text-foreground'}`}>
                                        {status.replace(/_/g, ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
