import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LucideQrCode, LucideDownload, LucideExternalLink } from 'lucide-react-native';
import { Card, SectionHeader } from './card';
import { formatDateTime } from './helpers';
import { PermitDetail } from '../../types/permits';
import { downloadPermitQrToGallery } from '../../lib/download-qr';

const PRIMARY = 'hsl(325 45% 32%)';

function openUrl(url?: string | null) {
  if (!url) return;

  import('react-native').then(({ Linking }) => {
    Linking.openURL(url).catch(() => {
      // silent fallback
    });
  });
}

export function DigitalPermitCard({
  permit,
  qrCode,
  verificationUrl,
}: {
  permit: PermitDetail;
  qrCode?: string;
  verificationUrl?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  if (!qrCode) return null;

  const handleDownloadQr = async () => {
    setDownloading(true);

    try {
      await downloadPermitQrToGallery({
        qrCode,
        permitNumber: permit.permitNumber,
        token: permit.token,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="border-blue-100 bg-blue-50">
      <SectionHeader icon={LucideQrCode} title="Digital Permit" />

      <View className="items-center">
        <View className="bg-white p-4 rounded-2xl shadow-sm mb-4">
          <Image
            source={{ uri: qrCode }}
            className="w-48 h-48"
            resizeMode="contain"
          />
        </View>

        <Text className="text-xs text-blue-700 font-semibold uppercase">
          Validity
        </Text>

        <Text className="font-bold text-gray-900 mt-1 text-center">
          {formatDateTime(permit.validUntil)}
        </Text>

        <TouchableOpacity
          className="mt-4 bg-primary rounded-xl px-4 py-3 w-full items-center"
          onPress={handleDownloadQr}
          disabled={downloading}
          activeOpacity={0.85}
        >
          {downloading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View className="flex-row items-center">
              <LucideDownload size={18} color="#fff" />
              <Text className="text-white font-semibold ml-2">
                Download QR
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {verificationUrl ? (
          <TouchableOpacity
            className="mt-4 border-t border-blue-100 pt-4 w-full"
            onPress={() => openUrl(verificationUrl)}
          >
            <Text className="text-xs text-center text-blue-700" numberOfLines={2}>
              {verificationUrl}
            </Text>

            <View className="flex-row justify-center items-center mt-2">
              <LucideExternalLink size={14} color={PRIMARY} />
              <Text className="text-xs text-center text-primary font-semibold ml-1">
                Open verification link
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
}