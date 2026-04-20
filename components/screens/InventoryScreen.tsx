import { useEffect, useState } from 'react'
import { Grid2x2, List, PackagePlus, Pencil, Search, Warehouse } from '@tamagui/lucide-icons-2'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { formatCurrency, formatNumber } from 'lib/format'
import { ProductImage } from 'components/ui/ProductImage'
import { ProductShowcaseDialog } from 'components/ui/ProductShowcaseDialog'
import { SelectionField } from 'components/ui/SelectionField'
import { StatusBadge } from 'components/ui/StatusBadge'
import { ProductEditorDialog } from 'components/inventory/ProductEditorDialog'
import { StockAdjustDialog, InventoryItem } from 'components/inventory/StockAdjustDialog'

export function InventoryScreen() {
  const media = useMedia()
  const desktop = !media.maxMd
  const categories = useQuery(convexApi.inventory.listCategories, { includeInactive: true }) as CategoryNode[] | undefined
  const toast = useToastController()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('all')
  const [stockState, setStockState] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [showcaseProductId, setShowcaseProductId] = useState<string | null>(null)

  useEffect(() => {
    if (!categoryId) { setSubcategoryId(null); return }
    const valid = new Set(getSubcategoryOptions(categories, categoryId).map((o) => o.value))
    if (subcategoryId && !valid.has(subcategoryId)) setSubcategoryId(null)
  }, [categoryId, subcategoryId, categories])

  const { results, status: ps, loadMore } = usePaginatedQuery(
    convexApi.inventory.list,
    { search: search.trim() || null, categoryId, subcategoryId, status, stockState },
    { initialNumItems: 24 },
  )
  const items = (results ?? []) as InventoryItem[]

  function openCreate() {
    if ((categories ?? []).length === 0) { toast.show('Create categories first', { message: 'Go to Settings.' }); return }
    setEditingProductId(null); setEditorOpen(true)
  }

  return (
    <YStack gap="$4">
      {/* Header */}
      <XStack justify="space-between" items="center" gap="$3" flexWrap="wrap">
        <Paragraph fontSize="$7" fontWeight="900" letterSpacing={-0.5}>Inventory</Paragraph>
        <XStack gap="$2" items="center" flex={1} justify="flex-end" style={{ minWidth: 200 }}>
          <XStack flex={1} items="center" gap="$2" bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$4" px="$3" style={{ maxWidth: desktop ? 340 : undefined }}>
            <Search size={14} color="$color8" />
            <Input value={search} onChangeText={setSearch} placeholder="Name, code, barcode…" flex={1} bg="transparent" borderWidth={0} py="$2" fontSize="$2" placeholderTextColor="$color7" color="$color12" />
          </XStack>
          <Button theme="accent" size="$3" icon={<PackagePlus size={14} />} onPress={openCreate} hoverStyle={{ scale: 1.02 }} pressStyle={{ scale: 0.97 }}>
            {desktop ? 'New Product' : 'New'}
          </Button>
        </XStack>
      </XStack>

      {/* Filters */}
      <XStack gap="$2" items="flex-end" flexWrap="wrap">
        <YStack style={{ minWidth: 130 }}>
          <SelectionField label="Category" value={categoryId} placeholder="All" options={[{ label: 'All', value: null }, ...(categories ?? []).map((c) => ({ label: c.name, value: c._id }))]} onChange={setCategoryId} />
        </YStack>
        <YStack style={{ minWidth: 130 }}>
          <SelectionField label="Subcategory" value={subcategoryId} placeholder="All" options={[{ label: 'All', value: null }, ...getSubcategoryOptions(categories, categoryId)]} onChange={setSubcategoryId} />
        </YStack>
        <YStack style={{ minWidth: 110 }}>
          <SelectionField label="Status" value={status} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Archived', value: 'archived' }]} onChange={(v) => setStatus((v as any) ?? 'all')} />
        </YStack>
        <YStack style={{ minWidth: 110 }}>
          <SelectionField label="Stock" value={stockState} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'In stock', value: 'in_stock' }, { label: 'Low', value: 'low_stock' }, { label: 'OOS', value: 'out_of_stock' }]} onChange={(v) => setStockState((v as any) ?? 'all')} />
        </YStack>
        <XStack flex={1} justify="flex-end" items="center" gap="$2" style={{ minWidth: 100 }}>
          <Paragraph color="$color8" fontSize="$1">{formatNumber(items.length)} items</Paragraph>
          <XStack bg="$color2" rounded="$3" p="$0.5" borderWidth={1} borderColor="$borderColor">
            <Button size="$2" bg={viewMode === 'grid' ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" icon={Grid2x2} onPress={() => setViewMode('grid')} />
            <Button size="$2" bg={viewMode === 'list' ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" icon={List} onPress={() => setViewMode('list')} />
          </XStack>
        </XStack>
      </XStack>

      {/* Listing */}
      {ps === 'LoadingFirstPage' ? (
        <XStack items="center" gap="$2" py="$6" justify="center"><Spinner size="small" /><Paragraph color="$color8">Loading…</Paragraph></XStack>
      ) : items.length === 0 ? (
        <YStack bg="$color2" borderWidth={1} borderColor="$borderColor" borderStyle="dashed" rounded="$6" p="$6" gap="$3" items="center">
          <Paragraph fontSize="$5" fontWeight="700">No products found</Paragraph>
          <Paragraph color="$color9">Adjust filters or create a product.</Paragraph>
          <Button theme="accent" mt="$1" onPress={openCreate}>Create product</Button>
        </YStack>
      ) : viewMode === 'grid' ? (
        <XStack gap="$3" flexWrap="wrap">
          {items.map((item) => (
            <YStack key={item._id} bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$5" p="$3" gap="$2.5" style={{ width: desktop ? 275 : '48%' }} hoverStyle={{ borderColor: '$color6', bg: '$color3' }} pressStyle={{ scale: 0.99 }}>
              <XStack gap="$2.5" items="center" cursor="pointer" onPress={() => setShowcaseProductId(item.productId)}>
                <ProductImage uri={item.mediaUrl} size={52} label={item.productCode} />
                <YStack flex={1} gap="$0.5">
                  <Paragraph fontSize="$3" fontWeight="700" numberOfLines={1}>{item.productName}</Paragraph>
                  <Paragraph color="$color8" fontSize="$1" numberOfLines={1}>{item.displayCode} · {item.optionSummary || item.label}</Paragraph>
                </YStack>
              </XStack>
              <XStack justify="space-between" items="center">
                <Paragraph fontSize="$4" fontWeight="800">{formatCurrency(item.salePrice)}</Paragraph>
                <StatusBadge status={item.stockState} />
              </XStack>
              <Paragraph color="$color8" fontSize="$1">{formatNumber(item.onHand)} on hand · thr {formatNumber(item.reorderThreshold)}</Paragraph>
              <XStack gap="$1.5">
                <Button flex={1} size="$2.5" bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} icon={Pencil} onPress={() => { setEditingProductId(item.productId); setEditorOpen(true) }}>Edit</Button>
                <Button flex={1} size="$2.5" theme="accent" icon={<Warehouse size={14} />} onPress={() => { setAdjustItem(item); setAdjustOpen(true) }}>Stock</Button>
              </XStack>
            </YStack>
          ))}
        </XStack>
      ) : (
        <YStack gap="$0.5">
          {/* Table header */}
          <XStack px="$3" py="$2" gap="$3" items="center" borderBottomWidth={1} borderBottomColor="$borderColor">
            <YStack style={{ width: 40 }} />
            <Paragraph color="$color8" fontSize="$1" fontWeight="600" flex={2}>Name</Paragraph>
            <Paragraph color="$color8" fontSize="$1" fontWeight="600" flex={1}>Code</Paragraph>
            <Paragraph color="$color8" fontSize="$1" fontWeight="600" style={{ width: 80, textAlign: 'right' }}>Price</Paragraph>
            <Paragraph color="$color8" fontSize="$1" fontWeight="600" style={{ width: 60, textAlign: 'right' }}>Stock</Paragraph>
            <YStack style={{ width: 80 }} items="center"><Paragraph color="$color8" fontSize="$1" fontWeight="600">Status</Paragraph></YStack>
            <YStack style={{ width: 140 }} />
          </XStack>
          {items.map((item) => (
            <XStack key={item._id} px="$3" py="$2" gap="$3" items="center" borderBottomWidth={1} borderBottomColor="$color2" hoverStyle={{ bg: '$color2' }} rounded="$2">
              <ProductImage uri={item.mediaUrl} size={36} label={item.productCode} />
              <YStack flex={2}>
                <Paragraph fontSize="$2" fontWeight="600" numberOfLines={1}>{item.productName}</Paragraph>
                <Paragraph color="$color8" fontSize={10}>{item.optionSummary || item.label}</Paragraph>
              </YStack>
              <Paragraph color="$color9" fontSize="$1" flex={1} numberOfLines={1}>{item.displayCode}</Paragraph>
              <Paragraph fontSize="$2" fontWeight="700" style={{ width: 80, textAlign: 'right' }}>{formatCurrency(item.salePrice)}</Paragraph>
              <Paragraph fontSize="$2" fontWeight="700" style={{ width: 60, textAlign: 'right' }} color={item.stockState === 'out_of_stock' ? '$red10' : item.stockState === 'low_stock' ? '$yellow10' : '$color11'}>{formatNumber(item.onHand)}</Paragraph>
              <YStack style={{ width: 80 }} items="center"><StatusBadge status={item.stockState} /></YStack>
              <XStack style={{ width: 140 }} gap="$1" justify="flex-end">
                <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} onPress={() => { setEditingProductId(item.productId); setEditorOpen(true) }}>Edit</Button>
                <Button size="$2" theme="accent" onPress={() => { setAdjustItem(item); setAdjustOpen(true) }}>Stock</Button>
              </XStack>
            </XStack>
          ))}
        </YStack>
      )}

      {ps === 'CanLoadMore' ? (
        <XStack justify="center" py="$3"><Button bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} size="$3" onPress={() => loadMore(24)}>Load more</Button></XStack>
      ) : null}

      <ProductEditorDialog open={editorOpen} onOpenChange={setEditorOpen} productId={editingProductId} categories={categories} />
      <StockAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} item={adjustItem} />
      <ProductShowcaseDialog productId={showcaseProductId} open={showcaseProductId !== null} onOpenChange={(o) => !o && setShowcaseProductId(null)} />
    </YStack>
  )
}
