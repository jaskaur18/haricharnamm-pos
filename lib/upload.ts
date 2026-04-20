import * as ImagePicker from 'expo-image-picker'

export async function pickSingleImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: false,
  })

  if (result.canceled || result.assets.length === 0) {
    return null
  }

  return result.assets[0]
}

export async function uploadSelectedImage(
  asset: ImagePicker.ImagePickerAsset,
  postUrl: string,
) {
  const body =
    (asset as ImagePicker.ImagePickerAsset & { file?: File }).file ??
    (await fetch(asset.uri).then((response) => response.blob()))

  const response = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'Content-Type': asset.mimeType ?? 'image/jpeg',
    },
    body,
  })

  if (!response.ok) {
    throw new Error('Image upload failed')
  }

  const data = await response.json()
  return data.storageId as string
}
