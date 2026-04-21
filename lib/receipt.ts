import { Platform } from 'react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { formatCurrency, formatDateTime, paymentMethodLabel } from './format'

type ReceiptSale = {
  saleCode: string
  createdAt: number
  paymentMethod: 'cash' | 'upi'
  customerName?: string | null
  customerPhone?: string | null
  subtotal: number
  lineDiscountTotal: number
  orderDiscount: number
  total: number
  items: Array<{
    productName: string
    variantLabel: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
}

export function saleDetailToReceipt(
  sale: {
    saleCode: string
    createdAt: number
    paymentMethod: 'cash' | 'upi'
    customerName?: string | null
    customerPhone?: string | null
    subtotal: number
    lineDiscountTotal: number
    orderDiscount: number
    total: number
    items: Array<{
      productName: string
      variantLabel: string
      quantity: number
      unitPrice: number
      lineTotal: number
    }>
  } | null,
) {
  if (!sale) {
    return null
  }

  const receipt: ReceiptSale = {
    saleCode: sale.saleCode,
    createdAt: sale.createdAt,
    paymentMethod: sale.paymentMethod,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    subtotal: sale.subtotal,
    lineDiscountTotal: sale.lineDiscountTotal,
    orderDiscount: sale.orderDiscount,
    total: sale.total,
    items: sale.items.map((item) => ({
      productName: item.productName,
      variantLabel: item.variantLabel,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  }

  return receipt
}

export function buildReceiptHtml(sale: ReceiptSale) {
  const rows = sale.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eadcc6;">
            <div style="font-weight:700">${item.productName}</div>
            <div style="font-size:12px;color:#7e5a39;">${item.variantLabel}</div>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eadcc6;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eadcc6;text-align:right;">${formatCurrency(
            item.lineTotal,
          )}</td>
        </tr>`,
    )
    .join('')

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="font-family: Arial, sans-serif; padding: 24px; color: #2b1808; background: #fffdfa;">
        <div style="max-width: 720px; margin: 0 auto; border: 1px solid #eadcc6; border-radius: 18px; overflow: hidden;">
          <div style="padding: 24px; background: linear-gradient(135deg, #f8efe0, #efd7b6);">
            <div style="font-size: 26px; font-weight: 800;">HARI CHARNAMM</div>
            <div style="margin-top: 4px; color: #7d4710;">We are providing unique and handmade Lord Accessories.</div>
            <div style="margin-top: 16px; font-size: 13px; color: #7e5a39;">
              Receipt ${sale.saleCode} • ${formatDateTime(sale.createdAt)} • ${paymentMethodLabel(
                sale.paymentMethod,
              )}
            </div>
          </div>
          <div style="padding: 24px;">
            <div style="display:flex; justify-content: space-between; gap: 24px; margin-bottom: 18px; font-size: 14px;">
              <div>
                <div style="font-weight:700;">Customer</div>
                <div>${sale.customerName || 'Walk-in customer'}</div>
                <div>${sale.customerPhone || ''}</div>
              </div>
            </div>
            <table style="width:100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="text-align:left; color:#7e5a39;">
                  <th style="padding-bottom:8px;">Item</th>
                  <th style="padding-bottom:8px; text-align:center;">Qty</th>
                  <th style="padding-bottom:8px; text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="margin-top: 24px; margin-left:auto; width:280px; font-size: 14px;">
              <div style="display:flex; justify-content:space-between; padding:6px 0;"><span>Subtotal</span><strong>${formatCurrency(
                sale.subtotal,
              )}</strong></div>
              <div style="display:flex; justify-content:space-between; padding:6px 0;"><span>Line discount</span><strong>${formatCurrency(
                sale.lineDiscountTotal,
              )}</strong></div>
              <div style="display:flex; justify-content:space-between; padding:6px 0;"><span>Order discount</span><strong>${formatCurrency(
                sale.orderDiscount,
              )}</strong></div>
              <div style="display:flex; justify-content:space-between; padding:10px 0; border-top:1px solid #eadcc6; font-size: 18px;"><span>Total</span><strong>${formatCurrency(
                sale.total,
              )}</strong></div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function handleReceiptOutput(html: string, saleCode: string) {
  if (Platform.OS === 'web') {
    const receiptWindow = window.open('', '_blank')
    if (!receiptWindow) return

    receiptWindow.document.write(html)
    receiptWindow.document.close()
    receiptWindow.focus()
    receiptWindow.print()
    return
  }

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  })

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      dialogTitle: `${saleCode} receipt`,
    })
    return
  }

  await Print.printAsync({ uri })
}
