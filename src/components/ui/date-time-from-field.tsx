import { useState } from "react";
import { formatLocalDateTime, mergeDateAndTime, parseDateTimeField } from "../../lib/utils";
import { LucideCalendar, LucideClock } from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    View,
    Text,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Platform,
    Modal,
} from 'react-native';
import { Button } from "./button";

export default function DateTimeFormField({
    label,
    value,
    onChange,
    error,
    minimumDate,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    minimumDate?: Date;
}) {
    const [iosOpen, setIosOpen] = useState(false);
    const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
    const [pendingDate, setPendingDate] = useState<Date | null>(null);

    const date = parseDateTimeField(value);

    const openPicker = () => {
        if (Platform.OS === 'android') {
            setAndroidStep('date');
            setPendingDate(null);
        } else {
            setIosOpen(true);
        }
    };

    const finishAndroid = (combined: Date) => {
        let out = combined;
        if (minimumDate && out < minimumDate) {
            out = minimumDate;
        }
        onChange(formatLocalDateTime(out));
        setAndroidStep(null);
        setPendingDate(null);
    };

    return (
        <View className="mb-4">
            <Text className="text-sm font-medium text-foreground mb-2">{label}</Text>
            <TouchableOpacity
                onPress={openPicker}
                className="flex-row items-center h-12 w-full rounded-md border border-input bg-background px-3"
            >
                <LucideCalendar size={18} color="#94a3b8" style={{ marginRight: 10 }} />
                <Text className={value ? 'text-foreground flex-1' : 'text-muted-foreground flex-1'}>
                    {value || 'Select date & time'}
                </Text>
                <LucideClock size={16} color="#94a3b8" />
            </TouchableOpacity>
            {error ? <Text className="text-xs text-error mt-1">{error}</Text> : null}

            {Platform.OS === 'android' && androidStep === 'date' && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={minimumDate}
                    onChange={(e, d) => {
                        if (e.type === 'dismissed' || !d) {
                            setAndroidStep(null);
                            setPendingDate(null);
                            return;
                        }
                        setPendingDate(d);
                        setAndroidStep('time');
                    }}
                />
            )}

            {Platform.OS === 'android' && androidStep === 'time' && pendingDate && (
                <DateTimePicker
                    value={mergeDateAndTime(pendingDate, parseDateTimeField(value))}
                    mode="time"
                    display="default"
                    is24Hour={false}
                    onChange={(e, d) => {
                        if (e.type === 'dismissed' || !d) {
                            setAndroidStep(null);
                            setPendingDate(null);
                            return;
                        }
                        const combined = mergeDateAndTime(pendingDate, d);
                        finishAndroid(combined);
                    }}
                />
            )}

            {iosOpen && Platform.OS === 'ios' && (
                <Modal transparent animationType="slide" visible={iosOpen} onRequestClose={() => setIosOpen(false)}>
                    <TouchableWithoutFeedback onPress={() => setIosOpen(false)}>
                        <View className="flex-1 justify-end bg-black/50">
                            <TouchableWithoutFeedback>
                                <View className="bg-background rounded-t-xl p-4 pb-8">
                                    <DateTimePicker
                                        value={date}
                                        mode="datetime"
                                        display="spinner"
                                        minimumDate={minimumDate}
                                        onChange={(_, d) => {
                                            if (d) onChange(formatLocalDateTime(d));
                                        }}
                                    />
                                    <Button label="Done" onPress={() => setIosOpen(false)} className="mt-2" />
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}
        </View>
    );
}