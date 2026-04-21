import { Dimensions, KeyboardAvoidingView, Modal, Platform } from 'react-native'
import { X } from '@tamagui/lucide-icons-2'
import { Button, Dialog, Paragraph, ScrollView, XStack, YStack, useMedia } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const isWeb = Platform.OS === 'web'

/**
 * ResponsiveDialog
 * - Mobile native: React Native Modal with full-screen sheet layout
 * - Mobile web: Tamagui Dialog (portal-based, works properly on web)
 * - Desktop: Tamagui Dialog centered modal
 *
 * We avoid Tamagui Sheet on native because it doesn't reliably portal above
 * the tab bar and doesn't properly dim/block the background.
 */
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
  const insets = useSafeAreaInsets()

  // ── Native mobile: RN Modal (reliable full-screen overlay) ──
  if (!isWeb && media.maxMd) {
    return (
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => onOpenChange(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <YStack
            flex={1}
            bg="rgba(0,0,0,0.6)"
            justify="flex-end"
          >
            {/* Sheet-style card from bottom */}
            <YStack
              bg="$color2"
              borderTopLeftRadius={24}
              borderTopRightRadius={24}
              style={{ maxHeight: '95%' }}
            >
              {/* Drag handle indicator */}
              <XStack justify="center" pt="$3" pb="$2">
                <YStack bg="$color6" style={{ width: 40, height: 5, borderRadius: 2.5 }} />
              </XStack>

              {/* Header */}
              <XStack
                justify="space-between"
                items="center"
                gap="$3"
                px="$4"
                pb="$3"
                borderBottomWidth={1}
                borderBottomColor="$borderColor"
              >
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
                  borderWidth={0}
                  style={{ borderRadius: 999 }}
                  hoverStyle={{ bg: '$color4' }}
                  pressStyle={{ scale: 0.95 }}
                >
                  <X size={16} color="$color12" />
                </Button>
              </XStack>

              {/* Content — scrollable */}
              <ScrollView
                showsVerticalScrollIndicator
                contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 16, 40) } as any}
                keyboardShouldPersistTaps="handled"
                style={{ flexGrow: 0, flexShrink: 1 }}
              >
                {children}
              </ScrollView>
            </YStack>
          </YStack>
        </KeyboardAvoidingView>
      </Modal>
    )
  }

  // ── Desktop + Mobile web: Tamagui Dialog ──
  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          bg="rgba(0, 0, 0, 0.7)"
          style={{ zIndex: 9998 } as any}
        />
        <Dialog.Content
          bordered
          gap="$3"
          width={media.maxMd ? '96%' : '92%'}
          bg="$color2"
          borderColor="$borderColor"
          rounded={media.maxMd ? '$4' : '$6'}
          p={media.maxMd ? '$4' : '$5'}
          enterStyle={{ opacity: 0, scale: 0.95 }}
          exitStyle={{ opacity: 0, scale: 0.95 }}
          style={{ maxWidth: 720, maxHeight: '88vh', zIndex: 9999 } as any}
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
              borderWidth={0}
              hoverStyle={{ bg: '$color4' }}
              style={{ borderRadius: 999 }}
            >
              <X size={16} color="$color12" />
            </Button>
          </XStack>
          <ScrollView
            showsVerticalScrollIndicator
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24 } as any}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
