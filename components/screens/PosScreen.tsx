import { AppInput, AppTextArea } from 'components/ui/AppInput'
import { useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ScanBarcode, Minus, Plus, ReceiptText, Search, ShoppingCart, Trash2, X, SlidersHorizontal } from '@tamagui/lucide-icons-2'
import { useConvex, useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button,  Paragraph, ScrollView, Spinner, XStack, YStack, useMedia, useTheme } from 'tamagui'
import QRCode from 'react-native-qrcode-svg'
import { convexApi } from 'lib/convex'
import { CategoryNode, getSubcategoryOptions } from 'lib/categories'
import { getErrorMessage } from 'lib/errors'
import { formatCurrency, formatNumber } from 'lib/format'
import { hapticError, hapticLight, hapticMedium, hapticSuccess } from 'lib/haptics'
import { buildReceiptHtml, handleReceiptOutput, saleDetailToReceipt } from 'lib/receipt'
import { generateUpiUrl } from 'lib/upi'
import { useDebounce } from 'lib/useDebounce'
import { ProductImage } from 'components/ui/ProductImage'
import { ProductShowcaseDialog } from 'components/ui/ProductShowcaseDialog'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { StatusBadge } from 'components/ui/StatusBadge'
import { BarcodeScannerDialog } from 'components/pos/BarcodeScannerDialog'
import { ScreenScaffold } from 'components/ui/ScreenScaffold'
import { ScreenHeader, HeaderAction } from 'components/ui/ScreenHeader'
import { SectionCard } from 'components/ui/SectionCard'
import { ListRow } from 'components/ui/ListRow'
import { SelectionField } from 'components/ui/SelectionField'
import { MobileFilterSheet } from 'components/ui/MobileFilterSheet'

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
        stockState: 'in_stock', // computed at the end
      })
      continue
    }
    existing.variants.push(item)
    existing.minPrice = Math.min(existing.minPrice, item.salePrice)
    existing.maxPrice = Math.max(existing.maxPrice, item.salePrice)
    existing.totalOnHand += item.onHand
  }
  return Array.from(map.values()).map((g) => ({
    ...g,
    stockState: g.totalOnHand === 0 ? 'out_of_stock' : g.totalOnHand < 10 ? 'low_stock' : 'in_stock',
  }))
}

export function PosScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const media = useMedia()
  const mobile = media.maxMd
  const desktop = !mobile
  const toast = useToastController()
  const convex = useConvex()
  const categories = useQuery(convexApi.inventory.listCategories, { includeInactive: true }) as CategoryNode[] | undefined
  const createSale = useMutation(convexApi.pos.createSale)

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [stockState, setStockState] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [cart, setCart] = useState<CartLine[]>([])
  const cartMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const line of cart) m.set(line.variantId, line.quantity)
    return m
  }, [cart])
  const [orderDiscount, setOrderDiscount] = useState('0')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [detailsProductId, setDetailsProductId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash')
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
  const [completedSale, setCompletedSale] = useState<{ id: string; code: string; total: number } | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const theme = useTheme();

  const [saleCompleteDialog, setSaleCompleteDialog] = useState<{ id: string; code: string; total: number, receiptHtml?: string } | null>(null)

  useEffect(() => {
    if (showUpiDialog && upiTimer > 0) {
      const iv = setInterval(() => setUpiTimer((value) => value - 1), 1000)
      return () => clearInterval(iv)
    }
  }, [showUpiDialog, upiTimer])

  useEffect(() => {
    if (!categoryId) {
      setSubcategoryId(null)
      return
    }
    const valid = new Set(getSubcategoryOptions(categories, categoryId).map((option) => option.value))
    if (subcategoryId && !valid.has(subcategoryId)) setSubcategoryId(null)
  }, [categoryId, subcategoryId, categories])

  const debouncedSearch = useDebounce(search, 250)
  const { results, status, loadMore } = usePaginatedQuery(
    convexApi.pos.catalogSearch,
    { search: debouncedSearch.trim() || null, categoryId: categoryId as import('convex/_generated/dataModel').Id<'categories'> | null, subcategoryId: subcategoryId as import('convex/_generated/dataModel').Id<'categories'> | null, stockState },
    { initialNumItems: 24 },
  )

  const activeFilterCount = useMemo(
    () => [categoryId, subcategoryId, stockState !== 'all'].filter(Boolean).length,
    [categoryId, subcategoryId, stockState],
  )

  function resetFilters() {
    setCategoryId(null)
    setSubcategoryId(null)
    setStockState('all')
  }

  const filterFields = (
    <>
      <YStack style={{ minWidth: mobile ? '100%' : 160 }}>
        <SelectionField label="Category" value={categoryId} placeholder="All categories" options={[{ label: 'All categories', value: null }, ...(categories ?? []).map((c) => ({ label: c.name, value: c._id }))]} onChange={setCategoryId} />
      </YStack>
      <YStack style={{ minWidth: mobile ? '100%' : 160 }}>
        <SelectionField label="Subcategory" value={subcategoryId} placeholder="All subcategories" options={[{ label: 'All subcategories', value: null }, ...getSubcategoryOptions(categories, categoryId)]} onChange={setSubcategoryId} />
      </YStack>
      <YStack style={{ minWidth: mobile ? '100%' : 140 }}>
        <SelectionField label="Stock" value={stockState} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'In stock', value: 'in_stock' }, { label: 'Low stock', value: 'low_stock' }, { label: 'Out of stock', value: 'out_of_stock' }]} onChange={(v) => setStockState((v ?? 'all') as typeof stockState)} />
      </YStack>
    </>
  )
  const catalog = (results ?? []) as CatalogItem[]
  const productGroups = useMemo(() => groupCatalogItems(catalog), [catalog])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cart.length === 0) {
        setPreview({
          lines: [],
          summary: { subtotal: 0, lineDiscountTotal: 0, orderDiscount: 0, total: 0, totalQty: 0, itemCount: 0 },
        })
        setPreviewError(null)
        return
      }
      try {
        const response = await convex.query(convexApi.pos.previewSale, {
          items: cart.map((line) => ({ variantId: line.variantId as import('convex/_generated/dataModel').Id<'productVariants'>, quantity: line.quantity, lineDiscount: Number(line.lineDiscount || 0) })),
          orderDiscount: Number(orderDiscount || 0),
        })
        if (!cancelled) {
          setPreview(response as SalePreview)
          setPreviewError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setPreview(null)
          setPreviewError(getErrorMessage(error))
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [cart, orderDiscount, convex])

  function addVariantToCart(item: CatalogItem) {
    const existingQty = cartMap.get(item._id) || 0
    if (existingQty >= item.onHand) {
      toast.show('Max stock reached')
      return
    }

    setCart((current) => {
      const existing = current.find((line) => line.variantId === item._id)
      if (!existing) {
        hapticMedium()
        return [...current, {
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
        }]
      }
      if (existing.quantity >= item.onHand) {
        return current
      }
      hapticLight()
      return current.map((line) => line.variantId === item._id ? { ...line, quantity: line.quantity + 1 } : line)
    })
  }

  function updateQty(variantId: string, qty: number) {
    setCart((current) => current.map((line) => line.variantId !== variantId ? line : { ...line, quantity: Math.max(1, Math.min(qty, line.onHand)) }))
  }

  function removeLine(variantId: string) {
    setCart((current) => current.filter((line) => line.variantId !== variantId))
  }

  async function executeCheckout() {
    setIsSubmitting(true)
    try {
      const finalTotal = preview?.summary.total ?? 0

      const result = await createSale({
        items: cart.map((line) => ({ variantId: line.variantId as import('convex/_generated/dataModel').Id<'productVariants'>, quantity: line.quantity, lineDiscount: Number(line.lineDiscount || 0) })),
        orderDiscount: Number(orderDiscount || 0),
        paymentMethod,
        paymentNote: paymentNote.trim() || null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        notes: notes.trim() || null,
      })
      const sale = await convex.query(convexApi.pos.saleDetail, { saleId: result.saleId })
      const receipt = saleDetailToReceipt(sale as Parameters<typeof saleDetailToReceipt>[0])
      const receiptHtml = receipt ? buildReceiptHtml(receipt) : ''
      
      hapticSuccess()
      toast.show('Sale completed', { message: `${result.saleCode} saved.` })
      setCart([])
      setOrderDiscount('0')
      setCustomerName('')
      setCustomerPhone('')
      setPaymentMethod('cash')
      setPaymentNote('')
      setNotes('')
      setCartOpen(false)

      if (paymentMethod === 'upi') {
        setCompletedSale({ id: result.saleId, code: result.saleCode, total: finalTotal, receiptHtml } as any)
        setUpiTimer(300)
        setShowUpiDialog(true)
        return
      }

      setSaleCompleteDialog({ id: result.saleId, code: result.saleCode, total: finalTotal, receiptHtml })
    } catch (error) {
      toast.show('Checkout failed', { message: getErrorMessage(error) })
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
      toast.show('Fix errors first', { message: previewError })
      return
    }
    void executeCheckout()
  }

  async function handleBarcodeScanned(data: string) {
    setScannerOpen(false)
    try {
      const match = await convex.query(convexApi.pos.resolveBarcode, { barcode: data })
      if (!match) {
        hapticError()
        toast.show('Not found', { message: `Barcode ${data} not recognized.` })
        return
      }
      if (match.stockState === 'out_of_stock') {
        hapticError()
        toast.show('Out of stock', { message: `${match.optionSummary || match.label} is out of stock.` })
        return
      }
      hapticSuccess()
      addVariantToCart(match)
      toast.show('Added to cart', { message: match.optionSummary || match.label })
    } catch {
      toast.show('Scan Error', { message: 'Could not lookup barcode.' })
    }
  }

  const cartHeader = (
    <XStack justify="space-between" items="center" pb="$2">
      <YStack gap="$0.5">
        <Paragraph color="$color12" fontSize="$6" fontWeight="900">Current Sale</Paragraph>
        <Paragraph color="$color10" fontSize="$2">{cart.length} line{cart.length === 1 ? '' : 's'} · {formatCurrency(preview?.summary.total ?? 0)}</Paragraph>
      </YStack>
      {mobile ? (
        <Button size="$2.5" bg="$color3" borderWidth={1} borderColor="$borderColor" icon={<X size={14} />} onPress={() => setCartOpen(false)}>
          <Paragraph color="$color12" fontSize="$2" fontWeight="700">Close</Paragraph>
        </Button>
      ) : (
        <Button size="$2.5" bg="$color3" borderWidth={0} disabled={cart.length === 0} icon={<Trash2 size={14} color={theme.danger.val} />} onPress={() => setCart([])}>
          <Paragraph color="$color12" fontSize="$2" fontWeight="700">Clear</Paragraph>
        </Button>
      )
      }
    </XStack >
  )

  const cartList = cart.length === 0 ? (
    <YStack flex={1} items="center" justify="center" py="$7">
      <ShoppingCart size={28} color="$color8" />
      <Paragraph color="$color12" fontSize="$4" fontWeight="800" mt="$3">Cart is empty</Paragraph>
      <Paragraph color="$color10" fontSize="$2">Browse products and tap add to start a sale.</Paragraph>
    </YStack>
  ) : (
    <ScrollView flex={1} showsVerticalScrollIndicator={false}>
      <YStack gap="$2" pb="$4">
        {cart.map((line) => {
          const previewLine = preview?.lines.find((entry) => entry.variantId === line.variantId)
          return (
            <SectionCard key={line.variantId} p="$3">
              <XStack gap="$2.5" items="center">
                <ProductImage uri={line.mediaUrl} size={44} label={line.productCode} />
                <YStack flex={1} gap="$0.5">
                  <Paragraph color="$color12" fontSize="$3" fontWeight="800" numberOfLines={1}>{line.productName}</Paragraph>
                  <Paragraph color="$color10" fontSize="$1">{line.displayCode} · {line.variantLabel}</Paragraph>
                </YStack>
                <YStack items="flex-end">
                  <Paragraph color="$color12" fontSize="$4" fontWeight="800">{previewLine ? formatCurrency(previewLine.lineTotal) : '—'}</Paragraph>
                  <Paragraph color="$color8" fontSize="$1">@ {formatCurrency(line.unitPrice)}</Paragraph>
                </YStack>
              </XStack>
              <XStack justify="space-between" items="center" mt="$3">
                <XStack items="center" bg="$color3" rounded="$5" overflow="hidden" borderWidth={1} borderColor="$borderColor">
                  {line.quantity === 1 ? (
                    <Button size="$2.5" bg="$dangerSoft" borderWidth={0} onPress={() => removeLine(line.variantId)} icon={<Trash2 size={14} color={theme.danger.val} />} />
                  ) : (
                    <Button size="$2.5" bg="transparent" borderWidth={0} onPress={() => updateQty(line.variantId, line.quantity - 1)} icon={<Minus size={14} />} />
                  )}
                  <Paragraph color="$color12" fontSize="$3" fontWeight="800" px="$2" minW={32} >{line.quantity}</Paragraph>
                  <Button size="$2.5" bg="transparent" borderWidth={0} onPress={() => updateQty(line.variantId, line.quantity + 1)} icon={<Plus size={14} />} />
                </XStack>
                <XStack items="center" gap="$2">
                  <XStack items="center" bg="$color3" rounded="$5" borderWidth={1} borderColor="$borderColor" px="$2">
                    <Paragraph color="$color10" fontSize="$1">Disc ₹</Paragraph>
                    <AppInput
                      value={line.lineDiscount}
                      onChangeText={(value) => setCart((current) => current.map((item) => item.variantId === line.variantId ? { ...item, lineDiscount: value } : item))}
                      keyboardType="numeric"
                      placeholder="0"
                      bg="transparent"
                      borderWidth={0}
                      width={50}
                      px="$1"
                      color="$color12"
                    />
                  </XStack>
                </XStack>
              </XStack>
            </SectionCard>
          )
        })}
      </YStack>
    </ScrollView>
  )

  const cartFooter = (
    <YStack gap="$3" pt="$3" borderTopWidth={1} borderColor="$borderColor">
      <SectionCard p="$3">
        <Paragraph color="$color12" fontSize="$3" fontWeight="800" mb="$2">Customer & Payment</Paragraph>
        <XStack gap="$2" flexWrap="wrap">
          <AppInput flex={1} size="$3" value={customerName} onChangeText={setCustomerName} placeholder="Customer name" bg="$color3" borderWidth={1} borderColor="$borderColor" color="$color12" />
          <AppInput flex={1} size="$3" value={customerPhone} onChangeText={setCustomerPhone} placeholder="Phone" bg="$color3" borderWidth={1} borderColor="$borderColor" color="$color12" keyboardType="phone-pad" />
        </XStack>
        <XStack gap="$2" mt="$2">
          <Button flex={1} size="$3" bg={paymentMethod === 'cash' ? '$color4' : '$color3'} borderWidth={1} borderColor={paymentMethod === 'cash' ? '$accentBackground' : '$borderColor'} onPress={() => setPaymentMethod('cash')}>
            <Paragraph color="$color12" fontSize="$3" fontWeight="800">Cash</Paragraph>
          </Button>
          <Button flex={1} size="$3" bg={paymentMethod === 'upi' ? '$color4' : '$color3'} borderWidth={1} borderColor={paymentMethod === 'upi' ? '$accentBackground' : '$borderColor'} onPress={() => setPaymentMethod('upi')}>
            <Paragraph color="$color12" fontSize="$3" fontWeight="800">UPI</Paragraph>
          </Button>
        </XStack>
      </SectionCard>

      <SectionCard p="$3">
        <XStack justify="space-between" items="center">
          <Paragraph color="$color10" fontSize="$2">Order discount</Paragraph>
          <XStack items="center" gap="$1" bg="$color3" rounded="$5" borderWidth={1} borderColor="$borderColor" px="$2">
            <Paragraph color="$color10" fontSize="$1">₹</Paragraph>
            <AppInput value={orderDiscount} onChangeText={setOrderDiscount} keyboardType="numeric" bg="transparent" borderWidth={0} width={60} color="$color12" />
          </XStack>
        </XStack>
        <XStack justify="space-between" mt="$2"><Paragraph color="$color10" fontSize="$3">Subtotal</Paragraph><Paragraph color="$color12" fontWeight="700">{formatCurrency(preview?.summary.subtotal ?? 0)}</Paragraph></XStack>
        <XStack justify="space-between" mt="$1"><Paragraph color="$color10" fontSize="$3">Discounts</Paragraph><Paragraph color="$color12" fontWeight="700">-{formatCurrency((preview?.summary.lineDiscountTotal ?? 0) + (preview?.summary.orderDiscount ?? 0))}</Paragraph></XStack>
        <XStack justify="space-between" pt="$3" mt="$3" borderTopWidth={1} borderColor="$borderColor">
          <Paragraph color="$color12" fontSize="$5" fontWeight="900">Total</Paragraph>
          <Paragraph color="$color10" fontSize="$7" fontWeight="900">{formatCurrency(preview?.summary.total ?? 0)}</Paragraph>
        </XStack>
        {previewError ? (
          <Paragraph color="$danger" fontSize="$2" mt="$2">{previewError}</Paragraph>
        ) : null}
        <Button theme="accent" size="$5" mt="$3" icon={<ReceiptText size={18} />} disabled={isSubmitting || cart.length === 0 || !!previewError} onPress={handleCheckout}>
          {isSubmitting ? 'Processing…' : 'Complete Sale'}
        </Button>
      </SectionCard>
    </YStack>
  )

  const mobileFabBottom = Math.max(insets.bottom + 72, 88)

  return (
    <YStack flex={1}>
      <ScreenScaffold>
        {!mobile ? (
          <ScreenHeader
            eyebrow="Checkout"
            title="Point of Sale"
            subtitle="Fast product search and a cleaner one-handed checkout flow."
            actions={
              <HeaderAction bg="$color3" borderColor="$borderColor" borderWidth={1} icon={<ScanBarcode size={14} />} onPress={() => setScannerOpen(true)}>
                Scan
              </HeaderAction>
            }
          />
        ) : null}

        {mobile ? (
          <YStack gap="$3">
            <MobileFilterSheet open={filtersOpen} onOpenChange={setFiltersOpen} activeCount={activeFilterCount} onReset={resetFilters}>
              {filterFields}
            </MobileFilterSheet>

            <XStack items="center" gap="$2" bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$6" px="$3">
              <Search size={16} color="$color10" />
              <AppInput value={search} onChangeText={setSearch} placeholder="Search products, code, barcode" flex={1} bg="transparent" borderWidth={0} px="$0" color="$color12" />
              {Platform.OS !== 'web' ? (
                <Button size="$2.5" theme="accent" icon={<ScanBarcode size={14} />} onPress={() => setScannerOpen(true)} />
              ) : null}
              <Button size="$2.5" bg="$color3" borderWidth={1} borderColor="$borderColor" icon={<SlidersHorizontal size={14} />} onPress={() => setFiltersOpen(true)}>
                {activeFilterCount > 0 ? activeFilterCount.toString() : 'Filters'}
              </Button>
            </XStack>

            {status === 'LoadingFirstPage' ? (
              <XStack items="center" gap="$2" py="$6" justify="center"><Spinner size="small" /><Paragraph color="$color10">Loading catalog…</Paragraph></XStack>
            ) : (
              <YStack gap="$2.5">
                {productGroups.map((group) => {
                  const isOos = group.stockState === 'out_of_stock'
                  const cartQty = group.variants.length === 1 ? (cartMap.get(group.variants[0]._id) || 0) : 0
                  const isMaxed = group.variants.length === 1 && cartQty >= group.variants[0].onHand
                  
                  return (
                    <ListRow
                      key={group.productId}
                      onPress={() => setDetailsProductId(group.productId)}
                      leading={<ProductImage uri={group.mediaUrl} size={56} label={group.productCode} />}
                      title={group.productName}
                      meta={<Paragraph color="$color12" fontSize="$4" fontWeight="800">{group.minPrice === group.maxPrice ? formatCurrency(group.minPrice) : `${formatCurrency(group.minPrice)}+`}</Paragraph>}
                      subtitle={
                        <YStack gap="$1">
                          <Paragraph color="$color10" fontSize="$2">{group.productCode} · {group.variants.length} variant{group.variants.length > 1 ? 's' : ''}</Paragraph>
                          <XStack justify="space-between" items="center">
                            <Paragraph color="$color8" fontSize="$1">{formatNumber(group.totalOnHand)} available</Paragraph>
                            <StatusBadge status={group.stockState} />
                          </XStack>
                        </YStack>
                      }
                      trailing={
                        <Button
                          theme={(isOos || isMaxed) ? undefined : 'accent'}
                          bg={(isOos || isMaxed) ? '$color3' : undefined}
                          borderWidth={(isOos || isMaxed) ? 1 : 0}
                          borderColor="$borderColor"
                          disabled={isOos || isMaxed}
                          onPress={() => {
                            if (isOos || isMaxed) return
                            if (group.variants.length === 1) {
                              addVariantToCart(group.variants[0])
                              return
                            }
                            setVariantPickerItems(group.variants)
                            setVariantPickerOpen(true)
                          }}
                        >
                          {isOos ? 'OOS' : isMaxed ? 'Max Stock' : group.variants.length === 1 ? 'Add' : 'Choose'}
                        </Button>
                      }
                    />
                  )
                })}
              </YStack>
            )}

            {status === 'CanLoadMore' ? (
              <XStack justify="center"><Button bg="$color3" borderWidth={1} borderColor="$borderColor" onPress={() => loadMore(24)}><Paragraph color="$color12" fontSize="$2" fontWeight="700">Load more</Paragraph></Button></XStack>
            ) : null}
          </YStack>
        ) : (
          <XStack gap="$4" flex={1} items="stretch">
            <ScrollView flex={1} showsVerticalScrollIndicator={false} contentContainerStyle={{ pb: 60 } as any}>
              <YStack gap="$3">
                <XStack items="center" gap="$2" bg="$color3" borderWidth={1} borderColor="$borderColor" rounded="$6" px="$3">
                  <Search size={16} color="$color8" />
                  <AppInput value={search} onChangeText={setSearch} placeholder="Search products, codes, or barcode" flex={1} bg="transparent" borderWidth={0} px="$0" color="$color12" />
                </XStack>
                <XStack gap="$2" flexWrap="wrap">
                  <SectionCard flex={1} p="$3">
                    <XStack gap="$3" flexWrap="wrap">
                      {filterFields}
                    </XStack>
                  </SectionCard>
                </XStack>
                <XStack gap="$3" flexWrap="wrap">
                  {productGroups.map((group) => {
                    const isOos = group.stockState === 'out_of_stock'
                    const cartQty = group.variants.length === 1 ? (cartMap.get(group.variants[0]._id) || 0) : 0
                    const isMaxed = group.variants.length === 1 && cartQty >= group.variants[0].onHand

                    return (
                      <SectionCard key={group.productId} style={{ width: 240 }}>
                        <XStack gap="$3" items="center">
                          <ProductImage uri={group.mediaUrl} size={58} label={group.productCode} />
                          <YStack flex={1} gap="$1">
                            <Paragraph color="$color12" fontSize="$4" fontWeight="800" numberOfLines={1}>{group.productName}</Paragraph>
                            <Paragraph color="$color10" fontSize="$2">{group.productCode} · {group.variants.length} variants</Paragraph>
                          </YStack>
                        </XStack>
                        <XStack justify="space-between" items="center">
                          <Paragraph color="$color12" fontSize="$5" fontWeight="900">{group.minPrice === group.maxPrice ? formatCurrency(group.minPrice) : `${formatCurrency(group.minPrice)}+`}</Paragraph>
                          <StatusBadge status={group.stockState} />
                        </XStack>
                        <XStack gap="$2">
                          <Button
                            flex={1}
                            bg="$color3"
                            borderWidth={1}
                            borderColor="$borderColor"
                            hoverStyle={{ bg: '$color4' }}
                            onPress={() => setDetailsProductId(group.productId)}
                          >
                            <Paragraph color="$color12" fontSize="$2" fontWeight="700">Details</Paragraph>
                          </Button>
                          <Button
                            flex={1}
                            theme={(isOos || isMaxed) ? undefined : 'accent'}
                            bg={(isOos || isMaxed) ? '$color3' : undefined}
                            borderWidth={(isOos || isMaxed) ? 1 : 0}
                            borderColor="$borderColor"
                            disabled={isOos || isMaxed}
                            onPress={() => {
                              if (isOos || isMaxed) return
                              if (group.variants.length === 1) {
                                addVariantToCart(group.variants[0])
                                return
                              }
                              setVariantPickerItems(group.variants)
                              setVariantPickerOpen(true)
                            }}
                          >
                            {isOos ? 'OOS' : isMaxed ? 'Maxed' : group.variants.length === 1 ? 'Add' : 'Choose'}
                          </Button>
                        </XStack>
                      </SectionCard>
                    )
                  })}
                </XStack>
              </YStack>
            </ScrollView>
            <YStack width={440} flex={1} bg="$color1" ml="$2" pb="$2">
              <YStack flex={1} bg="$color2" rounded="$6" borderWidth={1} borderColor="$borderColor" p="$3" gap="$3">
                {cartHeader}
                {cartList}
                {cartFooter}
              </YStack>
            </YStack>
          </XStack>
        )}

      </ScreenScaffold>

      {mobile && cart.length > 0 ? (
        <Button
          theme="accent"
          size="$4"
          icon={<ShoppingCart size={18} />}
          onPress={() => setCartOpen(true)}
          style={{
            position: Platform.OS === 'web' ? 'fixed' : 'absolute',
            right: 16,
            bottom: Platform.OS === 'web' ? 92 : mobileFabBottom,
            zIndex: 40,
            borderRadius: 999,
            minWidth: 0,
          }}
        >
          {`${cart.length} · ${formatCurrency(preview?.summary.total ?? 0)}`}
        </Button>
      ) : null}

      {mobile ? (
        <ResponsiveDialog open={cartOpen} onOpenChange={setCartOpen} title="Checkout">
          <YStack gap="$3" style={{ maxHeight: '80vh' }}>
            {cartHeader}
            {cartList}
            {cartFooter}
          </YStack>
        </ResponsiveDialog>
      ) : null}

      <ResponsiveDialog open={variantPickerOpen} onOpenChange={setVariantPickerOpen} title="Choose variant" description="Select a variant to add to the current sale.">
        <YStack gap="$2" py="$1">
          {variantPickerItems.map((item) => {
            const qty = cartMap.get(item._id) || 0
            const isItemOos = item.stockState === 'out_of_stock'
            const isItemMaxed = qty >= item.onHand
            return (
            <SectionCard key={item._id} p="$3">
              <XStack justify="space-between" items="center" gap="$3">
                <YStack flex={1} gap="$0.5">
                  <Paragraph color="$color12" fontSize="$3" fontWeight="800">{item.optionSummary || item.label}</Paragraph>
                  <Paragraph color="$color10" fontSize="$2">{item.displayCode} · {formatCurrency(item.salePrice)} · {formatNumber(item.onHand)} avail</Paragraph>
                </YStack>
                <Button theme={(isItemOos || isItemMaxed) ? undefined : 'accent'} disabled={isItemOos || isItemMaxed} onPress={() => { addVariantToCart(item); setVariantPickerOpen(false) }}>
                  {isItemOos ? 'OOS' : isItemMaxed ? 'Maxed' : 'Add'}
                </Button>
              </XStack>
            </SectionCard>
          )})}
        </YStack>
      </ResponsiveDialog>

      <ResponsiveDialog open={showUpiDialog} onOpenChange={(open) => { setShowUpiDialog(open); if (!open) setIsSubmitting(false) }} title="UPI Payment" description="Confirm payment before completing the sale.">
        <YStack gap="$4" py="$2">
          <XStack justify="space-between" items="center" flexWrap="wrap" gap="$4">
            <YStack flex={1} gap="$3" style={{ minWidth: 220 }}>
              <SectionCard bg="$color3">
                <Paragraph color="$color10" fontSize="$2">Amount payable</Paragraph>
                <Paragraph color="$color12" fontSize="$8" fontWeight="900">{formatCurrency(completedSale ? completedSale.total : (preview?.summary.total ?? 0))}</Paragraph>
                {customerName ? <Paragraph color="$color10" fontSize="$2">Customer: {customerName}</Paragraph> : null}
              </SectionCard>
              <SectionCard bg="$color3">
                <Paragraph color={upiTimer <= 60 ? '$danger' : '$color12'} fontSize="$6" fontWeight="900">
                  {Math.floor(upiTimer / 60)}:{(upiTimer % 60).toString().padStart(2, '0')}
                </Paragraph>
                <Paragraph color="$color10" fontSize="$2">Expires in</Paragraph>
              </SectionCard>
            </YStack>
            <YStack items="center" justify="center" p="$3" bg="white" rounded="$6">
              <QRCode
                value={generateUpiUrl({
                  amount: completedSale ? completedSale.total.toString() : (preview?.summary.total ?? 0).toString(),
                  transactionNote: completedSale ? completedSale.code : 'POS-WEB',
                })}
                size={180}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </YStack>
          </XStack>
          <Button
            theme="accent"
            size="$5"
            disabled={upiTimer <= 0 || isSubmitting}
            onPress={() => {
              setShowUpiDialog(false)
              setPaymentMethod('cash')
              if (completedSale) {
                setSaleCompleteDialog(completedSale as any)
                setCompletedSale(null)
              }
            }}
          >
            Confirm Payment Received
          </Button>
        </YStack>
      </ResponsiveDialog>

      <ResponsiveDialog open={saleCompleteDialog !== null} onOpenChange={(open) => !open && setSaleCompleteDialog(null)} title="Sale Completed" description="Transaction successfully recorded.">
        <YStack gap="$4" py="$4" items="center">
          <SectionCard items="center" p="$4" bg="$color3" width="100%">
            <Paragraph color="$color10" fontSize="$3">Total Collected</Paragraph>
            <Paragraph color="$color12" fontSize="$9" fontWeight="900" mt="$1">{formatCurrency(saleCompleteDialog?.total ?? 0)}</Paragraph>
            <Paragraph color="$color10" fontSize="$2" mt="$2">Order ID: {saleCompleteDialog?.code}</Paragraph>
          </SectionCard>
          
          <XStack gap="$3" width="100%" mt="$2">
            <Button 
              flex={1} 
              size="$5" 
              bg="$color3" 
              borderWidth={1} 
              borderColor="$borderColor"
              onPress={() => setSaleCompleteDialog(null)}
            >
              New Sale
            </Button>
            <Button 
              flex={1} 
              size="$5" 
              theme="accent"
              icon={<ReceiptText size={18} />}
              onPress={() => {
                if (saleCompleteDialog?.receiptHtml) {
                  handleReceiptOutput(saleCompleteDialog.receiptHtml, saleCompleteDialog.code)
                }
              }}
            >
              Print Receipt
            </Button>
          </XStack>
        </YStack>
      </ResponsiveDialog>

      <ProductShowcaseDialog productId={detailsProductId} open={detailsProductId !== null} onOpenChange={(open) => !open && setDetailsProductId(null)} />
      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScanned={handleBarcodeScanned} />
    </YStack>
  )
}
