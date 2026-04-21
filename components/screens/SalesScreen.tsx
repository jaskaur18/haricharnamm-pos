import { useEffect, useState } from 'react'
import { Platform, RefreshControl } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useConvex, useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Calendar, Filter, MessageSquare, RotateCcw, X } from '@tamagui/lucide-icons-2'
import { Button, Input, Paragraph, ScrollView, Spinner, TextArea, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { getErrorMessage } from 'lib/errors'
import { formatCurrency, formatDateTime, formatNumber, makeBusinessDateKey, paymentMethodLabel } from 'lib/format'
import { hapticHeavy, hapticLight, hapticMedium, hapticSuccess } from 'lib/haptics'
import { buildReceiptHtml, handleReceiptOutput, saleDetailToReceipt } from 'lib/receipt'
import { FormField } from 'components/ui/FormField'
import { MetricCard } from 'components/ui/MetricCard'
import { ProductImage } from 'components/ui/ProductImage'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { ScreenScaffold } from 'components/ui/ScreenScaffold'
import { SelectionField } from 'components/ui/SelectionField'
import { StatusBadge } from 'components/ui/StatusBadge'
import { SurfaceCard } from 'components/ui/SurfaceCard'

type SaleListItem = {
  _id: string; saleCode: string; businessDate: string; status: 'completed' | 'returned_partial' | 'returned_full'
  paymentMethod: 'cash' | 'upi_mock'; customerName?: string | null; customerPhone?: string | null
  total: number; totalQty: number; itemCount: number; createdAt: number
  lineDiscountTotal?: number; orderDiscount?: number; notes?: string | null
}

type SaleDetail = {
  _id: string; saleCode: string; businessDate: string; status: 'completed' | 'returned_partial' | 'returned_full'
  paymentMethod: 'cash' | 'upi_mock'; paymentNote?: string | null; customerName?: string | null; customerPhone?: string | null
  subtotal: number; lineDiscountTotal: number; orderDiscount: number; total: number; totalQty: number; itemCount: number
  notes?: string | null; createdAt: number
  items: Array<{ _id: string; productName: string; variantLabel: string; productCode: string; quantity: number; returnedQuantity: number; remainingQty: number; unitPrice: number; lineTotal: number; lineDiscount: number; mediaUrl?: string | null }>
  returns: Array<{ _id: string; returnCode: string; refundMethod: 'cash' | 'upi_mock'; refundNote?: string | null; subtotal: number; totalQty: number; createdAt: number; items: Array<{ quantity: number; refundAmount: number; productName: string; variantLabel: string }> }>
}

type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

function getPresetDates(p: DatePreset) {
  const now = new Date()
  const today = makeBusinessDateKey(now.getTime())
  if (p === 'today') return { from: today, to: today }
  if (p === 'yesterday') { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: makeBusinessDateKey(y.getTime()), to: makeBusinessDateKey(y.getTime()) } }
  if (p === '7d') { const w = new Date(now); w.setDate(w.getDate() - 6); return { from: makeBusinessDateKey(w.getTime()), to: today } }
  if (p === '30d') { const m = new Date(now); m.setDate(m.getDate() - 29); return { from: makeBusinessDateKey(m.getTime()), to: today } }
  return null
}

const presetLabels: Record<DatePreset, string> = { today: 'Today', yesterday: 'Yesterday', '7d': '7 Days', '30d': '30 Days', custom: 'Custom' }

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
const sortLabels: Record<SortOption, string> = { date_desc: 'Newest', date_asc: 'Oldest', amount_desc: 'Highest ₹', amount_asc: 'Lowest ₹' }

type SalesInsightPreset = 'all' | 'today' | 'high_returns' | 'discount_heavy' | 'upi_only'

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function SaleDetailPanel({ saleId }: { saleId: string | null }) {
  const media = useMedia()
  const desktop = !media.maxMd
  const toast = useToastController()
  const convex = useConvex()
  const createReturn = useMutation(convexApi.pos.createReturn)
  const sale = useQuery(convexApi.pos.saleDetail, saleId ? { saleId: saleId as any } : 'skip') as SaleDetail | undefined
  const [returnOpen, setReturnOpen] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [refundMethod, setRefundMethod] = useState<'cash' | 'upi_mock'>('cash')
  const [refundNote, setRefundNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!returnOpen || !sale) { setQuantities({}); setRefundMethod('cash'); setRefundNote(''); return }
    const next: Record<string, string> = {}
    for (const item of sale.items) next[item._id] = '0'
    setQuantities(next)
  }, [returnOpen, sale])

  async function handlePrint() {
    if (!sale) return
    const receipt = saleDetailToReceipt(sale)
    if (receipt) await handleReceiptOutput(buildReceiptHtml(receipt), receipt.saleCode)
  }

  async function handleReturn() {
    if (!sale) return
    const items = sale.items.map((i) => ({ saleItemId: i._id, quantity: Number(quantities[i._id] || 0) })).filter((i) => i.quantity > 0)
    if (items.length === 0) { toast.show('Select quantities'); return }
    setIsSubmitting(true)
    try {
      const r = await createReturn({ saleId: sale._id as any, items: items.map(i => ({ ...i, saleItemId: i.saleItemId as any })), refundMethod, refundNote: refundNote.trim() || null })
      hapticHeavy()
      toast.show('Return recorded', { message: `${r.returnCode} updated.` })
      setReturnOpen(false)
    } catch (e) { toast.show('Failed', { message: getErrorMessage(e) }) }
    finally { setIsSubmitting(false) }
  }

  if (!saleId) return (
    <YStack bg="$color2" borderWidth={1} borderColor="$borderColor" borderStyle="dashed" rounded="$6" p="$5" gap="$2" items="center" justify="center" style={{ minHeight: 250 }}>
      <Paragraph color="$color12" fontSize="$5" fontWeight="700">Select a sale</Paragraph>
      <Paragraph color="$color10" fontSize="$3" style={{ textAlign: 'center' }}>Choose a receipt for details.</Paragraph>
    </YStack>
  )

  if (!sale) return <XStack items="center" gap="$2" py="$4" justify="center"><Spinner size="small" /><Paragraph color="$color10">Loading…</Paragraph></XStack>

  const hasDiscount = sale.lineDiscountTotal > 0 || sale.orderDiscount > 0
  const totalDiscount = sale.lineDiscountTotal + sale.orderDiscount

  return (
    <YStack gap="$3">
      <SurfaceCard gap="$3">
        <XStack justify="space-between" items="center" gap="$2" flexWrap="wrap">
          <YStack gap="$0.5">
            <XStack gap="$2" items="center">
              <Paragraph fontSize="$6" fontWeight="800">{sale.saleCode}</Paragraph>
              <StatusBadge status={sale.status} />
            </XStack>
            <Paragraph color={desktop ? '$color10' : '$color8'} fontSize="$2">{formatDateTime(sale.createdAt)} · {paymentMethodLabel(sale.paymentMethod)}</Paragraph>
          </YStack>
        </XStack>
        <XStack gap="$3" flexWrap="wrap">
          <YStack flex={1} bg="$color3" rounded="$4" p="$2.5" gap="$0.5" style={{ minWidth: 140 }}>
            <Paragraph color="$color8" fontSize="$1" fontWeight="600">Customer</Paragraph>
            <Paragraph color="$color12" fontWeight="700" fontSize="$3">{sale.customerName || 'Walk-in'}</Paragraph>
            <Paragraph color="$color10" fontSize="$2">{sale.customerPhone || '—'}</Paragraph>
          </YStack>
          <YStack flex={1} bg="$color3" rounded="$4" p="$2.5" gap="$0.5" style={{ minWidth: 140 }}>
            <Paragraph color="$color8" fontSize="$1" fontWeight="600">Total</Paragraph>
            <Paragraph fontWeight="800" fontSize="$5" color="$accentBackground">{formatCurrency(sale.total)}</Paragraph>
            <Paragraph color="$color10" fontSize="$2">{formatNumber(sale.totalQty)} units · {formatNumber(sale.itemCount)} items</Paragraph>
          </YStack>
        </XStack>

        {/* Discount breakdown */}
        {hasDiscount ? (
          <YStack bg="$color3" rounded="$4" p="$2.5" gap="$1">
            <Paragraph color="$color8" fontSize="$1" fontWeight="600">Discounts Applied</Paragraph>
            <XStack justify="space-between">
              <Paragraph color="$color9" fontSize="$2">Subtotal</Paragraph>
              <Paragraph color="$color12" fontSize="$2" fontWeight="600">{formatCurrency(sale.subtotal)}</Paragraph>
            </XStack>
            {sale.lineDiscountTotal > 0 ? (
              <XStack justify="space-between">
                <Paragraph color="$color9" fontSize="$2">Line discounts</Paragraph>
                <Paragraph fontSize="$2" fontWeight="600" color="$red10">-{formatCurrency(sale.lineDiscountTotal)}</Paragraph>
              </XStack>
            ) : null}
            {sale.orderDiscount > 0 ? (
              <XStack justify="space-between">
                <Paragraph color="$color9" fontSize="$2">Order discount</Paragraph>
                <Paragraph fontSize="$2" fontWeight="600" color="$red10">-{formatCurrency(sale.orderDiscount)}</Paragraph>
              </XStack>
            ) : null}
            <XStack justify="space-between" borderTopWidth={1} borderTopColor="$borderColor" pt="$1" mt="$0.5">
              <Paragraph fontWeight="700" fontSize="$2">Final total</Paragraph>
              <Paragraph fontWeight="800" fontSize="$3" color="$accentBackground">{formatCurrency(sale.total)}</Paragraph>
            </XStack>
          </YStack>
        ) : null}

        {/* Notes */}
        {sale.notes ? (
          <YStack bg="$color3" rounded="$4" p="$2.5" gap="$0.5">
            <Paragraph color="$color8" fontSize="$1" fontWeight="600">Notes</Paragraph>
            <Paragraph color="$color12" fontSize="$2">{sale.notes}</Paragraph>
          </YStack>
        ) : null}
        {sale.paymentNote ? (
          <YStack bg="$color3" rounded="$4" p="$2.5" gap="$0.5">
            <Paragraph color="$color8" fontSize="$1" fontWeight="600">Payment Note</Paragraph>
            <Paragraph color="$color12" fontSize="$2">{sale.paymentNote}</Paragraph>
          </YStack>
        ) : null}
      </SurfaceCard>

      {/* Items */}
      <SurfaceCard gap="$2.5">
        <Paragraph color="$color12" fontSize="$4" fontWeight="700">Items</Paragraph>
        {sale.items.map((item) => (
          <XStack key={item._id} gap="$2.5" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
            <ProductImage uri={item.mediaUrl} size={36} label={item.productCode} />
            <YStack flex={1} gap="$0.5">
              <Paragraph color="$color12" fontSize="$2" fontWeight="600" numberOfLines={1}>{item.productName}</Paragraph>
              <Paragraph color="$color10" fontSize="$1">{item.productCode} · {item.variantLabel}</Paragraph>
            </YStack>
            <YStack items="flex-end">
              <Paragraph color="$color12" fontSize="$3" fontWeight="700">{formatCurrency(item.lineTotal)}</Paragraph>
              <Paragraph color="$color10" fontSize="$1">{formatNumber(item.quantity)} × {formatCurrency(item.unitPrice)}{item.lineDiscount > 0 ? ` (-${formatCurrency(item.lineDiscount)})` : ''}</Paragraph>
              {item.returnedQuantity > 0 ? <Paragraph color="$red10" fontSize={10}>{formatNumber(item.returnedQuantity)} returned</Paragraph> : null}
            </YStack>
          </XStack>
        ))}
      </SurfaceCard>

      {/* Returns timeline */}
      {sale.returns.length > 0 ? (
        <SurfaceCard gap="$2.5">
          <Paragraph color="$color12" fontSize="$4" fontWeight="700">Returns</Paragraph>
          <YStack gap="$2" pl="$2">
            {sale.returns.map((r, i) => (
              <XStack key={r._id} gap="$3">
                <YStack items="center" pt="$2">
                  <YStack width={8} height={8} rounded="$10" bg="$red10" />
                  {i !== sale.returns.length - 1 && <YStack flex={1} width={2} bg="$color3" mt="$2" style={{ minHeight: 40 } as any} />}
                </YStack>
                <YStack flex={1} bg="$color3" rounded="$4" p="$3" gap="$2">
                  <XStack justify="space-between" items="center">
                    <YStack gap="$0.5">
                      <Paragraph fontWeight="800" color="$red10">{r.returnCode}</Paragraph>
                      <Paragraph color="$color10" fontSize="$1">{formatDateTime(r.createdAt)} · {paymentMethodLabel(r.refundMethod)}</Paragraph>
                    </YStack>
                    <Paragraph fontWeight="800" fontSize="$4" color="$red10">{formatCurrency(r.subtotal)}</Paragraph>
                  </XStack>
                  {r.refundNote ? <Paragraph color="$color9" fontSize="$1" fontStyle="italic">Note: {r.refundNote}</Paragraph> : null}
                  <YStack gap="$1">
                    {r.items.map((it, j) => (
                      <Paragraph key={j} color="$color12" fontSize="$2">{it.productName} · {it.variantLabel} · {formatNumber(it.quantity)} qty · {formatCurrency(it.refundAmount)}</Paragraph>
                    ))}
                  </YStack>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </SurfaceCard>
      ) : null}

      {/* Actions */}
      <XStack gap="$2" justify="flex-end">
        <Button size="$3" bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} onPress={handlePrint}>Print Receipt</Button>
        <Button size="$3" theme="accent" disabled={!sale.items.some((i) => i.remainingQty > 0)} onPress={() => setReturnOpen(true)}>Process Return</Button>
      </XStack>

      {/* Return dialog */}
      <ResponsiveDialog open={returnOpen} onOpenChange={setReturnOpen} title="Return" description="Set quantities to return.">
        <YStack gap="$3" py="$2">
          {sale.items.map((item) => (
            <XStack key={item._id} bg="$color3" rounded="$4" p="$3" justify="space-between" items="center" gap="$3">
              <YStack flex={1} gap="$0.5">
                <Paragraph fontWeight="800" fontSize="$3">{item.productName}</Paragraph>
                <Paragraph color="$color8" fontSize="$2">{item.variantLabel} · {formatNumber(item.remainingQty)} remain</Paragraph>
              </YStack>
              <Input value={quantities[item._id] ?? '0'} onChangeText={(v) => setQuantities((c) => ({ ...c, [item._id]: v }))} keyboardType="numeric" style={{ width: 60 }} size="$3" bg="$color2" borderWidth={1} borderColor="$borderColor" px="$4" />
            </XStack>
          ))}
          <SelectionField label="Refund method" value={refundMethod} placeholder="Select" options={[{ label: 'Cash', value: 'cash' }, { label: 'UPI', value: 'upi_mock' }]} onChange={(v) => setRefundMethod((v as any) ?? 'cash')} />
          <FormField label="Note"><TextArea value={refundNote} onChangeText={setRefundNote} placeholder="Optional" style={{ minHeight: 80 }} px="$4" py="$3" bg="$color2" borderWidth={1} borderColor="$borderColor" /></FormField>
          <XStack justify="flex-end"><Button theme="accent" onPress={handleReturn} disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Complete return'}</Button></XStack>
        </YStack>
      </ResponsiveDialog>
    </YStack>
  )
}

export function SalesScreen() {
  const router = useRouter()
  const media = useMedia()
  const desktop = !media.maxMd
  const params = useLocalSearchParams<{
    saleId?: string | string[]
    preset?: string | string[]
    from?: string | string[]
    to?: string | string[]
    payment?: string | string[]
    status?: string | string[]
    search?: string | string[]
    sort?: string | string[]
    insight?: string | string[]
  }>()
  const [search, setSearch] = useState(singleParam(params.search) || '')
  const [datePreset, setDatePreset] = useState<DatePreset>((singleParam(params.preset) as DatePreset) || '30d')
  const [fromDate, setFromDate] = useState(singleParam(params.from) || '')
  const [toDate, setToDate] = useState(singleParam(params.to) || '')
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'upi_mock'>((singleParam(params.payment) as any) || 'all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'returned_partial' | 'returned_full'>((singleParam(params.status) as any) || 'all')
  const [sortBy, setSortBy] = useState<SortOption>((singleParam(params.sort) as SortOption) || 'date_desc')
  const [insightPreset, setInsightPreset] = useState<SalesInsightPreset>((singleParam(params.insight) as SalesInsightPreset) || 'all')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(singleParam(params.saleId) || null)

  useEffect(() => {
    const id = singleParam(params.saleId)
    if (id) setSelectedSaleId(id)
    else setSelectedSaleId(null)
    setSearch(singleParam(params.search) || '')
    setDatePreset((singleParam(params.preset) as DatePreset) || '30d')
    setFromDate(singleParam(params.from) || '')
    setToDate(singleParam(params.to) || '')
    setPaymentMethod((singleParam(params.payment) as any) || 'all')
    setStatusFilter((singleParam(params.status) as any) || 'all')
    setSortBy((singleParam(params.sort) as SortOption) || 'date_desc')
    setInsightPreset((singleParam(params.insight) as SalesInsightPreset) || 'all')
  }, [params.from, params.insight, params.payment, params.preset, params.saleId, params.search, params.sort, params.status, params.to])

  const presetDates = datePreset !== 'custom' ? getPresetDates(datePreset) : null
  const activeFromDate = presetDates?.from || fromDate || null
  const activeToDate = presetDates?.to || toDate || null

  // Summary stats
  const stats = useQuery(convexApi.reports.salesSummaryStats, {
    fromDate: activeFromDate, toDate: activeToDate, paymentMethod, status: statusFilter,
  }) as any

  const { useDebounce } = require('lib/useDebounce')
  const debouncedSearch = useDebounce(search, 300)

  const { results, status, loadMore } = usePaginatedQuery(
    convexApi.pos.salesList,
    { search: debouncedSearch.trim() || null, fromDate: activeFromDate, toDate: activeToDate, paymentMethod, status: statusFilter },
    { initialNumItems: 24 },
  )
  const sales = (results ?? []) as SaleListItem[]

  // Client-side sorting
  const sorted = [...sales].sort((a, b) => {
    switch (sortBy) {
      case 'date_asc': return a.createdAt - b.createdAt
      case 'amount_desc': return b.total - a.total
      case 'amount_asc': return a.total - b.total
      default: return b.createdAt - a.createdAt
    }
  })

  // Active filter count
  const filterCount = [search, paymentMethod !== 'all', statusFilter !== 'all', insightPreset !== 'all', datePreset !== '30d'].filter(Boolean).length

  useEffect(() => {
    if (insightPreset === 'today') {
      setDatePreset('today')
      setPaymentMethod('all')
      setStatusFilter('all')
      return
    }
    if (insightPreset === 'high_returns') {
      setStatusFilter('returned_partial')
      setSortBy('amount_desc')
      return
    }
    if (insightPreset === 'discount_heavy') {
      setSortBy('amount_desc')
      return
    }
    if (insightPreset === 'upi_only') {
      setPaymentMethod('upi_mock')
    }
  }, [insightPreset])

  function clearAllFilters() {
    setSearch('')
    setPaymentMethod('all')
    setStatusFilter('all')
    setDatePreset('30d')
    setFromDate('')
    setToDate('')
    setInsightPreset('all')
  }

  const topTransactions = sorted.slice().sort((a, b) => b.total - a.total).slice(0, 5)
  const returnHeavySales = sorted.filter((sale) => sale.status !== 'completed').slice(0, 5)
  const paymentMix = sorted.reduce(
    (acc, sale) => {
      acc[sale.paymentMethod] += sale.total
      return acc
    },
    { cash: 0, upi_mock: 0 },
  )

  return (
    <ScreenScaffold scroll={desktop}>
    <YStack gap="$4">
      <XStack justify="space-between" items="center" gap="$3" flexWrap="wrap">
        {desktop ? (
          <YStack gap="$0.5">
            <Paragraph color="$color12" fontSize="$7" fontWeight="900" letterSpacing={-0.5}>Sales</Paragraph>
            <Paragraph color="$color10" fontSize="$2">Transaction history, returns & analytics.</Paragraph>
          </YStack>
        ) : null}
      </XStack>

      {/* Summary Stats */}
      {desktop ? (
        <XStack gap="$2.5" flexWrap="wrap">
          <MetricCard label="Revenue" value={stats ? formatCurrency(stats.totalRevenue) : '—'} detail="Gross" accentColor="#E8A230" />
          <MetricCard label="Returns" value={stats ? formatCurrency(stats.totalReturns) : '—'} detail="Refunded" accentColor="#FCA5A5" />
          <MetricCard label="Net" value={stats ? formatCurrency(stats.netRevenue) : '—'} detail="After returns" accentColor="#34D399" />
          <MetricCard label="Avg Order" value={stats ? formatCurrency(stats.avgOrderValue) : '—'} detail={stats ? `${formatNumber(stats.saleCount)} sales` : '—'} accentColor="#60A5FA" />
        </XStack>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 32 } as any}>
          <XStack gap="$2.5">
            <YStack style={{ minWidth: 140 }}><MetricCard label="Revenue" value={stats ? formatCurrency(stats.totalRevenue) : '—'} detail="Gross" accentColor="#E8A230" /></YStack>
            <YStack style={{ minWidth: 140 }}><MetricCard label="Returns" value={stats ? formatCurrency(stats.totalReturns) : '—'} detail="Refunded" accentColor="#FCA5A5" /></YStack>
            <YStack style={{ minWidth: 140 }}><MetricCard label="Net" value={stats ? formatCurrency(stats.netRevenue) : '—'} detail="After returns" accentColor="#34D399" /></YStack>
            <YStack style={{ minWidth: 140 }}><MetricCard label="Avg Order" value={stats ? formatCurrency(stats.avgOrderValue) : '—'} detail={stats ? `${formatNumber(stats.saleCount)} sales` : '—'} accentColor="#60A5FA" /></YStack>
          </XStack>
        </ScrollView>
      )}

      <XStack gap="$1.5" flexWrap="wrap">
        {[
          { key: 'all', label: 'All Sales' },
          { key: 'today', label: 'Today' },
          { key: 'high_returns', label: 'High Returns' },
          { key: 'discount_heavy', label: 'Discount Heavy' },
          { key: 'upi_only', label: 'UPI Only' },
        ].map((preset) => (
          <Button
            key={preset.key}
            size="$2.5"
            bg={insightPreset === preset.key ? '$color4' : '$color2'}
            borderWidth={1}
            borderColor={insightPreset === preset.key ? '$accentBackground' : '$borderColor'}
            onPress={() => setInsightPreset(preset.key as SalesInsightPreset)}
          >
            {preset.label}
          </Button>
        ))}
      </XStack>

      {/* Date presets */}
      {desktop ? (
        <XStack gap="$1.5" flexWrap="wrap" items="center">
          {(Object.keys(presetLabels) as DatePreset[]).map((p) => (
            <Button key={p} onPress={() => setDatePreset(p)} px="$3" py="$1.5" bg={datePreset === p ? '$color4' : '$color2'} borderWidth={1} borderColor={datePreset === p ? '$accentBackground' : '$borderColor'} rounded="$10" hoverStyle={{ bg: datePreset === p ? '$color5' : '$color3' }} pressStyle={{ scale: 0.97 }}>
              <Paragraph color={datePreset === p ? '$accentBackground' : '$color11'} fontSize="$2" fontWeight={datePreset === p ? '700' : '500'}>
                {presetLabels[p]}
              </Paragraph>
            </Button>
          ))}
          {datePreset === 'custom' ? (
            <XStack gap="$2" ml="$2">
              <Input value={fromDate} onChangeText={setFromDate} placeholder="From YYYY-MM-DD" size="$2.5" style={{ width: 140 }} bg="$color3" color="$color12" borderWidth={1} borderColor="$borderColor" px="$3" />
              <Input value={toDate} onChangeText={setToDate} placeholder="To YYYY-MM-DD" size="$2.5" style={{ width: 140 }} bg="$color3" color="$color12" borderWidth={1} borderColor="$borderColor" px="$3" />
            </XStack>
          ) : null}
        </XStack>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$2" pb="$2">
            {(Object.keys(presetLabels) as DatePreset[]).map((p) => (
              <Button key={p} onPress={() => setDatePreset(p)} px="$4" py="$2" bg={datePreset === p ? '$color4' : '$color2'} borderWidth={1} borderColor={datePreset === p ? '$accentBackground' : '$borderColor'} rounded="$10" pressStyle={{ scale: 0.95 }}>
                <Paragraph color={datePreset === p ? '$accentBackground' : '$color9'} fontSize="$3" fontWeight={datePreset === p ? '700' : '500'}>
                  {presetLabels[p]}
                </Paragraph>
              </Button>
            ))}
          </XStack>
        </ScrollView>
      )}

      {/* Filters */}
      <SurfaceCard gap="$2.5">
        <XStack justify="space-between" items="center">
          <XStack items="center" gap="$2">
            <Filter size={14} color="$color10" />
            <Paragraph color="$color12" fontSize="$3" fontWeight="700">Filters</Paragraph>
            {filterCount > 0 ? (
              <YStack bg="$accentBackground" rounded="$10" px="$2" py="$0.5">
                <Paragraph color="white" fontSize={10} fontWeight="800">{filterCount}</Paragraph>
              </YStack>
            ) : null}
          </XStack>
          {filterCount > 0 ? (
            <Button size="$2" bg="transparent" borderWidth={0} onPress={clearAllFilters} icon={<X size={12} />}>
              <Paragraph color="$color10" fontSize={11}>Clear all</Paragraph>
            </Button>
          ) : null}
        </XStack>
        <XStack gap="$2" flexWrap="wrap">
          <YStack flex={1} style={{ minWidth: desktop ? 160 : '100%' }}>
            <FormField label="Search"><Input value={search} onChangeText={setSearch} placeholder="Code, customer, phone…" size="$3" px="$4" bg="$color3" color="$color12" borderWidth={1} borderColor="$borderColor" /></FormField>
          </YStack>
          <YStack style={{ minWidth: desktop ? 130 : '30%', flex: desktop ? undefined : 1 }}>
            <SelectionField label="Payment" value={paymentMethod} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Cash', value: 'cash' }, { label: 'UPI', value: 'upi_mock' }]} onChange={(v) => setPaymentMethod((v as any) ?? 'all')} />
          </YStack>
          <YStack style={{ minWidth: desktop ? 130 : '30%', flex: desktop ? undefined : 1 }}>
            <SelectionField label="Status" value={statusFilter} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Completed', value: 'completed' }, { label: 'Partial Return', value: 'returned_partial' }, { label: 'Full Return', value: 'returned_full' }]} onChange={(v) => setStatusFilter((v as any) ?? 'all')} />
          </YStack>
          <YStack style={{ minWidth: desktop ? 120 : '30%', flex: desktop ? undefined : 1 }}>
            <SelectionField label="Sort" value={sortBy} placeholder="Newest" options={Object.entries(sortLabels).map(([v, l]) => ({ label: l, value: v }))} onChange={(v) => setSortBy((v as SortOption) ?? 'date_desc')} />
          </YStack>
        </XStack>
      </SurfaceCard>

      {desktop ? (
        <XStack gap="$3" flexWrap="wrap">
          <SurfaceCard flex={1} gap="$2.5" style={{ minWidth: 280 }}>
            <XStack justify="space-between" items="center">
              <Paragraph color="$color12" fontSize="$4" fontWeight="800">Top Transactions</Paragraph>
              <Button size="$2.5" bg="$color3" borderWidth={1} borderColor="$borderColor" onPress={() => router.replace('/reports?tab=sales' as any)}>
                Reports
              </Button>
            </XStack>
            <YStack gap="$1.5">
              {topTransactions.map((sale) => (
                <XStack key={sale._id} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3" onPress={() => setSelectedSaleId(sale._id)} cursor="pointer">
                  <YStack gap="$0.25">
                    <Paragraph color="$color12" fontSize="$2" fontWeight="700">{sale.saleCode}</Paragraph>
                    <Paragraph color="$color8" fontSize="$1">{formatDateTime(sale.createdAt)}</Paragraph>
                  </YStack>
                  <Paragraph color="$accentBackground" fontSize="$2" fontWeight="800">{formatCurrency(sale.total)}</Paragraph>
                </XStack>
              ))}
            </YStack>
          </SurfaceCard>
          <SurfaceCard flex={1} gap="$2.5" style={{ minWidth: 280 }}>
            <Paragraph color="$color12" fontSize="$4" fontWeight="800">Return Heavy Sales</Paragraph>
            <YStack gap="$1.5">
              {returnHeavySales.length === 0 ? (
                <Paragraph color="$color10" fontSize="$2">No returns in this range.</Paragraph>
              ) : returnHeavySales.map((sale) => (
                <XStack key={sale._id} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3" onPress={() => setSelectedSaleId(sale._id)} cursor="pointer">
                  <YStack gap="$0.25">
                    <Paragraph color="$color12" fontSize="$2" fontWeight="700">{sale.saleCode}</Paragraph>
                    <Paragraph color="$color8" fontSize="$1">{sale.status.replaceAll('_', ' ')}</Paragraph>
                  </YStack>
                  <Paragraph color="$red10" fontSize="$2" fontWeight="800">{formatCurrency(sale.total)}</Paragraph>
                </XStack>
              ))}
            </YStack>
          </SurfaceCard>
          <SurfaceCard flex={1} gap="$2.5" style={{ minWidth: 240 }}>
            <Paragraph color="$color12" fontSize="$4" fontWeight="800">Payment Split</Paragraph>
            <YStack gap="$2">
              <XStack justify="space-between"><Paragraph color="$color10" fontSize="$2">Cash</Paragraph><Paragraph color="$color12" fontWeight="700">{formatCurrency(paymentMix.cash)}</Paragraph></XStack>
              <XStack justify="space-between"><Paragraph color="$color10" fontSize="$2">UPI</Paragraph><Paragraph color="$color12" fontWeight="700">{formatCurrency(paymentMix.upi_mock)}</Paragraph></XStack>
            </YStack>
          </SurfaceCard>
        </XStack>
      ) : null}

      {/* Master-detail split */}
      {desktop ? (
        <XStack gap="$3" flexWrap="nowrap" items="flex-start">
          {/* Sale list */}
          <YStack flex={1} style={{ minWidth: 300 } as any}>
            <YStack gap="$1.5">
              {status === 'LoadingFirstPage' ? (
                <XStack items="center" gap="$2" py="$4" justify="center"><Spinner size="small" /><Paragraph color="$color10">Loading…</Paragraph></XStack>
              ) : sorted.length === 0 ? (
                <YStack bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$6" p="$4" gap="$2" items="center">
                  <Paragraph color="$color12" fontSize="$5" fontWeight="700">No sales found</Paragraph>
                  <Paragraph color="$color10">Broaden your filters.</Paragraph>
                </YStack>
              ) : sorted.map((sale) => {
                const sel = selectedSaleId === sale._id
                const hasDiscount = (sale.lineDiscountTotal ?? 0) > 0 || (sale.orderDiscount ?? 0) > 0
                return (
                  <XStack key={sale._id} onPress={() => setSelectedSaleId(sale._id)} bg={sel ? '$color4' : '$color2'} borderWidth={1} borderColor={sel ? '$accentBackground' : '$borderColor'} rounded="$4" p="$2.5" gap="$3" items="center" hoverStyle={{ bg: sel ? '$color5' : '$color3' }} pressStyle={{ scale: 0.99 }} cursor="pointer" style={{ position: 'relative', overflow: 'hidden' } as any}>
                    {sel ? <YStack bg="$accentBackground" style={{ position: 'absolute' as any, left: 0, top: 0, bottom: 0, width: 4 }} /> : null}
                    {/* Return indicator stripe */}
                    {sale.status !== 'completed' ? <YStack bg="$red10" style={{ position: 'absolute' as any, right: 0, top: 0, bottom: 0, width: 3, opacity: 0.6 }} /> : null}
                    <YStack flex={1} gap="$0.5">
                      <XStack gap="$1.5" items="center">
                        <Paragraph fontWeight="700" fontSize="$2" color={sel ? '$color12' : '$color11'}>{sale.saleCode}</Paragraph>
                        {sale.notes ? <MessageSquare size={10} color="$color7" /> : null}
                      </XStack>
                      <Paragraph color="$color10" fontSize={10}>{formatDateTime(sale.createdAt)} · {paymentMethodLabel(sale.paymentMethod)}</Paragraph>
                      <Paragraph color="$color10" fontSize={10}>{sale.customerName || 'Walk-in'}</Paragraph>
                    </YStack>
                    <YStack items="flex-end" gap="$0.5">
                      <StatusBadge status={sale.status} />
                      <Paragraph fontWeight="700" fontSize="$2" color={sel ? '$accentBackground' : '$color12'}>{formatCurrency(sale.total)}</Paragraph>
                      <XStack gap="$1" items="center">
                        <Paragraph color="$color10" fontSize={10}>{formatNumber(sale.totalQty)} units</Paragraph>
                        {hasDiscount ? <Paragraph color="$yellow10" fontSize={9} fontWeight="600">disc</Paragraph> : null}
                      </XStack>
                    </YStack>
                  </XStack>
                )
              })}
              {status === 'CanLoadMore' ? (
                <XStack justify="center" py="$2"><Button bg="$color3" borderColor="$borderColor" borderWidth={1} size="$3" onPress={() => loadMore(24)}>Load more</Button></XStack>
              ) : null}
            </YStack>
          </YStack>

          {/* Detail */}
          <YStack flex={1} style={{ minWidth: 380, position: 'sticky', top: 92 } as any}>
            <SaleDetailPanel saleId={selectedSaleId} />
          </YStack>
        </XStack>
      ) : (
        /* Mobile List View */
        <YStack gap="$2" pt="$2">
          {status === 'LoadingFirstPage' ? (
            <XStack items="center" gap="$2" py="$4" justify="center"><Spinner size="small" /><Paragraph color="$color8">Loading…</Paragraph></XStack>
          ) : sorted.length === 0 ? (
            <YStack bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$6" p="$4" gap="$2" items="center">
              <Paragraph fontSize="$5" fontWeight="700">No sales found</Paragraph>
              <Paragraph color="$color8">Broaden your filters.</Paragraph>
            </YStack>
          ) : sorted.map((sale) => {
            const hasDiscount = (sale.lineDiscountTotal ?? 0) > 0 || (sale.orderDiscount ?? 0) > 0
            return (
              <XStack key={sale._id} onPress={() => { hapticMedium(); setSelectedSaleId(sale._id) }} bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$4" p="$3" gap="$3" items="center" pressStyle={{ bg: '$color4', scale: 0.98 }} style={{ position: 'relative', overflow: 'hidden' } as any}>
                {sale.status !== 'completed' ? <YStack bg="$red10" style={{ position: 'absolute' as any, left: 0, top: 0, bottom: 0, width: 4, opacity: 0.8 }} /> : null}
                <YStack flex={1} gap="$1">
                  <XStack gap="$2" items="center">
                    <Paragraph fontWeight="800" fontSize="$4" color="$color12">{sale.saleCode}</Paragraph>
                    <StatusBadge status={sale.status} />
                  </XStack>
                  <Paragraph color="$color8" fontSize="$2">{formatDateTime(sale.createdAt)} · {paymentMethodLabel(sale.paymentMethod)}</Paragraph>
                  <XStack gap="$1.5" items="center">
                    {sale.notes ? <MessageSquare size={12} color="$color7" /> : null}
                    <Paragraph color="$color9" fontSize="$2" numberOfLines={1}>{sale.customerName || 'Walk-in customer'}</Paragraph>
                  </XStack>
                </YStack>
                <YStack items="flex-end" gap="$0.5">
                  <Paragraph fontWeight="900" fontSize="$5" color="$accentBackground">{formatCurrency(sale.total)}</Paragraph>
                  <XStack gap="$1" items="center">
                    <Paragraph color="$color8" fontSize="$2">{formatNumber(sale.totalQty)} units</Paragraph>
                    {hasDiscount ? <Paragraph color="$yellow10" fontSize={10} fontWeight="700">disc</Paragraph> : null}
                  </XStack>
                </YStack>
              </XStack>
            )
          })}
          {status === 'CanLoadMore' ? (
            <XStack justify="center" py="$4"><Button bg="$color3" borderColor="$borderColor" borderWidth={1} size="$4" onPress={() => loadMore(24)}>Load more</Button></XStack>
          ) : null}

          <ResponsiveDialog
            open={selectedSaleId !== null}
            onOpenChange={(open) => {
              if (!open) setSelectedSaleId(null)
            }}
            title={sorted.find((s) => s._id === selectedSaleId)?.saleCode || 'Sale Detail'}
          >
            <SaleDetailPanel saleId={selectedSaleId} />
          </ResponsiveDialog>
        </YStack>
      )}
    </YStack>
    </ScreenScaffold>
  )
}
