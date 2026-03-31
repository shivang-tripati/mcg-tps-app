import { View, Text } from 'react-native';
import { PermitStatus } from '../../types/database';

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'hsl(220 9% 46%)',
    SUBMITTED: 'hsl(38 92% 38%)',
    UNDER_REVIEW: 'hsl(38 92% 38%)',
    APPROVED: 'hsl(142 72% 29%)',
    IN_TRANSIT: 'hsl(325 45% 32%)',
    COMPLETED: 'hsl(142 72% 29%)',
    EXPIRED: 'hsl(0 72% 38%)',
    REJECTED: 'hsl(0 72% 38%)',
    CANCELLED: 'hsl(220 9% 46%)',
};

interface StatusBadgeProps {
    status: string;
    label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
    const color = STATUS_COLORS[status] || 'hsl(220 9% 46%)';

    return (
        <View
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}15` }}
        >
            <Text
                className="text-[10px] text-center text-foreground font-medium uppercase"
            >
                {label || status.replace(/_/g, ' ')}
            </Text>
        </View>
    );
}
