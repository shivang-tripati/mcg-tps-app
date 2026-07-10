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

/* ────────────────────────────────────────────
   Schema for mobile company form (required fields adjusted)
   ──────────────────────────────────────────── */
const mobileCompanySchema = z.object({
    name: z.string().min(2, 'Company name is required'),
    gstNumber: z.string().optional(),
    registrationNumber: z.string().optional(),
    contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

const mobileProjectSchema = z.object({
    name: z.string().min(2, 'Project name is required'),
    address: z.string().min(5, 'Site address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
});

type CompanyFormData = z.infer<typeof mobileCompanySchema>;
type ProjectFormData = z.infer<typeof mobileProjectSchema>;

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
                // Let user go back to step 1 (editing company)
                setCurrentStep(1);
                return true; // handled
            } else {
                Alert.alert(
                    'Exit Onboarding?',
                    'Are you sure you want to exit onboarding? You will need to complete this to use the app.',
                    [
                        { text: 'Cancel', onPress: () => null, style: 'cancel' },
                        { text: 'Exit', onPress: () => BackHandler.exitApp() }
                    ]
                );
                return true; // handled
            }
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [currentStep]);

    // If user already has a companyId (from auth), fetch the company
    // to confirm it exists and skip directly to the project step
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
                // Company doesn't exist or API error — stay on step 1
            } finally {
                setFetchingCompany(false);
            }
        };

        // Check from onboarding store first
        if (hasCompany && companyId) {
            setCreatedCompanyId(companyId);
            fetchExistingCompany(companyId);
        }
        // Also check directly from user object (covers case where
        // onboarding store hasn't been populated yet)
        else if (user?.companyId && !hasCompany) {
            fetchExistingCompany(user.companyId);
        }
    }, [hasCompany, companyId, user?.companyId]);

    /* ──────────────── Company Form ──────────────── */
    const companyForm = useForm<CompanyFormData>({
        resolver: zodResolver(mobileCompanySchema),
        defaultValues: {
            name: '', gstNumber: '', registrationNumber: '',
            contactEmail: '', contactPhone: '', address: '',
            city: '', state: '', pincode: '',
        },
    });

    const onSubmitCompany = async (data: CompanyFormData) => {
        try {
            // Clean empty optional strings
            const payload: any = { ...data };
            for (const key of ['gstNumber', 'registrationNumber', 'contactEmail', 'contactPhone', 'address']) {
                if (!payload[key] || payload[key].trim() === '') delete payload[key];
            }

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
    const projectForm = useForm<ProjectFormData>({
        resolver: zodResolver(mobileProjectSchema),
        defaultValues: {
            name: '', address: '', city: '', state: '', pincode: '',
            latitude: '', longitude: '',
        },
    });

    const onSubmitProject = async (data: ProjectFormData) => {
        if (!createdCompanyId) {
            Alert.alert('Error', 'Company ID is missing. Please go back and create a company first.');
            return;
        }

        try {
            const { latitude: latStr, longitude: lngStr, ...rest } = data;
            const payload: any = {
                ...rest,
                companyId: createdCompanyId,
            };
            // Convert lat/lng strings to numbers if provided
            if (latStr && latStr.trim() !== '') {
                const lat = parseFloat(latStr);
                if (!isNaN(lat) && lat >= -90 && lat <= 90) payload.latitude = lat;
            }
            if (lngStr && lngStr.trim() !== '') {
                const lng = parseFloat(lngStr);
                if (!isNaN(lng) && lng >= -180 && lng <= 180) payload.longitude = lng;
            }

            const response = await api.post('/projects', payload);

            if (response.data.success) {
                setProjectCreated();
                Alert.alert(
                    'Setup Complete!',
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

            // Wrap getCurrentPositionAsync in a 10s timeout
            const positionPromise = Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const timeoutPromise = new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('Location request timed out. Please enter manually.')), 10000)
            );

            const location = await Promise.race([positionPromise, timeoutPromise]);

            if (location && location.coords) {
                projectForm.setValue('latitude', location.coords.latitude.toFixed(6));
                projectForm.setValue('longitude', location.coords.longitude.toFixed(6));
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

    return (
        <KeyboardAwareScreen className="flex-1 bg-background" scrollable >
            {/* Step Indicator */}
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
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Company Name *"
                                    placeholder="Enter company name"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={companyForm.formState.errors.name?.message}
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="gstNumber"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="GST Number"
                                    placeholder="Enter GST number"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={companyForm.formState.errors.gstNumber?.message}
                                    autoCapitalize="characters"
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="registrationNumber"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Registration Number"
                                    placeholder="Enter registration number"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={companyForm.formState.errors.registrationNumber?.message}
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="contactEmail"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Contact Email"
                                    placeholder="company@example.com"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={companyForm.formState.errors.contactEmail?.message}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="contactPhone"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Contact Phone"
                                    placeholder="+91XXXXXXXXXX"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={companyForm.formState.errors.contactPhone?.message}
                                    keyboardType="phone-pad"
                                />
                            )}
                        />

                        <Controller
                            control={companyForm.control}
                            name="address"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Address Line 1"
                                    placeholder="Enter address"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value || ''}
                                    error={companyForm.formState.errors.address?.message}
                                />
                            )}
                        />

                        <View className="flex-row space-x-2">
                            <View className="flex-1">
                                <Controller
                                    control={companyForm.control}
                                    name="city"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="City *"
                                            placeholder="City"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            error={companyForm.formState.errors.city?.message}
                                        />
                                    )}
                                />
                            </View>
                            <View className="flex-1">
                                <Controller
                                    control={companyForm.control}
                                    name="state"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="State *"
                                            placeholder="State"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            error={companyForm.formState.errors.state?.message}
                                        />
                                    )}
                                />
                            </View>
                        </View>

                        <Controller
                            control={companyForm.control}
                            name="pincode"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Pincode *"
                                    placeholder="6-digit pincode"
                                    onBlur={onBlur}
                                    onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                                    value={value}
                                    error={companyForm.formState.errors.pincode?.message}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                            )}
                        />

                        <Button
                            label={companyForm.formState.isSubmitting ? 'Creating Company…' : 'Create Company & Continue'}
                            onPress={companyForm.handleSubmit(onSubmitCompany)}
                            loading={companyForm.formState.isSubmitting}
                            className="mt-4"
                        />
                    </View>
                ) : (
                    /* ═══════════ Step 2: Project Form ═══════════ */
                    <View>
                        {/* Company info banner when resuming after a failed project creation */}
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
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Project Name *"
                                    placeholder="Enter project name"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={projectForm.formState.errors.name?.message}
                                />
                            )}
                        />

                        <Controller
                            control={projectForm.control}
                            name="address"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Site Address *"
                                    placeholder="Full site address"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={projectForm.formState.errors.address?.message}
                                />
                            )}
                        />

                        <View className="flex-row space-x-2">
                            <View className="flex-1">
                                <Controller
                                    control={projectForm.control}
                                    name="city"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="City *"
                                            placeholder="City"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            error={projectForm.formState.errors.city?.message}
                                        />
                                    )}
                                />
                            </View>
                            <View className="flex-1">
                                <Controller
                                    control={projectForm.control}
                                    name="state"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="State *"
                                            placeholder="State"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            error={projectForm.formState.errors.state?.message}
                                        />
                                    )}
                                />
                            </View>
                        </View>

                        <Controller
                            control={projectForm.control}
                            name="pincode"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    label="Pincode *"
                                    placeholder="6-digit pincode"
                                    onBlur={onBlur}
                                    onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                                    value={value}
                                    error={projectForm.formState.errors.pincode?.message}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                            )}
                        />

                        {/* Location fields */}
                        <View className="flex-row space-x-2">
                            <View className="flex-1">
                                <Controller
                                    control={projectForm.control}
                                    name="latitude"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Latitude"
                                            placeholder="e.g. 28.4595"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={projectForm.formState.errors.latitude?.message}
                                            keyboardType="numeric"
                                        />
                                    )}
                                />
                            </View>
                            <View className="flex-1">
                                <Controller
                                    control={projectForm.control}
                                    name="longitude"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <Input
                                            label="Longitude"
                                            placeholder="e.g. 77.0266"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value || ''}
                                            error={projectForm.formState.errors.longitude?.message}
                                            keyboardType="numeric"
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
                            className="mt-2"
                        />
                    </View>
                )}
            </View>
        </KeyboardAwareScreen>
    );
}
