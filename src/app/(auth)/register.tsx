import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { KeyboardAwareScreen } from '../../components/ui/keyboard-aware-screen';

export default function RegisterScreen() {
    return (
        <KeyboardAwareScreen className="flex-1 bg-background" scrollable>
            <View className="flex-1 px-6 justify-center">
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

                <View className="mt-8 flex-row justify-center space-x-1 pb-6">
                    <Text className="text-muted-foreground">Already have an account?</Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity>
                            <Text className="text-primary font-bold">Sign In</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAwareScreen>
    );
}

