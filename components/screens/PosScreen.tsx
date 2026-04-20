import { useEffect, useState } from 'react'
import { Minus, Plus, ReceiptText, Search, ShoppingCart, Trash2, X } from '@tamagui/lucide-icons-2'
import { useConvex, useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, ScrollView, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { getErrorMessage } from 'lib/errors'
import { formatCurrency, formatNumber } from 'lib/format'
import { buildReceiptHtml, handleReceiptOutput, saleDetailToReceipt } from 'lib/receipt'
import { ProductImage } from 'components/ui/ProductImage'
import { ProductShowcaseDialog } from 'components/ui/ProductShowcaseDialog'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { SelectionField } from 'components/ui/SelectionField'
import { StatusBadge } from 'components/ui/StatusBadge'
import { useRouter } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'

/* ─── Types ─── */

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

type ProductGroup = {
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

/* ─── Helpers ─── */

function groupCatalogItems(items: CatalogItem[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>()

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
      existing.stockState = existing.stockState === 'in_stock' ? 'low_stock' : existing.stockState
    }
    if (item.stockState === 'low_stock' && existing.stockState === 'in_stock') {
      existing.stockState = 'low_stock'
    }
  }
  return Array.from(map.values())
}

/* ProductShowcaseDialog is now imported from components/ui/ProductShowcaseDialog */

/* ═══════════════════════════════════════════════════════════════════
   POS SCREEN — True split-pane layout
   Left:  scrollable product catalog (fills remaining width)
   Right: fixed-height checkout terminal (400px wide, pinned)
   ═══════════════════════════════════════════════════════════════════ */

export function PosScreen() {
  const router = useRouter()
  const media = useMedia()
  const desktop = !media.maxMd
  const toast = useToastController()
  const convex = useConvex()
  const categories = useQuery(convexApi.inventory.listCategories, { includeInactive: true }) as CategoryNode[] | undefined
  const createSale = useMutation(convexApi.pos.createSale)

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [orderDiscount, setOrderDiscount] = useState('0')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [detailsProductId, setDetailsProductId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi_mock'>('cash')
  const [paymentNote, setPaymentNote] = useState('')
  const [notes, setNotes] = useState('')
  const [variantPickerOpen, setVariantPickerOpen] = useState(false)
  const [variantPickerItems, setVariantPickerItems] = useState<CatalogItem[]>([])
  const [preview, setPreview] = useState<SalePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [showUpiDialog, setShowUpiDialog] = useState(false)
  const [upiTimer, setUpiTimer] = useState(300)

  // UPI timer
  useEffect(() => {
    if (showUpiDialog && upiTimer > 0) {
      const iv = setInterval(() => setUpiTimer((t) => t - 1), 1000)
      return () => clearInterval(iv)
    }
  }, [showUpiDialog, upiTimer])

  // Cascade subcategory on category change
  useEffect(() => {
    if (!categoryId) { setSubcategoryId(null); return }
    const valid = new Set(getSubcategoryOptions(categories, categoryId).map((o) => o.value))
    if (subcategoryId && !valid.has(subcategoryId)) setSubcategoryId(null)
  }, [categoryId, subcategoryId, categories])

  // Catalog query
  const { results, status, loadMore } = usePaginatedQuery(
    convexApi.pos.catalogSearch,
    { search: search.trim() || null, categoryId, subcategoryId },
    { initialNumItems: 24 },
  )
  const catalog = (results ?? []) as CatalogItem[]
  const productGroups = groupCatalogItems(catalog)

  // Live preview
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cart.length === 0) {
        setPreview({ lines: [], summary: { subtotal: 0, lineDiscountTotal: 0, orderDiscount: 0, total: 0, totalQty: 0, itemCount: 0 } })
        setPreviewError(null)
        return
      }
      try {
        const r = (await convex.query(convexApi.pos.previewSale, {
          items: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity, lineDiscount: Number(l.lineDiscount || 0) })),
          orderDiscount: Number(orderDiscount || 0),
        })) as SalePreview
        if (!cancelled) { setPreview(r); setPreviewError(null) }
      } catch (e) {
        if (!cancelled) { setPreview(null); setPreviewError(getErrorMessage(e)) }
      }
    }
    void run()
    return () => { cancelled = true }
  }, [cart, orderDiscount, convex])

  function addVariantToCart(item: CatalogItem) {
    setCart((c) => {
      const ex = c.find((l) => l.variantId === item._id)
      if (!ex) return [...c, { variantId: item._id, productId: item.productId, productCode: item.productCode, displayCode: item.displayCode, productName: item.productName, variantLabel: item.optionSummary || item.label, quantity: 1, unitPrice: item.salePrice, lineDiscount: '0', onHand: item.onHand, mediaUrl: item.mediaUrl }]
      if (ex.quantity >= item.onHand) { toast.show('Max stock reached'); return c }
      return c.map((l) => l.variantId === item._id ? { ...l, quantity: l.quantity + 1 } : l)
    })
  }

  function updateQty(variantId: string, qty: number) {
    setCart((c) => c.map((l) => l.variantId !== variantId ? l : { ...l, quantity: Math.max(1, Math.min(qty, l.onHand)) }))
  }

  function removeLine(variantId: string) {
    setCart((c) => c.filter((l) => l.variantId !== variantId))
  }

  async function executeCheckout() {
    setIsSubmitting(true)
    try {
      const result = await createSale({
        items: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity, lineDiscount: Number(l.lineDiscount || 0) })),
        orderDiscount: Number(orderDiscount || 0),
        paymentMethod,
        paymentNote: paymentNote.trim() || null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        notes: notes.trim() || null,
      })
      const sale = await convex.query(convexApi.pos.saleDetail, { saleId: result.saleId })
      const receipt = saleDetailToReceipt(sale as any)
      if (receipt) await handleReceiptOutput(buildReceiptHtml(receipt), receipt.saleCode)
      toast.show('Sale completed', { message: `${result.saleCode} saved.` })
      setCart([]); setOrderDiscount('0'); setCustomerName(''); setCustomerPhone(''); setPaymentMethod('cash'); setPaymentNote(''); setNotes(''); setCartOpen(false); setShowUpiDialog(false)
      router.replace(`/sales?saleId=${result.saleId}` as any)
    } catch (e) {
      toast.show('Checkout failed', { message: getErrorMessage(e) })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCheckout() {
    if (cart.length === 0) { toast.show('Cart is empty'); return }
    if (previewError) { toast.show('Fix errors first', { message: previewError }); return }
    if (paymentMethod === 'upi_mock') { setUpiTimer(300); setShowUpiDialog(true); return }
    void executeCheckout()
  }

  /* ── Checkout Terminal widget (used in both desktop inline + mobile sheet) ── */
  const checkoutTerminal = (
    <YStack gap="$4" flex={1}>
      {/* Cart header */}
      <XStack justify="space-between" items="center">
        <XStack items="center" gap="$2">
          <ShoppingCart size={18} color="$color10" />
          <Paragraph fontSize="$5" fontWeight="800">
            Cart
          </Paragraph>
          {cart.length > 0 ? (
            <YStack bg="$accentBackground" rounded="$10" px="$2" py="$0.25">
              <Paragraph color="$accentColor" fontSize={11} fontWeight="800">{cart.length}</Paragraph>
            </YStack>
          ) : null}
        </XStack>
        {!desktop ? (
          <Button size="$2" bg="transparent" borderWidth={0} onPress={() => setCartOpen(false)} p="$2" hoverStyle={{ bg: '$color3' }}><X size={18} color="$color10" /></Button>
        ) : null}
      </XStack>

      {/* Cart items */}
      {cart.length === 0 ? (
        <YStack flex={1} items="center" justify="center" gap="$2" py="$6">
          <YStack bg="$color3" rounded="$10" p="$4">
            <ShoppingCart size={32} color="$color7" />
          </YStack>
          <Paragraph color="$color8" fontSize="$2">Tap products to add them here</Paragraph>
        </YStack>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <YStack gap="$2">
            {cart.map((line) => {
              const pl = preview?.lines.find((p) => p.variantId === line.variantId)
              return (
                <YStack key={line.variantId} bg="$color2" rounded="$4" p="$3" gap="$2.5" borderWidth={1} borderColor="$borderColor">
                  {/* Product info row */}
                  <XStack gap="$2" items="center">
                    <ProductImage uri={line.mediaUrl} size={40} label={line.productCode} />
                    <YStack flex={1} gap="$0.5">
                      <Paragraph fontSize="$2" fontWeight="700" numberOfLines={1}>{line.productName}</Paragraph>
                      <Paragraph color="$color8" fontSize={10}>{line.displayCode} · {line.variantLabel}</Paragraph>
                    </YStack>
                    <YStack items="flex-end">
                      <Paragraph fontSize="$3" fontWeight="800">{pl ? formatCurrency(pl.lineTotal) : '—'}</Paragraph>
                      <Paragraph color="$color8" fontSize={10}>@{formatCurrency(line.unitPrice)}</Paragraph>
                    </YStack>
                  </XStack>

                  {/* Controls row */}
                  <XStack justify="space-between" items="center">
                    {/* Qty stepper */}
                    <XStack items="center" bg="$color3" rounded="$3" overflow="hidden">
                      <Button size="$2" bg="$color3" borderWidth={0} px="$2" py="$1.5" onPress={() => updateQty(line.variantId, line.quantity - 1)} pressStyle={{ bg: '$color4' }}>
                        <Minus size={14} color="$color10" />
                      </Button>
                      <Paragraph fontWeight="800" fontSize="$3" style={{ minWidth: 30, textAlign: 'center' }}>{line.quantity}</Paragraph>
                      <Button size="$2" bg="$color3" borderWidth={0} px="$2" py="$1.5" onPress={() => updateQty(line.variantId, line.quantity + 1)} pressStyle={{ bg: '$color4' }}>
                        <Plus size={14} color="$color10" />
                      </Button>
                    </XStack>

                    <XStack gap="$2" items="center">
                      {/* Line discount */}
                      <XStack items="center" bg="$color3" rounded="$3" px="$2" height={32}>
                        <Paragraph color="$color8" fontSize={11} mr="$1">₹</Paragraph>
                        <Input
                          value={line.lineDiscount}
                          onChangeText={(v) => setCart((c) => c.map((l) => l.variantId === line.variantId ? { ...l, lineDiscount: v } : l))}
                          keyboardType="numeric"
                          placeholder="0"
                          style={{ width: 36, textAlign: 'right' }}
                          bg="transparent"
                          borderWidth={0}
                          fontSize={12}
                          color="$color12"
                        />
                      </XStack>
                      {/* Delete */}
                      <Button size="$2" bg="transparent" borderWidth={0} p="$1.5" onPress={() => removeLine(line.variantId)} pressStyle={{ scale: 0.9 }} hoverStyle={{ bg: '$color3' }}>
                        <Trash2 size={14} color="$color8" />
                      </Button>
                    </XStack>
                  </XStack>
                </YStack>
              )
            })}
          </YStack>
        </ScrollView>
      )}

      {/* ── Checkout form (always at bottom) ── */}
      <YStack gap="$3" borderTopWidth={1} borderTopColor="$borderColor" pt="$3">
        {/* Order discount */}
        <XStack items="center" gap="$2">
          <Paragraph fontSize={11} color="$color9" fontWeight="600" style={{ width: 90 }}>Order disc.</Paragraph>
          <XStack flex={1} items="center" bg="$color3" rounded="$3" px="$2" height={32}>
            <Paragraph color="$color8" fontSize={11} mr="$1">₹</Paragraph>
            <Input value={orderDiscount} onChangeText={setOrderDiscount} keyboardType="numeric" placeholder="0" flex={1} bg="transparent" borderWidth={0} fontSize={12} color="$color12" />
          </XStack>
        </XStack>

        {/* Customer */}
        <XStack gap="$2">
          <Input flex={1} value={customerName} onChangeText={setCustomerName} placeholder="Customer name" size="$2.5" bg="$color3" borderWidth={0} px="$3" />
          <Input flex={1} value={customerPhone} onChangeText={setCustomerPhone} placeholder="Phone" size="$2.5" bg="$color3" borderWidth={0} px="$3" keyboardType="phone-pad" />
        </XStack>

        {/* Payment method — toggle pills */}
        <XStack bg="$color2" rounded="$3" p="$0.5" borderWidth={1} borderColor="$borderColor">
          <Button flex={1} size="$2.5" bg={paymentMethod === 'cash' ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" onPress={() => setPaymentMethod('cash')} pressStyle={{ scale: 0.97 }}>
            <Paragraph fontSize={12} fontWeight={paymentMethod === 'cash' ? '700' : '500'} color={paymentMethod === 'cash' ? '$color12' : '$color8'}>
              💵 Cash
            </Paragraph>
          </Button>
          <Button flex={1} size="$2.5" bg={paymentMethod === 'upi_mock' ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" onPress={() => setPaymentMethod('upi_mock')} pressStyle={{ scale: 0.97 }}>
            <Paragraph fontSize={12} fontWeight={paymentMethod === 'upi_mock' ? '700' : '500'} color={paymentMethod === 'upi_mock' ? '$color12' : '$color8'}>
              📱 UPI
            </Paragraph>
          </Button>
        </XStack>

        {/* Summary */}
        <YStack bg="$color2" rounded="$4" p="$3" gap="$1.5" borderWidth={1} borderColor="$borderColor">
          <XStack justify="space-between">
            <Paragraph color="$color8" fontSize={12}>Subtotal</Paragraph>
            <Paragraph color="$color11" fontSize={12} fontWeight="600">{formatCurrency(preview?.summary.subtotal ?? 0)}</Paragraph>
          </XStack>
          {(preview?.summary.lineDiscountTotal ?? 0) > 0 ? (
            <XStack justify="space-between">
              <Paragraph color="$color8" fontSize={12}>Discounts</Paragraph>
              <Paragraph color="$color8" fontSize={12}>-{formatCurrency((preview?.summary.lineDiscountTotal ?? 0) + (preview?.summary.orderDiscount ?? 0))}</Paragraph>
            </XStack>
          ) : null}
          <XStack justify="space-between" pt="$2" mt="$1" borderTopWidth={1} borderTopColor="$borderColor">
            <Paragraph fontWeight="800" fontSize="$4">TOTAL</Paragraph>
            <Paragraph fontWeight="900" fontSize="$6" color="$accentBackground">{formatCurrency(preview?.summary.total ?? 0)}</Paragraph>
          </XStack>
        </YStack>

        {previewError ? (
          <YStack bg="$red3" rounded="$3" p="$2.5">
            <Paragraph color="$red10" fontWeight="700" fontSize={11}>{previewError}</Paragraph>
          </YStack>
        ) : null}

        <Button
          theme="accent"
          size="$5"
          icon={<ReceiptText size={18} />}
          onPress={handleCheckout}
          disabled={isSubmitting || cart.length === 0 || !!previewError}
          opacity={isSubmitting || cart.length === 0 ? 0.4 : 1}
          hoverStyle={{ scale: 1.02 }}
          pressStyle={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Processing…' : 'Complete Sale'}
        </Button>
      </YStack>
    </YStack>
  )

  return (
    <YStack flex={1} style={{ margin: desktop ? -28 : -16, marginTop: desktop ? -20 : -16 } as any}>
      {/* ═══ DESKTOP: Full-bleed 2-pane layout ═══ */}
      {desktop ? (
        <XStack flex={1} style={{ height: 'calc(100vh - 56px)' } as any}>
          {/* ── LEFT: Scrollable product catalog ── */}
          <YStack flex={1} style={{ overflow: 'hidden' } as any}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 40 } as any}>
              {/* Search */}
              <XStack items="center" gap="$2" bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$4" px="$3" mb="$3">
                <Search size={16} color="$color8" />
                <Input
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search products, codes, scan barcode…"
                  flex={1}
                  bg="transparent"
                  borderWidth={0}
                  py="$2.5"
                  fontSize="$3"
                  placeholderTextColor="$color7"
                  color="$color12"
                />
                {search ? (
                  <Button size="$2" bg="transparent" borderWidth={0} onPress={() => setSearch('')} p="$1" hoverStyle={{ bg: '$color3' }}><X size={14} color="$color8" /></Button>
                ) : null}
              </XStack>

              {/* Category filters */}
              <XStack gap="$2" mb="$4">
                <YStack flex={1}>
                  <SelectionField label="Category" value={categoryId} placeholder="All" options={[{ label: 'All categories', value: null }, ...(categories ?? []).map((c) => ({ label: c.name, value: c._id }))]} onChange={setCategoryId} />
                </YStack>
                <YStack flex={1}>
                  <SelectionField label="Subcategory" value={subcategoryId} placeholder="All" options={[{ label: 'All', value: null }, ...getSubcategoryOptions(categories, categoryId)]} onChange={setSubcategoryId} />
                </YStack>
              </XStack>

              {/* Product grid */}
              {status === 'LoadingFirstPage' ? (
                <XStack items="center" gap="$2" py="$8" justify="center">
                  <Spinner size="small" />
                  <Paragraph color="$color8" fontSize="$2">Loading catalog…</Paragraph>
                </XStack>
              ) : productGroups.length === 0 ? (
                <YStack items="center" py="$8" gap="$2">
                  <Paragraph color="$color8" fontSize="$3">No products match your search.</Paragraph>
                </YStack>
              ) : (
                <XStack gap="$3" flexWrap="wrap">
                  {productGroups.map((g) => {
                    const isOOS = g.stockState === 'out_of_stock'
                    return (
                      <YStack
                        key={g.productId}
                        bg={isOOS ? '$color1' : '$color2'}
                        borderWidth={1}
                        borderColor={isOOS ? '$borderColor' : '$borderColor'}
                        rounded="$5"
                        p="$3"
                        gap="$2.5"
                        opacity={isOOS ? 0.5 : 1}
                        style={{ width: 240 }}
                        hoverStyle={isOOS ? {} : { borderColor: '$color6', bg: '$color3', scale: 1.02 }}
                        pressStyle={isOOS ? {} : { scale: 0.98 }}
                        onPress={() => setDetailsProductId(g.productId)}
                        cursor="pointer"
                      >
                        <XStack gap="$2.5" items="center">
                          <ProductImage uri={g.mediaUrl} size={48} label={g.productCode} />
                          <YStack flex={1} gap="$0.5">
                            <Paragraph fontSize="$3" fontWeight="700" numberOfLines={1}>{g.productName}</Paragraph>
                            <Paragraph color="$color8" fontSize={10} numberOfLines={1}>{g.productCode} · {g.variants.length} variant{g.variants.length > 1 ? 's' : ''}</Paragraph>
                          </YStack>
                        </XStack>

                        <XStack justify="space-between" items="center">
                          <Paragraph fontSize="$4" fontWeight="800">
                            {g.minPrice === g.maxPrice ? formatCurrency(g.minPrice) : `${formatCurrency(g.minPrice)}+`}
                          </Paragraph>
                          <StatusBadge status={g.stockState} />
                        </XStack>

                        <Button
                          theme={isOOS ? undefined : 'accent'}
                          bg={isOOS ? '$color3' : undefined}
                          size="$3"
                          disabled={isOOS}
                          onPress={(e) => {
                            e.stopPropagation()
                            if (isOOS) return
                            if (g.variants.length === 1) { addVariantToCart(g.variants[0]); return }
                            setVariantPickerItems(g.variants)
                            setVariantPickerOpen(true)
                          }}
                          pressStyle={isOOS ? {} : { scale: 0.95 }}
                        >
                          {isOOS ? 'Out of Stock' : g.variants.length === 1 ? 'Add to Cart' : `Choose (${g.variants.length})`}
                        </Button>
                      </YStack>
                    )
                  })}
                </XStack>
              )}

              {status === 'CanLoadMore' ? (
                <XStack justify="center" py="$4" mt="$2">
                  <Button bg="$color3" borderColor="$borderColor" borderWidth={1} size="$3" onPress={() => loadMore(24)}>Load more</Button>
                </XStack>
              ) : null}
            </ScrollView>
          </YStack>

          {/* ── RIGHT: Fixed checkout terminal ── */}
          <YStack
            style={{ width: 400, borderLeftWidth: 1, borderLeftColor: 'var(--borderColor)' } as any}
            bg="$color1"
            p="$4"
          >
            {checkoutTerminal}
          </YStack>
        </XStack>
      ) : (
        /* ═══ MOBILE: Single column ═══ */
        <YStack flex={1} p="$4" gap="$3">
          {/* Search */}
          <XStack items="center" gap="$2" bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$4" px="$3">
            <Search size={16} color="$color8" />
            <Input value={search} onChangeText={setSearch} placeholder="Search…" flex={1} bg="transparent" borderWidth={0} py="$2" fontSize="$3" color="$color12" />
          </XStack>

          {/* Filters */}
          <XStack gap="$2">
            <YStack flex={1}>
              <SelectionField label="Category" value={categoryId} placeholder="All" options={[{ label: 'All', value: null }, ...(categories ?? []).map((c) => ({ label: c.name, value: c._id }))]} onChange={setCategoryId} />
            </YStack>
            <YStack flex={1}>
              <SelectionField label="Sub" value={subcategoryId} placeholder="All" options={[{ label: 'All', value: null }, ...getSubcategoryOptions(categories, categoryId)]} onChange={setSubcategoryId} />
            </YStack>
          </XStack>

          {/* Grid */}
          {status === 'LoadingFirstPage' ? (
            <XStack items="center" gap="$2" py="$6" justify="center"><Spinner size="small" /></XStack>
          ) : (
            <XStack gap="$2.5" flexWrap="wrap">
              {productGroups.map((g) => {
                const isOOS = g.stockState === 'out_of_stock'
                return (
                  <YStack key={g.productId} bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$4" p="$2.5" gap="$2" opacity={isOOS ? 0.5 : 1} style={{ width: '48%' }} onPress={() => setDetailsProductId(g.productId)} cursor="pointer">
                    <XStack gap="$2" items="center">
                      <ProductImage uri={g.mediaUrl} size={36} label={g.productCode} />
                      <YStack flex={1}>
                        <Paragraph fontSize="$2" fontWeight="700" numberOfLines={1}>{g.productName}</Paragraph>
                        <Paragraph color="$color8" fontSize={9}>{g.variants.length}v · {formatNumber(g.totalOnHand)}</Paragraph>
                      </YStack>
                    </XStack>
                    <XStack justify="space-between" items="center">
                      <Paragraph fontSize="$3" fontWeight="700">{formatCurrency(g.minPrice)}</Paragraph>
                      <StatusBadge status={g.stockState} />
                    </XStack>
                    <Button theme={isOOS ? undefined : 'accent'} bg={isOOS ? '$color3' : undefined} size="$2.5" disabled={isOOS} onPress={(e) => { e.stopPropagation(); if (!isOOS) { if (g.variants.length === 1) addVariantToCart(g.variants[0]); else { setVariantPickerItems(g.variants); setVariantPickerOpen(true) } } }}>
                      {isOOS ? 'OOS' : g.variants.length === 1 ? 'Add' : 'Choose'}
                    </Button>
                  </YStack>
                )
              })}
            </XStack>
          )}

          {status === 'CanLoadMore' ? (
            <XStack justify="center" py="$2">
              <Button bg="$color3" borderColor="$borderColor" borderWidth={1} size="$3" onPress={() => loadMore(24)}>More</Button>
            </XStack>
          ) : null}
        </YStack>
      )}

      {/* Mobile: floating cart badge */}
      {!desktop && cart.length > 0 ? (
        <Button theme="accent" size="$4" onPress={() => setCartOpen(true)} icon={ShoppingCart} style={{ borderRadius: 999, zIndex: 50, position: 'fixed' as any, bottom: 80, right: 16 } as any}>
          {cart.length} · {formatCurrency(preview?.summary.total ?? 0)}
        </Button>
      ) : null}

      {/* Mobile cart sheet */}
      {!desktop ? (
        <ResponsiveDialog open={cartOpen} onOpenChange={setCartOpen} title="Checkout">
          {checkoutTerminal}
        </ResponsiveDialog>
      ) : null}

      {/* Variant picker */}
      <ResponsiveDialog open={variantPickerOpen} onOpenChange={setVariantPickerOpen} title="Choose variant" description="Select a variant to add.">
        <YStack gap="$2" py="$1">
          {variantPickerItems.map((item) => (
            <XStack key={item._id} bg="$color3" rounded="$4" p="$3" justify="space-between" items="center" gap="$3" hoverStyle={{ bg: '$color4' }}>
              <YStack flex={1} gap="$0.5">
                <Paragraph fontWeight="700" fontSize="$3">{item.optionSummary || item.label}</Paragraph>
                <Paragraph color="$color8" fontSize="$2">{item.displayCode} · {formatCurrency(item.salePrice)} · {formatNumber(item.onHand)} avail</Paragraph>
              </YStack>
              <Button theme={item.stockState === 'out_of_stock' ? undefined : 'accent'} disabled={item.stockState === 'out_of_stock'} size="$3" onPress={() => { addVariantToCart(item); setVariantPickerOpen(false) }}>
                {item.stockState === 'out_of_stock' ? 'OOS' : 'Add'}
              </Button>
            </XStack>
          ))}
        </YStack>
      </ResponsiveDialog>

      {/* UPI Dialog */}
      <ResponsiveDialog open={showUpiDialog} onOpenChange={(o) => { setShowUpiDialog(o); if (!o) setIsSubmitting(false) }} title="UPI Payment">
        <YStack gap="$4" py="$2">
          <XStack justify="space-between" items="center" flexWrap="wrap" gap="$4">
            <YStack flex={1} gap="$3" style={{ minWidth: 200 }}>
              <YStack bg="$color3" rounded="$4" p="$3" gap="$1.5">
                <Paragraph color="$color10" fontSize="$2" fontWeight="600">Scan to Pay</Paragraph>
                <Paragraph color="$color12" fontSize="$5" fontWeight="800">{formatCurrency(preview?.summary.total ?? 0)}</Paragraph>
                {customerName ? <Paragraph color="$color8" fontSize="$2">Customer: {customerName}</Paragraph> : null}
              </YStack>
              <YStack gap="$1" items="center">
                <Paragraph color={upiTimer <= 60 ? '$red10' : '$color11'} fontSize="$4" fontWeight="700">{Math.floor(upiTimer / 60)}:{(upiTimer % 60).toString().padStart(2, '0')}</Paragraph>
                <Paragraph color="$color8" fontSize="$2">Expires in</Paragraph>
              </YStack>
            </YStack>
            <YStack items="center" justify="center" p="$2" bg="#FFFFFF" rounded="$4" mx="auto">
              <QRCode value={`upi://pay?pa=yourmerchant@ybl&pn=Hari%20Charnamm&am=${(preview?.summary.total ?? 0).toFixed(2)}&tr=POS-WEB&cu=INR`} size={180} color="#000000" backgroundColor="#FFFFFF" />
            </YStack>
          </XStack>
          <Button theme="accent" size="$4" disabled={upiTimer <= 0 || isSubmitting} onPress={executeCheckout} mt="$2">
            {isSubmitting ? 'Processing…' : 'Confirm Payment Received'}
          </Button>
        </YStack>
      </ResponsiveDialog>

      <ProductShowcaseDialog productId={detailsProductId} open={detailsProductId !== null} onOpenChange={(o) => !o && setDetailsProductId(null)} />
    </YStack>
  )
}
