import { useRouter } from 'expo-router'
import {
  ArrowRight,
  BarChart3,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Clock,
} from '@tamagui/lucide-icons-2'
import { useQuery } from 'convex/react'
import { Button, Paragraph, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { formatCurrency, formatDate, formatNumber, makeBusinessDateKey } from 'lib/format'
import { MetricCard } from 'components/ui/MetricCard'
import { SurfaceCard } from 'components/ui/SurfaceCard'

function SuggestionCard({
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
        <YStack rounded="$3" p="$1.5" opacity={0.15} style={{ backgroundColor: accentColor }}>
          <Icon size={16} color={accentColor} />
        </YStack>
        <Paragraph fontSize="$4" fontWeight="700">
          {title}
        </Paragraph>
      </XStack>

      {rows === undefined ? (
        <XStack items="center" gap="$2">
          <Spinner size="small" />
          <Paragraph color="$color7" fontSize="$2">Loading…</Paragraph>
        </XStack>
      ) : rows.length === 0 ? (
        <Paragraph color="$color7" fontSize="$2">{emptyLabel}</Paragraph>
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
                <Paragraph color="$color7" fontSize="$1" numberOfLines={1}>
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
                  <Paragraph color="#86EFAC" fontSize="$2" fontWeight="700">
                    +{row.growthRate}%
                  </Paragraph>
                ) : null}
                {row.createdAt ? (
                  <Paragraph color="$color7" fontSize="$1">
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

export function DashboardScreen() {
  const router = useRouter()
  const media = useMedia()
  const desktop = !media.maxMd
  const today = makeBusinessDateKey()
  const dashboard = useQuery(convexApi.reports.overview, {
    fromDate: today,
    toDate: today,
    categoryId: null,
    subcategoryId: null,
    productId: null,
    variantId: null,
    paymentMethod: 'all',
    returnStatus: 'all',
  }) as
    | {
        metrics: {
          revenue: number
          orderCount: number
          unitsSold: number
          avgOrderValue: number
          paymentMix: { cash: number; upi_mock: number }
        }
        suggestions: {
          lowStockSoon: Array<any>
          trendingUp: Array<any>
          slowMoving: Array<any>
          recentReturns: Array<any>
        }
      }
    | undefined

  const metrics = dashboard?.metrics
  const suggestions = dashboard?.suggestions

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  return (
    <YStack gap="$5">
      {/* Header with date and quick actions */}
      <XStack justify="space-between" items="center" gap="$3" flexWrap="wrap">
        <YStack gap="$0.5">
          <Paragraph fontSize="$7" fontWeight="800" letterSpacing={-0.3}>
            Dashboard
          </Paragraph>
          <Paragraph color="$color7" fontSize="$2">{todayLabel}</Paragraph>
        </YStack>
        <XStack gap="$2">
          <Button
            bg="$color8"
           
           
            size="$3"
            icon={ShoppingCart}
            onPress={() => router.replace('/pos' as any)}
          >
            {desktop ? 'New Sale' : 'POS'}
          </Button>
          <Button
            bg="$color3"
            borderColor="$borderColor"
            borderWidth={1}
           
            size="$3"
            icon={PackagePlus}
            onPress={() => router.replace('/inventory' as any)}
          >
            {desktop ? 'Add Stock' : 'Stock'}
          </Button>
        </XStack>
      </XStack>

      {/* KPI Metrics Row */}
      <XStack gap="$3" flexWrap="wrap">
        <MetricCard
          label="Revenue"
          value={metrics ? formatCurrency(metrics.revenue) : '—'}
          detail="Net of returns today"
          accentColor="#E8A230"
        />
        <MetricCard
          label="Orders"
          value={metrics ? formatNumber(metrics.orderCount) : '—'}
          detail="Receipts today"
          accentColor="#60A5FA"
        />
        <MetricCard
          label="Units"
          value={metrics ? formatNumber(metrics.unitsSold) : '—'}
          detail="Sold across variants"
          accentColor="#A78BFA"
        />
        <MetricCard
          label="Avg Order"
          value={metrics ? formatCurrency(metrics.avgOrderValue) : '—'}
          detail="Per receipt average"
          accentColor="#34D399"
        />
      </XStack>

      {/* Payment Mix + Navigation Cards */}
      <XStack gap="$3" flexWrap="wrap">
        <SurfaceCard flex={1} gap="$3" style={{ minWidth: 280 }}>
          <Paragraph fontSize="$4" fontWeight="700">
            Payment Mix
          </Paragraph>
          {metrics ? (
            <XStack gap="$3">
              <YStack flex={1} bg="$color3" rounded="$4" p="$3" gap="$1">
                <Paragraph color="$color7" fontSize="$1" fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
                  Cash
                </Paragraph>
                <Paragraph fontSize="$6" fontWeight="800">
                  {formatCurrency(metrics.paymentMix.cash)}
                </Paragraph>
              </YStack>
              <YStack flex={1} bg="$color3" rounded="$4" p="$3" gap="$1">
                <Paragraph color="$color7" fontSize="$1" fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
                  UPI
                </Paragraph>
                <Paragraph fontSize="$6" fontWeight="800">
                  {formatCurrency(metrics.paymentMix.upi_mock)}
                </Paragraph>
              </YStack>
            </XStack>
          ) : (
            <XStack items="center" gap="$2">
              <Spinner size="small" />
              <Paragraph color="$color7" fontSize="$2">Loading…</Paragraph>
            </XStack>
          )}
        </SurfaceCard>

        {/* Sales & Reports quick access (replaces bottom tabs) */}
        <SurfaceCard gap="$2.5" style={{ minWidth: 200, width: desktop ? 240 : '100%' }}>
          <Paragraph fontSize="$4" fontWeight="700">
            Quick Access
          </Paragraph>
          <YStack gap="$1.5">
            <Button
              bg="$color3"
              borderColor="$borderColor"
              borderWidth={1}
             
              size="$3"
              icon={ReceiptText}
              iconAfter={ArrowRight}
              justify="flex-start"
              onPress={() => router.replace('/sales' as any)}
            >
              Sales History
            </Button>
            <Button
              bg="$color3"
              borderColor="$borderColor"
              borderWidth={1}
             
              size="$3"
              icon={BarChart3}
              iconAfter={ArrowRight}
              justify="flex-start"
              onPress={() => router.replace('/reports' as any)}
            >
              Reports
            </Button>
          </YStack>
        </SurfaceCard>
      </XStack>

      {/* Suggestions 2x2 Grid */}
      <XStack gap="$3" flexWrap="wrap">
        <SuggestionCard
          icon={AlertTriangle}
          title="Low Stock"
          rows={suggestions?.lowStockSoon}
          emptyLabel="No low-stock items right now."
          accentColor="#FDE047"
        />
        <SuggestionCard
          icon={TrendingUp}
          title="Trending Up"
          rows={suggestions?.trendingUp}
          emptyLabel="No upward movement detected."
          accentColor="#86EFAC"
        />
      </XStack>

      <XStack gap="$3" flexWrap="wrap">
        <SuggestionCard
          icon={Clock}
          title="Slow Moving"
          rows={suggestions?.slowMoving}
          emptyLabel="No slow-moving candidates."
          accentColor="#A78BFA"
        />
        <SuggestionCard
          icon={RotateCcw}
          title="Recent Returns"
          rows={suggestions?.recentReturns}
          emptyLabel="No recent returns."
          accentColor="#FCA5A5"
        />
      </XStack>
    </YStack>
  )
}
