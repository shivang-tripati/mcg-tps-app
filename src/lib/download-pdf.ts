import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { SecureStorage, AUTH_TOKEN_KEY } from './storage';

function sanitizeFileName(value?: string | null) {
  return (value || 'document')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getBaseUrl() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not defined');
  }

  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

export function resolveDocumentUrl(fileUrl?: string | null) {
  if (!fileUrl) return null;

  // Already a full external URL
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  const baseUrl = getBaseUrl();

  // Ensure leading slash
  const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;

  // Always prefix with /api/uploads
  return `${baseUrl}/api${cleanPath}`;
}

export async function downloadWeighmentPdf(params: {
  fileUrl?: string | null;
  weighmentNumber?: string | null;
  permitNumber?: string | null;
}) {
  const { fileUrl, weighmentNumber, permitNumber } = params;

  const resolvedUrl = resolveDocumentUrl(fileUrl);

  if (!resolvedUrl) {
    Alert.alert('PDF not available', 'Weighment PDF is not available yet.');
    return;
  }

  const fileName = `weighment-${sanitizeFileName(weighmentNumber || permitNumber || 'record')}.pdf`;
  const localUri = `${FileSystem.cacheDirectory}${fileName}`;

  try {
    const token = await SecureStorage.getItem(AUTH_TOKEN_KEY);

    const result = await FileSystem.downloadAsync(resolvedUrl, localUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      Alert.alert('Downloaded', `PDF downloaded to temporary file:\n${result.uri}`);
      return;
    }

    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save or share weighment PDF',
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    console.error('Weighment PDF download failed:', error);
    Alert.alert('Download failed', 'Unable to download the weighment PDF. Please try again.');
  }
}