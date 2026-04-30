import { Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'
import { formatDate, formatNumber } from 'lib/format'
import { SurfaceCard } from 'components/ui/SurfaceCard'
import type { SuggestionRow } from 'types/reports'
import type { ColorTokens } from 'tamagui'

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

const toneColors: Record<Tone, { icon: string; badge: string }> = {
  accent: { icon: '$accent', badge: '$accentSoft' },
  success: { icon: '$success', badge: '$successSoft' },
  warning: { icon: '$warning', badge: '$warningSoft' },
  danger: { icon: '$danger', badge: '$dangerSoft' },
  info: { icon: '$info', badge: '$infoSoft' },
  purple: { icon: '$purple', badge: '$purpleSoft' },
}

export function SuggestionCard({
  icon: Icon,
  title,
  rows,
  emptyLabel,
  tone,
}: {
  icon: React.ElementType<any>
  title: string
  rows: SuggestionRow[] | undefined
  emptyLabel: string
  tone: Tone
}) {
  const colors = toneColors[tone]
  return (
    <SurfaceCard gap="$3" overflow="hidden">
      {/* Header */}
      <XStack items="center" gap="$2.5">
        <YStack
          items="center"
          justify="center"
          rounded="$5"
          width={36}
          height={36}
          bg={colors.badge as ColorTokens}
        >
          <Icon size={18} color={colors.icon} />
        </YStack>
        <Paragraph color="$color12" fontSize="$5" fontWeight="900" letterSpacing={-0.5}>
          {title}
        </Paragraph>
      </XStack>

      {/* Content */}
      <YStack>
        {rows === undefined ? (
          <XStack items="center" gap="$2" py="$4" justify="center">
            <Spinner size="small" color={colors.icon} />
            <Paragraph color="$color10" fontSize="$2" fontWeight="600">Analyzing…</Paragraph>
          </XStack>
        ) : rows.length === 0 ? (
          <YStack items="center" justify="center" py="$4" bg="$color2" rounded="$4" borderWidth={1} borderColor="$borderColor">
            <Paragraph color="$color9" fontSize="$2" fontWeight="600">{emptyLabel}</Paragraph>
          </YStack>
        ) : (
          <YStack gap="$2">
            {rows.slice(0, 3).map((row, index) => (
              <XStack
                key={`${row.productCode ?? row.returnCode ?? index}`}
                justify="space-between"
                items="center"
                gap="$3"
                bg="$color2"
                rounded="$4"
                px="$3"
                py="$2.5"
                borderWidth={1}
                borderColor="$borderColor"
                overflow="hidden"
              >
                {/* Left Side: Detail */}
                <YStack flex={1} style={{ minWidth: 0 }} gap={2}>
                  <Paragraph color="$color12" fontSize="$2" fontWeight="800" numberOfLines={1}>
                    {row.productName ?? row.returnCode ?? 'Unknown Item'}
                  </Paragraph>
                  <XStack items="center" gap="$1.5" overflow="hidden">
                    <Paragraph color="$color10" fontSize="$1" numberOfLines={1}>
                      {row.displayCode ?? row.productCode ?? row.saleCode ?? ''}
                    </Paragraph>
                    {row.variantLabel ? (
                      <YStack bg="$color4" px="$1.5" py="$0.25" rounded="$2">
                        <Paragraph color="$color11" fontSize={10} fontWeight="700">
                          {row.variantLabel}
                        </Paragraph>
                      </YStack>
                    ) : null}
                  </XStack>
                </YStack>

                {/* Right Side: Key Metric */}
                <YStack items="flex-end" style={{ flexShrink: 0 }}>
                  {typeof row.onHand === 'number' ? (
                    <Paragraph color={colors.icon as ColorTokens} fontSize="$3" fontWeight="900" letterSpacing={-0.5}>
                      {formatNumber(row.onHand)}
                      <Text color="$color10" fontSize="$1" fontWeight="600"> pcs</Text>
                    </Paragraph>
                  ) : null}
                  {typeof row.growthRate === 'number' ? (
                    <Paragraph color={colors.icon as ColorTokens} fontSize="$3" fontWeight="900" letterSpacing={-0.5}>
                      +{row.growthRate}%
                    </Paragraph>
                  ) : null}
                  {row.createdAt ? (
                    <Paragraph color="$color11" fontSize="$2" fontWeight="800">
                      {formatDate(row.createdAt)}
                    </Paragraph>
                  ) : null}
                </YStack>
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    </SurfaceCard>
  )
}
