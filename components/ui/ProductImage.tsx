import { Image } from 'react-native'
import { Sparkles } from '@tamagui/lucide-icons-2'
import { Paragraph, YStack, useTheme } from 'tamagui'

export function ProductImage({
  uri,
  size = 56,
  label,
}: {
  uri?: string | null
  size?: number
  label?: string
}) {
  const theme = useTheme()
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.borderColor?.val as string,
        }}
      />
    )
  }

  return (
    <YStack
      rounded="$5"
      bg="$color3"
      borderWidth={1}
      borderColor="$borderColor"
      items="center"
      justify="center"
      gap="$0.5"
      style={{ width: size, height: size }}
    >
      <Sparkles size={size > 48 ? 18 : 14} color="$color8" />
      {label && size >= 48 ? (
        <Paragraph color="$color8" fontSize={9} fontWeight="700" style={{ textAlign: 'center' }} numberOfLines={1}>
          {label.slice(0, 6)}
        </Paragraph>
      ) : null}
    </YStack>
  )
}
