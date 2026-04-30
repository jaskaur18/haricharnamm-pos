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
        <tr class="item-row">
          <td class="item-desc">
            <div>${item.productName}</div>
            <div class="item-variant">${item.variantLabel}</div>
          </td>
          <td class="item-qty">x${item.quantity}</td>
          <td class="item-price">${formatCurrency(item.lineTotal)}</td>
        </tr>`,
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            font-size: 12px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 10px;
            text-transform: uppercase;
            width: 100%;
            box-sizing: border-box;
          }
          .receipt-container {
            width: 100%;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 12px;
          }
          .logo {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            margin: 0 auto 8px;
            display: block;
            filter: grayscale(100%);
          }
          .brand-name {
            font-size: 18px;
            font-weight: 700;
          }
          .brand-tagline {
            font-size: 10px;
            margin-top: 2px;
          }
          .gst-info {
            font-size: 10px;
            margin-top: 4px;
            font-weight: bold;
          }
          .divider {
            border-bottom: 1px dashed #000;
            margin: 10px 0;
          }
          .meta-info {
            font-size: 11px;
            line-height: 1.4;
          }
          .customer-details {
            font-size: 11px;
            margin-top: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin: 10px 0;
          }
          th {
            text-align: left;
            border-bottom: 1px dashed #000;
            padding-bottom: 4px;
            font-weight: 700;
          }
          .item-row td {
            padding: 6px 0;
            vertical-align: top;
          }
          .item-desc {
            width: 50%;
            padding-right: 5px;
          }
          .item-variant {
            font-size: 10px;
            margin-top: 2px;
          }
          .item-qty {
            width: 20%;
            text-align: center;
          }
          .item-price {
            width: 30%;
            text-align: right;
            font-weight: 700;
          }
          .totals {
            margin-left: auto;
            width: 100%;
            font-size: 11px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .grand-total {
            border-top: 1px dashed #000;
            padding-top: 6px;
            margin-top: 4px;
            font-size: 14px;
            font-weight: 700;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            margin-top: 16px;
            line-height: 1.5;
          }
          .social {
            margin-top: 8px;
            font-size: 11px;
            font-weight: 700;
          }
          .sanskrit {
            font-family: sans-serif;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <img class="logo" src="${HARI_CHARNAMM_LOGO_B64}" alt="Logo" />
            <div class="brand-name">HARI CHARNAMM</div>
            <div class="brand-tagline">Unique Lord Accessories</div>
            <div class="gst-info">GSTIN: 09AAACA1234A1Z5</div>
          </div>
          
          <div class="meta-info">
            <div>DATE: ${formatDateTime(sale.createdAt)}</div>
            <div>BILL: ${sale.saleCode}</div>
            <div>PAID: ${paymentMethodLabel(sale.paymentMethod).toUpperCase()}</div>
          </div>

          ${sale.customerName || sale.customerPhone ? `
          <div class="customer-details">
            <div>CUST: ${sale.customerName || ''}</div>
            <div>${sale.customerPhone || ''}</div>
          </div>
          ` : ''}

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th>ITEM</th>
                <th style="text-align:center;">QTY</th>
                <th style="text-align:right;">AMT</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="divider"></div>

          <div class="totals">
            <div class="totals-row"><span>SUBTOTAL</span><span>${formatCurrency(sale.subtotal)}</span></div>
            ${sale.lineDiscountTotal > 0 ? `<div class="totals-row"><span>ITEM DISC</span><span>-${formatCurrency(sale.lineDiscountTotal)}</span></div>` : ''}
            ${sale.orderDiscount > 0 ? `<div class="totals-row"><span>ORDER DISC</span><span>-${formatCurrency(sale.orderDiscount)}</span></div>` : ''}
            <div class="totals-row grand-total"><span>TOTAL PAID</span><span>${formatCurrency(sale.total)}</span></div>
          </div>

          <div class="divider"></div>

          <div class="footer">
            <div>THANK YOU FOR SHOPPING!</div>
            <div class="social">IG: @lord_accesories</div>
            <div class="sanskrit">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">राधे राधे 🙏</div>
              <div style="font-size: 14px;">सर्वे भवन्तु सुखिनः</div>
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
