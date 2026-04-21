import { useState, useEffect } from 'react'
import { Platform } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Button, Paragraph, Spinner, YStack } from 'tamagui'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'

type BarcodeScannerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanned: (data: string) => void
}

export function BarcodeScannerDialog({ open, onOpenChange, onScanned }: BarcodeScannerDialogProps) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)

  // Reset scan state when opening
  useEffect(() => {
    if (open) setScanned(false)
  }, [open])

  if (!open || Platform.OS === 'web') return null

  if (!permission) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Scanner">
        <YStack items="center" py="$6" gap="$3">
          <Spinner size="large" />
          <Paragraph>Requesting permissions...</Paragraph>
        </YStack>
      </ResponsiveDialog>
    )
  }

  if (!permission.granted) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Scanner">
        <YStack items="center" py="$6" gap="$4">
          <Paragraph style={{ textAlign: 'center' }}>We need your permission to show the camera to scan product barcodes.</Paragraph>
          <Button theme="accent" onPress={requestPermission}>Grant Permission</Button>
        </YStack>
      </ResponsiveDialog>
    )
  }

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return
    setScanned(true)
    onScanned(data)
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Scan Barcode">
      <YStack 
        bg="$color1" 
        rounded="$4" 
        overflow="hidden" 
        width="100%" height={400} position="relative"
      >
        <CameraView
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
          }}
        />
        {/* Overlay target window */}
        <YStack style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} bg="$overlayDark" items="center" justify="center" pointerEvents="none">
          <YStack style={{ width: 250, height: 250, borderWidth: 2, borderColor: 'white', backgroundColor: 'transparent', borderRadius: 16 }} />
          <Paragraph color="white" mt="$4" fontWeight="600">Align barcode within frame</Paragraph>
        </YStack>
      </YStack>
      {scanned && (
        <YStack mt="$4" items="center">
          <Spinner size="small" />
          <Paragraph color="$color8" mt="$2">Processing...</Paragraph>
        </YStack>
      )}
    </ResponsiveDialog>
  )
}
