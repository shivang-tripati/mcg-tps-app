import { Tabs, useRouter, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
    LucideHome,
    LucideBuilding2,
    LucideFactory,
    LucideUsers
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth-store';
import { UserRole } from '../../types/database';

export default function AdminLayout() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

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
                }}
            />
            <Tabs.Screen
                name="companies"
                options={{
                    title: 'Companies',
                    tabBarIcon: ({ color }) => <LucideBuilding2 size={22} color={color} />,
                    headerTitle: 'Companies',
                }}
            />
            <Tabs.Screen
                name="plants"
                options={{
                    title: 'Plants',
                    tabBarIcon: ({ color }) => <LucideFactory size={22} color={color} />,
                    headerTitle: 'Plants',
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Users',
                    tabBarIcon: ({ color }) => <LucideUsers size={22} color={color} />,
                    headerTitle: 'Users',
                }}
            />
        </Tabs>
    );
}
