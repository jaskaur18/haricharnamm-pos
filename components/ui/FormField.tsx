import { Paragraph, YStack, useMedia } from 'tamagui'

export function FormField({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  const media = useMedia()
  const desktop = !media.maxMd
  return (
    <YStack gap="$1.5">
      <YStack gap="$0.5">
        <Paragraph color={desktop ? '$color11' : '$textSecondary'} fontSize="$2" fontWeight="700">
          {label}
        </Paragraph>
        {description ? (
          <Paragraph color={desktop ? '$color7' : '$textFaint'} fontSize="$1">
            {description}
          </Paragraph>
        ) : null}
      </YStack>
      {children}
    </YStack>
  )
}
