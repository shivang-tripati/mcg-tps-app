import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LucideShieldCheck, LucideFileCheck2 } from 'lucide-react-native';
import { KeyboardAwareScreen } from '../../components/ui/keyboard-aware-screen';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { FileUpload, UploadedFile } from '../../components/ui/file-upload';
import { api } from '../../lib/api';
import { useOnboarding } from '../../lib/onboarding-store';
import { useAuth } from '../../lib/auth-store';

// ✅ Proper Aadhaar Validation
const aadhaarSchema = z.object({
    documentNumber: z
        .string()
        .min(1, 'Aadhaar number is required')
        .regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits')
        .refine((val) => {
            return val.length === 12 && /^\d+$/.test(val);
        }, 'Invalid Aadhaar number format'),
});

// ✅ Proper PAN Validation
const panSchema = z.object({
    documentNumber: z
        .string()
        .min(1, 'PAN number is required')
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format. Format: ABCDE1234F')
        .refine((val) => {
            return val.length === 10;
        }, 'PAN must be exactly 10 characters'),
});

type AadhaarFormData = z.infer<typeof aadhaarSchema>;
type PanFormData = z.infer<typeof panSchema>;

interface DocumentCardProps {
    title: string;
    icon: React.ReactNode;
    docType: 'AADHAAR' | 'PAN';
    existingDoc: any | null;
    isUploaded: boolean;
    onSaved: (doc: any) => void;
}

function DocumentCard({ title, icon, docType, existingDoc, isUploaded, onSaved }: DocumentCardProps) {
    const schema = docType === 'AADHAAR' ? aadhaarSchema : panSchema;
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
    const [saving, setSaving] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    const { 
        control, 
        handleSubmit, 
        formState: { errors, isValid }, 
        setValue,
        watch,
        trigger,
    } = useForm<{ documentNumber: string }>({
        resolver: zodResolver(schema),
        mode: 'onChange',
        defaultValues: {
            documentNumber: existingDoc?.documentNumber || '',
        },
    });

    const documentNumber = watch('documentNumber');

    useEffect(() => {
        if (existingDoc?.documentNumber) {
            setValue('documentNumber', existingDoc.documentNumber);
        }
    }, [existingDoc]);

    useEffect(() => {
        if (documentNumber && documentNumber.length > 0) {
            trigger('documentNumber');
        }
    }, [documentNumber, trigger]);

    const validateDocument = async (number: string): Promise<boolean> => {
        setIsValidating(true);
        try {
            if (docType === 'AADHAAR') {
                if (number.startsWith('0') || number.startsWith('1')) {
                    Alert.alert('Invalid Aadhaar', 'Aadhaar number should not start with 0 or 1');
                    return false;
                }
                
                const sum = number.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
                if (sum < 10) {
                    Alert.alert('Invalid Aadhaar', 'Please enter a valid Aadhaar number');
                    return false;
                }
            }

            if (docType === 'PAN') {
                const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
                if (!panRegex.test(number)) {
                    Alert.alert('Invalid PAN', 'Please enter a valid PAN number (e.g., ABCDE1234F)');
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Validation error:', error);
            return false;
        } finally {
            setIsValidating(false);
        }
    };

    const onSubmit = async (data: { documentNumber: string }) => {
        if (!uploadedFile?.serverPath && !existingDoc) {
            Alert.alert('Missing File', 'Please upload a document file first.');
            return;
        }

        const isValid = await validateDocument(data.documentNumber);
        if (!isValid) {
            return;
        }

        setSaving(true);
        try {
            const payload: any = {
                type: docType,
                documentNumber: data.documentNumber,
            };
            if (uploadedFile?.serverPath) {
                payload.filePath = uploadedFile.serverPath;
            }

            const response = await api.post('/profile/identity', payload);

            if (response.data.success) {
                onSaved(response.data.data);
                Alert.alert('Success', `${title} details verified and saved successfully.`);
            } else {
                Alert.alert('Error', response.data.error?.message || 'Failed to save document.');
            }
        } catch (err: any) {
            console.error(`Save ${docType} error:`, err);
            const errorMessage = err.response?.data?.error?.message || 
                               err.response?.data?.message || 
                               'Failed to save document.';
            Alert.alert('Error', errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const getValidationStatus = () => {
        if (!documentNumber) return null;
        if (errors.documentNumber) return 'error';
        if (documentNumber.length > 0 && isValid) return 'valid';
        return null;
    };

    const validationStatus = getValidationStatus();

    return (
        <View className="bg-card border border-border rounded-xl p-4 mb-4">
            {/* Header */}
            <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    {icon}
                </View>
                <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{title}</Text>
                    {isUploaded && (
                        <View className="flex-row items-center mt-0.5">
                            <LucideFileCheck2 size={14} color="hsl(142 72% 29%)" />
                            <Text className="text-xs text-success ml-1">Verified & Uploaded</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Document Number Input */}
            <Controller
                control={control}
                name="documentNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                        <Input
                            label={docType === 'AADHAAR' ? 'Aadhaar Number' : 'PAN Number'}
                            placeholder={docType === 'AADHAAR' 
                                ? 'Enter 12-digit Aadhaar' 
                                : 'Enter PAN (e.g. ABCDE1234F)'}
                            onBlur={onBlur}
                            onChangeText={(text) => {
                                if (docType === 'PAN') {
                                    onChange(text.toUpperCase());
                                } else {
                                    onChange(text.replace(/\D/g, ''));
                                }
                            }}
                            value={value}
                            error={errors.documentNumber?.message}
                            keyboardType={docType === 'AADHAAR' ? 'number-pad' : 'default'}
                            maxLength={docType === 'AADHAAR' ? 12 : 10}
                            autoCapitalize={docType === 'PAN' ? 'characters' : 'none'}
                            editable={!isUploaded}
                        />
                        {/* ✅ Show validation status below the input */}
                        {!isUploaded && value && value.length > 0 && (
                            <View className="flex-row items-center mt-1">
                                {isValidating ? (
                                    <ActivityIndicator size="small" color="hsl(325 45% 32%)" />
                                ) : errors.documentNumber ? (
                                    <Text className="text-error text-xs">✕ Invalid format</Text>
                                ) : isValid ? (
                                    <Text className="text-success text-xs">✓ Valid format</Text>
                                ) : null}
                            </View>
                        )}
                    </View>
                )}
            />

            {/* Helper text for PAN format */}
            {docType === 'PAN' && !isUploaded && (
                <Text className="text-xs text-muted-foreground mt-1">
                    Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
                </Text>
            )}

            {/* Helper text for Aadhaar format */}
            {docType === 'AADHAAR' && !isUploaded && (
                <Text className="text-xs text-muted-foreground mt-1">
                    Enter 12-digit Aadhaar number (e.g., 123456789012)
                </Text>
            )}

            {/* File Upload */}
            {!isUploaded && (
                <FileUpload
                    label="Upload Document"
                    accept={[
                        'image/*',
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    ]}
                    onUpload={(file) => setUploadedFile(file)}
                    onRemove={() => setUploadedFile(null)}
                    disabled={isUploaded}
                />
            )}

            {/* Save Button */}
            {!isUploaded && (
                <Button
                    label={saving ? 'Validating & Saving…' : 'Save & Verify'}
                    onPress={handleSubmit(onSubmit)}
                    loading={saving}
                    disabled={!isValid || !uploadedFile?.serverPath}
                    variant="outline"
                    className="mt-1"
                />
            )}

            {/* Show validation requirement */}
            {!isUploaded && (
                <View className="mt-2">
                    {!uploadedFile?.serverPath && (
                        <Text className="text-xs text-muted-foreground">
                            ⚠️ Please upload a document before saving
                        </Text>
                    )}
                    {uploadedFile?.serverPath && !isValid && documentNumber && (
                        <Text className="text-xs text-error">
                            ⚠️ Please enter a valid {docType === 'AADHAAR' ? 'Aadhaar' : 'PAN'} number
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

export default function IndividualOnboardingScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const {
        hasAadhaar, hasPAN,
        aadhaarDoc, panDoc,
        setDocumentUploaded,
        isChecking,
        checkOnboardingStatus,
        checked,
    } = useOnboarding();

    useEffect(() => {
        if (!checked && user) {
            checkOnboardingStatus(user);
        }
    }, []);

    // Handle back handler for Android
    useEffect(() => {
        const backAction = () => {
            Alert.alert(
                'Exit Onboarding?',
                'Are you sure you want to exit onboarding? You will need to complete this to use the app.',
                [
                    { text: 'Cancel', onPress: () => null, style: 'cancel' },
                    { text: 'Exit', onPress: () => BackHandler.exitApp() }
                ]
            );
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, []);

    const bothUploaded = hasAadhaar && hasPAN;

    const handleContinue = () => {
        router.replace('/(tabs)/dashboard');
    };

    if (isChecking) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
                <Text className="text-muted-foreground mt-3">Checking verification status…</Text>
            </View>
        );
    }

    return (
        <KeyboardAwareScreen className="flex-1 bg-background" scrollable>
            <View className="flex-1 px-6 pt-6 pb-8">
                {/* Header */}
                <View className="items-center mb-6">
                    <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-3">
                        <LucideShieldCheck size={32} color="hsl(325 45% 32%)" />
                    </View>
                    <Text className="text-2xl font-bold text-foreground text-center">
                        Identity Verification
                    </Text>
                    <Text className="text-muted-foreground text-center mt-1 px-4">
                        Please upload your identity documents to get started with the platform
                    </Text>
                </View>

                {/* Progress indicator */}
                <View className="flex-row items-center justify-center mb-6 space-x-2">
                    <View className={`h-2 flex-1 rounded-full ${hasAadhaar ? 'bg-success' : 'bg-muted'}`} />
                    <View className={`h-2 flex-1 rounded-full ${hasPAN ? 'bg-success' : 'bg-muted'}`} />
                </View>
                <Text className="text-center text-sm text-muted-foreground mb-6">
                    {bothUploaded
                        ? '✓ Both documents verified'
                        : `${(hasAadhaar ? 1 : 0) + (hasPAN ? 1 : 0)} of 2 documents uploaded`}
                </Text>

                {/* Aadhaar Card */}
                <DocumentCard
                    title="Aadhaar Card"
                    icon={<LucideShieldCheck size={20} color="hsl(325 45% 32%)" />}
                    docType="AADHAAR"
                    existingDoc={aadhaarDoc}
                    isUploaded={hasAadhaar}
                    onSaved={(doc) => setDocumentUploaded('AADHAAR', doc)}
                />

                {/* PAN Card */}
                <DocumentCard
                    title="PAN Card"
                    icon={<LucideShieldCheck size={20} color="hsl(325 45% 32%)" />}
                    docType="PAN"
                    existingDoc={panDoc}
                    isUploaded={hasPAN}
                    onSaved={(doc) => setDocumentUploaded('PAN', doc)}
                />

                {/* Continue */}
                <Button
                    label="Continue to Dashboard"
                    onPress={handleContinue}
                    disabled={!bothUploaded}
                    className="mt-4"
                />
            </View>
        </KeyboardAwareScreen>
    );
}