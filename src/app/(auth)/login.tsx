import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { KeyboardAwareScreen } from '../../components/ui/keyboard-aware-screen';

// Import schema from web source (via Metro config)
// If this fails, fallback to local definition for now
import { loginSchema } from '../../schemas/index';

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();

    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            const response = await api.post('/auth/login', data);

            console.log("DEBUG: Full API Response Body:", JSON.stringify(response.data, null, 2));

            if (response.data.success) {
                const { accessToken, refreshToken, user } = response.data.data;
                await login(accessToken, refreshToken, user);
                // Navigation handled by auth-store/layout
            } else {
                Alert.alert('Login Failed', response.data.error?.message || 'Unknown error');
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
                <View className="mb-6">
                    <Text className="text-3xl font-bold text-primary mb-2">Welcome Back</Text>
                    <Text className="text-muted-foreground">Sign in to access your Transport Permit System account</Text>
                </View>

                <View className="space-y-4">
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
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                label="Password"
                                placeholder="Enter your password"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                error={errors.password?.message}
                                secureTextEntry
                            />
                        )}
                    />

                    {/* <TouchableOpacity className="self-end" onPress={() => Alert.alert('Forgot Password', 'Please contact your administrator.')}>
                        <Text className="text-primary font-medium">Forgot Password?</Text>
                    </TouchableOpacity> */}

                    <Button
                        label={isSubmitting ? "Signing in..." : "Sign In"}
                        onPress={handleSubmit(onSubmit)}
                        loading={isSubmitting}
                        className="mt-4"
                    />
                </View>

                <View className="mt-8 flex-row justify-center space-x-1">
                    <Text className="text-muted-foreground">Don't have an account?</Text>
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text className="text-primary font-bold">Register</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                <View className="mt-6 flex-row justify-center pb-6">
                    <Link href="/verify" asChild>
                        <TouchableOpacity className="py-1">
                            <Text className="text-primary text-sm">Verify Permit (No Login Required)</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAwareScreen>
    );
}
