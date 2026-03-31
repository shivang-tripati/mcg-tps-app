import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    LucideFileText,
    LucideClock,
    LucideTruck,
    LucideCheckCircle
} from 'lucide-react-native';
import { useAdminStats } from '../../hooks/use-admin';
import { StatusBadge } from '../../components/ui/status-badge';

interface StatCard {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
}

export default function AdminDashboardScreen() {
    const { data: response, isLoading, refetch } = useAdminStats();

    // console.log(response?.data?.recentActivity);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center" edges={['bottom']}>
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </SafeAreaView>
        );
    }

    const stats = response?.data?.stats;
    const recentActivity = response?.data?.recentActivity || [];


    const statCards: StatCard[] = [
        { title: 'Total Permits', value: stats?.totalPermits || 0, icon: LucideFileText, color: 'hsl(325 45% 32%)' },
        { title: 'Pending Approval', value: stats?.pendingApproval || 0, icon: LucideClock, color: 'hsl(38 92% 38%)' },
        { title: 'In Transit', value: stats?.inTransit || 0, icon: LucideTruck, color: 'hsl(217 91% 60%)' },
        { title: 'Completed Today', value: stats?.completedToday || 0, icon: LucideCheckCircle, color: 'hsl(142 72% 29%)' },
    ];

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
            >
                <View className="px-4 py-6">
                    <Text className="text-2xl font-bold text-foreground mb-6">Admin Overview</Text>

                    <View className="flex-row flex-wrap gap-3">
                        {statCards.map((stat, index) => (
                            <View
                                key={index}
                                className="bg-card rounded-xl p-4 border border-border min-w-[47%] flex-1 shadow-sm"
                            >
                                <View className="flex-row items-center justify-between mb-2">
                                    <View className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                                        <stat.icon size={20} color={stat.color} />
                                    </View>
                                    <Text className="text-2xl font-bold text-foreground">{stat.value}</Text>
                                </View>
                                <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {stat.title}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Recent Activity Section */}
                    <View className="mt-8">
                        <Text className="text-xl font-bold text-foreground mb-4">Recent Activity</Text>
                        <View className="bg-card rounded-xl border border-border overflow-hidden">
                            {recentActivity.length === 0 ? (
                                <View className="p-4 items-center">
                                    <Text className="text-muted-foreground">No recent activity</Text>
                                </View>
                            ) : (
                                recentActivity.map((activity, index) => (
                                    <View
                                        key={activity.id}
                                        className={`p-4 flex-row items-center justify-between ${index !== recentActivity.length - 1 ? 'border-b border-border' : ''
                                            }`}
                                    >
                                        <View className="flex-1 mr-4">
                                            <View className="flex-row items-center mb-1">
                                                <Text className="font-medium text-foreground mr-2">
                                                    {activity.permitNumber}
                                                </Text>
                                                <StatusBadge status={activity.status} label={activity.status} />
                                            </View>

                                            <Text className="text-sm text-muted-foreground">
                                                {activity.projectName} • {activity.userName}
                                            </Text>
                                        </View>
                                        <Text className="text-xs text-muted-foreground">
                                            {new Date(activity.updatedAt).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: 'numeric',
                                                hour12: true
                                            })}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
