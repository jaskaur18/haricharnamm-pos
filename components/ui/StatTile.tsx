import { Paragraph, XStack, YStack, useMedia } from 'tamagui'
import { SectionCard } from './SectionCard'

export function StatTile({
  label,
  value,
  detail,
  tone = 'accent',
}: {
  label: string
  value: string
  detail?: string
  tone?: 'accent' | 'info' | 'success' | 'warning' | 'danger'
}) {
  const media = useMedia()
  const mobile = media.maxMd
  const desktop = !mobile
  const toneMap = {
    accent: { bar: desktop ? '$color8' : '$accent', chip: '$accentSoft' },
    info: { bar: desktop ? '$blue10' : '$info', chip: '$infoSoft' },
    success: { bar: desktop ? '$green10' : '$success', chip: '$successSoft' },
    warning: { bar: desktop ? '$yellow10' : '$warning', chip: '$warningSoft' },
    danger: { bar: desktop ? '$red10' : '$danger', chip: '$dangerSoft' },
  } as const
  const colors = toneMap[tone]

  return (
    <SectionCard flex={1} style={{ minWidth: mobile ? 156 : 200, overflow: 'hidden' }}>
      <XStack items="center" gap="$2">
        <YStack width={4} height={mobile ? 32 : 38} rounded="$10" bg={colors.bar} />
        <Paragraph color={desktop ? '$color10' : '$textMuted'} fontSize="$1" fontWeight="700" textTransform="uppercase" letterSpacing={1.4}>
          {label}
        </Paragraph>
      </XStack>
      <Paragraph
        color={desktop ? '$color12' : '$textPrimary'}
        fontSize={mobile ? '$7' : '$8'}
        fontWeight="900"
        letterSpacing={-1}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Paragraph>
      {detail ? (
        <Paragraph color={desktop ? '$color10' : '$textSecondary'} fontSize={mobile ? '$1' : '$2'}>
          {detail}
        </Paragraph>
      ) : null}
    </SectionCard>
  )
}
