import { useEffect, useState } from 'react'
import { Save } from '@tamagui/lucide-icons-2'
import { useMutation, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, TextArea, XStack, YStack } from 'tamagui'
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
              <Input value={name} onChangeText={setName} placeholder="e.g. Krishna Mukut" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
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
                  bg="$color3"
                  borderWidth={0}
                  hoverStyle={{ bg: '$color4' }}
                  focusStyle={{ bg: '$color4' }}
                  px="$4"
          />
        </FormField>

        <FormField label="Brand copy">
          <TextArea
            value={brandCopy}
            onChangeText={setBrandCopy}
            placeholder="Short branded sentence"
            style={{ minHeight: 60 }}
                  bg="$color3"
                  borderWidth={0}
                  hoverStyle={{ bg: '$color4' }}
                  focusStyle={{ bg: '$color4' }}
                  px="$4"
          />
        </FormField>

        <FormField label="Tags" description="Comma separated.">
          <Input value={merchandisingTags} onChangeText={setMerchandisingTags} placeholder="festival, premium, pearl" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
        </FormField>

        <FormField label="Notes">
          <TextArea value={notes} onChangeText={setNotes} placeholder="Internal notes" style={{ minHeight: 60 }} bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
        </FormField>

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
