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
  const media = useMedia()
  const desktop = !media.maxMd
  const mobile = media.maxMd
  const router = useRouter()
  const wPayment = desktop ? 320 : '100%'
  const wInsight = desktop ? 320 : '100%'
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
  })

  const metrics = dashboard?.metrics
  const suggestions = dashboard?.suggestions
  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  const cashAmt = metrics?.paymentMix.cash ?? 0
  const upiAmt = metrics?.paymentMix.upi ?? 0
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
              <XStack bg="$color2" rounded="$12" p="$0.5" borderWidth={1} borderColor="$borderColor" gap="$0.5">
                {(Object.keys(presetLabels) as DatePreset[]).map((preset) => (
                  <Button
                    key={preset}
                    onPress={() => setDatePreset(preset)}
                    bg={datePreset === preset ? '$color4' : 'transparent'}
                    borderWidth={0}
                    rounded="$10"
                    px="$3"
                    hoverStyle={{ bg: datePreset === preset ? '$color4' : '$color3' }}
                  >
                    <Paragraph color={datePreset === preset ? '$color12' : '$color10'} fontSize="$2" fontWeight={datePreset === preset ? '700' : '600'}>
                      {presetLabels[preset]}
                    </Paragraph>
                  </Button>
                ))}
              </XStack>
              <HeaderAction theme="accent" icon={<ShoppingCart size={14} />} onPress={() => router.replace('/pos')}>
                New Sale
              </HeaderAction>
            </>
          }
        />
      ) : null}
      {mobile ? (
        <XStack bg="$color2" rounded="$12" p="$0.5" borderWidth={1} borderColor="$borderColor" gap="$0.5">
          {(Object.keys(presetLabels) as DatePreset[]).map((preset) => (
            <Button
              key={preset}
              onPress={() => setDatePreset(preset)}
              bg={datePreset === preset ? '$color4' : 'transparent'}
              borderWidth={0}
              rounded="$10"
              px="$3"
            >
              <Paragraph color={datePreset === preset ? '$color12' : '$color10'} fontSize="$2" fontWeight={datePreset === preset ? '700' : '600'}>
                {presetLabels[preset]}
              </Paragraph>
            </Button>
          ))}
        </XStack>
      ) : null}

      {mobile ? (
        <>
          {/* @ts-expect-error Tamagui ScrollView contentContainerStyle type mapping bug */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          <XStack gap="$3">
            <StatTile label="Revenue" value={metrics ? formatCurrency(metrics.revenue) : '—'} detail="Net of returns" tone="accent" />
            <StatTile label="Orders" value={metrics ? formatNumber(metrics.orderCount) : '—'} detail="Receipts" tone="info" />
            <StatTile label="Units" value={metrics ? formatNumber(metrics.unitsSold) : '—'} detail="Items sold" tone="warning" />
            <StatTile label="Avg Order" value={metrics ? formatCurrency(metrics.avgOrderValue) : '—'} detail="Per receipt" tone="success" />
          </XStack>
          </ScrollView>
        </>
      ) : (
        <XStack gap="$3" flexWrap="wrap">
          <StatTile label="Revenue" value={metrics ? formatCurrency(metrics.revenue) : '—'} detail="Net of returns" tone="accent" />
          <StatTile label="Orders" value={metrics ? formatNumber(metrics.orderCount) : '—'} detail="Receipts" tone="info" />
          <StatTile label="Units" value={metrics ? formatNumber(metrics.unitsSold) : '—'} detail="Items sold" tone="warning" />
          <StatTile label="Avg Order" value={metrics ? formatCurrency(metrics.avgOrderValue) : '—'} detail="Per receipt" tone="success" />
        </XStack>
      )}

      <XStack gap="$3" flexWrap="wrap">
        <SectionCard flex={mobile ? undefined : 1} minW={wPayment}>
          <XStack justify="space-between" items="center">
            <YStack gap="$0.5">
              <Paragraph color="$color12" fontSize="$5" fontWeight="800">Payment Mix</Paragraph>
              <Paragraph color="$color10" fontSize="$2">{presetLabels[datePreset]} breakdown</Paragraph>
            </YStack>
            <Button size="$2.5" bg="$color3" borderWidth={1} borderColor="$borderColor" hoverStyle={{ bg: '$color4' }} onPress={() => router.replace('/sales')}>
              <Paragraph color="$color12" fontSize="$2" fontWeight="700">Sales</Paragraph>
            </Button>
          </XStack>

          <YStack gap="$3">
            <YStack rounded="$10" overflow="hidden" height={10} bg="$color3">
              <XStack flex={1}>
                <YStack style={{ flex: cashPct }} bg="$blue10" />
                <YStack style={{ flex: 100 - cashPct }} bg="$accentBackground" />
              </XStack>
            </YStack>
            <XStack gap="$3" flexWrap="wrap">
              <SectionCard flex={1} bg="$color3" borderColor="$borderColor" p="$3">
                <Paragraph color="$color8" fontSize="$1" textTransform="uppercase" letterSpacing={1.2}>Cash</Paragraph>
                <Paragraph color="$color12" fontSize="$6" fontWeight="800">{formatCurrency(cashAmt)}</Paragraph>
              </SectionCard>
              <SectionCard flex={1} bg="$color3" borderColor="$borderColor" p="$3">
                <Paragraph color="$color8" fontSize="$1" textTransform="uppercase" letterSpacing={1.2}>UPI</Paragraph>
                <Paragraph color="$color12" fontSize="$6" fontWeight="800">{formatCurrency(upiAmt)}</Paragraph>
              </SectionCard>
            </XStack>
          </YStack>
        </SectionCard>

        <SectionCard flex={mobile ? undefined : 1} minW={wPayment}>
          <Paragraph color="$color12" fontSize="$5" fontWeight="800">Quick Actions</Paragraph>
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
                bg="$color3"
                borderWidth={1}
                borderColor="$borderColor"
                rounded="$5"
                size="$4"
                hoverStyle={{ bg: '$color4' }}
                onPress={() => router.replace(action.href as import('expo-router').Href)}
              >
                <Paragraph color="$color12" fontSize="$3" fontWeight="700">{action.label}</Paragraph>
              </Button>
            ))}
          </YStack>
        </SectionCard>
      </XStack>

      <YStack gap="$3">
        <Paragraph color="$color12" fontSize="$6" fontWeight="900">
          Active Insights
        </Paragraph>
        <XStack gap="$3" flexWrap="wrap">
          <YStack flex={1} gap="$3" minW={wInsight}>
            <SuggestionCard icon={AlertTriangle} title="Low Stock" rows={suggestions?.lowStockSoon} emptyLabel="No low-stock items." tone="warning" />
            <SuggestionCard icon={Clock} title="Slow Moving" rows={suggestions?.slowMoving} emptyLabel="No slow movers." tone="purple" />
          </YStack>
          <YStack flex={1} gap="$3" minW={wInsight}>
            <SuggestionCard icon={TrendingUp} title="Trending Up" rows={suggestions?.trendingUp} emptyLabel="No trends detected." tone="success" />
            <SuggestionCard icon={RotateCcw} title="Recent Returns" rows={suggestions?.recentReturns} emptyLabel="No recent returns." tone="danger" />
          </YStack>
        </XStack>
      </YStack>
    </ScreenScaffold>
  )
}
