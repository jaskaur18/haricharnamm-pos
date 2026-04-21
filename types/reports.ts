/**
 * Shared types for reports & dashboard data returned from Convex queries.
 * Replaces the pervasive `as any` casts across ReportsScreen, DashboardScreen,
 * and SuggestionCard.
 */

/** A single suggestion row in the dashboard (low-stock, trending, slow-moving, returns) */
export type SuggestionRow = {
  productName?: string
  productCode?: string
  displayCode?: string
  variantLabel?: string
  returnCode?: string
  saleCode?: string
  onHand?: number
  growthRate?: number
  createdAt?: number
}

/** Exception card in the reports overview */
export type ExceptionCard = {
  title: string
  value: string | number
  tone: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  detail?: string
}

/** A single return entry within a return report item */
export type ReturnEntry = {
  variantLabel: string
  displayCode: string
  quantity: number
  refundAmount: number
}

/** A single return report item */
export type ReturnReportItem = {
  _id: string
  returnCode: string
  saleCode: string
  createdAt: number
  refundMethod: string
  refundTotal: number
  items: ReturnEntry[]
}

/** Reports overview metrics */
export type OverviewMetrics = {
  revenue: number
  orderCount: number
  unitsSold: number
  avgOrderValue: number
  paymentMix: { cash: number; upi: number }
}

/** Reports overview response */
export type OverviewReport = {
  metrics: OverviewMetrics
  suggestions: {
    lowStockSoon: SuggestionRow[]
    slowMoving: SuggestionRow[]
    trendingUp: SuggestionRow[]
    recentReturns: SuggestionRow[]
  }
  exceptionCards: ExceptionCard[]
}

/** Variant option from inventory query for filter dropdowns */
export type VariantOption = {
  _id: string
  productId: string
  displayCode: string
  label: string
  productName?: string
}

/** Product variant detail in showcase dialog */
export type VariantDetail = {
  label: string
  optionSummary?: string
  displayCode?: string
  salePrice: number
  onHand: number
  reorderThreshold?: number
  attributes: VariantAttribute[]
}

/** Attribute on a product variant */
export type VariantAttribute = {
  name: string
  value: string
}

/** Media item in product gallery */
export type MediaItem = {
  _id: string
  url: string
  contentType?: string
}
