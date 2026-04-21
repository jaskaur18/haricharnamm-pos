import { useState } from 'react'
import { useRouter } from 'expo-router'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Clock,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
} from '@tamagui/lucide-icons-2'
import { useQuery } from 'convex/react'
import { Button, Paragraph, ScrollView, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { formatCurrency, formatNumber, makeBusinessDateKey } from 'lib/format'
import { ScreenScaffold } from 'components/ui/ScreenScaffold'
import { ScreenHeader, HeaderAction } from 'components/ui/ScreenHeader'
import { StatTile } from 'components/ui/StatTile'
import { SectionCard } from 'components/ui/SectionCard'
import { SuggestionCard } from 'components/dashboard/SuggestionCard'

type DatePreset = 'today' | 'yesterday' | 'week' | 'month'

function getDateRange(preset: DatePreset) {
  const now = new Date()
  const today = makeBusinessDateKey(now.getTime())
  switch (preset) {
    case 'today':
      return { fromDate: today, toDate: today }
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { fromDate: makeBusinessDateKey(y.getTime()), toDate: makeBusinessDateKey(y.getTime()) }
    }
    case 'week': {
      const w = new Date(now)
      w.setDate(w.getDate() - 6)
      return { fromDate: makeBusinessDateKey(w.getTime()), toDate: today }
    }
    case 'month': {
      const m = new Date(now)
      m.setDate(m.getDate() - 29)
      return { fromDate: makeBusinessDateKey(m.getTime()), toDate: today }
    }
  }
}

const presetLabels: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: '7 Days',
  month: '30 Days',
}

export function DashboardScreen() {
  const router = useRouter()
  const media = useMedia()
  const mobile = media.maxMd
  const [datePreset, setDatePreset] = useState<DatePreset>('today')
  const { fromDate, toDate } = getDateRange(datePreset)

  const dashboard = useQuery(convexApi.reports.overview, {
    fromDate,
    toDate,
    categoryId: null,
    subcategoryId: null,
    productId: null,
    variantId: null,
    paymentMethod: 'all',
    returnStatus: 'all',
  }) as any

  const metrics = dashboard?.metrics
  const suggestions = dashboard?.suggestions
  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  const cashAmt = metrics?.paymentMix.cash ?? 0
  const upiAmt = metrics?.paymentMix.upi_mock ?? 0
  const mixTotal = cashAmt + upiAmt
  const cashPct = mixTotal > 0 ? (cashAmt / mixTotal) * 100 : 50

  return (
    <ScreenScaffold>
      {!mobile ? (
        <ScreenHeader
          eyebrow="Operations"
          title="Dashboard"
          subtitle={todayLabel}
          actions={
            <>
              <XStack bg="$bgSurface" rounded="$12" p="$0.5" borderWidth={1} borderColor="$borderSubtle" gap="$0.5">
                {(Object.keys(presetLabels) as DatePreset[]).map((preset) => (
                  <Button
                    key={preset}
                    onPress={() => setDatePreset(preset)}
                    bg={datePreset === preset ? '$accentSoft' : 'transparent'}
                    borderWidth={0}
                    rounded="$10"
                    px="$3"
                  >
                    <Paragraph color={datePreset === preset ? '$textPrimary' : '$textMuted'} fontSize="$2" fontWeight={datePreset === preset ? '700' : '600'}>
                      {presetLabels[preset]}
                    </Paragraph>
                  </Button>
                ))}
              </XStack>
              <HeaderAction theme="accent" icon={<ShoppingCart size={14} />} onPress={() => router.replace('/pos' as any)}>
                New Sale
              </HeaderAction>
            </>
          }
        />
      ) : null}
      {mobile ? (
        <XStack bg="$bgSurface" rounded="$12" p="$0.5" borderWidth={1} borderColor="$borderSubtle" gap="$0.5">
          {(Object.keys(presetLabels) as DatePreset[]).map((preset) => (
            <Button
              key={preset}
              onPress={() => setDatePreset(preset)}
              bg={datePreset === preset ? '$accentSoft' : 'transparent'}
              borderWidth={0}
              rounded="$10"
              px="$3"
            >
              <Paragraph color={datePreset === preset ? '$textPrimary' : '$textMuted'} fontSize="$2" fontWeight={datePreset === preset ? '700' : '600'}>
                {presetLabels[preset]}
              </Paragraph>
            </Button>
          ))}
        </XStack>
      ) : null}

      {mobile ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 } as any}>
          <XStack gap="$3">
            <StatTile label="Revenue" value={metrics ? formatCurrency(metrics.revenue) : '—'} detail="Net of returns" tone="accent" />
            <StatTile label="Orders" value={metrics ? formatNumber(metrics.orderCount) : '—'} detail="Receipts" tone="info" />
            <StatTile label="Units" value={metrics ? formatNumber(metrics.unitsSold) : '—'} detail="Items sold" tone="warning" />
            <StatTile label="Avg Order" value={metrics ? formatCurrency(metrics.avgOrderValue) : '—'} detail="Per receipt" tone="success" />
          </XStack>
        </ScrollView>
      ) : (
        <XStack gap="$3" flexWrap="wrap">
          <StatTile label="Revenue" value={metrics ? formatCurrency(metrics.revenue) : '—'} detail="Net of returns" tone="accent" />
          <StatTile label="Orders" value={metrics ? formatNumber(metrics.orderCount) : '—'} detail="Receipts" tone="info" />
          <StatTile label="Units" value={metrics ? formatNumber(metrics.unitsSold) : '—'} detail="Items sold" tone="warning" />
          <StatTile label="Avg Order" value={metrics ? formatCurrency(metrics.avgOrderValue) : '—'} detail="Per receipt" tone="success" />
        </XStack>
      )}

      <XStack gap="$3" flexWrap="wrap">
        <SectionCard flex={mobile ? undefined : 1} style={{ minWidth: mobile ? '100%' as any : 340 }}>
          <XStack justify="space-between" items="center">
            <YStack gap="$0.5">
              <Paragraph color="$textPrimary" fontSize="$5" fontWeight="800">Payment Mix</Paragraph>
              <Paragraph color="$textMuted" fontSize="$2">{presetLabels[datePreset]} breakdown</Paragraph>
            </YStack>
            <Button size="$2.5" bg="$bgElevated" borderWidth={1} borderColor="$borderSubtle" onPress={() => router.replace('/sales' as any)}>
              Sales
            </Button>
          </XStack>

          <YStack gap="$3">
            <YStack rounded="$10" overflow="hidden" height={10} bg="$bgMuted">
              <XStack flex={1}>
                <YStack style={{ flex: cashPct }} bg="$info" />
                <YStack style={{ flex: 100 - cashPct }} bg="$accent" />
              </XStack>
            </YStack>
            <XStack gap="$3" flexWrap="wrap">
              <SectionCard flex={1} bg="$bgElevated" borderColor="$borderSubtle" p="$3">
                <Paragraph color="$textFaint" fontSize="$1" textTransform="uppercase" letterSpacing={1.2}>Cash</Paragraph>
                <Paragraph color="$textPrimary" fontSize="$6" fontWeight="800">{formatCurrency(cashAmt)}</Paragraph>
              </SectionCard>
              <SectionCard flex={1} bg="$bgElevated" borderColor="$borderSubtle" p="$3">
                <Paragraph color="$textFaint" fontSize="$1" textTransform="uppercase" letterSpacing={1.2}>UPI</Paragraph>
                <Paragraph color="$textPrimary" fontSize="$6" fontWeight="800">{formatCurrency(upiAmt)}</Paragraph>
              </SectionCard>
            </XStack>
          </YStack>
        </SectionCard>

        <SectionCard flex={mobile ? undefined : 1} style={{ minWidth: mobile ? '100%' as any : 340 }}>
          <Paragraph color="$textPrimary" fontSize="$5" fontWeight="800">Quick Actions</Paragraph>
          <YStack gap="$2">
            {[
              { label: 'Open POS', icon: ShoppingCart, href: '/pos' },
              { label: 'Review Inventory', icon: Boxes, href: '/inventory' },
              { label: 'View Sales', icon: BarChart3, href: '/sales' },
            ].map((action) => (
              <Button
                key={action.href}
                justify="space-between"
                icon={action.icon}
                iconAfter={ArrowRight}
                bg="$bgElevated"
                borderWidth={1}
                borderColor="$borderSubtle"
                rounded="$5"
                size="$4"
                onPress={() => router.replace(action.href as any)}
              >
                {action.label}
              </Button>
            ))}
          </YStack>
        </SectionCard>
      </XStack>

      <YStack gap="$3">
        <Paragraph color="$textPrimary" fontSize="$6" fontWeight="900">
          Active Insights
        </Paragraph>
        <XStack gap="$3" flexWrap="wrap">
          <YStack flex={1} gap="$3" style={{ minWidth: mobile ? '100%' as any : 320 }}>
            <SuggestionCard icon={AlertTriangle} title="Low Stock" rows={suggestions?.lowStockSoon} emptyLabel="No low-stock items." accentColor="#f3d46d" />
            <SuggestionCard icon={Clock} title="Slow Moving" rows={suggestions?.slowMoving} emptyLabel="No slow movers." accentColor="#d3b5ff" />
          </YStack>
          <YStack flex={1} gap="$3" style={{ minWidth: mobile ? '100%' as any : 320 }}>
            <SuggestionCard icon={TrendingUp} title="Trending Up" rows={suggestions?.trendingUp} emptyLabel="No trends detected." accentColor="#61d694" />
            <SuggestionCard icon={RotateCcw} title="Recent Returns" rows={suggestions?.recentReturns} emptyLabel="No recent returns." accentColor="#ef8c82" />
          </YStack>
        </XStack>
      </YStack>
    </ScreenScaffold>
  )
}
