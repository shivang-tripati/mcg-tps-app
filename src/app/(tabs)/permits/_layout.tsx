import { Stack } from 'expo-router';

export default function PermitsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
             <Stack.Screen
                name="[id]"
                options={{
                    title: 'Permit Details',
                    headerShown: false,
                }}
            />
        </Stack>
    );
}
