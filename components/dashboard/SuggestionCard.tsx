import { Paragraph, Spinner, XStack, YStack } from 'tamagui'
import { formatDate, formatNumber } from 'lib/format'
import { SurfaceCard } from 'components/ui/SurfaceCard'

export function SuggestionCard({
  icon: Icon,
  title,
  rows,
  emptyLabel,
  accentColor,
}: {
  icon: any
  title: string
  rows: Array<any> | undefined
  emptyLabel: string
  accentColor: string
}) {
  return (
    <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 280 }}>
      <XStack items="center" gap="$2">
        <YStack
          items="center"
          justify="center"
          rounded="$10"
          p="$3"
          bg="$color3"
        >
          <Icon size={20} color={accentColor} />
        </YStack>
        <Paragraph fontSize="$5" fontWeight="800">
          {title}
        </Paragraph>
      </XStack>

      {rows === undefined ? (
        <XStack items="center" gap="$2">
          <Spinner size="small" />
          <Paragraph color="$color8" fontSize="$2">Loading…</Paragraph>
        </XStack>
      ) : rows.length === 0 ? (
        <Paragraph color="$color8" fontSize="$2">{emptyLabel}</Paragraph>
      ) : (
        <YStack gap="$1">
          {rows.slice(0, 3).map((row, index) => (
            <XStack
              key={`${row.productCode ?? row.returnCode ?? index}`}
              justify="space-between"
              items="center"
              gap="$2"
              py="$1.5"
              borderBottomWidth={index < Math.min(rows.length, 3) - 1 ? 1 : 0}
              borderBottomColor="$borderColor"
            >
              <YStack flex={1} gap="$0.5">
                <Paragraph color="$color11" fontSize="$2" fontWeight="600" numberOfLines={1}>
                  {row.productName ?? row.returnCode ?? 'Item'}
                </Paragraph>
                <Paragraph color="$color8" fontSize="$1" numberOfLines={1}>
                  {row.displayCode ?? row.productCode ?? row.saleCode ?? ''}
                  {row.variantLabel ? ` · ${row.variantLabel}` : ''}
                </Paragraph>
              </YStack>
              <YStack items="flex-end">
                {typeof row.onHand === 'number' ? (
                  <Paragraph fontSize="$2" fontWeight="700">
                    {formatNumber(row.onHand)} pcs
                  </Paragraph>
                ) : null}
                {typeof row.growthRate === 'number' ? (
                  <Paragraph color="$green10" fontSize="$2" fontWeight="700">
                    +{row.growthRate}%
                  </Paragraph>
                ) : null}
                {row.createdAt ? (
                  <Paragraph color="$color8" fontSize="$1">
                    {formatDate(row.createdAt)}
                  </Paragraph>
                ) : null}
              </YStack>
            </XStack>
          ))}
        </YStack>
      )}
    </SurfaceCard>
  )
}
