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
    Modal,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LucideArrowLeft, LucideImagePlus, LucideX } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { StepIndicator } from '../../components/ui/step-indicator';
import { usePlants, useProjects } from '../../hooks/use-reference-data';
import { useCreatePermit, useUploadPermitWasteEvidence } from '../../hooks/use-permits';
import { useAuth } from '../../lib/auth-store';
import {
    mobileNewPermitFormSchema,
    WasteType,
    type MobileNewPermitFormInput,
    type CreatePermitInput,
} from '../../schemas/index';

function formatLocalDateTime(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateTimeField(val: string | undefined): Date {
    if (!val) return new Date();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
        return new Date(`${val}:00`);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
}

/** Apply hours/minutes from `timeSource` onto the calendar day of `datePart`. */
function mergeDateAndTime(datePart: Date, timeSource: Date): Date {
    const out = new Date(datePart);
    out.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
    return out;
}

const STEPS = [
    { number: 1, title: 'Waste' },
    { number: 2, title: 'Location' },
    { number: 3, title: 'Vehicle' },
    { number: 4, title: 'Schedule' },
];

const WASTE_LABELS: Record<(typeof WasteType)[number], { label: string; subtitle: string }> = {
    CND_SEGREGATED: { label: 'C&D Segregated', subtitle: 'Segregated construction waste' },
    CND_UNSEGREGATED: { label: 'C&D Unsegregated', subtitle: 'Mixed construction waste' },
};

export default function NewPermitScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [evidenceUris, setEvidenceUris] = useState<string[]>([]);
    const [locating, setLocating] = useState(false);

    const isCompanyUser = user?.role === 'COMPANY_USER';

    const { data: plantsData, isLoading: plantsLoading } = usePlants();
    const { data: projectsData, isLoading: projectsLoading } = useProjects();
    const createPermit = useCreatePermit();
    const uploadEvidence = useUploadPermitWasteEvidence();

    const plants = plantsData?.data || [];
    const projects = projectsData?.data || [];

    const form = useForm<MobileNewPermitFormInput>({
        resolver: zodResolver(mobileNewPermitFormSchema) as Resolver<MobileNewPermitFormInput>,
        defaultValues: {
            wasteType: 'CND_SEGREGATED',
            estimatedWeight: undefined,
            estimatedVolume: undefined,
            wasteDescription: '',
            projectId: undefined,
            companyId: undefined,
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

    const { control, handleSubmit, setValue, trigger, formState: { errors } } = form;

    const projectId = useWatch({ control, name: 'projectId' });
    const validFrom = useWatch({ control, name: 'validFrom' });
    const validUntil = useWatch({ control, name: 'validUntil' });

    const addressLocked = isCompanyUser && !!projectId;

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

    const step1Fields: (keyof MobileNewPermitFormInput)[] = [
        'wasteType',
        'estimatedWeight',
        'estimatedVolume',
        'wasteDescription',
    ];

    const step2Fields: (keyof MobileNewPermitFormInput)[] = [
        'pickupAddress',
        'pickupCity',
        'pickupState',
        'pickupPincode',
        'plantId',
    ];

    const step3Fields: (keyof MobileNewPermitFormInput)[] = [
        'driverName',
        'driverPhone',
        'vehicleNumber',
        'vehicleType',
        'licenseNumber',
    ];

    const goNext = async () => {
        let fields: (keyof MobileNewPermitFormInput)[] = [];
        if (currentStep === 1) fields = step1Fields;
        else if (currentStep === 2) fields = step2Fields;
        else if (currentStep === 3) fields = step3Fields;
        else return;

        const ok = await trigger(fields, { shouldFocus: true });
        if (ok) setCurrentStep((s) => Math.min(4, s + 1));
    };

    const onSubmit = async (data: MobileNewPermitFormInput) => {
        const payload: CreatePermitInput = {
            ...data,
            companyId: isCompanyUser && user?.companyId ? user.companyId : undefined,
            projectId: isCompanyUser ? data.projectId : undefined,
        };
        if (!isCompanyUser) {
            payload.projectId = undefined;
            payload.companyId = undefined;
        }

        try {
            const response = await createPermit.mutateAsync(payload);
            if (!response.success) {
                Alert.alert('Error', response.error?.message || 'Failed to create permit');
                return;
            }
            const permitId = response.data.id;

            let evidenceFailed = false;
            for (let i = 0; i < evidenceUris.length; i++) {
                try {
                    await uploadEvidence.mutateAsync({ permitId, uri: evidenceUris[i] });
                } catch {
                    evidenceFailed = true;
                    break;
                }
            }

            if (evidenceFailed) {
                Alert.alert(
                    'Permit created',
                    'Your permit was created, but one or more evidence uploads failed. You can try adding photos again later.',
                    [{ text: 'View permit', onPress: () => router.replace(`/permits/${permitId}` as any) }]
                );
            } else {
                Alert.alert('Success', 'Permit created successfully!', [
                    { text: 'View permit', onPress: () => router.replace(`/permits/${permitId}` as any) },
                ]);
            }
        } catch (error: any) {
            const message = error.response?.data?.error?.message || error.message || 'Failed to create permit';
            Alert.alert('Error', message);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 pt-4 pb-3 bg-primary flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <LucideArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">Create New Permit</Text>
            </View>

            <StepIndicator steps={STEPS} currentStep={currentStep} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
                        className="flex-1 px-6 pt-6"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                        keyboardDismissMode="interactive"
                    >
                        {currentStep === 1 && (
                            <View>
                                <Text className="text-lg font-semibold text-foreground mb-4">Waste information</Text>

                                <Controller
                                    control={control}
                                    name="wasteType"
                                    render={({ field: { onChange, value } }) => (
                                        <Select
                                            label="Waste type *"
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
                                            label="Estimated weight (kg)"
                                            placeholder="e.g. 1000"
                                            keyboardType="numeric"
                                            onBlur={onBlur}
                                            onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                                            value={value != null ? String(value) : ''}
                                            error={errors.estimatedWeight?.message as string | undefined}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="estimatedVolume"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Estimated volume (m³)"
                                            placeholder="Optional"
                                            keyboardType="numeric"
                                            onBlur={onBlur}
                                            onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                                            value={value != null ? String(value) : ''}
                                            error={errors.estimatedVolume?.message as string | undefined}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="wasteDescription"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Description"
                                            placeholder="Brief description of waste"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={errors.wasteDescription?.message}
                                        />
                                    )}
                                />

                                <Button label="Next" onPress={goNext} className="mt-2" />
                            </View>
                        )}

                        {currentStep === 2 && (
                            <View>
                                <Text className="text-lg font-semibold text-foreground mb-4">Location & plant</Text>

                                {!isCompanyUser && (
                                    <Button
                                        label={locating ? 'Getting location…' : 'Use current location'}
                                        variant="outline"
                                        onPress={useCurrentLocation}
                                        disabled={locating}
                                        className="mb-4"
                                    />
                                )}

                                {isCompanyUser && projects.length > 0 && (
                                    <>
                                        {projectsLoading ? (
                                            <ActivityIndicator className="my-2" />
                                        ) : (
                                            <Controller
                                                control={control}
                                                name="projectId"
                                                render={({ field: { onChange, value } }) => (
                                                    <Select
                                                        label="Project (optional)"
                                                        options={projects.map((p) => ({
                                                            id: p.id,
                                                            label: p.name,
                                                            subtitle: `${p.city}, ${p.state}`,
                                                        }))}
                                                        value={value ?? ''}
                                                        onSelect={onChange}
                                                        placeholder="Select a project or enter address manually"
                                                    />
                                                )}
                                            />
                                        )}
                                    </>
                                )}

                                <Controller
                                    control={control}
                                    name="pickupAddress"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Pickup address *"
                                            placeholder="Full pickup address"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            editable={!addressLocked}
                                            error={errors.pickupAddress?.message}
                                        />
                                    )}
                                />

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
                                                label="Destination plant *"
                                                options={plants.map((p) => ({
                                                    id: p.id,
                                                    label: p.name,
                                                    subtitle: `${p.city}, ${p.state}`,
                                                }))}
                                                value={value}
                                                onSelect={onChange}
                                                error={errors.plantId?.message}
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
                                    <Button label="Next" onPress={goNext} className="flex-1" />
                                </View>
                            </View>
                        )}

                        {currentStep === 3 && (
                            <View>
                                <Text className="text-lg font-semibold text-foreground mb-4">Vehicle & driver</Text>

                                <Controller
                                    control={control}
                                    name="driverName"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Driver name"
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
                                            label="Driver phone"
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
                                    name="vehicleNumber"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Vehicle number"
                                            placeholder="e.g. MH01AB1234"
                                            autoCapitalize="characters"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={errors.vehicleNumber?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="vehicleType"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Vehicle type"
                                            placeholder="e.g. Truck"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={errors.vehicleType?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="licenseNumber"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="License number"
                                            placeholder="Indian DL format"
                                            autoCapitalize="characters"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={errors.licenseNumber?.message}
                                        />
                                    )}
                                />

                                <View className="flex-row gap-3 mt-4">
                                    <Button
                                        label="Back"
                                        variant="outline"
                                        onPress={() => setCurrentStep(2)}
                                        className="flex-1"
                                    />
                                    <Button label="Next" onPress={goNext} className="flex-1" />
                                </View>
                            </View>
                        )}

                        {currentStep === 4 && (
                            <View>
                                <Text className="text-lg font-semibold text-foreground mb-4">Validity & evidence</Text>

                                <DateTimeFormField
                                    label="Valid from *"
                                    value={validFrom || ''}
                                    onChange={(v) => setValue('validFrom', v, { shouldValidate: true })}
                                    error={errors.validFrom?.message}
                                />

                                <DateTimeFormField
                                    label="Valid until *"
                                    value={validUntil || ''}
                                    onChange={(v) => setValue('validUntil', v, { shouldValidate: true })}
                                    error={errors.validUntil?.message}
                                    minimumDate={validFrom ? parseDateTimeField(validFrom) : new Date()}
                                />

                                <Text className="text-sm font-medium text-foreground mb-2">Waste evidence (optional, max 3)</Text>
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

                                <View className="flex-row gap-3 mt-2 mb-8">
                                    <Button
                                        label="Back"
                                        variant="outline"
                                        onPress={() => setCurrentStep(3)}
                                        className="flex-1"
                                    />
                                    <Button
                                        label="Create permit"
                                        onPress={handleSubmit(onSubmit)}
                                        loading={createPermit.isPending || uploadEvidence.isPending}
                                        className="flex-1"
                                    />
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function DateTimeFormField({
    label,
    value,
    onChange,
    error,
    minimumDate,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    minimumDate?: Date;
}) {
    /** Android: only `date` and `time` exist — `datetime` breaks dismiss() (no picker for that mode). */
    const [iosOpen, setIosOpen] = useState(false);
    const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
    const [pendingDate, setPendingDate] = useState<Date | null>(null);

    const date = parseDateTimeField(value);

    const openPicker = () => {
        if (Platform.OS === 'android') {
            setAndroidStep('date');
            setPendingDate(null);
        } else {
            setIosOpen(true);
        }
    };

    const finishAndroid = (combined: Date) => {
        let out = combined;
        if (minimumDate && out < minimumDate) {
            out = minimumDate;
        }
        onChange(formatLocalDateTime(out));
        setAndroidStep(null);
        setPendingDate(null);
    };

    return (
        <View className="mb-4">
            <Text className="text-sm font-medium text-foreground mb-2">{label}</Text>
            <TouchableOpacity
                onPress={openPicker}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 justify-center"
            >
                <Text className={value ? 'text-foreground text-base' : 'text-muted-foreground text-base'}>
                    {value || 'Select date & time'}
                </Text>
            </TouchableOpacity>
            {error ? <Text className="text-xs text-error mt-1">{error}</Text> : null}

            {Platform.OS === 'android' && androidStep === 'date' && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={minimumDate}
                    onChange={(e, d) => {
                        if (e.type === 'dismissed' || !d) {
                            setAndroidStep(null);
                            setPendingDate(null);
                            return;
                        }
                        setPendingDate(d);
                        setAndroidStep('time');
                    }}
                />
            )}

            {Platform.OS === 'android' && androidStep === 'time' && pendingDate && (
                <DateTimePicker
                    value={mergeDateAndTime(pendingDate, parseDateTimeField(value))}
                    mode="time"
                    display="default"
                    is24Hour={false}
                    onChange={(e, d) => {
                        if (e.type === 'dismissed' || !d) {
                            setAndroidStep(null);
                            setPendingDate(null);
                            return;
                        }
                        const combined = mergeDateAndTime(pendingDate, d);
                        finishAndroid(combined);
                    }}
                />
            )}

            {iosOpen && Platform.OS === 'ios' && (
                <Modal transparent animationType="slide" visible={iosOpen} onRequestClose={() => setIosOpen(false)}>
                    <TouchableWithoutFeedback onPress={() => setIosOpen(false)}>
                        <View className="flex-1 justify-end bg-black/50">
                            <TouchableWithoutFeedback>
                                <View className="bg-background rounded-t-xl p-4 pb-8">
                                    <DateTimePicker
                                        value={date}
                                        mode="datetime"
                                        display="spinner"
                                        minimumDate={minimumDate}
                                        onChange={(_, d) => {
                                            if (d) onChange(formatLocalDateTime(d));
                                        }}
                                    />
                                    <Button label="Done" onPress={() => setIosOpen(false)} className="mt-2" />
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}
        </View>
    );
}
