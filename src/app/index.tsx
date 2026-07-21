import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Check, ChevronRight, User, Plus } from 'lucide-react-native';

import WasteTruckIllustration from '../../assets/illustrations/WasteTruckIllustration2.png';
import { useAuth } from '../lib/auth-store';
import { useOnboarding } from '../lib/onboarding-store';
import { useEffect, useState, useRef } from 'react';
import { UserRole } from '../types/database';

export default function LandingScreen() {
    const router = useRouter();
    const { isAuthenticated, isLoading, user, tokenValid } = useAuth();
    const { isOnboarded, checked, isChecking } = useOnboarding();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const redirectAttempted = useRef(false);


    useEffect(() => {
        // Don't redirect if still loading auth
        if (isLoading) {
            return;
        }

        // Don't redirect if not authenticated
        if (!isAuthenticated) {
            setIsRedirecting(false);
            return;
        }

        // Wait for token validation
        if (tokenValid === null) {
            return;
        }

        // Don't redirect if token is invalid
        if (tokenValid === false) {
            setIsRedirecting(false);
            return;
        }

        // Don't redirect if already redirecting
        if (isRedirecting) {
            return;
        }

        // Don't redirect if onboarding is still checking
        if (isChecking) {
            return;
        }

        // Don't redirect if already attempted
        if (redirectAttempted.current) {
            return;
        }

        // Now we have a valid authenticated user with onboarding checked
        if (user) {
            setIsRedirecting(true);
            redirectAttempted.current = true;

            // Admin users go to admin panel
            if (user.role === UserRole.ADMIN) {
                router.replace('/(admin)');
                return;
            }

            // Check onboarding status for regular users
            if (checked) {
                if (isOnboarded) {
                    // Fully onboarded - go to dashboard
                    router.replace('/(tabs)/dashboard');
                } else {
                    // Not onboarded - go to onboarding
                    const route = user.role === UserRole.COMPANY_USER
                        ? '/(onboarding)/company'
                        : '/(onboarding)/individual';
                    router.replace(route);
                }
            } else {
                // If checked is false, reset redirect and wait
                setIsRedirecting(false);
                redirectAttempted.current = false;
            }
        }
    }, [isAuthenticated, isLoading, user, checked, isChecking, isOnboarded, tokenValid, isRedirecting, router]);

    // ✅ Show loading while checking auth or onboarding
    if (isLoading || (isAuthenticated && tokenValid === null) || (isAuthenticated && isChecking)) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#8F1D3F" />
                <Text className="mt-4 text-muted-foreground">
                    {isLoading ? 'Loading...' :
                        tokenValid === null ? 'Verifying session...' :
                            'Setting up your profile...'}
                </Text>
            </SafeAreaView>
        );
    }

    // ✅ If authenticated and redirecting, show loading
    if (isRedirecting) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#8F1D3F" />
                <Text className="mt-4 text-muted-foreground">Redirecting...</Text>
            </SafeAreaView>
        );
    }

    // ✅ If authenticated but not redirected (shouldn't happen, but as fallback)
    if (isAuthenticated && tokenValid === true) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#8F1D3F" />
                <Text className="mt-4 text-muted-foreground">Preparing your dashboard...</Text>
            </SafeAreaView>
        );
    }

    // ✅ Show landing page only when not authenticated
    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. HERO IMAGE SECTION */}
                <View className="w-full h-72 px-4 pt-4">
                    <Image
                        source={WasteTruckIllustration}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                        accessibilityLabel="Construction site with waste truck and permit verification"
                    />
                </View>

                {/* 2. HEADER TEXT SECTION */}
                <View className="px-6 mt-2 mb-6 items-center">
                    <Text className="text-3xl font-bold text-primary text-center mb-1">
                        C&D Waste Management
                    </Text>
                    <Text className="text-lg text-foreground text-center mb-4">
                        Transport Permit & Verification System
                    </Text>

                    <View className="w-6 h-1 bg-primary rounded-full mb-4 opacity-50" />

                    <Text className="text-base text-muted-foreground text-center leading-relaxed px-4">
                        Issue, manage and verify construction & demolition waste permits securely.
                    </Text>
                </View>

                {/* 3. "CONTINUE WITHOUT ACCOUNT" SECTION */}
                <View className="px-6 mb-6">
                    <View className="flex-row items-center mb-4">
                        <View className="flex-1 h-[1px] bg-border" />
                        <Text className="px-3 text-sm font-semibold text-foreground">
                            Continue without account
                        </Text>
                        <View className="flex-1 h-[1px] bg-border" />
                    </View>

                    <Pressable
                        onPress={() => router.push('/verify')}
                        className="flex-row items-center bg-card border border-border rounded-xl p-4 active:opacity-80"
                        accessibilityRole="button"
                        accessibilityHint="Opens permit verification"
                    >
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-4">
                            <Check size={20} color="#9E2A46" />
                        </View>

                        <View className="flex-1">
                            <Text className="text-base font-bold text-foreground mb-0.5">
                                Check Permit
                            </Text>
                            <Text className="text-sm text-muted-foreground">
                                No login required
                            </Text>
                        </View>

                        <ChevronRight size={24} color="#9CA3AF" />
                    </Pressable>
                </View>

                {/* 4. "MANAGE PERMITS" SECTION */}
                <View className="px-6 mb-8">
                    <View className="flex-row items-center mb-4">
                        <View className="flex-1 h-[1px] bg-border" />
                        <Text className="px-3 text-sm font-semibold text-foreground">
                            Manage permits
                        </Text>
                        <View className="flex-1 h-[1px] bg-border" />
                    </View>

                    <View className="flex-row gap-3">
                        <Pressable
                            onPress={() => router.push('/(auth)/login')}
                            className="flex-1 flex-row items-center justify-center h-12 rounded-xl border border-border bg-card active:opacity-80"
                            accessibilityRole="button"
                            accessibilityHint="Opens sign in"
                        >
                            <User size={18} className="text-foreground mr-2" />
                            <Text className="font-semibold text-foreground">Sign In</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => router.push('/(auth)/register')}
                            className="flex-1 flex-row items-center justify-center h-12 rounded-xl border border-border bg-card active:opacity-80"
                            accessibilityRole="button"
                            accessibilityHint="Opens account creation"
                        >
                            <Plus size={18} className="text-foreground mr-2" />
                            <Text className="font-semibold text-foreground">Create Account</Text>
                        </Pressable>
                    </View>
                </View>

                {/* 5. FOOTER */}
                <View className="items-center mt-auto pt-4">
                    <Text className="text-sm font-medium text-muted-foreground text-center">
                        Secure MCG Permit Verification
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1 text-center">
                        Version 1.0.0
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}