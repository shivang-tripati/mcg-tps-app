import { Stack } from 'expo-router';

export default function PermitsLayout() {
    console.log('🏗️ [PermitsLayout] Rendering');
    
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            {/* ✅ ADD THIS - the index route */}
            <Stack.Screen
                name="index"
                options={{
                    title: 'Permits',
                    headerShown: false,
                }}
            />
            
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Permit Details',
                    headerShown: false,
                }}
            />
            
            {/* ✅ Also add the new route if you have it */}
            <Stack.Screen
                name="new"
                options={{
                    title: 'Create Permit',
                    headerShown: false,
                    presentation: 'modal',
                }}
            />
        </Stack>
    );
}