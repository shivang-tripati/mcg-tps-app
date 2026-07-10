import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { queryClient } from '../lib/query-client';
import { useAuth } from '../lib/auth-store';
import { useOnboarding } from '../lib/onboarding-store';
import { UserRole } from '../types/database';
import '../../global.css';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
    return (
        <View className="flex-1 items-center justify-center bg-background px-6">
            <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-4">
                <Text className="text-error text-2xl font-bold">!</Text>
            </View>
            <Text className="text-xl font-bold text-foreground mb-2 text-center">Something went wrong</Text>
            <Text className="text-muted-foreground text-center mb-8">{error.message || 'An unexpected error occurred.'}</Text>
            <TouchableOpacity 
                className="bg-primary px-8 py-4 rounded-xl active:opacity-80"
                onPress={retry}
            >
                <Text className="text-primary-foreground font-bold text-base">Try Again</Text>
            </TouchableOpacity>
        </View>
    );
}

export default function RootLayout() {
    const { isAuthenticated, isLoading, hydrate, user } = useAuth();
    const { checked, isOnboarded, isChecking, checkOnboardingStatus, reset: resetOnboarding } = useOnboarding();
    const segments = useSegments();
    const router = useRouter();
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        hydrate();
    }, []);

    // Monitor network status
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsOffline(state.isConnected === false);
        });
        return () => unsubscribe();
    }, []);

    // Check onboarding status when user becomes authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated && user && !checked && !isChecking) {
            checkOnboardingStatus(user);
        }
        // Reset onboarding state when user logs out
        if (!isAuthenticated && checked) {
            resetOnboarding();
        }
    }, [isAuthenticated, isLoading, user, checked, isChecking]);

    // Navigation guard
    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inOnboardingGroup = segments[0] === '(onboarding)';
        const inAdminGroup = segments[0] === '(admin)';
        const inVerifyScreen = segments[0] === 'verify';
        const isLandingPage = !segments[0];

        // Allow public screens without auth
        if (inVerifyScreen || isLandingPage) return;

        if (!isAuthenticated && !inAuthGroup) {
            // Redirect to login if not authenticated and not in auth group
            router.replace('/(auth)/login');
        } else if (isAuthenticated && inAuthGroup) {
            // Just authenticated — check onboarding
            if (!checked || isChecking) {
                // Still checking, wait
                return;
            }

            if (user?.role === UserRole.ADMIN) {
                router.replace('/(admin)');
            } else if (!isOnboarded) {
                // Route to appropriate onboarding screen
                if (user?.role === UserRole.COMPANY_USER) {
                    router.replace('/(onboarding)/company');
                } else {
                    router.replace('/(onboarding)/individual');
                }
            } else {
                router.replace('/(tabs)/dashboard');
            }
        } else if (isAuthenticated && inOnboardingGroup && checked && isOnboarded) {
            // Onboarding is complete but user is still on onboarding screen
            router.replace('/(tabs)/dashboard');
        } else if (isAuthenticated && user?.role === UserRole.ADMIN && !inAdminGroup) {
            // Admin trying to access user tabs, redirect to admin
            // (Allow them to stay in (tabs) if they explicitly navigated there)
        }
    }, [isAuthenticated, isLoading, segments, user, checked, isOnboarded, isChecking]);

    if (isLoading || (isAuthenticated && !checked)) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
                <View className="flex-1">
                    {isOffline && (
                        <View className="bg-error px-4 py-2 flex-row items-center justify-center z-50">
                            <Text className="text-error-foreground text-sm font-semibold">
                                You are currently offline. Some features may not work.
                            </Text>
                        </View>
                    )}
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
                        <Stack.Screen name="permits" options={{ headerShown: false }} />
                        <Stack.Screen name="verify" options={{ headerShown: false }} />
                        <Stack.Screen name="admin" options={{ headerShown: false }} />
                    </Stack>
                </View>
                <StatusBar style="auto" />
            </QueryClientProvider>
        </SafeAreaProvider>
    );
}
