import { Platform } from 'react-native'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'

export async function exportTextFile({
  filename,
  contents,
  mimeType,
}: {
  filename: string
  contents: string
  mimeType: string
}) {
  if (Platform.OS === 'web') {
    const blob = new Blob([contents], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    return
  }

  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory
  if (!baseDirectory) {
    throw new Error('No writable file-system directory is available on this device.')
  }

  const fileUri = `${baseDirectory}${filename}`
  await FileSystem.writeAsStringAsync(fileUri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  })

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.')
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle: filename,
  })
}
