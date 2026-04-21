import { ChevronRight } from '@tamagui/lucide-icons-2'
import { Button, Paragraph, XStack, YStack } from 'tamagui'

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
  return (
    <Button
      unstyled
      onPress={onPress}
      bg="$color2"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$6"
      p="$3.5"
      hoverStyle={{ bg: '$color3', borderColor: '$borderColorHover' }}
      pressStyle={{ scale: 0.99 }}
    >
      <XStack gap="$3" items="center">
        {leading}
        <YStack flex={1} gap="$0.75">
          <XStack justify="space-between" items="center" gap="$2">
            <Paragraph color="$color12" fontSize="$4" fontWeight="800" numberOfLines={1}>
              {title}
            </Paragraph>
            {meta}
          </XStack>
          {subtitle ? <YStack>{subtitle}</YStack> : null}
        </YStack>
        {trailing ?? (onPress ? <ChevronRight size={18} color="$color7" /> : null)}
      </XStack>
    </Button>
  )
}
