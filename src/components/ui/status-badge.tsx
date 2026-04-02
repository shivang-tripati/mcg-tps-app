import { View, Text } from 'react-native';

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'hsl(220 9% 36%)',
    SUBMITTED: 'hsl(38 92% 32%)',
    UNDER_REVIEW: 'hsl(38 92% 32%)',
    APPROVED: 'hsl(142 72% 26%)',
    IN_TRANSIT: 'hsl(325 45% 32%)',
    COMPLETED: 'hsl(142 72% 26%)',
    EXPIRED: 'hsl(0 72% 36%)',
    REJECTED: 'hsl(0 72% 36%)',
    CANCELLED: 'hsl(220 9% 36%)',
    /** Legacy / API alias */
    PENDING: 'hsl(38 92% 32%)',
};

interface StatusBadgeProps {
    status: string;
    label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
    const color = STATUS_COLORS[status] || 'hsl(220 9% 36%)';

    return (
        <View className="px-2.5 py-1 rounded-full border border-border/50 overflow-hidden relative">
            <View
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: color, opacity: 0.14 }}
                pointerEvents="none"
            />
            <Text
                className="text-[10px] text-center font-semibold uppercase tracking-wide"
                style={{ color }}
            >
                {label || status.replace(/_/g, ' ')}
            </Text>
        </View>
    );
}
