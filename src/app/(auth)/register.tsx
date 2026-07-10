import { View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState } from 'react';
import { LucideEye, LucideEyeOff } from 'lucide-react-native';
import { useAuth } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { KeyboardAwareScreen } from '../../components/ui/keyboard-aware-screen';
import { registerSchema } from '../../schemas/index';

type RegisterFormData = z.infer<typeof registerSchema>;

const ROLE_OPTIONS = [
    { key: 'INDIVIDUAL' as const, label: 'Individual', description: 'Personal waste disposal permits' },
    { key: 'COMPANY_USER' as const, label: 'Company User', description: 'Manage company projects & permits' },
];

export default function RegisterScreen() {
    const router = useRouter();
    const { login } = useAuth();

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
        try {
            // Clean up empty optional fields
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
                await login(accessToken, refreshToken, user);
                // Navigation handled by auth-store / root layout
            } else {
                Alert.alert('Registration Failed', response.data.error?.message || 'Unknown error');
            }
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.error?.message || 'Network error or server unavailable';
            Alert.alert('Error', message);
        }
    };

    return (
        <KeyboardAwareScreen className="flex-1 bg-background" scrollable>
            <View className="flex-1 px-6 justify-center">
                <View className="mb-6 mt-8">
                    <Text className="text-3xl font-bold text-primary mb-2">Create Account</Text>
                    <Text className="text-muted-foreground">Join MCG to manage your permits</Text>
                </View>

                <View className="space-y-4">
                    {/* Name */}
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

                    {/* Email */}
                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                ref={emailRef}
                                label="Email"
                                placeholder="Enter your email"
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

                    {/* Phone (optional) */}
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

                    {/* Password */}
                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                ref={passwordRef}
                                label="Password"
                                placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
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
                                        accessible={true}
                                        accessibilityRole="button"
                                        accessibilityLabel={showPassword ? "Hide password" : "Show password"}
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
                        label={isSubmitting ? "Creating Account..." : "Sign Up"}
                        onPress={handleSubmit(onSubmit)}
                        loading={isSubmitting}
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
