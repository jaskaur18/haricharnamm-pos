import { Platform } from 'react-native'
import { ScrollView, YStack, type YStackProps } from 'tamagui'

export function ScreenScaffold({
  children,
  scroll = false,
  padded = true,
  contentContainerStyle,
  ...props
}: YStackProps & {
  children: React.ReactNode
  scroll?: boolean
  padded?: boolean
  contentContainerStyle?: any
}) {
  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: padded ? 4 : 0,
          paddingBottom: 24,
          gap: 18,
          flexGrow: 1,
          ...contentContainerStyle,
        }}
      >
        <YStack gap="$4.5" {...props}>
          {children}
        </YStack>
      </ScrollView>
    )
  }

  return (
    <YStack
      flex={1}
      gap="$4.5"
      px={padded ? '$1' : 0}
      style={Platform.OS === 'web' ? { minWidth: 0 } : undefined}
      {...props}
    >
      {children}
    </YStack>
  )
}
