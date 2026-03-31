import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LucideArrowLeft } from 'lucide-react-native';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { StepIndicator } from '../../components/ui/step-indicator';
import { usePlants, useProjects } from '../../hooks/use-reference-data';
import { useCreatePermit } from '../../hooks/use-permits';
import { useAuth } from '../../lib/auth-store';

// Simplified schema for mobile (reusing web schemas would be ideal with Metro config)
const wasteInfoSchema = z.object({
    wasteType: z.enum(['CND_SEGREGATED', 'CND_UNSEGREGATED']),
    estimatedWeight: z.number().positive().optional(),
    estimatedVolume: z.number().positive().optional(),
    wasteDescription: z.string().optional(),
});

const locationSchema = z.object({
    projectId: z.string().optional(),
    plantId: z.string().min(1, 'Plant selection is required'),
    pickupAddress: z.string().min(5, 'Pickup address is required'),
    pickupCity: z.string().min(2, 'City is required'),
    pickupState: z.string().min(2, 'State is required'),
    pickupPincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

const vehicleSchema = z.object({
    driverName: z.string().min(2, 'Driver name is required'),
    driverPhone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Valid phone number required'),
    vehicleNumber: z.string().min(4, 'Vehicle number is required'),
    vehicleType: z.string().optional(),
    licenseNumber: z.string().optional(),
});

type WasteInfoData = z.infer<typeof wasteInfoSchema>;
type LocationData = z.infer<typeof locationSchema>;
type VehicleData = z.infer<typeof vehicleSchema>;

const STEPS = [
    { number: 1, title: 'Waste' },
    { number: 2, title: 'Location' },
    { number: 3, title: 'Vehicle' },
];

export default function NewPermitScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<Partial<WasteInfoData & LocationData & VehicleData>>({});

    const { data: plantsData, isLoading: plantsLoading } = usePlants();
    const { data: projectsData, isLoading: projectsLoading } = useProjects();
    const createPermit = useCreatePermit();

    const plants = plantsData?.data || [];
    const projects = projectsData?.data || [];

    // Step 1: Waste Information
    const wasteForm = useForm<WasteInfoData>({
        resolver: zodResolver(wasteInfoSchema),
        defaultValues: formData,
    });

    // Step 2: Location
    const locationForm = useForm<LocationData>({
        resolver: zodResolver(locationSchema),
        defaultValues: formData,
    });

    // Step 3: Vehicle & Driver
    const vehicleForm = useForm<VehicleData>({
        resolver: zodResolver(vehicleSchema),
        defaultValues: formData,
    });

    const handleWasteNext = wasteForm.handleSubmit((data) => {
        setFormData(prev => ({ ...prev, ...data }));
        setCurrentStep(2);
    });

    const handleLocationNext = locationForm.handleSubmit((data) => {
        setFormData(prev => ({ ...prev, ...data }));
        setCurrentStep(3);
    });

    const handleFinalSubmit = vehicleForm.handleSubmit(async (data) => {
        const finalData = { ...formData, ...data };

        try {
            const response = await createPermit.mutateAsync(finalData as any);

            if (response.success) {
                Alert.alert(
                    'Success',
                    'Permit created successfully!',
                    [
                        {
                            text: 'View Permit',
                            onPress: () => router.replace(`/permits/${response.data.id}` as any),
                        },
                    ]
                );
            }
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'Failed to create permit';
            Alert.alert('Error', message);
        }
    });

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 pt-4 pb-3 bg-primary flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <LucideArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">Create New Permit</Text>
            </View>

            {/* Step Indicator */}
            <StepIndicator steps={STEPS} currentStep={currentStep} />

            <ScrollView className="flex-1 px-6 pt-6">
                {/* Step 1: Waste Information */}
                {currentStep === 1 && (
                    <View>
                        <Text className="text-lg font-semibold text-foreground mb-4">Waste Information</Text>

                        <Controller
                            control={wasteForm.control}
                            name="wasteType"
                            render={({ field: { onChange, value } }) => (
                                <Select
                                    label="Waste Type *"
                                    options={[
                                        { id: 'CND_SEGREGATED', label: 'C&D Segregated', subtitle: 'Segregated construction waste' },
                                        { id: 'CND_UNSEGREGATED', label: 'C&D Unsegregated', subtitle: 'Mixed construction waste' },
                                    ]}
                                    value={value}
                                    onSelect={onChange}
                                    error={wasteForm.formState.errors.wasteType?.message}
                                />
                            )}
                        />

                        <Controller
                            control={wasteForm.control}
                            name="estimatedWeight"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Estimated Weight (kg)"
                                    placeholder="e.g., 1000"
                                    keyboardType="numeric"
                                    onBlur={onBlur}
                                    onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                                    value={value?.toString() || ''}
                                    error={wasteForm.formState.errors.estimatedWeight?.message}
                                />
                            )}
                        />

                        <Controller
                            control={wasteForm.control}
                            name="wasteDescription"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Description"
                                    placeholder="Brief description of waste"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={wasteForm.formState.errors.wasteDescription?.message}
                                />
                            )}
                        />

                        <Button
                            label="Next"
                            onPress={handleWasteNext}
                            className="mt-4"
                        />
                    </View>
                )}

                {/* Step 2: Location */}
                {currentStep === 2 && (
                    <View>
                        <Text className="text-lg font-semibold text-foreground mb-4">Location Details</Text>

                        {user?.role === 'COMPANY_USER' && projects.length > 0 && (
                            <Controller
                                control={locationForm.control}
                                name="projectId"
                                render={({ field: { onChange, value } }) => (
                                    <Select
                                        label="Project (Optional)"
                                        options={projects.map(p => ({
                                            id: p.id,
                                            label: p.name,
                                            subtitle: `${p.city}, ${p.state}`,
                                        }))}
                                        value={value}
                                        onSelect={onChange}
                                        placeholder="Select a project or enter address manually"
                                    />
                                )}
                            />
                        )}

                        <Controller
                            control={locationForm.control}
                            name="pickupAddress"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Pickup Address *"
                                    placeholder="Enter full pickup address"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={locationForm.formState.errors.pickupAddress?.message}
                                />
                            )}
                        />

                        <Controller
                            control={locationForm.control}
                            name="pickupCity"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="City *"
                                    placeholder="City"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={locationForm.formState.errors.pickupCity?.message}
                                />
                            )}
                        />

                        <Controller
                            control={locationForm.control}
                            name="pickupState"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="State *"
                                    placeholder="State"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={locationForm.formState.errors.pickupState?.message}
                                />
                            )}
                        />

                        <Controller
                            control={locationForm.control}
                            name="pickupPincode"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Pincode *"
                                    placeholder="6-digit pincode"
                                    keyboardType="numeric"
                                    maxLength={6}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={locationForm.formState.errors.pickupPincode?.message}
                                />
                            )}
                        />

                        {plantsLoading ? (
                            <ActivityIndicator className="my-4" />
                        ) : (
                            <Controller
                                control={locationForm.control}
                                name="plantId"
                                render={({ field: { onChange, value } }) => (
                                    <Select
                                        label="Destination Plant *"
                                        options={plants.map(p => ({
                                            id: p.id,
                                            label: p.name,
                                            subtitle: `${p.city}, ${p.state}`,
                                        }))}
                                        value={value}
                                        onSelect={onChange}
                                        error={locationForm.formState.errors.plantId?.message}
                                    />
                                )}
                            />
                        )}

                        <View className="flex-row gap-3 mt-4">
                            <Button
                                label="Back"
                                variant="outline"
                                onPress={() => setCurrentStep(1)}
                                className="flex-1"
                            />
                            <Button
                                label="Next"
                                onPress={handleLocationNext}
                                className="flex-1"
                            />
                        </View>
                    </View>
                )}

                {/* Step 3: Vehicle & Driver */}
                {currentStep === 3 && (
                    <View>
                        <Text className="text-lg font-semibold text-foreground mb-4">Vehicle & Driver Details</Text>

                        <Controller
                            control={vehicleForm.control}
                            name="driverName"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Driver Name *"
                                    placeholder="Full name of driver"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={vehicleForm.formState.errors.driverName?.message}
                                />
                            )}
                        />

                        <Controller
                            control={vehicleForm.control}
                            name="driverPhone"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Driver Phone *"
                                    placeholder="+91XXXXXXXXXX"
                                    keyboardType="phone-pad"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={vehicleForm.formState.errors.driverPhone?.message}
                                />
                            )}
                        />

                        <Controller
                            control={vehicleForm.control}
                            name="vehicleNumber"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Vehicle Number *"
                                    placeholder="e.g., MH01AB1234"
                                    autoCapitalize="characters"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={vehicleForm.formState.errors.vehicleNumber?.message}
                                />
                            )}
                        />

                        <Controller
                            control={vehicleForm.control}
                            name="vehicleType"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Vehicle Type"
                                    placeholder="e.g., Truck, Dumper"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                />
                            )}
                        />

                        <Controller
                            control={vehicleForm.control}
                            name="licenseNumber"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="License Number"
                                    placeholder="Driver's license number"
                                    autoCapitalize="characters"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                />
                            )}
                        />

                        <View className="flex-row gap-3 mt-4 mb-6">
                            <Button
                                label="Back"
                                variant="outline"
                                onPress={() => setCurrentStep(2)}
                                className="flex-1"
                            />
                            <Button
                                label="Create Permit"
                                onPress={handleFinalSubmit}
                                loading={createPermit.isPending}
                                className="flex-1"
                            />
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
