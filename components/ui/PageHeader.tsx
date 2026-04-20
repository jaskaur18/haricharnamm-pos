import { Paragraph, XStack, YStack } from 'tamagui'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <XStack
      justify="space-between"
      items="center"
      gap="$3"
      flexWrap="wrap"
    >
      <YStack gap="$1" flex={1}>
        <Paragraph fontSize="$7" fontWeight="800" color="$color12" letterSpacing={-0.3}>
          {title}
        </Paragraph>
        {description ? (
          <Paragraph color="$color10" fontSize="$3" numberOfLines={2}>
            {description}
          </Paragraph>
        ) : null}
      </YStack>
      {actions}
    </XStack>
  )
}
