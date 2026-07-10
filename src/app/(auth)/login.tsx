import { View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { LucideEye, LucideEyeOff, LucideFingerprint } from 'lucide-react-native';
import { useAuth } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { KeyboardAwareScreen } from '../../components/ui/keyboard-aware-screen';
import { loginSchema } from '../../schemas/index';

type LoginFormData = z.infer<typeof loginSchema>;

const BIOMETRIC_EMAIL_KEY = 'biometric_email';
const BIOMETRIC_PASSWORD_KEY = 'biometric_password';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const passwordRef = useRef<TextInput>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
    };

    const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    useEffect(() => {
        (async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricSupported(compatible && enrolled);

            const savedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
            const savedPassword = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);
            setHasSavedCredentials(!!savedEmail && !!savedPassword);
        })();
    }, []);

    const onSubmit = async (data: LoginFormData) => {
        try {
            const response = await api.post('/auth/login', data);

            if (response.data.success) {
                const { accessToken, refreshToken, user } = response.data.data;
                
                // Save credentials for biometrics if successful
                await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, data.email);
                await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, data.password);
                setHasSavedCredentials(true);

                await login(accessToken, refreshToken, user);
            } else {
                Alert.alert('Login Failed', response.data.error?.message || 'Unknown error');
            }
        } catch (error: any) {
            console.error(error);
            console.log('Error response:', error.response);
            const message = error.response?.data?.error?.message || 'Network error or server unavailable';
            Alert.alert('Error', message);
        }
    };

    const handleBiometricAuth = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Sign in to MCG Transport Permit',
                fallbackLabel: 'Enter Password',
            });

            if (result.success) {
                const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
                const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);

                if (email && password) {
                    setValue('email', email);
                    setValue('password', password);
                    await onSubmit({ email, password });
                } else {
                    Alert.alert('Error', 'No credentials saved for biometrics.');
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Biometric authentication failed.');
        }
    };

    return (
        <KeyboardAwareScreen className="flex-1 bg-background" scrollable>
            <View className="flex-1 px-6 py-6">
                <View className="mb-6">
                    <TouchableOpacity
                        onPress={handleBack}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Go back to the landing screen"
                        className="self-start"
                    >
                        <Text className="text-sm font-semibold text-primary">← Back</Text>
                    </TouchableOpacity>

                    <View className="mt-6">
                        <Text className="text-3xl font-bold text-foreground">Sign In</Text>
                        <Text className="text-base text-muted-foreground mt-2">
                            Access your permits and account details.
                        </Text>
                    </View>
                </View>

                <View className="flex-1">
                    <View className="space-y-2">
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Email"
                                    placeholder="Enter your email"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={errors.email?.message}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                    blurOnSubmit={false}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    ref={passwordRef}
                                    label="Password"
                                    placeholder="Enter your password"
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
                                            accessible={true}
                                            accessibilityRole="button"
                                            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <LucideEyeOff size={20} color="hsl(220 9% 46%)" />
                                            ) : (
                                                <LucideEye size={20} color="hsl(220 9% 46%)" />
                                            )}
                                        </TouchableOpacity>
                                    }
                                />
                            )}
                        />
                    </View>

                    <View className="mt-2 items-end">
                        <TouchableOpacity
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: true }}
                            disabled
                            className="py-2"
                        >
                            {/* <Text className="text-sm font-semibold text-muted-foreground">
                                Forgot password? <Text className="text-primary">Coming soon</Text>
                            </Text> */}
                        </TouchableOpacity>
                    </View>

                    <Button
                        label={isSubmitting ? 'Signing in...' : 'Sign In'}
                        onPress={handleSubmit(onSubmit)}
                        loading={isSubmitting}
                        className="mt-6"
                    />

                    {isBiometricSupported && hasSavedCredentials && (
                        <View className="mt-6">
                            <View className="flex-row items-center my-3">
                                <View className="flex-1 h-px bg-border" />
                                <Text className="mx-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    or
                                </Text>
                                <View className="flex-1 h-px bg-border" />
                            </View>
                            <TouchableOpacity
                                onPress={handleBiometricAuth}
                                className="flex-row items-center justify-center py-3 bg-secondary rounded-md border border-border"
                                activeOpacity={0.8}
                                accessible={true}
                                accessibilityRole="button"
                                accessibilityLabel="Sign in with biometrics"
                            >
                                <LucideFingerprint size={24} color="hsl(325 45% 32%)" />
                                <Text className="text-primary font-semibold ml-2">Sign in with Biometrics</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View className="mt-8 rounded-xl border border-border bg-secondary/60 p-4">
                        <Text className="text-sm font-semibold text-foreground">New here?</Text>
                        <Text className="text-sm text-muted-foreground mt-1">
                            Create an account to manage permits and stay updated.
                        </Text>
                        <Button
                            variant="secondary"
                            label="Create Account"
                            onPress={() => router.push('/(auth)/register')}
                            className="mt-4 h-12"
                            accessibilityHint="Opens account creation"
                        />
                    </View>
                </View>

                <View className="mt-8 items-center pb-2">
                    <Link href="/verify" asChild>
                        <TouchableOpacity className="py-2" accessible={true} accessibilityRole="link">
                            <Text className="text-primary text-sm font-semibold text-center">
                                Need to verify a permit?
                            </Text>
                            <Text className="text-muted-foreground text-sm text-center mt-1">
                                Verify without signing in.
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAwareScreen>
    );
}
