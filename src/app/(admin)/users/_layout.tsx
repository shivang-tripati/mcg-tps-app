import { Stack } from 'expo-router';

export default function UsersLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: 'hsl(325 45% 32%)' },
                headerTintColor: 'white',
                headerBackTitle: 'Back',
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'User Details',
                    headerShown: false,
                }}
            />
        </Stack>
    );
}