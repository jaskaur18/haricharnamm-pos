import { Paragraph, XStack, YStack, useMedia } from 'tamagui'
import { SectionCard } from './SectionCard'

const toneMap = {
  accent:  { bar: '$color8',    chip: '$accentSoft' },
  info:    { bar: '$blue10',    chip: '$infoSoft' },
  success: { bar: '$green10',   chip: '$successSoft' },
  warning: { bar: '$yellow10',  chip: '$warningSoft' },
  danger:  { bar: '$red10',     chip: '$dangerSoft' },
  purple:  { bar: '$purple10',  chip: '$purpleSoft' },
} as const

export function StatTile({
  label,
  value,
  detail,
  tone = 'accent',
}: {
  label: string
  value: string
  detail?: string
  tone?: keyof typeof toneMap
}) {
  const media = useMedia()
  const mobile = media.maxMd
  const colors = toneMap[tone]

  return (
    <SectionCard flex={1} style={{ minWidth: mobile ? 156 : 200, overflow: 'hidden' }}>
      <XStack items="center" gap="$2">
        <YStack width={4} height={mobile ? 32 : 38} rounded="$10" bg={colors.bar} />
        <Paragraph color="$color10" fontSize="$1" fontWeight="700" textTransform="uppercase" letterSpacing={1.4}>
          {label}
        </Paragraph>
      </XStack>
      <Paragraph
        color="$color12"
        fontSize={mobile ? '$7' : '$8'}
        fontWeight="900"
        letterSpacing={-1}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Paragraph>
      {detail ? (
        <Paragraph color="$color10" fontSize={mobile ? '$1' : '$2'}>
          {detail}
        </Paragraph>
      ) : null}
    </SectionCard>
  )
}
