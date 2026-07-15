import React from 'react';
import { View, Text } from 'react-native';
import { LucideClock } from 'lucide-react-native';
import { Card, SectionHeader } from './card';
import { StatusBadge, formatDate } from './helpers';
import { PermitDetail } from '../../types/permits';

export function StatusBreakdown({ permit }: { permit: PermitDetail }) {
  return (
    <Card>
      <SectionHeader icon={LucideClock} title="Application Status" />

      <View className="flex-row justify-between items-center py-2 border-b border-border">
        <Text className="text-sm text-muted-foreground">Status</Text>
        <StatusBadge status={permit.status} />
      </View>

      <View className="flex-row justify-between items-center py-3 border-b border-border">
        <Text className="text-sm text-muted-foreground">Permit No</Text>
        <Text className="font-mono font-semibold text-foreground">
          {permit.permitNumber || 'PENDING'}
        </Text>
      </View>

      {permit.approvedAt ? (
        <View className="flex-row justify-between items-center py-3">
          <Text className="text-sm text-muted-foreground">Approved At</Text>
          <Text className="font-semibold text-foreground">
            {formatDate(permit.approvedAt)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
