import { useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAction, usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  ReceiptText,
  RotateCcw,
  TrendingUp,
} from '@tamagui/lucide-icons-2'
import { Button, Input, Paragraph, ScrollView, Spinner, XStack, YStack, useMedia } from 'tamagui'
import type { ColorTokens } from 'tamagui'
import type { DimensionValue } from 'react-native'
import { convexApi } from 'lib/convex'
import { Id } from 'convex/_generated/dataModel'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { getErrorMessage } from 'lib/errors'
import { exportTextFile } from 'lib/files'
import { formatCurrency, formatDateTime, formatNumber } from 'lib/format'
import { hapticLight, hapticSuccess } from 'lib/haptics'
import { MobileFilterSheet } from 'components/ui/MobileFilterSheet'
import { ProductImage } from 'components/ui/ProductImage'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { ScreenHeader } from 'components/ui/ScreenHeader'
import { ScreenScaffold } from 'components/ui/ScreenScaffold'
import { SectionCard } from 'components/ui/SectionCard'
import { SelectionField } from 'components/ui/SelectionField'
import { SurfaceCard } from 'components/ui/SurfaceCard'

type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'previous_month'
  | 'this_quarter'
  | 'custom'
type TabKey = 'executive' | 'sales' | 'products' | 'inventory' | 'returns'
type ExportKind =
  | 'executiveSummary'
  | 'executiveTrend'
  | 'salesTransactions'
  | 'salesTrend'
  | 'productPerformance'
  | 'inventoryRisk'
  | 'returnsDetail'
type ExportScope = 'current_view' | 'detail_rows' | 'summary_and_detail'
type ReportRouteParams = {
  tab?: string | string[]
  preset?: string | string[]
  from?: string | string[]
  to?: string | string[]
  compare?: string | string[]
  categoryId?: string | string[]
  subcategoryId?: string | string[]
  productId?: string | string[]
  variantId?: string | string[]
  payment?: string | string[]
  salesStatus?: string | string[]
  returnStatus?: string | string[]
  stockState?: string | string[]
  movement?: string | string[]
  exportScope?: string | string[]
}

const TAB_LABELS: Record<TabKey, string> = {
  executive: 'Executive',
  sales: 'Sales',
  products: 'Products',
  inventory: 'Inventory',
  returns: 'Returns',
}

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  this_month: 'This Month',
  previous_month: 'Previous Month',
  this_quarter: 'This Quarter',
  custom: 'Custom',
}

const QUICK_PRESETS = [
  { key: 'all', label: 'All Reports' },
  { key: 'top_sellers', label: 'Top Sellers' },
  { key: 'slow_movers', label: 'Slow Movers' },
  { key: 'dead_stock', label: 'Dead Stock' },
  { key: 'high_returns', label: 'High Returns' },
  { key: 'discount_heavy', label: 'Discount Heavy' },
] as const

const EXPORT_OPTIONS: Array<{ key: ExportKind; label: string; description: string }> = [
  { key: 'executiveSummary', label: 'Executive Summary CSV', description: 'KPI totals and period summary.' },
  { key: 'executiveTrend', label: 'Sales Trend CSV', description: 'Daily revenue, orders, returns, and discount trend.' },
  { key: 'salesTransactions', label: 'Sales Transactions CSV', description: 'Transaction-level sales rows.' },
  { key: 'salesTrend', label: 'Sales Trend Breakdown CSV', description: 'Trend plus weekday mix.' },
  { key: 'productPerformance', label: 'Product Performance CSV', description: 'Product and variant ranking.' },
  { key: 'inventoryRisk', label: 'Inventory Risk CSV', description: 'Low stock, dead stock, and slow movers.' },
  { key: 'returnsDetail', label: 'Returns Detail CSV', description: 'Return rows and refund detail.' },
]

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildSalesHref({
  saleId,
  preset,
  from,
  to,
  payment,
  status,
  search,
  sort,
  insight,
}: {
  saleId?: string | null
  preset?: string
  from?: string
  to?: string
  payment?: string
  status?: string
  search?: string
  sort?: string
  insight?: string
}) {
  const query = new URLSearchParams()
  if (saleId) query.set('saleId', saleId)
  if (preset && preset !== '30d') query.set('preset', preset)
  if (from) query.set('from', from)
  if (to) query.set('to', to)
  if (payment && payment !== 'all') query.set('payment', payment)
  if (status && status !== 'all') query.set('status', status)
  if (search) query.set('search', search)
  if (sort && sort !== 'date_desc') query.set('sort', sort)
  if (insight && insight !== 'all') query.set('insight', insight)
  const value = query.toString()
  return value.length > 0 ? `/sales?${value}` : '/sales'
}

function deltaLabel(entry: { value: number; pct: number } | undefined, enabled: boolean, prefix = '') {
  if (!enabled || !entry) return undefined
  const sign = entry.value > 0 ? '+' : entry.value < 0 ? '-' : ''
  return `${sign}${prefix}${Math.abs(entry.pct).toFixed(1)}% vs previous`
}

function MetricTile({
  label,
  value,
  detail,
  accent = '$accentBackground',
}: {
  label: string
  value: string
  detail?: string
  accent?: string
}) {
  return (
    <SectionCard flex={1} style={{ minWidth: 120 }}>
      <YStack gap="$2">
        <Paragraph color="$color8" fontSize="$1" fontWeight="700" letterSpacing={1.1} textTransform="uppercase">
          {label}
        </Paragraph>
        <Paragraph color="$color12" fontSize="$7" fontWeight="900">
          {value}
        </Paragraph>
        {detail ? (
          <Paragraph color="$color10" fontSize="$2">
            {detail}
          </Paragraph>
        ) : null}
        <YStack height={4} rounded="$10" bg={accent as ColorTokens} opacity={0.8} />
      </YStack>
    </SectionCard>
  )
}

function ValuePill({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <XStack items="center" justify="space-between" bg="$color3" rounded="$5" px="$3" py="$2.5" gap="$3">
      <Paragraph color="$color10" fontSize="$2">
        {label}
      </Paragraph>
      <Paragraph color="$color12" fontSize="$3" fontWeight="800">
        {value}
      </Paragraph>
    </XStack>
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
    <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 280 }}>
      <Paragraph color="$color12" fontSize="$4" fontWeight="800">
        {title}
      </Paragraph>
      {rows === undefined ? (
        <XStack items="center" gap="$2">
          <Spinner size="small" />
          <Paragraph color="$color10">Loading…</Paragraph>
        </XStack>
      ) : rows.length === 0 ? (
        <Paragraph color="$color10" fontSize="$2">
          {emptyLabel}
        </Paragraph>
      ) : (
        <YStack gap="$1">{rows.map(renderRow)}</YStack>
      )}
    </SurfaceCard>
  )
}

function TrendBars({
  title,
  rows,
  labelKey,
  valueKey,
  formatter,
}: {
  title: string
  rows: any[] | undefined
  labelKey: string
  valueKey: string
  formatter: (value: number) => string
}) {
  const maxValue = Math.max(...(rows ?? []).map((row) => row[valueKey] ?? 0), 1)
  return (
    <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 320 }}>
      <Paragraph color="$color12" fontSize="$4" fontWeight="800">
        {title}
      </Paragraph>
      {rows === undefined ? (
        <Spinner size="small" />
      ) : rows.length === 0 ? (
        <Paragraph color="$color10" fontSize="$2">
          No data for this range.
        </Paragraph>
      ) : (
        <YStack gap="$2">
          {rows.map((row, index) => (
            <YStack key={`${row[labelKey]}-${index}`} gap="$1">
              <XStack justify="space-between" items="center">
                <Paragraph color="$color10" fontSize="$2">
                  {row[labelKey]}
                </Paragraph>
                <Paragraph color="$color12" fontSize="$2" fontWeight="700">
                  {formatter(row[valueKey] ?? 0)}
                </Paragraph>
              </XStack>
              <YStack bg="$color3" rounded="$10" height={8} overflow="hidden">
                <YStack width={`${(((row[valueKey] ?? 0) / maxValue) * 100).toFixed(0)}%` as DimensionValue} bg="$accentBackground" height="100%" />
              </YStack>
            </YStack>
          ))}
        </YStack>
      )}
    </SurfaceCard>
  )
}

function SortHeader({
  label,
  active,
  direction,
  onPress,
  width,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onPress: () => void
  width?: number
}) {
  return (
    <Button size="$2" bg="transparent" borderWidth={0} px="$1" onPress={onPress}>
      <XStack items="center" gap="$1" style={width ? { width } : undefined}>
        <Paragraph color={active ? '$color12' : '$color8'} fontSize={10} fontWeight={active ? '800' : '600'}>
          {label}
        </Paragraph>
        {active ? direction === 'desc' ? <ChevronDown size={10} color="$accentBackground" /> : <ChevronUp size={10} color="$accentBackground" /> : null}
      </XStack>
    </Button>
  )
}

function ReportTable<T extends Record<string, any>>({
  title,
  rows,
  rowKey,
  columns,
  initialSortKey,
  emptyLabel,
}: {
  title: string
  rows: T[] | undefined
  rowKey: (row: T, index: number) => string
  columns: Array<{
    key: string
    label: string
    width?: number
    sortValue?: (row: T) => string | number
    render: (row: T) => React.ReactNode
  }>
  initialSortKey?: string
  emptyLabel: string
}) {
  const sortable = columns.filter((column) => column.sortValue)
  const [sortKey, setSortKey] = useState(initialSortKey ?? sortable[0]?.key ?? '')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')

  const sortedRows = useMemo(() => {
    if (!rows) return undefined
    const activeColumn = columns.find((column) => column.key === sortKey && column.sortValue)
    if (!activeColumn?.sortValue) return rows
    return rows.slice().sort((left, right) => {
      const leftValue = activeColumn.sortValue!(left)
      const rightValue = activeColumn.sortValue!(right)
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return direction === 'desc' ? rightValue - leftValue : leftValue - rightValue
      }
      const compare = String(leftValue).localeCompare(String(rightValue))
      return direction === 'desc' ? compare * -1 : compare
    })
  }, [columns, direction, rows, sortKey])

  function onSort(nextKey: string) {
    if (nextKey === sortKey) setDirection((value) => (value === 'desc' ? 'asc' : 'desc'))
    else {
      setSortKey(nextKey)
      setDirection('desc')
    }
  }

  return (
    <SurfaceCard gap="$2">
      <Paragraph color="$color12" fontSize="$4" fontWeight="800">
        {title}
      </Paragraph>
      {sortedRows === undefined ? (
        <XStack items="center" gap="$2" py="$4">
          <Spinner size="small" />
          <Paragraph color="$color10">Loading…</Paragraph>
        </XStack>
      ) : sortedRows.length === 0 ? (
        <Paragraph color="$color10" fontSize="$2">
          {emptyLabel}
        </Paragraph>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <YStack style={{ minWidth: columns.reduce((sum, column) => sum + (column.width ?? 140), 0) }}>
            <XStack py="$1.5" px="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
              {columns.map((column) =>
                column.sortValue ? (
                  <SortHeader
                    key={column.key}
                    label={column.label}
                    active={sortKey === column.key}
                    direction={direction}
                    onPress={() => onSort(column.key)}
                    width={column.width}
                  />
                ) : (
                  <XStack key={column.key} px="$1" style={column.width ? { width: column.width } : undefined}>
                    <Paragraph color="$color8" fontSize={10} fontWeight="700">
                      {column.label}
                    </Paragraph>
                  </XStack>
                ),
              )}
            </XStack>
            {sortedRows.map((row, index) => (
              <XStack key={rowKey(row, index)} py="$2" px="$1.5" borderBottomWidth={1} borderBottomColor="$color3" hoverStyle={{ bg: '$color3' }}>
                {columns.map((column) => (
                  <XStack key={column.key} px="$1" items="center" style={column.width ? { width: column.width } : undefined}>
                    {column.render(row)}
                  </XStack>
                ))}
              </XStack>
            ))}
          </YStack>
        </ScrollView>
      )}
    </SurfaceCard>
  )
}

function formatExportFilename(kind: ExportKind, scope: ExportScope, preset: DatePreset, fromDate: string, toDate: string) {
  const range = preset === 'custom' ? `${fromDate || 'start'}_${toDate || 'end'}` : preset
  return `hari-charnamm-${kind}-${scope}-${range}.csv`
}

export function ReportsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<ReportRouteParams>()
  const toast = useToastController()
  const media = useMedia()
  const desktop = !media.maxMd
  const categories = useQuery(convexApi.inventory.listCategories, { includeInactive: true }) as CategoryNode[] | undefined
  const exportCsv = useAction(convexApi.reports.exportCsv)

  const [activeTab, setActiveTab] = useState<TabKey>((singleParam(params.tab) as TabKey) || 'executive')
  const [datePreset, setDatePreset] = useState<DatePreset>((singleParam(params.preset) as DatePreset) || 'last_30_days')
  const [fromDate, setFromDate] = useState(singleParam(params.from) || '')
  const [toDate, setToDate] = useState(singleParam(params.to) || '')
  const [compareMode, setCompareMode] = useState(singleParam(params.compare) === '1' || desktop)
  const [categoryId, setCategoryId] = useState<string | null>(singleParam(params.categoryId) || null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(singleParam(params.subcategoryId) || null)
  const [productId, setProductId] = useState<string | null>(singleParam(params.productId) || null)
  const [variantId, setVariantId] = useState<string | null>(singleParam(params.variantId) || null)
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'upi'>((singleParam(params.payment) || 'all') as typeof paymentMethod)
  const [salesStatus, setSalesStatus] = useState<'all' | 'completed' | 'returned_partial' | 'returned_full'>((singleParam(params.salesStatus) || 'all') as typeof salesStatus)
  const [returnStatus, setReturnStatus] = useState<'all' | 'completed'>((singleParam(params.returnStatus) || 'all') as typeof returnStatus)
  const [stockState, setStockState] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>((singleParam(params.stockState) || 'all') as typeof stockState)
  const [movementBucket, setMovementBucket] = useState<'all' | 'top_sellers' | 'slow_movers' | 'dead_stock' | 'high_returns' | 'discount_heavy'>((singleParam(params.movement) || 'all') as typeof movementBucket)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportScope, setExportScope] = useState<ExportScope>((singleParam(params.exportScope) as ExportScope) || 'summary_and_detail')
  const [isExporting, setIsExporting] = useState<ExportKind | null>(null)
  const [returnsPageSize, setReturnsPageSize] = useState(20)

  const variantPool = usePaginatedQuery(
    convexApi.inventory.list,
    { search: null, categoryId: categoryId as Id<'categories'> | null, subcategoryId: subcategoryId as Id<'categories'> | null, status: 'active', stockState: 'all' },
    { initialNumItems: 120 },
  )
  const variantOptions = (variantPool.results ?? []) as Array<{ _id: string; productId: string; productName: string; productCode: string; displayCode: string; label: string }>
  const productOptions = Array.from(
    new Map(
      variantOptions.map((variant: any) => [
        variant.productId,
        { label: `${variant.productName} (${variant.productCode})`, value: variant.productId },
      ]),
    ).values(),
  )
  const filteredVariantOptions = variantOptions
    .filter((variant: any) => !productId || variant.productId === productId)
    .map((variant: any) => ({ label: `${variant.displayCode} · ${variant.label}`, value: variant._id }))

  useEffect(() => {
    if (!categoryId) setSubcategoryId(null)
  }, [categoryId])
  useEffect(() => {
    if (productId && !productOptions.some((option) => option.value === productId)) setProductId(null)
  }, [productId, productOptions])
  useEffect(() => {
    if (variantId && !filteredVariantOptions.some((option) => option.value === variantId)) setVariantId(null)
  }, [variantId, filteredVariantOptions])
  useEffect(() => {
    if (!desktop) setCompareMode(false)
  }, [desktop])
  useEffect(() => {
    const nextTab = (singleParam(params.tab) as TabKey) || 'executive'
    const nextPreset = (singleParam(params.preset) as DatePreset) || 'last_30_days'
    setActiveTab(nextTab)
    setDatePreset(nextPreset)
    setFromDate(singleParam(params.from) || '')
    setToDate(singleParam(params.to) || '')
    setCompareMode(singleParam(params.compare) === '1' || (desktop && nextTab === 'executive'))
    setCategoryId(singleParam(params.categoryId) || null)
    setSubcategoryId(singleParam(params.subcategoryId) || null)
    setProductId(singleParam(params.productId) || null)
    setVariantId(singleParam(params.variantId) || null)
    setPaymentMethod((singleParam(params.payment) || 'all') as typeof paymentMethod)
    setSalesStatus((singleParam(params.salesStatus) || 'all') as typeof salesStatus)
    setReturnStatus((singleParam(params.returnStatus) || 'all') as typeof returnStatus)
    setStockState((singleParam(params.stockState) || 'all') as typeof stockState)
    setMovementBucket((singleParam(params.movement) || 'all') as typeof movementBucket)
    setExportScope((singleParam(params.exportScope) || 'summary_and_detail') as typeof exportScope)
  }, [
    desktop,
    params.categoryId,
    params.compare,
    params.exportScope,
    params.from,
    params.movement,
    params.payment,
    params.preset,
    params.productId,
    params.returnStatus,
    params.salesStatus,
    params.stockState,
    params.subcategoryId,
    params.tab,
    params.to,
    params.variantId,
  ])

  const filters = {
    fromDate: datePreset === 'custom' ? fromDate || null : null,
    toDate: datePreset === 'custom' ? toDate || null : null,
    datePreset,
    compareMode,
    categoryId: categoryId as Id<'categories'> | null,
    subcategoryId: subcategoryId as Id<'categories'> | null,
    productId: productId as Id<'products'> | null,
    variantId: variantId as Id<'productVariants'> | null,
    paymentMethod,
    returnStatus,
    stockState,
    movementBucket,
    salesStatus,
    groupBy: 'day' as const,
    sortBy: null,
  }

  const overview = useQuery(convexApi.reports.overview, filters)
  const salesAnalysis = useQuery(convexApi.reports.salesAnalysis, filters)
  const productPerformance = useQuery(convexApi.reports.productPerformance, filters)
  const inventoryHealth = useQuery(convexApi.reports.inventoryHealth, filters)
  const returnsReport = useQuery(convexApi.reports.returnsReport, {
    ...filters,
    paginationOpts: { numItems: returnsPageSize, cursor: null },
  })

  const filterCount = [
    datePreset !== 'last_30_days',
    compareMode,
    categoryId,
    subcategoryId,
    productId,
    variantId,
    paymentMethod !== 'all',
    salesStatus !== 'all',
    returnStatus !== 'all',
    stockState !== 'all',
    movementBucket !== 'all',
  ].filter(Boolean).length

  const activePresetLabel = DATE_PRESET_LABELS[datePreset]
  const filterChips = useMemo(
    () =>
      [
        categoryId ? 'Category' : null,
        subcategoryId ? 'Subcategory' : null,
        productId ? 'Product' : null,
        variantId ? 'Variant' : null,
        paymentMethod !== 'all' ? paymentMethod.toUpperCase() : null,
        salesStatus !== 'all' ? salesStatus.replaceAll('_', ' ') : null,
        stockState !== 'all' ? stockState.replaceAll('_', ' ') : null,
        movementBucket !== 'all' ? movementBucket.replaceAll('_', ' ') : null,
      ].filter(Boolean) as string[],
    [categoryId, movementBucket, paymentMethod, productId, salesStatus, stockState, subcategoryId, variantId],
  )

  function resetFilters() {
    setDatePreset('last_30_days')
    setFromDate('')
    setToDate('')
    setCompareMode(desktop)
    setCategoryId(null)
    setSubcategoryId(null)
    setProductId(null)
    setVariantId(null)
    setPaymentMethod('all')
    setSalesStatus('all')
    setReturnStatus('all')
    setStockState('all')
    setMovementBucket('all')
  }

  function openSales(extra: Parameters<typeof buildSalesHref>[0] = {}) {
    router.replace(buildSalesHref({
      preset: datePreset === 'last_30_days' ? '30d' : datePreset === 'last_7_days' ? '7d' : datePreset,
      from: datePreset === 'custom' ? fromDate : undefined,
      to: datePreset === 'custom' ? toDate : undefined,
      payment: paymentMethod,
      status: salesStatus,
      ...extra,
    }) as import('expo-router').Href)
  }

  function applyReportFocus(next: Partial<{
    activeTab: TabKey
    categoryId: string | null
    subcategoryId: string | null
    productId: string | null
    variantId: string | null
    stockState: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
    movementBucket: 'all' | 'top_sellers' | 'slow_movers' | 'dead_stock' | 'high_returns' | 'discount_heavy'
  }>) {
    if (next.activeTab) setActiveTab(next.activeTab)
    if (next.categoryId !== undefined) setCategoryId(next.categoryId)
    if (next.subcategoryId !== undefined) setSubcategoryId(next.subcategoryId)
    if (next.productId !== undefined) setProductId(next.productId)
    if (next.variantId !== undefined) setVariantId(next.variantId)
    if (next.stockState !== undefined) setStockState(next.stockState)
    if (next.movementBucket !== undefined) setMovementBucket(next.movementBucket)
  }

  async function handleExport(kind: ExportKind) {
    setIsExporting(kind)
    try {
      const csv = await exportCsv({ kind, scope: exportScope, ...filters })
      await exportTextFile({
        filename: formatExportFilename(kind, exportScope, datePreset, fromDate || 'start', toDate || 'end'),
        contents: csv,
        mimeType: 'text/csv',
      })
      hapticSuccess()
      toast.show('Exported')
      setExportOpen(false)
    } catch (error) {
      toast.show('Export failed', { message: getErrorMessage(error) })
    } finally {
      setIsExporting(null)
    }
  }

  const filterPanel = (
    <SurfaceCard gap="$3">
      <XStack justify="space-between" items="center">
        <XStack items="center" gap="$2">
          <Filter size={14} color="$color10" />
          <Paragraph color="$color12" fontSize="$4" fontWeight="800">
            Filters
          </Paragraph>
        </XStack>
        {filterCount > 0 ? (
          <Button size="$2.5" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={resetFilters}>
            Reset
          </Button>
        ) : null}
      </XStack>

      <YStack gap="$2">
        <Paragraph color="$color8" fontSize="$1" fontWeight="700" letterSpacing={1.1} textTransform="uppercase">
          Date Presets
        </Paragraph>
        <XStack gap="$1.5" flexWrap="wrap">
          {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((preset) => (
            <Button
              key={preset}
              size="$2.5"
              px="$3"
              bg={datePreset === preset ? '$color4' : '$color3'}
              borderWidth={1}
              borderColor={datePreset === preset ? '$accentBackground' : '$borderColor'}
              onPress={() => setDatePreset(preset)}
            >
              {DATE_PRESET_LABELS[preset]}
            </Button>
          ))}
        </XStack>
        {datePreset === 'custom' ? (
          <XStack gap="$2">
            <Input value={fromDate} onChangeText={setFromDate} placeholder="From YYYY-MM-DD" bg="$color3" borderWidth={1} borderColor="$borderColor" color="$color12" />
            <Input value={toDate} onChangeText={setToDate} placeholder="To YYYY-MM-DD" bg="$color3" borderWidth={1} borderColor="$borderColor" color="$color12" />
          </XStack>
        ) : null}
      </YStack>

      <Button size="$3" bg={compareMode ? '$color4' : '$color3'} borderWidth={1} borderColor={compareMode ? '$accentBackground' : '$borderColor'} onPress={() => setCompareMode((value) => !value)}>
        {compareMode ? 'Comparison On' : 'Comparison Off'}
      </Button>

      <XStack gap="$2" flexWrap="wrap">
        <YStack style={{ minWidth: desktop ? 180 : '100%' }}>
          <SelectionField label="Category" value={categoryId} placeholder="All" options={[{ label: 'All', value: null }, ...(categories ?? []).map((category) => ({ label: category.name, value: category._id }))]} onChange={setCategoryId} />
        </YStack>
        <YStack style={{ minWidth: desktop ? 180 : '100%' }}>
          <SelectionField label="Subcategory" value={subcategoryId} placeholder="All" options={[{ label: 'All', value: null }, ...getSubcategoryOptions(categories, categoryId)]} onChange={setSubcategoryId} />
        </YStack>
        <YStack style={{ minWidth: desktop ? 180 : '100%' }}>
          <SelectionField label="Product" value={productId} placeholder="All" options={[{ label: 'All', value: null }, ...productOptions]} onChange={setProductId} />
        </YStack>
        <YStack style={{ minWidth: desktop ? 180 : '100%' }}>
          <SelectionField label="Variant" value={variantId} placeholder="All" options={[{ label: 'All', value: null }, ...filteredVariantOptions]} onChange={setVariantId} />
        </YStack>
        <YStack style={{ minWidth: desktop ? 150 : '48%' }}>
          <SelectionField label="Payment" value={paymentMethod} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Cash', value: 'cash' }, { label: 'UPI', value: 'upi' }]} onChange={(value) => setPaymentMethod((value ?? 'all') as typeof paymentMethod)} />
        </YStack>
        <YStack style={{ minWidth: desktop ? 150 : '48%' }}>
          <SelectionField label="Sales Status" value={salesStatus} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Completed', value: 'completed' }, { label: 'Partial Return', value: 'returned_partial' }, { label: 'Full Return', value: 'returned_full' }]} onChange={(value) => setSalesStatus((value ?? 'all') as typeof salesStatus)} />
        </YStack>
        <YStack style={{ minWidth: desktop ? 150 : '48%' }}>
          <SelectionField label="Stock State" value={stockState} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'In Stock', value: 'in_stock' }, { label: 'Low Stock', value: 'low_stock' }, { label: 'Out Of Stock', value: 'out_of_stock' }]} onChange={(value) => setStockState((value ?? 'all') as typeof stockState)} />
        </YStack>
        <YStack style={{ minWidth: desktop ? 160 : '48%' }}>
          <SelectionField label="Movement Bucket" value={movementBucket} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Top Sellers', value: 'top_sellers' }, { label: 'Slow Movers', value: 'slow_movers' }, { label: 'Dead Stock', value: 'dead_stock' }, { label: 'High Returns', value: 'high_returns' }, { label: 'Discount Heavy', value: 'discount_heavy' }]} onChange={(value) => setMovementBucket((value ?? 'all') as typeof movementBucket)} />
        </YStack>
      </XStack>
    </SurfaceCard>
  )

  const executiveContent = (
    <YStack gap="$3">
      <XStack gap="$2.5" flexWrap="wrap">
        <MetricTile label="Net Revenue" value={overview ? formatCurrency(overview.summary.current.revenue) : '—'} detail={deltaLabel(overview?.summary?.delta?.revenue, compareMode)} />
        <MetricTile label="Gross" value={overview ? formatCurrency(overview.summary.current.grossRevenue) : '—'} detail={deltaLabel(overview?.summary?.delta?.grossRevenue, compareMode)} accent="$blue10" />
        <MetricTile label="Discounts" value={overview ? formatCurrency(overview.summary.current.totalDiscount) : '—'} detail={deltaLabel(overview?.summary?.delta?.totalDiscount, compareMode)} accent="$yellow10" />
        <MetricTile label="Returns" value={overview ? formatCurrency(overview.summary.current.returnValue) : '—'} detail={deltaLabel(overview?.summary?.delta?.returnValue, compareMode)} accent="$red10" />
        <MetricTile label="Orders" value={overview ? formatNumber(overview.summary.current.orderCount) : '—'} detail={deltaLabel(overview?.summary?.delta?.orderCount, compareMode)} />
        <MetricTile label="Units" value={overview ? formatNumber(overview.summary.current.unitsSold) : '—'} detail={deltaLabel(overview?.summary?.delta?.unitsSold, compareMode)} />
        <MetricTile label="Avg Order" value={overview ? formatCurrency(overview.summary.current.avgOrderValue) : '—'} detail={deltaLabel(overview?.summary?.delta?.avgOrderValue, compareMode)} />
      </XStack>

      <XStack gap="$3" flexWrap="wrap">
        <TrendBars title="Revenue Trend" rows={overview?.dailyTrend} labelKey="date" valueKey="net" formatter={(value) => formatCurrency(value)} />
        <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 320 }}>
          <XStack justify="space-between" items="center" gap="$2">
            <Paragraph color="$color12" fontSize="$4" fontWeight="800">Mixes</Paragraph>
            <Button size="$2.5" bg="$color3" borderWidth={1} borderColor="$borderColor" icon={<ReceiptText size={14} />} onPress={() => openSales()}>
              Sales
            </Button>
          </XStack>
          <YStack gap="$2">
            <ValuePill label="Cash Revenue" value={formatCurrency(overview?.paymentMix?.cash ?? 0)} />
            <ValuePill label="UPI Revenue" value={formatCurrency(overview?.paymentMix?.upi ?? 0)} />
            <ValuePill label="Line Discount" value={formatCurrency(overview?.discountMix?.lineDiscount ?? 0)} />
            <ValuePill label="Order Discount" value={formatCurrency(overview?.discountMix?.orderDiscount ?? 0)} />
          </YStack>
        </SurfaceCard>
      </XStack>

      <XStack gap="$3" flexWrap="wrap">
        <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 320 }}>
          <Paragraph color="$color12" fontSize="$4" fontWeight="800">Highlights</Paragraph>
          <YStack gap="$2">
            <ValuePill label="Best Day" value={overview?.highlights?.bestDay ? `${overview.highlights.bestDay.date} · ${formatCurrency(overview.highlights.bestDay.net)}` : '—'} />
            <ValuePill label="Weakest Day" value={overview?.highlights?.worstDay ? `${overview.highlights.worstDay.date} · ${formatCurrency(overview.highlights.worstDay.net)}` : '—'} />
            <Button unstyled onPress={() => overview?.highlights?.strongestCategory && applyReportFocus({ activeTab: 'products', categoryId: overview.highlights.strongestCategory.categoryId })}>
              <ValuePill label="Strongest Category" value={overview?.highlights?.strongestCategory ? `${overview.highlights.strongestCategory.categoryName} · ${formatCurrency(overview.highlights.strongestCategory.netRevenue)}` : '—'} />
            </Button>
            <Button unstyled onPress={() => overview?.highlights?.weakestCategory && applyReportFocus({ activeTab: 'products', categoryId: overview.highlights.weakestCategory.categoryId })}>
              <ValuePill label="Weakest Category" value={overview?.highlights?.weakestCategory ? `${overview.highlights.weakestCategory.categoryName} · ${formatCurrency(overview.highlights.weakestCategory.netRevenue)}` : '—'} />
            </Button>
          </YStack>
        </SurfaceCard>
        <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 320 }}>
          <Paragraph color="$color12" fontSize="$4" fontWeight="800">Exception Signals</Paragraph>
          <YStack gap="$2">
            {(overview?.exceptionCards ?? []).map((card: any) => (
              <SectionCard key={card.key} bg="$color3" p="$3">
                <Paragraph color="$color8" fontSize="$1" fontWeight="700" letterSpacing={1.1} textTransform="uppercase">{card.title}</Paragraph>
                <Paragraph color="$color12" fontSize="$5" fontWeight="900">
                  {typeof card.value === 'number' ? formatCurrency(card.value) : card.value}
                </Paragraph>
                <Paragraph color="$color10" fontSize="$2">{card.detail}</Paragraph>
              </SectionCard>
            ))}
          </YStack>
        </SurfaceCard>
      </XStack>

      <XStack gap="$3" flexWrap="wrap">
        <InsightList
          title="Trending Up"
          rows={overview?.suggestions?.trendingUp}
          emptyLabel="No strong upward movement."
          renderRow={(row, index) => (
            <XStack key={`${row.variantId ?? row.productCode}-${index}`} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3" onPress={() => applyReportFocus({ activeTab: 'products', variantId: row.variantId ?? null })} cursor="pointer">
              <YStack gap="$0.25">
                <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
                <Paragraph color="$color8" fontSize="$1">{row.productCode}</Paragraph>
              </YStack>
              <Paragraph color="$accentBackground" fontSize="$2" fontWeight="700">{row.growthRate ? `${row.growthRate.toFixed(1)}%` : 'Watch'}</Paragraph>
            </XStack>
          )}
        />
        <InsightList
          title="Low Stock Soon"
          rows={overview?.suggestions?.lowStockSoon}
          emptyLabel="No urgent stock risk."
          renderRow={(row, index) => (
            <XStack key={`${row.variantId}-${index}`} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3" onPress={() => applyReportFocus({ activeTab: 'inventory', variantId: row.variantId ?? null, stockState: 'low_stock' })} cursor="pointer">
              <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
              <Paragraph color="$yellow10" fontSize="$2" fontWeight="700">{formatNumber(row.onHand)} left</Paragraph>
            </XStack>
          )}
        />
      </XStack>
    </YStack>
  )

  const salesContent = (
    <YStack gap="$3">
      <XStack gap="$2.5" flexWrap="wrap">
        <MetricTile label="Revenue" value={salesAnalysis ? formatCurrency(salesAnalysis.summary.current.revenue) : '—'} detail={deltaLabel(salesAnalysis?.summary?.delta?.revenue, compareMode)} />
        <MetricTile label="Receipts" value={salesAnalysis ? formatNumber(salesAnalysis.summary.current.receipts) : '—'} detail={deltaLabel(salesAnalysis?.summary?.delta?.receipts, compareMode)} />
        <MetricTile label="Units" value={salesAnalysis ? formatNumber(salesAnalysis.summary.current.units) : '—'} detail={deltaLabel(salesAnalysis?.summary?.delta?.units, compareMode)} />
        <MetricTile label="Avg Order" value={salesAnalysis ? formatCurrency(salesAnalysis.summary.current.avgOrderValue) : '—'} detail={deltaLabel(salesAnalysis?.summary?.delta?.avgOrderValue, compareMode)} />
        <MetricTile label="Discounts" value={salesAnalysis ? formatCurrency(salesAnalysis.summary.current.discounts) : '—'} detail={deltaLabel(salesAnalysis?.summary?.delta?.discounts, compareMode)} accent="$yellow10" />
      </XStack>
      <XStack gap="$3" flexWrap="wrap">
        <TrendBars title="Daily Sales Trend" rows={salesAnalysis?.trend} labelKey="date" valueKey="revenue" formatter={(value) => formatCurrency(value)} />
        <TrendBars title="Weekday Mix" rows={salesAnalysis?.weekdayBreakdown} labelKey="label" valueKey="revenue" formatter={(value) => formatCurrency(value)} />
      </XStack>
      <XStack gap="$3" flexWrap="wrap">
        <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 320 }}>
          <Paragraph color="$color12" fontSize="$4" fontWeight="800">Customer Mix</Paragraph>
          <YStack gap="$2">
            <ValuePill label="Named Customers" value={formatNumber(salesAnalysis?.customerMix?.named ?? 0)} />
            <ValuePill label="Walk-in" value={formatNumber(salesAnalysis?.customerMix?.walkIn ?? 0)} />
            <ValuePill label="Cash" value={formatCurrency(salesAnalysis?.paymentMix?.cash ?? 0)} />
            <ValuePill label="UPI" value={formatCurrency(salesAnalysis?.paymentMix?.upi ?? 0)} />
          </YStack>
        </SurfaceCard>
        <InsightList
          title="Discount Heavy Sales"
          rows={salesAnalysis?.discountHeavy}
          emptyLabel="No discount-heavy transactions."
          renderRow={(row, index) => (
            <XStack key={`${row._id}-${index}`} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3" onPress={() => openSales({ saleId: row._id, insight: 'discount_heavy', sort: 'amount_desc' })} cursor="pointer">
              <YStack gap="$0.25">
                <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.saleCode}</Paragraph>
                <Paragraph color="$color8" fontSize="$1">{formatDateTime(row.createdAt)}</Paragraph>
              </YStack>
              <YStack items="flex-end">
                <Paragraph color="$color12" fontSize="$2" fontWeight="700">{formatCurrency(row.total)}</Paragraph>
                <Paragraph color="$yellow10" fontSize="$1">-{formatCurrency((row.lineDiscountTotal ?? 0) + (row.orderDiscount ?? 0))}</Paragraph>
              </YStack>
            </XStack>
          )}
        />
      </XStack>
      <ReportTable
        title="Top Transactions"
        rows={salesAnalysis?.topTransactions}
        rowKey={(row) => row._id}
        initialSortKey="total"
        emptyLabel="No transactions for the active filters."
        columns={[
          { key: 'saleCode', label: 'Sale', width: 130, sortValue: (row) => row.saleCode, render: (row) => <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.saleCode}</Paragraph> },
          { key: 'createdAt', label: 'Date', width: 170, sortValue: (row) => row.createdAt, render: (row) => <Paragraph color="$color10" fontSize="$2">{formatDateTime(row.createdAt)}</Paragraph> },
          { key: 'paymentMethod', label: 'Payment', width: 100, sortValue: (row) => row.paymentMethod, render: (row) => <Paragraph color="$color12" fontSize="$2">{row.paymentMethod === 'cash' ? 'Cash' : 'UPI'}</Paragraph> },
          { key: 'customerName', label: 'Customer', width: 130, sortValue: (row) => row.customerName ?? '', render: (row) => <Paragraph color="$color10" fontSize="$2">{row.customerName || 'Walk-in'}</Paragraph> },
          { key: 'totalQty', label: 'Units', width: 80, sortValue: (row) => row.totalQty, render: (row) => <Paragraph color="$color12" fontSize="$2" fontWeight="700">{formatNumber(row.totalQty)}</Paragraph> },
          { key: 'total', label: 'Total', width: 110, sortValue: (row) => row.total, render: (row) => <Paragraph color="$accentBackground" fontSize="$2" fontWeight="800">{formatCurrency(row.total)}</Paragraph> },
        ]}
      />
    </YStack>
  )

  const productsContent = (
    <YStack gap="$3">
      <XStack gap="$2.5" flexWrap="wrap">
        <MetricTile label="Units Sold" value={productPerformance ? formatNumber(productPerformance.summary.current.soldQty) : '—'} detail={deltaLabel(productPerformance?.summary?.delta?.soldQty, compareMode)} />
        <MetricTile label="Revenue" value={productPerformance ? formatCurrency(productPerformance.summary.current.soldRevenue) : '—'} detail={deltaLabel(productPerformance?.summary?.delta?.soldRevenue, compareMode)} />
        <MetricTile label="Net Revenue" value={productPerformance ? formatCurrency(productPerformance.summary.current.netRevenue) : '—'} detail={deltaLabel(productPerformance?.summary?.delta?.netRevenue, compareMode)} />
        <MetricTile label="Returns Qty" value={productPerformance ? formatNumber(productPerformance.summary.current.returnQty) : '—'} detail={deltaLabel(productPerformance?.summary?.delta?.returnQty, compareMode)} accent="$red10" />
      </XStack>
      <XStack gap="$3" flexWrap="wrap">
        <TrendBars title="Category Contribution" rows={productPerformance?.categoryBreakdown} labelKey="categoryName" valueKey="soldRevenue" formatter={(value) => formatCurrency(value)} />
        <InsightList
          title="High Return Products"
          rows={productPerformance?.highReturnItems}
          emptyLabel="No return-heavy products."
          renderRow={(row, index) => (
            <XStack key={`${row.variantId}-${index}`} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3" onPress={() => applyReportFocus({ activeTab: 'products', variantId: row.variantId ?? null, movementBucket: 'high_returns' })} cursor="pointer">
              <YStack gap="$0.25">
                <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
                <Paragraph color="$color8" fontSize="$1">{row.productCode} · {row.variantLabel}</Paragraph>
              </YStack>
              <Paragraph color="$red10" fontSize="$2" fontWeight="800">{formatNumber(row.returnQty)}</Paragraph>
            </XStack>
          )}
        />
      </XStack>
      <ReportTable
        title="Product Ranking"
        rows={productPerformance?.allVariants}
        rowKey={(row) => row.variantId}
        initialSortKey="soldRevenue"
        emptyLabel="No products match the current filters."
        columns={[
          {
            key: 'product',
            label: 'Product',
            width: 240,
            sortValue: (row) => row.productName,
            render: (row) => (
              <YStack>
                <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
                <Paragraph color="$color8" fontSize="$1">{row.productCode} · {row.variantLabel}</Paragraph>
              </YStack>
            ),
          },
          { key: 'soldQty', label: 'Sold', width: 80, sortValue: (row) => row.soldQty, render: (row) => <Paragraph color="$color12" fontSize="$2" fontWeight="700">{formatNumber(row.soldQty)}</Paragraph> },
          { key: 'soldRevenue', label: 'Revenue', width: 110, sortValue: (row) => row.soldRevenue, render: (row) => <Paragraph color="$color12" fontSize="$2" fontWeight="700">{formatCurrency(row.soldRevenue)}</Paragraph> },
          { key: 'returnQty', label: 'Returns', width: 90, sortValue: (row) => row.returnQty, render: (row) => <Paragraph color={row.returnQty > 0 ? '$red10' : '$color10'} fontSize="$2" fontWeight="700">{row.returnQty > 0 ? formatNumber(row.returnQty) : '—'}</Paragraph> },
          { key: 'netRevenue', label: 'Net', width: 110, sortValue: (row) => row.netRevenue, render: (row) => <Paragraph color="$accentBackground" fontSize="$2" fontWeight="800">{formatCurrency(row.netRevenue)}</Paragraph> },
          { key: 'avgPrice', label: 'Avg ₹', width: 90, sortValue: (row) => row.avgPrice, render: (row) => <Paragraph color="$color12" fontSize="$2">{formatCurrency(row.avgPrice)}</Paragraph> },
        ]}
      />
      <XStack gap="$3" flexWrap="wrap">
        <InsightList
          title="Trending Up"
          rows={productPerformance?.trendingUp}
          emptyLabel="No strong momentum."
          renderRow={(row, index) => (
            <XStack key={`${row.variantId}-${index}`} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3" onPress={() => applyReportFocus({ activeTab: 'products', variantId: row.variantId ?? null })} cursor="pointer">
              <YStack gap="$0.25">
                <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
                <Paragraph color="$color8" fontSize="$1">{row.productCode}</Paragraph>
              </YStack>
              <Paragraph color="$accentBackground" fontSize="$2" fontWeight="700">{row.growthRate.toFixed(1)}%</Paragraph>
            </XStack>
          )}
        />
        <InsightList
          title="Dead Stock"
          rows={productPerformance?.deadStock}
          emptyLabel="No dead stock in range."
          renderRow={(row, index) => (
            <XStack key={`${row.variantId}-${index}`} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3" onPress={() => applyReportFocus({ activeTab: 'inventory', variantId: row.variantId ?? null, stockState: 'low_stock' })} cursor="pointer">
              <YStack gap="$0.25">
                <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
                <Paragraph color="$color8" fontSize="$1">{row.displayCode} · {row.variantLabel}</Paragraph>
              </YStack>
              <Paragraph color="$color10" fontSize="$2">{formatCurrency(row.salePrice)}</Paragraph>
            </XStack>
          )}
        />
      </XStack>
    </YStack>
  )

  const inventoryContent = (
    <YStack gap="$3">
      <XStack gap="$2.5" flexWrap="wrap">
        <MetricTile label="Stock Value" value={inventoryHealth ? formatCurrency(inventoryHealth.totalStockValue) : '—'} detail={deltaLabel(inventoryHealth?.summary?.delta?.totalStockValue, compareMode)} />
        <MetricTile label="Active SKUs" value={inventoryHealth ? formatNumber(inventoryHealth.totalSKUs) : '—'} detail={deltaLabel(inventoryHealth?.summary?.delta?.totalSKUs, compareMode)} />
        <MetricTile label="Low Stock" value={inventoryHealth ? formatNumber(inventoryHealth.counts.lowStock) : '—'} accent="$yellow10" />
        <MetricTile label="Out Of Stock" value={inventoryHealth ? formatNumber(inventoryHealth.counts.outOfStock) : '—'} accent="$red10" />
        <MetricTile label="Slow Moving" value={inventoryHealth ? formatNumber(inventoryHealth.counts.slowMoving) : '—'} />
        <MetricTile label="Dead Stock" value={inventoryHealth ? formatNumber(inventoryHealth.counts.deadStock) : '—'} />
      </XStack>
      <XStack gap="$3" flexWrap="wrap">
        <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 320 }}>
          <Paragraph color="$color12" fontSize="$4" fontWeight="800">Stock Buckets</Paragraph>
          <YStack gap="$2">
            <ValuePill label="Empty" value={formatNumber(inventoryHealth?.stockTiers?.zero ?? 0)} />
            <ValuePill label="Critical" value={formatNumber(inventoryHealth?.stockTiers?.low ?? 0)} />
            <ValuePill label="Healthy" value={formatNumber(inventoryHealth?.stockTiers?.high ?? 0)} />
            <ValuePill label="Overstock" value={formatNumber(inventoryHealth?.stockTiers?.overstock ?? 0)} />
          </YStack>
        </SurfaceCard>
        <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 320 }}>
          <Paragraph color="$color12" fontSize="$4" fontWeight="800">Ageing Buckets</Paragraph>
          <YStack gap="$2">
            <ValuePill label="No recent sale" value={formatNumber(inventoryHealth?.ageBuckets?.no_recent_sale ?? 0)} />
            <ValuePill label="0-7 days" value={formatNumber(inventoryHealth?.ageBuckets?.last_7_days ?? 0)} />
            <ValuePill label="8-30 days" value={formatNumber(inventoryHealth?.ageBuckets?.last_30_days ?? 0)} />
            <ValuePill label="31-60 days" value={formatNumber(inventoryHealth?.ageBuckets?.last_60_days ?? 0)} />
            <ValuePill label="60+ days" value={formatNumber(inventoryHealth?.ageBuckets?.over_60_days ?? 0)} />
          </YStack>
        </SurfaceCard>
      </XStack>
      <ReportTable
        title="Inventory Risk Table"
        rows={inventoryHealth?.visibleList}
        rowKey={(row) => row.variantId}
        initialSortKey="onHand"
        emptyLabel="No inventory risk rows for the active filters."
        columns={[
          {
            key: 'product',
            label: 'Product',
            width: 240,
            sortValue: (row) => row.productName,
            render: (row) => (
              <XStack gap="$2" items="center">
                <ProductImage uri={row.mediaUrl} size={36} label={row.productCode} />
                <YStack>
                  <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
                  <Paragraph color="$color8" fontSize="$1">{row.displayCode}</Paragraph>
                </YStack>
              </XStack>
            ),
          },
          { key: 'onHand', label: 'On Hand', width: 90, sortValue: (row) => row.onHand, render: (row) => <Paragraph color="$color12" fontSize="$2" fontWeight="700">{formatNumber(row.onHand)}</Paragraph> },
          { key: 'reorderThreshold', label: 'Reorder', width: 90, sortValue: (row) => row.reorderThreshold, render: (row) => <Paragraph color="$color10" fontSize="$2">{formatNumber(row.reorderThreshold)}</Paragraph> },
          { key: 'daysSinceSale', label: 'Last Sale', width: 90, sortValue: (row) => row.daysSinceSale ?? 9999, render: (row) => <Paragraph color="$color10" fontSize="$2">{row.daysSinceSale == null ? 'Never' : `${row.daysSinceSale}d`}</Paragraph> },

        ]}
      />
      <XStack gap="$3" flexWrap="wrap">
        <InsightList
          title="Low Stock"
          rows={inventoryHealth?.lowStock}
          emptyLabel="No low stock items."
          renderRow={(row, index) => (
            <XStack key={`${row.variantId}-${index}`} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3" onPress={() => applyReportFocus({ activeTab: 'inventory', variantId: row.variantId ?? null, movementBucket: 'dead_stock' })} cursor="pointer">
              <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
              <Paragraph color="$yellow10" fontSize="$2" fontWeight="700">{formatNumber(row.onHand)} left</Paragraph>
            </XStack>
          )}
        />
        <InsightList
          title="Dead Stock"
          rows={inventoryHealth?.deadStock}
          emptyLabel="No dead stock."
          renderRow={(row, index) => (
            <XStack key={`${row.variantId}-${index}`} justify="space-between" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$color3">
              <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
              <Paragraph color="$color10" fontSize="$2">{formatCurrency(row.stockValue ?? 0)}</Paragraph>
            </XStack>
          )}
        />
      </XStack>
    </YStack>
  )

  const returnsContent = (
    <YStack gap="$3">
      <XStack gap="$2.5" flexWrap="wrap">
        <MetricTile label="Return Value" value={returnsReport ? formatCurrency(returnsReport.summary.current.returnValue) : '—'} detail={deltaLabel(returnsReport?.summary?.delta?.returnValue, compareMode)} accent="$red10" />
        <MetricTile label="Return Count" value={returnsReport ? formatNumber(returnsReport.summary.current.returnCount) : '—'} detail={deltaLabel(returnsReport?.summary?.delta?.returnCount, compareMode)} />
        <MetricTile label="Returned Units" value={returnsReport ? formatNumber(returnsReport.summary.current.returnedUnits) : '—'} detail={deltaLabel(returnsReport?.summary?.delta?.returnedUnits, compareMode)} />
        <MetricTile label="Return Rate" value={returnsReport ? `${returnsReport.summary.current.returnRate.toFixed(1)}%` : '—'} detail={deltaLabel(returnsReport?.summary?.delta?.returnRate, compareMode)} />
      </XStack>
      <XStack gap="$3" flexWrap="wrap">
        <TrendBars title="Return Timeline" rows={returnsReport?.timeline} labelKey="date" valueKey="returnValue" formatter={(value) => formatCurrency(value)} />
        <SurfaceCard gap="$2.5" flex={1} style={{ minWidth: 320 }}>
          <Paragraph color="$color12" fontSize="$4" fontWeight="800">Refund Mix</Paragraph>
          <YStack gap="$2">
            <ValuePill label="Cash Refunds" value={formatCurrency(returnsReport?.refundMethodMix?.cash ?? 0)} />
            <ValuePill label="UPI Refunds" value={formatCurrency(returnsReport?.refundMethodMix?.upi ?? 0)} />
          </YStack>
        </SurfaceCard>
      </XStack>
      <ReportTable
        title="Most Returned Products"
        rows={returnsReport?.mostReturned}
        rowKey={(row) => row.variantId}
        initialSortKey="returnQty"
        emptyLabel="No returns for this range."
        columns={[
          {
            key: 'product',
            label: 'Product',
            width: 250,
            sortValue: (row) => row.productName,
            render: (row) => (
              <YStack>
                <Paragraph color="$color12" fontSize="$2" fontWeight="700">{row.productName}</Paragraph>
                <Paragraph color="$color8" fontSize="$1">{row.productCode} · {row.variantLabel}</Paragraph>
              </YStack>
            ),
          },
          { key: 'returnQty', label: 'Qty', width: 80, sortValue: (row) => row.returnQty, render: (row) => <Paragraph color="$red10" fontSize="$2" fontWeight="800">{formatNumber(row.returnQty)}</Paragraph> },
          { key: 'returnValue', label: 'Value', width: 110, sortValue: (row) => row.returnValue, render: (row) => <Paragraph color="$color12" fontSize="$2" fontWeight="700">{formatCurrency(row.returnValue)}</Paragraph> },
        ]}
      />
      <YStack gap="$2">
        {(returnsReport?.page ?? []).map((item: any) => (
          <SurfaceCard key={item._id} gap="$2">
            <XStack justify="space-between" items="center" gap="$3">
              <YStack gap="$0.5">
                <Paragraph color="$color12" fontSize="$3" fontWeight="800">{item.returnCode}</Paragraph>
                <Paragraph color="$color8" fontSize="$1">{item.saleCode} · {formatDateTime(item.createdAt)} · {item.refundMethod === 'cash' ? 'Cash' : 'UPI'}</Paragraph>
              </YStack>
              <YStack items="flex-end">
                <Paragraph color="$red10" fontSize="$3" fontWeight="800">{formatCurrency(item.subtotal)}</Paragraph>
                <Paragraph color="$color10" fontSize="$1">{formatNumber(item.totalQty)} units</Paragraph>
              </YStack>
            </XStack>
            <YStack gap="$1" pl="$2" borderLeftWidth={2} borderLeftColor="$color3">
              {(item.items ?? []).map((entry: any, index: number) => (
                <XStack key={`${item._id}-${index}`} justify="space-between" items="center">
                  <Paragraph color="$color10" fontSize="$1">{entry.productName} · {entry.variantLabel}</Paragraph>
                  <Paragraph color="$color12" fontSize="$1" fontWeight="700">{formatNumber(entry.quantity)} · {formatCurrency(entry.refundAmount)}</Paragraph>
                </XStack>
              ))}
            </YStack>
          </SurfaceCard>
        ))}
        {returnsReport && !returnsReport.isDone ? (
          <XStack justify="center">
            <Button bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={() => setReturnsPageSize((value) => value + 20)}>
              Load more
            </Button>
          </XStack>
        ) : null}
      </YStack>
    </YStack>
  )

  const content = activeTab === 'executive'
    ? executiveContent
    : activeTab === 'sales'
      ? salesContent
      : activeTab === 'products'
        ? productsContent
        : activeTab === 'inventory'
          ? inventoryContent
          : returnsContent

  return (
    <ScreenScaffold scroll={desktop}>
      {desktop ? (
        <ScreenHeader
          eyebrow="Analysis"
          title="Reports"
          subtitle={`${activePresetLabel}${compareMode ? ' · comparing previous period' : ''}`}
          actions={
            <XStack gap="$2">
              <Button size="$3" bg={compareMode ? '$color4' : '$color3'} borderWidth={1} borderColor={compareMode ? '$accentBackground' : '$borderColor'} onPress={() => setCompareMode((value) => !value)}>
                {compareMode ? 'Comparison On' : 'Comparison Off'}
              </Button>
              <Button size="$3" bg="$color3" borderColor="$borderColor" borderWidth={1} icon={<Download size={14} />} onPress={() => setExportOpen(true)}>
                Export
              </Button>
            </XStack>
          }
        />
      ) : (
        <XStack justify="space-between" items="center" gap="$2">
          <Button size="$3" bg="$color3" borderColor="$borderColor" borderWidth={1} icon={<Filter size={14} />} onPress={() => setFiltersOpen(true)}>
            Filters
          </Button>
          <Button size="$3" bg={compareMode ? '$color4' : '$color3'} borderColor={compareMode ? '$accentBackground' : '$borderColor'} borderWidth={1} onPress={() => setCompareMode((value) => !value)}>
            Compare
          </Button>
          <Button size="$3" bg="$color3" borderColor="$borderColor" borderWidth={1} icon={<Download size={14} />} onPress={() => setExportOpen(true)}>
            Export
          </Button>
        </XStack>
      )}

      <SurfaceCard gap="$3">
        <XStack justify="space-between" items="center" gap="$3" flexWrap="wrap">
          <YStack gap="$0.5">
            <Paragraph color="$color8" fontSize="$1" fontWeight="700" letterSpacing={1.2} textTransform="uppercase">
              Active Context
            </Paragraph>
            <Paragraph color="$color12" fontSize="$5" fontWeight="800">
              {TAB_LABELS[activeTab]} Report
            </Paragraph>
            <Paragraph color="$color10" fontSize="$2">
              {activePresetLabel}{datePreset === 'custom' && fromDate && toDate ? ` · ${fromDate} to ${toDate}` : ''}{compareMode ? ' · compared to previous period' : ''}
            </Paragraph>
          </YStack>
          <XStack gap="$2" flexWrap="wrap">
            <Button size="$2.5" bg="$color3" borderWidth={1} borderColor="$borderColor" icon={<RotateCcw size={14} />} onPress={resetFilters}>
              Reset
            </Button>
          </XStack>
        </XStack>

        <XStack gap="$1.5" flexWrap="wrap">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
            <Button
              key={tab}
              size="$2.5"
              bg={activeTab === tab ? '$color4' : '$color3'}
              borderWidth={1}
              borderColor={activeTab === tab ? '$accentBackground' : '$borderColor'}
              onPress={() => {
                hapticLight()
                setActiveTab(tab)
              }}
            >
              {TAB_LABELS[tab]}
            </Button>
          ))}
        </XStack>

        <XStack gap="$1.5" flexWrap="wrap">
          {QUICK_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              size="$2.5"
              bg={movementBucket === preset.key ? '$color4' : '$color3'}
              borderWidth={1}
              borderColor={movementBucket === preset.key ? '$accentBackground' : '$borderColor'}
              onPress={() => setMovementBucket(preset.key)}
            >
              {preset.label}
            </Button>
          ))}
        </XStack>

        {filterCount > 0 ? (
          <XStack gap="$1.5" flexWrap="wrap">
            {filterCount > 0 ? (
              <Button size="$2.5" bg="$color4" borderWidth={1} borderColor="$accentBackground">
                {filterCount} active
              </Button>
            ) : null}
            {filterChips.map((chip) => (
              <Button key={chip} size="$2.5" bg="$color3" borderWidth={1} borderColor="$borderColor">
                {chip}
              </Button>
            ))}
          </XStack>
        ) : null}
      </SurfaceCard>

      {desktop ? (
        <XStack gap="$4" items="flex-start">
          <YStack width={310} position="sticky" style={{ top: 92 } as DimensionValue | any}>
            {filterPanel}
          </YStack>
          <YStack flex={1} gap="$3">
            {content}
          </YStack>
        </XStack>
      ) : (
        <YStack gap="$3">
          {content}
        </YStack>
      )}

      <MobileFilterSheet open={filtersOpen} onOpenChange={setFiltersOpen} activeCount={filterCount} onReset={resetFilters}>
        {filterPanel}
      </MobileFilterSheet>

      <ResponsiveDialog open={exportOpen} onOpenChange={setExportOpen} title="Advanced Export" description="Choose the dataset and export scope.">
        <YStack gap="$3" py="$2">
          <YStack gap="$2">
            <Paragraph color="$color12" fontSize="$4" fontWeight="800">Export Scope</Paragraph>
            <XStack gap="$2" flexWrap="wrap">
              <Button size="$2.5" bg={exportScope === 'current_view' ? '$color4' : '$color3'} borderWidth={1} borderColor={exportScope === 'current_view' ? '$accentBackground' : '$borderColor'} onPress={() => setExportScope('current_view')}>
                Current view
              </Button>
              <Button size="$2.5" bg={exportScope === 'detail_rows' ? '$color4' : '$color3'} borderWidth={1} borderColor={exportScope === 'detail_rows' ? '$accentBackground' : '$borderColor'} onPress={() => setExportScope('detail_rows')}>
                Detail rows
              </Button>
              <Button size="$2.5" bg={exportScope === 'summary_and_detail' ? '$color4' : '$color3'} borderWidth={1} borderColor={exportScope === 'summary_and_detail' ? '$accentBackground' : '$borderColor'} onPress={() => setExportScope('summary_and_detail')}>
                Summary + detail
              </Button>
            </XStack>
          </YStack>
          <YStack gap="$2">
            {EXPORT_OPTIONS.map((option) => (
              <SectionCard key={option.key} bg="$color3" p="$3">
                <XStack justify="space-between" items="center" gap="$3">
                  <YStack flex={1} gap="$0.25">
                    <Paragraph color="$color12" fontSize="$3" fontWeight="700">{option.label}</Paragraph>
                    <Paragraph color="$color10" fontSize="$2">{option.description}</Paragraph>
                  </YStack>
                  <Button theme="accent" size="$2.5" disabled={isExporting !== null} onPress={() => handleExport(option.key)}>
                    {isExporting === option.key ? 'Exporting…' : 'Export'}
                  </Button>
                </XStack>
              </SectionCard>
            ))}
          </YStack>
        </YStack>
      </ResponsiveDialog>
    </ScreenScaffold>
  )
}
