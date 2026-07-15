import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

function sanitizeFileName(value?: string | null) {
  return (value || 'permit')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getQrFileName(permitNumber?: string | null, token?: string | null) {
  const identifier = sanitizeFileName(permitNumber || token || 'permit-qr');
  return `permit-qr-${identifier}.png`;
}

function isBase64DataUrl(value: string) {
  return value.startsWith('data:image');
}

function extractBase64FromDataUrl(dataUrl: string) {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
}

export async function downloadPermitQrToGallery(params: {
  qrCode: string;
  permitNumber?: string | null;
  token?: string | null;
}) {
  const { qrCode, permitNumber, token } = params;

  if (!qrCode) {
    Alert.alert('QR not available', 'QR code is not available for this permit.');
    return;
  }

  const fileName = getQrFileName(permitNumber, token);
  const localUri = `${FileSystem.cacheDirectory}${fileName}`;

  try {
    const permission = await MediaLibrary.requestPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Please allow media library access to save the QR code.'
      );
      return;
    }

    if (isBase64DataUrl(qrCode)) {
      const base64 = extractBase64FromDataUrl(qrCode);

      await FileSystem.writeAsStringAsync(localUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      await FileSystem.downloadAsync(qrCode, localUri);
    }

    await MediaLibrary.saveToLibraryAsync(localUri);

    Alert.alert(
      'QR saved',
      `QR code saved to gallery as ${fileName}`
    );
  } catch (error) {
    console.error('QR download failed:', error);

    const canShare = await Sharing.isAvailableAsync();

    if (canShare && Platform.OS !== 'web') {
      try {
        await Sharing.shareAsync(localUri, {
          mimeType: 'image/png',
          dialogTitle: 'Save or share permit QR',
        });
        return;
      } catch (shareError) {
        console.error('QR share failed:', shareError);
      }
    }

    Alert.alert(
      'Download failed',
      'Unable to save QR code. Please try again.'
    );
  }
}