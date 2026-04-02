import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    LucideFilter,
    LucidePlus,
    LucideChevronRight,
    LucidePackage,
    LucideMapPin,
    LucideTruck,
    LucideCalendar,
    LucideFileStack,
    LucideRefreshCw,
    LucideInbox,
} from 'lucide-react-native';
import { usePermits } from '../../hooks/use-permits';
import { useAuth } from '../../lib/auth-store';
import { StatusBadge } from '../../components/ui/status-badge';

const PRIMARY = 'hsl(325 45% 32%)';
const MUTED = 'hsl(220 9% 46%)';

interface PermitListItem {
    id: string;
    permitNumber: string;
    status: string;
    wasteType: string;
    createdAt: string;
    vehicleNumber?: string | null;
    plant?: { name: string; city: string };
}

export default function PermitsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { data, isPending, isError, isFetching, refetch } = usePermits({ limit: 20 });

    const permits = (data?.data ?? []) as PermitListItem[];

    const openPermit = (permitId: string) => {
        if (user?.role === 'ADMIN') {
            router.push(`/(admin)/permits/${permitId}` as const);
        } else {
            router.push(`/permits/${permitId}` as const);
        }
    };

    const renderPermitCard = ({ item }: { item: PermitListItem }) => (
        <TouchableOpacity
            className="bg-card border border-border rounded-2xl p-4 mb-3 active:opacity-95"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
            }}
            onPress={() => openPermit(item.id)}
            activeOpacity={0.75}
        >
            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 min-w-0">
                    <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                        {item.permitNumber}
                    </Text>
                    <View className="flex-row flex-wrap items-center gap-2 mt-2">
                        <View className="flex-row items-center gap-1 max-w-full">
                            <LucidePackage size={14} color={MUTED} />
                            <Text className="text-sm text-muted-foreground shrink" numberOfLines={1}>
                                {item.wasteType === 'CND_SEGREGATED' ? 'C&D Segregated' : 'C&D Unsegregated'}
                            </Text>
                        </View>
                        <StatusBadge status={item.status} />
                    </View>
                </View>
                <LucideChevronRight size={22} color={MUTED} />
            </View>

            {item.plant ? (
                <View className="flex-row items-start gap-2 mt-3">
                    <LucideMapPin size={16} color={PRIMARY} style={{ marginTop: 2 }} />
                    <Text className="text-sm text-foreground flex-1 leading-5">
                        <Text className="text-muted-foreground">Destination · </Text>
                        {item.plant.name}
                        <Text className="text-muted-foreground"> ({item.plant.city})</Text>
                    </Text>
                </View>
            ) : null}

            {item.vehicleNumber ? (
                <View className="flex-row items-center gap-2 mt-2">
                    <LucideTruck size={16} color={MUTED} />
                    <Text className="text-sm text-muted-foreground">
                        Vehicle · <Text className="text-foreground font-medium">{item.vehicleNumber}</Text>
                    </Text>
                </View>
            ) : null}

            <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-border/80">
                <LucideCalendar size={14} color={MUTED} />
                <Text className="text-xs text-muted-foreground font-medium">
                    Created{' '}
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    })}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (isPending) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text className="text-muted-foreground text-sm mt-4">Loading permits…</Text>
            </SafeAreaView>
        );
    }

    if (isError) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center px-8">
                <LucideInbox size={48} color={MUTED} />
                <Text className="text-foreground text-lg font-semibold text-center mt-4">
                    Couldn&apos;t load permits
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

    const refreshing = isFetching && !isPending;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="px-6 pt-2 pb-5 bg-primary rounded-b-[24px]">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                            Your permits
                        </Text>
                        <Text className="text-white text-2xl font-bold mt-1">Permits</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                            className="p-2.5 rounded-xl bg-white/15 active:bg-white/25"
                            onPress={() => Alert.alert('Filters', 'Filters will be available in a future update.')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <LucideFilter size={22} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="p-2.5 rounded-xl bg-white/15 active:bg-white/25"
                            onPress={() => router.push('/permits/new' as const)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <LucidePlus size={22} color="white" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View className="flex-1 px-5 pt-4">
                <FlatList
                    data={permits}
                    renderItem={renderPermitCard}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => refetch()}
                            tintColor={PRIMARY}
                            colors={[PRIMARY]}
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-16 px-4">
                            <View className="w-16 h-16 rounded-full bg-muted/80 items-center justify-center mb-4">
                                <LucideFileStack size={32} color={MUTED} />
                            </View>
                            <Text className="text-foreground font-semibold text-lg text-center">
                                No permits yet
                            </Text>
                            <Text className="text-muted-foreground text-sm text-center mt-2 leading-5">
                                Create a permit to track waste pickup and approvals.
                            </Text>
                            <TouchableOpacity
                                className="mt-6 bg-primary px-8 py-3.5 rounded-2xl shadow-sm"
                                style={{
                                    shadowColor: PRIMARY,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                                onPress={() => router.push('/permits/new' as const)}
                                activeOpacity={0.88}
                            >
                                <Text className="text-white font-bold">Create permit</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    contentContainerStyle={{
                        paddingBottom: 28,
                        flexGrow: 1,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
}
