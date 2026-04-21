import { PackageOpen } from '@tamagui/lucide-icons-2'
import { Button, Paragraph, YStack } from 'tamagui'

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <YStack
      items="center"
      justify="center"
      gap="$3"
      py="$6"
      px="$4"
      bg="$color2"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$6"
      borderStyle="dashed"
    >
      <YStack
        bg="$accentSoft"
        rounded="$5"
        p="$3"
        items="center"
        justify="center"
      >
        <PackageOpen size={28} color="$accent" />
      </YStack>
      <YStack items="center" gap="$1.5" style={{ maxWidth: 360 }}>
        <Paragraph fontSize="$5" fontWeight="700" color="$color12" style={{ textAlign: 'center' }}>
          {title}
        </Paragraph>
        <Paragraph color="$color10" style={{ textAlign: 'center' }} fontSize="$3">
          {description}
        </Paragraph>
      </YStack>
      {actionLabel && onAction ? (
        <Button theme="accent" rounded="$5" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </YStack>
  )
}
