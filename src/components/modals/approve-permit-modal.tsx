import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from "react-native";


import { useApprovePermit } from "../../hooks/use-admin-permits";
import DateTimeFormField from "../ui/date-time-from-field";
import { parseDateTimeField } from "../../lib/utils";

interface ApprovePermitModalProps {
    visible: boolean;
    onClose: () => void;
    permitId: string;
    initialValidFrom: string;
    initialValidUntil: string;
    onSuccess: () => void;
}

export default function ApprovePermitModal({
    visible,
    onClose,
    permitId,
    initialValidFrom,
    initialValidUntil,
    onSuccess,
}: ApprovePermitModalProps) {
    const approveMutation = useApprovePermit();

    const [validFrom, setValidFrom] = useState(initialValidFrom);
    const [validUntil, setValidUntil] = useState(initialValidUntil);

    /**
     * Reset values whenever modal opens
     */
    useEffect(() => {
        if (visible) {
            setValidFrom(initialValidFrom);
            setValidUntil(initialValidUntil);
        }
    }, [visible, initialValidFrom, initialValidUntil]);

    const handleApprove = async () => {
        try {
            if (!validFrom || !validUntil) {
                return;
            }

            await approveMutation.mutateAsync({
                id: permitId,
                data: {
                    validFrom,
                    validUntil,
                },
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Approval error:", error);
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
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 justify-end bg-black/50"
            >
                <View className="bg-background rounded-t-2xl p-6 pb-8">
                    <View className="items-center mb-4">
                        <View className="w-12 h-1 rounded-full bg-muted" />
                    </View>

                    <Text className="text-xl font-bold text-foreground mb-2">
                        Approve Permit
                    </Text>

                    <Text className="text-sm text-muted-foreground mb-5">
                        Set the validity period for this permit.
                    </Text>

                    <DateTimeFormField
                        label="Valid From"
                        value={validFrom}
                        onChange={setValidFrom}
                    />

                    <DateTimeFormField
                        label="Permit Expiry Time"
                        value={validUntil}
                        onChange={setValidUntil}
                        minimumDate={parseDateTimeField(validFrom)}
                    />

                    <View className="flex-row gap-3 mt-5">
                        <TouchableOpacity
                            className="flex-1 bg-primary py-3 rounded-xl"
                            disabled={approveMutation.isPending}
                            onPress={handleApprove}
                        >
                            <Text className="text-white text-center font-semibold">
                                {approveMutation.isPending
                                    ? "Approving..."
                                    : "Confirm Approval"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 bg-muted py-3 rounded-xl"
                            disabled={approveMutation.isPending}
                            onPress={onClose}
                        >
                            <Text className="text-foreground text-center font-semibold">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}