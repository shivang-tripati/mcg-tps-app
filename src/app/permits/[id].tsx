import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    LucideArrowLeft,
    LucideMapPin,
    LucideTruck,
    LucideUser,
    LucideCalendar,
    LucidePackage,
    LucideImages,
    LucideFileText,
} from 'lucide-react-native';
import { usePermit } from '../../hooks/use-permits';
import { resolveEvidenceFileUrl } from '../../lib/utils';

const STATUS_COLORS = {
    DRAFT: 'hsl(220 9% 46%)',
    SUBMITTED: 'hsl(38 92% 38%)',
    UNDER_REVIEW: 'hsl(38 92% 38%)',
    APPROVED: 'hsl(142 72% 29%)',
    IN_TRANSIT: 'hsl(325 45% 32%)',
    COMPLETED: 'hsl(142 72% 29%)',
    EXPIRED: 'hsl(0 72% 38%)',
    REJECTED: 'hsl(0 72% 38%)',
    CANCELLED: 'hsl(220 9% 46%)',
};

export default function PermitDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data, isLoading, error } = usePermit(id);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </SafeAreaView>
        );
    }

    if (error || !data?.data) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
                <Text className="text-error text-lg font-semibold">Failed to load permit</Text>
                <TouchableOpacity
                    className="mt-4 bg-primary px-6 py-3 rounded-lg"
                    onPress={() => router.back()}
                >
                    <Text className="text-white font-semibold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const permit = data.data;

    const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
        <View className="flex-row items-start py-3 border-b border-border">
            <Icon size={20} color="hsl(220 9% 46%)" />
            <View className="ml-3 flex-1">
                <Text className="text-xs text-muted-foreground mb-1">{label}</Text>
                <Text className="text-sm text-foreground">{value || 'N/A'}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-background space-y-4">
            {/* Header */}
            <View className="px-6 pt-4 pb-3 bg-primary flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <LucideArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-white text-xl font-bold">{permit.permitNumber}</Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-4">
                {/* Status Badge */}
                <View className="mb-4">
                    <View
                        className="px-4 py-2 rounded-lg self-start"
                        style={{ backgroundColor: `${STATUS_COLORS[permit.status as keyof typeof STATUS_COLORS]}15` }}
                    >
                        <Text
                            className="text-sm font-semibold"
                            style={{ color: STATUS_COLORS[permit.status as keyof typeof STATUS_COLORS] }}
                        >
                            {permit.status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                {/* Waste Information */}
                <View className="bg-card border border-border rounded-lg p-4 mb-4">
                    <Text className="text-base font-semibold text-foreground mb-3">Waste Information</Text>
                    <InfoRow
                        icon={LucidePackage}
                        label="Waste Type"
                        value={permit.wasteType === 'CND_SEGREGATED' ? 'C&D Segregated' : 'C&D Unsegregated'}
                    />
                    {permit.estimatedWeight && (
                        <InfoRow
                            icon={LucidePackage}
                            label="Estimated Weight"
                            value={`${permit.estimatedWeight} kg`}
                        />
                    )}
                </View>

                {/* Waste evidence */}
                <View className="bg-card border border-border rounded-lg p-4 mb-4">
                    <View className="flex-row items-center gap-2 mb-3">
                        <LucideImages size={20} color="hsl(220 9% 46%)" />
                        <Text className="text-base font-semibold text-foreground">Waste evidence</Text>
                    </View>
                    {permit.wasteEvidences && permit.wasteEvidences.length > 0 ? (
                        <View className="flex-row flex-wrap gap-3">
                            {permit.wasteEvidences.map((evidence) => {
                                const isPdf =
                                    evidence.mimeType?.toLowerCase().includes('pdf') ?? false;
                                return (
                                    <View
                                        key={evidence.id}
                                        className="w-[47%] rounded-lg overflow-hidden border border-border bg-muted"
                                    >
                                        {isPdf ? (
                                            <View className="aspect-square items-center justify-center bg-background p-3">
                                                <LucideFileText size={32} color="hsl(220 9% 46%)" />
                                                <Text
                                                    className="text-xs text-foreground text-center mt-2"
                                                    numberOfLines={3}
                                                >
                                                    {evidence.fileName}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Image
                                                source={{ uri: resolveEvidenceFileUrl(evidence.filePath) }}
                                                className="w-full aspect-square bg-gray-100"
                                                resizeMode="cover"
                                            />
                                        )}
                                        {evidence.description ? (
                                            <Text className="text-xs text-muted-foreground p-2" numberOfLines={2}>
                                                {evidence.description}
                                            </Text>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <Text className="text-sm text-muted-foreground">No waste evidence photos uploaded.</Text>
                    )}
                </View>

                {/* Location Information */}
                <View className="bg-card border border-border rounded-lg p-4 mb-4">
                    <Text className="text-base font-semibold text-foreground mb-3">Locations</Text>
                    <InfoRow
                        icon={LucideMapPin}
                        label="Pickup Location"
                        value={permit.project?.name || 'Individual Pickup'}
                    />
                    <InfoRow
                        icon={LucideMapPin}
                        label="Destination Plant"
                        value={`${permit.plant?.name} (${permit.plant?.city})`}
                    />
                </View>

                {/* Vehicle & Driver */}
                {(permit.vehicleNumber || permit.driverName) && (
                    <View className="bg-card border border-border rounded-lg p-4 mb-4">
                        <Text className="text-base font-semibold text-foreground mb-3">Vehicle & Driver</Text>
                        {permit.vehicleNumber && (
                            <InfoRow icon={LucideTruck} label="Vehicle Number" value={permit.vehicleNumber} />
                        )}
                        {permit.driverName && (
                            <InfoRow icon={LucideUser} label="Driver Name" value={permit.driverName} />
                        )}
                    </View>
                )}

                {/* Validity */}
                {(permit.validFrom || permit.validUntil) && (
                    <View className="bg-card border border-border rounded-lg p-4 mb-4">
                        <Text className="text-base font-semibold text-foreground mb-3">Validity Period</Text>
                        {permit.validFrom && (
                            <InfoRow
                                icon={LucideCalendar}
                                label="Valid From"
                                value={new Date(permit.validFrom).toLocaleString()}
                            />
                        )}
                        {permit.validUntil && (
                            <InfoRow
                                icon={LucideCalendar}
                                label="Valid Until"
                                value={new Date(permit.validUntil).toLocaleString()}
                            />
                        )}
                    </View>
                )}

                {/* Actions */}
                <View className="mb-6">
                    <TouchableOpacity
                        className="bg-primary p-4 rounded-lg items-center mb-3"
                        onPress={() => Alert.alert('QR Code', 'QR Code display coming soon')}
                    >
                        <Text className="text-white font-semibold">View QR Code</Text>
                    </TouchableOpacity>

                    {permit.status === 'DRAFT' && (
                        <TouchableOpacity
                            className="bg-card border-2 border-primary p-4 rounded-lg items-center"
                            onPress={() => Alert.alert('Submit', 'Submit functionality coming soon')}
                        >
                            <Text className="text-primary font-semibold">Submit Permit</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
