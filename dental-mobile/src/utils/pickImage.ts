import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; name: string; type: string };

export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow access to your photo library to choose a photo.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  };
}
