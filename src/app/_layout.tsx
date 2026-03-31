import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { queryClient } from '../lib/query-client';
import { useAuth } from '../lib/auth-store';
import { UserRole } from '../types/database';
import '../../global.css';

export default function RootLayout() {
    const { isAuthenticated, isLoading, hydrate, user } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        hydrate();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inAdminGroup = segments[0] === '(admin)';
        const inVerifyScreen = segments[0] === 'verify';
        const isLandingPage = !segments[0];

        // Allow public screens without auth
        if (inVerifyScreen || isLandingPage) return;

        if (!isAuthenticated && !inAuthGroup) {
            // Redirect to login if not authenticated and not in auth group
            router.replace('/(auth)/login');
        } else if (isAuthenticated && inAuthGroup) {
            // Redirect based on role after login
            if (user?.role === UserRole.ADMIN) {
                router.replace('/(admin)');
            } else {
                router.replace('/(tabs)/dashboard');
            }
        } else if (isAuthenticated && user?.role === UserRole.ADMIN && !inAdminGroup) {
            // Admin trying to access user tabs, redirect to admin
            // (Allow them to stay in (tabs) if they explicitly navigated there)
        }
    }, [isAuthenticated, isLoading, segments, user]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </View>
        );
    }

    return (
        <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(admin)" options={{ headerShown: false }} />
                <Stack.Screen name="verify" options={{ headerShown: false }} />
                <Stack.Screen name="admin" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
        </QueryClientProvider>
    );
}
