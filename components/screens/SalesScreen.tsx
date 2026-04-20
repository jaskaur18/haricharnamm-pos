import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useConvex, useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, Spinner, TextArea, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { getErrorMessage } from 'lib/errors'
import { formatCurrency, formatDate, formatDateTime, formatNumber, paymentMethodLabel } from 'lib/format'
import { buildReceiptHtml, handleReceiptOutput, saleDetailToReceipt } from 'lib/receipt'
import { FormField } from 'components/ui/FormField'
import { PageHeader } from 'components/ui/PageHeader'
import { ProductImage } from 'components/ui/ProductImage'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { SelectionField } from 'components/ui/SelectionField'
import { StatusBadge } from 'components/ui/StatusBadge'
import { SurfaceCard } from 'components/ui/SurfaceCard'

type SaleListItem = {
  _id: string
  saleCode: string
  businessDate: string
  status: 'completed' | 'returned_partial' | 'returned_full'
  paymentMethod: 'cash' | 'upi_mock'
  customerName?: string | null
  customerPhone?: string | null
  total: number
  totalQty: number
  itemCount: number
  createdAt: number
}

type SaleDetail = {
  _id: string
  saleCode: string
  businessDate: string
  status: 'completed' | 'returned_partial' | 'returned_full'
  paymentMethod: 'cash' | 'upi_mock'
  paymentNote?: string | null
  customerName?: string | null
  customerPhone?: string | null
  subtotal: number
  lineDiscountTotal: number
  orderDiscount: number
  total: number
  totalQty: number
  itemCount: number
  notes?: string | null
  createdAt: number
  items: Array<{
    _id: string
    productName: string
    variantLabel: string
    productCode: string
    quantity: number
    returnedQuantity: number
    remainingQty: number
    unitPrice: number
    lineTotal: number
    mediaUrl?: string | null
  }>
  returns: Array<{
    _id: string
    returnCode: string
    refundMethod: 'cash' | 'upi_mock'
    refundNote?: string | null
    subtotal: number
    totalQty: number
    createdAt: number
    items: Array<{
      quantity: number
      refundAmount: number
      productName: string
      variantLabel: string
    }>
  }>
}

function SaleDetailPanel({ saleId }: { saleId: string | null }) {
  const toast = useToastController()
  const convex = useConvex()
  const createReturn = useMutation(convexApi.pos.createReturn)
  const sale = useQuery(convexApi.pos.saleDetail, saleId ? { saleId } : 'skip') as SaleDetail | undefined

  const [returnOpen, setReturnOpen] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [refundMethod, setRefundMethod] = useState<'cash' | 'upi_mock'>('cash')
  const [refundNote, setRefundNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!returnOpen || !sale) {
      setQuantities({})
      setRefundMethod('cash')
      setRefundNote('')
      return
    }
    const next: Record<string, string> = {}
    for (const item of sale.items) next[item._id] = '0'
    setQuantities(next)
  }, [returnOpen, sale])

  async function handlePrintReceipt() {
    if (!sale) return
    const receipt = saleDetailToReceipt(sale)
    if (!receipt) return
    await handleReceiptOutput(buildReceiptHtml(receipt), receipt.saleCode)
  }

  async function handleCreateReturn() {
    if (!sale) return
    const items = sale.items
      .map((item) => ({ saleItemId: item._id, quantity: Number(quantities[item._id] || 0) }))
      .filter((item) => item.quantity > 0)

    if (items.length === 0) {
      toast.show('Select at least one quantity to return')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createReturn({ saleId: sale._id, items, refundMethod, refundNote: refundNote.trim() || null })
      toast.show('Return recorded', { message: `${result.returnCode} updated inventory.` })
      setReturnOpen(false)
    } catch (error) {
      toast.show('Return failed', { message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!saleId) {
    return (
      <YStack bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$5" p="$5" gap="$2" items="center" justify="center" style={{ minHeight: 200 }}>
        <Paragraph fontSize="$5" fontWeight="700">Select a sale</Paragraph>
        <Paragraph color="$color7" fontSize="$3" text="center">Choose a receipt to view details, reprint, or process a return.</Paragraph>
      </YStack>
    )
  }

  if (!sale) {
    return (
      <XStack items="center" gap="$2" py="$4" justify="center">
        <Spinner size="small" />
        <Paragraph color="$color7" fontSize="$2">Loading sale…</Paragraph>
      </XStack>
    )
  }

  return (
    <YStack gap="$3">
      {/* Sale header */}
      <SurfaceCard gap="$3">
        <XStack justify="space-between" items="center" gap="$2" flexWrap="wrap">
          <YStack gap="$0.5">
            <XStack gap="$2" items="center">
              <Paragraph fontSize="$6" fontWeight="800">{sale.saleCode}</Paragraph>
              <StatusBadge status={sale.status} />
            </XStack>
            <Paragraph color="$color7" fontSize="$2">
              {formatDateTime(sale.createdAt)} · {paymentMethodLabel(sale.paymentMethod)}
            </Paragraph>
          </YStack>
          <XStack gap="$1.5">
            <Button size="$3" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={handlePrintReceipt}>Print</Button>
            <Button
              size="$3"
              bg="$color8"


              disabled={!sale.items.some((item) => item.remainingQty > 0)}
              onPress={() => setReturnOpen(true)}
            >
              Return
            </Button>
          </XStack>
        </XStack>

        <XStack gap="$3" flexWrap="wrap">
          <YStack flex={1} bg="$color3" rounded="$4" p="$2.5" gap="$0.5" style={{ minWidth: 140 }}>
            <Paragraph color="$color7" fontSize="$1" fontWeight="600">Customer</Paragraph>
            <Paragraph fontWeight="700" fontSize="$3">{sale.customerName || 'Walk-in'}</Paragraph>
            <Paragraph color="$color7" fontSize="$2">{sale.customerPhone || '—'}</Paragraph>
          </YStack>
          <YStack flex={1} bg="$color3" rounded="$4" p="$2.5" gap="$0.5" style={{ minWidth: 140 }}>
            <Paragraph color="$color7" fontSize="$1" fontWeight="600">Total</Paragraph>
            <Paragraph fontWeight="800" fontSize="$5">{formatCurrency(sale.total)}</Paragraph>
            <Paragraph color="$color7" fontSize="$2">{formatNumber(sale.totalQty)} units · {formatNumber(sale.itemCount)} lines</Paragraph>
          </YStack>
        </XStack>
      </SurfaceCard>

      {/* Sold items */}
      <SurfaceCard gap="$2.5">
        <Paragraph fontSize="$4" fontWeight="700">Items</Paragraph>
        {sale.items.map((item) => (
          <XStack key={item._id} gap="$2.5" items="center" py="$1.5" borderBottomWidth={1} borderBottomColor="$borderColor">
            <ProductImage uri={item.mediaUrl} size={36} label={item.productCode} />
            <YStack flex={1} gap="$0.5">
              <Paragraph fontSize="$2" fontWeight="600" numberOfLines={1}>{item.productName}</Paragraph>
              <Paragraph color="$color7" fontSize="$1">{item.productCode} · {item.variantLabel}</Paragraph>
            </YStack>
            <YStack items="flex-end">
              <Paragraph fontSize="$3" fontWeight="700">{formatCurrency(item.lineTotal)}</Paragraph>
              <Paragraph color="$color7" fontSize="$1">{formatNumber(item.quantity)} sold / {formatNumber(item.remainingQty)} rem</Paragraph>
            </YStack>
          </XStack>
        ))}
      </SurfaceCard>

      {/* Returns */}
      <SurfaceCard gap="$2.5">
        <Paragraph fontSize="$4" fontWeight="700">Returns</Paragraph>
        {sale.returns.length === 0 ? (
          <Paragraph color="$color7" fontSize="$2">No returns recorded.</Paragraph>
        ) : (
          <YStack gap="$2" pl="$2">
            {sale.returns.map((r, index) => (
              <XStack key={r._id} gap="$3">
                <YStack items="center" pt="$2">
                  <YStack width={8} height={8} borderRadius={4} bg="#FCA5A5" />
                  {index !== sale.returns.length - 1 && (
                    <YStack flex={1} width={2} bg="rgba(255,255,255,0.05)" mt="$2" minHeight={40} />
                  )}
                </YStack>
                <YStack flex={1} bg="$color3" rounded="$4" p="$3" gap="$2">
                  <XStack justify="space-between" items="center">
                    <YStack gap="$0.5">
                      <Paragraph fontWeight="800" color="#FCA5A5">{r.returnCode}</Paragraph>
                      <Paragraph color="$color7" fontSize="$1">{formatDateTime(r.createdAt)} · {paymentMethodLabel(r.refundMethod)}</Paragraph>
                    </YStack>
                    <Paragraph fontWeight="800" fontSize="$4" color="#FCA5A5">{formatCurrency(r.subtotal)}</Paragraph>
                  </XStack>
                  <YStack gap="$1">
                    {r.items.map((item, i) => (
                      <Paragraph key={i} color="$color10" fontSize="$2">
                        {item.productName} · {item.variantLabel} · {formatNumber(item.quantity)} qty · {formatCurrency(item.refundAmount)}
                      </Paragraph>
                    ))}
                  </YStack>
                </YStack>
              </XStack>
            ))}
          </YStack>
        )}
      </SurfaceCard>

      {/* Return dialog */}
      <ResponsiveDialog open={returnOpen} onOpenChange={setReturnOpen} title="Create return" description="Select quantities to return.">
        <YStack gap="$3" py="$2">
          {sale.items.map((item) => (
            <XStack key={item._id} bg="$color3" rounded="$4" p="$3" justify="space-between" items="center" gap="$3">
              <YStack flex={1} gap="$0.5">
                <Paragraph fontWeight="800" fontSize="$3">{item.productName}</Paragraph>
                <Paragraph color="$color7" fontSize="$2">{item.variantLabel} · {formatNumber(item.remainingQty)} remaining</Paragraph>
              </YStack>
              <Input
                value={quantities[item._id] ?? '0'}
                onChangeText={(v) => setQuantities((c) => ({ ...c, [item._id]: v }))}
                keyboardType="numeric"
                placeholder="0"
                style={{ width: 60 }}
                size="$3"
                bg="$color3"
                borderWidth={0}
                hoverStyle={{ bg: '$color4' }}
                focusStyle={{ bg: '$color4' }}
                px="$4"
              />
            </XStack>
          ))}

          <SelectionField
            label="Refund method"
            value={refundMethod}
            placeholder="Select"
            options={[{ label: 'Cash', value: 'cash' }, { label: 'UPI (Mock)', value: 'upi_mock' }]}
            onChange={(v) => setRefundMethod((v as any) ?? 'cash')}
          />

          <FormField label="Refund note">
            <TextArea value={refundNote} onChangeText={setRefundNote} placeholder="Optional" style={{ minHeight: 80 }} px="$4" py="$3" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
          </FormField>

          <XStack justify="flex-end">
            <Button theme="accent" onPress={handleCreateReturn} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Complete return'}
            </Button>
          </XStack>
        </YStack>
      </ResponsiveDialog>
    </YStack>
  )
}

export function SalesScreen() {
  const media = useMedia()
  const desktop = !media.maxMd
  const params = useLocalSearchParams<{ saleId?: string | string[] }>()

  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'upi_mock'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'returned_partial' | 'returned_full'>('all')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  useEffect(() => {
    const id = Array.isArray(params.saleId) ? params.saleId[0] : params.saleId
    if (id) setSelectedSaleId(id)
  }, [params.saleId])

  const { results, status, loadMore } = usePaginatedQuery(
    convexApi.pos.salesList,
    { search: search.trim() || null, fromDate: fromDate || null, toDate: toDate || null, paymentMethod, status: statusFilter },
    { initialNumItems: 24 },
  )

  const sales = (results ?? []) as SaleListItem[]

  return (
    <YStack gap="$4">
      <PageHeader title="Sales" description="Receipt history and returns." />

      {/* Filters */}
      <SurfaceCard gap="$2.5">
        <XStack gap="$2" flexWrap="wrap">
          <YStack flex={1} style={{ minWidth: 160 }}>
            <FormField label="Search">
              <Input value={search} onChangeText={setSearch} placeholder="Code, customer…" size="$3" px="$4" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
            </FormField>
          </YStack>
          <YStack style={{ minWidth: 120 }}>
            <FormField label="From">
              <Input value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" size="$3" px="$4" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
            </FormField>
          </YStack>
          <YStack style={{ minWidth: 120 }}>
            <FormField label="To">
              <Input value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" size="$3" px="$4" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
            </FormField>
          </YStack>
          <YStack style={{ minWidth: 130 }}>
            <SelectionField label="Payment" value={paymentMethod} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Cash', value: 'cash' }, { label: 'UPI', value: 'upi_mock' }]} onChange={(v) => setPaymentMethod((v as any) ?? 'all')} />
          </YStack>
          <YStack style={{ minWidth: 130 }}>
            <SelectionField label="Status" value={statusFilter} placeholder="All" options={[{ label: 'All', value: 'all' }, { label: 'Completed', value: 'completed' }, { label: 'Partial return', value: 'returned_partial' }, { label: 'Full return', value: 'returned_full' }]} onChange={(v) => setStatusFilter((v as any) ?? 'all')} />
          </YStack>
        </XStack>
      </SurfaceCard>

      {/* Master-detail */}
      <XStack gap="$3" flexWrap={desktop ? 'nowrap' : 'wrap'}>
        {/* Sale list */}
        <YStack flex={1} gap="$1.5" style={{ minWidth: 300 }}>
          {status === 'LoadingFirstPage' ? (
            <XStack items="center" gap="$2" py="$4" justify="center">
              <Spinner size="small" />
              <Paragraph color="$color7" fontSize="$2">Loading sales…</Paragraph>
            </XStack>
          ) : sales.length === 0 ? (
            <YStack bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$5" p="$4" gap="$2" items="center">
              <Paragraph fontSize="$5" fontWeight="700">No sales found</Paragraph>
              <Paragraph color="$color7" fontSize="$2">Broaden filters to see results.</Paragraph>
            </YStack>
          ) : (
            sales.map((sale) => {
              const isSelected = selectedSaleId === sale._id
              return (
                <XStack
                  key={sale._id}
                  onPress={() => setSelectedSaleId(sale._id)}
                  bg={isSelected ? 'rgba(232, 162, 48, 0.12)' : 'rgba(25, 25, 28, 0.65)'}
                  borderWidth={1}
                  borderColor={isSelected ? '#FFAF20' : 'rgba(255, 255, 255, 0.08)'}
                  rounded="$4"
                  p="$2.5"
                  gap="$3"
                  items="center"
                  hoverStyle={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                  pressStyle={{ bg: 'rgba(232, 162, 48, 0.12)' }}
                  cursor="pointer"
                  style={{ overflow: 'hidden' }}
                >
                  {isSelected ? (
                    <YStack bg="#FFAF20" style={{ position: 'absolute' as any, left: 0, top: 0, bottom: 0, width: 3 }} />
                  ) : null}
                  <YStack flex={1} gap="$0.5">
                    <Paragraph fontWeight="700" fontSize="$3" color={isSelected ? '#FFFFFF' : '$color12'}>{sale.saleCode}</Paragraph>
                    <Paragraph color={isSelected ? 'rgba(255,255,255,0.7)' : '$color7'} fontSize="$1">
                      {formatDateTime(sale.createdAt)} · {paymentMethodLabel(sale.paymentMethod)}
                    </Paragraph>
                    <Paragraph color={isSelected ? 'rgba(255,255,255,0.7)' : '$color7'} fontSize="$1">{sale.customerName || 'Walk-in'}</Paragraph>
                  </YStack>
                  <YStack items="flex-end" gap="$0.5">
                    <StatusBadge status={sale.status} />
                    <Paragraph fontWeight="700" fontSize="$3" color={isSelected ? '#FFAF20' : '$color12'}>{formatCurrency(sale.total)}</Paragraph>
                    <Paragraph color={isSelected ? 'rgba(255,255,255,0.7)' : '$color7'} fontSize="$1">{formatNumber(sale.totalQty)} units</Paragraph>
                  </YStack>
                </XStack>
              )
            })
          )}

          {status === 'CanLoadMore' ? (
            <XStack justify="center" py="$2">
              <Button bg="rgba(25, 25, 28, 0.65)" hoverStyle={{ bg: 'rgba(255, 255, 255, 0.05)' }} borderColor="rgba(255, 255, 255, 0.08)" borderWidth={1} size="$3" onPress={() => loadMore(24)}>Load more</Button>
            </XStack>
          ) : null}
        </YStack>

        {/* Detail panel */}
        <YStack flex={desktop ? 1 : undefined} style={{ minWidth: desktop ? 380 : 0, width: desktop ? undefined : '100%' }}>
          <SaleDetailPanel saleId={selectedSaleId} />
        </YStack>
      </XStack>
    </YStack>
  )
}
