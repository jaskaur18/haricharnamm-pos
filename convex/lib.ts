import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const STORE_TIME_ZONE = "Asia/Kolkata";

export type ProductStatus = "active" | "archived";
export type PaymentMethod = "cash" | "upi_mock";
export type SaleStatus = "completed" | "returned_partial" | "returned_full";
export type ReturnStatus = "completed";
export type MovementType =
  | "none"
  | "opening"
  | "manual_adjustment"
  | "sale"
  | "return";

export type StockState = "in_stock" | "low_stock" | "out_of_stock";

export const nullableStringValidator = v.union(v.string(), v.null());
export const nullableCategoryIdValidator = v.union(v.id("categories"), v.null());
export const nullableCustomerIdValidator = v.union(v.id("customers"), v.null());
export const nullableProductIdValidator = v.union(v.id("products"), v.null());
export const nullableVariantIdValidator = v.union(v.id("productVariants"), v.null());

export const productStatusValidator = v.union(
  v.literal("active"),
  v.literal("archived"),
);
export const paymentMethodValidator = v.union(
  v.literal("cash"),
  v.literal("upi_mock"),
);
export const saleStatusValidator = v.union(
  v.literal("completed"),
  v.literal("returned_partial"),
  v.literal("returned_full"),
);
export const returnStatusValidator = v.literal("completed");
export const movementTypeValidator = v.union(
  v.literal("none"),
  v.literal("opening"),
  v.literal("manual_adjustment"),
  v.literal("sale"),
  v.literal("return"),
);

export const variantAttributeValidator = v.array(
  v.object({
    name: v.string(),
    value: v.string(),
  }),
);

export const cartLineValidator = v.object({
  variantId: v.id("productVariants"),
  quantity: v.number(),
  lineDiscount: v.number(),
});

export function normalizeMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLineTotal(
  unitPrice: number,
  quantity: number,
  lineDiscount: number,
) {
  return normalizeMoney(unitPrice * quantity - lineDiscount);
}

export function deriveStockStatus(onHand: number, reorderThreshold: number): StockState {
  if (onHand <= 0) return "out_of_stock";
  if (onHand <= reorderThreshold) return "low_stock";
  return "in_stock";
}

export function makeBusinessDate(timestamp: number) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: STORE_TIME_ZONE,
  }).format(new Date(timestamp));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildProductCode(sequenceNumber: number) {
  return `HC-P-${String(sequenceNumber).padStart(6, "0")}`;
}

export function buildSaleCode(sequenceNumber: number) {
  return `HC-S-${String(sequenceNumber).padStart(6, "0")}`;
}

export function buildReturnCode(sequenceNumber: number) {
  return `HC-R-${String(sequenceNumber).padStart(6, "0")}`;
}

export function makeSearchText(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => !!part && part.trim().length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function nextSequence(
  ctx: MutationCtx,
  key: "product" | "sale" | "return",
) {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!counter) {
    await ctx.db.insert("counters", {
      key,
      value: 1,
      updatedAt: Date.now(),
    });
    return 1;
  }

  const nextValue = counter.value + 1;
  await ctx.db.patch(counter._id, {
    value: nextValue,
    updatedAt: Date.now(),
  });
  return nextValue;
}

export async function getInventoryLevelOrThrow(
  ctx: QueryCtx | MutationCtx,
  variantId: Id<"productVariants">,
) {
  const inventoryLevel = await ctx.db
    .query("inventoryLevels")
    .withIndex("by_variantId", (q) => q.eq("variantId", variantId))
    .unique();

  if (!inventoryLevel) {
    throw new Error("Inventory level missing for variant");
  }

  return inventoryLevel;
}

export async function getPrimaryMediaUrl(
  ctx: QueryCtx | MutationCtx,
  productId: Id<"products">,
  variantId: Id<"productVariants"> | null = null,
) {
  const mediaQuery = variantId
    ? ctx.db
        .query("productMedia")
        .withIndex("by_variantId_and_sortOrder", (q) => q.eq("variantId", variantId))
    : ctx.db
        .query("productMedia")
        .withIndex("by_productId_and_sortOrder", (q) => q.eq("productId", productId));

  const mediaRows = await mediaQuery.take(1);
  if (mediaRows.length === 0) {
    return null;
  }

  return await ctx.storage.getUrl(mediaRows[0].storageId);
}

export async function touchInventoryLevel(
  ctx: MutationCtx,
  variantId: Id<"productVariants">,
  nextOnHand: number,
  movementType: MovementType,
  referenceCode: string | null,
  timestamp: number,
  lastSaleAt?: number | null,
) {
  const inventoryLevel = await getInventoryLevelOrThrow(ctx, variantId);

  await ctx.db.patch(inventoryLevel._id, {
    onHand: nextOnHand,
    lastMovementAt: timestamp,
    lastMovementType: movementType,
    lastReferenceCode: referenceCode,
    lastSaleAt:
      typeof lastSaleAt === "number" ? lastSaleAt : inventoryLevel.lastSaleAt,
    updatedAt: timestamp,
  });
}

export async function upsertCustomer(
  ctx: MutationCtx,
  name: string | null,
  phone: string | null,
) {
  if (!name && !phone) {
    return null;
  }

  if (phone) {
    const existingByPhone = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();

    if (existingByPhone) {
      await ctx.db.patch(existingByPhone._id, {
        name: name ?? existingByPhone.name,
        updatedAt: Date.now(),
      });
      return existingByPhone._id;
    }
  }

  return await ctx.db.insert("customers", {
    name: name ?? "Walk-in Customer",
    phone,
    notes: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

type DailyRollupDelta = {
  grossRevenue: number;
  orderCount: number;
  unitsCount: number;
  lineDiscountTotal: number;
  orderDiscountTotal: number;
  returnCount: number;
  returnValue: number;
  cashRevenue: number;
  upiRevenue: number;
};

export async function applyDailyRollupDelta(
  ctx: MutationCtx,
  businessDate: string,
  delta: DailyRollupDelta,
) {
  const existing = await ctx.db
    .query("dailySalesRollups")
    .withIndex("by_businessDate", (q) => q.eq("businessDate", businessDate))
    .unique();

  const nextValues = existing
    ? {
        grossRevenue: normalizeMoney(existing.grossRevenue + delta.grossRevenue),
        orderCount: existing.orderCount + delta.orderCount,
        unitsCount: existing.unitsCount + delta.unitsCount,
        lineDiscountTotal: normalizeMoney(
          existing.lineDiscountTotal + delta.lineDiscountTotal,
        ),
        orderDiscountTotal: normalizeMoney(
          existing.orderDiscountTotal + delta.orderDiscountTotal,
        ),
        returnCount: existing.returnCount + delta.returnCount,
        returnValue: normalizeMoney(existing.returnValue + delta.returnValue),
        cashRevenue: normalizeMoney(existing.cashRevenue + delta.cashRevenue),
        upiRevenue: normalizeMoney(existing.upiRevenue + delta.upiRevenue),
      }
    : {
        grossRevenue: normalizeMoney(delta.grossRevenue),
        orderCount: delta.orderCount,
        unitsCount: delta.unitsCount,
        lineDiscountTotal: normalizeMoney(delta.lineDiscountTotal),
        orderDiscountTotal: normalizeMoney(delta.orderDiscountTotal),
        returnCount: delta.returnCount,
        returnValue: normalizeMoney(delta.returnValue),
        cashRevenue: normalizeMoney(delta.cashRevenue),
        upiRevenue: normalizeMoney(delta.upiRevenue),
      };

  if (!existing) {
    await ctx.db.insert("dailySalesRollups", {
      businessDate,
      ...nextValues,
      updatedAt: Date.now(),
    });
    return;
  }

  await ctx.db.patch(existing._id, {
    ...nextValues,
    updatedAt: Date.now(),
  });
}

export async function applyVariantDailyDelta(
  ctx: MutationCtx,
  payload: {
    businessDate: string;
    productId: Id<"products">;
    variantId: Id<"productVariants">;
    categoryId: Id<"categories">;
    subcategoryId: Id<"categories"> | null;
    productCode: string;
    productName: string;
    variantLabel: string;
    soldQty: number;
    soldRevenue: number;
    returnQty: number;
    returnValue: number;
    lastSoldAt: number | null;
    lastReturnedAt: number | null;
  },
) {
  const existing = await ctx.db
    .query("variantDailySales")
    .withIndex("by_businessDate_and_variantId", (q) =>
      q.eq("businessDate", payload.businessDate).eq("variantId", payload.variantId),
    )
    .unique();

  if (!existing) {
    await ctx.db.insert("variantDailySales", {
      ...payload,
      soldRevenue: normalizeMoney(payload.soldRevenue),
      returnValue: normalizeMoney(payload.returnValue),
      updatedAt: Date.now(),
    });
    return;
  }

  await ctx.db.patch(existing._id, {
    soldQty: existing.soldQty + payload.soldQty,
    soldRevenue: normalizeMoney(existing.soldRevenue + payload.soldRevenue),
    returnQty: existing.returnQty + payload.returnQty,
    returnValue: normalizeMoney(existing.returnValue + payload.returnValue),
    lastSoldAt: payload.lastSoldAt ?? existing.lastSoldAt,
    lastReturnedAt: payload.lastReturnedAt ?? existing.lastReturnedAt,
    updatedAt: Date.now(),
  });
}

export function computeSaleStatus(
  totalQuantity: number,
  returnedQuantity: number,
): SaleStatus {
  if (returnedQuantity <= 0) {
    return "completed";
  }
  if (returnedQuantity >= totalQuantity) {
    return "returned_full";
  }
  return "returned_partial";
}
