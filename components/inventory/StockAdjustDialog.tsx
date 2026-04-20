import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, TextArea, XStack, YStack } from 'tamagui'
import { convexApi } from 'lib/convex'
import { getErrorMessage } from 'lib/errors'
import { formatNumber } from 'lib/format'
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
          <Input value={quantityDelta} onChangeText={setQuantityDelta} keyboardType="numeric" placeholder="e.g. 12 or -2" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
        </FormField>

        <FormField label="Reason">
          <Input value={reason} onChangeText={setReason} placeholder="e.g. Shelf count correction" bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
        </FormField>

        <FormField label="Note">
          <TextArea value={note} onChangeText={setNote} placeholder="Optional" style={{ minHeight: 60 }} bg="$color3" borderWidth={0} hoverStyle={{ bg: '$color4' }} focusStyle={{ bg: '$color4' }} />
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
