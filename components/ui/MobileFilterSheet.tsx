import { SlidersHorizontal } from '@tamagui/lucide-icons-2'
import { Button, Paragraph, XStack, YStack } from 'tamagui'
import { ResponsiveDialog } from './ResponsiveDialog'

export function MobileFilterSheet({
  open,
  onOpenChange,
  title = 'Filters',
  activeCount = 0,
  onReset,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  activeCount?: number
  onReset?: () => void
  children: React.ReactNode
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={title}>
      <YStack gap="$3" py="$2">
        <XStack justify="space-between" items="center">
          <XStack gap="$2" items="center">
            <YStack bg="$accentSoft" rounded="$10" p="$2">
              <SlidersHorizontal size={16} color="$accent" />
            </YStack>
            <YStack gap="$0.25">
              <Paragraph color="$textPrimary" fontSize="$4" fontWeight="800">{title}</Paragraph>
              <Paragraph color="$textMuted" fontSize="$2">{activeCount} active filter{activeCount === 1 ? '' : 's'}</Paragraph>
            </YStack>
          </XStack>
          {onReset ? (
            <Button size="$2.5" bg="$bgElevated" borderColor="$borderSubtle" borderWidth={1} onPress={onReset}>
              Reset
            </Button>
          ) : null}
        </XStack>
        {children}
      </YStack>
    </ResponsiveDialog>
  )
}
