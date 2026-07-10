// app/reset-password.tsx
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';

export default function ResetPasswordScreen() {
    const { token } = useLocalSearchParams<{ token: string }>();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!password || !confirmPassword) {
            showToast.error('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            showToast.error('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 8) {
            showToast.error('Error', 'Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                token,
                password,
            });
            showToast.success('Success', 'Your password has been reset successfully');
            router.replace('/(auth)/login');
        } catch (error: any) {
            showToast.error('Error', error?.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-background px-6 justify-center">
            <View className="mb-8">
                <Text className="text-3xl font-bold text-primary mb-2">Reset Password</Text>
                <Text className="text-muted-foreground">Enter your new password below</Text>
            </View>

            <View className="space-y-4">
                <View>
                    <Text className="text-sm font-medium text-foreground mb-2">New Password</Text>
                    <TextInput
                        className="bg-input px-4 py-3 rounded-lg border border-input"
                        placeholder="Enter new password"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        editable={!loading}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                <View>
                    <Text className="text-sm font-medium text-foreground mb-2">Confirm Password</Text>
                    <TextInput
                        className="bg-input px-4 py-3 rounded-lg border border-input"
                        placeholder="Confirm your password"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        editable={!loading}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                <TouchableOpacity
                    className="bg-primary py-4 rounded-xl mt-4 active:opacity-80"
                    onPress={handleReset}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-primary-foreground font-bold text-center text-lg">
                            Reset Password
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    className="py-2"
                    onPress={() => router.replace('/(auth)/login')}
                    disabled={loading}
                >
                    <Text className="text-center text-muted-foreground">
                        Remember your password? <Text className="text-primary font-bold">Sign In</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}