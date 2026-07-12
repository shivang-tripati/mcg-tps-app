import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApprovePermit } from '../../hooks/use-admin-permits';

interface ApprovePermitModalProps {
    visible: boolean;
    onClose: () => void;
    permitId: string;
    onSuccess: () => void;
}

export default function ApprovePermitModal({
    visible,
    onClose,
    permitId,
    onSuccess,
}: ApprovePermitModalProps) {
    // Set default validity: 24 hours from now
    const defaultValidFrom = new Date();
    const defaultValidUntil = new Date();
    defaultValidUntil.setHours(defaultValidUntil.getHours() + 24);

    const [validFrom, setValidFrom] = useState(defaultValidFrom);
    const [validUntil, setValidUntil] = useState(defaultValidUntil);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showUntilPicker, setShowUntilPicker] = useState(false);

    const approveMutation = useApprovePermit();

    const handleFromDateChange = (event: any, selectedDate?: Date) => {
        setShowFromPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setValidFrom(selectedDate);
            // If validUntil is before validFrom, update it
            if (validUntil <= selectedDate) {
                const newUntil = new Date(selectedDate);
                newUntil.setHours(newUntil.getHours() + 24);
                setValidUntil(newUntil);
            }
        }
    };

    const handleUntilDateChange = (event: any, selectedDate?: Date) => {
        setShowUntilPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setValidUntil(selectedDate);
        }
    };

    const handleApprove = async () => {
        try {
            // Validate dates
            if (!validFrom || !validUntil) {
                // Toast will show error from hook
                return;
            }

            // Check if dates are in the future
            if (validFrom < new Date()) {
                // Toast will show error from hook
                return;
            }

            if (validUntil <= validFrom) {
                // Toast will show error from hook
                return;
            }

            await approveMutation.mutateAsync({
                id: permitId,
                data: {
                    validFrom: validFrom.toISOString(),
                    validUntil: validUntil.toISOString(),
                },
            });

            onClose();
            onSuccess();
        } catch (error) {
            // Error is handled in the mutation
            console.error('Approval error:', error);
        }
    };

    const formatDateForDisplay = (date: Date): string => {
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-end bg-black/50"
            >
                <View className="bg-background rounded-t-2xl p-6 pb-8">
                    <View className="items-center mb-4">
                        <View className="w-12 h-1 rounded-full bg-muted" />
                    </View>

                    <Text className="text-xl font-bold text-foreground mb-2">
                        Approve Permit
                    </Text>
                    <Text className="text-sm text-muted-foreground mb-4">
                        Set the validity period for this permit
                    </Text>

                    {/* Valid From */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-2">
                            Valid From
                        </Text>
                        <TouchableOpacity
                            className="bg-input p-3 rounded-lg border border-border flex-row justify-between items-center"
                            onPress={() => setShowFromPicker(true)}
                        >
                            <Text className="text-foreground">
                                {formatDateForDisplay(validFrom)}
                            </Text>
                            <Text className="text-primary font-medium">Change</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Valid Until */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-2">
                            Valid Until
                        </Text>
                        <TouchableOpacity
                            className="bg-input p-3 rounded-lg border border-border flex-row justify-between items-center"
                            onPress={() => setShowUntilPicker(true)}
                        >
                            <Text className="text-foreground">
                                {formatDateForDisplay(validUntil)}
                            </Text>
                            <Text className="text-primary font-medium">Change</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date Pickers */}
                    {showFromPicker && (
                        <DateTimePicker
                            value={validFrom}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleFromDateChange}
                            minimumDate={new Date()}
                            themeVariant="light"
                        />
                    )}

                    {showUntilPicker && (
                        <DateTimePicker
                            value={validUntil}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleUntilDateChange}
                            minimumDate={validFrom}
                            themeVariant="light"
                        />
                    )}

                    {/* Buttons */}
                    <View className="flex-row gap-3 mt-4">
                        <TouchableOpacity
                            className="flex-1 bg-primary py-3 rounded-xl"
                            onPress={handleApprove}
                            disabled={approveMutation.isPending}
                        >
                            <Text className="text-white font-semibold text-center">
                                {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 bg-muted py-3 rounded-xl"
                            onPress={onClose}
                            disabled={approveMutation.isPending}
                        >
                            <Text className="text-foreground font-semibold text-center">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}