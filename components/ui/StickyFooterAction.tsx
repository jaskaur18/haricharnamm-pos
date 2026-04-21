import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack } from 'tamagui'
import type { WebAwareViewStyle } from 'types/tamagui'

export function StickyFooterAction({
  children,
}: {
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <XStack
      bg="$overlayNav"
      borderTopWidth={1}
      borderColor="$borderColor"
      px="$4"
      pt="$3"
      pb={Math.max(insets.bottom, 12)}
      style={Platform.OS === 'web'
        ? {
            position: 'sticky',
            bottom: 0,
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            zIndex: 20,
          } as WebAwareViewStyle
        : undefined}
    >
      {children}
    </XStack>
  )
}
