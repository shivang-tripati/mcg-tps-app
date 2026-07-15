import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Controller,
    type Resolver,
    useForm,
    useWatch,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodIssue } from 'zod';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    FileImage,
    ImagePlus,
    Info,
    MapPin,
    Trash2,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { StepIndicator } from '../../../components/ui/step-indicator';
import DateTimeFormField from '../../../components/ui/date-time-from-field';
import { usePlants, useProjects } from '../../../hooks/use-reference-data';
import {
    PermitApiError,
    useCreatePermit,
    useSubmitPermit,
    useUploadPermitWasteEvidence,
} from '../../../hooks/use-permits';
import { useAuth } from '../../../lib/auth-store';
import {
    createPermitSchema,
    submitCreatePermitSchema,
    WasteType,
    type CreatePermitFormValues,
    type CreatePermitInput,
} from '../../../schemas/index';

const PRIMARY = '#8F1D3F';
const MUTED = '#6B7280';
const DANGER = '#DC2626';
const SUCCESS = '#15803D';
const MAX_EVIDENCE_IMAGES = 3;

const WASTE_LABELS: Record<
    (typeof WasteType)[number],
    { label: string; subtitle: string }
> = {
    CND_SEGREGATED: {
        label: 'C&D Segregated',
        subtitle: 'Waste sorted by material type',
    },
    CND_UNSEGREGATED: {
        label: 'C&D Unsegregated',
        subtitle: 'Mixed construction and demolition waste',
    },
};

const STEPS = [
    { number: 1, title: 'Pickup' },
    { number: 2, title: 'Waste' },
    { number: 3, title: 'Transport' },
    { number: 4, title: 'Review' },
];

const STEP_FIELDS: Record<number, (keyof CreatePermitFormValues)[]> = {
    1: [
        'projectId',
        'pickupAddress',
        'pickupCity',
        'pickupState',
        'pickupPincode',
        'pickupLatitude',
        'pickupLongitude',
    ],
    2: ['plantId', 'wasteType', 'estimatedWeight', 'wasteDescription'],
    3: [
        'driverName',
        'driverPhone',
        'licenseNumber',
        'vehicleNumber',
        'vehicleType',
    ],
    4: ['validFrom', 'validUntil'],
};

const FIELD_STEP: Partial<Record<keyof CreatePermitFormValues, number>> = {
    projectId: 1,
    pickupAddress: 1,
    pickupCity: 1,
    pickupState: 1,
    pickupPincode: 1,
    pickupLatitude: 1,
    pickupLongitude: 1,
    plantId: 2,
    wasteType: 2,
    estimatedWeight: 2,
    wasteDescription: 2,
    driverName: 3,
    driverPhone: 3,
    licenseNumber: 3,
    vehicleNumber: 3,
    vehicleType: 3,
    validFrom: 4,
    validUntil: 4,
};

function sanitizeDecimalInput(value: string): string {
    const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, '');
    const [integerPart = '', ...decimalParts] = cleaned.split('.');
    if (decimalParts.length === 0) return integerPart;
    return `${integerPart}.${decimalParts.join('')}`;
}

function sanitizePhoneInput(value: string): string {
    const cleaned = value.replace(/[^\d+]/g, '');
    return cleaned.replace(/(?!^)\+/g, '');
}

function firstMessage(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value)) {
        return value.find((entry): entry is string => typeof entry === 'string' && !!entry.trim());
    }
    return undefined;
}

interface StepFeedbackProps {
    validated: boolean;
    hasError: boolean;
}

function StepFeedback({ validated, hasError }: StepFeedbackProps) {
    if (hasError) {
        return (
            <View className="flex-row items-center">
                <AlertCircle size={16} color={DANGER} />
                <Text className="ml-1.5 text-xs text-destructive">Check the highlighted fields</Text>
            </View>
        );
    }

    if (validated) {
        return (
            <View className="flex-row items-center">
                <CheckCircle2 size={16} color={SUCCESS} />
                <Text className="ml-1.5 text-xs text-green-700">This step is complete</Text>
            </View>
        );
    }

    return <View />;
}

export default function NewPermitScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const scrollRef = useRef<ScrollView>(null);
    const { user } = useAuth();

    const [currentStep, setCurrentStep] = useState(1);
    const [validatedSteps, setValidatedSteps] = useState<number[]>([]);
    const [evidenceUris, setEvidenceUris] = useState<string[]>([]);
    const [evidenceError, setEvidenceError] = useState<string | undefined>();
    const [formError, setFormError] = useState<string | undefined>();
    const [locating, setLocating] = useState(false);

    const isWide = width >= 680;
    const isCompanyUser = user?.role === 'COMPANY_USER';

    const { data: plantsData, isLoading: plantsLoading } = usePlants();
    const { data: projectsData, isLoading: projectsLoading } = useProjects();
    const createPermit = useCreatePermit();
    const uploadEvidence = useUploadPermitWasteEvidence();
    const submitPermit = useSubmitPermit();

    const plants = plantsData?.data || [];
    const projects = projectsData?.data || [];
    const busy =
        createPermit.isPending ||
        uploadEvidence.isPending ||
        submitPermit.isPending;

    const form = useForm<CreatePermitFormValues>({
        resolver: zodResolver(createPermitSchema) as Resolver<CreatePermitFormValues>,
        mode: 'onTouched',
        reValidateMode: 'onChange',
        delayError: 200,
        shouldFocusError: true,
        // Multi-step fields are hidden/unmounted while navigating. Keep their
        // values registered so earlier steps are available during final submit.
        shouldUnregister: false,
        defaultValues: {
            wasteType: 'CND_SEGREGATED',
            estimatedWeight: '',
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

    const {
        control,
        clearErrors,
        getValues,
        setError,
        setValue,
        formState: { errors },
    } = form;

    const projectId = useWatch({ control, name: 'projectId' });
    const validFrom = useWatch({ control, name: 'validFrom' });
    const validUntil = useWatch({ control, name: 'validUntil' });
    const addressLocked = Boolean(isCompanyUser && projectId);

    const currentStepHasError = useMemo(
        () => STEP_FIELDS[currentStep].some((field) => Boolean(errors[field])),
        [currentStep, errors]
    );

    useEffect(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [currentStep]);

    useEffect(() => {
        if (plants.length !== 1 || getValues('plantId')) return;
        setValue('plantId', plants[0].id, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }, [getValues, plants, setValue]);

    useEffect(() => {
        if (!isCompanyUser || !projectId) return;

        const project = projects.find((item) => item.id === projectId);
        if (!project) return;

        const projectWithCoordinates = project as typeof project & {
            latitude?: number | null;
            longitude?: number | null;
        };

        setValue('pickupAddress', project.address || '', {
            shouldDirty: true,
            shouldValidate: true,
        });
        setValue('pickupCity', project.city || '', {
            shouldDirty: true,
            shouldValidate: true,
        });
        setValue('pickupState', project.state || '', {
            shouldDirty: true,
            shouldValidate: true,
        });
        setValue('pickupPincode', project.pincode || '', {
            shouldDirty: true,
            shouldValidate: true,
        });

        if (typeof projectWithCoordinates.latitude === 'number') {
            setValue('pickupLatitude', projectWithCoordinates.latitude, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
        if (typeof projectWithCoordinates.longitude === 'number') {
            setValue('pickupLongitude', projectWithCoordinates.longitude, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [isCompanyUser, projectId, projects, setValue]);

    const applyIssues = useCallback(
        (issues: ZodIssue[]) => {
            for (const issue of issues) {
                const field = issue.path[0] as keyof CreatePermitFormValues | undefined;
                if (!field || !(field in FIELD_STEP)) continue;
                setError(field, { type: 'manual', message: issue.message });
            }
        },
        [setError]
    );

    const moveToFirstErrorStep = useCallback((issues: ZodIssue[]) => {
        const firstField = issues
            .map((issue) => issue.path[0] as keyof CreatePermitFormValues | undefined)
            .find((field) => field && FIELD_STEP[field]);

        if (firstField) {
            setCurrentStep(FIELD_STEP[firstField] || 1);
        }
    }, []);

    const validateStep = async (step: number): Promise<boolean> => {
        const fields = STEP_FIELDS[step];
        clearErrors(fields);
        setFormError(undefined);

        // Step 3 uses the stricter submit schema so users cannot proceed with
        // incomplete driver/vehicle details. Draft validation remains separate.
        const schema = step === 3 ? submitCreatePermitSchema : createPermitSchema;
        const result = schema.safeParse(getValues());

        if (result.success) {
            setValidatedSteps((previous) =>
                previous.includes(step) ? previous : [...previous, step]
            );
            return true;
        }

        const stepIssues = result.error.issues.filter((issue) =>
            fields.includes(issue.path[0] as keyof CreatePermitFormValues)
        );

        if (stepIssues.length === 0) {
            setValidatedSteps((previous) =>
                previous.includes(step) ? previous : [...previous, step]
            );
            return true;
        }

        applyIssues(stepIssues);
        setValidatedSteps((previous) => previous.filter((item) => item !== step));
        return false;
    };

    const goNext = async () => {
        Keyboard.dismiss();
        const valid = await validateStep(currentStep);
        if (!valid) return;
        setCurrentStep((step) => Math.min(STEPS.length, step + 1));
    };

    const goBack = () => {
        Keyboard.dismiss();
        setFormError(undefined);
        setCurrentStep((step) => Math.max(1, step - 1));
    };

    const useCurrentLocation = useCallback(async () => {
        setLocating(true);
        setFormError(undefined);

        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert(
                    'Location permission required',
                    'Allow location access to fill the pickup address automatically.'
                );
                return;
            }

            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const { latitude, longitude } = position.coords;

            setValue('pickupLatitude', latitude, {
                shouldDirty: true,
                shouldValidate: true,
            });
            setValue('pickupLongitude', longitude, {
                shouldDirty: true,
                shouldValidate: true,
            });

            const results = await Location.reverseGeocodeAsync({ latitude, longitude });
            const location = results[0];

            if (!location) {
                setValue('pickupAddress', `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, {
                    shouldDirty: true,
                    shouldValidate: true,
                });
                return;
            }

            const street = [location.streetNumber, location.street]
                .filter(Boolean)
                .join(' ')
                .trim();
            const addressLine = [street, location.district, location.subregion]
                .filter(Boolean)
                .join(', ');

            setValue(
                'pickupAddress',
                addressLine || location.formattedAddress || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                { shouldDirty: true, shouldValidate: true }
            );
            setValue(
                'pickupCity',
                location.city || location.subregion || location.district || '',
                { shouldDirty: true, shouldValidate: true }
            );
            setValue('pickupState', location.region || '', {
                shouldDirty: true,
                shouldValidate: true,
            });

            const pincode = location.postalCode?.replace(/\D/g, '').slice(0, 6) || '';
            if (pincode.length === 6) {
                setValue('pickupPincode', pincode, {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            }
        } catch {
            Alert.alert(
                'Unable to read location',
                'Enter the pickup address manually and try again later.'
            );
        } finally {
            setLocating(false);
        }
    }, [setValue]);

    const addEvidenceFrom = async (source: 'camera' | 'library') => {
        if (evidenceUris.length >= MAX_EVIDENCE_IMAGES) return;

        const permission =
            source === 'camera'
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert(
                'Permission required',
                source === 'camera'
                    ? 'Camera permission is needed to capture waste evidence.'
                    : 'Photo library permission is needed to select waste evidence.'
            );
            return;
        }

        const result =
            source === 'camera'
                ? await ImagePicker.launchCameraAsync({
                      mediaTypes: ['images'],
                      quality: 0.85,
                      allowsEditing: false,
                  })
                : await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ['images'],
                      quality: 0.85,
                      allowsEditing: false,
                      allowsMultipleSelection: false,
                  });

        if (result.canceled || !result.assets?.[0]?.uri) return;

        setEvidenceUris((previous) => [
            ...previous,
            result.assets[0].uri,
        ].slice(0, MAX_EVIDENCE_IMAGES));
        setEvidenceError(undefined);
    };

    const showEvidenceSource = () => {
        Alert.alert('Add waste evidence', 'Choose an image source.', [
            {
                text: 'Take photo',
                onPress: () => void addEvidenceFrom('camera'),
            },
            {
                text: 'Choose from library',
                onPress: () => void addEvidenceFrom('library'),
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const removeEvidence = (index: number) => {
        setEvidenceUris((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
    };

    const applyServerFieldErrors = (error: PermitApiError): boolean => {
        const entries = Object.entries(error.fieldErrors || {});
        if (entries.length === 0) return false;

        for (const [fieldName, rawMessage] of entries) {
            const field = fieldName as keyof CreatePermitFormValues;
            const message = firstMessage(rawMessage);
            if (!message || !FIELD_STEP[field]) continue;

            setError(field, { type: 'server', message });
        }

        const resolvedSteps = entries
            .map(([fieldName]) => FIELD_STEP[fieldName as keyof CreatePermitFormValues])
            .filter((step): step is number => typeof step === 'number');

        if (resolvedSteps.length > 0) {
            setCurrentStep(Math.min(...resolvedSteps));
            setFormError('Please correct the highlighted fields and submit again.');
            return true;
        }

        return false;
    };

    const submitForm = async () => {
        Keyboard.dismiss();
        clearErrors();
        setFormError(undefined);
        setEvidenceError(undefined);

        // Submission uses the strict schema so all transport details required by
        // the application are validated before any API request is made.
        const currentValues = getValues();
        const validation = submitCreatePermitSchema.safeParse(currentValues);

        if (!validation.success) {
            applyIssues(validation.error.issues);
            moveToFirstErrorStep(validation.error.issues);
            setFormError('Please correct the highlighted fields before submitting.');
            return;
        }

        // Evidence is mandatory for the mobile application.
        if (evidenceUris.length === 0) {
            setEvidenceError('Upload at least one image of the waste before submitting.');
            setCurrentStep(4);
            setFormError('Waste evidence is required before submitting the permit.');
            return;
        }

        const data = validation.data;
        const payload: CreatePermitInput = { ...data };

        // Keep the mobile payload aligned with the currently used web fields.
        // Company ownership is resolved by the authenticated backend user.
        delete payload.estimatedVolume;
        delete payload.companyId;

        if (!isCompanyUser) {
            delete payload.projectId;
        }

        let permitId: string | undefined;

        try {
            /*
             * 1. Create an internal DRAFT.
             * The app exposes only one "Submit permit" action to the user.
             */
            const createResponse = await createPermit.mutateAsync({
                data: payload,
                mode: 'draft',
            });

            if (!createResponse.success || !createResponse.data?.id) {
                throw new Error(
                    createResponse.error?.message || 'Could not prepare the permit'
                );
            }

            permitId = createResponse.data.id;

            /*
             * 2. Upload the physical files and register their WasteEvidence rows.
             * If any upload fails, execution stops and /submit is not called.
             */
            for (const uri of evidenceUris) {
                await uploadEvidence.mutateAsync({
                    permitId,
                    uri,
                });
            }

            /*
             * 3. Finalize the existing draft through the backend submit route.
             */
            const submitResponse = await submitPermit.mutateAsync({
                permitId,
                data: {
                    driverName: data.driverName,
                    driverPhone: data.driverPhone,
                    vehicleNumber: data.vehicleNumber,
                    vehicleType: data.vehicleType || undefined,
                    licenseNumber: data.licenseNumber || undefined,
                },
            });

            if (!submitResponse.success) {
                throw new Error(
                    submitResponse.error?.message || 'Could not submit the permit'
                );
            }

            Alert.alert(
                'Permit submitted',
                'Your permit and waste evidence were submitted successfully.',
                [
                    {
                        text: 'View permit',
                        onPress: () => router.replace(`/permits/${permitId}`),
                    },
                ]
            );
        } catch (error: unknown) {
            if (error instanceof PermitApiError && applyServerFieldErrors(error)) {
                return;
            }

            const message =
                error instanceof Error
                    ? error.message
                    : 'The permit could not be submitted. Please try again.';

            setFormError(message);

            Alert.alert(
                'Permit not submitted',
                permitId
                    ? `${message}\n\nThe final submission was not completed.`
                    : message
            );
        }
    };

    const renderStepHeader = (title: string, description: string) => (
        <View className="mb-5">
            <Text className="text-xl font-semibold text-foreground">{title}</Text>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">{description}</Text>
        </View>
    );

    const renderStep1 = () => (
        <View>
            {renderStepHeader(
                'Pickup location',
                isCompanyUser
                    ? 'Select a project to fill its registered pickup address, then verify the details.'
                    : 'Enter the collection address or use your current location.'
            )}

            {!isCompanyUser ? (
                <Pressable
                    onPress={useCurrentLocation}
                    disabled={locating}
                    className="mb-5 min-h-12 flex-row items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4"
                >
                    {locating ? (
                        <ActivityIndicator size="small" color={PRIMARY} />
                    ) : (
                        <MapPin size={19} color={PRIMARY} />
                    )}
                    <Text className="ml-2 font-semibold text-primary">
                        {locating ? 'Finding your location' : 'Use current location'}
                    </Text>
                </Pressable>
            ) : null}

            {isCompanyUser ? (
                projectsLoading ? (
                    <ActivityIndicator className="my-4" color={PRIMARY} />
                ) : (
                    <Controller
                        control={control}
                        name="projectId"
                        render={({ field: { onChange, value } }) => (
                            <Select
                                label="Project"
                                options={projects.map((project) => ({
                                    id: project.id,
                                    label: project.name,
                                    subtitle: [project.city, project.state].filter(Boolean).join(', '),
                                }))}
                                value={value || ''}
                                onSelect={(nextValue) => {
                                    onChange(nextValue || undefined);
                                    clearErrors('projectId');
                                }}
                                placeholder="Select a project"
                                error={errors.projectId?.message}
                            />
                        )}
                    />
                )
            ) : null}

            <Controller
                control={control}
                name="pickupAddress"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Pickup address"
                        required
                        placeholder="House, building, road and locality"
                        value={value || ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        editable={!addressLocked}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        autoCapitalize="sentences"
                        error={errors.pickupAddress?.message}
                    />
                )}
            />

            <View className={isWide ? 'flex-row gap-3' : ''}>
                <View className="flex-1">
                    <Controller
                        control={control}
                        name="pickupCity"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                label="City"
                                required
                                placeholder="City"
                                value={value || ''}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                editable={!addressLocked}
                                autoCapitalize="words"
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
                                label="State"
                                required
                                placeholder="State"
                                value={value || ''}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                editable={!addressLocked}
                                autoCapitalize="words"
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
                        label="PIN code"
                        required
                        placeholder="6-digit PIN code"
                        value={value || ''}
                        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
                        onBlur={onBlur}
                        editable={!addressLocked}
                        keyboardType="number-pad"
                        maxLength={6}
                        inputMode="numeric"
                        error={errors.pickupPincode?.message}
                    />
                )}
            />
        </View>
    );

    const renderStep2 = () => (
        <View>
            {renderStepHeader(
                'Destination and waste',
                'Select the processing plant and describe the C&D waste being transported.'
            )}

            {plantsLoading ? (
                <ActivityIndicator className="my-4" color={PRIMARY} />
            ) : (
                <Controller
                    control={control}
                    name="plantId"
                    render={({ field: { onChange, value } }) => (
                        <Select
                            label="Destination plant *"
                            options={plants.map((plant) => ({
                                id: plant.id,
                                label: plant.name,
                                subtitle: [plant.code, plant.city, plant.state]
                                    .filter(Boolean)
                                    .join(' • '),
                            }))}
                            value={value || ''}
                            onSelect={(nextValue) => {
                                onChange(nextValue);
                                clearErrors('plantId');
                            }}
                            placeholder="Select a processing plant"
                            error={errors.plantId?.message}
                        />
                    )}
                />
            )}

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
                        label="Estimated waste weight"
                        placeholder="For example 1000"
                        value={value || ''}
                        onChangeText={(text) => onChange(sanitizeDecimalInput(text))}
                        onBlur={onBlur}
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        rightElement={<Text className="text-sm font-medium text-muted-foreground">kg</Text>}
                        helperText="Approximate weight of C&D waste being transported."
                        error={errors.estimatedWeight?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="wasteDescription"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Waste description"
                        placeholder="Concrete debris, bricks, tiles, soil or mixed C&D waste"
                        value={value || ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        autoCapitalize="sentences"
                        error={errors.wasteDescription?.message}
                    />
                )}
            />
        </View>
    );

    const renderStep3 = () => (
        <View>
            {renderStepHeader(
                'Driver and vehicle',
                'Enter the transport details exactly as shown on the driving licence and vehicle RC.'
            )}

            <Controller
                control={control}
                name="driverName"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Driver name"
                        required
                        placeholder="Full name"
                        value={value || ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                        autoComplete="name"
                        textContentType="name"
                        error={errors.driverName?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="driverPhone"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Driver WhatsApp number"
                        required
                        placeholder="+91 98765 43210"
                        value={value || ''}
                        onChangeText={(text) => onChange(sanitizePhoneInput(text))}
                        onBlur={onBlur}
                        keyboardType="phone-pad"
                        inputMode="tel"
                        autoComplete="tel"
                        textContentType="telephoneNumber"
                        error={errors.driverPhone?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="licenseNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Driving licence number"
                        required
                        placeholder="DL0420110012345"
                        value={value || ''}
                        onChangeText={(text) => onChange(text.replace(/\s/g, '').toUpperCase())}
                        onBlur={onBlur}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        helperText="Use the licence number printed on the driver's document."
                        error={errors.licenseNumber?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="vehicleNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Vehicle registration number"
                        required
                        placeholder="HR51AB1234"
                        value={value || ''}
                        onChangeText={(text) => onChange(text.toUpperCase())}
                        onBlur={onBlur}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        helperText="Enter the registration number as shown on the RC."
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
                        required
                        placeholder="Truck, dumper or tractor-trolley"
                        value={value || ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                        error={errors.vehicleType?.message}
                    />
                )}
            />
        </View>
    );

    const renderStep4 = () => (
        <View>
            {renderStepHeader(
                'Schedule and evidence',
                'Validity dates are optional during application. Add waste images before submitting for review.'
            )}

            <DateTimeFormField
                label="Valid from"
                value={validFrom || ''}
                onChange={(nextValue) =>
                    setValue('validFrom', nextValue, {
                        shouldDirty: true,
                        shouldValidate: true,
                    })
                }
                minimumDate={new Date()}
                error={errors.validFrom?.message}
            />

            <DateTimeFormField
                label="Permit expires at"
                value={validUntil || ''}
                onChange={(nextValue) =>
                    setValue('validUntil', nextValue, {
                        shouldDirty: true,
                        shouldValidate: true,
                    })
                }
                minimumDate={validFrom ? new Date(validFrom) : new Date()}
                error={errors.validUntil?.message}
            />

            <View className="mb-2 flex-row items-center justify-between">
                <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">
                        Waste evidence <Text className="text-destructive">*</Text>
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                        Add 1 to {MAX_EVIDENCE_IMAGES} clear images of the waste.
                    </Text>
                </View>
                <View className="ml-3 rounded-full bg-muted px-2.5 py-1">
                    <Text className="text-xs font-medium text-muted-foreground">
                        {evidenceUris.length}/{MAX_EVIDENCE_IMAGES}
                    </Text>
                </View>
            </View>

            <View className="mt-3 flex-row flex-wrap gap-3">
                {evidenceUris.map((uri, index) => (
                    <View key={`${uri}-${index}`} className="relative">
                        <Image
                            source={{ uri }}
                            className="h-28 w-28 rounded-xl bg-muted"
                            resizeMode="cover"
                            accessibilityLabel={`Waste evidence image ${index + 1}`}
                        />
                        <Pressable
                            onPress={() => removeEvidence(index)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove evidence image ${index + 1}`}
                            className="absolute -right-2 -top-2 h-8 w-8 items-center justify-center rounded-full bg-destructive shadow"
                        >
                            <Trash2 size={15} color="white" />
                        </Pressable>
                    </View>
                ))}

                {evidenceUris.length < MAX_EVIDENCE_IMAGES ? (
                    <Pressable
                        onPress={showEvidenceSource}
                        accessibilityRole="button"
                        accessibilityLabel="Add waste evidence"
                        className="h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/30"
                    >
                        <ImagePlus size={27} color={MUTED} />
                        <Text className="mt-2 text-xs font-medium text-muted-foreground">Add image</Text>
                    </Pressable>
                ) : null}
            </View>

            {evidenceError ? (
                <View className="mt-2 flex-row items-start">
                    <AlertCircle size={14} color={DANGER} />
                    <Text className="ml-1.5 flex-1 text-xs text-destructive" accessibilityRole="alert">
                        {evidenceError}
                    </Text>
                </View>
            ) : null}

            <View className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                <View className="flex-row items-start">
                    <Info size={18} color="#A16207" />
                    <Text className="ml-2 flex-1 text-sm leading-5 text-amber-800 dark:text-amber-300">
                        Verify the pickup, waste and transport details before submission. At least one waste evidence image is required.
                    </Text>
                </View>
            </View>

            {!isCompanyUser ? (
                <View className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
                    <View className="flex-row items-start">
                        <FileImage size={18} color={MUTED} />
                        <Text className="ml-2 flex-1 text-sm leading-5 text-muted-foreground">
                            Ensure your PAN or Aadhaar documents are available in your profile before transit.
                        </Text>
                    </View>
                </View>
            ) : null}
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <View className="flex-row items-center bg-primary px-4 py-3">
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={10}
                    className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/10"
                >
                    <ArrowLeft size={22} color="white" />
                </Pressable>
                <View className="flex-1">
                    <Text className="text-lg font-bold text-white">Create permit</Text>
                    <Text className="text-xs text-white/80">
                        {isCompanyUser ? 'Project-based application' : 'Waste pickup application'}
                    </Text>
                </View>
            </View>

            <StepIndicator steps={STEPS} currentStep={currentStep} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
                style={{ flex: 1 }}
            >
                <ScrollView
                    ref={scrollRef}
                    className="flex-1"
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 18,
                        paddingBottom: 48,
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    showsVerticalScrollIndicator={false}
                >
                    {formError ? (
                        <View className="mb-4 flex-row items-start rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                            <AlertCircle size={19} color={DANGER} />
                            <Text className="ml-2 flex-1 text-sm leading-5 text-destructive" accessibilityRole="alert">
                                {formError}
                            </Text>
                        </View>
                    ) : null}

                    {/*
                     * Keep every step mounted and only hide inactive steps.
                     * This prevents Controller fields from being rebound or lost
                     * when React switches between different step trees.
                     */}
                    <View style={{ display: currentStep === 1 ? 'flex' : 'none' }}>
                        {renderStep1()}
                    </View>
                    <View style={{ display: currentStep === 2 ? 'flex' : 'none' }}>
                        {renderStep2()}
                    </View>
                    <View style={{ display: currentStep === 3 ? 'flex' : 'none' }}>
                        {renderStep3()}
                    </View>
                    <View style={{ display: currentStep === 4 ? 'flex' : 'none' }}>
                        {renderStep4()}
                    </View>

                    <View className="mt-5 border-t border-border pt-4">
                        <View className="mb-4 min-h-5">
                            <StepFeedback
                                validated={validatedSteps.includes(currentStep)}
                                hasError={currentStepHasError}
                            />
                        </View>

                        {currentStep < STEPS.length ? (
                            <View className={isWide ? 'flex-row justify-between gap-3' : 'gap-3'}>
                                {currentStep > 1 ? (
                                    <Button
                                        label="Back"
                                        variant="outline"
                                        onPress={goBack}
                                        disabled={busy}
                                        className={isWide ? 'min-w-32' : 'w-full'}
                                    />
                                ) : (
                                    <View />
                                )}
                                <Button
                                    label="Continue"
                                    onPress={goNext}
                                    disabled={busy}
                                    className={isWide ? 'min-w-40' : 'w-full'}
                                />
                            </View>
                        ) : (
                            <View>
                                <Button
                                    label="Back"
                                    variant="outline"
                                    onPress={goBack}
                                    disabled={busy}
                                    className="mb-3 w-full"
                                />
                                <Button
                                    label="Submit permit"
                                    onPress={() => void submitForm()}
                                    loading={busy}
                                    disabled={busy}
                                    className="w-full"
                                />
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}