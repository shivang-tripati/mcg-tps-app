import { useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedReaction,
    runOnJS,
    withTiming,
    withDelay,
    withRepeat,
    Easing,
    FadeInDown,
} from 'react-native-reanimated';
import {
    LucideFileText,
    LucideClock,
    LucideTruck,
    LucideCheckCircle,
    LucideBuilding2,
    LucideFactory,
    LucideUsers,
    LucideChevronRight,
    LucideTrendingUp,
    LucideTrendingDown,
    LucideInbox,
} from 'lucide-react-native';
import { useAdminStats } from '../../hooks/use-admin';
import { StatusBadge } from '../../components/ui/status-badge';

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

const PRIMARY = 'hsl(325 45% 32%)';
const MUTED = 'hsl(220 9% 46%)';

const STATUS_DOT_COLORS: Record<string, string> = {
    DRAFT: '#94a3b8',
    SUBMITTED: '#f59e0b',
    UNDER_REVIEW: '#f59e0b',
    APPROVED: '#22c55e',
    IN_TRANSIT: '#3b82f6',
    COMPLETED: '#16a34a',
    EXPIRED: '#ef4444',
    REJECTED: '#ef4444',
    CANCELLED: '#94a3b8',
    PENDING: '#f59e0b',
};

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface StatCardData {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    route?: string;
    trend?: { value: number; positive: boolean };
}

// ────────────────────────────────────────────
// Animated number counter
// ────────────────────────────────────────────

function AnimatedCounter({ value, delay = 0, color }: { value: number; delay?: number; color?: string }) {
    return <FrameCounter target={value} delay={delay} color={color} />;
}

function FrameCounter({ target, delay, color }: { target: number; delay: number; color?: string }) {
    const progress = useSharedValue(0);
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        progress.value = 0;
        progress.value = withDelay(
            delay,
            withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
        );
    }, [target]);

    const updateDisplay = useCallback((val: number) => {
        setDisplay(Math.round(val));
    }, []);

    useAnimatedReaction(
        () => progress.value * target,
        (current: number) => {
            runOnJS(updateDisplay)(current);
        },
        [target]
    );

    return (
        <Text
            style={[
                { fontSize: 28, fontWeight: '800', color: color || '#1e293b' },
                Platform.OS === 'ios' ? { fontFamily: 'System' } : {},
            ]}
        >
            {display}
        </Text>
    );
}

// ────────────────────────────────────────────
// Skeleton components
// ────────────────────────────────────────────

function SkeletonPulse({ className, style }: { className?: string; style?: any }) {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            className={className}
            style={[{ backgroundColor: 'hsl(220 14% 90%)' }, animatedStyle, style]}
        />
    );
}

function StatCardSkeleton() {
    return (
        <View style={{ minWidth: '47%', flex: 1 }}>
            <View className="bg-card rounded-2xl p-5 border border-border" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                <View className="flex-row items-center justify-between mb-3">
                    <SkeletonPulse className="w-10 h-10 rounded-xl" />
                    <SkeletonPulse className="w-14 h-8 rounded-lg" />
                </View>
                <SkeletonPulse className="w-20 h-3 rounded-sm" />
            </View>
        </View>
    );
}

function ActivitySkeleton() {
    return (
        <View className="bg-card rounded-2xl border border-border overflow-hidden">
            {[0, 1, 2].map((i) => (
                <View key={i} className={`p-4 flex-row items-center justify-between ${i < 2 ? 'border-b border-border' : ''}`}>
                    <View className="flex-1 mr-4">
                        <View className="flex-row items-center mb-2">
                            <SkeletonPulse className="w-24 h-4 rounded-sm mr-2" />
                            <SkeletonPulse className="w-16 h-5 rounded-full" />
                        </View>
                        <SkeletonPulse className="w-36 h-3 rounded-sm" />
                    </View>
                    <SkeletonPulse className="w-16 h-3 rounded-sm" />
                </View>
            ))}
        </View>
    );
}

// ────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────

export default function AdminDashboardScreen() {
    const { data: response, isLoading, refetch } = useAdminStats();
    const router = useRouter();

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
                <ScrollView className="flex-1">
                    <View className="px-4 py-6">
                        <View className="flex-row flex-wrap gap-3">
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </View>

                        <View className="mt-8">
                            <SkeletonPulse className="w-28 h-5 rounded-sm mb-4" />
                            <View style={{ gap: 10 }}>
                                <SkeletonPulse style={{ height: 64, borderRadius: 16 }} />
                                <SkeletonPulse style={{ height: 64, borderRadius: 16 }} />
                                <SkeletonPulse style={{ height: 64, borderRadius: 16 }} />
                            </View>
                        </View>

                        <View className="mt-8">
                            <SkeletonPulse className="w-32 h-5 rounded-sm mb-4" />
                            <ActivitySkeleton />
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    const stats = response?.data?.stats;
    const recentActivity = response?.data?.recentActivity || [];

    const trendData: Record<string, { positive: boolean }> = {
        'Total Permits': { positive: true },
        'Pending Approval': { positive: false },
        'In Transit': { positive: true },
        'Completed Today': { positive: true },
    };

    const statCards: StatCardData[] = [
        { title: 'Total Permits', value: stats?.totalPermits || 0, icon: LucideFileText, color: PRIMARY, route: '/(admin)/permits' },
        { title: 'Pending', value: stats?.pendingApproval || 0, icon: LucideClock, color: 'hsl(38 92% 38%)', route: '/(admin)/permits' },
        { title: 'In Transit', value: stats?.inTransit || 0, icon: LucideTruck, color: 'hsl(217 91% 60%)', route: '/(admin)/permits' },
        { title: 'Completed', value: stats?.completedToday || 0, icon: LucideCheckCircle, color: 'hsl(142 72% 29%)', route: '/(admin)/permits' },
    ];

    const managementItems = [
        { title: 'Companies', subtitle: 'Organizations & registrations', icon: LucideBuilding2, color: '#7c3aed', route: '/companies' },
        { title: 'Plants', subtitle: 'Facility locations & zones', icon: LucideFactory, color: '#0d9488', route: '/plants' },
        { title: 'Users', subtitle: 'Accounts & access control', icon: LucideUsers, color: '#3b82f6', route: '/users' },
    ];

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
            >
                <View className="px-4 py-5">

                    {/* ═══════ Stat Cards Grid ═══════ */}
                    <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                        {statCards.map((stat, index) => (
                            <Animated.View
                                key={index}
                                entering={FadeInDown.delay(index * 80).duration(400)}
                                style={{ minWidth: '47%', flex: 1 }}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        if (stat.route) router.push(stat.route as any);
                                    }}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: 16,
                                        overflow: 'hidden',
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.04,
                                        shadowRadius: 6,
                                        elevation: 1,
                                    }}
                                >
                                    {/* Color accent strip */}
                                    {/* <View style={{ height: 3, backgroundColor: stat.color }} /> */}

                                    <View style={{ padding: 16 }}>
                                        <View className="flex-row items-start justify-between">
                                            <View style={{ flex: 1 }}>
                                                <AnimatedCounter value={stat.value} delay={index * 80} color={stat.color} />
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    {stat.title}
                                                </Text>
                                            </View>
                                            <View style={{ backgroundColor: `${stat.color}18`, padding: 10, borderRadius: 12 }}>
                                                <stat.icon size={18} />
                                            </View>
                                        </View>

                                        {stat.trend && (
                                            <View className="flex-row items-center" style={{ marginTop: 10 }}>
                                                <View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    backgroundColor: stat.trend.positive ? '#f0fdf4' : '#fef2f2',
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 20,
                                                    gap: 3,
                                                }}>
                                                    {stat.trend.positive ? (
                                                        <LucideTrendingUp size={11} color="#16a34a" />
                                                    ) : (
                                                        <LucideTrendingDown size={11} color="#dc2626" />
                                                    )}
                                                    <Text style={{
                                                        fontSize: 11,
                                                        fontWeight: '700',
                                                        color: stat.trend.positive ? '#16a34a' : '#dc2626',
                                                    }}>
                                                        {stat.trend.positive ? '+' : '-'}{stat.trend.value}%
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>

                    {/* ═══════ Management Section ═══════ */}
                    <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{ marginTop: 28 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12, letterSpacing: 0.3 }}>
                            Management
                        </Text>
                        <View style={{
                            backgroundColor: 'white',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 6,
                            elevation: 1,
                        }}>
                            {managementItems.map((item, index) => (
                                <TouchableOpacity
                                    key={item.title}
                                    onPress={() => router.push(item.route as any)}
                                    activeOpacity={0.6}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 14,
                                        paddingHorizontal: 16,
                                        borderBottomWidth: index !== managementItems.length - 1 ? 1 : 0,
                                        borderBottomColor: '#f1f5f9',
                                    }}
                                >
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 12,
                                        backgroundColor: `${item.color}14`,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 14,
                                    }}>
                                        <item.icon size={20} color={item.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#1e293b' }}>
                                            {item.title}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                                            {item.subtitle}
                                        </Text>
                                    </View>
                                    <LucideChevronRight size={18} color="#cbd5e1" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ═══════ Recent Activity Section ═══════ */}
                    <Animated.View entering={FadeInDown.delay(450).duration(400)} style={{ marginTop: 28, marginBottom: 12 }}>
                        <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', letterSpacing: 0.3 }}>
                                Recent Activity
                            </Text>
                            <TouchableOpacity
                                className="flex-row items-center"
                                activeOpacity={0.6}
                                onPress={() => router.push('/(admin)/permits')}
                                style={{ gap: 2 }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY }}>
                                    View All
                                </Text>
                                <LucideChevronRight size={15} color={PRIMARY} />
                            </TouchableOpacity>
                        </View>

                        <View style={{
                            backgroundColor: 'white',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 6,
                            elevation: 1,
                        }}>
                            {recentActivity.length === 0 ? (
                                <View style={{ paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' }}>
                                    <View style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 28,
                                        backgroundColor: '#f1f5f9',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 12,
                                    }}>
                                        <LucideInbox size={26} color="#94a3b8" />
                                    </View>
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 4 }}>
                                        No recent activity
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 }}>
                                        New permit submissions and status changes will appear here
                                    </Text>
                                </View>
                            ) : (
                                recentActivity.map((activity, index) => (
                                    <TouchableOpacity
                                        key={activity.id}
                                        activeOpacity={0.6}
                                        onPress={() => router.push(`/(admin)/permits/${activity.id}` as any)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 13,
                                            paddingHorizontal: 16,
                                            borderBottomWidth: index !== recentActivity.length - 1 ? 1 : 0,
                                            borderBottomColor: '#f1f5f9',
                                        }}
                                    >
                                        {/* Status dot */}
                                        <View style={{
                                            width: 9,
                                            height: 9,
                                            borderRadius: 5,
                                            backgroundColor: STATUS_DOT_COLORS[activity.status] || '#94a3b8',
                                            marginRight: 12,
                                        }} />

                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <View className="flex-row items-center" style={{ gap: 8, marginBottom: 3 }}>
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                                                    {activity.permitNumber}
                                                </Text>
                                                <StatusBadge status={activity.status} label={activity.status} />
                                            </View>
                                            <Text style={{ fontSize: 12, color: '#94a3b8' }} numberOfLines={1}>
                                                {activity.projectName} • {activity.userName}
                                            </Text>
                                        </View>

                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500' }}>
                                                {new Date(activity.updatedAt).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: '#cbd5e1', fontWeight: '500', marginTop: 1 }}>
                                                {new Date(activity.updatedAt).toLocaleString('en-US', {
                                                    hour: 'numeric',
                                                    minute: 'numeric',
                                                    hour12: true,
                                                })}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

