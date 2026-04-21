import { ChevronRight } from '@tamagui/lucide-icons-2'
import { Button, Paragraph, XStack, YStack, useMedia } from 'tamagui'

export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  onPress,
}: {
  leading?: React.ReactNode
  title: string
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
  onPress?: () => void
}) {
  const media = useMedia()
  const desktop = !media.maxMd
  return (
    <Button
      unstyled
      onPress={onPress}
      bg={desktop ? '$color2' : '$bgSurface'}
      borderWidth={1}
      borderColor={desktop ? '$borderColor' : '$borderSubtle'}
      rounded="$6"
      p="$3.5"
      hoverStyle={{ bg: desktop ? '$color3' : '$bgCardHover', borderColor: desktop ? '$borderColorHover' : '$borderStrong' }}
      pressStyle={{ scale: 0.99 }}
    >
      <XStack gap="$3" items="center">
        {leading}
        <YStack flex={1} gap="$0.75">
          <XStack justify="space-between" items="center" gap="$2">
            <Paragraph color={desktop ? '$color12' : '$textPrimary'} fontSize="$4" fontWeight="800" numberOfLines={1}>
              {title}
            </Paragraph>
            {meta}
          </XStack>
          {subtitle ? <YStack>{subtitle}</YStack> : null}
        </YStack>
        {trailing ?? (onPress ? <ChevronRight size={18} color={desktop ? '$color7' : '$textFaint'} /> : null)}
      </XStack>
    </Button>
  )
}
