import { Stack } from 'expo-router';

export default function WeighmentsLayout() {
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
                    title: 'Weighments',
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Weighment Details',
                    headerShown: false,
                }}
            />
        </Stack>
    );
}