import React from 'react';
import { View, Text, Platform } from 'react-native';
import { formatDateTime } from '../../lib/utils';
import { 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    Timer,
    Calendar,
    AlertTriangle,
    XCircle,
    CircleDot
} from 'lucide-react-native';

interface TimeRemainingCardProps {
    timeLeft: {
        text: string;
        hours: number;
        minutes: number;
        percentage?: number;
        days?: number;
    };
    expiryDate?: string;
    isExpired?: boolean;
}

export const TimeRemainingCard: React.FC<TimeRemainingCardProps> = ({
    timeLeft,
    expiryDate,
    isExpired = false,
}) => {
    const percentage = timeLeft.percentage ?? 100;
    
    // Determine status
    const getStatus = () => {
        if (isExpired || percentage === 0) {
            return {
                label: 'Expired',
                color: '#dc2626',
                bg: '#fef2f2',
                border: '#fecaca',
                Icon: XCircle,
                textColor: '#991b1b',
                progressColor: '#dc2626',
            };
        }
        if (percentage < 20) {
            return {
                label: 'Critical',
                color: '#dc2626',
                bg: '#fef2f2',
                border: '#fecaca',
                Icon: AlertCircle,
                textColor: '#991b1b',
                progressColor: '#dc2626',
            };
        }
        if (percentage < 50) {
            return {
                label: 'Warning',
                color: '#f59e0b',
                bg: '#fffbeb',
                border: '#fde68a',
                Icon: AlertTriangle,
                textColor: '#92400e',
                progressColor: '#f59e0b',
            };
        }
        return {
            label: 'Active',
            color: '#22c55e',
            bg: '#f0fdf4',
            border: '#bbf7d0',
            Icon: CheckCircle2,
            textColor: '#166534',
            progressColor: '#22c55e',
        };
    };

    const status = getStatus();
    const StatusIcon = status.Icon;

    // Format time text
    const formatTimeText = () => {
        if (isExpired || percentage === 0) return 'Expired';
        const { days = 0, hours, minutes } = timeLeft;
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <View style={{
            marginTop: 16,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: status.border,
            backgroundColor: status.bg,
        }}>
            {/* Status Bar */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: status.bg,
                borderBottomWidth: 1,
                borderBottomColor: status.border,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <StatusIcon size={16} color={status.color} />
                    <Text style={{ 
                        color: status.color, 
                        fontSize: 11, 
                        fontWeight: '600',
                        letterSpacing: 0.5,
                    }}>
                        {status.label}
                    </Text>
                    <Text style={{ 
                        color: status.textColor, 
                        fontSize: 13, 
                        fontWeight: '700',
                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    }}>
                        {formatTimeText()}
                    </Text>
                </View>
                
                {!isExpired && percentage > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <CircleDot size={8} color={status.color} />
                        <Text style={{ color: status.color, fontSize: 9, fontWeight: '600' }}>
                            LIVE
                        </Text>
                    </View>
                )}
            </View>

            {/* Timer Display */}
            <View style={{ padding: 16 }}>
                {/* Large Timer */}
                <Text style={{ 
                    color: status.textColor, 
                    fontSize: 32, 
                    fontWeight: '700',
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    letterSpacing: -0.5,
                    textAlign: 'center',
                }}>
                    {formatTimeText()}
                </Text>

                {/* Progress Bar */}
                {!isExpired && percentage > 0 && (
                    <View style={{ marginTop: 12 }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                        }}>
                            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '500' }}>
                                Remaining
                            </Text>
                            <Text style={{ 
                                color: status.color, 
                                fontSize: 10, 
                                fontWeight: '600',
                            }}>
                                {percentage}%
                            </Text>
                        </View>
                        <View style={{
                            height: 4,
                            backgroundColor: '#e2e8f0',
                            borderRadius: 2,
                            overflow: 'hidden',
                        }}>
                            <View style={{
                                width: `${percentage}%`,
                                height: '100%',
                                backgroundColor: status.progressColor,
                                borderRadius: 2,
                            }} />
                        </View>
                    </View>
                )}

                {/* Expiry Date */}
                {expiryDate && (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 12,
                        gap: 6,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#f1f5f9',
                    }}>
                        <Calendar size={14} color="#94a3b8" />
                        <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '500' }}>
                            {isExpired ? 'Expired' : 'Expires'}
                        </Text>
                        <Text style={{ 
                            color: isExpired ? '#dc2626' : '#1e293b', 
                            fontSize: 12, 
                            fontWeight: '600',
                            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                        }}>
                            {formatDateTime(expiryDate)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Urgency Badge - Only when critical */}
            {!isExpired && percentage > 0 && percentage < 20 && (
                <View style={{
                    backgroundColor: '#dc2626',
                    paddingVertical: 4,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                }}>
                    <Text style={{ 
                        color: 'white', 
                        fontSize: 9, 
                        fontWeight: '700',
                        letterSpacing: 0.5,
                    }}>
                        ⚡ EXPIRING SOON
                    </Text>
                </View>
            )}
        </View>
    );
};