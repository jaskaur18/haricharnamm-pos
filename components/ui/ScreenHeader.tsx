import { Button, Paragraph, XStack, YStack, useMedia } from 'tamagui'

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  compact = false,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
  compact?: boolean
}) {
  const media = useMedia()
  const mobile = media.maxMd

  return (
    <XStack justify="space-between" items={mobile ? 'flex-start' : 'center'} gap="$3" flexWrap="wrap">
      <YStack gap={compact ? '$0.5' : '$1'}>
        {eyebrow ? (
          <Paragraph color="$color8" fontSize="$1" fontWeight="700" letterSpacing={1.2} textTransform="uppercase">
            {eyebrow}
          </Paragraph>
        ) : null}
        <Paragraph
          color="$color12"
          fontSize={mobile ? (compact ? '$7' : '$8') : '$9'}
          fontWeight="900"
          letterSpacing={-1}
        >
          {title}
        </Paragraph>
        {subtitle ? (
          <Paragraph color="$color10" fontSize={mobile ? '$2' : '$3'} style={{ maxWidth: 620 }}>
            {subtitle}
          </Paragraph>
        ) : null}
      </YStack>
      {actions ? <XStack gap="$2" items="center" flexWrap="wrap">{actions}</XStack> : null}
    </XStack>
  )
}

export function HeaderAction(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="$3"
      bg="$color3"
      borderColor="$borderColor"
      borderWidth={1}
      rounded="$5"
      hoverStyle={{ bg: '$color4', borderColor: '$borderColorHover' }}
      pressStyle={{ scale: 0.98 }}
      {...props}
    />
  )
}
