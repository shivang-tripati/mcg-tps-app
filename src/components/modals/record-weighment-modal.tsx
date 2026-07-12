import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRecordWeighment } from '../../hooks/use-admin-permits';
import { showToast } from '../../lib/toast';

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
    const [secondWeight, setSecondWeight] = useState('');
    const [notes, setNotes] = useState('');

    const recordWeighmentMutation = useRecordWeighment();

    const handleRecordWeighment = async () => {
        try {
            // Validate inputs
            if (!firstWeight || !secondWeight) {
                showToast.error('Error', 'Please enter both weights');
                return;
            }

            const first = parseFloat(firstWeight);
            const second = parseFloat(secondWeight);

            if (isNaN(first) || isNaN(second)) {
                showToast.error('Error', 'Please enter valid numbers');
                return;
            }

            if (first <= 0 || second <= 0) {
                showToast.error('Error', 'Weights must be greater than 0');
                return;
            }

            if (second >= first) {
                showToast.error('Error', 'Second weight must be less than first weight');
                return;
            }

            await recordWeighmentMutation.mutateAsync({
                permitId,
                plantId,
                firstWeight: first,
                secondWeight: second,
                notes: notes.trim() || undefined,
            });

            // Reset form
            setFirstWeight('');
            setSecondWeight('');
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
        setSecondWeight('');
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
                <View className="bg-background rounded-t-2xl p-6 pb-8">
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

                    {/* First Weight */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-2">
                            First Weight (kg)
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

                    {/* Second Weight */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-2">
                            Second Weight (kg)
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
                    <View className="flex-row gap-3 mt-2">
                        <TouchableOpacity
                            className="flex-1 bg-primary py-3 rounded-xl"
                            onPress={handleRecordWeighment}
                            disabled={recordWeighmentMutation.isPending}
                        >
                            <Text className="text-white font-semibold text-center">
                                {recordWeighmentMutation.isPending ? 'Saving...' : 'Save Weighment'}
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
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}