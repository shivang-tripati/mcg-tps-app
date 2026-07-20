import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRecordWeighment } from '../../hooks/use-admin-permits';
import { showToast } from '../../lib/toast';
import DateTimeFormField from '../../components/ui/date-time-from-field';

interface RecordWeighmentModalProps {
    visible: boolean;
    onClose: () => void;
    permitId: string;
    plantId: string;
    onSuccess: () => void;
}

export default function RecordWeighmentModal({
    visible,
    onClose,
    permitId,
    plantId,
    onSuccess,
}: RecordWeighmentModalProps) {
    const [firstWeight, setFirstWeight] = useState('');
    const [firstWeighmentAt, setFirstWeighmentAt] = useState('');
    const [secondWeight, setSecondWeight] = useState('');
    const [secondWeighmentAt, setSecondWeighmentAt] = useState('');
    const [notes, setNotes] = useState('');

    const recordWeighmentMutation = useRecordWeighment();

    const handleRecordWeighment = async () => {
        try {
            // Validate inputs - at least one weight required
            if (!firstWeight && !secondWeight) {
                showToast.error('Error', 'Please enter at least one weight');
                return;
            }

            // Validate first weight
            if (firstWeight) {
                const first = parseFloat(firstWeight);
                if (isNaN(first) || first <= 0) {
                    showToast.error('Error', 'First weight must be a positive number');
                    return;
                }
            }

            // Validate second weight
            if (secondWeight) {
                const second = parseFloat(secondWeight);
                if (isNaN(second) || second < 0) {
                    showToast.error('Error', 'Second weight must be a non-negative number');
                    return;
                }
            }

            // If both weights are provided, validate they are different
            if (firstWeight && secondWeight) {
                const first = parseFloat(firstWeight);
                const second = parseFloat(secondWeight);
                if (first === second) {
                    showToast.error('Error', 'First and second weights cannot be equal');
                    return;
                }
            }

            // Prepare payload
            const payload: any = {
                permitId,
                plantId,
                notes: notes.trim() || undefined,
            };

            if (firstWeight) {
                payload.firstWeight = parseFloat(firstWeight);
                if (firstWeighmentAt) {
                    payload.firstWeighmentAt = new Date(firstWeighmentAt).toISOString();
                }
            }

            if (secondWeight) {
                payload.secondWeight = parseFloat(secondWeight);
                if (secondWeighmentAt) {
                    payload.secondWeighmentAt = new Date(secondWeighmentAt).toISOString();
                }
            }

            await recordWeighmentMutation.mutateAsync(payload);

            // Reset form
            setFirstWeight('');
            setFirstWeighmentAt('');
            setSecondWeight('');
            setSecondWeighmentAt('');
            setNotes('');

            onClose();
            onSuccess();
            showToast.success('Success', 'Weighment recorded successfully');
        } catch (error) {
            // Error is handled in the mutation
            console.error('Weighment error:', error);
        }
    };

    const handleClose = () => {
        setFirstWeight('');
        setFirstWeighmentAt('');
        setSecondWeight('');
        setSecondWeighmentAt('');
        setNotes('');
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-end bg-black/50"
            >
                <View className="bg-background rounded-t-2xl p-6 pb-8 max-h-[90%] flex-1">
                    {/* Handle Bar */}
                    <View className="items-center mb-4">
                        <View className="w-12 h-1 rounded-full bg-muted" />
                    </View>

                    {/* Header */}
                    <Text className="text-xl font-bold text-foreground mb-2">
                        Record Weighment
                    </Text>
                    <Text className="text-sm text-muted-foreground mb-4">
                        Enter the weighment details for this permit
                    </Text>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        className="flex-1"
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        {/* First Weight */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-2">
                                First Weight (kg) <Text className="text-muted-foreground">(Optional)</Text>
                            </Text>
                            <TextInput
                                className="bg-input text-foreground p-3 rounded-lg border border-border"
                                placeholder="Enter first weight"
                                placeholderTextColor="#9ca3af"
                                keyboardType="decimal-pad"
                                value={firstWeight}
                                onChangeText={setFirstWeight}
                                editable={!recordWeighmentMutation.isPending}
                            />
                        </View>

                        {/* First Weighment At - DateTimePicker */}
                        {firstWeight ? (
                            <DateTimeFormField
                                label="First Weighment At"
                                value={firstWeighmentAt}
                                onChange={setFirstWeighmentAt}
                            />
                        ) : null}

                        {/* Second Weight */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-2">
                                Second Weight (kg) <Text className="text-muted-foreground">(Optional)</Text>
                            </Text>
                            <TextInput
                                className="bg-input text-foreground p-3 rounded-lg border border-border"
                                placeholder="Enter second weight"
                                placeholderTextColor="#9ca3af"
                                keyboardType="decimal-pad"
                                value={secondWeight}
                                onChangeText={setSecondWeight}
                                editable={!recordWeighmentMutation.isPending}
                            />
                        </View>

                        {/* Second Weighment At - DateTimePicker */}
                        {secondWeight ? (
                            <DateTimeFormField
                                label="Second Weighment At"
                                value={secondWeighmentAt}
                                onChange={setSecondWeighmentAt}
                            />
                        ) : null}

                        {/* Net Weight Preview */}
                        {firstWeight && secondWeight ? (
                            <View className="mb-4 p-3 bg-muted rounded-lg">
                                <Text className="text-sm text-muted-foreground">
                                    {(() => {
                                        const first = parseFloat(firstWeight);
                                        const second = parseFloat(secondWeight);
                                        if (!isNaN(first) && !isNaN(second) && first !== second) {
                                            const netWeight = Math.abs(second - first);
                                            return `Net weight: ${netWeight.toFixed(2)} kg`;
                                        }
                                        return 'Weights will be validated on submission';
                                    })()}
                                </Text>
                            </View>
                        ) : null}

                        {/* Notes */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-2">
                                Notes (Optional)
                            </Text>
                            <TextInput
                                className="bg-input text-foreground p-3 rounded-lg border border-border"
                                placeholder="Any observations..."
                                placeholderTextColor="#9ca3af"
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                editable={!recordWeighmentMutation.isPending}
                            />
                        </View>

                        {/* Actions */}
                        <View className="flex-row gap-3 mt-2 mb-4">
                            <TouchableOpacity
                                className="flex-1 bg-primary py-3 rounded-xl"
                                onPress={handleRecordWeighment}
                                disabled={recordWeighmentMutation.isPending || (!firstWeight && !secondWeight)}
                                style={{ opacity: recordWeighmentMutation.isPending || (!firstWeight && !secondWeight) ? 0.5 : 1 }}
                            >
                                <Text className="text-white font-semibold text-center">
                                    {recordWeighmentMutation.isPending ? 'Saving...' : 'Record Weighment'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-1 bg-muted py-3 rounded-xl"
                                onPress={handleClose}
                                disabled={recordWeighmentMutation.isPending}
                            >
                                <Text className="text-foreground font-semibold text-center">
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}