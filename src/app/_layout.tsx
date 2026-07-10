import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { queryClient } from '../lib/query-client';
import { useAuth } from '../lib/auth-store';
import { useOnboarding } from '../lib/onboarding-store';
import { UserRole } from '../types/database';
import './../../global.css';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
    return (
        <View className="flex-1 items-center justify-center bg-background px-6">
            <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-4">
                <Text className="text-error text-2xl font-bold">!</Text>
            </View>
            <Text className="text-xl font-bold text-foreground mb-2 text-center">Something went wrong</Text>
            <Text className="text-muted-foreground text-center mb-8">
                {error.message || 'An unexpected error occurred.'}
            </Text>
            <TouchableOpacity 
                className="bg-primary px-8 py-4 rounded-xl active:opacity-80"
                onPress={retry}
            >
                <Text className="text-primary-foreground font-bold text-base">Try Again</Text>
            </TouchableOpacity>
        </View>
    );
}

// ============================================================================
// MAIN ROOT LAYOUT
// ============================================================================
export default function RootLayout() {
    // Auth state
    const { isAuthenticated, isLoading, hydrate, user } = useAuth();
    
    // Onboarding state
    const { 
        checked, 
        isOnboarded, 
        isChecking, 
        checkOnboardingStatus, 
        reset: resetOnboarding 
    } = useOnboarding();
    
    // Navigation
    const segments = useSegments();
    const router = useRouter();
    
    // Local state
    const [isOffline, setIsOffline] = useState(false);
    const [appIsReady, setAppIsReady] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    // ==========================================================================
    // 1. APP INITIALIZATION
    // ==========================================================================
    useEffect(() => {
        const prepare = async () => {
            try {
                // Hydrate auth state from storage
                await hydrate();
                
                // Add any other initialization here
                // - Prefetch fonts
                // - Initialize analytics
                // - Check for updates
                
            } catch (error) {
                console.error('App preparation error:', error);
            } finally {
                setAppIsReady(true);
                await SplashScreen.hideAsync();
            }
        };

        prepare();
    }, []);

    // ==========================================================================
    // 2. NETWORK MONITORING
    // ==========================================================================
    useEffect(() => {
        let wasOffline = false;
        
        const unsubscribe = NetInfo.addEventListener((state) => {
            const isConnected = state.isConnected !== false;
            const wasOfflineBefore = wasOffline;
            wasOffline = !isConnected;
            
            setIsOffline(!isConnected);
            
            // Show toast when connection status changes
            if (!isConnected) {
                // showToast.warning('You are offline', 'Some features may not work');
            } else if (wasOfflineBefore) {
                // showToast.success('Back online', 'Your connection has been restored');
                // Refresh data when coming back online
                refreshAppData();
            }
        });
        
        return () => unsubscribe();
    }, []);


    const refreshAppData = useCallback(async () => {
        try {
            await hydrate();
            if (isAuthenticated && user && !checked) {
                await checkOnboardingStatus(user);
            }
        } catch (error) {
            console.error('Failed to refresh data:', error);
        }
    }, [isAuthenticated, user, checked, checkOnboardingStatus, hydrate]);

    // ==========================================================================
    // 3. ONBOARDING STATUS CHECK
    // ==========================================================================
    useEffect(() => {
        const checkOnboarding = async () => {
            if (!isLoading && isAuthenticated && user && !checked && !isChecking) {
                try {
                    await checkOnboardingStatus(user);
                } catch (error) {
                    console.error('Failed to check onboarding status:', error);
                }
            }
        };

        checkOnboarding();

        // Reset onboarding state when user logs out
        if (!isAuthenticated && checked) {
            resetOnboarding();
        }
    }, [isAuthenticated, isLoading, user, checked, isChecking, checkOnboardingStatus, resetOnboarding]);

    // ==========================================================================
    // 4. DEEP LINKING
    // ==========================================================================
    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            const url = event.url;
            const { path, queryParams } = Linking.parse(url);
            
            // Handle specific deep links
            if (path === 'reset-password' && queryParams?.token) {
                router.push(`/reset-password?token=${queryParams.token}`);
                return;
            }
            
            if (path === 'verify-email' && queryParams?.token) {
                router.push(`/verify?token=${queryParams.token}`);
                return;
            }
            
            // Handle permit deep links
            if (path === 'permit' && queryParams?.id) {
                router.push(`/permits/${queryParams.id}`);
                return;
            }
        };

        // Subscribe to deep links
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Check if app was opened from a deep link
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // ==========================================================================
    // 5. NAVIGATION GUARD (CRITICAL)
    // ==========================================================================
    useEffect(() => {
        // Don't run navigation if:
        // - App is not ready
        // - Auth is still loading
        // - Already navigating to prevent loops
        if (!appIsReady || isLoading || isNavigating) return;

        // Get current route segments
        const inAuthGroup = segments[0] === '(auth)';
        const inOnboardingGroup = segments[0] === '(onboarding)';
        const inAdminGroup = segments[0] === '(admin)';
        const inTabsGroup = segments[0] === '(tabs)';
        const inVerifyScreen = segments[0] === 'verify';
        const isLandingPage = !segments[0];
        const inResetPassword = segments[0] === 'reset-password';

        // =====================================================================
        // A. PUBLIC SCREENS (No auth required)
        // =====================================================================
        if (isLandingPage || inVerifyScreen || inResetPassword) {
            return;
        }

        // =====================================================================
        // B. NOT AUTHENTICATED
        // =====================================================================
        if (!isAuthenticated) {
            // If not in auth group, redirect to login
            if (!inAuthGroup) {
                setIsNavigating(true);
                router.replace('/(auth)/login');
                setTimeout(() => setIsNavigating(false), 500);
            }
            return;
        }

        // =====================================================================
        // C. AUTHENTICATED - WAIT FOR ONBOARDING CHECK
        // =====================================================================
        if (!checked || isChecking) {
            return;
        }

        // =====================================================================
        // D. ADMIN USER
        // =====================================================================
        // ADMIN USER
        if (user?.role === UserRole.ADMIN) {
            // If admin is trying to access tabs or onboarding, redirect to admin
            if (inTabsGroup || inOnboardingGroup || inAuthGroup || isLandingPage) {
                setIsNavigating(true);
                router.replace('/(admin)');
                setTimeout(() => setIsNavigating(false), 500);
                return;
            }
            // Allow admin to stay in admin group
            if (inAdminGroup) return;
            
            // Fallback: redirect to admin
            setIsNavigating(true);
            router.replace('/(admin)');
            setTimeout(() => setIsNavigating(false), 500);
            return;
        }

        // =====================================================================
        // E. REGULAR USER - NOT ONBOARDED
        // =====================================================================
        if (!isOnboarded) {
            // If already in onboarding, allow it
            if (inOnboardingGroup) return;
            
            // If in tabs, redirect to onboarding
            if (inTabsGroup) {
                setIsNavigating(true);
                const route = user?.role === UserRole.COMPANY_USER 
                    ? '/(onboarding)/company' 
                    : '/(onboarding)/individual';
                router.replace(route);
                setTimeout(() => setIsNavigating(false), 500);
                return;
            }

            // If in auth group, redirect to onboarding
            if (inAuthGroup) {
                setIsNavigating(true);
                const route = user?.role === UserRole.COMPANY_USER 
                    ? '/(onboarding)/company' 
                    : '/(onboarding)/individual';
                router.replace(route);
                setTimeout(() => setIsNavigating(false), 500);
                return;
            }

            // For any other route, redirect to onboarding
            setIsNavigating(true);
            const route = user?.role === UserRole.COMPANY_USER 
                ? '/(onboarding)/company' 
                : '/(onboarding)/individual';
            router.replace(route);
            setTimeout(() => setIsNavigating(false), 500);
            return;
        }

        // =====================================================================
        // F. FULLY ONBOARDED REGULAR USER
        // =====================================================================
        // If user is in auth, onboarding, or landing page, redirect to dashboard
        if (inAuthGroup || inOnboardingGroup || isLandingPage) {
            setIsNavigating(true);
            router.replace('/(tabs)/dashboard');
            setTimeout(() => setIsNavigating(false), 500);
            return;
        }

        // Allow access to tabs and other protected routes
        // (User is already in a valid route)

    }, [
        appIsReady,
        isLoading,
        isAuthenticated,
        isNavigating,
        segments,
        user,
        checked,
        isChecking,
        isOnboarded,
        router
    ]);

    // ==========================================================================
    // 6. LOADING SCREENS
    // ==========================================================================
    
    // App initialization loading
    if (!appIsReady) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                <Text className="mt-4 text-muted-foreground text-sm">
                    Loading app...
                </Text>
            </View>
        );
    }

    // Auth hydration loading
    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                <Text className="mt-4 text-muted-foreground text-sm">
                    Loading your account...
                </Text>
            </View>
        );
    }

    // Onboarding check loading (only show if authenticated and checking)
    if (isAuthenticated && !checked && isChecking) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                <Text className="mt-4 text-muted-foreground text-sm">
                    Setting up your profile...
                </Text>
            </View>
        );
    }

    // ==========================================================================
    // 7. MAIN APP RENDER
    // ==========================================================================
    return (
        <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
                <View className="flex-1 bg-background">
                    {/* Offline Banner */}
                    {isOffline && (
                        <View className="bg-error px-4 py-2.5 flex-row items-center justify-center z-50">
                            <View className="w-2 h-2 rounded-full bg-white mr-2" />
                            <Text className="text-error-foreground text-sm font-semibold">
                                You are currently offline. Some features may not work.
                            </Text>
                        </View>
                    )}

                    {/* Keyboard Avoiding for Form Screens */}
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1"
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        {/* Navigation Stack */}
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                animation: 'slide_from_right',
                                gestureEnabled: true,
                                gestureDirection: 'horizontal',
                            }}
                        >
                            {/* Public Screens */}
                            <Stack.Screen 
                                name="index" 
                                options={{ 
                                    headerShown: false,
                                    gestureEnabled: false,
                                }} 
                            />
                            
                            <Stack.Screen 
                                name="verify" 
                                options={{ 
                                    headerShown: false,
                                    gestureEnabled: false,
                                }} 
                            />
                            
                            <Stack.Screen 
                                name="reset-password" 
                                options={{ 
                                    headerShown: false,
                                    gestureEnabled: false,
                                }} 
                            />

                            {/* Auth Screens */}
                            <Stack.Screen 
                                name="(auth)" 
                                options={{ 
                                    headerShown: false,
                                    gestureEnabled: false,
                                    animation: 'fade',
                                }} 
                            />

                            {/* Onboarding Screens */}
                            <Stack.Screen 
                                name="(onboarding)" 
                                options={{ 
                                    headerShown: false,
                                    gestureEnabled: false, // Prevent going back during onboarding
                                    animation: 'slide_from_right',
                                }} 
                            />

                            {/* Main App Screens */}
                            <Stack.Screen 
                                name="(tabs)" 
                                options={{ 
                                    headerShown: false,
                                    gestureEnabled: false,
                                }} 
                            />

                            {/* Admin Screens */}
                            <Stack.Screen 
                                name="(admin)" 
                                options={{ 
                                    headerShown: false,
                                    gestureEnabled: false,
                                }} 
                            />

                            {/* Other Screens */}
                            <Stack.Screen 
                                name="permits" 
                                options={{ 
                                    headerShown: false,
                                }} 
                            />
                            
                            <Stack.Screen 
                                name="admin" 
                                options={{ 
                                    headerShown: false,
                                }} 
                            />
                        </Stack>
                    </KeyboardAvoidingView>

                    {/* Toast Notifications */}
                    <Toast 
                        position="top" 
                        topOffset={Platform.OS === 'android' ? 60 : 50}
                        visibilityTime={3000}
                        autoHide={true}
                    />
                </View>

                {/* Status Bar */}
                <StatusBar style="auto" />
            </QueryClientProvider>
        </SafeAreaProvider>
    );
}