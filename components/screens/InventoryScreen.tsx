import { useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Grid2x2, List, PackagePlus, Pencil, Search, SlidersHorizontal, Warehouse } from '@tamagui/lucide-icons-2'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { formatCurrency, formatNumber } from 'lib/format'
import { useDebounce } from 'lib/useDebounce'
import { ProductImage } from 'components/ui/ProductImage'
import { ProductShowcaseDialog } from 'components/ui/ProductShowcaseDialog'
import { SelectionField } from 'components/ui/SelectionField'
import { StatusBadge } from 'components/ui/StatusBadge'
import { ProductEditorDialog } from 'components/inventory/ProductEditorDialog'
import { StockAdjustDialog, InventoryItem } from 'components/inventory/StockAdjustDialog'
import { ScreenScaffold } from 'components/ui/ScreenScaffold'
import { ScreenHeader, HeaderAction } from 'components/ui/ScreenHeader'
import { ListRow } from 'components/ui/ListRow'
import { EmptyState } from 'components/ui/EmptyState'
import { MobileFilterSheet } from 'components/ui/MobileFilterSheet'
import { SectionCard } from 'components/ui/SectionCard'

export function InventoryScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ create?: string | string[]; openAt?: string | string[] }>()
  const media = useMedia()
  const mobile = media.maxMd
  const desktop = !mobile
  const categories = useQuery(convexApi.inventory.listCategories, { includeInactive: true }) as CategoryNode[] | undefined
  const toast = useToastController()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('all')
  const [stockState, setStockState] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [showcaseProductId, setShowcaseProductId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (!categoryId) {
      setSubcategoryId(null)
      return
    }
    const valid = new Set(getSubcategoryOptions(categories, categoryId).map((o) => o.value))
    if (subcategoryId && !valid.has(subcategoryId)) setSubcategoryId(null)
  }, [categoryId, subcategoryId, categories])

  useEffect(() => {
    const create = Array.isArray(params.create) ? params.create[0] : params.create
    const openAt = Array.isArray(params.openAt) ? params.openAt[0] : params.openAt
    if (create !== 'product' || !openAt) return
    if (categories === undefined) return
    
    if (categories.length === 0) {
      toast.show('Create categories first', { message: 'Go to Settings.' })
      router.replace('/inventory')
      return
    }

    setEditingProductId(null)
    setEditorOpen(true)
    router.replace('/inventory')
  }, [params.create, params.openAt, categories, router])

  const debouncedSearch = useDebounce(search, 300)
  const { results, status: pageStatus, loadMore } = usePaginatedQuery(
    convexApi.inventory.list,
    { search: debouncedSearch.trim() || null, categoryId: categoryId as import('convex/_generated/dataModel').Id<'categories'> | null, subcategoryId: subcategoryId as import('convex/_generated/dataModel').Id<'categories'> | null, status, stockState },
    { initialNumItems: 24 },
  )
  const items = (results ?? []) as InventoryItem[]

  const activeFilterCount = useMemo(
    () => [search.trim(), categoryId, subcategoryId, status !== 'all', stockState !== 'all'].filter(Boolean).length,
    [search, categoryId, subcategoryId, status, stockState],
  )

  function openCreate() {
    if ((categories ?? []).length === 0) {
      toast.show('Create categories first', { message: 'Go to Settings.' })
      return
    }
    setEditingProductId(null)
    setEditorOpen(true)
  }

  function resetFilters() {
    setCategoryId(null)
    setSubcategoryId(null)
    setStatus('all')
    setStockState('all')
  }

  const searchBar = (
    <XStack
      items="center"
      gap="$2"
      bg="$color3"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$6"
      px="$3"
      py="$1"
    >
      <Search size={16} color="$color8" />
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, code, barcode"
        flex={1}
        bg="transparent"
        borderWidth={0}
        py="$2"
        px="$0"
        color="$color12"
      />
      {mobile ? (
        <Button
          size="$2.5"
          bg="$color3"
          borderWidth={1}
          borderColor="$borderColor"
          icon={<SlidersHorizontal size={14} />}
          onPress={() => setFiltersOpen(true)}
        >
          {activeFilterCount > 0 ? activeFilterCount : 'Filters'}
        </Button>
      ) : null}
    </XStack>
  )

  const filterFields = (
    <>
      <YStack style={{ minWidth: mobile ? '100%' : 180 }}>
        <SelectionField label="Category" value={categoryId} placeholder="All categories" options={[{ label: 'All categories', value: null }, ...(categories ?? []).map((c) => ({ label: c.name, value: c._id }))]} onChange={setCategoryId} />
      </YStack>
      <YStack style={{ minWidth: mobile ? '100%' : 180 }}>
        <SelectionField label="Subcategory" value={subcategoryId} placeholder="All subcategories" options={[{ label: 'All subcategories', value: null }, ...getSubcategoryOptions(categories, categoryId)]} onChange={setSubcategoryId} />
      </YStack>
      <YStack style={{ minWidth: mobile ? '100%' : 160 }}>
        <SelectionField label="Status" value={status} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Archived', value: 'archived' }]} onChange={(v) => setStatus((v ?? 'all') as typeof status)} />
      </YStack>
      <YStack style={{ minWidth: mobile ? '100%' : 160 }}>
        <SelectionField label="Stock" value={stockState} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'In stock', value: 'in_stock' }, { label: 'Low stock', value: 'low_stock' }, { label: 'Out of stock', value: 'out_of_stock' }]} onChange={(v) => setStockState((v ?? 'all') as typeof stockState)} />
      </YStack>
    </>
  )

  return (
    <ScreenScaffold>
      {!mobile ? (
        <ScreenHeader
          eyebrow="Catalog"
          title="Inventory"
          subtitle="Manage products, stock, and merchandising details."
          actions={
            <>
              <XStack bg="$color2" rounded="$12" p="$0.5" borderWidth={1} borderColor="$borderColor">
                <Button size="$2.5" bg={viewMode === 'list' ? '$color4' : 'transparent'} borderWidth={0} icon={List} onPress={() => setViewMode('list')} />
                <Button size="$2.5" bg={viewMode === 'grid' ? '$color4' : 'transparent'} borderWidth={0} icon={Grid2x2} onPress={() => setViewMode('grid')} />
              </XStack>
              <HeaderAction theme="accent" icon={<PackagePlus size={14} />} onPress={openCreate}>
                New Product
              </HeaderAction>
            </>
          }
        />
      ) : null}

      {searchBar}

      {mobile ? (
        <XStack gap="$2" flexWrap="wrap">
          <Button size="$2.5" bg="$accentSoft" borderWidth={1} borderColor="$borderStrong">
            {formatNumber(items.length)} items
          </Button>
          {categoryId ? (
            <Button size="$2.5" bg="$color2" borderWidth={1} borderColor="$borderColor" onPress={() => setCategoryId(null)}>
              Category active
            </Button>
          ) : null}
          {stockState !== 'all' ? (
            <Button size="$2.5" bg="$color2" borderWidth={1} borderColor="$borderColor" onPress={() => setStockState('all')}>
              {stockState.replaceAll('_', ' ')}
            </Button>
          ) : null}
          <Button size="$2.5" theme="accent" borderWidth={1} borderColor="$accentBackground" icon={<PackagePlus size={14} />} onPress={openCreate}>
            Add Product
          </Button>
        </XStack>
      ) : (
        <SectionCard>
          <XStack justify="space-between" items="center" gap="$3" flexWrap="wrap">
            <XStack gap="$2" flexWrap="wrap" flex={1}>
              {filterFields}
            </XStack>
            <YStack gap="$1" items="flex-end">
              <Paragraph color="$color10" fontSize="$2">{formatNumber(items.length)} visible items</Paragraph>
              {activeFilterCount > 0 ? (
                <Button size="$2.5" bg="$color3" borderWidth={1} borderColor="$borderColor" hoverStyle={{ bg: '$color4' }} onPress={resetFilters}>
                  Reset filters
                </Button>
              ) : null}
            </YStack>
          </XStack>
        </SectionCard>
      )}

      {pageStatus === 'LoadingFirstPage' ? (
        <XStack items="center" gap="$2" py="$6" justify="center">
          <Spinner size="small" />
          <Paragraph color="$color10">Loading inventory…</Paragraph>
        </XStack>
      ) : items.length === 0 ? (
        <EmptyState title="No products found" description="Adjust your filters or create a new product to start building the catalog." actionLabel="Create product" onAction={openCreate} />
      ) : mobile || viewMode === 'list' ? (
        <YStack gap="$2.5">
          {items.map((item) => (
            <ListRow
              key={item._id}
              onPress={() => setShowcaseProductId(item.productId)}
              leading={<ProductImage uri={item.mediaUrl} size={52} label={item.productCode} />}
              title={item.productName}
              meta={<Paragraph color="$color12" fontSize="$4" fontWeight="800">{formatCurrency(item.salePrice)}</Paragraph>}
              subtitle={
                <YStack gap="$1">
                  <Paragraph color="$color10" fontSize="$2" numberOfLines={1}>
                    {item.displayCode} · {item.optionSummary || item.label}
                  </Paragraph>
                  <XStack justify="space-between" items="center" gap="$2">
                    <Paragraph color="$color8" fontSize="$1">
                      {formatNumber(item.onHand)} on hand · reorder {formatNumber(item.reorderThreshold)}
                    </Paragraph>
                    <StatusBadge status={item.stockState} />
                  </XStack>
                </YStack>
              }
              trailing={
                <XStack gap="$1.5">
                  <Button size="$2.5" bg="$color3" borderWidth={1} borderColor="$borderColor" hoverStyle={{ bg: '$color4' }} icon={Pencil} onPress={() => { setEditingProductId(item.productId); setEditorOpen(true) }}>
                    Edit
                  </Button>
                  <Button size="$2.5" theme="accent" icon={<Warehouse size={14} />} onPress={() => { setAdjustItem(item); setAdjustOpen(true) }}>
                    Stock
                  </Button>
                </XStack>
              }
            />
          ))}
        </YStack>
      ) : (
        <XStack gap="$3" flexWrap="wrap">
          {items.map((item) => (
            <SectionCard key={item._id} style={{ width: 300 }}>
              <XStack gap="$3" items="center">
                <ProductImage uri={item.mediaUrl} size={60} label={item.productCode} />
                <YStack flex={1} gap="$1">
                  <Paragraph color="$color12" fontSize="$4" fontWeight="800" numberOfLines={1}>{item.productName}</Paragraph>
                  <Paragraph color="$color10" fontSize="$2" numberOfLines={1}>{item.displayCode} · {item.optionSummary || item.label}</Paragraph>
                </YStack>
              </XStack>
              <XStack justify="space-between" items="center">
                <Paragraph color="$color12" fontSize="$6" fontWeight="900">{formatCurrency(item.salePrice)}</Paragraph>
                <StatusBadge status={item.stockState} />
              </XStack>
              <Paragraph color="$color8" fontSize="$2">{formatNumber(item.onHand)} on hand · reorder {formatNumber(item.reorderThreshold)}</Paragraph>
              <XStack gap="$2">
                <Button flex={1} bg="$color3" borderWidth={1} borderColor="$borderColor" hoverStyle={{ bg: '$color4' }} icon={Pencil} onPress={() => { setEditingProductId(item.productId); setEditorOpen(true) }}>
                  Edit
                </Button>
                <Button flex={1} theme="accent" icon={<Warehouse size={14} />} onPress={() => { setAdjustItem(item); setAdjustOpen(true) }}>
                  Stock
                </Button>
              </XStack>
            </SectionCard>
          ))}
        </XStack>
      )}

      {pageStatus === 'CanLoadMore' ? (
        <XStack justify="center" py="$2">
          <Button bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} size="$3" onPress={() => loadMore(24)}>
            Load more
          </Button>
        </XStack>
      ) : null}

      <MobileFilterSheet open={filtersOpen} onOpenChange={setFiltersOpen} activeCount={activeFilterCount} onReset={resetFilters}>
        <YStack gap="$3">
          {filterFields}
        </YStack>
      </MobileFilterSheet>

      <ProductEditorDialog open={editorOpen} onOpenChange={setEditorOpen} productId={editingProductId} categories={categories} />
      <StockAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} item={adjustItem} />
      <ProductShowcaseDialog productId={showcaseProductId} open={showcaseProductId !== null} onOpenChange={(open) => !open && setShowcaseProductId(null)} />
    </ScreenScaffold>
  )
}
