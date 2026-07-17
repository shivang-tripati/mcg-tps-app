import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,

} from 'react-native';
import {
  LucideFileText,
  LucideExternalLink,
  LucideImages,
} from 'lucide-react-native';
import { Card, SectionHeader } from './card';
import { openUrl } from './helpers';
import { MUTED, PRIMARY } from '../../data/contant';
import { resolveEvidenceFileUrl } from '../../lib/utils';
import { Evidence } from '../../types/permits';
import ImageViewerModal from './image-viewer-modal';

export function EvidenceCard({ evidence, allEvidences }: { evidence: Evidence; allEvidences?: Evidence[] }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isPdf = evidence.mimeType?.toLowerCase().includes('pdf') ?? false;
  const fileUrl = resolveEvidenceFileUrl(evidence.filePath);

  // Get all images from the evidences list
  const getImageUrls = () => {
    if (!allEvidences) return [{ url: fileUrl, fileName: evidence.fileName }];

    return allEvidences
      .filter(ev => !ev.mimeType?.toLowerCase().includes('pdf'))
      .map(ev => ({
        url: resolveEvidenceFileUrl(ev.filePath),
        fileName: ev.fileName || 'Image'
      }));
  };

  const handlePress = () => {
    if (isPdf) {
      openUrl(fileUrl);
    } else {
      // Find the index of this image in the list
      const images = getImageUrls();
      const index = images.findIndex(img => img.url === fileUrl);
      setSelectedIndex(index >= 0 ? index : 0);
      setIsModalVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
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
          <View className="aspect-square relative">
            <Image
              source={{ uri: fileUrl }}
              className="w-full h-full bg-gray-100"
              resizeMode="cover"
            />
            {/* Show badge if there are multiple images */}
            {allEvidences && allEvidences.filter(ev => !ev.mimeType?.toLowerCase().includes('pdf')).length > 1 && (
              <View className="absolute top-2 right-2 bg-black/70 rounded-full px-2 py-1">
                <Text className="text-white text-xs font-medium">
                  {allEvidences.filter(ev => !ev.mimeType?.toLowerCase().includes('pdf')).length}
                </Text>
              </View>
            )}
          </View>
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
            {isPdf ? (
              <>
                <LucideExternalLink size={12} color={PRIMARY} />
                <Text className="text-xs text-primary font-semibold ml-1">Open PDF</Text>
              </>
            ) : (
              <>
                <LucideImages size={12} color={PRIMARY} />
                <Text className="text-xs text-primary font-semibold ml-1">View Image</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <ImageViewerModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        images={getImageUrls()}
        initialIndex={selectedIndex}
      />
    </>
  );
}

export function EvidenceSection({ evidences }: { evidences?: Evidence[] }) {
  if (!evidences || evidences.length === 0) {
    return (
      <Card>
        <SectionHeader icon={LucideImages} title="Waste Photos" />
        <Text className="text-sm text-muted-foreground">
          No waste evidence photos uploaded.
        </Text>
      </Card>
    );
  }

  // Separate PDFs and Images
  const pdfEvidences = evidences.filter(ev => ev.mimeType?.toLowerCase().includes('pdf'));
  const imageEvidences = evidences.filter(ev => !ev.mimeType?.toLowerCase().includes('pdf'));

  return (
    <Card>
      <SectionHeader icon={LucideImages} title="Waste Photos" />

      {imageEvidences.length > 0 && (
        <View className="flex-row flex-wrap justify-between mt-3">
          {imageEvidences.map((evidence) => (
            <EvidenceCard
              key={evidence.id}
              evidence={evidence}
              allEvidences={evidences}
            />
          ))}
        </View>
      )}

      {pdfEvidences.length > 0 && (
        <>
          <Text className="text-sm font-medium text-foreground mt-4 mb-2">PDF Documents</Text>
          <View className="flex-row flex-wrap justify-between">
            {pdfEvidences.map((evidence) => (
              <EvidenceCard key={evidence.id} evidence={evidence} />
            ))}
          </View>
        </>
      )}
    </Card>
  );
}