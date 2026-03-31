import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LucideFileText, LucideCheckCircle, LucideClock, LucideAlertCircle, LucidePlus, LucideChevronRight } from 'lucide-react-native';
import { useAuth } from '../../lib/auth-store';
import { useDashboardStats } from '../../hooks/use-dashboard';

interface StatCard {
    title: string;
    value: number;
    icon: typeof LucideFileText;
    color: string;
}

export default function DashboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { data: response, isLoading, isError, refetch } = useDashboardStats();

    const onRefresh = async () => {
        await refetch();
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </SafeAreaView>
        );
    }

    const dashboardData = response?.data;
    const stats: StatCard[] = [
        {
            title: 'Total Permits',
            value: dashboardData?.stats.totalPermits || 0,
            icon: LucideFileText,
            color: 'hsl(325 45% 32%)'
        },
        {
            title: 'Active Permits',
            value: dashboardData?.stats.activePermits || 0,
            icon: LucideAlertCircle,
            color: 'hsl(142 72% 29%)'
        },
        {
            title: 'Pending',
            value: dashboardData?.stats.pendingApproval || 0,
            icon: LucideClock,
            color: 'hsl(38 92% 38%)'
        },
        {
            title: 'This Month',
            value: dashboardData?.stats.completedThisMonth || 0,
            icon: LucideCheckCircle,
            color: 'hsl(217 91% 60%)'
        },
    ];

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View className="px-6 pt-4 pb-12 bg-primary">
                    <Text className="text-white text-2xl font-bold">Welcome back,</Text>
                    <Text className="text-white/90 text-lg">{user?.name || 'User'}</Text>
                </View>

                {/* Stats Grid */}
                <View className="px-6 -mt-8">
                    <View className="flex-row flex-wrap gap-4">
                        {stats.map((stat, index) => (
                            <View
                                key={index}
                                className="bg-card rounded-xl p-4 border border-border flex-1 min-w-[45%] shadow-sm"
                            >
                                <View className="flex-row items-center justify-between mb-2">
                                    <View className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                                        <stat.icon size={22} color={stat.color} />
                                    </View>
                                    <Text className="text-2xl font-bold text-foreground">{stat.value}</Text>
                                </View>
                                <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Quick Actions */}
                <View className="px-6 mt-8">
                    <Text className="text-lg font-semibold text-foreground mb-4">Quick Actions</Text>

                    <View className="flex-row gap-4">
                        <TouchableOpacity
                            className="bg-primary flex-1 p-4 rounded-xl flex-row items-center justify-center shadow-sm"
                            onPress={() => router.push('/permits/new' as any)}
                        >
                            <LucidePlus size={20} color="white" />
                            <Text className="text-white font-semibold ml-2">New Permit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-card border border-border flex-1 p-4 rounded-xl flex-row items-center justify-center shadow-sm"
                            onPress={() => router.push('/(tabs)/permits')}
                        >
                            <LucideFileText size={20} color="hsl(325 45% 32%)" />
                            <Text className="text-primary font-semibold ml-2">All Permits</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Activity */}
                <View className="px-6 mt-8 mb-8">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-semibold text-foreground">Recent Activity</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/permits')}>
                            <Text className="text-primary text-sm font-medium">View All</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="bg-card border border-border rounded-xl overflow-hidden">
                        {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                            dashboardData.recentActivity.map((activity, index) => (
                                <TouchableOpacity
                                    key={activity.id}
                                    className={`p-4 flex-row items-center ${index !== dashboardData.recentActivity.length - 1 ? 'border-b border-border' : ''}`}
                                    onPress={() => router.push(`/permits/${activity.id}` as any)}
                                >
                                    <View className="flex-1">
                                        <View className="flex-row items-center mb-1">
                                            <Text className="text-sm font-medium text-foreground mr-2">{activity.permitNumber}</Text>
                                            <View className={`px-2 py-0.5 rounded-full ${activity.status === 'APPROVED' ? 'bg-green-100' :
                                                activity.status === 'PENDING' ? 'bg-yellow-100' : 'bg-gray-100'
                                                }`}>
                                                <Text className={`text-[10px] font-bold ${activity.status === 'APPROVED' ? 'text-green-700' :
                                                    activity.status === 'PENDING' ? 'text-yellow-700' : 'text-gray-700'
                                                    }`}>
                                                    {activity.status}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                                            {activity.projectName} • {activity.plantName}
                                        </Text>
                                        <Text className="text-[10px] text-muted-foreground mt-1">
                                            {new Date(activity.updatedAt).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </Text>
                                    </View>
                                    <LucideChevronRight size={16} color="hsl(240 3.8% 46.1%)" />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View className="p-8 items-center">
                                <LucideFileText size={32} color="hsl(240 3.8% 46.1%)" opacity={0.5} />
                                <Text className="text-muted-foreground text-center mt-2">No recent activity</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
