import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui/button';

export default function LandingScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 px-8 justify-between py-12">
                {/* Branding Section */}
                <View className="items-center mt-12">
                    <View className="w-24 h-24 bg-primary/10 rounded-3xl items-center justify-center mb-6">
                        <Text className="text-4xl text-primary font-bold">PT</Text>
                    </View>
                    <Text className="text-3xl font-bold text-foreground text-center mb-2">
                        Transport Permit
                    </Text>
                    <Text className="text-lg text-muted-foreground text-center px-4">
                        Municipal Corporation Gurugram Waste Management System
                    </Text>
                </View>

                {/* Actions Section */}
                <View className="space-y-4">
                    <Button
                        label="Verify Permit"
                        onPress={() => router.push('/verify')}
                        className="h-14"
                    />

                    <Button
                        variant="outline"
                        label="Sign In"
                        onPress={() => router.push('/(auth)/login')}
                        className="h-14"
                    />

                    <View className="pt-4 items-center">
                        <Text className="text-muted-foreground text-sm">
                            V 1.0.0 • Secure Verification
                        </Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}
