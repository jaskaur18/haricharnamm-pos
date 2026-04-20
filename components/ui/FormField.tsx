import { Paragraph, YStack } from 'tamagui'

export function FormField({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <YStack gap="$1.5">
      <YStack gap="$0.5">
        <Paragraph color="$color11" fontSize="$2" fontWeight="600">
          {label}
        </Paragraph>
        {description ? (
          <Paragraph color="$color7" fontSize="$1">
            {description}
          </Paragraph>
        ) : null}
      </YStack>
      {children}
    </YStack>
  )
}
