import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback, useRef } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { queryClient } from '../lib/query-client';
import { useAuth } from '../lib/auth-store';
import { registerSessionInvalidHandler } from '../lib/api';
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
    const { isAuthenticated, isLoading, hydrate, user, tokenValid, validateToken } = useAuth();

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

    // ✅ Add ref to prevent infinite loops
    const validationDone = useRef(false);
    const onboardingCheckDone = useRef(false);

    // ==========================================================================
    // 1. APP INITIALIZATION
    // ==========================================================================
    useEffect(() => {
        const prepare = async () => {
            try {
                await hydrate();
            } catch (error) {
                console.error('App preparation error:', error);
            } finally {
                setAppIsReady(true);
                await SplashScreen.hideAsync();
            }
        };

        prepare();
    }, []);


    useEffect(() => {
    const unregister =
        registerSessionInvalidHandler(async () => {
            useOnboarding.getState().reset();
            queryClient.clear();

            await useAuth.getState().logout();
        });

    return unregister;
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

            if (!isConnected) {
                Toast.show({
                    type: 'error',
                    text1: 'You are offline',
                    text2: 'Some features may not work',
                    position: 'top',
                    visibilityTime: 3000,
                });
            } else if (wasOfflineBefore) {
                Toast.show({
                    type: 'success',
                    text1: 'Back online',
                    text2: 'Your connection has been restored',
                    position: 'top',
                    visibilityTime: 3000,
                });
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
    // 3. TOKEN VALIDATION
    // ==========================================================================
    useEffect(() => {
        const validateTokenIfNeeded = async () => {
            // Skip if already validated
            if (validationDone.current) return;

            // Skip if not authenticated
            if (!isAuthenticated) {
                validationDone.current = true;
                return;
            }

            // Skip if still loading
            if (isLoading) return;

            console.log('🔍 Validating token...');
            validationDone.current = true;

            const isValid = await validateToken();

            const currentAuthState =
                useAuth.getState();

            if (
                !isValid &&
                currentAuthState.tokenValid === false &&
                currentAuthState.isAuthenticated
            ) {
                console.log(
                    '❌ Session confirmed invalid'
                );

                await currentAuthState.logout();
            }
        };

        validateTokenIfNeeded();
    }, [isAuthenticated, isLoading, validateToken]);

    // ==========================================================================
    // 4. ONBOARDING STATUS CHECK
    // ==========================================================================
    useEffect(() => {
        const checkOnboarding = async () => {
            // Skip if already checked onboarding
            if (onboardingCheckDone.current) return;

            // Skip if auth is not ready
            if (isLoading) return;

            // Skip if not authenticated
            if (!isAuthenticated) return;

            // Skip if token is not valid
            if (tokenValid !== true) {
    console.log(
        '⏭️ Session not yet verified - skipping onboarding'
    );
    return;
}

if (isOffline) {
    console.log(
        '⏭️ Offline - skipping onboarding API check'
    );
    return;
}

            // Skip if already checked
            if (checked) {
                onboardingCheckDone.current = true;
                return;
            }

            // Skip if checking
            if (isChecking) return;

            // Skip if no user
            if (!user) return;

            console.log('🔄 Starting onboarding check...');
            onboardingCheckDone.current = true;

            try {
                await checkOnboardingStatus(user);
            } catch (error) {
                console.error('Failed to check onboarding status:', error);
                useOnboarding.setState({ checked: true, isChecking: false });
            }
        };

        checkOnboarding();

        // Reset onboarding state when user logs out
        if (!isAuthenticated && checked) {
            resetOnboarding();
            onboardingCheckDone.current = false;
        }
    }, [
        isAuthenticated,
        isLoading,
        user,
        checked,
        isChecking,
        tokenValid,
        checkOnboardingStatus,
        resetOnboarding
    ]);

    // ==========================================================================
    // 5. DEEP LINKING
    // ==========================================================================
    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            const url = event.url;
            const { path, queryParams } = Linking.parse(url);

            if (path === 'reset-password' && queryParams?.token) {
                router.push(`/reset-password?token=${queryParams.token}`);
                return;
            }

            if (path === 'verify-email' && queryParams?.token) {
                router.push(`/verify?token=${queryParams.token}`);
                return;
            }

            if (path === 'permit' && queryParams?.id) {
                if (user?.role === UserRole.ADMIN) {
                    router.push(`/(admin)/permits/${queryParams.id}`);
                } else {
                    router.push(`/(tabs)/permits/${queryParams.id}`);
                }
                return;
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        return () => {
            subscription.remove();
        };
    }, [user]);

    // ==========================================================================
    // 6. NAVIGATION GUARD
    // ==========================================================================
    useEffect(() => {
        if (!appIsReady || isLoading || isNavigating) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inOnboardingGroup = segments[0] === '(onboarding)';
        const inAdminGroup = segments[0] === '(admin)';
        const inTabsGroup = segments[0] === '(tabs)';
        const inVerifyScreen = segments[0] === 'verify';
        const isLandingPage = !segments[0] || segments[0] === 'index';
        const inResetPassword = segments[0] === 'reset-password';

        // ✅ PUBLIC SCREENS - Always accessible
        if (isLandingPage || inVerifyScreen || inResetPassword) {
            return;
        }

        // ✅ NOT AUTHENTICATED - Redirect to login
        if (!isAuthenticated) {
            if (!inAuthGroup) {
                setIsNavigating(true);
                router.replace('/(auth)/login');
                setTimeout(() => setIsNavigating(false), 500);
            }
            return;
        }

        // ✅ WAIT FOR ONBOARDING CHECK
        if (!checked || isChecking) {
            return;
        }

        // ✅ ADMIN USER
        if (user?.role === UserRole.ADMIN) {
            if (!inAdminGroup) {
                setIsNavigating(true);
                router.replace('/(admin)');
                setTimeout(() => setIsNavigating(false), 500);
            }
            return;
        }

        // ✅ REGULAR USER - NOT ONBOARDED
        if (!isOnboarded) {
            if (inOnboardingGroup) return;

            setIsNavigating(true);
            const route = user?.role === UserRole.COMPANY_USER
                ? '/(onboarding)/company'
                : '/(onboarding)/individual';
            router.replace(route);
            setTimeout(() => setIsNavigating(false), 500);
            return;
        }

        // ✅ FULLY ONBOARDED REGULAR USER
        if (inAuthGroup || inOnboardingGroup || isLandingPage) {
            setIsNavigating(true);
            router.replace('/(tabs)/dashboard');
            setTimeout(() => setIsNavigating(false), 500);
            return;
        }

        // ✅ If regular user ends up in admin group
        if (inAdminGroup) {
            setIsNavigating(true);
            router.replace('/(tabs)/dashboard');
            setTimeout(() => setIsNavigating(false), 500);
            return;
        }

        // ✅ Allow access to tabs
        if (inTabsGroup) {
            return;
        }
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
    // 7. LOADING SCREENS
    // ==========================================================================
    if (!appIsReady) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#8F1D3F" />
                <Text className="mt-4 text-muted-foreground text-sm">Loading app...</Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#8F1D3F" />
                <Text className="mt-4 text-muted-foreground text-sm">Loading your account...</Text>
            </View>
        );
    }

    if (isAuthenticated && tokenValid && !checked && isChecking) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#8F1D3F" />
                <Text className="mt-4 text-muted-foreground text-sm">Setting up your profile...</Text>
            </View>
        );
    }

    // ==========================================================================
    // 8. MAIN APP RENDER
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

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1"
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
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
                                    gestureEnabled: false,
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
                        </Stack>
                    </KeyboardAvoidingView>

                    <Toast
                        position="top"
                        topOffset={Platform.OS === 'android' ? 60 : 50}
                        visibilityTime={3000}
                        autoHide={true}
                    />
                </View>

                <StatusBar style="auto" />
            </QueryClientProvider>
        </SafeAreaProvider>
    );
}