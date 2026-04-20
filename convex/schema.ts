import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  movementTypeValidator,
  nullableCategoryIdValidator,
  nullableCustomerIdValidator,
  nullableProductIdValidator,
  nullableStringValidator,
  nullableVariantIdValidator,
  paymentMethodValidator,
  productStatusValidator,
  returnStatusValidator,
  saleStatusValidator,
  variantAttributeValidator,
} from "./lib";

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    parentCategoryId: nullableCategoryIdValidator,
    level: v.union(v.literal("category"), v.literal("subcategory")),
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_parentCategoryId_and_sortOrder", ["parentCategoryId", "sortOrder"])
    .index("by_level_and_parentCategoryId", ["level", "parentCategoryId"]),

  products: defineTable({
    sequenceNumber: v.number(),
    productCode: v.string(),
    name: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    subcategoryId: nullableCategoryIdValidator,
    status: productStatusValidator,
    brandCopy: v.string(),
    notes: nullableStringValidator,
    merchandisingTags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_productCode", ["productCode"])
    .index("by_categoryId_and_status", ["categoryId", "status"])
    .index("by_subcategoryId_and_status", ["subcategoryId", "status"]),

  productVariants: defineTable({
    productId: v.id("products"),
    productCode: v.string(),
    productName: v.string(),
    categoryId: v.id("categories"),
    subcategoryId: nullableCategoryIdValidator,
    status: productStatusValidator,
    sequenceNumber: v.number(),
    displayCode: v.string(),
    barcode: nullableStringValidator,
    label: v.string(),
    optionSummary: v.string(),
    attributes: variantAttributeValidator,
    salePrice: v.number(),
    reorderThreshold: v.number(),
    searchText: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_displayCode", ["displayCode"])
    .index("by_barcode", ["barcode"])
    .index("by_categoryId", ["categoryId"])
    .index("by_subcategoryId", ["subcategoryId"])
    .index("by_status", ["status"])
    .index("by_status_and_categoryId", ["status", "categoryId"])
    .index("by_status_and_subcategoryId", ["status", "subcategoryId"])
    .searchIndex("search_by_searchText", {
      searchField: "searchText",
      filterFields: ["status", "categoryId", "subcategoryId", "productId"],
    }),

  inventoryLevels: defineTable({
    variantId: v.id("productVariants"),
    onHand: v.number(),
    lastMovementAt: v.number(),
    lastMovementType: movementTypeValidator,
    lastReferenceCode: nullableStringValidator,
    lastSaleAt: v.union(v.number(), v.null()),
    updatedAt: v.number(),
  })
    .index("by_variantId", ["variantId"])
    .index("by_onHand", ["onHand"]),

  stockMovements: defineTable({
    variantId: v.id("productVariants"),
    productId: v.id("products"),
    businessDate: v.string(),
    type: movementTypeValidator,
    quantityDelta: v.number(),
    quantityAfter: v.number(),
    reason: nullableStringValidator,
    referenceCode: nullableStringValidator,
    note: nullableStringValidator,
    createdAt: v.number(),
  })
    .index("by_variantId_and_createdAt", ["variantId", "createdAt"])
    .index("by_businessDate_and_type", ["businessDate", "type"]),

  productMedia: defineTable({
    productId: v.id("products"),
    variantId: nullableVariantIdValidator,
    storageId: v.id("_storage"),
    caption: nullableStringValidator,
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_productId_and_sortOrder", ["productId", "sortOrder"])
    .index("by_variantId_and_sortOrder", ["variantId", "sortOrder"])
    .index("by_storageId", ["storageId"]),

  customers: defineTable({
    name: v.string(),
    phone: nullableStringValidator,
    notes: nullableStringValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_name", ["name"]),

  sales: defineTable({
    sequenceNumber: v.number(),
    saleCode: v.string(),
    businessDate: v.string(),
    status: saleStatusValidator,
    paymentMethod: paymentMethodValidator,
    paymentNote: nullableStringValidator,
    subtotal: v.number(),
    lineDiscountTotal: v.number(),
    orderDiscount: v.number(),
    total: v.number(),
    totalQty: v.number(),
    itemCount: v.number(),
    customerId: nullableCustomerIdValidator,
    customerName: nullableStringValidator,
    customerPhone: nullableStringValidator,
    notes: nullableStringValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_saleCode", ["saleCode"])
    .index("by_businessDate", ["businessDate"])
    .index("by_status_and_businessDate", ["status", "businessDate"])
    .index("by_paymentMethod_and_businessDate", ["paymentMethod", "businessDate"]),

  saleItems: defineTable({
    saleId: v.id("sales"),
    businessDate: v.string(),
    paymentMethod: paymentMethodValidator,
    saleStatus: saleStatusValidator,
    productId: v.id("products"),
    variantId: v.id("productVariants"),
    categoryId: v.id("categories"),
    subcategoryId: nullableCategoryIdValidator,
    productCode: v.string(),
    productName: v.string(),
    variantLabel: v.string(),
    quantity: v.number(),
    returnedQuantity: v.number(),
    unitPrice: v.number(),
    lineDiscount: v.number(),
    lineTotal: v.number(),
    createdAt: v.number(),
  })
    .index("by_saleId", ["saleId"])
    .index("by_businessDate", ["businessDate"])
    .index("by_variantId_and_businessDate", ["variantId", "businessDate"])
    .index("by_productId_and_businessDate", ["productId", "businessDate"])
    .index("by_categoryId_and_businessDate", ["categoryId", "businessDate"])
    .index("by_subcategoryId_and_businessDate", ["subcategoryId", "businessDate"])
    .index("by_paymentMethod_and_businessDate", ["paymentMethod", "businessDate"]),

  returns: defineTable({
    sequenceNumber: v.number(),
    returnCode: v.string(),
    saleId: v.id("sales"),
    saleCode: v.string(),
    businessDate: v.string(),
    status: returnStatusValidator,
    refundMethod: paymentMethodValidator,
    refundNote: nullableStringValidator,
    subtotal: v.number(),
    totalQty: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_returnCode", ["returnCode"])
    .index("by_saleId", ["saleId"])
    .index("by_businessDate", ["businessDate"]),

  returnItems: defineTable({
    returnId: v.id("returns"),
    saleId: v.id("sales"),
    saleItemId: v.id("saleItems"),
    businessDate: v.string(),
    productId: v.id("products"),
    variantId: v.id("productVariants"),
    categoryId: v.id("categories"),
    subcategoryId: nullableCategoryIdValidator,
    productCode: v.string(),
    productName: v.string(),
    variantLabel: v.string(),
    quantity: v.number(),
    refundAmount: v.number(),
    createdAt: v.number(),
  })
    .index("by_returnId", ["returnId"])
    .index("by_businessDate", ["businessDate"])
    .index("by_categoryId_and_businessDate", ["categoryId", "businessDate"])
    .index("by_subcategoryId_and_businessDate", ["subcategoryId", "businessDate"])
    .index("by_variantId_and_businessDate", ["variantId", "businessDate"])
    .index("by_productId_and_businessDate", ["productId", "businessDate"]),

  counters: defineTable({
    key: v.string(),
    value: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  dailySalesRollups: defineTable({
    businessDate: v.string(),
    grossRevenue: v.number(),
    orderCount: v.number(),
    unitsCount: v.number(),
    lineDiscountTotal: v.number(),
    orderDiscountTotal: v.number(),
    returnCount: v.number(),
    returnValue: v.number(),
    cashRevenue: v.number(),
    upiRevenue: v.number(),
    updatedAt: v.number(),
  }).index("by_businessDate", ["businessDate"]),

  variantDailySales: defineTable({
    businessDate: v.string(),
    variantId: v.id("productVariants"),
    productId: v.id("products"),
    categoryId: v.id("categories"),
    subcategoryId: nullableCategoryIdValidator,
    productCode: v.string(),
    productName: v.string(),
    variantLabel: v.string(),
    soldQty: v.number(),
    soldRevenue: v.number(),
    returnQty: v.number(),
    returnValue: v.number(),
    lastSoldAt: v.union(v.number(), v.null()),
    lastReturnedAt: v.union(v.number(), v.null()),
    updatedAt: v.number(),
  })
    .index("by_businessDate_and_variantId", ["businessDate", "variantId"])
    .index("by_variantId_and_businessDate", ["variantId", "businessDate"])
    .index("by_productId_and_businessDate", ["productId", "businessDate"])
    .index("by_categoryId_and_businessDate", ["categoryId", "businessDate"])
    .index("by_subcategoryId_and_businessDate", ["subcategoryId", "businessDate"]),

  reportSnapshots: defineTable({
    key: v.string(),
    generatedDate: v.string(),
    generatedAt: v.number(),
    payload: v.string(),
  }).index("by_key", ["key"]),
});
