export interface UpiLinkParams {
  /**
   * The amount to request, formatted as a string with exactly 2 decimal places.
   * Standard UPI format requires amount to be defined if passing am=
   */
  amount?: string

  /**
   * Optional transaction note or order ID
   */
  transactionNote?: string
}

const DEFAULT_UPI_VPA = 'yourmerchant@ybl'
const DEFAULT_UPI_MERCHANT_NAME = 'Hari Charnamm'
const CURRENCY_CODE = 'INR'

/**
 * Builds a universal dynamic UPI intent string URI
 */
export function generateUpiUrl({ amount, transactionNote = 'POS-WEB' }: UpiLinkParams): string {
  // Use expo-env variables for dynamic resolution (bakes during build)
  const vpa = process.env.EXPO_PUBLIC_UPI_VPA || DEFAULT_UPI_VPA
  const merchantName = process.env.EXPO_PUBLIC_UPI_MERCHANT_NAME || DEFAULT_UPI_MERCHANT_NAME

  const params = new URLSearchParams()
  params.set('pa', vpa)
  params.set('pn', merchantName)
  params.set('cu', CURRENCY_CODE)

  if (amount) {
    if (isNaN(parseFloat(amount))) {
      console.warn('generateUpiUrl was passed a non-numeric string. Falling back to 0.00')
      params.set('am', '0.00')
    } else {
      params.set('am', parseFloat(amount).toFixed(2))
    }
  }

  if (transactionNote) {
    params.set('tr', transactionNote)
  }

  return `upi://pay?${params.toString()}`
}
