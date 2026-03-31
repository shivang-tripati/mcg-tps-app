import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LucideUser, LucideMail, LucideBriefcase, LucideLogOut } from 'lucide-react-native';
import { useAuth } from '../../lib/auth-store';

export default function ProfileScreen() {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => logout() },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 pt-4 pb-6 bg-primary">
                <Text className="text-white text-2xl font-bold">Profile</Text>
            </View>

            {/* User Info */}
            <View className="px-6 mt-6">
                <View className="bg-card border border-border rounded-lg p-4">
                    <View className="flex-row items-center mb-4">
                        <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
                            <Text className="text-white text-2xl font-bold">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="text-lg font-semibold text-foreground">{user?.name}</Text>
                            <Text className="text-sm text-muted-foreground capitalize">{user?.role.toLowerCase().replace('_', ' ')}</Text>
                        </View>
                    </View>

                    <View className="border-t border-border pt-4 space-y-3">
                        <View className="flex-row items-center">
                            <LucideMail size={20} color="hsl(220 9% 46%)" />
                            <Text className="text-foreground ml-3">{user?.email}</Text>
                        </View>

                        {user?.companyId && (
                            <View className="flex-row items-center">
                                <LucideBriefcase size={20} color="hsl(220 9% 46%)" />
                                <Text className="text-foreground ml-3">Company User</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View className="px-6 mt-6">
                <TouchableOpacity
                    className="bg-error/10 border border-error/20 p-4 rounded-lg flex-row items-center justify-center"
                    onPress={handleLogout}
                >
                    <LucideLogOut size={20} color="hsl(0 72% 38%)" />
                    <Text className="text-error font-semibold ml-2">Logout</Text>
                </TouchableOpacity>
            </View>

            {/* App Info */}
            <View className="px-6 mt-auto mb-6">
                <Text className="text-muted-foreground text-center text-sm">
                    Transport Permit System v1.0.0
                </Text>
            </View>
        </SafeAreaView>
    );
}
