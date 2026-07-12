import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Image } from 'expo-image';
import {
    ArrowLeft,
    ChevronRight,
    CircleUserRound,
    LucideEye,
    LucideEyeOff,
    LucideFingerprint,
    ShieldCheck,
} from 'lucide-react-native';

import LoginPermitIllustration from '../../../assets/illustrations/WasteTruckIllustration.png';
import { useAuth } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { KeyboardAwareScreen } from '../../components/ui/keyboard-aware-screen';
import { loginSchema } from '../../schemas/index';

type LoginFormData = z.infer<typeof loginSchema>;

const BIOMETRIC_EMAIL_KEY = 'biometric_email';
const BIOMETRIC_PASSWORD_KEY = 'biometric_password';

const PRIMARY_COLOR = '#8F1D3F';
const MUTED_ICON_COLOR = '#737373';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const passwordRef = useRef<TextInput>(null);

    const [showPassword, setShowPassword] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

    const {
        control,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace('/');
    };

    useEffect(() => {
        const checkBiometricAvailability = async () => {
            try {
                const compatible = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                setIsBiometricSupported(compatible && enrolled);

                const savedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
                const savedPassword = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);
                setHasSavedCredentials(Boolean(savedEmail && savedPassword));
            } catch (error) {
                console.error('Failed to check biometric availability:', error);
                setIsBiometricSupported(false);
                setHasSavedCredentials(false);
            }
        };

        checkBiometricAvailability();
    }, []);

    const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
        const response = await api.post('/auth/login', data);

        if (response.data.success) {
            const { accessToken, refreshToken, user } = response.data.data;

            await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, data.email);
            await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, data.password);
            setHasSavedCredentials(true);

            await login(accessToken, refreshToken, user);
            return;
        }

        const errorMessage = response.data.error?.message || 'Login failed';
        setError(errorMessage);
        Alert.alert('Login Failed', errorMessage);
        
    } catch (err: any) {
        console.error('Login error:', err);
        
        // ✅ Use the helper to get user-friendly error message
        let message = 'Login failed. Please try again.';
        
        if (err.isNetworkError || err.message === 'Network Error') {
            message = 'Network connection error. Please check your internet connection and try again.';
        } else if (err.response?.data?.error?.message) {
            message = err.response.data.error.message;
        } else if (err.response?.data?.message) {
            message = err.response.data.message;
        } else if (err.message) {
            message = err.message;
        }
        
        setError(message);
        Alert.alert('Login Failed', message);
    }
};

    const handleBiometricAuth = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Sign in to MCG Transport Permit',
                fallbackLabel: 'Enter Password',
            });

            if (!result.success) return;

            const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
            const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);

            if (!email || !password) {
                Alert.alert('Error', 'No credentials saved for biometrics.');
                return;
            }

            setValue('email', email);
            setValue('password', password);

            await onSubmit({ email, password });
        } catch (error) {
            console.error('Biometric auth error:', error);
            Alert.alert('Error', 'Biometric authentication failed.');
        }
    };

    return (
        <KeyboardAwareScreen className="flex-1 bg-background" scrollable>
            <View className="flex-1 px-5 pb-8">
                {/* Back button */}
                <View className="pt-3">
                    <TouchableOpacity
                        onPress={handleBack}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
                    >
                        <ArrowLeft size={20} color={PRIMARY_COLOR} strokeWidth={2.25} />
                    </TouchableOpacity>
                </View>

                {/* Illustration */}
                <View className="mt-1 h-64 w-full items-center justify-center">
                    <Image
                        source={LoginPermitIllustration}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                        transition={200}
                    />
                </View>

                {/* Heading */}
                <View className="-mt-1 items-center px-3">
                    <Text className="text-center text-3xl font-bold tracking-tight text-primary">
                        Welcome Back
                    </Text>
                    <Text className="mt-2 max-w-sm text-center text-base leading-6 text-muted-foreground">
                        Sign in to manage construction and demolition waste permits securely.
                    </Text>
                </View>

                {/* Login form card */}
                <View className="mt-7 rounded-3xl border border-border bg-card p-5 shadow-sm">
                    {/* Show error if any */}
                    {error && (
                        <View className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                            <Text className="text-red-600 dark:text-red-400 text-sm text-center">
                                {error}
                            </Text>
                        </View>
                    )}

                    <View>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Email"
                                    placeholder="you@example.com"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={errors.email?.message}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                    blurOnSubmit={false}
                                />
                            )}
                        />
                    </View>

                    <View className="mt-3">
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    ref={passwordRef}
                                    label="Password"
                                    placeholder="••••••••"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={errors.password?.message}
                                    secureTextEntry={!showPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit(onSubmit)}
                                    rightElement={
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            {showPassword ? (
                                                <LucideEyeOff size={20} color={MUTED_ICON_COLOR} />
                                            ) : (
                                                <LucideEye size={20} color={MUTED_ICON_COLOR} />
                                            )}
                                        </TouchableOpacity>
                                    }
                                />
                            )}
                        />
                    </View>

                    <Button
                        label={isSubmitting ? 'Signing in...' : 'Sign In'}
                        onPress={handleSubmit(onSubmit)}
                        loading={isSubmitting}
                        className="mt-6 h-14 rounded-xl"
                    />

                    {/* Biometric sign-in */}
                    {isBiometricSupported && hasSavedCredentials && (
                        <TouchableOpacity
                            onPress={handleBiometricAuth}
                            disabled={isSubmitting}
                            activeOpacity={0.8}
                            className="mt-3 h-13 flex-row items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5"
                        >
                            <LucideFingerprint size={23} color={PRIMARY_COLOR} strokeWidth={2} />
                            <Text className="ml-2 text-base font-semibold text-primary">
                                Sign in with Biometrics
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Divider */}
                <View className="my-6 flex-row items-center">
                    <View className="h-px flex-1 bg-border" />
                    <Text className="mx-4 text-sm font-medium text-muted-foreground">or</Text>
                    <View className="h-px flex-1 bg-border" />
                </View>

                {/* Verify without account */}
                <TouchableOpacity
                    onPress={() => router.push('/verify')}
                    activeOpacity={0.8}
                    className="min-h-16 flex-row items-center rounded-2xl border border-primary/20 bg-card px-4 py-3.5"
                >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck size={23} color={PRIMARY_COLOR} strokeWidth={2} />
                    </View>
                    <View className="ml-3 flex-1">
                        <Text className="text-base font-bold text-foreground">Check Permit</Text>
                        <Text className="mt-0.5 text-sm text-muted-foreground">Continue without signing in</Text>
                    </View>
                    <ChevronRight size={22} color={PRIMARY_COLOR} strokeWidth={2} />
                </TouchableOpacity>

                {/* Register */}
                <TouchableOpacity
                    onPress={() => router.push('/(auth)/register')}
                    activeOpacity={0.8}
                    className="mt-4 min-h-16 flex-row items-center rounded-2xl border border-border bg-secondary/50 px-4 py-3.5"
                >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
                        <CircleUserRound size={22} color={PRIMARY_COLOR} strokeWidth={2} />
                    </View>
                    <View className="ml-3 flex-1">
                        <Text className="text-base font-bold text-foreground">Create Account</Text>
                        <Text className="mt-0.5 text-sm text-muted-foreground">Register to manage your permits</Text>
                    </View>
                    <ChevronRight size={22} color={PRIMARY_COLOR} strokeWidth={2} />
                </TouchableOpacity>

                {/* Footer */}
                <View className="mt-8 items-center pb-2">
                    <View className="flex-row items-center">
                        <ShieldCheck size={16} color={MUTED_ICON_COLOR} strokeWidth={1.8} />
                        <Text className="ml-2 text-sm font-medium text-muted-foreground">
                            Secure MCG Permit Verification
                        </Text>
                    </View>
                </View>
            </View>
        </KeyboardAwareScreen>
    );
}