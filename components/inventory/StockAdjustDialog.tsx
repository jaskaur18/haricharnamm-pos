import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, TextArea, XStack, YStack } from 'tamagui'
import { convexApi } from 'lib/convex'
import { getErrorMessage } from 'lib/errors'
import { formatNumber } from 'lib/format'
import { hapticMedium } from 'lib/haptics'
import { FormField } from 'components/ui/FormField'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'

export type InventoryItem = {
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

function todayISO() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

export function StockAdjustDialog({
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
  const [purchaseDate, setPurchaseDate] = useState(todayISO())
  const [seller, setSeller] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !item) {
      setQuantityDelta('0')
      setReason('')
      setNote('')
      setPurchaseDate(todayISO())
      setSeller('')
    }
  }, [open, item])

  async function handleAdjust() {
    if (!item) return
    if (!reason.trim()) {
      toast.show('Reason is required')
      return
    }

    // Build note with seller and date info
    const parts: string[] = []
    if (seller.trim()) parts.push(`Seller: ${seller.trim()}`)
    if (purchaseDate) parts.push(`Purchase date: ${purchaseDate}`)
    if (note.trim()) parts.push(note.trim())
    const fullNote = parts.length > 0 ? parts.join(' | ') : null

    setIsSaving(true)
    try {
      const result = await adjustStock({
        variantId: item._id,
        quantityDelta: Number(quantityDelta || 0),
        reason: reason.trim(),
        note: fullNote,
      })
      hapticMedium()
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

  const delta = Number(quantityDelta || 0)
  const projected = (item?.onHand ?? 0) + delta

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Stock Adjustment">
      <YStack gap="$3" py="$2">
        {/* Product info card */}
        <YStack bg="$color2" rounded="$4" p="$3" gap="$1.5" borderWidth={1} borderColor="$borderColor">
          <Paragraph fontWeight="700" fontSize="$3">{item?.productName}</Paragraph>
          <Paragraph color="$color8" fontSize="$2">{item?.displayCode} · {item?.label}</Paragraph>
          <XStack justify="space-between" items="center" mt="$1">
            <YStack>
              <Paragraph color="$color8" fontSize={10}>CURRENT</Paragraph>
              <Paragraph fontWeight="800" fontSize="$4">{item ? formatNumber(item.onHand) : '—'}</Paragraph>
            </YStack>
            {delta !== 0 ? (
              <>
                <Paragraph color="$color8" fontSize="$3">→</Paragraph>
                <YStack items="flex-end">
                  <Paragraph color="$color8" fontSize={10}>PROJECTED</Paragraph>
                  <Paragraph fontWeight="800" fontSize="$4" color={projected <= 0 ? '$red10' : '$green10'}>{formatNumber(projected)}</Paragraph>
                </YStack>
              </>
            ) : null}
          </XStack>
        </YStack>

        {/* Quantity + reason row */}
        <XStack gap="$2">
          <YStack flex={1}>
            <FormField label="Quantity ±" description="Positive = intake, negative = deduction">
              <Input
                value={quantityDelta}
                onChangeText={setQuantityDelta}
                keyboardType="numeric"
                placeholder="e.g. 12 or -2"
                bg="$color3"
                borderWidth={0}
                px="$3"
                autoFocus
              />
            </FormField>
          </YStack>
          <YStack flex={1}>
            <FormField label="Reason *">
              <Input
                value={reason}
                onChangeText={setReason}
                placeholder="New batch, correction…"
                bg="$color3"
                borderWidth={0}
                px="$3"
              />
            </FormField>
          </YStack>
        </XStack>

        {/* Purchase date + seller */}
        <XStack gap="$2">
          <YStack flex={1}>
            <FormField label="Purchase date" description="When stock was bought">
              <Input
                value={purchaseDate}
                onChangeText={setPurchaseDate}
                placeholder="YYYY-MM-DD"
                bg="$color3"
                borderWidth={0}
                px="$3"
              />
            </FormField>
          </YStack>
          <YStack flex={1}>
            <FormField label="Bought from" description="Seller / supplier name">
              <Input
                value={seller}
                onChangeText={setSeller}
                placeholder="Supplier name"
                bg="$color3"
                borderWidth={0}
                px="$3"
              />
            </FormField>
          </YStack>
        </XStack>

        <FormField label="Note">
          <TextArea
            value={note}
            onChangeText={setNote}
            placeholder="Optional extra details"
            style={{ minHeight: 50 }}
            bg="$color3"
            borderWidth={0}
            px="$3"
            py="$2"
          />
        </FormField>

        <XStack justify="flex-end" gap="$2">
          <Button bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} onPress={() => onOpenChange(false)} size="$3">
            Cancel
          </Button>
          <Button theme="accent" onPress={handleAdjust} disabled={isSaving} size="$3" hoverStyle={{ scale: 1.02 }} pressStyle={{ scale: 0.97 }}>
            {isSaving ? 'Saving…' : 'Apply'}
          </Button>
        </XStack>
      </YStack>
    </ResponsiveDialog>
  )
}
