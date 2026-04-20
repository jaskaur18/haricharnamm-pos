import { useEffect, useState } from 'react'
import { useAction, usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, ChevronUp, Download } from '@tamagui/lucide-icons-2'
import { Button, Input, Paragraph, ScrollView, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { getErrorMessage } from 'lib/errors'
import { exportTextFile } from 'lib/files'
import { formatCurrency, formatDate, formatDateTime, formatNumber, makeBusinessDateKey } from 'lib/format'
import { MetricCard } from 'components/ui/MetricCard'
import { ProductImage } from 'components/ui/ProductImage'
import { SelectionField } from 'components/ui/SelectionField'
import { SurfaceCard } from 'components/ui/SurfaceCard'

type DatePreset = 'today' | 'week' | 'month' | 'custom'

function getPresetDates(p: DatePreset) {
  const now = new Date()
  const today = makeBusinessDateKey(now.getTime())
  if (p === 'today') return { from: today, to: today }
  if (p === 'week') { const w = new Date(now); w.setDate(w.getDate() - 6); return { from: makeBusinessDateKey(w.getTime()), to: today } }
  if (p === 'month') { const m = new Date(now); m.setDate(m.getDate() - 29); return { from: makeBusinessDateKey(m.getTime()), to: today } }
  return null
}

const TAB_KEYS = ['overview', 'products', 'inventory', 'returns'] as const
type TabKey = typeof TAB_KEYS[number]
const TAB_LABELS: Record<TabKey, string> = { overview: 'Overview', products: 'Products', inventory: 'Inventory', returns: 'Returns' }

function InsightList({ title, rows, renderRow, emptyLabel }: { title: string; rows: any[] | undefined; renderRow: (r: any, i: number) => React.ReactNode; emptyLabel: string }) {
  return (
    <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 250 }}>
      <Paragraph fontSize="$4" fontWeight="700">{title}</Paragraph>
      {rows === undefined ? <XStack items="center" gap="$2"><Spinner size="small" /><Paragraph color="$color8">Loading…</Paragraph></XStack>
        : rows.length === 0 ? <Paragraph color="$color8" fontSize="$2">{emptyLabel}</Paragraph>
        : <YStack gap="$1">{rows.map(renderRow)}</YStack>}
    </SurfaceCard>
  )
}

// Sortable table header cell
function SortHeader({ label, field, sortField, sortDir, onSort, width }: { label: string; field: string; sortField: string; sortDir: 'asc' | 'desc'; onSort: (f: string) => void; width?: number }) {
  const active = sortField === field
  return (
    <Button size="$2" bg="transparent" borderWidth={0} onPress={() => onSort(field)} px="$1" hoverStyle={{ bg: '$color3' }}>
      <XStack items="center" gap="$0.5" style={width ? { width } : undefined}>
        <Paragraph color={active ? '$color12' : '$color8'} fontSize={10} fontWeight={active ? '800' : '600'}>{label}</Paragraph>
        {active ? (sortDir === 'desc' ? <ChevronDown size={10} color="$accentBackground" /> : <ChevronUp size={10} color="$accentBackground" />) : null}
      </XStack>
    </Button>
  )
}

export function ReportsScreen() {
  const toast = useToastController()
  const media = useMedia()
  const desktop = !media.maxMd
  const categories = useQuery(convexApi.inventory.listCategories, { includeInactive: true }) as CategoryNode[] | undefined
  const exportCsv = useAction(convexApi.reports.exportCsv)

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [datePreset, setDatePreset] = useState<DatePreset>('month')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [variantId, setVariantId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'upi_mock'>('all')
  const [returnStatus, setReturnStatus] = useState<'all' | 'completed'>('all')
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(desktop)

  // Product performance sort
  const [ppSort, setPpSort] = useState<string>('soldRevenue')
  const [ppDir, setPpDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => { if (!categoryId) setSubcategoryId(null) }, [categoryId])

  const presetDates = datePreset !== 'custom' ? getPresetDates(datePreset) : null
  const activeFromDate = presetDates?.from || fromDate || null
  const activeToDate = presetDates?.to || toDate || null

  const variantPool = usePaginatedQuery(convexApi.inventory.list, { search: null, categoryId, subcategoryId, status: 'active', stockState: 'all' }, { initialNumItems: 120 })
  const variantOptions = (variantPool.results ?? []) as any[]
  const productOptions = Array.from(new Map(variantOptions.map((v: any) => [v.productId, { label: `${v.productName} (${v.productCode})`, value: v.productId }])).values())
  const filteredVariantOptions = variantOptions.filter((v: any) => !productId || v.productId === productId).map((v: any) => ({ label: `${v.displayCode} · ${v.label}`, value: v._id }))

  useEffect(() => { if (productId && !productOptions.some((o) => o.value === productId)) setProductId(null) }, [productId, productOptions])
  useEffect(() => { if (variantId && !filteredVariantOptions.some((o) => o.value === variantId)) setVariantId(null) }, [variantId, filteredVariantOptions])

  const filters = { fromDate: activeFromDate, toDate: activeToDate, categoryId, subcategoryId, productId, variantId, paymentMethod, returnStatus }
  const overview = useQuery(convexApi.reports.overview, filters) as any
  const productPerformance = useQuery(convexApi.reports.productPerformance, filters) as any
  const inventoryHealth = useQuery(convexApi.reports.inventoryHealth, filters) as any
  const [returnsPageSize, setReturnsPageSize] = useState(20)
  const returnsReport = useQuery(convexApi.reports.returnsReport, { ...filters, paginationOpts: { numItems: returnsPageSize, cursor: null } }) as any

  const TAB_TO_EXPORT_KIND: Record<TabKey, string> = { overview: 'overview', products: 'productPerformance', inventory: 'inventoryHealth', returns: 'returnsReport' }

  async function handleExport(tab: TabKey) {
    const kind = TAB_TO_EXPORT_KIND[tab]
    setIsExporting(kind)
    try {
      const csv = await exportCsv({ kind, ...filters })
      await exportTextFile({ filename: `hari-charnamm-${tab}.csv`, contents: csv, mimeType: 'text/csv' })
      toast.show('Exported')
    } catch (e) { toast.show('Failed', { message: getErrorMessage(e) }) }
    finally { setIsExporting(null) }
  }

  function handlePpSort(field: string) {
    if (ppSort === field) setPpDir(ppDir === 'desc' ? 'asc' : 'desc')
    else { setPpSort(field); setPpDir('desc') }
  }

  const sortedProducts = (productPerformance?.allVariants ?? []).slice().sort((a: any, b: any) => {
    const va = a[ppSort] ?? 0
    const vb = b[ppSort] ?? 0
    return ppDir === 'desc' ? vb - va : va - vb
  })

  return (
    <YStack gap="$4">
      <XStack justify="space-between" items="center" gap="$3" flexWrap="wrap">
        <Paragraph fontSize="$7" fontWeight="900" letterSpacing={-0.5}>Reports</Paragraph>
        <XStack gap="$2">
          {!desktop ? <Button size="$3" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={() => setFiltersOpen(!filtersOpen)}>Filters</Button> : null}
          <Button size="$3" bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} icon={<Download size={14} />} onPress={() => handleExport(activeTab)} disabled={isExporting !== null}>{isExporting ? 'Exporting…' : 'Export CSV'}</Button>
        </XStack>
      </XStack>

      {/* Date presets */}
      <XStack gap="$1.5" flexWrap="wrap" items="center">
        {(['today', 'week', 'month', 'custom'] as DatePreset[]).map((p) => (
          <Button key={p} onPress={() => setDatePreset(p)} px="$3" py="$1.5" bg={datePreset === p ? '$color4' : '$color2'} borderWidth={1} borderColor={datePreset === p ? '$accentBackground' : '$borderColor'} rounded="$10" hoverStyle={{ bg: datePreset === p ? '$color5' : '$color3' }} pressStyle={{ scale: 0.97 }}>
            <Paragraph color={datePreset === p ? '$accentBackground' : '$color9'} fontSize="$2" fontWeight={datePreset === p ? '700' : '500'}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? '30 Days' : 'Custom'}
            </Paragraph>
          </Button>
        ))}
        {datePreset === 'custom' ? (
          <XStack gap="$2" ml="$2">
            <Input value={fromDate} onChangeText={setFromDate} placeholder="From" size="$2.5" style={{ width: 130 }} bg="$color3" borderWidth={0} px="$3" />
            <Input value={toDate} onChangeText={setToDate} placeholder="To" size="$2.5" style={{ width: 130 }} bg="$color3" borderWidth={0} px="$3" />
          </XStack>
        ) : null}
      </XStack>

      {/* Filters */}
      {filtersOpen ? (
        <XStack gap="$2" flexWrap="wrap">
          <YStack style={{ minWidth: 130 }}><SelectionField label="Category" value={categoryId} placeholder="All" options={[{ label: 'All', value: null }, ...(categories ?? []).map((c) => ({ label: c.name, value: c._id }))]} onChange={setCategoryId} /></YStack>
          <YStack style={{ minWidth: 130 }}><SelectionField label="Subcategory" value={subcategoryId} placeholder="All" options={[{ label: 'All', value: null }, ...getSubcategoryOptions(categories, categoryId)]} onChange={setSubcategoryId} /></YStack>
          <YStack style={{ minWidth: 140 }}><SelectionField label="Product" value={productId} placeholder="All" options={[{ label: 'All', value: null }, ...productOptions]} onChange={setProductId} /></YStack>
          <YStack style={{ minWidth: 140 }}><SelectionField label="Variant" value={variantId} placeholder="All" options={[{ label: 'All', value: null }, ...filteredVariantOptions]} onChange={setVariantId} /></YStack>
          <YStack style={{ minWidth: 110 }}><SelectionField label="Payment" value={paymentMethod} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Cash', value: 'cash' }, { label: 'UPI', value: 'upi_mock' }]} onChange={(v) => setPaymentMethod((v as any) ?? 'all')} /></YStack>
        </XStack>
      ) : null}

      {/* Tab bar */}
      <XStack borderBottomWidth={1} borderBottomColor="$borderColor" gap="$1">
        {TAB_KEYS.map((tab) => {
          const active = activeTab === tab
          return (
            <Button key={tab} onPress={() => setActiveTab(tab)} px="$3" py="$2" bg="transparent" borderWidth={0} rounded="$1" hoverStyle={{ bg: '$color3' }} pressStyle={{ scale: 0.98 }} style={{ borderBottomWidth: 2, borderBottomColor: active ? 'var(--accentBackground)' : 'transparent', marginBottom: -1 } as any}>
              <Paragraph color={active ? '$color12' : '$color8'} fontSize="$3" fontWeight={active ? '700' : '500'}>{TAB_LABELS[tab]}</Paragraph>
            </Button>
          )
        })}
      </XStack>

      {/* ═══ Overview ═══ */}
      {activeTab === 'overview' ? (
        <YStack gap="$3">
          <XStack gap="$2.5" flexWrap="wrap">
            <MetricCard label="Revenue" value={overview ? formatCurrency(overview.metrics.revenue) : '—'} detail="Net" accentColor="#E8A230" />
            <MetricCard label="Gross" value={overview ? formatCurrency(overview.metrics.grossRevenue) : '—'} detail="Before returns" accentColor="#60A5FA" />
            <MetricCard label="Discounts" value={overview ? formatCurrency(overview.metrics.totalDiscount) : '—'} detail="Total given" accentColor="#FDE047" />
            <MetricCard label="Orders" value={overview ? formatNumber(overview.metrics.orderCount) : '—'} accentColor="#A78BFA" />
            <MetricCard label="Units" value={overview ? formatNumber(overview.metrics.unitsSold) : '—'} accentColor="#34D399" />
            <MetricCard label="Avg Order" value={overview ? formatCurrency(overview.metrics.avgOrderValue) : '—'} accentColor="#F472B6" />
          </XStack>

          {/* Payment Mix */}
          {overview?.metrics.paymentMix ? (() => {
            const cash = overview.metrics.paymentMix.cash
            const upi = overview.metrics.paymentMix.upi_mock
            const total = cash + upi
            const cashPct = total > 0 ? (cash / total) * 100 : 50
            return (
              <SurfaceCard gap="$2.5">
                <Paragraph fontSize="$3" fontWeight="700">Payment Mix</Paragraph>
                <YStack rounded="$10" overflow="hidden" height={6} bg="$color3">
                  <XStack flex={1}>
                    <YStack style={{ flex: cashPct }} bg="$color10" />
                    <YStack style={{ flex: 100 - cashPct }} bg="$accentBackground" />
                  </XStack>
                </YStack>
                <XStack gap="$4">
                  <XStack items="center" gap="$2" flex={1}>
                    <YStack width={8} height={8} rounded="$10" bg="$color10" />
                    <Paragraph color="$color9" fontSize="$2">Cash</Paragraph>
                    <Paragraph fontSize="$2" fontWeight="700" flex={1} style={{ textAlign: 'right' }}>{formatCurrency(cash)}</Paragraph>
                  </XStack>
                  <XStack items="center" gap="$2" flex={1}>
                    <YStack width={8} height={8} rounded="$10" bg="$accentBackground" />
                    <Paragraph color="$color9" fontSize="$2">UPI</Paragraph>
                    <Paragraph fontSize="$2" fontWeight="700" flex={1} style={{ textAlign: 'right' }}>{formatCurrency(upi)}</Paragraph>
                  </XStack>
                </XStack>
              </SurfaceCard>
            )
          })() : null}

          {/* Daily Breakdown Table */}
          {overview?.dailyBreakdown?.length > 0 ? (
            <SurfaceCard gap="$2">
              <Paragraph fontSize="$3" fontWeight="700">Daily Breakdown</Paragraph>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <YStack style={{ minWidth: 500 }}>
                  {/* Header */}
                  <XStack py="$1.5" px="$2" borderBottomWidth={1} borderBottomColor="$borderColor" gap="$2">
                    <Paragraph color="$color8" fontSize={10} fontWeight="600" style={{ width: 90 }}>Date</Paragraph>
                    <Paragraph color="$color8" fontSize={10} fontWeight="600" style={{ width: 60, textAlign: 'right' }}>Orders</Paragraph>
                    <Paragraph color="$color8" fontSize={10} fontWeight="600" style={{ width: 90, textAlign: 'right' }}>Revenue</Paragraph>
                    <Paragraph color="$color8" fontSize={10} fontWeight="600" style={{ width: 80, textAlign: 'right' }}>Returns</Paragraph>
                    <Paragraph color="$color8" fontSize={10} fontWeight="600" style={{ width: 90, textAlign: 'right' }}>Net</Paragraph>
                    <Paragraph color="$color8" fontSize={10} fontWeight="600" style={{ width: 80, textAlign: 'right' }}>Discounts</Paragraph>
                  </XStack>
                  {overview.dailyBreakdown.map((d: any) => (
                    <XStack key={d.date} py="$1.5" px="$2" borderBottomWidth={1} borderBottomColor="$color3" gap="$2" hoverStyle={{ bg: '$color3' }}>
                      <Paragraph fontSize="$1" fontWeight="600" style={{ width: 90 }}>{d.date}</Paragraph>
                      <Paragraph fontSize="$1" style={{ width: 60, textAlign: 'right' }}>{formatNumber(d.orders)}</Paragraph>
                      <Paragraph fontSize="$1" fontWeight="600" style={{ width: 90, textAlign: 'right' }}>{formatCurrency(d.revenue)}</Paragraph>
                      <Paragraph fontSize="$1" color="$red10" style={{ width: 80, textAlign: 'right' }}>{d.returns > 0 ? formatCurrency(d.returns) : '—'}</Paragraph>
                      <Paragraph fontSize="$1" fontWeight="700" color="$accentBackground" style={{ width: 90, textAlign: 'right' }}>{formatCurrency(d.net)}</Paragraph>
                      <Paragraph fontSize="$1" color="$color8" style={{ width: 80, textAlign: 'right' }}>{d.discounts > 0 ? formatCurrency(d.discounts) : '—'}</Paragraph>
                    </XStack>
                  ))}
                </YStack>
              </ScrollView>
            </SurfaceCard>
          ) : null}

          {/* Insights */}
          <XStack gap="$2.5" flexWrap="wrap">
            <InsightList title="Trending Up" rows={overview?.suggestions.trendingUp} emptyLabel="No trends." renderRow={(r, i) => (
              <XStack key={i} justify="space-between" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
                <YStack gap="$0.5"><Paragraph color="$color11" fontSize="$2" fontWeight="600">{r.productName}</Paragraph><Paragraph color="$color8" fontSize="$1">{r.productCode}</Paragraph></YStack>
              </XStack>
            )} />
            <InsightList title="Low Stock" rows={overview?.suggestions.lowStockSoon} emptyLabel="All good." renderRow={(r, i) => (
              <XStack key={i} justify="space-between" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
                <Paragraph color="$color11" fontSize="$2" fontWeight="600">{r.productName}</Paragraph>
                <Paragraph fontSize="$2" fontWeight="700">{formatNumber(r.onHand)} left</Paragraph>
              </XStack>
            )} />
          </XStack>
        </YStack>
      ) : null}

      {/* ═══ Products ═══ */}
      {activeTab === 'products' ? (
        <YStack gap="$3">
          {/* Category breakdown */}
          {productPerformance?.categoryBreakdown?.length > 0 ? (
            <SurfaceCard gap="$2">
              <Paragraph fontSize="$3" fontWeight="700">Category Breakdown</Paragraph>
              {productPerformance.categoryBreakdown.map((c: any) => (
                <XStack key={c.categoryId} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
                  <Paragraph fontSize="$2" fontWeight="600" color="$color11">{c.categoryName}</Paragraph>
                  <XStack gap="$4">
                    <YStack items="flex-end"><Paragraph fontSize={10} color="$color8">Revenue</Paragraph><Paragraph fontSize="$2" fontWeight="700">{formatCurrency(c.soldRevenue)}</Paragraph></YStack>
                    <YStack items="flex-end"><Paragraph fontSize={10} color="$color8">Units</Paragraph><Paragraph fontSize="$2" fontWeight="700">{formatNumber(c.soldQty)}</Paragraph></YStack>
                  </XStack>
                </XStack>
              ))}
            </SurfaceCard>
          ) : null}

          {/* Sortable performance table */}
          <SurfaceCard gap="$2">
            <XStack justify="space-between" items="center">
              <Paragraph fontSize="$3" fontWeight="700">Product Performance ({sortedProducts.length})</Paragraph>
            </XStack>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <YStack style={{ minWidth: 700 }}>
                {/* Header */}
                <XStack py="$1" px="$1" borderBottomWidth={1} borderBottomColor="$borderColor" gap="$1">
                  <YStack style={{ width: 180 }}><Paragraph color="$color8" fontSize={10} fontWeight="600">Product</Paragraph></YStack>
                  <SortHeader label="Sold" field="soldQty" sortField={ppSort} sortDir={ppDir} onSort={handlePpSort} width={60} />
                  <SortHeader label="Revenue" field="soldRevenue" sortField={ppSort} sortDir={ppDir} onSort={handlePpSort} width={80} />
                  <SortHeader label="Returns" field="returnQty" sortField={ppSort} sortDir={ppDir} onSort={handlePpSort} width={60} />
                  <SortHeader label="Net" field="netRevenue" sortField={ppSort} sortDir={ppDir} onSort={handlePpSort} width={80} />
                  <SortHeader label="Avg ₹" field="avgPrice" sortField={ppSort} sortDir={ppDir} onSort={handlePpSort} width={70} />
                </XStack>
                {sortedProducts.slice(0, 50).map((r: any) => (
                  <XStack key={r.variantId} py="$1.5" px="$1" borderBottomWidth={1} borderBottomColor="$color3" gap="$1" hoverStyle={{ bg: '$color3' }}>
                    <YStack style={{ width: 180 }} gap="$0.25">
                      <Paragraph fontSize="$1" fontWeight="600" numberOfLines={1}>{r.productName}</Paragraph>
                      <Paragraph color="$color8" fontSize={9}>{r.productCode} · {r.variantLabel}</Paragraph>
                    </YStack>
                    <Paragraph fontSize="$1" fontWeight="600" style={{ width: 60, textAlign: 'right' }}>{formatNumber(r.soldQty)}</Paragraph>
                    <Paragraph fontSize="$1" fontWeight="700" style={{ width: 80, textAlign: 'right' }}>{formatCurrency(r.soldRevenue)}</Paragraph>
                    <Paragraph fontSize="$1" color={r.returnQty > 0 ? '$red10' : '$color8'} style={{ width: 60, textAlign: 'right' }}>{r.returnQty > 0 ? formatNumber(r.returnQty) : '—'}</Paragraph>
                    <Paragraph fontSize="$1" fontWeight="700" color="$accentBackground" style={{ width: 80, textAlign: 'right' }}>{formatCurrency(r.netRevenue)}</Paragraph>
                    <Paragraph fontSize="$1" style={{ width: 70, textAlign: 'right' }}>{formatCurrency(r.avgPrice)}</Paragraph>
                  </XStack>
                ))}
                {sortedProducts.length > 50 ? <Paragraph color="$color8" fontSize="$1" py="$2" style={{ textAlign: 'center' }}>Showing 50 of {sortedProducts.length}</Paragraph> : null}
              </YStack>
            </ScrollView>
          </SurfaceCard>

          {/* Dead stock */}
          {productPerformance?.deadStock?.length > 0 ? (
            <InsightList title={`Dead Stock (${productPerformance.deadStock.length})`} rows={productPerformance.deadStock} emptyLabel="None." renderRow={(r: any, i: number) => (
              <XStack key={i} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
                <YStack gap="$0.25" flex={1}>
                  <Paragraph color="$color11" fontSize="$2" fontWeight="600">{r.productName}</Paragraph>
                  <Paragraph color="$color8" fontSize="$1">{r.displayCode} · {r.variantLabel}</Paragraph>
                </YStack>
                <Paragraph color="$color8" fontSize="$2">{formatCurrency(r.salePrice)}</Paragraph>
              </XStack>
            )} />
          ) : null}

          {/* Trending */}
          <XStack gap="$2.5" flexWrap="wrap">
            <InsightList title="Top Selling" rows={productPerformance?.topSelling} emptyLabel="No sales." renderRow={(r: any, i: number) => (
              <XStack key={i} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
                <YStack gap="$0.5" flex={1}><Paragraph color="$color11" fontSize="$2" fontWeight="600">{r.productName}</Paragraph><Paragraph color="$color8" fontSize="$1">{r.productCode} · {r.variantLabel}</Paragraph></YStack>
                <YStack items="flex-end"><Paragraph fontSize="$2" fontWeight="700">{formatNumber(r.soldQty)} sold</Paragraph><Paragraph color="$color8" fontSize="$1">{formatCurrency(r.soldRevenue)}</Paragraph></YStack>
              </XStack>
            )} />
            <InsightList title="Low Selling" rows={productPerformance?.lowSelling} emptyLabel="None." renderRow={(r: any, i: number) => (
              <XStack key={i} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
                <YStack gap="$0.5" flex={1}><Paragraph color="$color11" fontSize="$2" fontWeight="600">{r.productName}</Paragraph></YStack>
                <Paragraph fontSize="$2" fontWeight="700">{formatNumber(r.soldQty)} sold</Paragraph>
              </XStack>
            )} />
          </XStack>
        </YStack>
      ) : null}

      {/* ═══ Inventory ═══ */}
      {activeTab === 'inventory' ? (
        <YStack gap="$3">
          <XStack gap="$2.5" flexWrap="wrap">
            <MetricCard label="Stock Value" value={inventoryHealth ? formatCurrency(inventoryHealth.totalStockValue) : '—'} detail="@ sale price" accentColor="#E8A230" />
            <MetricCard label="Total SKUs" value={inventoryHealth ? formatNumber(inventoryHealth.totalSKUs) : '—'} detail="Active variants" accentColor="#60A5FA" />
            <MetricCard label="Low Stock" value={inventoryHealth ? formatNumber(inventoryHealth.counts.lowStock) : '—'} accentColor="#FDE047" />
            <MetricCard label="Out of Stock" value={inventoryHealth ? formatNumber(inventoryHealth.counts.outOfStock) : '—'} accentColor="#FCA5A5" />
            <MetricCard label="Slow Moving" value={inventoryHealth ? formatNumber(inventoryHealth.counts.slowMoving) : '—'} accentColor="#A78BFA" />
          </XStack>

          {/* Stock tier distribution */}
          {inventoryHealth?.stockTiers ? (
            <SurfaceCard gap="$2">
              <Paragraph fontSize="$3" fontWeight="700">Stock Distribution</Paragraph>
              <XStack gap="$2" flexWrap="wrap">
                {[
                  { label: 'Empty (0)', count: inventoryHealth.stockTiers.zero, color: '#FCA5A5' },
                  { label: 'Critical (1-5)', count: inventoryHealth.stockTiers.low, color: '#FDE047' },
                  { label: 'Normal (6-20)', count: inventoryHealth.stockTiers.medium, color: '#60A5FA' },
                  { label: 'Healthy (20+)', count: inventoryHealth.stockTiers.high, color: '#34D399' },
                ].map((t) => (
                  <YStack key={t.label} flex={1} bg="$color3" rounded="$4" p="$2.5" gap="$0.5" items="center" style={{ minWidth: 100 }}>
                    <YStack width={8} height={8} rounded="$10" style={{ backgroundColor: t.color }} />
                    <Paragraph fontWeight="800" fontSize="$4">{formatNumber(t.count)}</Paragraph>
                    <Paragraph color="$color8" fontSize={10}>{t.label}</Paragraph>
                  </YStack>
                ))}
              </XStack>
            </SurfaceCard>
          ) : null}

          <XStack gap="$2.5" flexWrap="wrap">
            <InsightList title="Low Stock" rows={inventoryHealth?.lowStock} emptyLabel="None." renderRow={(r: any, i: number) => (
              <XStack key={i} gap="$2" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
                <ProductImage uri={r.mediaUrl} size={32} label={r.productCode} />
                <YStack flex={1}>
                  <Paragraph color="$color11" fontSize="$2" fontWeight="600">{r.productName}</Paragraph>
                  <Paragraph color="$color8" fontSize="$1">{r.displayCode}{r.daysSinceSale != null ? ` · ${r.daysSinceSale}d ago` : ''}</Paragraph>
                </YStack>
                <YStack items="flex-end">
                  <Paragraph fontSize="$2" fontWeight="700">{formatNumber(r.onHand)} left</Paragraph>
                  {r.recommendedReorder > 0 ? <Paragraph color="$accentBackground" fontSize={9}>+{r.recommendedReorder} needed</Paragraph> : null}
                </YStack>
              </XStack>
            )} />
            <InsightList title="Out of Stock" rows={inventoryHealth?.outOfStock} emptyLabel="None." renderRow={(r: any, i: number) => (
              <XStack key={i} gap="$2" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
                <ProductImage uri={r.mediaUrl} size={32} label={r.productCode} />
                <YStack flex={1}>
                  <Paragraph color="$color11" fontSize="$2" fontWeight="600">{r.productName}</Paragraph>
                  <Paragraph color="$color8" fontSize="$1">{r.displayCode}{r.daysSinceSale != null ? ` · ${r.daysSinceSale}d ago` : ''}</Paragraph>
                </YStack>
                <YStack items="flex-end">
                  <Paragraph fontSize="$2" fontWeight="700" color="$red10">0</Paragraph>
                  {r.stockValue > 0 ? <Paragraph color="$color8" fontSize={9}>{formatCurrency(r.stockValue)}</Paragraph> : null}
                </YStack>
              </XStack>
            )} />
          </XStack>

          <InsightList title="Slow Moving (45+ days)" rows={inventoryHealth?.slowMoving} emptyLabel="None." renderRow={(r: any, i: number) => (
            <XStack key={i} gap="$2" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
              <ProductImage uri={r.mediaUrl} size={32} label={r.productCode} />
              <YStack flex={1}>
                <Paragraph color="$color11" fontSize="$2" fontWeight="600">{r.productName}</Paragraph>
                <Paragraph color="$color8" fontSize="$1">{r.displayCode} · {formatNumber(r.onHand)} on hand</Paragraph>
              </YStack>
              <YStack items="flex-end">
                <Paragraph fontSize="$2" fontWeight="700" color="$color8">{r.daysSinceSale != null ? `${r.daysSinceSale}d` : 'Never'}</Paragraph>
                <Paragraph color="$color8" fontSize={9}>{formatCurrency(r.stockValue ?? 0)} value</Paragraph>
              </YStack>
            </XStack>
          )} />
        </YStack>
      ) : null}

      {/* ═══ Returns ═══ */}
      {activeTab === 'returns' ? (
        <YStack gap="$3">
          <XStack gap="$2.5" flexWrap="wrap">
            <MetricCard label="Return Value" value={formatCurrency(returnsReport?.summary.returnValue ?? 0)} accentColor="#FCA5A5" />
            <MetricCard label="Count" value={formatNumber(returnsReport?.summary.returnCount ?? 0)} accentColor="#FDE047" />
            <MetricCard label="Units" value={formatNumber(returnsReport?.summary.returnedUnits ?? 0)} accentColor="#A78BFA" />
            <MetricCard label="Return Rate" value={returnsReport ? `${returnsReport.summary.returnRate.toFixed(1)}%` : '—'} detail="Of total sales" accentColor="#F472B6" />
            <MetricCard label="% of Revenue" value={returnsReport ? `${returnsReport.summary.returnValuePct.toFixed(1)}%` : '—'} detail="Return value / revenue" accentColor="#FB923C" />
          </XStack>

          {/* Most returned products */}
          {returnsReport?.mostReturned?.length > 0 ? (
            <SurfaceCard gap="$2">
              <Paragraph fontSize="$3" fontWeight="700">Most Returned Products</Paragraph>
              {returnsReport.mostReturned.map((r: any, i: number) => (
                <XStack key={i} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
                  <YStack gap="$0.25" flex={1}>
                    <Paragraph color="$color11" fontSize="$2" fontWeight="600">{r.productName}</Paragraph>
                    <Paragraph color="$color8" fontSize="$1">{r.productCode} · {r.variantLabel}</Paragraph>
                  </YStack>
                  <XStack gap="$3">
                    <YStack items="flex-end"><Paragraph fontSize={10} color="$color8">Qty</Paragraph><Paragraph fontSize="$2" fontWeight="700" color="$red10">{formatNumber(r.returnQty)}</Paragraph></YStack>
                    <YStack items="flex-end"><Paragraph fontSize={10} color="$color8">Value</Paragraph><Paragraph fontSize="$2" fontWeight="700">{formatCurrency(r.returnValue)}</Paragraph></YStack>
                  </XStack>
                </XStack>
              ))}
            </SurfaceCard>
          ) : null}

          {/* Return list with items */}
          <YStack gap="$1.5">
            {returnsReport === undefined ? <XStack items="center" gap="$2" py="$4" justify="center"><Spinner size="small" /></XStack>
              : returnsReport.page.length === 0 ? <Paragraph color="$color8" fontSize="$2" py="$4" style={{ textAlign: 'center' }}>No returns.</Paragraph>
              : returnsReport.page.map((r: any) => (
                <SurfaceCard key={r._id} gap="$2">
                  <XStack justify="space-between" items="center" gap="$3">
                    <YStack gap="$0.5">
                      <Paragraph fontWeight="700" fontSize="$3">{r.returnCode}</Paragraph>
                      <Paragraph color="$color8" fontSize="$1">{r.saleCode} · {formatDateTime(r.createdAt)} · {r.refundMethod === 'cash' ? 'Cash' : 'UPI'}</Paragraph>
                    </YStack>
                    <YStack items="flex-end" gap="$0.5">
                      <Paragraph fontWeight="700" fontSize="$3" color="$red10">{formatCurrency(r.subtotal)}</Paragraph>
                      <Paragraph color="$color8" fontSize="$1">{formatNumber(r.totalQty)} units</Paragraph>
                    </YStack>
                  </XStack>
                  {r.refundNote ? <Paragraph color="$color9" fontSize="$1" fontStyle="italic">Note: {r.refundNote}</Paragraph> : null}
                  {/* Return items */}
                  {r.items?.length > 0 ? (
                    <YStack gap="$1" pl="$2" borderLeftWidth={2} borderLeftColor="$color3">
                      {r.items.map((item: any, j: number) => (
                        <XStack key={j} justify="space-between" items="center">
                          <Paragraph color="$color10" fontSize="$1">{item.productName} · {item.variantLabel}</Paragraph>
                          <XStack gap="$2">
                            <Paragraph color="$color8" fontSize="$1">{formatNumber(item.quantity)} qty</Paragraph>
                            <Paragraph fontWeight="600" fontSize="$1">{formatCurrency(item.refundAmount)}</Paragraph>
                          </XStack>
                        </XStack>
                      ))}
                    </YStack>
                  ) : null}
                </SurfaceCard>
              ))}
          </YStack>
          {returnsReport && !returnsReport.isDone ? (
            <XStack justify="center" py="$2"><Button bg="$color3" borderColor="$borderColor" borderWidth={1} size="$3" onPress={() => setReturnsPageSize((c) => c + 20)}>Load more</Button></XStack>
          ) : null}
        </YStack>
      ) : null}
    </YStack>
  )
}
