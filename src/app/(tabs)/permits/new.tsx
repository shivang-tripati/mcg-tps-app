import {
    View,
    Text,
    Keyboard,
    TouchableWithoutFeedback,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    LucideArrowLeft,
    LucideImagePlus,
    LucideX,
    LucideMapPin,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { StepIndicator } from '../../../components/ui/step-indicator';
import { usePlants, useProjects } from '../../../hooks/use-reference-data';
import { useCreatePermit, useUploadPermitWasteEvidence } from '../../../hooks/use-permits';
import { useAuth } from '../../../lib/auth-store';
import {
    createPermitSchema,
    WasteType,
    type CreatePermitInput,
} from '../../../schemas/index';
import DateTimeFormField from '../../../components/ui/date-time-from-field';
import { parseDateTimeField } from '../../../lib/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const WASTE_LABELS: Record<(typeof WasteType)[number], { label: string; subtitle: string }> = {
    CND_SEGREGATED: { label: 'C&D Segregated', subtitle: 'Sorted by material type' },
    CND_UNSEGREGATED: { label: 'C&D Unsegregated', subtitle: 'Mixed construction waste' },
};

const STEPS = [
    { number: 1, title: 'Waste Info' },
    { number: 2, title: 'Location' },
    { number: 3, title: 'Vehicle' },
    { number: 4, title: 'Schedule' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NewPermitScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [evidenceUris, setEvidenceUris] = useState<string[]>([]);
    const [locating, setLocating] = useState(false);
    const [submitMode, setSubmitMode] = useState<'draft' | 'submit'>('submit');

    const isCompanyUser = user?.role === 'COMPANY_USER';

    const { data: plantsData, isLoading: plantsLoading } = usePlants();
    const { data: projectsData, isLoading: projectsLoading } = useProjects();
    const createPermit = useCreatePermit();
    const uploadEvidence = useUploadPermitWasteEvidence();

    const plants = plantsData?.data || [];
    const projects = projectsData?.data || [];

    const form = useForm<CreatePermitInput>({
        resolver: zodResolver(createPermitSchema),
        mode: 'onChange', // ✅ Validate on change
        defaultValues: {
            wasteType: 'CND_SEGREGATED',
            estimatedWeight: undefined,
            estimatedVolume: undefined,
            wasteDescription: '',
            projectId: undefined,
            plantId: '',
            pickupAddress: '',
            pickupCity: '',
            pickupState: '',
            pickupPincode: '',
            pickupLatitude: undefined,
            pickupLongitude: undefined,
            driverName: '',
            driverPhone: '',
            vehicleNumber: '',
            vehicleType: '',
            licenseNumber: '',
            validFrom: '',
            validUntil: '',
        },
    });

    const { control, handleSubmit, setValue, trigger, getValues, formState: { errors, isSubmitting, isValid } } = form;

    const projectId = useWatch({ control, name: 'projectId' });
    const validFrom = useWatch({ control, name: 'validFrom' });
    const validUntil = useWatch({ control, name: 'validUntil' });
    const addressLocked = isCompanyUser && !!projectId;

    // ==========================================================================
    // STEP VALIDATION - Each step validates ONLY its own fields
    // ==========================================================================

    const stepFields: Record<number, (keyof CreatePermitInput)[]> = {
        1: ['wasteType', 'estimatedWeight', 'estimatedVolume', 'wasteDescription'],
        2: ['pickupAddress', 'pickupCity', 'pickupState', 'pickupPincode', 'plantId'],
        3: ['driverName', 'driverPhone', 'vehicleNumber', 'vehicleType', 'licenseNumber'],
        4: ['validFrom', 'validUntil'],
    };

    // ✅ Validate current step fields
    const validateStep = async (step: number): Promise<boolean> => {
        const fields = stepFields[step] || [];
        const result = await trigger(fields, { shouldFocus: true });
        return result;
    };

    // ✅ Check if current step is valid
    const isStepValid = (step: number): boolean => {
        const fields = stepFields[step] || [];
        // Check if any field in the step has an error
        for (const field of fields) {
            if (errors[field]) return false;
        }
        // Check if required fields have values
        const values = getValues();
        for (const field of fields) {
            if (field === 'estimatedWeight' || field === 'estimatedVolume' || 
                field === 'wasteDescription' || field === 'driverName' ||
                field === 'driverPhone' || field === 'vehicleNumber' ||
                field === 'vehicleType' || field === 'licenseNumber') {
                continue; // These are optional
            }
            if (!values[field]) return false;
        }
        return true;
    };

    // ==========================================================================
    // AUTO-FILL ADDRESS FROM PROJECT
    // ==========================================================================

    useEffect(() => {
        if (!isCompanyUser || !projectId) return;
        const p = projects.find((x) => x.id === projectId);
        if (!p) return;
        setValue('pickupAddress', p.address, { shouldValidate: true });
        setValue('pickupCity', p.city, { shouldValidate: true });
        setValue('pickupState', p.state, { shouldValidate: true });
        if (p.pincode && /^\d{6}$/.test(p.pincode)) {
            setValue('pickupPincode', p.pincode, { shouldValidate: true });
        }
    }, [isCompanyUser, projectId, projects, setValue]);

    // ==========================================================================
    // LOCATION
    // ==========================================================================

    const useCurrentLocation = useCallback(async () => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'Location access is needed to fill your pickup address.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = pos.coords;
            setValue('pickupLatitude', latitude, { shouldValidate: true, shouldDirty: true });
            setValue('pickupLongitude', longitude, { shouldValidate: true, shouldDirty: true });

            const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
            const g = geo[0];
            if (g) {
                const street = [g.streetNumber, g.street].filter(Boolean).join(' ').trim();
                const line = [street, g.district, g.subregion].filter(Boolean).join(', ');
                setValue('pickupAddress', line || g.formattedAddress || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, {
                    shouldValidate: true,
                });
                setValue('pickupCity', g.city || g.subregion || g.district || '', { shouldValidate: true });
                setValue('pickupState', g.region || '', { shouldValidate: true });
                const pc = g.postalCode?.replace(/\D/g, '').slice(0, 6) ?? '';
                if (pc.length === 6) setValue('pickupPincode', pc, { shouldValidate: true });
            }
        } catch (e) {
            Alert.alert('Location error', 'Could not read your location. Enter the address manually.');
        } finally {
            setLocating(false);
        }
    }, [setValue]);

    // ==========================================================================
    // EVIDENCE
    // ==========================================================================

    const pickEvidence = async () => {
        if (evidenceUris.length >= 3) return;
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission required', 'Photo library access is needed to attach evidence.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: false,
            quality: 0.85,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        setEvidenceUris((prev) => [...prev, result.assets[0].uri].slice(0, 3));
    };

    const removeEvidence = (index: number) => {
        setEvidenceUris((prev) => prev.filter((_, i) => i !== index));
    };

    // ==========================================================================
    // STEP NAVIGATION
    // ==========================================================================

    const goNext = async () => {
        // ✅ Validate current step before proceeding
        const valid = await validateStep(currentStep);
        if (valid) {
            setCurrentStep((s) => Math.min(STEPS.length, s + 1));
        }
    };

    const goBack = () => {
        setCurrentStep((s) => Math.max(1, s - 1));
    };

    // ==========================================================================
    // SUBMIT
    // ==========================================================================

    const onSubmit = async (data: CreatePermitInput) => {
        const payload: CreatePermitInput = {
            ...data,
            companyId: isCompanyUser && user?.companyId ? user.companyId : undefined,
            projectId: isCompanyUser ? data.projectId : undefined,
        };

        if (!isCompanyUser) {
            delete payload.projectId;
            delete payload.companyId;
        }

        try {
            const response = await createPermit.mutateAsync({
                data: payload,
                mode: submitMode,
            });

            if (!response.success) {
                Alert.alert('Error', response.error?.message || 'Failed to create permit');
                return;
            }

            const permitId = response.data.id;

            if (evidenceUris.length > 0) {
                try {
                    for (const uri of evidenceUris) {
                        await uploadEvidence.mutateAsync({ permitId, uri });
                    }
                } catch (e) {
                    Alert.alert(
                        'Permit Created',
                        'Your permit was created, but evidence upload failed. You can add photos later.',
                        [{ text: 'View Permit', onPress: () => router.push(`/permits/${permitId}`) }]
                    );
                    return;
                }
            }

            Alert.alert(
                'Success',
                submitMode === 'draft' ? 'Permit saved as draft!' : 'Permit submitted successfully!',
                [{ text: 'View Permit', onPress: () => router.push(`/permits/${permitId}`) }]
            );
        } catch (error: any) {
            const message = error.response?.data?.error?.message || error.message || 'Failed to create permit';
            Alert.alert('Error', message);
        }
    };

    // ==========================================================================
    // RENDER FUNCTIONS
    // ==========================================================================

    const renderStep1 = () => (
        <View>
            <Text className="text-lg font-semibold text-foreground mb-2">Waste Information</Text>
            <Text className="text-muted-foreground text-sm mb-4">
                Describe the type and quantity of waste being moved.
            </Text>

            <Controller
                control={control}
                name="wasteType"
                render={({ field: { onChange, value } }) => (
                    <Select
                        label="Waste Type *"
                        options={WasteType.map((id) => ({
                            id,
                            label: WASTE_LABELS[id].label,
                            subtitle: WASTE_LABELS[id].subtitle,
                        }))}
                        value={value}
                        onSelect={onChange}
                        error={errors.wasteType?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="estimatedWeight"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Estimated Weight (kg)"
                        placeholder="e.g. 1000"
                        keyboardType="numeric"
                        onBlur={onBlur}
                        onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                        value={value != null ? String(value) : ''}
                        error={errors.estimatedWeight?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="estimatedVolume"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Estimated Volume (m³)"
                        placeholder="Optional"
                        keyboardType="numeric"
                        onBlur={onBlur}
                        onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                        value={value != null ? String(value) : ''}
                        error={errors.estimatedVolume?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="wasteDescription"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Description"
                        placeholder="Example: Concrete debris, bricks, tiles, soil"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value || ''}
                        error={errors.wasteDescription?.message}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                )}
            />

            <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">
                    {isStepValid(1) ? '✅ Step complete' : '⚠️ Please fill all required fields'}
                </Text>
                <Button label="Next →" onPress={goNext} />
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View>
            <Text className="text-lg font-semibold text-foreground mb-2">Location & Plant</Text>
            <Text className="text-muted-foreground text-sm mb-4">
                Provide the location where waste will be collected and select the processing plant.
            </Text>

            {!isCompanyUser && (
                <TouchableOpacity
                    onPress={useCurrentLocation}
                    disabled={locating}
                    className="flex-row items-center justify-center bg-secondary rounded-lg p-3 mb-4 border border-border"
                >
                    {locating ? (
                        <ActivityIndicator size="small" color="#8F1D3F" />
                    ) : (
                        <>
                            <LucideMapPin size={20} color="#8F1D3F" />
                            <Text className="text-primary font-semibold ml-2">Use My Current Location</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}

            {isCompanyUser && projects.length > 0 && (
                <>
                    {projectsLoading ? (
                        <ActivityIndicator className="my-2" />
                    ) : (
                        <View>
                            <Controller
                                control={control}
                                name="projectId"
                                render={({ field: { onChange, value } }) => (
                                    <Select
                                        label="Select Project"
                                        options={projects.map((p) => ({
                                            id: p.id,
                                            label: p.name,
                                            subtitle: `${p.city}, ${p.state}`,
                                        }))}
                                        value={value ?? ''}
                                        onSelect={onChange}
                                        placeholder="-- Select Project --"
                                        error={errors.projectId?.message}
                                    />
                                )}
                            />
                            <Text className="text-xs text-muted-foreground mt-1 ml-1">
                                Address will be auto-filled from project.
                            </Text>
                        </View>
                    )}
                </>
            )}

            <Controller
                control={control}
                name="pickupAddress"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Address *"
                        placeholder="Full pickup address"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value || ''}
                        editable={!addressLocked}
                        error={errors.pickupAddress?.message}
                    />
                )}
            />

            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Controller
                        control={control}
                        name="pickupCity"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                label="City *"
                                placeholder="City"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value || ''}
                                editable={!addressLocked}
                                error={errors.pickupCity?.message}
                            />
                        )}
                    />
                </View>
                <View className="flex-1">
                    <Controller
                        control={control}
                        name="pickupState"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                label="State *"
                                placeholder="State"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value || ''}
                                editable={!addressLocked}
                                error={errors.pickupState?.message}
                            />
                        )}
                    />
                </View>
            </View>

            <Controller
                control={control}
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
                        editable={!addressLocked}
                        error={errors.pickupPincode?.message}
                    />
                )}
            />

            {plantsLoading ? (
                <ActivityIndicator className="my-4" />
            ) : (
                <Controller
                    control={control}
                    name="plantId"
                    render={({ field: { onChange, value } }) => (
                        <Select
                            label="Destination Plant *"
                            options={plants.map((p) => ({
                                id: p.id,
                                label: p.name,
                                subtitle: `${p.city}, ${p.state}`,
                            }))}
                            value={value}
                            onSelect={onChange}
                            error={errors.plantId?.message}
                            placeholder="-- Select Plant --"
                        />
                    )}
                />
            )}

            <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">
                    {isStepValid(2) ? '✅ Step complete' : '⚠️ Please fill all required fields'}
                </Text>
                <View className="flex-row gap-3">
                    <Button label="← Back" variant="outline" onPress={goBack} />
                    <Button label="Next →" onPress={goNext} />
                </View>
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View>
            <Text className="text-lg font-semibold text-foreground mb-2">Vehicle & Driver</Text>
            <Text className="text-muted-foreground text-sm mb-4">
                Enter driver, vehicle, and license information.
            </Text>

            <Controller
                control={control}
                name="driverName"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Driver Name"
                        placeholder="Full name"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value || ''}
                        error={errors.driverName?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="driverPhone"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Driver WhatsApp Number"
                        placeholder="+91XXXXXXXXXX"
                        keyboardType="phone-pad"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value || ''}
                        error={errors.driverPhone?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="licenseNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                        <Input
                            label="Driver's License Number"
                            placeholder="DL0420110012345"
                            autoCapitalize="characters"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value || ''}
                            error={errors.licenseNumber?.message}
                        />
                        <Text className="text-xs text-muted-foreground mt-1 ml-1">
                            Format: 2 letters + 2-3 digits + optional letter + 4 digits year + 7 digits number
                        </Text>
                    </View>
                )}
            />

            <Controller
                control={control}
                name="vehicleNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                        <Input
                            label="Vehicle Registration Number"
                            placeholder="HR51AB1234"
                            autoCapitalize="characters"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value || ''}
                            error={errors.vehicleNumber?.message}
                        />
                        <Text className="text-xs text-muted-foreground mt-1 ml-1">
                            Enter vehicle registration number as shown on the RC.
                        </Text>
                    </View>
                )}
            />

            <Controller
                control={control}
                name="vehicleType"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Vehicle Type"
                        placeholder="e.g. Truck, Dumper"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value || ''}
                        error={errors.vehicleType?.message}
                    />
                )}
            />

            <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">
                    {isStepValid(3) ? '✅ Step complete' : '⚠️ Please fill all required fields'}
                </Text>
                <View className="flex-row gap-3">
                    <Button label="← Back" variant="outline" onPress={goBack} />
                    <Button label="Next →" onPress={goNext} />
                </View>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View>
            <Text className="text-lg font-semibold text-foreground mb-2">Schedule & Evidence</Text>
            <Text className="text-muted-foreground text-sm mb-4">
                Set the permit validity period and upload evidence.
            </Text>

            <DateTimeFormField
                label="Valid From *"
                value={validFrom || ''}
                onChange={(v) => setValue('validFrom', v, { shouldValidate: true })}
                error={errors.validFrom?.message}
            />

            <DateTimeFormField
                label="Permit Expires At *"
                value={validUntil || ''}
                onChange={(v) => setValue('validUntil', v, { shouldValidate: true })}
                error={errors.validUntil?.message}
                minimumDate={validFrom ? parseDateTimeField(validFrom) : new Date()}
            />

            <Text className="text-sm font-medium text-foreground mb-2">Evidence (Max 3 Images) *</Text>
            <Text className="text-xs text-muted-foreground mb-2">Upload at least 1 image of the waste.</Text>

            <View className="flex-row flex-wrap gap-2 mb-4">
                {evidenceUris.map((uri, i) => (
                    <View key={`${uri}-${i}`} className="relative">
                        <Image source={{ uri }} className="w-24 h-24 rounded-md bg-muted" />
                        <TouchableOpacity
                            onPress={() => removeEvidence(i)}
                            className="absolute -top-1 -right-1 bg-destructive rounded-full p-1"
                        >
                            <LucideX size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                ))}
                {evidenceUris.length < 3 && (
                    <TouchableOpacity
                        onPress={pickEvidence}
                        className="w-24 h-24 rounded-md border-2 border-dashed border-input items-center justify-center"
                    >
                        <LucideImagePlus size={28} color="hsl(220 9% 46%)" />
                    </TouchableOpacity>
                )}
            </View>

            {!isCompanyUser && (
                <View className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4">
                    <Text className="text-yellow-800 dark:text-yellow-400 text-sm">
                        ⚠️ Ensure you have uploaded your Identity Documents (PAN/Aadhaar) in your Profile before transit.
                    </Text>
                </View>
            )}

            <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">
                    {isStepValid(4) ? '✅ Step complete' : '⚠️ Please fill all required fields'}
                </Text>
                <View className="flex-row gap-3">
                    <Button label="← Back" variant="outline" onPress={goBack} />
                </View>
            </View>

            <View className="flex-row gap-3 mt-4">
                <Button
                    label="Save as Draft"
                    variant="outline"
                    onPress={() => {
                        setSubmitMode('draft');
                        handleSubmit(onSubmit)();
                    }}
                    loading={isSubmitting && submitMode === 'draft'}
                    className="flex-1"
                />
                <Button
                    label="Submit"
                    onPress={() => {
                        setSubmitMode('submit');
                        handleSubmit(onSubmit)();
                    }}
                    loading={isSubmitting && submitMode === 'submit'}
                    className="flex-1"
                />
            </View>
        </View>
    );

    const renderStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            default: return null;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="px-6 pt-4 pb-3 bg-primary flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
                    <LucideArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-lg font-bold">New Permit</Text>
            </View>

            <StepIndicator steps={STEPS} currentStep={currentStep} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16 }}
                        className="flex-1 pt-4"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                        keyboardDismissMode="interactive"
                    >
                        {renderStep()}
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}