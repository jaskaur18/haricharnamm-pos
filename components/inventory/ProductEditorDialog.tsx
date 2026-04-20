import { useEffect, useState } from 'react'
import { Image } from 'react-native'
import { Plus, Save, Trash2, X, Camera } from '@tamagui/lucide-icons-2'
import { useMutation, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, ScrollView, Spinner, TextArea, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { getErrorMessage } from 'lib/errors'
import { pickSingleImage, uploadSelectedImage } from 'lib/upload'
import { FormField } from 'components/ui/FormField'
import { ProductImage } from 'components/ui/ProductImage'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { SelectionField } from 'components/ui/SelectionField'

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
  return { variantId: null, label: '', barcode: '', attributesText: '', salePrice: '0', reorderThreshold: '5', openingQuantity: '0' }
}

function attributesToText(attrs: Array<{ name: string; value: string }>) {
  return attrs.map((a) => `${a.name}: ${a.value}`).join('\n')
}

function parseAttributes(text: string) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, ...rest] = l.split(':')
    return { name: name.trim(), value: rest.join(':').trim() }
  }).filter((a) => a.name && a.value)
}

type PendingImage = { uri: string; mimeType?: string | null }

export function ProductEditorDialog({
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
  const media = useMedia()
  const desktop = !media.maxMd
  const detail = useQuery(convexApi.inventory.detail, productId ? { productId } : 'skip') as ProductDetail | undefined
  const gallery = useQuery(convexApi.pos.productMediaGallery, productId ? { productId } : 'skip' as any) as any[] | undefined
  const createProduct = useMutation(convexApi.inventory.create)
  const updateProduct = useMutation(convexApi.inventory.update)
  const generateUploadUrl = useMutation(convexApi.inventory.generateUploadUrl)
  const attachMedia = useMutation(convexApi.inventory.attachMedia)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [status, setStatus] = useState<'active' | 'archived'>('active')
  const [brandCopy, setBrandCopy] = useState('We are providing unique and handmade Lord Accessories.')
  const [notes, setNotes] = useState('')
  const [merchandisingTags, setMerchandisingTags] = useState('')
  const [variants, setVariants] = useState<VariantForm[]>([createEmptyVariant()])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Reset form on open
  useEffect(() => {
    if (!open) return

    if (!productId) {
      setName(''); setDescription('')
      setCategoryId(categories?.[0]?._id ?? null); setSubcategoryId(null)
      setStatus('active')
      setBrandCopy('We are providing unique and handmade Lord Accessories.')
      setNotes(''); setMerchandisingTags('')
      setVariants([createEmptyVariant()])
      setPendingImages([])
      return
    }

    if (!detail) return

    setName(detail.name); setDescription(detail.description)
    setCategoryId(detail.categoryId); setSubcategoryId(detail.subcategoryId ?? null)
    setStatus(detail.status); setBrandCopy(detail.brandCopy)
    setNotes(detail.notes ?? '')
    setMerchandisingTags(detail.merchandisingTags.join(', '))
    setVariants(detail.variants.map((v) => ({
      variantId: v._id, label: v.label, barcode: v.barcode ?? '',
      attributesText: attributesToText(v.attributes),
      salePrice: String(v.salePrice), reorderThreshold: String(v.reorderThreshold), openingQuantity: '0',
    })))
    setPendingImages([])
  }, [open, productId, detail, categories])

  // Cascade subcategory
  useEffect(() => {
    if (!categoryId) { setSubcategoryId(null); return }
    const valid = new Set(getSubcategoryOptions(categories, categoryId).map((o) => o.value))
    if (subcategoryId && !valid.has(subcategoryId)) setSubcategoryId(null)
  }, [categoryId, subcategoryId, categories])

  async function handleAddImage() {
    const asset = await pickSingleImage()
    if (!asset) return
    setPendingImages((c) => [...c, { uri: asset.uri, mimeType: asset.mimeType }])
  }

  // Upload a single image immediately (for existing products)
  async function handleUploadNow() {
    if (!productId) { handleAddImage(); return }
    try {
      const asset = await pickSingleImage()
      if (!asset) return
      setIsUploading(true)
      const uploadUrl = await generateUploadUrl({})
      const storageId = await uploadSelectedImage(asset as any, uploadUrl)
      await attachMedia({ productId, variantId: null, storageId, caption: null, sortOrder: gallery ? gallery.length : 0 })
      toast.show('Image added')
    } catch (e) {
      toast.show('Upload failed', { message: getErrorMessage(e) })
    } finally {
      setIsUploading(false)
    }
  }

  function updateVariant(index: number, patch: Partial<VariantForm>) {
    setVariants((c) => c.map((v, i) => i === index ? { ...v, ...patch } : v))
  }

  async function handleSave() {
    if (!name.trim()) { toast.show('Name is required'); return }
    if (!categoryId) { toast.show('Select a category'); return }
    if (variants.length === 0) { toast.show('Add at least one variant'); return }

    const payload = {
      name: name.trim(), description: description.trim(), categoryId, subcategoryId, status,
      brandCopy: brandCopy.trim(), notes: notes.trim() || null,
      merchandisingTags: merchandisingTags.split(',').map((t) => t.trim()).filter(Boolean),
      variants: variants.map((v) => ({
        variantId: v.variantId, label: v.label.trim(), barcode: v.barcode.trim() || null,
        attributes: parseAttributes(v.attributesText),
        salePrice: Number(v.salePrice || 0), reorderThreshold: Number(v.reorderThreshold || 0),
        openingQuantity: Number(v.openingQuantity || 0),
      })),
    }

    if (payload.variants.some((v) => !v.label)) { toast.show('Each variant needs a label'); return }

    setIsSaving(true)
    try {
      const result = productId ? await updateProduct({ productId, ...payload }) : await createProduct(payload)

      // Upload all pending images
      for (let i = 0; i < pendingImages.length; i++) {
        const img = pendingImages[i]
        const uploadUrl = await generateUploadUrl({})
        const storageId = await uploadSelectedImage(img as any, uploadUrl)
        await attachMedia({ productId: result.productId, variantId: null, storageId, caption: null, sortOrder: i })
      }

      toast.show(productId ? 'Product updated' : 'Product created', { message: `${result.productCode} is ready.` })
      onOpenChange(false)
    } catch (e) {
      toast.show('Save failed', { message: getErrorMessage(e) })
    } finally {
      setIsSaving(false)
    }
  }

  const existingImages = gallery ?? []
  const firstImageUrl = existingImages.length > 0 ? existingImages[0].url : pendingImages[0]?.uri

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={productId ? 'Edit Product' : 'New Product'}
    >
      <YStack gap="$4" py="$2">
        {/* ═══ Section 1: Core info — 2 column on desktop ═══ */}
        <XStack gap="$4" flexWrap="wrap">
          {/* Left: Image + gallery */}
          <YStack gap="$2" style={{ width: desktop ? 140 : '100%' }} items="center">
            <YStack
              bg="$color2" rounded="$5" overflow="hidden" items="center" justify="center"
              style={{ width: desktop ? 140 : 120, height: desktop ? 140 : 120 }}
            >
              {firstImageUrl ? (
                <Image source={{ uri: firstImageUrl }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
              ) : (
                <YStack items="center" gap="$1">
                  <Camera size={24} color="$color7" />
                  <Paragraph color="$color8" fontSize={9}>No image</Paragraph>
                </YStack>
              )}
            </YStack>

            {/* Thumbnails: existing + pending */}
            <XStack gap="$1" flexWrap="wrap" justify="center">
              {existingImages.map((img: any, i: number) => (
                <YStack key={img._id || i} rounded="$2" overflow="hidden" borderWidth={1} borderColor="$borderColor">
                  <Image source={{ uri: img.url }} style={{ width: 32, height: 32 }} resizeMode="cover" />
                </YStack>
              ))}
              {pendingImages.map((img, i) => (
                <YStack key={`pending-${i}`} rounded="$2" overflow="hidden" borderWidth={1} borderColor="$accentBackground" style={{ position: 'relative' } as any}>
                  <Image source={{ uri: img.uri }} style={{ width: 32, height: 32 }} resizeMode="cover" />
                  <Button
                    size="$1"
                    bg="$color4"
                    borderWidth={0}
                    rounded="$10"
                    onPress={() => setPendingImages((c) => c.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16 } as any}
                  >
                    <X size={8} color="$color10" />
                  </Button>
                </YStack>
              ))}
            </XStack>

            <Button
              size="$2"
              bg="$color3"
              borderColor="$borderColor"
              borderWidth={1}
              hoverStyle={{ bg: '$color4' }}
              icon={<Camera size={12} />}
              onPress={productId ? handleUploadNow : handleAddImage}
              disabled={isUploading}
            >
              {isUploading ? '…' : 'Add Photo'}
            </Button>
          </YStack>

          {/* Right: name + category + status */}
          <YStack flex={1} gap="$2.5" style={{ minWidth: 220 }}>
            <FormField label="Product name *">
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Krishna Mukut, Mala, etc."
                bg="$color3"
                borderWidth={0}
                px="$3"
                autoFocus
              />
            </FormField>

            <XStack gap="$2">
              <YStack flex={1}>
                <SelectionField
                  label="Category *"
                  value={categoryId}
                  placeholder="Select"
                  options={(categories ?? []).map((c) => ({ label: c.name, value: c._id }))}
                  onChange={setCategoryId}
                />
              </YStack>
              <YStack flex={1}>
                <SelectionField
                  label="Subcategory"
                  value={subcategoryId}
                  placeholder="None"
                  options={[{ label: 'None', value: null }, ...getSubcategoryOptions(categories, categoryId)]}
                  onChange={setSubcategoryId}
                />
              </YStack>
            </XStack>

            <XStack gap="$2">
              <YStack flex={1}>
                <FormField label="Tags">
                  <Input value={merchandisingTags} onChangeText={setMerchandisingTags} placeholder="festival, premium" bg="$color3" borderWidth={0} px="$3" fontSize={12} />
                </FormField>
              </YStack>
              <YStack style={{ width: 100 }}>
                <FormField label="Status">
                  <XStack bg="$color2" rounded="$3" p="$0.5" borderWidth={1} borderColor="$borderColor" height={36}>
                    <Button size="$2" flex={1} bg={status === 'active' ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" onPress={() => setStatus('active')}>
                      <Paragraph fontSize={10} fontWeight={status === 'active' ? '700' : '500'} color={status === 'active' ? '$color12' : '$color8'}>Active</Paragraph>
                    </Button>
                    <Button size="$2" flex={1} bg={status === 'archived' ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" onPress={() => setStatus('archived')}>
                      <Paragraph fontSize={10} fontWeight={status === 'archived' ? '700' : '500'} color={status === 'archived' ? '$color12' : '$color8'}>Arch</Paragraph>
                    </Button>
                  </XStack>
                </FormField>
              </YStack>
            </XStack>
          </YStack>
        </XStack>

        {/* ═══ Section 2: Details (collapsible on small screens) ═══ */}
        <XStack gap="$2">
          <YStack flex={1}>
            <FormField label="Description">
              <TextArea value={description} onChangeText={setDescription} placeholder="Material, size, cultural significance…" bg="$color3" borderWidth={0} px="$3" py="$2" style={{ minHeight: 60 }} />
            </FormField>
          </YStack>
          <YStack flex={1}>
            <FormField label="Brand copy">
              <TextArea value={brandCopy} onChangeText={setBrandCopy} placeholder="Branded tagline" bg="$color3" borderWidth={0} px="$3" py="$2" style={{ minHeight: 60 }} />
            </FormField>
          </YStack>
        </XStack>

        {notes || productId ? (
          <FormField label="Internal notes">
            <Input value={notes} onChangeText={setNotes} placeholder="Private notes" bg="$color3" borderWidth={0} px="$3" />
          </FormField>
        ) : null}

        {/* ═══ Section 3: Variants — compact table-like rows ═══ */}
        <YStack gap="$2">
          <XStack justify="space-between" items="center">
            <Paragraph fontSize="$3" fontWeight="800">Variants ({variants.length})</Paragraph>
            <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} icon={<Plus size={12} />} onPress={() => setVariants((c) => [...c, createEmptyVariant()])}>
              Add
            </Button>
          </XStack>

          {variants.map((v, idx) => (
            <YStack key={v.variantId ?? `new-${idx}`} bg="$color2" rounded="$4" p="$3" gap="$2" borderWidth={1} borderColor="$borderColor">
              <XStack gap="$1.5" items="center">
                <Paragraph color="$color8" fontSize={10} fontWeight="600" style={{ width: 14 }}>{idx + 1}</Paragraph>
                {/* Row 1: Label + Price + Barcode inline */}
                <Input
                  flex={2}
                  value={v.label}
                  onChangeText={(val) => updateVariant(idx, { label: val })}
                  placeholder="Label (Red Stone)"
                  bg="$color3"
                  borderWidth={0}
                  px="$2"
                  size="$2.5"
                  fontSize={12}
                />
                <XStack items="center" bg="$color3" rounded="$3" px="$2" flex={1}>
                  <Paragraph color="$color8" fontSize={10}>₹</Paragraph>
                  <Input
                    flex={1}
                    value={v.salePrice}
                    onChangeText={(val) => updateVariant(idx, { salePrice: val })}
                    keyboardType="numeric"
                    placeholder="0"
                    bg="transparent"
                    borderWidth={0}
                    px="$1"
                    fontSize={12}
                    style={{ textAlign: 'right' }}
                    color="$color12"
                  />
                </XStack>
                <Input
                  flex={1}
                  value={v.barcode}
                  onChangeText={(val) => updateVariant(idx, { barcode: val })}
                  placeholder="Barcode"
                  bg="$color3"
                  borderWidth={0}
                  px="$2"
                  size="$2.5"
                  fontSize={12}
                />
                {variants.length > 1 ? (
                  <Button size="$2" bg="transparent" borderWidth={0} p="$1" onPress={() => setVariants((c) => c.filter((_, i) => i !== idx))} pressStyle={{ scale: 0.9 }} hoverStyle={{ bg: '$color3' }}>
                    <Trash2 size={13} color="$color8" />
                  </Button>
                ) : null}
              </XStack>

              {/* Row 2: Threshold + Opening Qty + Attributes */}
              <XStack gap="$1.5" items="flex-end">
                <YStack flex={1}>
                  <Paragraph color="$color8" fontSize={9} mb="$0.5">Reorder thr.</Paragraph>
                  <Input
                    value={v.reorderThreshold}
                    onChangeText={(val) => updateVariant(idx, { reorderThreshold: val })}
                    keyboardType="numeric"
                    placeholder="5"
                    bg="$color3"
                    borderWidth={0}
                    px="$2"
                    size="$2.5"
                    fontSize={12}
                  />
                </YStack>
                <YStack flex={1}>
                  <Paragraph color="$color8" fontSize={9} mb="$0.5">
                    {v.variantId ? 'On hand (read-only)' : 'Opening qty'}
                  </Paragraph>
                  <Input
                    value={v.openingQuantity}
                    onChangeText={(val) => updateVariant(idx, { openingQuantity: val })}
                    keyboardType="numeric"
                    placeholder="0"
                    bg="$color3"
                    borderWidth={0}
                    px="$2"
                    size="$2.5"
                    fontSize={12}
                    disabled={!!v.variantId}
                    opacity={v.variantId ? 0.5 : 1}
                  />
                </YStack>
                <YStack flex={2}>
                  <Paragraph color="$color8" fontSize={9} mb="$0.5">Attributes (Name: Value per line)</Paragraph>
                  <TextArea
                    value={v.attributesText}
                    onChangeText={(val) => updateVariant(idx, { attributesText: val })}
                    placeholder={'Color: Red\nStone: Pearl'}
                    bg="$color3"
                    borderWidth={0}
                    px="$2"
                    py="$1"
                    fontSize={12}
                    style={{ minHeight: 36 }}
                  />
                </YStack>
              </XStack>
            </YStack>
          ))}
        </YStack>

        {/* ═══ Save ═══ */}
        <XStack justify="flex-end" gap="$2">
          <Button bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} onPress={() => onOpenChange(false)} size="$3">
            Cancel
          </Button>
          <Button
            theme="accent"
            size="$3"
            icon={<Save size={14} />}
            onPress={handleSave}
            disabled={isSaving}
            hoverStyle={{ scale: 1.02 }}
            pressStyle={{ scale: 0.97 }}
          >
            {isSaving ? 'Saving…' : productId ? 'Update Product' : 'Create Product'}
          </Button>
        </XStack>
      </YStack>
    </ResponsiveDialog>
  )
}
