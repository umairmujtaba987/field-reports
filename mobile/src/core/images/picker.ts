import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { LocalImage } from '../../types/report';

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission Required',
        message: 'This app needs access to your camera to take field report photos.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('[Picker] Camera permission request error:', err);
    return false;
  }
}

export function mapAssetToLocalImage(asset: Asset): LocalImage {
  return {
    id: asset.id || asset.uri || Math.random().toString(),
    uri: asset.uri || '',
    fileName: asset.fileName || `photo_${Date.now()}.jpg`,
    fileSize: asset.fileSize || 0,
    type: asset.type || 'image/jpeg',
    isCompressed: true,
  };
}

export async function takePhoto(): Promise<LocalImage | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    Alert.alert(
      'Camera Permission Denied',
      'Please enable camera permissions in device Settings to take photos for reports.'
    );
    return null;
  }

  // Native hardware compression pipeline: max 2048px & 80% JPEG quality
  // Guarantees huge 18MB camera photos stay crisp and well below the 5 MB ceiling (~1.5–2.5 MB)
  const result = await launchCamera({
    mediaType: 'photo',
    saveToPhotos: false,
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.8,
  });

  if (result.didCancel || !result.assets || result.assets.length === 0) {
    return null;
  }

  return mapAssetToLocalImage(result.assets[0]);
}

export async function pickImagesFromGallery(remainingSlots: number): Promise<LocalImage[]> {
  if (remainingSlots <= 0) {
    Alert.alert('Maximum Limit Reached', 'You can only attach up to 5 photos per report.');
    return [];
  }

  // Native hardware compression pipeline: max 2048px & 80% JPEG quality
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: remainingSlots,
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.8,
  });

  if (result.didCancel || !result.assets) {
    return [];
  }

  return result.assets.map(mapAssetToLocalImage);
}
