import { Tabs } from 'expo-router';
import { LucideHome, LucideFileText, LucideUser, LucideScan, LucideScale } from 'lucide-react-native';

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: 'hsl(325 45% 32%)' }}>
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <LucideHome size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="scan"
                options={{
                    title: 'Scan',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <LucideScan size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="permits"
                options={{
                    title: 'Permits',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <LucideFileText size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="weighments"
                options={{
                    title: 'Weighments',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <LucideScale color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <LucideUser size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
