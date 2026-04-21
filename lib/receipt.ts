import { Platform } from 'react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { formatCurrency, formatDateTime, paymentMethodLabel } from './format'
import { HARI_CHARNAMM_LOGO_B64 } from './logoBase64'

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
        <tr style="border-bottom: 1px dashed #e5e5e5;">
          <td style="padding: 12px 0;">
            <div style="font-weight: 600; color: #111;">${item.productName}</div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">${item.variantLabel}</div>
          </td>
          <td style="padding: 12px 0; text-align: center; color: #444; font-size: 13px;">x${item.quantity}</td>
          <td style="padding: 12px 0; text-align: right; color: #111; font-weight: 500;">${formatCurrency(item.lineTotal)}</td>
        </tr>`,
    )
    .join('')

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            padding: 40px 20px;
            color: #111;
            background: #f7f7f7;
            margin: 0;
            display: flex;
            justify-content: center;
          }
          .receipt-container {
            width: 100%;
            max-width: 420px;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.06);
            overflow: hidden;
          }
          .header {
            text-align: center;
            padding: 32px 24px 24px;
          }
          .logo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin: 0 auto 16px;
            display: block;
            object-fit: cover;
            border: 1px solid #f0f0f0;
          }
          .brand-name {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: #000;
          }
          .brand-tagline {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
            padding: 0 20px;
          }
          .meta-info {
            background: #fafafa;
            border-top: 1px dashed #e5e5e5;
            border-bottom: 1px dashed #e5e5e5;
            padding: 16px 24px;
            margin-top: 24px;
            font-size: 12px;
            color: #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .meta-info strong {
            color: #111;
            display: block;
            margin-bottom: 2px;
            font-size: 13px;
          }
          .body-content {
            padding: 24px;
          }
          .customer-details {
            font-size: 13px;
            color: #444;
            margin-bottom: 24px;
            padding: 14px;
            background: #fdfdfd;
            border: 1px solid #eaeaea;
            border-radius: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 24px;
          }
          th {
            text-align: left;
            color: #888;
            font-weight: 500;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding-bottom: 12px;
            border-bottom: 1px solid #000;
          }
          .totals {
            margin-left: auto;
            width: 240px;
            font-size: 13px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            color: #444;
          }
          .totals-row.grand-total {
            border-top: 2px solid #111;
            padding-top: 16px;
            margin-top: 8px;
            font-size: 18px;
            font-weight: 700;
            color: #000;
          }
          .footer {
            text-align: center;
            padding: 24px;
            background: #fafafa;
            color: #888;
            font-size: 11px;
            border-top: 1px dashed #e5e5e5;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <img class="logo" src="${HARI_CHARNAMM_LOGO_B64}" alt="Hari Charnamm Logo" />
            <div class="brand-name">HARI CHARNAMM</div>
            <div class="brand-tagline">Unique & Handmade Lord Accessories</div>
          </div>
          
          <div class="meta-info">
            <div>
              <strong>Order ID</strong>
              ${sale.saleCode}
            </div>
            <div style="text-align: right;">
              <strong>${formatDateTime(sale.createdAt)}</strong>
              Paid via ${paymentMethodLabel(sale.paymentMethod)}
            </div>
          </div>

          <div class="body-content">
            <div class="customer-details">
              <strong style="color:#000;">Customer Bill To</strong><br/>
              <span style="font-size: 14px; font-weight: 600; display: block; margin: 4px 0;">${sale.customerName || 'Walk-in Customer'}</span>
              ${sale.customerPhone || 'No contact provided'}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Descriptor</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="totals">
              <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(sale.subtotal)}</span></div>
              <div class="totals-row"><span>Line Discount</span><span>-${formatCurrency(sale.lineDiscountTotal)}</span></div>
              <div class="totals-row"><span>Order Discount</span><span>-${formatCurrency(sale.orderDiscount)}</span></div>
              <div class="totals-row grand-total"><span>Total Paid</span><span>${formatCurrency(sale.total)}</span></div>
            </div>
          </div>

          <div class="footer">
            Thank you for shopping with Hari Charnamm.<br/>
            Please retain this receipt for your records.
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
