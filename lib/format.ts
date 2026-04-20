const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const shortDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const longDateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const businessDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatCurrency(value: number) {
  return moneyFormatter.format(value ?? 0)
}

export function formatDate(value: number | string | null | undefined) {
  if (!value) return '—'
  if (typeof value === 'string') return value
  return shortDateFormatter.format(new Date(value))
}

export function formatDateTime(value: number | string | null | undefined) {
  if (!value) return '—'
  if (typeof value === 'string') return value
  return longDateTimeFormatter.format(new Date(value))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value ?? 0)
}

export function makeBusinessDateKey(value = Date.now()) {
  return businessDateFormatter.format(new Date(value))
}

export function stockStateLabel(stockState: 'in_stock' | 'low_stock' | 'out_of_stock') {
  switch (stockState) {
    case 'in_stock':
      return 'In Stock'
    case 'low_stock':
      return 'Low Stock'
    case 'out_of_stock':
      return 'Out of Stock'
  }
}

export function stockStateTheme(stockState: 'in_stock' | 'low_stock' | 'out_of_stock') {
  switch (stockState) {
    case 'in_stock':
      return 'green'
    case 'low_stock':
      return 'yellow'
    case 'out_of_stock':
      return 'red'
  }
}

export function paymentMethodLabel(method: 'cash' | 'upi_mock') {
  return method === 'cash' ? 'Cash' : 'UPI (Mock)'
}
