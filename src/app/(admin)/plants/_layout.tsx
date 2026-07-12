import { Stack } from 'expo-router';

export default function PlantsLayout() {
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
                    title: 'Plants',
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Plant Details',
                    headerShown: false,
                }}
            />
        </Stack>
    );
}