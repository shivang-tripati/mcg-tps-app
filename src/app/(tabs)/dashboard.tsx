import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    LucideClipboardList,
    LucideActivity,
    LucideHourglass,
    LucideCalendarCheck,
    LucidePlus,
    LucideFileStack,
    LucideChevronRight,
    LucideInbox,
    LucideRefreshCw,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth-store';
import { useDashboardStats } from '../../hooks/use-dashboard';
import type { DashboardStats } from '../../types/dashboard';
import { StatusBadge } from '../../components/ui/status-badge';

const PRIMARY = 'hsl(325 45% 32%)';
const MUTED = 'hsl(220 9% 46%)';

interface StatDef {
    title: string;
    subtitle: string;
    valueKey: keyof DashboardStats;
    icon: typeof LucideClipboardList;
    accent: string;
    iconBg: string;
}

const STATS: StatDef[] = [
    {
        title: 'Total permits',
        subtitle: 'All time',
        valueKey: 'totalPermits',
        icon: LucideClipboardList,
        accent: PRIMARY,
        iconBg: 'hsl(325 45% 32% / 0.12)',
    },
    {
        title: 'Active',
        subtitle: 'In progress',
        valueKey: 'activePermits',
        icon: LucideActivity,
        accent: 'hsl(142 72% 29%)',
        iconBg: 'hsl(142 72% 29% / 0.12)',
    },
    {
        title: 'Pending',
        subtitle: 'Awaiting action',
        valueKey: 'pendingApproval',
        icon: LucideHourglass,
        accent: 'hsl(38 92% 38%)',
        iconBg: 'hsl(38 92% 38% / 0.14)',
    },
    {
        title: 'Completed',
        subtitle: 'This month',
        valueKey: 'completedThisMonth',
        icon: LucideCalendarCheck,
        accent: 'hsl(217 91% 48%)',
        iconBg: 'hsl(217 91% 48% / 0.12)',
    },
];

export default function DashboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { data: response, isLoading, isError, isFetching, refetch } = useDashboardStats();

    const onRefresh = () => refetch();

    const openPermit = (permitId: string) => {
        if (user?.role === 'ADMIN') {
            router.push(`/(admin)/permits/${permitId}` as const);
        } else {
            router.push(`/permits/${permitId}` as const);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text className="text-muted-foreground text-sm mt-4">Loading dashboard…</Text>
            </SafeAreaView>
        );
    }

    if (isError) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center px-8">
                <LucideInbox size={48} color={MUTED} />
                <Text className="text-foreground text-lg font-semibold text-center mt-4">
                    Couldn&apos;t load dashboard
                </Text>
                <Text className="text-muted-foreground text-sm text-center mt-2">
                    Check your connection and try again.
                </Text>
                <TouchableOpacity
                    className="mt-6 flex-row items-center gap-2 bg-primary px-6 py-3 rounded-xl"
                    onPress={() => refetch()}
                    activeOpacity={0.85}
                >
                    <LucideRefreshCw size={18} color="white" />
                    <Text className="text-white font-semibold">Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const dashboardData = response?.data;
    const stats = dashboardData?.stats;

    const userInitial = (user?.name || user?.email || '?')
        .trim()
        .charAt(0)
        .toUpperCase();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={onRefresh}
                        tintColor={PRIMARY}
                        colors={[PRIMARY]}
                    />
                }
            >
                {/* Header */}
                <View className="px-6 pt-2 pb-10 bg-primary rounded-b-[28px] shadow-sm">
                    <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-4">
                            <Text className="text-white/85 text-sm font-medium tracking-wide uppercase">
                                Dashboard
                            </Text>
                            <Text className="text-white text-2xl font-bold mt-1.5 leading-tight">
                                Welcome back
                            </Text>
                            <Text className="text-white/95 text-lg font-medium mt-1" numberOfLines={1}>
                                {user?.name || 'User'}
                            </Text>
                            <Text className="text-white/70 text-xs mt-2">
                                Track permits, approvals, and recent activity in one place.
                            </Text>
                        </View>
                        <View
                            className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center border border-white/25"
                            accessibilityLabel="Profile initial"
                        >
                            <Text className="text-white text-xl font-bold">{userInitial}</Text>
                        </View>
                    </View>
                </View>

                {/* Stats */}
                <View className="px-5 -mt-7">
                    <View className="flex-row flex-wrap gap-3">
                        {STATS.map((def) => {
                            const value = stats?.[def.valueKey] ?? 0;
                            const Icon = def.icon;
                            return (
                                <View
                                    key={def.valueKey}
                                    className="bg-card rounded-2xl p-4 border border-border flex-1 min-w-[46%] shadow-sm"
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.06,
                                        shadowRadius: 6,
                                        elevation: 2,
                                    }}
                                >
                                    <View className="flex-row items-start justify-between mb-3">
                                        <View
                                            className="w-11 h-11 rounded-xl items-center justify-center"
                                            style={{ backgroundColor: def.iconBg }}
                                        >
                                            <Icon size={22} color={def.accent} strokeWidth={2} />
                                        </View>
                                        <Text
                                            className="text-3xl font-bold tabular-nums"
                                            style={{ color: def.accent }}
                                        >
                                            {value}
                                        </Text>
                                    </View>
                                    <Text className="text-sm font-semibold text-foreground leading-tight">
                                        {def.title}
                                    </Text>
                                    <Text className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">
                                        {def.subtitle}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Quick actions */}
                <View className="px-5 mt-8">
                    <Text className="text-lg font-bold text-foreground mb-3">Quick actions</Text>
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 bg-primary p-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
                            style={{
                                shadowColor: PRIMARY,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.25,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                            onPress={() => router.push('/permits/new' as const)}
                            activeOpacity={0.88}
                        >
                            <View className="w-9 h-9 rounded-full bg-white/20 items-center justify-center">
                                <LucidePlus size={20} color="white" strokeWidth={2.5} />
                            </View>
                            <Text className="text-white font-bold text-base">New permit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 bg-card border border-border p-4 rounded-2xl flex-row items-center justify-center gap-2"
                            onPress={() => router.push('/(tabs)/permits')}
                            activeOpacity={0.75}
                        >
                            <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
                                <LucideFileStack size={18} color={PRIMARY} strokeWidth={2} />
                            </View>
                            <Text className="text-primary font-bold text-base">All permits</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent activity */}
                <View className="px-5 mt-8 mb-10">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-lg font-bold text-foreground">Recent activity</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(tabs)/permits')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text className="text-primary text-sm font-semibold">View all</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                            dashboardData.recentActivity.map((activity, index) => (
                                <TouchableOpacity
                                    key={activity.id}
                                    className={`p-4 flex-row items-center active:bg-muted/50 ${
                                        index !== dashboardData.recentActivity.length - 1
                                            ? 'border-b border-border'
                                            : ''
                                    }`}
                                    onPress={() => openPermit(activity.id)}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-1 min-w-0 pr-2">
                                        <View className="flex-row flex-wrap items-center gap-2 mb-1.5">
                                            <Text
                                                className="text-base font-bold text-foreground"
                                                numberOfLines={1}
                                            >
                                                {activity.permitNumber}
                                            </Text>
                                            <StatusBadge status={activity.status} />
                                        </View>
                                        <Text
                                            className="text-sm text-muted-foreground"
                                            numberOfLines={2}
                                        >
                                            {activity.projectName}
                                            <Text className="text-muted-foreground/80"> · </Text>
                                            {activity.plantName}
                                        </Text>
                                        <Text className="text-[11px] text-muted-foreground/90 mt-2 font-medium">
                                            {new Date(activity.updatedAt).toLocaleString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true,
                                            })}
                                        </Text>
                                    </View>
                                    <LucideChevronRight size={20} color={MUTED} />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View className="py-12 px-6 items-center">
                                <View className="w-16 h-16 rounded-full bg-muted/80 items-center justify-center mb-3">
                                    <LucideInbox size={32} color={MUTED} />
                                </View>
                                <Text className="text-foreground font-semibold text-center">
                                    No recent activity
                                </Text>
                                <Text className="text-muted-foreground text-sm text-center mt-1.5 leading-5">
                                    Create a permit to see updates here.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
