import { useEffect, useState } from 'react'
import { CreditCard, Minus, Plus, ReceiptText, Search, ShoppingCart, Trash2, X } from '@tamagui/lucide-icons-2'
import { useConvex, useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, Spinner, TextArea, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { getErrorMessage } from 'lib/errors'
import { formatCurrency, formatNumber, paymentMethodLabel } from 'lib/format'
import { buildReceiptHtml, handleReceiptOutput, saleDetailToReceipt } from 'lib/receipt'
import { FormField } from 'components/ui/FormField'
import { PageHeader } from 'components/ui/PageHeader'
import { ProductImage } from 'components/ui/ProductImage'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { SelectionField } from 'components/ui/SelectionField'
import { StatusBadge } from 'components/ui/StatusBadge'
import { SurfaceCard } from 'components/ui/SurfaceCard'
import { useRouter } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'

type CatalogItem = {
  _id: string
  productId: string
  displayCode: string
  productCode: string
  productName: string
  label: string
  optionSummary: string
  barcode: string | null
  salePrice: number
  reorderThreshold: number
  onHand: number
  stockState: 'in_stock' | 'low_stock' | 'out_of_stock'
  mediaUrl?: string | null
}

type CartLine = {
  variantId: string
  productId: string
  productCode: string
  displayCode: string
  productName: string
  variantLabel: string
  quantity: number
  unitPrice: number
  lineDiscount: string
  onHand: number
  mediaUrl?: string | null
}

type SalePreview = {
  lines: Array<{
    variantId: string
    productCode: string
    displayCode: string
    productName: string
    variantLabel: string
    quantity: number
    unitPrice: number
    lineDiscount: number
    orderDiscountAllocation: number
    lineTotal: number
    onHand: number
  }>
  summary: {
    subtotal: number
    lineDiscountTotal: number
    orderDiscount: number
    total: number
    totalQty: number
    itemCount: number
  }
}

function groupCatalogItems(items: CatalogItem[]) {
  const map = new Map<
    string,
    {
      productId: string
      productCode: string
      productName: string
      mediaUrl?: string | null
      variants: CatalogItem[]
      minPrice: number
      maxPrice: number
      totalOnHand: number
      stockState: 'in_stock' | 'low_stock' | 'out_of_stock'
    }
  >()

  for (const item of items) {
    const existing = map.get(item.productId)
    if (!existing) {
      map.set(item.productId, {
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        mediaUrl: item.mediaUrl,
        variants: [item],
        minPrice: item.salePrice,
        maxPrice: item.salePrice,
        totalOnHand: item.onHand,
        stockState: item.stockState,
      })
      continue
    }

    existing.variants.push(item)
    existing.minPrice = Math.min(existing.minPrice, item.salePrice)
    existing.maxPrice = Math.max(existing.maxPrice, item.salePrice)
    existing.totalOnHand += item.onHand
    if (item.stockState === 'out_of_stock') {
      existing.stockState =
        existing.stockState === 'in_stock' ? 'low_stock' : existing.stockState
    }
    if (item.stockState === 'low_stock' && existing.stockState === 'in_stock') {
      existing.stockState = 'low_stock'
    }
  }

  return Array.from(map.values())
}

export function PosScreen() {
  const router = useRouter()
  const media = useMedia()
  const desktop = !media.maxMd
  const toast = useToastController()
  const convex = useConvex()
  const categories = useQuery(convexApi.inventory.listCategories, {
    includeInactive: true,
  }) as CategoryNode[] | undefined
  const createSale = useMutation(convexApi.pos.createSale)

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [orderDiscount, setOrderDiscount] = useState('0')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi_mock'>('cash')
  const [paymentNote, setPaymentNote] = useState('')
  const [notes, setNotes] = useState('')
  const [variantPickerOpen, setVariantPickerOpen] = useState(false)
  const [variantPickerItems, setVariantPickerItems] = useState<CatalogItem[]>([])
  const [preview, setPreview] = useState<SalePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [showUpiDialog, setShowUpiDialog] = useState(false)
  const [upiTimer, setUpiTimer] = useState(300)

  useEffect(() => {
    if (showUpiDialog && upiTimer > 0) {
      const interval = setInterval(() => {
        setUpiTimer((t) => t - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [showUpiDialog, upiTimer])

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

  const { results, status, loadMore } = usePaginatedQuery(
    convexApi.pos.catalogSearch,
    {
      search: search.trim() || null,
      categoryId,
      subcategoryId,
    },
    { initialNumItems: 24 },
  )

  const catalog = (results ?? []) as CatalogItem[]
  const productGroups = groupCatalogItems(catalog)

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      if (cart.length === 0) {
        setPreview({
          lines: [],
          summary: {
            subtotal: 0,
            lineDiscountTotal: 0,
            orderDiscount: 0,
            total: 0,
            totalQty: 0,
            itemCount: 0,
          },
        })
        setPreviewError(null)
        return
      }

      setPreviewLoading(true)
      try {
        const result = (await convex.query(convexApi.pos.previewSale, {
          items: cart.map((line) => ({
            variantId: line.variantId,
            quantity: line.quantity,
            lineDiscount: Number(line.lineDiscount || 0),
          })),
          orderDiscount: Number(orderDiscount || 0),
        })) as SalePreview

        if (!cancelled) {
          setPreview(result)
          setPreviewError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setPreview(null)
          setPreviewError(getErrorMessage(error))
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [cart, orderDiscount, convex])

  function addVariantToCart(item: CatalogItem) {
    setCart((current) => {
      const existing = current.find((line) => line.variantId === item._id)
      if (!existing) {
        return [
          ...current,
          {
            variantId: item._id,
            productId: item.productId,
            productCode: item.productCode,
            displayCode: item.displayCode,
            productName: item.productName,
            variantLabel: item.optionSummary || item.label,
            quantity: 1,
            unitPrice: item.salePrice,
            lineDiscount: '0',
            onHand: item.onHand,
            mediaUrl: item.mediaUrl,
          },
        ]
      }

      if (existing.quantity >= item.onHand) {
        toast.show('Cannot exceed available stock', {
          message: `${item.displayCode} only has ${item.onHand} units available.`,
        })
        return current
      }

      return current.map((line) =>
        line.variantId === item._id ? { ...line, quantity: line.quantity + 1 } : line,
      )
    })
  }

  function updateQuantity(variantId: string, quantity: number) {
    setCart((current) =>
      current
        .map((line) => {
          if (line.variantId !== variantId) {
            return line
          }
          const bounded = Math.max(1, Math.min(quantity, line.onHand))
          return {
            ...line,
            quantity: bounded,
          }
        })
        .filter(Boolean) as CartLine[],
    )
  }

  function removeLine(variantId: string) {
    setCart((current) => current.filter((line) => line.variantId !== variantId))
  }

  async function executeCheckout() {
    setIsSubmitting(true)
    try {
      const result = await createSale({
        items: cart.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
          lineDiscount: Number(line.lineDiscount || 0),
        })),
        orderDiscount: Number(orderDiscount || 0),
        paymentMethod,
        paymentNote: paymentNote.trim() || null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        notes: notes.trim() || null,
      })

      const sale = await convex.query(convexApi.pos.saleDetail, {
        saleId: result.saleId,
      })
      const receipt = saleDetailToReceipt(sale as any)
      if (receipt) {
        await handleReceiptOutput(buildReceiptHtml(receipt), receipt.saleCode)
      }

      toast.show('Sale completed', {
        message: `${result.saleCode} was saved and inventory was updated.`,
      })

      setCart([])
      setOrderDiscount('0')
      setCustomerName('')
      setCustomerPhone('')
      setPaymentMethod('cash')
      setPaymentNote('')
      setNotes('')
      setCartOpen(false)
      setShowUpiDialog(false)
      router.replace(`/sales?saleId=${result.saleId}` as any)
    } catch (error) {
      toast.show('Checkout failed', {
        message: getErrorMessage(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCheckout() {
    if (cart.length === 0) {
      toast.show('Cart is empty')
      return
    }
    if (previewError) {
      toast.show('Resolve checkout issues first', {
        message: previewError,
      })
      return
    }

    if (paymentMethod === 'upi_mock') {
      setUpiTimer(300)
      setShowUpiDialog(true)
      return
    }

    void executeCheckout()
  }

  // ── Cart Panel (shared between desktop inline and mobile sheet) ──
  const cartContent = (
    <YStack gap="$3">
      <XStack justify="space-between" items="center">
        <Paragraph fontSize="$5" fontWeight="800">
          Cart ({cart.length})
        </Paragraph>
        {!desktop && cart.length > 0 ? (
          <Button onPress={() => setCartOpen(false)}>
            <X size={18} color="$color10" />
          </Button>
        ) : null}
      </XStack>

      {cart.length === 0 ? (
        <Paragraph color="$color7" fontSize="$2">Add products from the catalog.</Paragraph>
      ) : (
        <YStack gap="$2">
          {cart.map((line) => {
            const previewLine = preview?.lines.find((item) => item.variantId === line.variantId)
            return (
              <YStack
                key={line.variantId}
                bg="$color3"
                rounded="$4"
                p="$2.5"
                gap="$2"
              >
                <XStack gap="$2.5" items="center">
                  <ProductImage uri={line.mediaUrl} size={40} label={line.productCode} />
                  <YStack flex={1} gap="$0.5">
                    <Paragraph fontSize="$2" fontWeight="700" numberOfLines={1}>
                      {line.productName}
                    </Paragraph>
                    <Paragraph color="$color7" fontSize="$1" numberOfLines={1}>
                      {line.displayCode} · {line.variantLabel}
                    </Paragraph>
                  </YStack>
                  <Paragraph fontSize="$3" fontWeight="800">
                    {previewLine ? formatCurrency(previewLine.lineTotal) : '—'}
                  </Paragraph>
                </XStack>

                <XStack justify="space-between" items="center" gap="$2">
                  {/* Quantity stepper */}
                  <XStack gap="$1" items="center">
                    <Button
                      bg="$color4"
                      rounded="$3"
                      p="$1"
                      onPress={() => updateQuantity(line.variantId, line.quantity - 1)}
                    >
                      <Minus size={14} color="$color10" />
                    </Button>
                    <Paragraph

                      fontWeight="700"
                      fontSize="$3"
                      style={{ minWidth: 28 }}
                      text="center"
                    >
                      {line.quantity}
                    </Paragraph>
                    <Button
                      bg="$color4"
                      rounded="$3"
                      p="$1"
                      onPress={() => updateQuantity(line.variantId, line.quantity + 1)}
                    >
                      <Plus size={14} color="$color10" />
                    </Button>
                  </XStack>

                  <XStack gap="$2" items="center">
                    <Input
                      value={line.lineDiscount}
                      onChangeText={(value) =>
                        setCart((current) =>
                          current.map((item) =>
                            item.variantId === line.variantId
                              ? { ...item, lineDiscount: value }
                              : item,
                          ),
                        )
                      }
                      keyboardType="numeric"
                      placeholder="Disc"
                      size="$2"
                      style={{ width: 60 }}
                      bg="$color3"
                      borderWidth={0}
                      hoverStyle={{ bg: '$color4' }}
                      focusStyle={{ bg: '$color4' }}
                      px="$4"
                    />
                    <Button
                      onPress={() => removeLine(line.variantId)}
                      p="$1"
                    >
                      <Trash2 size={14} color="#FCA5A5" />
                    </Button>
                  </XStack>
                </XStack>
              </YStack>
            )
          })}
        </YStack>
      )}

      {/* Order discount */}
      <FormField label="Order discount">
        <Input
          value={orderDiscount}
          onChangeText={setOrderDiscount}
          keyboardType="numeric"
          placeholder="0"
          size="$3"
          bg="$color3"
          borderWidth={0}
          hoverStyle={{ bg: '$color4' }}
          focusStyle={{ bg: '$color4' }}
          px="$4"
        />
      </FormField>

      {/* Customer & Payment */}
      <XStack gap="$2" flexWrap="wrap">
        <YStack flex={1} gap="$2" style={{ minWidth: 140 }}>
          <FormField label="Customer">
            <Input
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Name (optional)"
              size="$3"
              bg="$color3"
              borderWidth={0}
              hoverStyle={{ bg: '$color4' }}
              focusStyle={{ bg: '$color4' }}
              px="$4"
            />
          </FormField>
          <Input
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="Phone (optional)"
            size="$3"
            bg="$color3"
            borderWidth={0}
            hoverStyle={{ bg: '$color4' }}
            focusStyle={{ bg: '$color4' }}
            px="$4"
            keyboardType="phone-pad"
          />
        </YStack>
        <YStack flex={1} gap="$2" style={{ minWidth: 140 }}>
          <SelectionField
            label="Payment"
            value={paymentMethod}
            placeholder="Select"
            options={[
              { label: 'Cash', value: 'cash' },
              { label: 'UPI (Mock)', value: 'upi_mock' },
            ]}
            onChange={(value) =>
              setPaymentMethod((value as 'cash' | 'upi_mock' | null) ?? 'cash')
            }
          />
          <Input
            value={paymentNote}
            onChangeText={setPaymentNote}
            placeholder={paymentMethod === 'cash' ? 'Note' : 'UPI ref'}
            size="$3"
            bg="$color3"
            borderWidth={0}
            hoverStyle={{ bg: '$color4' }}
            focusStyle={{ bg: '$color4' }}
            px="$4"
          />
        </YStack>
      </XStack>

      {/* Summary */}
      <YStack bg="$color3" rounded="$4" p="$3" gap="$1.5">
        <XStack justify="space-between">
          <Paragraph color="$color10" fontSize="$2">Subtotal</Paragraph>
          <Paragraph color="$color11" fontSize="$2" fontWeight="600">
            {formatCurrency(preview?.summary.subtotal ?? 0)}
          </Paragraph>
        </XStack>
        {(preview?.summary.lineDiscountTotal ?? 0) > 0 ? (
          <XStack justify="space-between">
            <Paragraph color="$color10" fontSize="$2">Line discount</Paragraph>
            <Paragraph color="$color11" fontSize="$2" fontWeight="600">
              -{formatCurrency(preview?.summary.lineDiscountTotal ?? 0)}
            </Paragraph>
          </XStack>
        ) : null}
        {(preview?.summary.orderDiscount ?? 0) > 0 ? (
          <XStack justify="space-between">
            <Paragraph color="$color10" fontSize="$2">Order discount</Paragraph>
            <Paragraph color="$color11" fontSize="$2" fontWeight="600">
              -{formatCurrency(preview?.summary.orderDiscount ?? 0)}
            </Paragraph>
          </XStack>
        ) : null}
        <XStack
          justify="space-between"
          items="center"
          pt="$2"
          borderTopWidth={1}
          borderTopColor="$borderColor"
        >
          <Paragraph fontWeight="800">Payable</Paragraph>
          <Paragraph color="$color8" fontSize="$7" fontWeight="900">
            {formatCurrency(preview?.summary.total ?? 0)}
          </Paragraph>
        </XStack>
      </YStack>

      {previewError ? (
        <YStack bg="#7F1D1D" rounded="$4" p="$3" gap="$1">
          <Paragraph color="#FCA5A5" fontWeight="700" fontSize="$2">Checkout blocked</Paragraph>
          <Paragraph color="#FCA5A5" fontSize="$2">{previewError}</Paragraph>
        </YStack>
      ) : null}

      <Button
        bg="$color8"


        size="$4"
        icon={ReceiptText}
        onPress={handleCheckout}
        disabled={isSubmitting || cart.length === 0 || !!previewError}
        opacity={isSubmitting || cart.length === 0 ? 0.5 : 1}
      >
        {isSubmitting ? 'Processing…' : 'Complete Sale'}
      </Button>
    </YStack>
  )

  return (
    <YStack gap="$4">
      <PageHeader title="Point of Sale" />

      <XStack gap="$4" flexWrap={desktop ? 'nowrap' : 'wrap'}>
        {/* ── Catalog Panel ── */}
        <YStack flex={1} gap="$3" style={{ minWidth: 0 }}>
          {/* Search bar */}
          <XStack gap="$2" items="center">
            <YStack flex={1}>
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder="Search products, codes, barcodes…"
                size="$4"
                bg="$color2"
                borderColor="$borderColor"
                borderWidth={1}
                pl="$4"
              />
            </YStack>
          </XStack>

          {/* Category filters */}
          <XStack gap="$2" flexWrap="wrap">
            <YStack flex={1} style={{ minWidth: 140 }}>
              <SelectionField
                label="Category"
                value={categoryId}
                placeholder="All"
                options={[
                  { label: 'All categories', value: null },
                  ...(categories ?? []).map((c) => ({ label: c.name, value: c._id })),
                ]}
                onChange={setCategoryId}
              />
            </YStack>
            <YStack flex={1} style={{ minWidth: 140 }}>
              <SelectionField
                label="Subcategory"
                value={subcategoryId}
                placeholder="All"
                options={[
                  { label: 'All subcategories', value: null },
                  ...getSubcategoryOptions(categories, categoryId),
                ]}
                onChange={setSubcategoryId}
              />
            </YStack>
          </XStack>

          {/* Product Grid */}
          {status === 'LoadingFirstPage' ? (
            <XStack items="center" gap="$2" py="$4" justify="center">
              <Spinner size="small" />
              <Paragraph color="$color7" fontSize="$2">Loading catalog…</Paragraph>
            </XStack>
          ) : productGroups.length === 0 ? (
            <Paragraph color="$color7" fontSize="$2" py="$4" text="center">
              No products match the current search.
            </Paragraph>
          ) : (
            <XStack gap="$2.5" flexWrap="wrap">
              {productGroups.map((group) => (
                <YStack
                  key={group.productId}
                  bg="$color2"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  p="$2.5"
                  gap="$2"
                  style={{ width: desktop ? 220 : '48%' }}
                  hoverStyle={{ borderColor: '$borderColorHover' }}

                >
                  <XStack gap="$2" items="center">
                    <ProductImage uri={group.mediaUrl} size={44} label={group.productCode} />
                    <YStack flex={1} gap="$0.5">
                      <Paragraph fontSize="$2" fontWeight="700" numberOfLines={1}>
                        {group.productName}
                      </Paragraph>
                      <Paragraph color="$color7" fontSize="$1" numberOfLines={1}>
                        {group.productCode} · {group.variants.length}v
                      </Paragraph>
                    </YStack>
                  </XStack>

                  <XStack justify="space-between" items="center">
                    <Paragraph fontSize="$3" fontWeight="700">
                      {group.minPrice === group.maxPrice
                        ? formatCurrency(group.minPrice)
                        : `${formatCurrency(group.minPrice)}+`}
                    </Paragraph>
                    <StatusBadge status={group.stockState} />
                  </XStack>

                  <Button
                    bg="$color8"


                    size="$2.5"
                    onPress={() => {
                      if (group.variants.length === 1) {
                        addVariantToCart(group.variants[0])
                        return
                      }
                      setVariantPickerItems(group.variants)
                      setVariantPickerOpen(true)
                    }}
                  >
                    {group.variants.length === 1 ? 'Add' : 'Choose'}
                  </Button>
                </YStack>
              ))}
            </XStack>
          )}

          {status === 'CanLoadMore' ? (
            <XStack justify="center" py="$2">
              <Button
                bg="$color3"
                borderColor="$borderColor"
                borderWidth={1}

                size="$3"
                onPress={() => loadMore(24)}
              >
                Load more
              </Button>
            </XStack>
          ) : null}
        </YStack>

        {/* ── Cart Panel (Desktop: inline, Mobile: floating badge + sheet) ── */}
        {desktop ? (
          <YStack style={{ width: 380, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
            <SurfaceCard>{cartContent}</SurfaceCard>
          </YStack>
        ) : null}
      </XStack>

      {/* Mobile: floating cart badge */}
      {!desktop && cart.length > 0 ? (
        <Button
          theme="accent"
          size="$4"
          onPress={() => setCartOpen(true)}
          icon={ShoppingCart}
          style={{ borderRadius: 999, zIndex: 50, position: 'absolute' as any, bottom: 80, right: 16 }}
        >
          {cart.length} · {formatCurrency(preview?.summary.total ?? 0)}
        </Button>
      ) : null}

      {/* Mobile cart sheet */}
      {!desktop ? (
        <ResponsiveDialog
          open={cartOpen}
          onOpenChange={setCartOpen}
          title="Checkout"
        >
          {cartContent}
        </ResponsiveDialog>
      ) : null}

      {/* Variant picker dialog */}
      <ResponsiveDialog
        open={variantPickerOpen}
        onOpenChange={setVariantPickerOpen}
        title="Choose variant"
        description="Select a specific SKU to add to cart."
      >
        <YStack gap="$2" py="$1">
          {variantPickerItems.map((item) => (
            <XStack
              key={item._id}
              bg="$color3"
              rounded="$4"
              p="$3"
              justify="space-between"
              items="center"
              gap="$3"
            >
              <YStack flex={1} gap="$0.5">
                <Paragraph fontWeight="700" fontSize="$3">
                  {item.optionSummary || item.label}
                </Paragraph>
                <Paragraph color="$color7" fontSize="$2">
                  {item.displayCode} · {formatCurrency(item.salePrice)} · {formatNumber(item.onHand)} avail
                </Paragraph>
              </YStack>
              <Button
                bg="$color8"


                size="$3"
                onPress={() => {
                  addVariantToCart(item)
                  setVariantPickerOpen(false)
                }}
              >
                Add
              </Button>
            </XStack>
          ))}
        </YStack>
      </ResponsiveDialog>

      {/* UPI Checkout Dialog */}
      <ResponsiveDialog
        open={showUpiDialog}
        onOpenChange={(open) => {
          setShowUpiDialog(open)
          if (!open) {
            setIsSubmitting(false)
          }
        }}
        title="UPI Payment"
      >
        <YStack gap="$4" py="$2">
          <XStack justify="space-between" items="center" flexWrap="wrap" gap="$4">
            <YStack flex={1} gap="$3" minWidth={200}>
              <SurfaceCard gap="$1.5" p="$3">
                <Paragraph color="$color10" fontSize="$2" fontWeight="600">Scan to Pay</Paragraph>
                <Paragraph color="$color12" fontSize="$5" fontWeight="800">
                  {formatCurrency(preview?.summary.total ?? 0)}
                </Paragraph>
                {customerName ? (
                  <Paragraph color="$color7" fontSize="$2" mt="$1">Customer: {customerName}</Paragraph>
                ) : null}
              </SurfaceCard>

              <YStack gap="$1" items="center">
                <Paragraph color={upiTimer <= 60 ? '#FCA5A5' : '$color11'} fontSize="$4" fontWeight="700" mt="$2">
                  {Math.floor(upiTimer / 60)}:{(upiTimer % 60).toString().padStart(2, '0')}
                </Paragraph>
                <Paragraph color="$color7" fontSize="$2">Expires in</Paragraph>
              </YStack>
            </YStack>

            <YStack items="center" justify="center" p="$2" bg="#FFFFFF" rounded="$4" mx="auto">
               <QRCode
                 value={`upi://pay?pa=yourmerchant@ybl&pn=Honey%20Singh%20POS&am=${(preview?.summary.total ?? 0).toFixed(2)}&tr=POS-WEB&cu=INR`}
                 size={180}
                 color="#000000"
                 backgroundColor="#FFFFFF"
               />
            </YStack>
          </XStack>

          <Button
            theme="accent"
            size="$4"
            disabled={upiTimer <= 0 || isSubmitting}
            onPress={executeCheckout}
            mt="$2"
          >
            {isSubmitting ? 'Processing...' : 'Confirm Payment Received'}
          </Button>
        </YStack>
      </ResponsiveDialog>
    </YStack>
  )
}
