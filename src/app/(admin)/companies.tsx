import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LucideSearch, LucideBuilding2, LucideChevronRight, LucideMapPin } from 'lucide-react-native';
import { useCompanies } from '../../hooks/use-admin';
import { Company } from '../../types/admin';

export default function CompaniesListScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const { data: response, isLoading, refetch } = useCompanies({ search });

    const companies = response?.data || [];

    const renderCompanyCard = ({ item }: { item: Company }) => (
        <TouchableOpacity
            className="bg-card rounded-xl p-4 border border-border mb-3 shadow-sm"
            onPress={() => router.push(`/admin/companies/${item.id}` as any)}
        >
            <View className="flex-row items-start">
                <View className="p-3 rounded-xl bg-purple-100 mr-3">
                    <LucideBuilding2 size={24} color="hsl(262 83% 58%)" />
                </View>
                <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground mb-1">{item.name}</Text>
                    {item.city && (
                        <View className="flex-row items-center mb-1">
                            <LucideMapPin size={12} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-xs text-muted-foreground ml-1">
                                {item.city}, {item.state}
                            </Text>
                        </View>
                    )}
                    <View className="flex-row gap-3 mt-2">
                        <View className="bg-muted px-2 py-1 rounded-md">
                            <Text className="text-[10px] text-muted-foreground">
                                {item._count?.users || 0} Users
                            </Text>
                        </View>
                        <View className="bg-muted px-2 py-1 rounded-md">
                            <Text className="text-[10px] text-muted-foreground">
                                {item._count?.projects || 0} Projects
                            </Text>
                        </View>
                        <View className="bg-muted px-2 py-1 rounded-md">
                            <Text className="text-[10px] text-muted-foreground">
                                {item._count?.permits || 0} Permits
                            </Text>
                        </View>
                    </View>
                </View>
                <LucideChevronRight size={20} color="hsl(240 3.8% 46.1%)" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            {/* Search Bar */}
            <View className="px-4 py-3 border-b border-border">
                <View className="flex-row items-center bg-muted rounded-xl px-4 py-3">
                    <LucideSearch size={18} color="hsl(240 3.8% 46.1%)" />
                    <TextInput
                        className="flex-1 ml-3 text-foreground"
                        placeholder="Search companies..."
                        placeholderTextColor="hsl(240 3.8% 46.1%)"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                </View>
            ) : (
                <FlatList
                    data={companies}
                    keyExtractor={(item) => item.id}
                    renderItem={renderCompanyCard}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
                    ListEmptyComponent={
                        <View className="items-center py-12">
                            <LucideBuilding2 size={48} color="hsl(240 3.8% 46.1%)" opacity={0.5} />
                            <Text className="text-muted-foreground mt-4">No companies found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
