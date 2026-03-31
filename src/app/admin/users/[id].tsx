import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
    LucideUser,
    LucideMail,
    LucidePhone,
    LucideBuilding2,
    LucideFileText,
    LucideShield,
    LucideIdCard,
    LucideCheckCircle,
    LucideXCircle
} from 'lucide-react-native';
import { useUser } from '../../../hooks/use-admin';
import { UserRole, DocumentType } from '../../../types/database';

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

export default function UserDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: response, isLoading } = useUser(id);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </SafeAreaView>
        );
    }

    const user = response?.data;

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <Text className="text-muted-foreground">User not found</Text>
            </SafeAreaView>
        );
    }

    const roleStyle = getRoleBadgeStyle(user.role);

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            <ScrollView className="flex-1">
                {/* Header Card */}
                <View className="bg-card m-4 rounded-xl border border-border p-4">
                    <View className="flex-row items-center mb-4">
                        <View className="p-3 rounded-xl bg-orange-100 mr-3">
                            <LucideUser size={28} color="hsl(24 94% 50%)" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-foreground">{user.name}</Text>
                            <View className="flex-row items-center mt-1 gap-2">
                                <View className={`px-2 py-0.5 rounded-full ${roleStyle.bg}`}>
                                    <Text className={`text-xs font-bold ${roleStyle.text}`}>
                                        {user.role.replace('_', ' ')}
                                    </Text>
                                </View>
                                <View className={`px-2 py-0.5 rounded-full ${user.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <Text className={`text-xs ${user.isActive ? 'text-green-700' : 'text-red-700'}`}>
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Contact Details */}
                    <View className="gap-3">
                        <View className="flex-row items-center">
                            <LucideMail size={16} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-muted-foreground text-sm ml-2 flex-1">{user.email}</Text>
                            {user.isEmailVerified ? (
                                <LucideCheckCircle size={14} color="hsl(142 72% 29%)" />
                            ) : (
                                <LucideXCircle size={14} color="hsl(0 72% 50%)" />
                            )}
                        </View>
                        {user.phone && (
                            <View className="flex-row items-center">
                                <LucidePhone size={16} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-muted-foreground text-sm ml-2 flex-1">{user.phone}</Text>
                                {user.isPhoneVerified ? (
                                    <LucideCheckCircle size={14} color="hsl(142 72% 29%)" />
                                ) : (
                                    <LucideXCircle size={14} color="hsl(0 72% 50%)" />
                                )}
                            </View>
                        )}
                        {user.company && (
                            <View className="flex-row items-center">
                                <LucideBuilding2 size={16} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-muted-foreground text-sm ml-2">{user.company.name}</Text>
                            </View>
                        )}
                    </View>

                    {/* Stats */}
                    <View className="flex-row gap-3 mt-4 pt-4 border-t border-border">
                        <View className="flex-1 items-center bg-muted rounded-lg py-3">
                            <LucideFileText size={20} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-lg font-bold text-foreground mt-1">{user._count?.permits || 0}</Text>
                            <Text className="text-xs text-muted-foreground">Permits</Text>
                        </View>
                        <View className="flex-1 items-center bg-muted rounded-lg py-3">
                            <LucideShield size={20} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-lg font-bold text-foreground mt-1">
                                {user.isSystemAdmin ? 'Yes' : 'No'}
                            </Text>
                            <Text className="text-xs text-muted-foreground">System Admin</Text>
                        </View>
                    </View>
                </View>

                {/* Identity Documents */}
                <View className="px-4 mb-4">
                    <Text className="text-lg font-semibold text-foreground mb-3">Identity Documents</Text>
                    {user.identityDocuments && user.identityDocuments.length > 0 ? (
                        user.identityDocuments.map((doc) => (
                            <View
                                key={doc.id}
                                className="bg-card rounded-xl p-4 border border-border mb-2"
                            >
                                <View className="flex-row items-center">
                                    <View className="p-2 rounded-lg bg-blue-100 mr-3">
                                        <LucideIdCard size={20} color="hsl(217 91% 60%)" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-foreground">
                                            {doc.type === DocumentType.AADHAAR ? 'Aadhaar Card' : 'PAN Card'}
                                        </Text>
                                        <Text className="text-xs text-muted-foreground font-mono">
                                            {doc.documentNumber}
                                        </Text>
                                    </View>
                                    <View className={`px-2 py-1 rounded-full ${doc.isVerified ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                        <Text className={`text-[10px] font-bold ${doc.isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                                            {doc.isVerified ? 'Verified' : 'Pending'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View className="bg-card rounded-xl p-6 border border-border items-center">
                            <LucideIdCard size={32} color="hsl(240 3.8% 46.1%)" opacity={0.5} />
                            <Text className="text-muted-foreground mt-2">No identity documents</Text>
                        </View>
                    )}
                </View>

                {/* Account Info */}
                <View className="px-4 mb-4">
                    <Text className="text-lg font-semibold text-foreground mb-3">Account Info</Text>
                    <View className="bg-card rounded-xl p-4 border border-border">
                        <View className="flex-row justify-between py-2 border-b border-border">
                            <Text className="text-sm text-muted-foreground">Created</Text>
                            <Text className="text-sm text-foreground">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-border">
                            <Text className="text-sm text-muted-foreground">Last Updated</Text>
                            <Text className="text-sm text-foreground">
                                {new Date(user.updatedAt).toLocaleDateString()}
                            </Text>
                        </View>
                        {user.lastLoginAt && (
                            <View className="flex-row justify-between py-2">
                                <Text className="text-sm text-muted-foreground">Last Login</Text>
                                <Text className="text-sm text-foreground">
                                    {new Date(user.lastLoginAt).toLocaleString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
