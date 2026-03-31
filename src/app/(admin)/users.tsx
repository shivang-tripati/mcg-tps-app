import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LucideSearch, LucideUser, LucideChevronRight, LucideMail, LucideBuilding2 } from 'lucide-react-native';
import { useUsers } from '../../hooks/use-admin';
import { AdminUser } from '../../types/admin';
import { UserRole } from '../../types/database';

const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
        case UserRole.ADMIN:
            return { bg: 'bg-red-100', text: 'text-red-700' };
        case UserRole.COMPANY_USER:
            return { bg: 'bg-purple-100', text: 'text-purple-700' };
        case UserRole.INDIVIDUAL:
            return { bg: 'bg-blue-100', text: 'text-blue-700' };
        default:
            return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
};

export default function UsersListScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const { data: response, isLoading, refetch } = useUsers({ search, role: roleFilter });

    const users = response?.data || [];

    const renderUserCard = ({ item }: { item: AdminUser }) => {
        const roleStyle = getRoleBadgeStyle(item.role);

        return (
            <TouchableOpacity
                className="bg-card rounded-xl p-4 border border-border mb-3 shadow-sm"
                onPress={() => router.push(`/admin/users/${item.id}` as any)}
            >
                <View className="flex-row items-start">
                    <View className="p-3 rounded-xl bg-orange-100 mr-3">
                        <LucideUser size={24} color="hsl(24 94% 50%)" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                            <Text className="text-base font-semibold text-foreground mr-2">{item.name}</Text>
                            <View className={`px-2 py-0.5 rounded-full ${roleStyle.bg}`}>
                                <Text className={`text-[10px] font-bold ${roleStyle.text}`}>
                                    {item.role.replace('_', ' ')}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center mb-1">
                            <LucideMail size={12} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-xs text-muted-foreground ml-1">{item.email}</Text>
                        </View>
                        {item.company && (
                            <View className="flex-row items-center">
                                <LucideBuilding2 size={12} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-xs text-muted-foreground ml-1">{item.company.name}</Text>
                            </View>
                        )}
                        <View className="flex-row gap-2 mt-2">
                            <View className={`px-2 py-1 rounded-md ${item.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                                <Text className={`text-[10px] ${item.isActive ? 'text-green-700' : 'text-red-700'}`}>
                                    {item.isActive ? 'Active' : 'Inactive'}
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
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            {/* Search Bar */}
            <View className="px-4 py-3 border-b border-border">
                <View className="flex-row items-center bg-muted rounded-xl px-4 py-3 mb-3">
                    <LucideSearch size={18} color="hsl(240 3.8% 46.1%)" />
                    <TextInput
                        className="flex-1 ml-3 text-foreground"
                        placeholder="Search users..."
                        placeholderTextColor="hsl(240 3.8% 46.1%)"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                {/* Role Filter */}
                <View className="flex-row gap-2">
                    {['', UserRole.COMPANY_USER, UserRole.INDIVIDUAL].map((role) => (
                        <TouchableOpacity
                            key={role}
                            className={`px-3 py-2 rounded-lg ${roleFilter === role ? 'bg-primary' : 'bg-muted'}`}
                            onPress={() => setRoleFilter(role)}
                        >
                            <Text className={`text-xs font-medium ${roleFilter === role ? 'text-white' : 'text-muted-foreground'}`}>
                                {role === '' ? 'All' : role.replace('_', ' ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserCard}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
                    ListEmptyComponent={
                        <View className="items-center py-12">
                            <LucideUser size={48} color="hsl(240 3.8% 46.1%)" opacity={0.5} />
                            <Text className="text-muted-foreground mt-4">No users found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
