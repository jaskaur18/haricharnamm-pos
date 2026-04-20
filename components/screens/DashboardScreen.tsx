import { useRouter } from 'expo-router'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Clock,
} from '@tamagui/lucide-icons-2'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { Button, Paragraph, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { formatCurrency, formatNumber, makeBusinessDateKey } from 'lib/format'
import { MetricCard } from 'components/ui/MetricCard'
import { SurfaceCard } from 'components/ui/SurfaceCard'
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

const presetLabels: Record<DatePreset, string> = { today: 'Today', yesterday: 'Yesterday', week: '7 Days', month: '30 Days' }

export function DashboardScreen() {
  const router = useRouter()
  const media = useMedia()
  const desktop = !media.maxMd
  const [datePreset, setDatePreset] = useState<DatePreset>('today')
  const { fromDate, toDate } = getDateRange(datePreset)

  const dashboard = useQuery(convexApi.reports.overview, {
    fromDate, toDate, categoryId: null, subcategoryId: null, productId: null, variantId: null, paymentMethod: 'all', returnStatus: 'all',
  }) as any

  const metrics = dashboard?.metrics
  const suggestions = dashboard?.suggestions

  const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())

  const cashAmt = metrics?.paymentMix.cash ?? 0
  const upiAmt = metrics?.paymentMix.upi_mock ?? 0
  const mixTotal = cashAmt + upiAmt
  const cashPct = mixTotal > 0 ? (cashAmt / mixTotal) * 100 : 50

  return (
    <YStack gap="$5">
      {/* Header */}
      <XStack justify="space-between" items="center" gap="$3" flexWrap="wrap">
        <YStack gap="$0.5">
          <Paragraph fontSize="$7" fontWeight="900" letterSpacing={-0.5}>Dashboard</Paragraph>
          <Paragraph color="$color8" fontSize="$2">{todayLabel}</Paragraph>
        </YStack>
        <XStack gap="$2" items="center" flexWrap="wrap">
          {/* Date preset pills */}
          <XStack bg="$color2" rounded="$10" p="$0.5" borderWidth={1} borderColor="$borderColor" gap="$0.5">
            {(Object.keys(presetLabels) as DatePreset[]).map((p) => (
              <Button key={p} onPress={() => setDatePreset(p)} px="$2.5" py="$1" bg={datePreset === p ? '$color4' : 'transparent'} borderWidth={0} rounded="$10" hoverStyle={{ bg: datePreset === p ? '$color5' : '$color3' }} pressStyle={{ scale: 0.97 }}>
                <Paragraph color={datePreset === p ? '$color12' : '$color8'} fontSize={11} fontWeight={datePreset === p ? '700' : '500'}>{presetLabels[p]}</Paragraph>
              </Button>
            ))}
          </XStack>
          <Button theme="accent" size="$3" icon={<ShoppingCart size={14} />} onPress={() => router.replace('/pos' as any)} hoverStyle={{ scale: 1.02 }} pressStyle={{ scale: 0.97 }}>
            New Sale
          </Button>
        </XStack>
      </XStack>

      {/* Metrics Row */}
      <XStack gap="$3" flexWrap="wrap">
        <MetricCard label="Revenue" value={metrics ? formatCurrency(metrics.revenue) : '—'} detail="Net of returns" accentColor="#E8A230" />
        <MetricCard label="Orders" value={metrics ? formatNumber(metrics.orderCount) : '—'} detail="Receipts" accentColor="#60A5FA" />
        <MetricCard label="Units" value={metrics ? formatNumber(metrics.unitsSold) : '—'} detail="Items sold" accentColor="#A78BFA" />
        <MetricCard label="Avg Order" value={metrics ? formatCurrency(metrics.avgOrderValue) : '—'} detail="Per receipt" accentColor="#34D399" />
      </XStack>

      {/* Payment Mix */}
      <SurfaceCard gap="$3">
        <XStack justify="space-between" items="center">
          <Paragraph fontSize="$4" fontWeight="800">Payment Mix</Paragraph>
          <Paragraph color="$color8" fontSize="$1">{presetLabels[datePreset]} breakdown</Paragraph>
        </XStack>
        {metrics ? (
          <YStack gap="$3">
            <YStack rounded="$10" overflow="hidden" height={8} bg="$color3">
              <XStack flex={1}>
                <YStack style={{ flex: cashPct }} bg="$color10" />
                <YStack style={{ flex: 100 - cashPct }} bg="$accentBackground" />
              </XStack>
            </YStack>
            <XStack gap="$4" flexWrap="wrap">
              <XStack items="center" gap="$2" flex={1}>
                <YStack width={10} height={10} rounded="$10" bg="$color10" />
                <Paragraph color="$color9" fontSize="$2" fontWeight="600">Cash</Paragraph>
                <Paragraph fontSize="$3" fontWeight="800" flex={1} style={{ textAlign: 'right' }}>{formatCurrency(cashAmt)}</Paragraph>
              </XStack>
              <XStack items="center" gap="$2" flex={1}>
                <YStack width={10} height={10} rounded="$10" bg="$accentBackground" />
                <Paragraph color="$color9" fontSize="$2" fontWeight="600">UPI</Paragraph>
                <Paragraph fontSize="$3" fontWeight="800" flex={1} style={{ textAlign: 'right' }}>{formatCurrency(upiAmt)}</Paragraph>
              </XStack>
            </XStack>
          </YStack>
        ) : (
          <XStack items="center" justify="center" py="$3"><Spinner size="small" /></XStack>
        )}
      </SurfaceCard>

      {/* Active Insights 2×2 */}
      <Paragraph fontSize="$5" fontWeight="800">Active Insights</Paragraph>
      <XStack gap="$3" flexWrap="wrap">
        <YStack flex={1} gap="$3" style={{ minWidth: desktop ? 300 : '100%' }}>
          <SuggestionCard icon={AlertTriangle} title="Low Stock" rows={suggestions?.lowStockSoon} emptyLabel="No low-stock items." accentColor="#FDE047" />
          <SuggestionCard icon={Clock} title="Slow Moving" rows={suggestions?.slowMoving} emptyLabel="No slow movers." accentColor="#A78BFA" />
        </YStack>
        <YStack flex={1} gap="$3" style={{ minWidth: desktop ? 300 : '100%' }}>
          <SuggestionCard icon={TrendingUp} title="Trending Up" rows={suggestions?.trendingUp} emptyLabel="No trends detected." accentColor="#86EFAC" />
          <SuggestionCard icon={RotateCcw} title="Recent Returns" rows={suggestions?.recentReturns} emptyLabel="No recent returns." accentColor="#FCA5A5" />
        </YStack>
      </XStack>

      {/* Quick Actions */}
      <XStack gap="$2.5" flexWrap="wrap">
        {[
          { label: 'Sales History', icon: BarChart3, href: '/sales' },
          { label: 'Analytics', icon: BarChart3, href: '/reports' },
          { label: 'Inventory', icon: Boxes, href: '/inventory' },
        ].map((a) => (
          <Button key={a.href} flex={1} bg="$color2" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color3', borderColor: '$borderColorHover' }} pressStyle={{ scale: 0.98 }} size="$4" rounded="$5" icon={a.icon} iconAfter={ArrowRight} justify="space-between" onPress={() => router.replace(a.href as any)} style={{ minWidth: 170 }}>
            {a.label}
          </Button>
        ))}
      </XStack>
    </YStack>
  )
}
