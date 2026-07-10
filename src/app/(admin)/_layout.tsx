import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { LucideFileText, LucideHome, LucideScale, LucideLogOut } from 'lucide-react-native';
import { useAuth } from '../../lib/auth-store';
import { UserRole } from '../../types/database';

export default function AdminLayout() {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();

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

    // Role-based protection: redirect non-admins
    useEffect(() => {
        if (!isLoading && user?.role !== UserRole.ADMIN) {
            router.replace('/(tabs)/dashboard');
        }
    }, [user, isLoading]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </View>
        );
    }

    if (user?.role !== UserRole.ADMIN) {
        return null; // Will redirect
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: 'hsl(325 45% 32%)',
                headerShown: true,
                headerStyle: { backgroundColor: 'hsl(325 45% 32%)' },
                headerTintColor: 'white',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <LucideHome size={22} color={color} />,
                    headerTitle: 'Admin Dashboard',
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={handleLogout}
                            style={{ marginRight: 16, padding: 6 }}
                            activeOpacity={0.7}
                        >
                            <LucideLogOut size={20} color="white" />
                        </TouchableOpacity>
                    ),
                }}
            />

            <Tabs.Screen
                name="permits"
                options={{
                    title: 'Permits',
                    tabBarIcon: ({ color }) => <LucideFileText size={22} color={color} />,
                    headerTitle: 'Manage Permits',
                    headerShown: false
                }}
            />

             <Tabs.Screen
                name="weighments"
                options={{
                    title: 'Weighments',
                    tabBarIcon: ({ color }) => <LucideScale size={22} color={color} />,
                    headerTitle: 'Weighments',
                }}
            />
            
        </Tabs>
    );
}
