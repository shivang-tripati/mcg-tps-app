import { Stack } from 'expo-router';

export default function CompaniesLayout() {
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
                    title: 'Companies',
                    headerShown: false, // Hide header for the main companies list
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Company Details',
                    headerShown: false,
                }}
            />
        </Stack>
    );
}