import { Stack } from 'expo-router';

export default function PermitsLayout() {
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
                    title: 'Manage Permits',
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Permit Details',
                    headerShown: true,
                }}
            />
        </Stack>
    );
}