import { useEffect, useState } from 'react'
import {
  Grid2x2,
  List,
  PackagePlus,
  Pencil,
  Save,
  Search,
  Warehouse,
  Filter,
} from '@tamagui/lucide-icons-2'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import {
  Button,
  Input,
  Paragraph,
  Spinner,
  TextArea,
  XStack,
  YStack,
  useMedia,
} from 'tamagui'
import { convexApi } from 'lib/convex'
import { CategoryNode, getCategoryName, getSubcategoryName, getSubcategoryOptions } from 'lib/categories'
import { getErrorMessage } from 'lib/errors'
import { formatCurrency, formatDateTime, formatNumber } from 'lib/format'
import { pickSingleImage, uploadSelectedImage } from 'lib/upload'
import { FormField } from 'components/ui/FormField'
import { PageHeader } from 'components/ui/PageHeader'
import { ProductImage } from 'components/ui/ProductImage'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { SelectionField } from 'components/ui/SelectionField'
import { StatusBadge } from 'components/ui/StatusBadge'
import { SurfaceCard } from 'components/ui/SurfaceCard'
import { ProductEditorDialog } from 'components/inventory/ProductEditorDialog'
import { StockAdjustDialog, InventoryItem } from 'components/inventory/StockAdjustDialog'

export function InventoryScreen() {

  const media = useMedia()
  const desktop = !media.maxMd
  const categories = useQuery(convexApi.inventory.listCategories, {
    includeInactive: true,
  }) as CategoryNode[] | undefined
  const toast = useToastController()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('all')
  const [stockState, setStockState] = useState<
    'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  >('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(desktop)

  useEffect(() => {
    if (!categoryId) {
      setSubcategoryId(null)
      return
    }
    const validSubcategoryIds = new Set(
      getSubcategoryOptions(categories, categoryId).map((option) => option.value),
    )
    if (subcategoryId && !validSubcategoryIds.has(subcategoryId)) {
      setSubcategoryId(null)
    }
  }, [categoryId, subcategoryId, categories])

  const { results, status: paginationStatus, loadMore } = usePaginatedQuery(
    convexApi.inventory.list,
    {
      search: search.trim() || null,
      categoryId,
      subcategoryId,
      status,
      stockState,
    },
    { initialNumItems: 24 },
  )

  const items = (results ?? []) as InventoryItem[]

  function openCreateDialog() {
    if ((categories ?? []).length === 0) {
      toast.show('Create categories first', {
        message: 'Open Settings to add categories before creating products.',
      })
      return
    }
    setEditingProductId(null)
    setEditorOpen(true)
  }

  function openEditDialog(productId: string) {
    setEditingProductId(productId)
    setEditorOpen(true)
  }

  function openAdjustDialog(item: InventoryItem) {
    setAdjustItem(item)
    setAdjustOpen(true)
  }

  return (
    <YStack gap="$4">
      <PageHeader
        title="Inventory"
        actions={
          <XStack gap="$2">
            {!desktop ? (
              <Button
                size="$3"
                bg="$color3"
                borderColor="$borderColor"
                borderWidth={1}
               
                icon={Filter}
                onPress={() => setFiltersOpen(!filtersOpen)}
              >
                Filters
              </Button>
            ) : null}
            <Button theme="accent" size="$3" icon={PackagePlus} onPress={openCreateDialog}>
              {desktop ? 'New Product' : 'New'}
            </Button>
          </XStack>
        }
      />

      {/* Filter toolbar */}
      {filtersOpen ? (
        <SurfaceCard gap="$3">
          <XStack gap="$2" flexWrap="wrap">
            <YStack flex={1} style={{ minWidth: 180 }}>
              <FormField label="Search">
                <Input value={search} onChangeText={setSearch} placeholder="Name, code, barcode…" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
              </FormField>
            </YStack>
            <YStack flex={1} style={{ minWidth: 150 }}>
              <SelectionField label="Category" value={categoryId} placeholder="All" options={[{ label: 'All', value: null }, ...(categories ?? []).map((c) => ({ label: c.name, value: c._id }))]} onChange={setCategoryId} />
            </YStack>
            <YStack flex={1} style={{ minWidth: 150 }}>
              <SelectionField label="Subcategory" value={subcategoryId} placeholder="All" options={[{ label: 'All', value: null }, ...getSubcategoryOptions(categories, categoryId)]} onChange={setSubcategoryId} />
            </YStack>
          </XStack>
          <XStack gap="$2" flexWrap="wrap" items="flex-end">
            <YStack flex={1} style={{ minWidth: 130 }}>
              <SelectionField
                label="Status"
                value={status}
                placeholder="All"
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Archived', value: 'archived' },
                ]}
                onChange={(v) => setStatus((v as any) ?? 'all')}
              />
            </YStack>
            <YStack flex={1} style={{ minWidth: 130 }}>
              <SelectionField
                label="Stock"
                value={stockState}
                placeholder="All"
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'In stock', value: 'in_stock' },
                  { label: 'Low stock', value: 'low_stock' },
                  { label: 'Out of stock', value: 'out_of_stock' },
                ]}
                onChange={(v) => setStockState((v as any) ?? 'all')}
              />
            </YStack>
            <XStack gap="$1">
              <Button
                size="$3"
                theme={viewMode === 'grid' ? 'accent' : undefined}
                icon={Grid2x2}
                onPress={() => setViewMode('grid')}
              />
              <Button
                size="$3"
                theme={viewMode === 'list' ? 'accent' : undefined}
                icon={List}
                onPress={() => setViewMode('list')}
              />
            </XStack>
          </XStack>
        </SurfaceCard>
      ) : null}

      {/* Results count */}
      <Paragraph color="$color7" fontSize="$2">
        {formatNumber(items.length)} variants loaded
      </Paragraph>

      {/* Product listing */}
      {paginationStatus === 'LoadingFirstPage' ? (
        <XStack items="center" gap="$2" py="$4" justify="center">
          <Spinner size="small" />
          <Paragraph color="$color7" fontSize="$2">Loading inventory…</Paragraph>
        </XStack>
      ) : items.length === 0 ? (
        <YStack bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$5" p="$5" gap="$2" items="center">
          <Paragraph fontSize="$5" fontWeight="700">No products found</Paragraph>
          <Paragraph color="$color10" fontSize="$3">Refine filters or create your first product.</Paragraph>
          <Button theme="accent" mt="$2" onPress={openCreateDialog}>Create product</Button>
        </YStack>
      ) : viewMode === 'grid' ? (
        <XStack gap="$2.5" flexWrap="wrap">
          {items.map((item) => (
            <YStack
              key={item._id}
              bg="$color2"
              borderWidth={1}
              borderColor="$borderColor"
              rounded="$4"
              p="$2.5"
              gap="$2"
              style={{ width: desktop ? 260 : '48%' }}
              hoverStyle={{ borderColor: '$borderColorHover' }}
              
            >
              <XStack gap="$2" items="center">
                <ProductImage uri={item.mediaUrl} size={44} label={item.productCode} />
                <YStack flex={1} gap="$0.5">
                  <Paragraph fontSize="$2" fontWeight="700" numberOfLines={1}>
                    {item.productName}
                  </Paragraph>
                  <Paragraph color="$color7" fontSize="$1" numberOfLines={1}>
                    {item.displayCode} · {item.optionSummary || item.label}
                  </Paragraph>
                </YStack>
              </XStack>

              <XStack justify="space-between" items="center">
                <Paragraph fontSize="$3" fontWeight="700">
                  {formatCurrency(item.salePrice)}
                </Paragraph>
                <StatusBadge status={item.stockState} />
              </XStack>

              <XStack justify="space-between" items="center">
                <Paragraph color="$color10" fontSize="$1">
                  {formatNumber(item.onHand)} on hand · thr {formatNumber(item.reorderThreshold)}
                </Paragraph>
              </XStack>

              <XStack gap="$1.5">
                <Button flex={1} size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} icon={Pencil} onPress={() => openEditDialog(item.productId)}>
                  Edit
                </Button>
                <Button flex={1} size="$2" theme="accent" icon={Warehouse} onPress={() => openAdjustDialog(item)}>
                  Stock
                </Button>
              </XStack>
            </YStack>
          ))}
        </XStack>
      ) : (
        <YStack gap="$1.5">
          {items.map((item) => (
            <XStack
              key={item._id}
              bg="$color2"
              borderWidth={1}
              borderColor="$borderColor"
              rounded="$4"
              p="$2.5"
              gap="$3"
              items="center"
              hoverStyle={{ borderColor: '$borderColorHover' }}
              
            >
              <ProductImage uri={item.mediaUrl} size={40} label={item.productCode} />
              <YStack flex={1} gap="$0.5">
                <Paragraph fontSize="$2" fontWeight="700" numberOfLines={1}>
                  {item.productName}
                </Paragraph>
                <Paragraph color="$color7" fontSize="$1" numberOfLines={1}>
                  {item.displayCode} · {item.optionSummary || item.label} · {getCategoryName(categories, item.categoryId)}
                </Paragraph>
              </YStack>

              <XStack gap="$3" items="center">
                <YStack items="flex-end">
                  <Paragraph fontSize="$3" fontWeight="700">{formatCurrency(item.salePrice)}</Paragraph>
                  <Paragraph color="$color7" fontSize="$1">{formatNumber(item.onHand)} pcs</Paragraph>
                </YStack>
                <StatusBadge status={item.stockState} />
                <Button size="$2" bg="$color3" onPress={() => openEditDialog(item.productId)}>Edit</Button>
                <Button size="$2" theme="accent" onPress={() => openAdjustDialog(item)}>Stock</Button>
              </XStack>
            </XStack>
          ))}
        </YStack>
      )}

      {paginationStatus === 'CanLoadMore' ? (
        <XStack justify="center" py="$2">
          <Button bg="$color3" borderColor="$borderColor" borderWidth={1} size="$3" onPress={() => loadMore(24)}>Load more</Button>
        </XStack>
      ) : null}

      <ProductEditorDialog open={editorOpen} onOpenChange={setEditorOpen} productId={editingProductId} categories={categories} />
      <StockAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} item={adjustItem} />
    </YStack>
  )
}
