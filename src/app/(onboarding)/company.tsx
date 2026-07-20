import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Location from 'expo-location';
import { LucideBuilding2, LucideHardHat, LucideMapPin, LucideCheckCircle2 } from 'lucide-react-native';
import { KeyboardAwareScreen } from '../../components/ui/keyboard-aware-screen';
import { StepIndicator } from '../../components/ui/step-indicator';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/api';
import { useOnboarding } from '../../lib/onboarding-store';
import { useAuth } from '../../lib/auth-store';
import { createCompanySchema, createProjectSchema } from '../../schemas/index';

// ✅ Use the shared schemas directly
type CompanyFormData = z.infer<typeof createCompanySchema>;
type ProjectFormData = z.infer<typeof createProjectSchema>;

// ✅ For mobile, create a separate schema for the form with string lat/lng
// This is only for the form - we'll convert when submitting
const mobileProjectFormSchema = z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters'),
    description: z.string().optional(),
    address: z.string().min(5, 'Address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
    companyId: z.string().uuid('Invalid company ID').optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
});

type MobileProjectFormData = z.infer<typeof mobileProjectFormSchema>;

const STEPS = [
    { number: 1, title: 'Company' },
    { number: 2, title: 'Project' },
];

export default function CompanyOnboardingScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const {
        hasCompany, companyId, hasProject,
        setCompanyCreated, setProjectCreated,
        isChecking, checkOnboardingStatus, checked,
    } = useOnboarding();

    const [currentStep, setCurrentStep] = useState(1);
    const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(companyId);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [existingCompanyName, setExistingCompanyName] = useState<string | null>(null);
    const [fetchingCompany, setFetchingCompany] = useState(false);

    useEffect(() => {
        if (!checked && user) {
            checkOnboardingStatus(user);
        }
    }, []);

    // Handle back handler for Android
    useEffect(() => {
        const backAction = () => {
            if (currentStep === 2) {
                setCurrentStep(1);
                return true;
            } else {
                Alert.alert(
                    'Exit Onboarding?',
                    'Are you sure you want to exit onboarding? You will need to complete this to use the app.',
                    [
                        { text: 'Cancel', onPress: () => null, style: 'cancel' },
                        { text: 'Exit', onPress: () => BackHandler.exitApp() }
                    ]
                );
                return true;
            }
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [currentStep]);

    // If user already has a companyId, fetch the company
    useEffect(() => {
        const fetchExistingCompany = async (cId: string) => {
            setFetchingCompany(true);
            try {
                const response = await api.get(`/companies/${cId}`);
                const company = response.data.data;
                if (company) {
                    setCreatedCompanyId(cId);
                    setExistingCompanyName(company.name || 'Your Company');
                    setCompanyCreated(cId);
                    setCurrentStep(2);
                }
            } catch (err: any) {
                console.warn('Failed to fetch existing company:', err?.message);
            } finally {
                setFetchingCompany(false);
            }
        };

        if (hasCompany && companyId) {
            setCreatedCompanyId(companyId);
            fetchExistingCompany(companyId);
        } else if (user?.companyId && !hasCompany) {
            fetchExistingCompany(user.companyId);
        }
    }, [hasCompany, companyId, user?.companyId]);

    /* ──────────────── Company Form ──────────────── */
    const companyForm = useForm<CompanyFormData>({
        resolver: zodResolver(createCompanySchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            registrationNumber: '',
            gstNumber: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            contactEmail: '',
            contactPhone: '',
        },
    });

    const onSubmitCompany = async (data: CompanyFormData) => {
        try {
            // ✅ Clean empty optional strings
            const payload: any = {};

            Object.keys(data).forEach((key) => {
                const value = data[key as keyof CompanyFormData];
                if (value && value !== '') {
                    payload[key] = value;
                }
            });

            const response = await api.post('/onboarding/company', payload);

            if (response.data.success) {
                const newCompanyId = response.data.data?.id || response.data.data?.companyId;
                setCreatedCompanyId(newCompanyId);
                setExistingCompanyName(data.name);
                setCompanyCreated(newCompanyId);
                setCurrentStep(2);
            } else {
                Alert.alert('Error', response.data.error?.message || 'Failed to create company.');
            }
        } catch (err: any) {
            console.error('Company create error:', err);
            Alert.alert('Error', err.response?.data?.error?.message || 'Failed to create company.');
        }
    };

    /* ──────────────── Project Form ──────────────── */
    // ✅ Use the mobile form schema with string lat/lng
    const projectForm = useForm<MobileProjectFormData>({
        resolver: zodResolver(mobileProjectFormSchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            description: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            latitude: '',
            longitude: '',
            companyId: createdCompanyId || '',
        },
    });

    useEffect(() => {
        if (createdCompanyId) {
            projectForm.setValue('companyId', createdCompanyId);
        }
    }, [createdCompanyId]);

    const onSubmitProject = async (data: MobileProjectFormData) => {
        if (!createdCompanyId) {
            Alert.alert('Error', 'Company ID is missing. Please go back and create a company first.');
            return;
        }

        try {
            // ✅ Prepare payload with proper types for the API
            const payload: any = {
                name: data.name,
                address: data.address,
                city: data.city,
                state: data.state,
                pincode: data.pincode,
                companyId: createdCompanyId,
            };

            // ✅ Add optional fields if present
            if (data.description) payload.description = data.description;

            // ✅ Convert lat/lng from string to number
            if (data.latitude && data.latitude.trim() !== '') {
                const lat = parseFloat(data.latitude);
                if (!isNaN(lat) && lat >= -90 && lat <= 90) {
                    payload.latitude = lat;
                }
            }

            if (data.longitude && data.longitude.trim() !== '') {
                const lng = parseFloat(data.longitude);
                if (!isNaN(lng) && lng >= -180 && lng <= 180) {
                    payload.longitude = lng;
                }
            }

            const response = await api.post('/projects', payload);

            if (response.data.success) {
                setProjectCreated();
                Alert.alert(
                    'Setup Complete! 🎉',
                    'Your company and project have been created successfully.',
                    [{ text: 'Continue', onPress: () => router.replace('/(tabs)/dashboard') }]
                );
            } else {
                Alert.alert('Error', response.data.error?.message || 'Failed to create project.');
            }
        } catch (err: any) {
            console.error('Project create error:', err);
            Alert.alert('Error', err.response?.data?.error?.message || 'Failed to create project.');
        }
    };

    const handleUseCurrentLocation = async () => {
        setFetchingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
                return;
            }

            const positionPromise = Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const timeoutPromise = new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('Location request timed out. Please enter manually.')), 10000)
            );

            const location = await Promise.race([positionPromise, timeoutPromise]);

            if (location && location.coords) {
                // ✅ Set as strings for the form
                projectForm.setValue('latitude', location.coords.latitude.toFixed(6));
                projectForm.setValue('longitude', location.coords.longitude.toFixed(6));

                Alert.alert(
                    'Location Fetched',
                    `Latitude: ${location.coords.latitude.toFixed(6)}\nLongitude: ${location.coords.longitude.toFixed(6)}`,
                    [{ text: 'OK' }]
                );
            } else {
                throw new Error('Could not fetch location coordinates.');
            }
        } catch (err: any) {
            console.error('Location error:', err);
            Alert.alert('Location Timeout / Error', err.message || 'Unable to get current location. Please enter coordinates manually.');
        } finally {
            setFetchingLocation(false);
        }
    };

    if (isChecking || fetchingCompany) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                <Text className="text-muted-foreground mt-3">
                    {fetchingCompany ? 'Loading company details…' : 'Loading…'}
                </Text>
            </View>
        );
    }

    // ✅ Check if forms are valid
    const isCompanyValid = companyForm.formState.isValid && !companyForm.formState.isSubmitting;
    const isProjectValid = projectForm.formState.isValid && !projectForm.formState.isSubmitting;

    return (
        <KeyboardAwareScreen className="flex-1 bg-background" scrollable>
            <StepIndicator steps={STEPS} currentStep={currentStep} />

            <View className="flex-1 px-6 pt-4 pb-8">
                {currentStep === 1 ? (
                    /* ═══════════ Step 1: Company Form ═══════════ */
                    <View>
                        <View className="items-center mb-6">
                            <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                                <LucideBuilding2 size={28} color="hsl(325 45% 32%)" />
                            </View>
                            <Text className="text-xl font-bold text-foreground text-center">
                                Setup Your Company
                            </Text>
                            <Text className="text-muted-foreground text-center mt-1">
                                Create your company profile to manage projects and permits
                            </Text>
                        </View>

                        <Controller
                            control={companyForm.control}
                            name="name"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Company Name *"
                                    placeholder="Enter company name"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={error?.message}
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="gstNumber"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="GST Number"
                                    placeholder="Enter GST number"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={error?.message}
                                    autoCapitalize="characters"
                                    helperText="Optional"
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="registrationNumber"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Registration Number"
                                    placeholder="Enter registration number"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={error?.message}
                                    helperText="Optional"
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="contactEmail"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Contact Email"
                                    placeholder="company@example.com"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={error?.message}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    helperText="Optional"
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="contactPhone"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Contact Phone"
                                    placeholder="+91XXXXXXXXXX"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={error?.message}
                                    keyboardType="phone-pad"
                                    helperText="Optional"
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="address"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Address"
                                    placeholder="Enter address"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={error?.message}
                                    helperText="Optional"
                                />
                            )}
                        />

                        <View className="flex-row gap-2">
                            <View className="flex-1">
                                <Controller
                                    control={companyForm.control}
                                    name="city"
                                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                        <Input
                                            label="City"
                                            placeholder="City"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={error?.message}
                                            helperText="Optional"
                                        />
                                    )}
                                />
                            </View>
                            <View className="flex-1">
                                <Controller
                                    control={companyForm.control}
                                    name="state"
                                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                        <Input
                                            label="State"
                                            placeholder="State"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={error?.message}
                                            helperText="Optional"
                                        />
                                    )}
                                />
                            </View>
                        </View>

                        <Controller
                            control={companyForm.control}
                            name="pincode"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Pincode"
                                    placeholder="6-digit pincode"
                                    onBlur={onBlur}
                                    onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                                    value={value || ''}
                                    error={error?.message}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    helperText="Optional - enter a valid 6-digit PIN code if provided"
                                />
                            )}
                        />

                        <Button
                            label={companyForm.formState.isSubmitting ? 'Creating Company…' : 'Create Company & Continue'}
                            onPress={companyForm.handleSubmit(onSubmitCompany)}
                            loading={companyForm.formState.isSubmitting}
                            disabled={!isCompanyValid}
                            className="mt-4"
                        />
                    </View>
                ) : (
                    /* ═══════════ Step 2: Project Form ═══════════ */
                    <View>
                        {existingCompanyName && (
                            <View className="flex-row items-center bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 mb-4">
                                <LucideCheckCircle2 size={20} color="#16a34a" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-green-800 dark:text-green-200 font-semibold text-sm">
                                        Company: {existingCompanyName}
                                    </Text>
                                    <Text className="text-green-600 dark:text-green-400 text-xs mt-0.5">
                                        Company already set up — now create your first project
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View className="items-center mb-6">
                            <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                                <LucideHardHat size={28} color="hsl(325 45% 32%)" />
                            </View>
                            <Text className="text-xl font-bold text-foreground text-center">
                                Create Your First Project
                            </Text>
                            <Text className="text-muted-foreground text-center mt-1">
                                Add a project site to start creating permits
                            </Text>
                        </View>

                        <Controller
                            control={projectForm.control}
                            name="name"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Project Name *"
                                    placeholder="Enter project name"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={error?.message}
                                />
                            )}
                        />

                        <Controller
                            control={projectForm.control}
                            name="description"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Project Description"
                                    placeholder="Brief description of the project"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={error?.message}
                                    multiline
                                    numberOfLines={3}
                                    helperText="Optional"
                                />
                            )}
                        />

                        <Controller
                            control={projectForm.control}
                            name="address"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Site Address *"
                                    placeholder="Full site address"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={error?.message}
                                />
                            )}
                        />

                        <View className="flex-row gap-2">
                            <View className="flex-1">
                                <Controller
                                    control={projectForm.control}
                                    name="city"
                                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                        <Input
                                            label="City *"
                                            placeholder="City"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            error={error?.message}
                                        />
                                    )}
                                />
                            </View>
                            <View className="flex-1">
                                <Controller
                                    control={projectForm.control}
                                    name="state"
                                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                        <Input
                                            label="State *"
                                            placeholder="State"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            error={error?.message}
                                        />
                                    )}
                                />
                            </View>
                        </View>

                        <Controller
                            control={projectForm.control}
                            name="pincode"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <Input
                                    label="Pincode *"
                                    placeholder="6-digit pincode"
                                    onBlur={onBlur}
                                    onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                                    value={value}
                                    error={error?.message}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    helperText="Enter a valid 6-digit PIN code"
                                />
                            )}
                        />

                        {/* Location fields */}
                        <View className="flex-row gap-2">
                            <View className="flex-1">
                                <Controller
                                    control={projectForm.control}
                                    name="latitude"
                                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                        <Input
                                            label="Latitude"
                                            placeholder="e.g. 28.4595"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={error?.message}
                                            keyboardType="numeric"
                                            helperText="Optional - between -90 and 90"
                                        />
                                    )}
                                />
                            </View>
                            <View className="flex-1">
                                <Controller
                                    control={projectForm.control}
                                    name="longitude"
                                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                        <Input
                                            label="Longitude"
                                            placeholder="e.g. 77.0266"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={error?.message}
                                            keyboardType="numeric"
                                            helperText="Optional - between -180 and 180"
                                        />
                                    )}
                                />
                            </View>
                        </View>

                        <Button
                            label={fetchingLocation ? 'Fetching Location…' : '📍 Use Current Location'}
                            onPress={handleUseCurrentLocation}
                            variant="outline"
                            loading={fetchingLocation}
                            className="mb-4"
                        />

                        <Button
                            label={projectForm.formState.isSubmitting ? 'Creating Project…' : 'Create Project & Finish'}
                            onPress={projectForm.handleSubmit(onSubmitProject)}
                            loading={projectForm.formState.isSubmitting}
                            disabled={!isProjectValid}
                            className="mt-2"
                        />
                    </View>
                )}
            </View>
        </KeyboardAwareScreen>
    );
}