import { Stack } from 'expo-router';

export default function PermitsLayout() {
    console.log('🏗️ [PermitsLayout] Rendering');
    
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >

            <Stack.Screen
                name="index"
                options={{
                    title: 'Permits',
                    headerShown: false,
                }}
            />

            <Stack.Screen
                name="new"
                options={{
                    title: 'Create Permit',
                    headerShown: false,
                    presentation: 'modal',
                }}
            />
            
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Permit Details',
                    headerShown: false,
                }}
            />
            
            <Stack.Screen
                name="[id]/edit"
                options={{
                    title: 'Edit Draft Permit',
                    headerShown: false,
                }}
            />
        </Stack>
    );
}