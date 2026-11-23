import * as ImagePicker from 'expo-image-picker';

export const pickImage = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Necesitamos permiso para acceder a tus fotos.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets.length) return null;
  return result.assets[0];
};

export const imageFormData = (
  asset: ImagePicker.ImagePickerAsset,
  field = 'file',
  extra: Record<string, string> = {},
): FormData => {
  const form = new FormData();
  Object.entries(extra).forEach(([key, value]) => form.append(key, value));
  const name = asset.fileName ?? `archivo-${Date.now()}.jpg`;
  const type = asset.mimeType ?? 'image/jpeg';

  if (asset.file) {
    form.append(field, asset.file, name);
  } else {
    form.append(field, {
      uri: asset.uri,
      name,
      type,
    } as unknown as Blob);
  }
  return form;
};
