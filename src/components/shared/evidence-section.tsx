import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LucideFileText, LucideExternalLink, LucideImages } from 'lucide-react-native';
import { Card, SectionHeader } from './card';
import { openUrl, MUTED, PRIMARY } from './helpers';
import { resolveEvidenceFileUrl } from '../../lib/utils';
import { Evidence } from '../../types/permits';

export function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const isPdf = evidence.mimeType?.toLowerCase().includes('pdf') ?? false;
  const fileUrl = resolveEvidenceFileUrl(evidence.filePath);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => openUrl(fileUrl)}
      className="w-[48%] rounded-xl overflow-hidden border border-border bg-muted mb-3"
    >
      {isPdf ? (
        <View className="aspect-square items-center justify-center bg-background p-3">
          <LucideFileText size={34} color={MUTED} />
          <Text className="text-xs text-foreground text-center mt-2" numberOfLines={3}>
            {evidence.fileName || 'PDF Document'}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: fileUrl }}
          className="w-full aspect-square bg-gray-100"
          resizeMode="cover"
        />
      )}

      <View className="p-2">
        <Text className="text-xs text-foreground font-medium" numberOfLines={1}>
          {evidence.fileName || 'Evidence'}
        </Text>

        {evidence.description ? (
          <Text className="text-xs text-muted-foreground mt-1" numberOfLines={2}>
            {evidence.description}
          </Text>
        ) : null}

        <View className="flex-row items-center mt-2">
          <LucideExternalLink size={12} color={PRIMARY} />
          <Text className="text-xs text-primary font-semibold ml-1">View</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function EvidenceSection({ evidences }: { evidences?: Evidence[] }) {
  return (
    <Card>
      <SectionHeader icon={LucideImages} title="Waste Photos" />

      {evidences && evidences.length > 0 ? (
        <View className="flex-row flex-wrap justify-between">
          {evidences.map((evidence) => (
            <EvidenceCard key={evidence.id} evidence={evidence} />
          ))}
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">
          No waste evidence photos uploaded.
        </Text>
      )}
    </Card>
  );
}
