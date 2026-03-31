import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export default function RegisterScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background px-6 justify-center">
            <View className="mb-8">
                <Text className="text-3xl font-bold text-primary mb-2">Create Account</Text>
                <Text className="text-muted-foreground">Join the Transport Permit System</Text>
            </View>

            <View className="space-y-4">
                <Input label="Full Name" placeholder="Enter your full name" />
                <Input label="Email" placeholder="Enter your email" keyboardType="email-address" />
                <Input label="Password" placeholder="Create a password" secureTextEntry />
                <Input label="Confirm Password" placeholder="Confirm your password" secureTextEntry />

                <Button label="Sign Up" onPress={() => { }} className="mt-4" />
            </View>

            <View className="mt-8 flex-row justify-center space-x-1">
                <Text className="text-muted-foreground">Already have an account?</Text>
                <Link href="/login" asChild>
                    <TouchableOpacity>
                        <Text className="text-primary font-bold">Sign In</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </SafeAreaView>
    );
}
