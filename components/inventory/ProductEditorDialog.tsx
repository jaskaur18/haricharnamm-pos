import { AppInput, AppTextArea } from 'components/ui/AppInput'
import { useEffect, useState } from 'react'
import { Image, Alert, Platform } from 'react-native'
import { Plus, Save, Trash2, X, Camera } from '@tamagui/lucide-icons-2'
import { useMutation, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button,  Paragraph, ScrollView, Spinner,  XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { getErrorMessage } from 'lib/errors'
import { hapticMedium, hapticSuccess } from 'lib/haptics'
import { pickSingleImage, uploadSelectedImage } from 'lib/upload'
import { FormField } from 'components/ui/FormField'
import { ProductImage } from 'components/ui/ProductImage'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { SectionCard } from 'components/ui/SectionCard'
import { SelectionField } from 'components/ui/SelectionField'
import { Id } from 'convex/_generated/dataModel'

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
  const detail = useQuery(convexApi.inventory.detail, productId ? { productId: productId as Id<"products"> } : 'skip') as ProductDetail | undefined
  const gallery = useQuery(convexApi.pos.productMediaGallery, productId ? { productId: productId as Id<"products"> } : 'skip') as Array<{ _id: string; url: string }> | undefined
  const createProduct = useMutation(convexApi.inventory.create)
  const updateProduct = useMutation(convexApi.inventory.update)
  const deleteProduct = useMutation(convexApi.inventory.deleteProduct)
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
  const [isDeleting, setIsDeleting] = useState(false)

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
      const storageId = await uploadSelectedImage(asset, uploadUrl)
      await attachMedia({ productId: productId as Id<"products">, variantId: null, storageId: storageId as Id<"_storage">, caption: null, sortOrder: gallery ? gallery.length : 0 })
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

    // Check for duplicate variant labels
    const labels = payload.variants.map(v => v.label.toLowerCase())
    if (new Set(labels).size !== labels.length) {
      toast.show('Variant labels must be unique', { message: 'You have duplicate variant options.' })
      return
    }

    setIsSaving(true)
    try {
      const result = productId ? await updateProduct({ productId: productId as Id<"products">, ...payload } as Parameters<typeof updateProduct>[0]) : await createProduct(payload as Parameters<typeof createProduct>[0])

      // Upload all pending images
      for (let i = 0; i < pendingImages.length; i++) {
        const img = pendingImages[i]
        const uploadUrl = await generateUploadUrl({})
        const storageId = await uploadSelectedImage(img as unknown as import('expo-image-picker').ImagePickerAsset, uploadUrl)
        await attachMedia({ productId: result.productId as Id<"products">, variantId: null, storageId: storageId as Id<"_storage">, caption: null, sortOrder: i })
      }

      hapticSuccess()
      toast.show(productId ? 'Product updated' : 'Product created', { message: `${result.productCode} is ready.` })
      onOpenChange(false)
    } catch (e) {
      toast.show('Save failed', { message: getErrorMessage(e) })
    } finally {
      setIsSaving(false)
    }
  }

  async function executeDelete(force = false) {
    if (!productId) return
    setIsDeleting(true)
    try {
      await deleteProduct({ productId: productId as Id<"products">, force })
      hapticSuccess()
      toast.show(force ? 'Product force-deleted' : 'Product deleted')
      onOpenChange(false)
    } catch (e) {
      const msg = getErrorMessage(e)
      if (msg.includes('Archive it instead')) {
        if (Platform.OS === 'web') {
          const doArchive = window.confirm('This product has sales history.\n\nPress OK to ARCHIVE it safely.\nPress Cancel to see Force Delete options.')
          if (doArchive) {
            await updateProduct({ productId: productId as Id<"products">, status: 'archived' } as any)
            toast.show('Product archived safely.')
            onOpenChange(false)
          } else {
            if (window.confirm('WARNING: Force deleting will leave orphaned sales records. Are you absolutely sure you want to FORCE DELETE?')) {
              await executeDelete(true)
            }
          }
        } else {
          Alert.alert('Sales History Exists', 'This product has been sold. Archive it to preserve history safely, or force delete?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Archive', onPress: async () => {
                await updateProduct({ productId: productId as Id<"products">, status: 'archived' } as any)
                toast.show('Product archived safely.')
                onOpenChange(false)
              }
            },
            { text: 'Force Delete', style: 'destructive', onPress: () => executeDelete(true) }
          ])
        }
      } else {
        toast.show('Delete failed', { message: msg })
      }
    } finally {
      setIsDeleting(false)
    }
  }

  function handleDelete() {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        executeDelete(false)
      }
    } else {
      Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => executeDelete(false) }
      ])
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
        {/* ═══ Section 1: Core info ═══ */}
        <SectionCard p="$4">
          <XStack gap="$4" flexWrap="wrap">
            {/* Left: Image + gallery */}
            <YStack gap="$3" style={{ width: desktop ? 160 : '100%' }} items="center">
              <YStack
                bg="$color2" rounded="$5" overflow="hidden" items="center" justify="center" borderWidth={1} borderColor="$borderColor"
                style={{ width: desktop ? 160 : 120, height: desktop ? 160 : 120 }}
              >
                {firstImageUrl ? (
                  <Image source={{ uri: firstImageUrl }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                ) : (
                  <YStack items="center" gap="$2">
                    <Camera size={32} color="$color7" />
                    <Paragraph color="$color8" fontSize={10} fontWeight="600" textTransform="uppercase">No image</Paragraph>
                  </YStack>
                )}
              </YStack>

              {/* Thumbnails: existing + pending */}
              <XStack gap="$2" flexWrap="wrap" justify="center">
                {existingImages.map((img, i: number) => (
                  <YStack key={img._id || i} rounded="$2" overflow="hidden" borderWidth={1} borderColor="$borderColor">
                    <Image source={{ uri: img.url }} style={{ width: 36, height: 36 }} resizeMode="cover" />
                  </YStack>
                ))}
                {pendingImages.map((img, i) => (
                  <YStack key={`pending-${i}`} rounded="$2" overflow="hidden" borderWidth={1} borderColor="$accentBackground" position="relative">
                    <Image source={{ uri: img.uri }} style={{ width: 36, height: 36 }} resizeMode="cover" />
                    <Button
                      size="$1"
                      bg="$color4"
                      borderWidth={0}
                      rounded="$10"
                      onPress={() => setPendingImages((c) => c.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18 }}
                    >
                      <X size={10} color="$color10" />
                    </Button>
                  </YStack>
                ))}
              </XStack>

              <Button
                size="$3"
                bg="$color3"
                borderColor="$borderColor"
                borderWidth={1}
                hoverStyle={{ bg: '$color4' }}
                icon={<Camera size={14} />}
                onPress={productId ? handleUploadNow : handleAddImage}
                disabled={isUploading}
                width="100%"
              >
                {isUploading ? 'Uploading…' : 'Add Photo'}
              </Button>
            </YStack>

            {/* Right: name + category + status */}
            <YStack flex={1} gap="$3" style={{ minWidth: 260 }}>
              <FormField label="Product name *">
                <AppInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Krishna Mukut, Mala, etc."
                  bg="$color3"
                  borderWidth={1}
                  borderColor="$borderColor"
                  px="$3"
                  autoFocus
                />
              </FormField>

              <XStack gap="$3" flexWrap="wrap">
                <YStack flex={1} style={{ minWidth: 140 }}>
                  <SelectionField
                    label="Category *"
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
                    placeholder="None"
                    options={[{ label: 'None', value: null }, ...getSubcategoryOptions(categories, categoryId)]}
                    onChange={setSubcategoryId}
                  />
                </YStack>
              </XStack>

              <XStack gap="$3" flexWrap="wrap">
                <YStack flex={2} style={{ minWidth: 160 }}>
                  <FormField label="Tags">
                    <AppInput value={merchandisingTags} onChangeText={setMerchandisingTags} placeholder="festival, premium" bg="$color3" borderWidth={1} borderColor="$borderColor" px="$3" />
                  </FormField>
                </YStack>
                <YStack flex={1} style={{ minWidth: 120 }}>
                  <FormField label="Status">
                    <XStack bg="$color3" rounded="$3" p="$0.5" borderWidth={1} borderColor="$borderColor" height={42}>
                      <Button size="$3" flex={1} bg={status === 'active' ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" onPress={() => setStatus('active')}>
                        <Paragraph fontSize={12} fontWeight={status === 'active' ? '800' : '600'} color={status === 'active' ? '$color12' : '$color8'}>Active</Paragraph>
                      </Button>
                      <Button size="$3" flex={1} bg={status === 'archived' ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" onPress={() => setStatus('archived')}>
                        <Paragraph fontSize={12} fontWeight={status === 'archived' ? '800' : '600'} color={status === 'archived' ? '$color12' : '$color8'}>Arch</Paragraph>
                      </Button>
                    </XStack>
                  </FormField>
                </YStack>
              </XStack>
            </YStack>
          </XStack>
        </SectionCard>

        {/* ═══ Section 2: Details ═══ */}
        <SectionCard p="$4">
          <XStack gap="$4" flexWrap="wrap">
            <YStack flex={1} style={{ minWidth: 260 }}>
              <FormField label="Description">
                <AppTextArea value={description} onChangeText={setDescription} placeholder="Material, size, cultural significance…" bg="$color3" borderWidth={1} borderColor="$borderColor" px="$3" py="$2" style={{ minHeight: 80 }} />
              </FormField>
            </YStack>
            <YStack flex={1} style={{ minWidth: 260 }}>
              <FormField label="Brand copy">
                <AppTextArea value={brandCopy} onChangeText={setBrandCopy} placeholder="Branded tagline" bg="$color3" borderWidth={1} borderColor="$borderColor" px="$3" py="$2" style={{ minHeight: 80 }} />
              </FormField>
            </YStack>
          </XStack>

          {notes || productId ? (
            <YStack mt="$3">
              <FormField label="Internal notes">
                <AppInput value={notes} onChangeText={setNotes} placeholder="Private notes" bg="$color3" borderWidth={1} borderColor="$borderColor" px="$3" />
              </FormField>
            </YStack>
          ) : null}
        </SectionCard>

        {/* ═══ Section 3: Variants ═══ */}
        <SectionCard p="$4" gap="$3">
          <XStack justify="space-between" items="center">
            <Paragraph fontSize="$5" fontWeight="900" letterSpacing={-0.5}>Variants ({variants.length})</Paragraph>
            <Button size="$3" theme="accent" icon={<Plus size={16} />} onPress={() => setVariants((c) => [...c, createEmptyVariant()])}>
              Add Variant
            </Button>
          </XStack>

          <YStack gap="$3">
            {variants.map((v, idx) => (
              <YStack key={v.variantId ?? `new-${idx}`} bg="$color2" rounded="$4" p="$3" gap="$3" borderWidth={1} borderColor="$borderColor" position="relative">
                {variants.length > 1 ? (
                  <Button size="$2" bg="$color3" borderWidth={1} borderColor="$borderColor" position="absolute" t={-8} r={-8} p="$1.5" rounded="$12" z={10} onPress={() => setVariants((c) => c.filter((_, i) => i !== idx))} hoverStyle={{ bg: '$dangerSoft' }}>
                    <Trash2 size={14} color="$color10" />
                  </Button>
                ) : null}

                <XStack gap="$3" flexWrap="wrap" items="flex-start">
                  <YStack flex={2} style={{ minWidth: 160 }}>
                    <FormField label={`Variant ${idx + 1} Label`}>
                      <AppInput
                        value={v.label}
                        onChangeText={(val) => updateVariant(idx, { label: val })}
                        placeholder="E.g. Large Red"
                        bg="$color3"
                        borderWidth={1}
                        borderColor="$borderColor"
                        px="$3"
                      />
                    </FormField>
                  </YStack>
                  <YStack flex={1} style={{ minWidth: 120 }}>
                    <FormField label="Sale Price">
                      <XStack items="center" bg="$color3" rounded="$3" borderWidth={1} borderColor="$borderColor" px="$3" height={44}>
                        <Paragraph color="$color8" fontSize="$3" fontWeight="600">₹</Paragraph>
                        <AppInput
                          flex={1}
                          value={v.salePrice}
                          onChangeText={(val) => updateVariant(idx, { salePrice: val })}
                          keyboardType="numeric"
                          placeholder="0"
                          bg="transparent"
                          borderWidth={0}
                          px="$2"
                          color="$color12"
                        />
                      </XStack>
                    </FormField>
                  </YStack>
                  <YStack flex={1} style={{ minWidth: 140 }}>
                    <FormField label="Barcode">
                      <AppInput
                        value={v.barcode}
                        onChangeText={(val) => updateVariant(idx, { barcode: val })}
                        placeholder="Scan or type"
                        bg="$color3"
                        borderWidth={1}
                        borderColor="$borderColor"
                        px="$3"
                      />
                    </FormField>
                  </YStack>
                </XStack>

                <XStack gap="$3" flexWrap="wrap" items="flex-start">
                  <YStack flex={1} style={{ minWidth: 120 }}>
                    <FormField label="Reorder Thr.">
                      <AppInput
                        value={v.reorderThreshold}
                        onChangeText={(val) => updateVariant(idx, { reorderThreshold: val })}
                        keyboardType="numeric"
                        placeholder="5"
                        bg="$color3"
                        borderWidth={1}
                        borderColor="$borderColor"
                        px="$3"
                      />
                    </FormField>
                  </YStack>
                  <YStack flex={1} style={{ minWidth: 120 }}>
                    <FormField label={v.variantId ? 'On Hand' : 'Opening Qty'}>
                      <AppInput
                        value={v.openingQuantity}
                        onChangeText={(val) => updateVariant(idx, { openingQuantity: val })}
                        keyboardType="numeric"
                        placeholder="0"
                        bg="$color3"
                        borderWidth={1}
                        borderColor="$borderColor"
                        px="$3"
                        disabled={!!v.variantId}
                        opacity={v.variantId ? 0.6 : 1}
                      />
                    </FormField>
                  </YStack>
                  <YStack flex={2} style={{ minWidth: 200 }}>
                    <FormField label="Attributes (One per line: 'Name: Value')">
                      <AppTextArea
                        value={v.attributesText}
                        onChangeText={(val) => updateVariant(idx, { attributesText: val })}
                        placeholder={'Color: Red\nMaterial: Pearl'}
                        bg="$color3"
                        borderWidth={1}
                        borderColor="$borderColor"
                        px="$3"
                        py="$2"
                        style={{ minHeight: 44 }}
                      />
                    </FormField>
                  </YStack>
                </XStack>
              </YStack>
            ))}
          </YStack>
        </SectionCard>

        {/* ═══ Save ═══ */}
        <XStack justify="space-between" items="center">
          <XStack>
            {productId ? (
              <Button
                size="$3"
                icon={<Trash2 size={14} />}
                onPress={handleDelete}
                disabled={isDeleting || isSaving}
                hoverStyle={{ bg: '$red5' }}
                bg="$color2"
                borderWidth={1}
                borderColor="$red8"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            ) : <YStack />}
          </XStack>
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
        </XStack>
      </YStack>
    </ResponsiveDialog>
  )
}
