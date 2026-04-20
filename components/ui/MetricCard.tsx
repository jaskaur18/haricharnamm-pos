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
  return (
    <SurfaceCard flex={1} gap="$2" style={{ minWidth: 155 }}>
      <Paragraph
        color="$color10"
        fontSize="$2"
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing={0.8}
      >
        {label}
      </Paragraph>
      <Paragraph
        color="$color12"
        fontSize="$8"
        fontWeight="900"
        letterSpacing={-0.5}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Paragraph>
      {detail ? (
        <Paragraph color="$color7" fontSize="$2" numberOfLines={1}>
          {detail}
        </Paragraph>
      ) : null}
      <YStack
        style={{
          position: 'absolute' as any,
          left: 0,
          top: 8,
          bottom: 8,
          width: 3,
          borderRadius: 999,
          backgroundColor: accentColor || '#E8A230',
        }}
      />
    </SurfaceCard>
  )
}
