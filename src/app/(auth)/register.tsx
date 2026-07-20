import { View, Text, TouchableOpacity, TextInput, Linking, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
import { LucideEye, LucideEyeOff, LucideCheckSquare, LucideSquare } from 'lucide-react-native';
import { useAuth } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { KeyboardAwareScreen } from '../../components/ui/keyboard-aware-screen';
import { registerSchema } from '../../schemas/index';
import { showToast } from '../../lib/toast';

// ✅ Extend the register schema to include agreements
const registerWithAgreementSchema = registerSchema.extend({
    agreeToTerms: z.boolean().refine(val => val === true, {
        message: 'You must agree to the Terms of Service and Privacy Policy',
    }),
    agreeToCompliance: z.boolean().refine(val => val === true, {
        message: 'You must acknowledge the compliance requirements',
    }),
});

type RegisterFormData = z.infer<typeof registerWithAgreementSchema>;

const ROLE_OPTIONS = [
    { key: 'INDIVIDUAL' as const, label: 'Individual', description: 'Personal waste disposal permits' },
    { key: 'COMPANY_USER' as const, label: 'Company User', description: 'Manage company projects & permits' },
];

export default function RegisterScreen() {
    const router = useRouter();
    const { login, clearNewRegistration } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const emailRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const [showPassword, setShowPassword] = useState(false);

    const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
        resolver: zodResolver(registerWithAgreementSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            phone: '',
            role: 'INDIVIDUAL',
            agreeToTerms: false,
            agreeToCompliance: false,
        },
    });

    const agreeToTerms = watch('agreeToTerms');
    const agreeToCompliance = watch('agreeToCompliance');
    const allAgreementsChecked = agreeToTerms && agreeToCompliance;

    const onSubmit = async (data: RegisterFormData) => {
        setError(null);
        setIsLoading(true);

        try {
            const payload: any = {
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role || 'INDIVIDUAL',
            };
            if (data.phone && data.phone.trim() !== '') {
                payload.phone = data.phone;
            }

            const response = await api.post('/auth/register', payload);

            if (response.data.success) {
                const { accessToken, refreshToken, user } = response.data.data;

                showToast.success(
                    'Account Created Successfully! 🎉',
                    `Welcome ${user.name}! Redirecting to setup...`
                );

                await login(accessToken, refreshToken, user);
            }
        } catch (err: any) {
            console.error('Registration error:', err);

            let message = 'Registration failed. Please try again.';

            if (err.response?.status === 409) {
                message = err.response?.data?.error?.message || 'User already exists. Please try logging in.';
                showToast.error('Account Already Exists', message);
            } else if (err.response?.data?.error?.message) {
                message = err.response.data.error.message;
                showToast.error('Registration Failed', message);
            } else if (err.message === 'Network Error' || err.code === 'ECONNABORTED') {
                message = 'Network Error. Please check your internet connection.';
                showToast.error('Network Error', message);
            } else {
                showToast.error('Registration Failed', err.message || 'Please try again');
            }

            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ Cleanup on unmount
    useEffect(() => {
        return () => {
            clearNewRegistration();
        };
    }, []);

    // ✅ Helper to open links in browser
    const openLink = async (path: string) => {
        try {
            const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL;

            if (!websiteUrl) {
                showToast.error('Error', 'Website URL is not configured');
                return;
            }

            const baseUrl = websiteUrl.replace(/\/+$/, '');
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            const fullUrl = `${baseUrl}${cleanPath}`;

            const supported = await Linking.canOpenURL(fullUrl);

            if (supported) {
                await Linking.openURL(fullUrl);
            } else {
                showToast.error('Error', 'Cannot open the link. Please try again.');
            }
        } catch (error) {
            console.error('Failed to open link:', error);
            showToast.error('Error', 'Could not open the link. Please try again.');
        }
    };

    return (
        <KeyboardAwareScreen className="flex-1 bg-background" scrollable>
            <View className="flex-1 px-6 justify-center py-8">
                <View className="mb-6">
                    <Text className="text-3xl font-bold text-primary mb-2">Create Account</Text>
                    <Text className="text-muted-foreground">Join MCG to manage your permits</Text>
                </View>

                <View className="space-y-4">
                    <Controller
                        control={control}
                        name="name"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                label="Full Name"
                                placeholder="Enter your full name"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                error={errors.name?.message}
                                autoCapitalize="words"
                                returnKeyType="next"
                                onSubmitEditing={() => emailRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                ref={emailRef}
                                label="Email"
                                placeholder="you@example.com"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                error={errors.email?.message}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                returnKeyType="next"
                                onSubmitEditing={() => phoneRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="phone"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                ref={phoneRef}
                                label="Phone (Optional)"
                                placeholder="+91XXXXXXXXXX"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value || ''}
                                error={errors.phone?.message}
                                keyboardType="phone-pad"
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
                                placeholder="Min 8 chars"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                error={errors.password?.message}
                                secureTextEntry={!showPassword}
                                returnKeyType="done"
                                rightElement={
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        {showPassword ? (
                                            <LucideEyeOff size={20} color="#737373" />
                                        ) : (
                                            <LucideEye size={20} color="#737373" />
                                        )}
                                    </TouchableOpacity>
                                }
                            />
                        )}
                    />

                    {/* Role Selection */}
                    <View className="mb-2">
                        <Text className="text-sm font-medium text-foreground mb-2">Account Type</Text>
                        <Controller
                            control={control}
                            name="role"
                            render={({ field: { onChange, value } }) => (
                                <View className="space-y-2">
                                    {ROLE_OPTIONS.map((role) => (
                                        <TouchableOpacity
                                            key={role.key}
                                            className={`p-4 rounded-lg border ${value === role.key
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-input bg-background'
                                                }`}
                                            onPress={() => onChange(role.key)}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center">
                                                <View
                                                    className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${value === role.key
                                                            ? 'border-primary'
                                                            : 'border-input'
                                                        }`}
                                                >
                                                    {value === role.key && (
                                                        <View className="w-3 h-3 rounded-full bg-primary" />
                                                    )}
                                                </View>
                                                <View className="flex-1">
                                                    <Text className={`text-base font-semibold ${value === role.key ? 'text-primary' : 'text-foreground'
                                                        }`}>
                                                        {role.label}
                                                    </Text>
                                                    <Text className="text-xs text-muted-foreground mt-0.5">
                                                        {role.description}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        />
                        {errors.role && (
                            <Text className="text-xs text-error mt-1">{errors.role.message}</Text>
                        )}
                    </View>

                    {/* Terms and Agreements Section */}
                    <View className="mt-2 pt-2 border-t border-border">
                        <Text className="text-sm font-medium text-foreground mb-3">
                            Agreements
                        </Text>

                        {/* Terms of Service & Privacy Policy */}
                        <Controller
                            control={control}
                            name="agreeToTerms"
                            render={({ field: { onChange, value } }) => (
                                <TouchableOpacity
                                    className="flex-row items-start mb-3"
                                    onPress={() => onChange(!value)}
                                    activeOpacity={0.7}
                                >
                                    {value ? (
                                        <LucideCheckSquare size={22} color="#7c3aed" />
                                    ) : (
                                        <LucideSquare size={22} color="#9ca3af" />
                                    )}
                                    <View className="ml-3 flex-1">
                                        <Text className="text-sm text-foreground">
                                            I agree to the{' '}
                                            <Text
                                                className="text-primary font-semibold"
                                                onPress={() => openLink('/terms-of-service')}
                                            >
                                                Terms of Service
                                            </Text>
                                            {' and '}
                                            <Text
                                                className="text-primary font-semibold"
                                                onPress={() => openLink('/privacy-policy')}
                                            >
                                                Privacy Policy
                                            </Text>
                                        </Text>
                                        {errors.agreeToTerms && (
                                            <Text className="text-xs text-error mt-1">
                                                {errors.agreeToTerms.message}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                        />

                        {/* Compliance Requirements */}
                        <Controller
                            control={control}
                            name="agreeToCompliance"
                            render={({ field: { onChange, value } }) => (
                                <TouchableOpacity
                                    className="flex-row items-start"
                                    onPress={() => onChange(!value)}
                                    activeOpacity={0.7}
                                >
                                    {value ? (
                                        <LucideCheckSquare size={22} color="#7c3aed" />
                                    ) : (
                                        <LucideSquare size={22} color="#9ca3af" />
                                    )}
                                    <View className="ml-3 flex-1">
                                        <Text className="text-sm text-foreground">
                                            I acknowledge the{' '}
                                            <Text
                                                className="text-primary font-semibold"
                                                onPress={() => openLink('/compliance')}
                                            >
                                                Compliance Requirements
                                            </Text>
                                            {' for C&D waste management'}
                                        </Text>
                                        {errors.agreeToCompliance && (
                                            <Text className="text-xs text-error mt-1">
                                                {errors.agreeToCompliance.message}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>

                    <Button
                        label={isSubmitting || isLoading ? "Creating Account..." : "Sign Up"}
                        onPress={handleSubmit(onSubmit)}
                        loading={isSubmitting || isLoading}
                        disabled={!allAgreementsChecked}
                        className="mt-2"
                    />
                </View>

                {/* ✅ Back to Login link - Fixed routing */}
                <View className="mt-6 flex-row justify-center items-center pb-4">
                    <Text className="text-muted-foreground">Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/login')}>
                        <Text className="text-primary font-bold">Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAwareScreen>
    );
}