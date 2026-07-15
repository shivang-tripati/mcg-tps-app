import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LucideCalendar, LucideFileText, LucideScale } from 'lucide-react-native';
import { Card, SectionHeader, InfoRow } from './card';
import { StatusBadge, formatWeight, formatDateTime, openUrl, PRIMARY } from './helpers';
import { PermitWeighment } from '../../types/permits';

export function WeighmentCard({ weighment }: { weighment: PermitWeighment }) {
  return (
    <View className="rounded-xl border border-border p-3 mb-3 bg-background">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-xs text-muted-foreground mb-1">Weighment Code</Text>
          <Text className="text-sm font-mono font-semibold text-foreground">
            {weighment.weighmentNumber}
          </Text>
        </View>
        <StatusBadge status={weighment.status} />
      </View>

      <View className="flex-row justify-between mb-2">
        <View className="flex-1">
          <Text className="text-xs text-muted-foreground">First</Text>
          <Text className="text-sm font-semibold">{formatWeight(weighment.firstWeight)}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-xs text-muted-foreground">Second</Text>
          <Text className="text-sm font-semibold">{formatWeight(weighment.secondWeight)}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-xs text-muted-foreground">Net</Text>
          <Text className="text-sm font-semibold text-primary">{formatWeight(weighment.netWeight)}</Text>
        </View>
      </View>

      <InfoRow
        label="Weighed At"
        value={formatDateTime(weighment.weighedAt)}
        icon={LucideCalendar}
        last={!weighment.fileUrl}
      />

      {weighment.fileUrl ? (
        <TouchableOpacity
          className="flex-row items-center mt-3 bg-primary/10 rounded-xl px-3 py-2"
          onPress={() => openUrl(weighment.fileUrl)}
        >
          <LucideFileText size={16} color={PRIMARY} />
          <Text className="text-primary font-semibold text-sm ml-2">Open Weighment Document</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function WeighmentSection({ weighments }: { weighments?: PermitWeighment[] }) {
  if (!weighments || weighments.length === 0) return null;

  return (
    <Card>
      <SectionHeader icon={LucideScale} title="Weighment History" />

      {weighments.map((weighment) => (
        <WeighmentCard key={weighment.id} weighment={weighment} />
      ))}
    </Card>
  );
}
