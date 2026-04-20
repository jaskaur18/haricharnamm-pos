import { X } from '@tamagui/lucide-icons-2'
import { Button, Dialog, Paragraph, ScrollView, Sheet, XStack, YStack, useMedia } from 'tamagui'

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  const media = useMedia()

  if (media.maxMd) {
    return (
      <Sheet
        modal
        open={open}
        onOpenChange={onOpenChange}
        snapPointsMode="fit"
        dismissOnSnapToBottom
      >
        <Sheet.Overlay bg="rgba(0, 0, 0, 0.7)" />
        <Sheet.Handle bg="$color5" />
        <Sheet.Frame bg="$color2" p="$4" borderTopLeftRadius={16} borderTopRightRadius={16}>
          <YStack gap="$3" pb="$4">
            <XStack justify="space-between" items="center" gap="$3">
              <YStack flex={1} gap="$0.5">
                <Paragraph fontSize="$6" fontWeight="800" color="$color12">
                  {title}
                </Paragraph>
                {description ? (
                  <Paragraph color="$color10" fontSize="$2">
                    {description}
                  </Paragraph>
                ) : null}
              </YStack>
              <Button
                onPress={() => onOpenChange(false)}
                bg="$color3"
                p="$2"
                style={{ borderRadius: 999 }}
              >
                <X size={16} color="$color10" />
              </Button>
            </XStack>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 480, flex: 1 }}
              contentContainerStyle={{ pb: 24, flexGrow: 1 } as any}
            >
              {children}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    )
  }

  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay bg="rgba(0, 0, 0, 0.7)" />
        <Dialog.Content
          bordered
          gap="$3"
          width="92%"
          bg="$color2"
          borderColor="$borderColor"
          rounded="$6"
          p="$5"
          style={{ maxWidth: 640, maxHeight: '85vh' }}
        >
          <XStack justify="space-between" items="center" gap="$3">
            <YStack flex={1} gap="$0.5">
              <Dialog.Title fontSize="$6" fontWeight="800" color="$color12">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description color="$color10" fontSize="$3">
                  {description}
                </Dialog.Description>
              ) : null}
            </YStack>
            <Button
              onPress={() => onOpenChange(false)}
              bg="$color3"
              p="$2"
              hoverStyle={{ bg: '$color4' }}
              style={{ borderRadius: 999 }}
            >
              <X size={16} color="$color10" />
            </Button>
          </XStack>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ pb: 24, flexGrow: 1 } as any}
          >
            {children}
          </ScrollView>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
