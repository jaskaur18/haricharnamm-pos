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

type InventoryItem = {
  _id: string
  productId: string
  productCode: string
  displayCode: string
  productName: string
  label: string
  optionSummary: string
  salePrice: number
  reorderThreshold: number
  status: 'active' | 'archived'
  categoryId: string | null
  subcategoryId: string | null
  onHand: number
  lastSaleAt: number | null
  stockState: 'in_stock' | 'low_stock' | 'out_of_stock'
  mediaUrl?: string | null
}

type ProductDetail = {
  _id: string
  name: string
  description: string
  categoryId: string
  subcategoryId: string | null
  status: 'active' | 'archived'
  brandCopy: string
  notes: string | null
  merchandisingTags: string[]
  media: Array<{ url?: string | null }>
  variants: Array<{
    _id: string
    label: string
    barcode: string | null
    salePrice: number
    reorderThreshold: number
    attributes: Array<{ name: string; value: string }>
    inventoryLevel: { onHand: number }
  }>
}

type VariantForm = {
  variantId: string | null
  label: string
  barcode: string
  attributesText: string
  salePrice: string
  reorderThreshold: string
  openingQuantity: string
}

function createEmptyVariant(): VariantForm {
  return {
    variantId: null,
    label: '',
    barcode: '',
    attributesText: '',
    salePrice: '0',
    reorderThreshold: '0',
    openingQuantity: '0',
  }
}

function attributesToText(attributes: Array<{ name: string; value: string }>) {
  return attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join('\n')
}

function parseAttributes(attributesText: string) {
  return attributesText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(':')
      return {
        name: name.trim(),
        value: rest.join(':').trim(),
      }
    })
    .filter((attribute) => attribute.name && attribute.value)
}

function ProductEditorDialog({
  open,
  onOpenChange,
  productId,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string | null
  categories: CategoryNode[] | undefined
}) {
  const toast = useToastController()
  const detail = useQuery(
    convexApi.inventory.detail,
    productId ? { productId } : 'skip',
  ) as ProductDetail | undefined
  const createProduct = useMutation(convexApi.inventory.create)
  const updateProduct = useMutation(convexApi.inventory.update)
  const generateUploadUrl = useMutation(convexApi.inventory.generateUploadUrl)
  const attachMedia = useMutation(convexApi.inventory.attachMedia)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [status, setStatus] = useState<'active' | 'archived'>('active')
  const [brandCopy, setBrandCopy] = useState(
    'We are providing unique and handmade Lord Accessories.',
  )
  const [notes, setNotes] = useState('')
  const [merchandisingTags, setMerchandisingTags] = useState('')
  const [variants, setVariants] = useState<VariantForm[]>([createEmptyVariant()])
  const [selectedImage, setSelectedImage] = useState<{ uri: string; mimeType?: string | null } | null>(
    null,
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    if (!productId) {
      setName('')
      setDescription('')
      setCategoryId(categories?.[0]?._id ?? null)
      setSubcategoryId(null)
      setStatus('active')
      setBrandCopy('We are providing unique and handmade Lord Accessories.')
      setNotes('')
      setMerchandisingTags('')
      setVariants([createEmptyVariant()])
      setSelectedImage(null)
      return
    }

    if (!detail) {
      return
    }

    setName(detail.name)
    setDescription(detail.description)
    setCategoryId(detail.categoryId)
    setSubcategoryId(detail.subcategoryId ?? null)
    setStatus(detail.status)
    setBrandCopy(detail.brandCopy)
    setNotes(detail.notes ?? '')
    setMerchandisingTags(detail.merchandisingTags.join(', '))
    setVariants(
      detail.variants.map((variant) => ({
        variantId: variant._id,
        label: variant.label,
        barcode: variant.barcode ?? '',
        attributesText: attributesToText(variant.attributes),
        salePrice: String(variant.salePrice),
        reorderThreshold: String(variant.reorderThreshold),
        openingQuantity: '0',
      })),
    )
    const firstImage = detail.media[0]?.url ?? null
    setSelectedImage(firstImage ? { uri: firstImage } : null)
  }, [open, productId, detail, categories])

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

  async function handlePickImage() {
    const asset = await pickSingleImage()
    if (!asset) {
      return
    }
    setSelectedImage(asset)
  }

  async function handleSaveProduct() {
    if (!name.trim()) {
      toast.show('Product name is required')
      return
    }
    if (!categoryId) {
      toast.show('Select a category')
      return
    }
    if (variants.length === 0) {
      toast.show('Add at least one variant')
      return
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      subcategoryId,
      status,
      brandCopy: brandCopy.trim(),
      notes: notes.trim() || null,
      merchandisingTags: merchandisingTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      variants: variants.map((variant) => ({
        variantId: variant.variantId,
        label: variant.label.trim(),
        barcode: variant.barcode.trim() || null,
        attributes: parseAttributes(variant.attributesText),
        salePrice: Number(variant.salePrice || 0),
        reorderThreshold: Number(variant.reorderThreshold || 0),
        openingQuantity: Number(variant.openingQuantity || 0),
      })),
    }

    if (payload.variants.some((variant) => !variant.label)) {
      toast.show('Each variant needs a label')
      return
    }

    setIsSaving(true)
    try {
      const result = productId
        ? await updateProduct({
            productId,
            ...payload,
          })
        : await createProduct(payload)

      if (selectedImage && !selectedImage.uri.startsWith('http')) {
        const uploadUrl = await generateUploadUrl({})
        const storageId = await uploadSelectedImage(selectedImage as any, uploadUrl)
        await attachMedia({
          productId: result.productId,
          variantId: null,
          storageId,
          caption: null,
          sortOrder: 0,
        })
      }

      toast.show(productId ? 'Product updated' : 'Product created', {
        message: `${result.productCode} is ready.`,
      })
      onOpenChange(false)
    } catch (error) {
      toast.show('Unable to save product', {
        message: getErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={productId ? 'Edit product' : 'Create product'}
      description="Product fields live on the parent, sellable combinations in variants."
    >
      <YStack gap="$3" py="$2">
        <XStack gap="$3" flexWrap="wrap">
          <YStack gap="$2" items="center" style={{ width: 120 }}>
            <ProductImage uri={selectedImage?.uri} size={80} label={name || 'HC'} />
            <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={handlePickImage}>
              Choose image
            </Button>
          </YStack>

          <YStack flex={1} gap="$3" style={{ minWidth: 200 }}>
            <FormField label="Product name">
              <Input value={name} onChangeText={setName} placeholder="e.g. Krishna Mukut" bg="$color1" borderColor="$borderColor" />
            </FormField>

            <XStack gap="$2" flexWrap="wrap">
              <YStack flex={1} style={{ minWidth: 140 }}>
                <SelectionField
                  label="Category"
                  value={categoryId}
                  placeholder="Select"
                  options={(categories ?? []).map((c) => ({ label: c.name, value: c._id }))}
                  onChange={setCategoryId}
                />
              </YStack>
              <YStack flex={1} style={{ minWidth: 140 }}>
                <SelectionField
                  label="Subcategory"
                  value={subcategoryId}
                  placeholder="Optional"
                  options={[
                    { label: 'None', value: null },
                    ...getSubcategoryOptions(categories, categoryId),
                  ]}
                  onChange={setSubcategoryId}
                />
              </YStack>
            </XStack>

            <SelectionField
              label="Status"
              value={status}
              placeholder="Status"
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Archived', value: 'archived' },
              ]}
              onChange={(v) => setStatus((v as 'active' | 'archived' | null) ?? 'active')}
            />
          </YStack>
        </XStack>

        <FormField label="Description">
          <TextArea
            value={description}
            onChangeText={setDescription}
            placeholder="Product story, material, size cues"
            style={{ minHeight: 80 }}
            bg="$color1"
            borderColor="$borderColor"
          />
        </FormField>

        <FormField label="Brand copy">
          <TextArea
            value={brandCopy}
            onChangeText={setBrandCopy}
            placeholder="Short branded sentence"
            style={{ minHeight: 60 }}
            bg="$color1"
            borderColor="$borderColor"
          />
        </FormField>

        <FormField label="Tags" description="Comma separated.">
          <Input value={merchandisingTags} onChangeText={setMerchandisingTags} placeholder="festival, premium, pearl" bg="$color1" borderColor="$borderColor" />
        </FormField>

        <FormField label="Notes">
          <TextArea value={notes} onChangeText={setNotes} placeholder="Internal notes" style={{ minHeight: 60 }} bg="$color1" borderColor="$borderColor" />
        </FormField>

        {/* Variants */}
        <YStack gap="$2">
          <XStack justify="space-between" items="center">
            <Paragraph fontSize="$4" fontWeight="700">
              Variants ({variants.length})
            </Paragraph>
            <Button
              size="$2"
              bg="$color3"
              borderColor="$borderColor"
              borderWidth={1}
             
              onPress={() => setVariants((c) => [...c, createEmptyVariant()])}
            >
              Add variant
            </Button>
          </XStack>

          {variants.map((variant, index) => (
            <YStack
              key={variant.variantId ?? `new-${index}`}
              bg="$color3"
              rounded="$4"
              p="$3"
              gap="$2.5"
            >
              <XStack justify="space-between" items="center">
                <Paragraph fontSize="$3" fontWeight="700">
                  Variant {index + 1}
                </Paragraph>
                <Button
                  size="$2"
                  disabled={variants.length === 1}
                  bg="$color4"
                  onPress={() => setVariants((c) => c.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </XStack>

              <XStack gap="$2" flexWrap="wrap">
                <YStack flex={1} style={{ minWidth: 140 }}>
                  <FormField label="Label">
                    <Input
                      value={variant.label}
                      onChangeText={(v) => setVariants((c) => c.map((item, i) => i === index ? { ...item, label: v } : item))}
                      placeholder="e.g. Red Stone"
                      bg="$color1"
                      borderColor="$borderColor"
                    />
                  </FormField>
                </YStack>
                <YStack flex={1} style={{ minWidth: 140 }}>
                  <FormField label="Price">
                    <Input
                      value={variant.salePrice}
                      onChangeText={(v) => setVariants((c) => c.map((item, i) => i === index ? { ...item, salePrice: v } : item))}
                      keyboardType="numeric"
                      placeholder="0"
                      bg="$color1"
                      borderColor="$borderColor"
                    />
                  </FormField>
                </YStack>
              </XStack>

              <XStack gap="$2" flexWrap="wrap">
                <YStack flex={1} style={{ minWidth: 140 }}>
                  <FormField label="Barcode">
                    <Input
                      value={variant.barcode}
                      onChangeText={(v) => setVariants((c) => c.map((item, i) => i === index ? { ...item, barcode: v } : item))}
                      placeholder="Optional"
                      bg="$color1"
                      borderColor="$borderColor"
                    />
                  </FormField>
                </YStack>
                <YStack flex={1} style={{ minWidth: 140 }}>
                  <FormField label="Reorder threshold">
                    <Input
                      value={variant.reorderThreshold}
                      onChangeText={(v) => setVariants((c) => c.map((item, i) => i === index ? { ...item, reorderThreshold: v } : item))}
                      keyboardType="numeric"
                      placeholder="0"
                      bg="$color1"
                      borderColor="$borderColor"
                    />
                  </FormField>
                </YStack>
                <YStack flex={1} style={{ minWidth: 140 }}>
                  <FormField label="Opening qty">
                    <Input
                      value={variant.openingQuantity}
                      onChangeText={(v) => setVariants((c) => c.map((item, i) => i === index ? { ...item, openingQuantity: v } : item))}
                      keyboardType="numeric"
                      placeholder="0"
                      disabled={!!variant.variantId}
                      bg="$color1"
                      borderColor="$borderColor"
                    />
                  </FormField>
                </YStack>
              </XStack>

              <FormField label="Attributes" description="One per line: Name: Value">
                <TextArea
                  value={variant.attributesText}
                  onChangeText={(v) => setVariants((c) => c.map((item, i) => i === index ? { ...item, attributesText: v } : item))}
                  placeholder={'Color: Red\nStone: Pearl'}
                  style={{ minHeight: 60 }}
                  bg="$color1"
                  borderColor="$borderColor"
                />
              </FormField>
            </YStack>
          ))}
        </YStack>

        <XStack justify="flex-end">
          <Button
            bg="$color8"
           
           
            icon={Save}
            onPress={handleSaveProduct}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : productId ? 'Update' : 'Create'}
          </Button>
        </XStack>
      </YStack>
    </ResponsiveDialog>
  )
}

function StockAdjustDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
}) {
  const toast = useToastController()
  const adjustStock = useMutation(convexApi.inventory.adjustStock)
  const [quantityDelta, setQuantityDelta] = useState('0')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !item) {
      setQuantityDelta('0')
      setReason('')
      setNote('')
    }
  }, [open, item])

  async function handleAdjust() {
    if (!item) return
    if (!reason.trim()) {
      toast.show('Reason is required')
      return
    }

    setIsSaving(true)
    try {
      const result = await adjustStock({
        variantId: item._id,
        quantityDelta: Number(quantityDelta || 0),
        reason: reason.trim(),
        note: note.trim() || null,
      })
      toast.show('Stock updated', {
        message: `${item.displayCode} → ${result.nextOnHand} units.`,
      })
      onOpenChange(false)
    } catch (error) {
      toast.show('Adjustment failed', { message: getErrorMessage(error) })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Adjust stock">
      <YStack gap="$3" py="$2">
        <YStack bg="$color3" rounded="$4" p="$3" gap="$1">
          <Paragraph fontWeight="700">{item?.productName}</Paragraph>
          <Paragraph color="$color7" fontSize="$2">{item?.displayCode} · {item?.label}</Paragraph>
          <Paragraph color="$color10" fontSize="$2">Current: {item ? formatNumber(item.onHand) : '—'} units</Paragraph>
        </YStack>

        <FormField label="Quantity delta" description="Positive for intake, negative for deduction.">
          <Input value={quantityDelta} onChangeText={setQuantityDelta} keyboardType="numeric" placeholder="e.g. 12 or -2" bg="$color1" borderColor="$borderColor" />
        </FormField>

        <FormField label="Reason">
          <Input value={reason} onChangeText={setReason} placeholder="e.g. Shelf count correction" bg="$color1" borderColor="$borderColor" />
        </FormField>

        <FormField label="Note">
          <TextArea value={note} onChangeText={setNote} placeholder="Optional" style={{ minHeight: 60 }} bg="$color1" borderColor="$borderColor" />
        </FormField>

        <XStack justify="flex-end">
          <Button theme="accent" onPress={handleAdjust} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Apply'}
          </Button>
        </XStack>
      </YStack>
    </ResponsiveDialog>
  )
}

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
                <Input value={search} onChangeText={setSearch} placeholder="Name, code, barcode…" bg="$color1" borderColor="$borderColor" />
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
