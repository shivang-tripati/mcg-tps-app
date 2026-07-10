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

const aadhaarSchema = z.object({
    documentNumber: z
        .string()
        .min(12, 'Aadhaar number must be 12 digits')
        .max(12, 'Aadhaar number must be 12 digits')
        .regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
});

const panSchema = z.object({
    documentNumber: z
        .string()
        .min(10, 'PAN must be 10 characters')
        .max(10, 'PAN must be 10 characters')
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g. ABCDE1234F)'),
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

    const { control, handleSubmit, formState: { errors }, setValue } = useForm<{ documentNumber: string }>({
        resolver: zodResolver(schema),
        defaultValues: {
            documentNumber: existingDoc?.documentNumber || '',
        },
    });

    useEffect(() => {
        if (existingDoc?.documentNumber) {
            setValue('documentNumber', existingDoc.documentNumber);
        }
    }, [existingDoc]);

    const onSubmit = async (data: { documentNumber: string }) => {
        if (!uploadedFile?.serverPath && !existingDoc) {
            Alert.alert('Missing File', 'Please upload a document file first.');
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
                Alert.alert('Saved', `${title} details saved successfully.`);
            } else {
                Alert.alert('Error', response.data.error?.message || 'Failed to save document.');
            }
        } catch (err: any) {
            console.error(`Save ${docType} error:`, err);
            Alert.alert('Error', err.response?.data?.error?.message || 'Failed to save document.');
        } finally {
            setSaving(false);
        }
    };

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
                    <Input
                        label={docType === 'AADHAAR' ? 'Aadhaar Number' : 'PAN Number'}
                        placeholder={docType === 'AADHAAR' ? 'Enter 12-digit Aadhaar' : 'Enter PAN (e.g. ABCDE1234F)'}
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
                )}
            />

            {/* File Upload */}
            {!isUploaded && (
                <FileUpload
                    label="Upload Document"
                    onUpload={(file) => setUploadedFile(file)}
                    onRemove={() => setUploadedFile(null)}
                    disabled={isUploaded}
                />
            )}

            {/* Save Button */}
            {!isUploaded && (
                <Button
                    label={saving ? 'Saving…' : 'Save'}
                    onPress={handleSubmit(onSubmit)}
                    loading={saving}
                    variant="outline"
                    className="mt-1"
                />
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
            return true; // handled
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
