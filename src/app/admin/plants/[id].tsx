import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
    LucideFactory,
    LucideMapPin,
    LucideMail,
    LucidePhone,
    LucideClock,
    LucideFileText,
    LucideScale
} from 'lucide-react-native';
import { usePlant } from '../../../hooks/use-admin';

export default function PlantDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: response, isLoading } = usePlant(id);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </SafeAreaView>
        );
    }

    const plant = response?.data;

    if (!plant) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <Text className="text-muted-foreground">Plant not found</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            <ScrollView className="flex-1">
                {/* Header Card */}
                <View className="bg-card m-4 rounded-xl border border-border p-4">
                    <View className="flex-row items-center mb-4">
                        <View className="p-3 rounded-xl bg-teal-100 mr-3">
                            <LucideFactory size={28} color="hsl(173 80% 36%)" />
                        </View>
                        <View className="flex-1">
                            <View className="flex-row items-center">
                                <Text className="text-xl font-bold text-foreground">{plant.name}</Text>
                                <View className="ml-2 px-2 py-0.5 bg-muted rounded">
                                    <Text className="text-xs font-mono text-muted-foreground">{plant.code}</Text>
                                </View>
                            </View>
                            <View className={`mt-1 px-2 py-0.5 rounded-full self-start ${plant.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                                <Text className={`text-xs ${plant.isActive ? 'text-green-700' : 'text-red-700'}`}>
                                    {plant.isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Details */}
                    <View className="gap-3">
                        <View className="flex-row items-start">
                            <LucideMapPin size={16} color="hsl(240 3.8% 46.1%)" className="mt-0.5" />
                            <Text className="text-muted-foreground flex-1 text-sm ml-2">
                                {plant.address}, {plant.city}, {plant.state} - {plant.pincode}
                            </Text>
                        </View>
                        {plant.contactEmail && (
                            <View className="flex-row items-center">
                                <LucideMail size={16} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-muted-foreground text-sm ml-2">{plant.contactEmail}</Text>
                            </View>
                        )}
                        {plant.contactPhone && (
                            <View className="flex-row items-center">
                                <LucidePhone size={16} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-muted-foreground text-sm ml-2">{plant.contactPhone}</Text>
                            </View>
                        )}
                        {plant.operatingHours && (
                            <View className="flex-row items-center">
                                <LucideClock size={16} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-muted-foreground text-sm ml-2">{plant.operatingHours}</Text>
                            </View>
                        )}
                    </View>

                    {/* Stats */}
                    <View className="flex-row gap-3 mt-4 pt-4 border-t border-border">
                        {plant.capacity && (
                            <View className="flex-1 items-center bg-muted rounded-lg py-3">
                                <LucideScale size={20} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-lg font-bold text-foreground mt-1">{plant.capacity}</Text>
                                <Text className="text-xs text-muted-foreground">tons/day</Text>
                            </View>
                        )}
                        <View className="flex-1 items-center bg-muted rounded-lg py-3">
                            <LucideFileText size={20} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-lg font-bold text-foreground mt-1">{plant._count?.permits || 0}</Text>
                            <Text className="text-xs text-muted-foreground">Permits</Text>
                        </View>
                        <View className="flex-1 items-center bg-muted rounded-lg py-3">
                            <LucideScale size={20} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-lg font-bold text-foreground mt-1">{plant._count?.weighments || 0}</Text>
                            <Text className="text-xs text-muted-foreground">Weighments</Text>
                        </View>
                    </View>
                </View>

                {/* Location Map Placeholder */}
                {plant.latitude && plant.longitude && (
                    <View className="mx-4 mb-4">
                        <Text className="text-lg font-semibold text-foreground mb-3">Location</Text>
                        <View className="bg-card rounded-xl p-6 border border-border items-center">
                            <LucideMapPin size={32} color="hsl(240 3.8% 46.1%)" opacity={0.5} />
                            <Text className="text-muted-foreground mt-2 text-sm">
                                {plant.latitude.toFixed(6)}, {plant.longitude.toFixed(6)}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
