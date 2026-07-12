import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    LucidePlus,
    LucideChevronRight,
    LucidePackage,
    LucideMapPin,
    LucideTruck,
    LucideCalendar,
    LucideFileStack,
    LucideRefreshCw,
    LucideInbox,
    LucideAlertCircle,
    LucideWifiOff,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { usePermits } from '../../../hooks/use-permits';
import { useAuth } from '../../../lib/auth-store';
import { StatusBadge } from '../../../components/ui/status-badge';
import { AxiosError } from 'axios';

// ✅ Type guards
function isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError)?.isAxiosError === true;
}

function isNetworkError(error: unknown): boolean {
    if (isAxiosError(error)) {
        return error.message === 'Network Error' || 
               error.code === 'ECONNABORTED' ||
               !error.response;
    }
    return false;
}

function getErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        if (isNetworkError(error)) {
            return 'Unable to connect to the server. Please check your network.';
        }
        
        const responseData = error.response?.data as any;
        if (responseData) {
            if (responseData.error?.message) {
                return responseData.error.message;
            }
            if (responseData.message) {
                return responseData.message;
            }
            if (responseData.data?.message) {
                return responseData.data.message;
            }
        }
        
        switch (error.response?.status) {
            case 400: return 'Invalid request. Please check your input.';
            case 401: return 'Your session has expired. Please log in again.';
            case 403: return 'You do not have permission to perform this action.';
            case 404: return 'Resource not found.';
            case 429: return 'Too many requests. Please try again later.';
            case 500: return 'Server error. Please try again later.';
            default: return error.message || 'An unexpected error occurred.';
        }
    }
    
    if (error instanceof Error) {
        return error.message;
    }
    
    return 'An unexpected error occurred.';
}

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
    const [retryCount, setRetryCount] = useState(0);
    const [errorType, setErrorType] = useState<'network' | 'server' | 'auth' | 'unknown' | null>(null);
    
    // ✅ LOG: Component mount
    console.log('🔵 [PermitsScreen] Component mounted');
    console.log('🔵 [PermitsScreen] User:', {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        companyId: user?.companyId,
    });

    const { 
        data, 
        isPending, 
        isError, 
        isFetching, 
        refetch,
        error,
        failureCount,
        status,
    } = usePermits({ limit: 20 });

    // ✅ LOG: Query status changes
    useEffect(() => {
        console.log('📊 [PermitsScreen] Query Status:', {
            isPending,
            isError,
            isFetching,
            failureCount,
            status,
            hasData: !!data,
            dataCount: data?.data?.length ?? 0,
        });
    }, [isPending, isError, isFetching, failureCount, status, data]);

    // ✅ LOG: Data changes
    useEffect(() => {
        if (data) {
            console.log('✅ [PermitsScreen] Data received:', {
                count: data.data?.length ?? 0,
                firstItem: data.data?.[0]?.permitNumber,
                success: data.success
            });
        }
    }, [data]);

    // ✅ LOG: Error changes with full details
    useEffect(() => {
        if (error) {
            console.log('❌ [PermitsScreen] Error object:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                // If it's an Axios error, log more details
                ...(isAxiosError(error) && {
                    code: error.code,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    headers: error.response?.headers,
                    config: {
                        url: error.config?.url,
                        method: error.config?.method,
                        baseURL: error.config?.baseURL,
                        timeout: error.config?.timeout,
                    },
                }),
            });
        }
    }, [error]);

    // ✅ Show toast on error - FIXED with proper type checking
    useEffect(() => {
        if (isError && error) {
            const isNetworkErr = isNetworkError(error);
            const errorMessage = getErrorMessage(error);
            
            console.log('🔴 [PermitsScreen] Error State:', {
                isNetworkErr,
                errorMessage,
                errorType: isAxiosError(error) ? 'AxiosError' : typeof error,
            });
            
            let type: 'network' | 'auth' | 'server' | 'unknown' = 'unknown';
            
            if (isNetworkErr) {
                type = 'network';
            } else if (isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 401) {
                    type = 'auth';
                } else if (status === 500) {
                    type = 'server';
                }
                console.log('🔴 [PermitsScreen] HTTP Status:', status);
            }
            
            setErrorType(type);

            Toast.show({
                type: 'error',
                text1: 'Failed to load permits',
                text2: isNetworkErr ? 'Please check your internet connection' : errorMessage,
                position: 'top',
                visibilityTime: 4000,
                autoHide: true,
                topOffset: 60,
            });
        }
    }, [isError, error]);

    // ✅ Show success toast on refresh
    const handleRefresh = async () => {
        console.log('🔄 [PermitsScreen] Manual refresh triggered');
        console.log('🔄 [PermitsScreen] Retry count:', retryCount + 1);
        
        try {
            setRetryCount(prev => prev + 1);
            const result = await refetch();
            
            console.log('🔄 [PermitsScreen] Refresh result:', {
                isSuccess: !result.isError,
                isError: result.isError,
                dataCount: result.data?.data?.length ?? 0,
            });
            
            if (!result.isError) {
                Toast.show({
                    type: 'success',
                    text1: 'Permits refreshed',
                    text2: 'Latest permits loaded successfully',
                    position: 'top',
                    visibilityTime: 2000,
                    autoHide: true,
                    topOffset: 60,
                });
            }
        } catch (refreshError) {
            console.error('❌ [PermitsScreen] Refresh failed:', refreshError);
        }
    };

    const openPermit = (permitId: string) => {
        console.log('🔍 [PermitsScreen] Opening permit:', {
            permitId,
            userRole: user?.role,
            isAdmin: user?.role === 'ADMIN',
        });
        
        if (user?.role === 'ADMIN') {
            const route = `/(admin)/permits/${permitId}`;
            console.log('📱 [PermitsScreen] Navigating to admin route:', route);
            router.push(route);
        } else {
            const route = `/permits/${permitId}`;
            console.log('📱 [PermitsScreen] Navigating to user route:', route);
            router.push(route);
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

    // ✅ Enhanced loading state
    if (isPending) {
        console.log('⏳ [PermitsScreen] Loading state');
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text className="text-muted-foreground text-sm mt-4">Loading permits…</Text>
                {failureCount > 1 && (
                    <Text className="text-xs text-muted-foreground mt-2">
                        Attempt {failureCount}…
                    </Text>
                )}
            </SafeAreaView>
        );
    }

    // ✅ Enhanced error state with specific error types
    if (isError) {
        const isNetworkErr = errorType === 'network';
        const isAuthErr = errorType === 'auth';
        const isServerErr = errorType === 'server';
        
        const ErrorIcon = isNetworkErr ? LucideWifiOff : isAuthErr ? LucideAlertCircle : LucideInbox;
        const errorMessage = isNetworkErr 
            ? 'Please check your internet connection and try again.'
            : isAuthErr 
            ? 'Your session may have expired. Please log in again.'
            : isServerErr
            ? 'The server is experiencing issues. Please try again later.'
            : 'Something went wrong. Please try again.';

        console.log('❌ [PermitsScreen] Rendering error state:', {
            isNetworkErr,
            isAuthErr,
            isServerErr,
            errorType,
            errorMessage,
        });

        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center px-8">
                <ErrorIcon size={48} color={isNetworkErr ? '#f59e0b' : MUTED} />
                <Text className="text-foreground text-lg font-semibold text-center mt-4">
                    {isNetworkErr ? 'Connection Error' : 
                     isAuthErr ? 'Authentication Error' :
                     isServerErr ? 'Server Error' :
                     'Couldn\'t load permits'}
                </Text>
                <Text className="text-muted-foreground text-sm text-center mt-2 leading-5">
                    {errorMessage}
                </Text>
                {isNetworkErr && (
                    <Text className="text-xs text-muted-foreground text-center mt-2">
                        Make sure you're connected to the same network as the server
                    </Text>
                )}
                <TouchableOpacity
                    className="mt-6 flex-row items-center gap-2 bg-primary px-6 py-3 rounded-xl"
                    onPress={handleRefresh}
                    activeOpacity={0.85}
                >
                    <LucideRefreshCw size={18} color="white" />
                    <Text className="text-white font-semibold">
                        {isNetworkErr ? 'Retry Connection' : 'Try Again'}
                    </Text>
                </TouchableOpacity>
                {isAuthErr && (
                    <TouchableOpacity
                        className="mt-3 flex-row items-center gap-2 bg-gray-200 dark:bg-gray-700 px-6 py-3 rounded-xl"
                        onPress={() => router.push('/(auth)/login')}
                        activeOpacity={0.85}
                    >
                        <Text className="text-gray-700 dark:text-gray-300 font-semibold">
                            Go to Login
                        </Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>
        );
    }

    const refreshing = isFetching && !isPending;
    const permits = (data?.data ?? []) as PermitListItem[];

    console.log('✅ [PermitsScreen] Rendering permits list:', {
        count: permits.length,
        refreshing,
        isFetching,
    });

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="px-6 pt-2 pb-5 bg-primary rounded-b-[24px]">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-white text-2xl font-bold mt-1">Permits</Text>
                        <Text className="text-white/70 text-xs mt-0.5">
                            {permits.length} {permits.length === 1 ? 'permit' : 'permits'}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                            className="p-2.5 rounded-xl bg-white/15 active:bg-white/25"
                            onPress={handleRefresh}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            disabled={isFetching}
                        >
                            <LucideRefreshCw 
                                size={20} 
                                color="white" 
                                style={{ opacity: isFetching ? 0.5 : 1 }}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="p-2.5 rounded-xl bg-white/15 active:bg-white/25"
                            onPress={() => {
                                console.log('➕ [PermitsScreen] Navigating to create permit');
                                router.push('/permits/new' as const);
                            }}
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
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    keyExtractor={(item) => {
                        console.log('🔑 [PermitsScreen] Key extracted:', item.id);
                        return item.id;
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
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
                                onPress={() => {
                                    console.log('➕ [PermitsScreen] Navigating to create permit from empty state');
                                    router.push('/permits/new' as const);
                                }}
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