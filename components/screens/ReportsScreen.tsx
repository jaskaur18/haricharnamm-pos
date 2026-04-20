import { useEffect, useState } from 'react'
import { useAction, usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { getErrorMessage } from 'lib/errors'
import { exportTextFile } from 'lib/files'
import { formatCurrency, formatDate, formatDateTime, formatNumber } from 'lib/format'
import { MetricCard } from 'components/ui/MetricCard'
import { PageHeader } from 'components/ui/PageHeader'
import { ProductImage } from 'components/ui/ProductImage'
import { SelectionField } from 'components/ui/SelectionField'
import { SurfaceCard } from 'components/ui/SurfaceCard'
import { FormField } from 'components/ui/FormField'

type VariantOption = {
  _id: string
  productId: string
  displayCode: string
  productCode: string
  productName: string
  label: string
  mediaUrl?: string | null
}

type OverviewData = {
  metrics: {
    revenue: number
    grossRevenue: number
    returnValue: number
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
  snapshotGeneratedAt: number | null
}

type ProductPerformanceData = {
  topSelling: Array<{
    variantId: string
    productCode: string
    productName: string
    variantLabel: string
    soldQty: number
    soldRevenue: number
    lastSoldAt?: number | null
  }>
  lowSelling: Array<{
    variantId: string
    productCode: string
    productName: string
    variantLabel: string
    soldQty: number
    soldRevenue: number
    lastSoldAt?: number | null
  }>
  trendingUp: Array<{
    variantId: string
    productCode: string
    productName: string
    variantLabel: string
    current7dQty: number
    previous28dQty: number
    growthRate: number
  }>
}

type InventoryHealthData = {
  counts: { lowStock: number; outOfStock: number; slowMoving: number }
  lowStock: Array<any>
  outOfStock: Array<any>
  slowMoving: Array<any>
}

type ReturnsReportData = {
  summary: { returnValue: number; returnCount: number; returnedUnits: number }
  page: Array<{
    _id: string
    returnCode: string
    saleCode: string
    refundMethod: 'cash' | 'upi_mock'
    subtotal: number
    totalQty: number
    createdAt: number
  }>
}

const TAB_KEYS = ['overview', 'products', 'inventory', 'returns'] as const
type TabKey = typeof TAB_KEYS[number]

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Button
      onPress={onPress}
      px="$3"
      py="$2"
      rounded="$3"
      bg={active ? '$color4' : 'transparent'}
      hoverStyle={{ bg: active ? '$color4' : '$color3' }}
      pressStyle={{ bg: '$color4' }}

    >
      <Paragraph
        color={active ? '$color12' : '$color10'}
        fontSize="$3"
        fontWeight={active ? '700' : '500'}
      >
        {label}
      </Paragraph>
    </Button>
  )
}

function InsightList({
  title,
  rows,
  renderRow,
  emptyLabel,
}: {
  title: string
  rows: any[] | undefined
  renderRow: (row: any, index: number) => React.ReactNode
  emptyLabel: string
}) {
  return (
    <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 250 }}>
      <Paragraph fontSize="$4" fontWeight="700">{title}</Paragraph>
      {rows === undefined ? (
        <XStack items="center" gap="$2">
          <Spinner size="small" />
          <Paragraph color="$color7" fontSize="$2">Loading…</Paragraph>
        </XStack>
      ) : rows.length === 0 ? (
        <Paragraph color="$color7" fontSize="$2">{emptyLabel}</Paragraph>
      ) : (
        <YStack gap="$1">
          {rows.map((row, index) => renderRow(row, index))}
        </YStack>
      )}
    </SurfaceCard>
  )
}

export function ReportsScreen() {
  const toast = useToastController()
  const media = useMedia()
  const desktop = !media.maxMd
  const categories = useQuery(convexApi.inventory.listCategories, { includeInactive: true }) as CategoryNode[] | undefined
  const exportCsv = useAction(convexApi.reports.exportCsv)

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
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

  useEffect(() => { if (!categoryId) setSubcategoryId(null) }, [categoryId])

  const variantPool = usePaginatedQuery(
    convexApi.inventory.list,
    { search: null, categoryId, subcategoryId, status: 'active', stockState: 'all' },
    { initialNumItems: 120 },
  )

  const variantOptions = (variantPool.results ?? []) as VariantOption[]
  const productOptions = Array.from(
    new Map(variantOptions.map((v) => [v.productId, { label: `${v.productName} (${v.productCode})`, value: v.productId }])).values(),
  )
  const filteredVariantOptions = variantOptions
    .filter((v) => !productId || v.productId === productId)
    .map((v) => ({ label: `${v.displayCode} · ${v.label}`, value: v._id }))

  useEffect(() => {
    if (productId && !productOptions.some((o) => o.value === productId)) setProductId(null)
  }, [productId, productOptions])

  useEffect(() => {
    if (variantId && !filteredVariantOptions.some((o) => o.value === variantId)) setVariantId(null)
  }, [variantId, filteredVariantOptions])

  const filters = {
    fromDate: fromDate || null,
    toDate: toDate || null,
    categoryId,
    subcategoryId,
    productId,
    variantId,
    paymentMethod,
    returnStatus,
  }

  const overview = useQuery(convexApi.reports.overview, filters) as OverviewData | undefined
  const productPerformance = useQuery(convexApi.reports.productPerformance, filters) as ProductPerformanceData | undefined
  const inventoryHealth = useQuery(convexApi.reports.inventoryHealth, filters) as InventoryHealthData | undefined
  const [returnsPageSize, setReturnsPageSize] = useState(20)
  const returnsReport = useQuery(convexApi.reports.returnsReport, {
    ...filters,
    paginationOpts: { numItems: returnsPageSize, cursor: null },
  }) as ReturnsReportData & { isDone: boolean; continueCursor: string | null } | undefined

  async function handleExport(kind: 'overview' | 'productPerformance' | 'inventoryHealth' | 'returnsReport') {
    setIsExporting(kind)
    try {
      const csv = await exportCsv({ kind, ...filters })
      await exportTextFile({ filename: `hari-charnamm-${kind}.csv`, contents: csv, mimeType: 'text/csv' })
      toast.show('Export ready', { message: `${kind} exported.` })
    } catch (error) {
      toast.show('Export failed', { message: getErrorMessage(error) })
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <YStack gap="$4">
      <PageHeader
        title="Reports"
        actions={
          <XStack gap="$2">
            {!desktop ? (
              <Button size="$3" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={() => setFiltersOpen(!filtersOpen)}>
                Filters
              </Button>
            ) : null}
          </XStack>
        }
      />

      {/* Filters */}
      {filtersOpen ? (
        <SurfaceCard gap="$2.5">
          <XStack gap="$2" flexWrap="wrap">
            <YStack style={{ minWidth: 120 }}>
              <FormField label="From"><Input value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} /></FormField>
            </YStack>
            <YStack style={{ minWidth: 120 }}>
              <FormField label="To"><Input value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} /></FormField>
            </YStack>
            <YStack style={{ minWidth: 140 }}>
              <SelectionField label="Category" value={categoryId} placeholder="All" options={[{ label: 'All', value: null }, ...(categories ?? []).map((c) => ({ label: c.name, value: c._id }))]} onChange={setCategoryId} />
            </YStack>
            <YStack style={{ minWidth: 140 }}>
              <SelectionField label="Subcategory" value={subcategoryId} placeholder="All" options={[{ label: 'All', value: null }, ...getSubcategoryOptions(categories, categoryId)]} onChange={setSubcategoryId} />
            </YStack>
            <YStack style={{ minWidth: 150 }}>
              <SelectionField label="Product" value={productId} placeholder="All" options={[{ label: 'All', value: null }, ...productOptions]} onChange={setProductId} />
            </YStack>
            <YStack style={{ minWidth: 150 }}>
              <SelectionField label="Variant" value={variantId} placeholder="All" options={[{ label: 'All', value: null }, ...filteredVariantOptions]} onChange={setVariantId} />
            </YStack>
            <YStack style={{ minWidth: 120 }}>
              <SelectionField label="Payment" value={paymentMethod} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Cash', value: 'cash' }, { label: 'UPI', value: 'upi_mock' }]} onChange={(v) => setPaymentMethod((v as any) ?? 'all')} />
            </YStack>
          </XStack>
        </SurfaceCard>
      ) : null}

      {/* Tab bar */}
      <XStack gap="$1" bg="$color2" rounded="$4" p="$1" borderWidth={1} borderColor="$borderColor" flexWrap="wrap">
        <TabButton active={activeTab === 'overview'} label="Overview" onPress={() => setActiveTab('overview')} />
        <TabButton active={activeTab === 'products'} label="Products" onPress={() => setActiveTab('products')} />
        <TabButton active={activeTab === 'inventory'} label="Inventory" onPress={() => setActiveTab('inventory')} />
        <TabButton active={activeTab === 'returns'} label="Returns" onPress={() => setActiveTab('returns')} />
      </XStack>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' ? (
        <YStack gap="$3">
          <XStack justify="space-between" items="center">
            <Paragraph color="$color7" fontSize="$2">
              Snapshot: {overview?.snapshotGeneratedAt ? formatDateTime(overview.snapshotGeneratedAt) : 'Live'}
            </Paragraph>
            <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={() => handleExport('overview')} disabled={isExporting === 'overview'}>
              {isExporting === 'overview' ? 'Exporting…' : 'Export CSV'}
            </Button>
          </XStack>

          <XStack gap="$2.5" flexWrap="wrap">
            <MetricCard label="Revenue" value={overview ? formatCurrency(overview.metrics.revenue) : '—'} detail="Net of returns" accentColor="#E8A230" />
            <MetricCard label="Orders" value={overview ? formatNumber(overview.metrics.orderCount) : '—'} accentColor="#60A5FA" />
            <MetricCard label="Units Sold" value={overview ? formatNumber(overview.metrics.unitsSold) : '—'} accentColor="#A78BFA" />
            <MetricCard label="Avg Order" value={overview ? formatCurrency(overview.metrics.avgOrderValue) : '—'} accentColor="#34D399" />
          </XStack>

          <XStack gap="$2.5" flexWrap="wrap">
            <InsightList
              title="Trending Up"
              rows={overview?.suggestions.trendingUp}
              emptyLabel="No upward trends."
              renderRow={(row, i) => (
                <XStack key={i} justify="space-between" py="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
                  <YStack gap="$0.5">
                    <Paragraph color="$color11" fontSize="$2" fontWeight="600">{row.productName}</Paragraph>
                    <Paragraph color="$color7" fontSize="$1">{row.productCode} · {row.variantLabel}</Paragraph>
                  </YStack>
                </XStack>
              )}
            />
            <InsightList
              title="Low Stock Soon"
              rows={overview?.suggestions.lowStockSoon}
              emptyLabel="No urgent low-stock."
              renderRow={(row, i) => (
                <XStack key={i} justify="space-between" py="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
                  <Paragraph color="$color11" fontSize="$2" fontWeight="600">{row.productName}</Paragraph>
                  <Paragraph fontSize="$2" fontWeight="700">{formatNumber(row.onHand)} left</Paragraph>
                </XStack>
              )}
            />
          </XStack>
        </YStack>
      ) : null}

      {/* ── Products Tab ── */}
      {activeTab === 'products' ? (
        <YStack gap="$3">
          <XStack justify="flex-end">
            <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={() => handleExport('productPerformance')} disabled={isExporting === 'productPerformance'}>
              {isExporting === 'productPerformance' ? 'Exporting…' : 'Export CSV'}
            </Button>
          </XStack>

          <XStack gap="$2.5" flexWrap="wrap">
            <InsightList
              title="Top Selling"
              rows={productPerformance?.topSelling}
              emptyLabel="No sales yet."
              renderRow={(row, i) => (
                <XStack key={i} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
                  <YStack gap="$0.5" flex={1}>
                    <Paragraph color="$color11" fontSize="$2" fontWeight="600">{row.productName}</Paragraph>
                    <Paragraph color="$color7" fontSize="$1">{row.productCode} · {row.variantLabel}</Paragraph>
                  </YStack>
                  <YStack items="flex-end">
                    <Paragraph fontSize="$2" fontWeight="700">{formatNumber(row.soldQty)} sold</Paragraph>
                    <Paragraph color="$color7" fontSize="$1">{formatCurrency(row.soldRevenue)}</Paragraph>
                  </YStack>
                </XStack>
              )}
            />
            <InsightList
              title="Low Selling"
              rows={productPerformance?.lowSelling}
              emptyLabel="No low-selling items."
              renderRow={(row, i) => (
                <XStack key={i} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
                  <YStack gap="$0.5" flex={1}>
                    <Paragraph color="$color11" fontSize="$2" fontWeight="600">{row.productName}</Paragraph>
                    <Paragraph color="$color7" fontSize="$1">{row.productCode} · {row.variantLabel}</Paragraph>
                  </YStack>
                  <Paragraph fontSize="$2" fontWeight="700">{formatNumber(row.soldQty)} sold</Paragraph>
                </XStack>
              )}
            />
          </XStack>

          <InsightList
            title="Trend Delta"
            rows={productPerformance?.trendingUp}
            emptyLabel="No trending variants."
            renderRow={(row, i) => (
              <XStack key={i} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
                <YStack gap="$0.5" flex={1}>
                  <Paragraph color="$color11" fontSize="$2" fontWeight="600">{row.productName}</Paragraph>
                  <Paragraph color="$color7" fontSize="$1">{row.productCode} · {row.variantLabel}</Paragraph>
                </YStack>
                <Paragraph color="#86EFAC" fontSize="$2" fontWeight="700">+{row.growthRate}%</Paragraph>
              </XStack>
            )}
          />
        </YStack>
      ) : null}

      {/* ── Inventory Tab ── */}
      {activeTab === 'inventory' ? (
        <YStack gap="$3">
          <XStack justify="flex-end">
            <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={() => handleExport('inventoryHealth')} disabled={isExporting === 'inventoryHealth'}>
              {isExporting === 'inventoryHealth' ? 'Exporting…' : 'Export CSV'}
            </Button>
          </XStack>

          <XStack gap="$2.5" flexWrap="wrap">
            <MetricCard label="Low Stock" value={inventoryHealth ? formatNumber(inventoryHealth.counts.lowStock) : '—'} accentColor="#FDE047" />
            <MetricCard label="Out of Stock" value={inventoryHealth ? formatNumber(inventoryHealth.counts.outOfStock) : '—'} accentColor="#FCA5A5" />
            <MetricCard label="Slow Moving" value={inventoryHealth ? formatNumber(inventoryHealth.counts.slowMoving) : '—'} accentColor="#A78BFA" />
          </XStack>

          <XStack gap="$2.5" flexWrap="wrap">
            <InsightList
              title="Low Stock"
              rows={inventoryHealth?.lowStock}
              emptyLabel="No low-stock variants."
              renderRow={(row, i) => (
                <XStack key={i} gap="$2" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
                  <ProductImage uri={row.mediaUrl} size={32} label={row.productCode} />
                  <YStack flex={1} gap="$0.5">
                    <Paragraph color="$color11" fontSize="$2" fontWeight="600">{row.productName}</Paragraph>
                    <Paragraph color="$color7" fontSize="$1">{row.displayCode} · {row.variantLabel}</Paragraph>
                  </YStack>
                  <Paragraph fontSize="$2" fontWeight="700">{formatNumber(row.onHand)} left</Paragraph>
                </XStack>
              )}
            />
            <InsightList
              title="Out of Stock"
              rows={inventoryHealth?.outOfStock}
              emptyLabel="No stockouts."
              renderRow={(row, i) => (
                <XStack key={i} gap="$2" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
                  <ProductImage uri={row.mediaUrl} size={32} label={row.productCode} />
                  <YStack flex={1} gap="$0.5">
                    <Paragraph color="$color11" fontSize="$2" fontWeight="600">{row.productName}</Paragraph>
                    <Paragraph color="$color7" fontSize="$1">{row.displayCode} · {row.variantLabel}</Paragraph>
                  </YStack>
                </XStack>
              )}
            />
          </XStack>

          <InsightList
            title="Slow Moving"
            rows={inventoryHealth?.slowMoving}
            emptyLabel="No slow-moving flags."
            renderRow={(row, i) => (
              <XStack key={i} gap="$2" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
                <ProductImage uri={row.mediaUrl} size={32} label={row.productCode} />
                <YStack flex={1} gap="$0.5">
                  <Paragraph color="$color11" fontSize="$2" fontWeight="600">{row.productName}</Paragraph>
                  <Paragraph color="$color7" fontSize="$1">{row.displayCode} · {row.variantLabel}</Paragraph>
                </YStack>
                <Paragraph color="$color7" fontSize="$1">
                  Last: {row.lastSaleAt ? formatDate(row.lastSaleAt) : 'Never'}
                </Paragraph>
              </XStack>
            )}
          />
        </YStack>
      ) : null}

      {/* ── Returns Tab ── */}
      {activeTab === 'returns' ? (
        <YStack gap="$3">
          <XStack justify="flex-end">
            <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={() => handleExport('returnsReport')} disabled={isExporting === 'returnsReport'}>
              {isExporting === 'returnsReport' ? 'Exporting…' : 'Export CSV'}
            </Button>
          </XStack>

          <XStack gap="$2.5" flexWrap="wrap">
            <MetricCard label="Return Value" value={formatCurrency(returnsReport?.summary.returnValue ?? 0)} accentColor="#FCA5A5" />
            <MetricCard label="Return Count" value={formatNumber(returnsReport?.summary.returnCount ?? 0)} accentColor="#FDE047" />
            <MetricCard label="Returned Units" value={formatNumber(returnsReport?.summary.returnedUnits ?? 0)} accentColor="#A78BFA" />
          </XStack>

          <YStack gap="$1.5">
            {returnsReport === undefined ? (
              <XStack items="center" gap="$2" py="$4" justify="center">
                <Spinner size="small" />
                <Paragraph color="$color7" fontSize="$2">Loading returns…</Paragraph>
              </XStack>
            ) : returnsReport.page.length === 0 ? (
              <Paragraph color="$color7" fontSize="$2" py="$4" text="center">No returns match filters.</Paragraph>
            ) : (
              returnsReport.page.map((row) => (
                <XStack
                  key={row._id}
                  bg="$color2"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  p="$2.5"
                  justify="space-between"
                  items="center"
                  gap="$3"
                >
                  <YStack gap="$0.5">
                    <Paragraph fontWeight="700" fontSize="$3">{row.returnCode}</Paragraph>
                    <Paragraph color="$color7" fontSize="$1">{row.saleCode} · {formatDateTime(row.createdAt)}</Paragraph>
                  </YStack>
                  <YStack items="flex-end" gap="$0.5">
                    <Paragraph fontWeight="700" fontSize="$3">{formatCurrency(row.subtotal)}</Paragraph>
                    <Paragraph color="$color7" fontSize="$1">{formatNumber(row.totalQty)} units · {row.refundMethod}</Paragraph>
                  </YStack>
                </XStack>
              ))
            )}
          </YStack>

          {returnsReport && !returnsReport.isDone ? (
            <XStack justify="center" py="$2">
              <Button bg="$color3" borderColor="$borderColor" borderWidth={1} size="$3" onPress={() => setReturnsPageSize((c) => c + 20)}>Load more</Button>
            </XStack>
          ) : null}
        </YStack>
      ) : null}
    </YStack>
  )
}
