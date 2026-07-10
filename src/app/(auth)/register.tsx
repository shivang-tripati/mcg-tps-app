import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
import { LucideEye, LucideEyeOff } from 'lucide-react-native';
import { useAuth } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { KeyboardAwareScreen } from '../../components/ui/keyboard-aware-screen';
import { registerSchema } from '../../schemas/index';
import { showToast } from '../../lib/toast';

type RegisterFormData = z.infer<typeof registerSchema>;

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
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            phone: '',
            role: 'INDIVIDUAL',
        },
    });

    const selectedRole = watch('role');

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
                
                // Show success toast
                showToast.success(
                    'Account Created Successfully! 🎉',
                    `Welcome ${user.name}! Redirecting to setup...`
                );
                
                // Auto-login the user
                await login(accessToken, refreshToken, user);
                
                // The RootLayout will handle navigation
            } else {
                const message = response.data.error?.message || 'Registration failed';
                setError(message);
                showToast.error('Registration Failed', message);
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            
            let message = 'Registration failed. Please try again.';
            let description = '';
            
            if (err.response?.data) {
                const errorData = err.response.data;
                if (errorData.error?.message) {
                    message = errorData.error.message;
                    description = errorData.error.details || 'Please check your information and try again';
                } else if (errorData.message) {
                    message = errorData.message;
                }
            } else if (err.message) {
                if (err.message === 'Network Error' || err.code === 'ECONNABORTED') {
                    message = 'Network Error';
                    description = 'Please check your internet connection';
                } else {
                    message = 'Registration Failed';
                    description = err.message;
                }
            }
            
            setError(message);
            showToast.error(message, description);
        } finally {
            setIsLoading(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearNewRegistration();
        };
    }, []);

    return (
        <KeyboardAwareScreen className="flex-1 bg-background" scrollable>
            <View className="flex-1 px-6 justify-center">
                <View className="mb-6 mt-8">
                    <Text className="text-3xl font-bold text-primary mb-2">Create Account</Text>
                    <Text className="text-muted-foreground">Join MCG to manage your permits</Text>
                </View>

                {/* Remove error display - now using toasts */}
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
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-2">Account Type</Text>
                        <Controller
                            control={control}
                            name="role"
                            render={({ field: { onChange, value } }) => (
                                <View className="space-y-2">
                                    {ROLE_OPTIONS.map((role) => (
                                        <TouchableOpacity
                                            key={role.key}
                                            className={`p-4 rounded-lg border ${
                                                value === role.key
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-input bg-background'
                                            }`}
                                            onPress={() => onChange(role.key)}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center">
                                                <View
                                                    className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                                                        value === role.key
                                                            ? 'border-primary'
                                                            : 'border-input'
                                                    }`}
                                                >
                                                    {value === role.key && (
                                                        <View className="w-3 h-3 rounded-full bg-primary" />
                                                    )}
                                                </View>
                                                <View className="flex-1">
                                                    <Text className={`text-base font-semibold ${
                                                        value === role.key ? 'text-primary' : 'text-foreground'
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

                    <Button
                        label={isSubmitting || isLoading ? "Creating Account..." : "Sign Up"}
                        onPress={handleSubmit(onSubmit)}
                        loading={isSubmitting || isLoading}
                        className="mt-2"
                    />
                </View>

                <View className="mt-8 flex-row justify-center space-x-1 pb-6">
                    <Text className="text-muted-foreground">Already have an account?</Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity>
                            <Text className="text-primary font-bold"> Sign In</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAwareScreen>
    );
}