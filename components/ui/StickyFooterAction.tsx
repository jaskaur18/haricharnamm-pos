import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack } from 'tamagui'

export function StickyFooterAction({
  children,
}: {
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <XStack
      bg={Platform.OS === 'web' ? 'rgba(23,20,17,0.92)' : '$bgSurface'}
      borderTopWidth={1}
      borderColor="$borderSubtle"
      px="$4"
      pt="$3"
      pb={Math.max(insets.bottom, 12)}
      style={Platform.OS === 'web'
        ? {
            position: 'sticky' as any,
            bottom: 0,
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            zIndex: 20,
          }
        : undefined}
    >
      {children}
    </XStack>
  )
}
