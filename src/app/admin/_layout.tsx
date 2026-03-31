import { Stack } from 'expo-router';

export default function AdminDetailLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: 'hsl(325 45% 32%)' },
                headerTintColor: 'white',
                headerBackTitle: 'Back',
            }}
        >
            <Stack.Screen name="companies/[id]" options={{ headerTitle: 'Company Details' }} />
            <Stack.Screen name="plants/[id]" options={{ headerTitle: 'Plant Details' }} />
            <Stack.Screen name="users/[id]" options={{ headerTitle: 'User Details' }} />
            <Stack.Screen name="weighments/[id]" options={{ headerTitle: 'Weighment Details' }} />
        </Stack>
    );
}
