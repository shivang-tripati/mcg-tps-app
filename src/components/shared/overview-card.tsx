import React from 'react';
import { View, Text } from 'react-native';
import {
  LucidePackage,
  LucideScale,
  LucideCalendar,
  LucideClock,
} from 'lucide-react-native';
import { Card, SectionHeader, InfoRow } from './card';
import {
  StatusBadge,
  formatWasteType,
  formatWeight,
  formatDateTime,
  formatDuration,
} from './helpers';
import { PermitDetail } from '../../types/permits';

export function OverviewCard({ permit }: { permit: PermitDetail }) {
  const duration = formatDuration(permit.validFrom, permit.validUntil);

  return (
    <Card>
      {/* Added flex-row layout constraints and a gap to prevent overlap */}
      <View className="flex-row justify-between items-start mb-4 gap-2">
        <View className="flex-1">
          <SectionHeader icon={LucidePackage} title="Overview" />
        </View>
        
        {/* The badge is kept outside the flex-1 wrapper so it maintains its size */}
        <View className="flex-shrink-0">
          <StatusBadge status={permit.status} />
        </View>
      </View>

      <InfoRow label="Waste Type" value={formatWasteType(permit.wasteType)} icon={LucidePackage} />
      <InfoRow label="Requested Weight" value={formatWeight(permit.estimatedWeight)} icon={LucideScale} />
      <InfoRow label="Created At" value={formatDateTime(permit.createdAt)} icon={LucideCalendar} />

      {permit.submittedAt ? (
        <InfoRow label="Submitted At" value={formatDateTime(permit.submittedAt)} icon={LucideClock} />
      ) : null}

      {permit.validFrom ? (
        <InfoRow label="Requested From" value={formatDateTime(permit.validFrom)} icon={LucideCalendar} />
      ) : null}

      {permit.validUntil ? (
        <InfoRow label="Requested Until" value={formatDateTime(permit.validUntil)} icon={LucideCalendar} />
      ) : null}

      {duration ? (
        <View className="rounded-xl bg-blue-50 border border-blue-100 p-3 mt-3">
          <Text className="text-xs text-blue-600 font-semibold uppercase">
            Requested Permit Duration
          </Text>
          <Text className="text-sm font-bold text-blue-900 mt-1">{duration}</Text>
        </View>
      ) : null}
    </Card>
  );
}