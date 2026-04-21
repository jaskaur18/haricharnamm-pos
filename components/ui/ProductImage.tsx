import { Image } from 'react-native'
import { Sparkles } from '@tamagui/lucide-icons-2'
import { Paragraph, YStack, useMedia } from 'tamagui'

export function ProductImage({
  uri,
  size = 56,
  label,
}: {
  uri?: string | null
  size?: number
  label?: string
}) {
  const media = useMedia()
  const desktop = !media.maxMd
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: desktop ? '#27272A' : '#332c26',
        }}
      />
    )
  }

  return (
    <YStack
      rounded="$5"
      bg={desktop ? '$color3' : '$bgElevated'}
      borderWidth={1}
      borderColor={desktop ? '$borderColor' : '$borderSubtle'}
      items="center"
      justify="center"
      gap="$0.5"
      style={{ width: size, height: size }}
    >
      <Sparkles size={size > 48 ? 18 : 14} color={desktop ? '$color8' : '$accent'} />
      {label && size >= 48 ? (
        <Paragraph color={desktop ? '$color7' : '$textFaint'} fontSize={9} fontWeight="700" style={{ textAlign: 'center' }} numberOfLines={1}>
          {label.slice(0, 6)}
        </Paragraph>
      ) : null}
    </YStack>
  )
}
