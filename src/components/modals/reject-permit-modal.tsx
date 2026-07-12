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
import { useRejectPermit } from '../../hooks/use-admin-permits';

interface RejectPermitModalProps {
    visible: boolean;
    onClose: () => void;
    permitId: string;
    onSuccess: () => void;
}

export default function RejectPermitModal({
    visible,
    onClose,
    permitId,
    onSuccess,
}: RejectPermitModalProps) {
    const [reason, setReason] = useState('');
    const rejectMutation = useRejectPermit();

    const handleReject = async () => {
        try {
            if (!reason.trim()) {
                // Toast will show error from hook
                return;
            }

            if (reason.trim().length < 10) {
                // Toast will show error from hook
                return;
            }

            await rejectMutation.mutateAsync({
                id: permitId,
                data: { reason: reason.trim() },
            });

            setReason('');
            onClose();
            onSuccess();
        } catch (error) {
            // Error is handled in the mutation
            console.error('Rejection error:', error);
        }
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

                    <Text className="text-xl font-bold text-error mb-2">
                        Reject Permit
                    </Text>
                    <Text className="text-sm text-muted-foreground mb-4">
                        Please provide a detailed reason for rejection
                    </Text>

                    <Text className="text-sm font-medium text-foreground mb-2">
                        Reason for Rejection
                    </Text>
                    <TextInput
                        className="bg-input text-foreground p-4 rounded-lg border border-border mb-4"
                        placeholder="Enter detailed reason (min 10 characters)..."
                        placeholderTextColor="#9ca3af"
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        editable={!rejectMutation.isPending}
                    />

                    <View className="flex-row gap-3 mt-2">
                        <TouchableOpacity
                            className="flex-1 bg-error py-3 rounded-xl"
                            onPress={handleReject}
                            disabled={rejectMutation.isPending}
                        >
                            <Text className="text-white font-semibold text-center">
                                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 bg-muted py-3 rounded-xl"
                            onPress={onClose}
                            disabled={rejectMutation.isPending}
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