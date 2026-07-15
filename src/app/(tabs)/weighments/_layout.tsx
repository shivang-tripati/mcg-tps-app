import { Stack } from 'expo-router';

export default function WeighmentLayout() {
    console.log('🏗️ [WeighmentLayout] Rendering');    
    return (
        <Stack
            screenOptions={{
                headerShown: false,
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