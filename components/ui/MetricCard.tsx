import { Paragraph, YStack } from 'tamagui'
import { SurfaceCard } from './SurfaceCard'

export function MetricCard({
  label,
  value,
  detail,
  accentColor,
}: {
  label: string
  value: string
  detail?: string
  accentColor?: string
}) {
  const color = accentColor || '$accentBackground'

  return (
    <SurfaceCard flex={1} gap="$2" style={{ minWidth: 150, position: 'relative', overflow: 'hidden' }} px="$4" py="$4">
      {/* Accent left edge */}
      <YStack
        style={{
          position: 'absolute' as any,
          left: 0,
          top: 10,
          bottom: 10,
          width: 3,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />

      <Paragraph
        color="$color9"
        fontSize="$1"
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing={1}
      >
        {label}
      </Paragraph>

      <Paragraph
        fontSize="$8"
        fontWeight="900"
        letterSpacing={-0.8}
        numberOfLines={1}
        adjustsFontSizeToFit
        color="$color12"
      >
        {value}
      </Paragraph>

      {detail ? (
        <Paragraph color="$color8" fontSize="$1" numberOfLines={1}>
          {detail}
        </Paragraph>
      ) : null}
    </SurfaceCard>
  )
}