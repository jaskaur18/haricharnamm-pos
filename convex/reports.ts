import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  getInventoryLevelOrThrow,
  getPrimaryMediaUrl,
  makeBusinessDate,
  normalizeMoney,
  nullableCategoryIdValidator,
  nullableProductIdValidator,
  nullableStringValidator,
  nullableVariantIdValidator,
  deriveStockStatus,
} from "./lib";

const publicApi = api as any;
type ReaderCtx = QueryCtx | MutationCtx;

type ReportFilters = {
  fromDate: string | null;
  toDate: string | null;
  categoryId: Id<"categories"> | null;
  subcategoryId: Id<"categories"> | null;
  productId: Id<"products"> | null;
  variantId: Id<"productVariants"> | null;
  paymentMethod: "all" | "cash" | "upi_mock";
  returnStatus: "all" | "completed";
  datePreset?: DatePreset;
  compareMode?: boolean;
  stockState?: StockFilter;
  movementBucket?: MovementBucket;
  salesStatus?: SalesStatusFilter;
  groupBy?: GroupBy;
  sortBy?: string | null;
};

type DatePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "previous_month"
  | "this_quarter"
  | "custom";
type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type MovementBucket =
  | "all"
  | "top_sellers"
  | "slow_movers"
  | "dead_stock"
  | "high_returns"
  | "discount_heavy";
type SalesStatusFilter =
  | "all"
  | "completed"
  | "returned_partial"
  | "returned_full";
type GroupBy = "day" | "week" | "category" | "payment" | "product";

const reportFilterArgs = {
  fromDate: nullableStringValidator,
  toDate: nullableStringValidator,
  categoryId: nullableCategoryIdValidator,
  subcategoryId: nullableCategoryIdValidator,
  productId: nullableProductIdValidator,
  variantId: nullableVariantIdValidator,
  paymentMethod: v.union(
    v.literal("all"),
    v.literal("cash"),
    v.literal("upi_mock"),
  ),
  returnStatus: v.union(v.literal("all"), v.literal("completed")),
  datePreset: v.optional(
    v.union(
      v.literal("today"),
      v.literal("yesterday"),
      v.literal("last_7_days"),
      v.literal("last_30_days"),
      v.literal("this_month"),
      v.literal("previous_month"),
      v.literal("this_quarter"),
      v.literal("custom"),
    ),
  ),
  compareMode: v.optional(v.boolean()),
  stockState: v.optional(
    v.union(
      v.literal("all"),
      v.literal("in_stock"),
      v.literal("low_stock"),
      v.literal("out_of_stock"),
    ),
  ),
  movementBucket: v.optional(
    v.union(
      v.literal("all"),
      v.literal("top_sellers"),
      v.literal("slow_movers"),
      v.literal("dead_stock"),
      v.literal("high_returns"),
      v.literal("discount_heavy"),
    ),
  ),
  salesStatus: v.optional(
    v.union(
      v.literal("all"),
      v.literal("completed"),
      v.literal("returned_partial"),
      v.literal("returned_full"),
    ),
  ),
  groupBy: v.optional(
    v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("category"),
      v.literal("payment"),
      v.literal("product"),
    ),
  ),
  sortBy: v.optional(v.union(v.string(), v.null())),
};

function dateKeyFromDate(date: Date) {
  return makeBusinessDate(date.getTime());
}

function resolveDatePresetRange(preset?: DatePreset) {
  if (!preset || preset === "custom") return null;
  const now = new Date();
  const today = dateKeyFromDate(now);
  if (preset === "today") {
    return { fromDate: today, toDate: today };
  }
  if (preset === "yesterday") {
    const value = new Date(now);
    value.setDate(value.getDate() - 1);
    const key = dateKeyFromDate(value);
    return { fromDate: key, toDate: key };
  }
  if (preset === "last_7_days") {
    const value = new Date(now);
    value.setDate(value.getDate() - 6);
    return { fromDate: dateKeyFromDate(value), toDate: today };
  }
  if (preset === "last_30_days") {
    const value = new Date(now);
    value.setDate(value.getDate() - 29);
    return { fromDate: dateKeyFromDate(value), toDate: today };
  }
  if (preset === "this_month") {
    const value = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: dateKeyFromDate(value), toDate: today };
  }
  if (preset === "previous_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { fromDate: dateKeyFromDate(start), toDate: dateKeyFromDate(end) };
  }
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
  return { fromDate: dateKeyFromDate(quarterStart), toDate: today };
}

function resolveReportFilters(filters: ReportFilters) {
  const presetRange =
    (!filters.fromDate || !filters.toDate) && filters.datePreset
      ? resolveDatePresetRange(filters.datePreset)
      : null;
  return {
    ...filters,
    fromDate: filters.fromDate ?? presetRange?.fromDate ?? null,
    toDate: filters.toDate ?? presetRange?.toDate ?? null,
    compareMode: filters.compareMode ?? false,
    stockState: filters.stockState ?? "all",
    movementBucket: filters.movementBucket ?? "all",
    salesStatus: filters.salesStatus ?? "all",
    groupBy: filters.groupBy ?? "day",
    sortBy: filters.sortBy ?? null,
  };
}

function withDateBounds(filters: ReportFilters) {
  const resolved = resolveReportFilters(filters);
  return {
    fromDate: resolved.fromDate ?? "0000-01-01",
    toDate: resolved.toDate ?? "9999-12-31",
  };
}

function parseDateKey(date: string) {
  return new Date(`${date}T00:00:00`);
}

function previousPeriodFor(filters: ReportFilters): ReportFilters {
  const resolved = resolveReportFilters(filters);
  if (!resolved.fromDate || !resolved.toDate) {
    return { ...resolved, compareMode: false };
  }
  const from = parseDateKey(resolved.fromDate);
  const to = parseDateKey(resolved.toDate);
  const spanDays = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1,
  );
  const previousTo = new Date(from);
  previousTo.setDate(previousTo.getDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setDate(previousFrom.getDate() - (spanDays - 1));
  return {
    ...resolved,
    fromDate: dateKeyFromDate(previousFrom),
    toDate: dateKeyFromDate(previousTo),
    compareMode: false,
  };
}

function numericDelta(current: number, previous: number) {
  const delta = normalizeMoney(current - previous);
  return {
    value: delta,
    pct: previous !== 0 ? normalizeMoney((delta / previous) * 100) : current !== 0 ? 100 : 0,
  };
}

function summaryWithComparison<T extends Record<string, number>>(
  current: T,
  previous: T,
) {
  const delta = Object.fromEntries(
    Object.keys(current).map((key) => [key, numericDelta(current[key], previous[key] ?? 0)]),
  );
  return { current, previous, delta };
}

async function queryRowsByDate<T extends TableNames>(
  ctx: ReaderCtx,
  table: T,
  field:
    | "businessDate"
    | "variantId_and_businessDate"
    | "productId_and_businessDate"
    | "categoryId_and_businessDate"
    | "subcategoryId_and_businessDate"
    | "paymentMethod_and_businessDate",
  filters: ReportFilters,
) {
  const { fromDate, toDate } = withDateBounds(filters);

  if (table === "saleItems") {
    if (field === "variantId_and_businessDate" && filters.variantId) {
      return await ctx.db
        .query("saleItems")
        .withIndex("by_variantId_and_businessDate", (q) =>
          q.eq("variantId", filters.variantId!).gte("businessDate", fromDate).lte("businessDate", toDate),
        )
        .take(1000);
    }
    if (field === "productId_and_businessDate" && filters.productId) {
      return await ctx.db
        .query("saleItems")
        .withIndex("by_productId_and_businessDate", (q) =>
          q.eq("productId", filters.productId!).gte("businessDate", fromDate).lte("businessDate", toDate),
        )
        .take(1000);
    }
    if (field === "categoryId_and_businessDate" && filters.categoryId) {
      return await ctx.db
        .query("saleItems")
        .withIndex("by_categoryId_and_businessDate", (q) =>
          q.eq("categoryId", filters.categoryId!).gte("businessDate", fromDate).lte("businessDate", toDate),
        )
        .take(1000);
    }
    if (field === "subcategoryId_and_businessDate" && filters.subcategoryId) {
      return await ctx.db
        .query("saleItems")
        .withIndex("by_subcategoryId_and_businessDate", (q) =>
          q
            .eq("subcategoryId", filters.subcategoryId!)
            .gte("businessDate", fromDate)
            .lte("businessDate", toDate),
        )
        .take(1000);
    }
    if (field === "paymentMethod_and_businessDate" && filters.paymentMethod !== "all") {
      const paymentMethod = filters.paymentMethod;
      return await ctx.db
        .query("saleItems")
        .withIndex("by_paymentMethod_and_businessDate", (q) =>
          q
            .eq("paymentMethod", paymentMethod)
            .gte("businessDate", fromDate)
            .lte("businessDate", toDate),
        )
        .take(1000);
    }

    return await ctx.db
      .query("saleItems")
      .withIndex("by_businessDate", (q) =>
        q.gte("businessDate", fromDate).lte("businessDate", toDate),
      )
      .take(1000);
  }

  if (table === "returnItems") {
    if (field === "variantId_and_businessDate" && filters.variantId) {
      return await ctx.db
        .query("returnItems")
        .withIndex("by_variantId_and_businessDate", (q) =>
          q.eq("variantId", filters.variantId!).gte("businessDate", fromDate).lte("businessDate", toDate),
        )
        .take(1000);
    }
    if (field === "productId_and_businessDate" && filters.productId) {
      return await ctx.db
        .query("returnItems")
        .withIndex("by_productId_and_businessDate", (q) =>
          q.eq("productId", filters.productId!).gte("businessDate", fromDate).lte("businessDate", toDate),
        )
        .take(1000);
    }
    if (field === "categoryId_and_businessDate" && filters.categoryId) {
      return await ctx.db
        .query("returnItems")
        .withIndex("by_categoryId_and_businessDate", (q) =>
          q.eq("categoryId", filters.categoryId!).gte("businessDate", fromDate).lte("businessDate", toDate),
        )
        .take(1000);
    }
    if (field === "subcategoryId_and_businessDate" && filters.subcategoryId) {
      return await ctx.db
        .query("returnItems")
        .withIndex("by_subcategoryId_and_businessDate", (q) =>
          q
            .eq("subcategoryId", filters.subcategoryId!)
            .gte("businessDate", fromDate)
            .lte("businessDate", toDate),
        )
        .take(1000);
    }

    return await ctx.db
      .query("returnItems")
      .withIndex("by_businessDate", (q) =>
        q.gte("businessDate", fromDate).lte("businessDate", toDate),
      )
      .take(1000);
  }

  if (table === "variantDailySales") {
    if (field === "variantId_and_businessDate" && filters.variantId) {
      return await ctx.db
        .query("variantDailySales")
        .withIndex("by_variantId_and_businessDate", (q) =>
          q.eq("variantId", filters.variantId!).gte("businessDate", fromDate).lte("businessDate", toDate),
        )
        .take(1500);
    }
    if (field === "productId_and_businessDate" && filters.productId) {
      return await ctx.db
        .query("variantDailySales")
        .withIndex("by_productId_and_businessDate", (q) =>
          q.eq("productId", filters.productId!).gte("businessDate", fromDate).lte("businessDate", toDate),
        )
        .take(1500);
    }
    if (field === "categoryId_and_businessDate" && filters.categoryId) {
      return await ctx.db
        .query("variantDailySales")
        .withIndex("by_categoryId_and_businessDate", (q) =>
          q.eq("categoryId", filters.categoryId!).gte("businessDate", fromDate).lte("businessDate", toDate),
        )
        .take(1500);
    }
    if (field === "subcategoryId_and_businessDate" && filters.subcategoryId) {
      return await ctx.db
        .query("variantDailySales")
        .withIndex("by_subcategoryId_and_businessDate", (q) =>
          q
            .eq("subcategoryId", filters.subcategoryId!)
            .gte("businessDate", fromDate)
            .lte("businessDate", toDate),
        )
        .take(1500);
    }

    return await ctx.db
      .query("variantDailySales")
      .withIndex("by_businessDate_and_variantId", (q) =>
        q.gte("businessDate", fromDate).lte("businessDate", toDate),
      )
      .take(1500);
  }

  return [];
}

function filterSaleItems(rows: Doc<"saleItems">[], filters: ReportFilters) {
  const resolved = resolveReportFilters(filters);
  return rows.filter((row) => {
    if (resolved.categoryId && row.categoryId !== resolved.categoryId) return false;
    if (resolved.subcategoryId && row.subcategoryId !== resolved.subcategoryId) {
      return false;
    }
    if (resolved.productId && row.productId !== resolved.productId) return false;
    if (resolved.variantId && row.variantId !== resolved.variantId) return false;
    if (
      resolved.paymentMethod !== "all" &&
      row.paymentMethod !== resolved.paymentMethod
    ) {
      return false;
    }
    if (resolved.salesStatus !== "all" && row.saleStatus !== resolved.salesStatus) {
      return false;
    }
    return true;
  });
}

function filterReturnItems(rows: Doc<"returnItems">[], filters: ReportFilters) {
  const resolved = resolveReportFilters(filters);
  return rows.filter((row) => {
    if (resolved.categoryId && row.categoryId !== resolved.categoryId) return false;
    if (resolved.subcategoryId && row.subcategoryId !== resolved.subcategoryId) {
      return false;
    }
    if (resolved.productId && row.productId !== resolved.productId) return false;
    if (resolved.variantId && row.variantId !== resolved.variantId) return false;
    return true;
  });
}

async function loadSaleItems(
  ctx: ReaderCtx,
  filters: ReportFilters,
) {
  const mode = filters.variantId
    ? "variantId_and_businessDate"
    : filters.productId
      ? "productId_and_businessDate"
      : filters.subcategoryId
        ? "subcategoryId_and_businessDate"
        : filters.categoryId
          ? "categoryId_and_businessDate"
          : filters.paymentMethod !== "all"
            ? "paymentMethod_and_businessDate"
            : "businessDate";

  const rows = (await queryRowsByDate(
    ctx,
    "saleItems",
    mode,
    filters,
  )) as Doc<"saleItems">[];

  return filterSaleItems(rows, filters);
}

async function loadReturnItems(
  ctx: ReaderCtx,
  filters: ReportFilters,
) {
  const mode = filters.variantId
    ? "variantId_and_businessDate"
    : filters.productId
      ? "productId_and_businessDate"
      : filters.subcategoryId
        ? "subcategoryId_and_businessDate"
        : filters.categoryId
          ? "categoryId_and_businessDate"
          : "businessDate";

  const rows = (await queryRowsByDate(
    ctx,
    "returnItems",
    mode,
    filters,
  )) as Doc<"returnItems">[];

  return filterReturnItems(rows, filters);
}

async function loadVariantDailyRows(
  ctx: ReaderCtx,
  filters: ReportFilters,
) {
  const mode = filters.variantId
    ? "variantId_and_businessDate"
    : filters.productId
      ? "productId_and_businessDate"
      : filters.subcategoryId
        ? "subcategoryId_and_businessDate"
        : filters.categoryId
          ? "categoryId_and_businessDate"
          : "businessDate";

  return (await queryRowsByDate(
    ctx,
    "variantDailySales",
    mode,
    filters,
  )) as Doc<"variantDailySales">[];
}

async function loadSales(
  ctx: ReaderCtx,
  filters: ReportFilters,
) {
  const resolved = resolveReportFilters(filters);
  const { fromDate, toDate } = withDateBounds(resolved);

  let rows: Doc<"sales">[] = [];
  const paymentMethod = resolved.paymentMethod;
  const salesStatus = resolved.salesStatus;
  if (paymentMethod !== "all") {
    rows = await ctx.db
      .query("sales")
      .withIndex("by_paymentMethod_and_businessDate", (q) =>
        q.eq("paymentMethod", paymentMethod).gte("businessDate", fromDate).lte("businessDate", toDate),
      )
      .take(1200);
  } else if (salesStatus !== "all") {
    rows = await ctx.db
      .query("sales")
      .withIndex("by_status_and_businessDate", (q) =>
        q.eq("status", salesStatus).gte("businessDate", fromDate).lte("businessDate", toDate),
      )
      .take(1200);
  } else {
    rows = await ctx.db
      .query("sales")
      .withIndex("by_businessDate", (q) =>
        q.gte("businessDate", fromDate).lte("businessDate", toDate),
      )
      .take(1200);
  }

  if (
    !resolved.categoryId &&
    !resolved.subcategoryId &&
    !resolved.productId &&
    !resolved.variantId
  ) {
    return rows;
  }

  const saleItems = await loadSaleItems(ctx, resolved);
  const matchingSaleIds = new Set(saleItems.map((item) => item.saleId));
  return rows.filter((row) => matchingSaleIds.has(row._id));
}

async function computeOverviewMetrics(
  ctx: ReaderCtx,
  filters: ReportFilters,
) {
  const { fromDate, toDate } = withDateBounds(filters);
  const plainDateRange =
    !filters.categoryId &&
    !filters.subcategoryId &&
    !filters.productId &&
    !filters.variantId &&
    filters.paymentMethod === "all";

  if (plainDateRange) {
    const rollups = await ctx.db
      .query("dailySalesRollups")
      .withIndex("by_businessDate", (q) =>
        q.gte("businessDate", fromDate).lte("businessDate", toDate),
      )
      .take(120);

    const grossRevenue = normalizeMoney(
      rollups.reduce((sum, row) => sum + row.grossRevenue, 0),
    );
    const returnValue = normalizeMoney(
      rollups.reduce((sum, row) => sum + row.returnValue, 0),
    );
    const orderCount = rollups.reduce((sum, row) => sum + row.orderCount, 0);
    const unitsSold = rollups.reduce((sum, row) => sum + row.unitsCount, 0);
    const cashRevenue = normalizeMoney(
      rollups.reduce((sum, row) => sum + row.cashRevenue, 0),
    );
    const upiRevenue = normalizeMoney(
      rollups.reduce((sum, row) => sum + row.upiRevenue, 0),
    );

    return {
      grossRevenue,
      returnValue,
      revenue: normalizeMoney(grossRevenue - returnValue),
      orderCount,
      unitsSold,
      avgOrderValue: orderCount > 0 ? normalizeMoney(grossRevenue / orderCount) : 0,
      paymentMix: {
        cash: cashRevenue,
        upi_mock: upiRevenue,
      },
    };
  }

  const saleItems = await loadSaleItems(ctx, filters);
  const returnItems = await loadReturnItems(ctx, filters);

  const grossRevenue = normalizeMoney(
    saleItems.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const returnValue = normalizeMoney(
    returnItems.reduce((sum, item) => sum + item.refundAmount, 0),
  );
  const orderIds = new Set(saleItems.map((item) => item.saleId));

  return {
    grossRevenue,
    returnValue,
    revenue: normalizeMoney(grossRevenue - returnValue),
    orderCount: orderIds.size,
    unitsSold: saleItems.reduce((sum, item) => sum + item.quantity, 0),
    avgOrderValue:
      orderIds.size > 0 ? normalizeMoney(grossRevenue / orderIds.size) : 0,
    paymentMix: {
      cash: normalizeMoney(
        saleItems
          .filter((item) => item.paymentMethod === "cash")
          .reduce((sum, item) => sum + item.lineTotal, 0),
      ),
      upi_mock: normalizeMoney(
        saleItems
          .filter((item) => item.paymentMethod === "upi_mock")
          .reduce((sum, item) => sum + item.lineTotal, 0),
      ),
    },
  };
}

async function computeInventoryHealthState(
  ctx: ReaderCtx,
  filters: ReportFilters,
) {
  const variants = await ctx.db
    .query("productVariants")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .take(500);

  const now = Date.now();
  const filteredVariants = variants.filter((variant) => {
    if (filters.categoryId && variant.categoryId !== filters.categoryId) return false;
    if (filters.subcategoryId && variant.subcategoryId !== filters.subcategoryId) return false;
    if (filters.productId && variant.productId !== filters.productId) return false;
    if (filters.variantId && variant._id !== filters.variantId) return false;
    return true;
  });

  const eligible = await Promise.all(
    filteredVariants.map(async (variant) => {
      const inventoryLevel = await getInventoryLevelOrThrow(ctx, variant._id);
      const mediaUrl =
        (await getPrimaryMediaUrl(ctx, variant.productId, variant._id)) ??
        (await getPrimaryMediaUrl(ctx, variant.productId));

      const stockState = deriveStockStatus(inventoryLevel.onHand, variant.reorderThreshold);
      const daysSinceSale = inventoryLevel.lastSaleAt
        ? Math.floor((now - inventoryLevel.lastSaleAt) / 86_400_000)
        : null;

      return {
        variantId: variant._id,
        productId: variant.productId,
        productCode: variant.productCode,
        displayCode: variant.displayCode,
        productName: variant.productName,
        variantLabel: variant.optionSummary,
        reorderThreshold: variant.reorderThreshold,
        onHand: inventoryLevel.onHand,
        stockState,
        lastSaleAt: inventoryLevel.lastSaleAt,
        daysSinceSale,
        mediaUrl,
      };
    })
  );

  return {
    lowStock: eligible.filter((item) => item.stockState === "low_stock"),
    outOfStock: eligible.filter((item) => item.stockState === "out_of_stock"),
    slowMoving: eligible.filter(
      (item) =>
        item.onHand > 0 && (item.daysSinceSale === null || item.daysSinceSale >= 45),
    ),
  };
}

async function computeTrendingState(
  ctx: ReaderCtx,
  filters: ReportFilters,
) {
  const today = makeBusinessDate(Date.now());
  const last7Start = makeBusinessDate(Date.now() - 6 * 86_400_000);
  const prior28Start = makeBusinessDate(Date.now() - 34 * 86_400_000);
  const prior28End = makeBusinessDate(Date.now() - 7 * 86_400_000);

  const currentRows = await loadVariantDailyRows(ctx, {
    ...filters,
    fromDate: last7Start,
    toDate: today,
  });
  const priorRows = await loadVariantDailyRows(ctx, {
    ...filters,
    fromDate: prior28Start,
    toDate: prior28End,
  });

  const currentMap = new Map<string, { soldQty: number; soldRevenue: number; sample: Doc<"variantDailySales"> }>();
  const priorMap = new Map<string, { soldQty: number; soldRevenue: number }>();

  for (const row of currentRows) {
    const existing = currentMap.get(row.variantId) ?? {
      soldQty: 0,
      soldRevenue: 0,
      sample: row,
    };
    existing.soldQty += row.soldQty;
    existing.soldRevenue = normalizeMoney(existing.soldRevenue + row.soldRevenue);
    currentMap.set(row.variantId, existing);
  }

  for (const row of priorRows) {
    const existing = priorMap.get(row.variantId) ?? { soldQty: 0, soldRevenue: 0 };
    existing.soldQty += row.soldQty;
    existing.soldRevenue = normalizeMoney(existing.soldRevenue + row.soldRevenue);
    priorMap.set(row.variantId, existing);
  }

  const trending: Array<{
    variantId: string;
    productId: Id<"products">;
    productCode: string;
    productName: string;
    variantLabel: string;
    current7dQty: number;
    previous28dQty: number;
    growthRate: number;
  }> = [];
  for (const [variantId, current] of currentMap.entries()) {
    const prior = priorMap.get(variantId) ?? { soldQty: 0, soldRevenue: 0 };
    const priorAveragePerWeek = prior.soldQty / 4;
    const growth = current.soldQty - priorAveragePerWeek;
    if (current.soldQty > 0 && growth > 0.5) {
      trending.push({
        variantId,
        productId: current.sample.productId,
        productCode: current.sample.productCode,
        productName: current.sample.productName,
        variantLabel: current.sample.variantLabel,
        current7dQty: current.soldQty,
        previous28dQty: prior.soldQty,
        growthRate:
          priorAveragePerWeek > 0
            ? normalizeMoney((current.soldQty / priorAveragePerWeek - 1) * 100)
            : 100,
      });
    }
  }

  return trending.sort((left, right) => right.growthRate - left.growthRate);
}

async function buildDashboardSuggestions(
  ctx: ReaderCtx,
) {
  const inventoryHealth = await computeInventoryHealthState(ctx, {
    fromDate: null,
    toDate: null,
    categoryId: null,
    subcategoryId: null,
    productId: null,
    variantId: null,
    paymentMethod: "all",
    returnStatus: "all",
  });
  const trendingUp = await computeTrendingState(ctx, {
    fromDate: null,
    toDate: null,
    categoryId: null,
    subcategoryId: null,
    productId: null,
    variantId: null,
    paymentMethod: "all",
    returnStatus: "all",
  });
  const recentReturns = await ctx.db
    .query("returns")
    .withIndex("by_businessDate", (q) => q.gte("businessDate", makeBusinessDate(Date.now() - 14 * 86_400_000)))
    .order("desc")
    .take(5);

  return {
    lowStockSoon: inventoryHealth.lowStock.slice(0, 5),
    trendingUp: trendingUp.slice(0, 5),
    slowMoving: inventoryHealth.slowMoving.slice(0, 5),
    recentReturns,
  };
}

export const overview = query({
  args: reportFilterArgs,
  handler: async (ctx, args) => {
    const filters = resolveReportFilters(args);
    const metrics = await computeOverviewMetrics(ctx, filters);
    const previousMetrics = filters.compareMode
      ? await computeOverviewMetrics(ctx, previousPeriodFor(filters))
      : {
          grossRevenue: 0,
          returnValue: 0,
          revenue: 0,
          orderCount: 0,
          unitsSold: 0,
          avgOrderValue: 0,
          paymentMix: { cash: 0, upi_mock: 0 },
        };
    const snapshot = await ctx.db
      .query("reportSnapshots")
      .withIndex("by_key", (q) => q.eq("key", "dashboard"))
      .unique();

    // Daily breakdown table
    const { fromDate, toDate } = withDateBounds(filters);
    const rollups = await ctx.db
      .query("dailySalesRollups")
      .withIndex("by_businessDate", (q) =>
        q.gte("businessDate", fromDate).lte("businessDate", toDate),
      )
      .take(120);
    const dailyBreakdown = rollups.map((r) => ({
      date: r.businessDate,
      orders: r.orderCount,
      revenue: r.grossRevenue,
      returns: r.returnValue,
      net: normalizeMoney(r.grossRevenue - r.returnValue),
      discounts: normalizeMoney(r.lineDiscountTotal + r.orderDiscountTotal),
    })).sort((a, b) => b.date.localeCompare(a.date));

    // Discount totals
    const totalLineDiscount = normalizeMoney(
      rollups.reduce((s, r) => s + r.lineDiscountTotal, 0),
    );
    const totalOrderDiscount = normalizeMoney(
      rollups.reduce((s, r) => s + r.orderDiscountTotal, 0),
    );
    const previousDiscounts = filters.compareMode
      ? await ctx.db
          .query("dailySalesRollups")
          .withIndex("by_businessDate", (q) => {
            const previous = withDateBounds(previousPeriodFor(filters));
            return q.gte("businessDate", previous.fromDate).lte("businessDate", previous.toDate);
          })
          .take(120)
      : [];

    const currentSummary = {
      revenue: metrics.revenue,
      grossRevenue: metrics.grossRevenue,
      returnValue: metrics.returnValue,
      orderCount: metrics.orderCount,
      unitsSold: metrics.unitsSold,
      avgOrderValue: metrics.avgOrderValue,
      totalDiscount: normalizeMoney(totalLineDiscount + totalOrderDiscount),
    };
    const previousSummary = {
      revenue: previousMetrics.revenue,
      grossRevenue: previousMetrics.grossRevenue,
      returnValue: previousMetrics.returnValue,
      orderCount: previousMetrics.orderCount,
      unitsSold: previousMetrics.unitsSold,
      avgOrderValue: previousMetrics.avgOrderValue,
      totalDiscount: normalizeMoney(
        previousDiscounts.reduce((s, r) => s + r.lineDiscountTotal + r.orderDiscountTotal, 0),
      ),
    };

    const dailyTrend = dailyBreakdown
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({
        ...entry,
        avgOrderValue: entry.orders > 0 ? normalizeMoney(entry.revenue / entry.orders) : 0,
      }));

    const bestDay =
      dailyBreakdown.length > 0
        ? dailyBreakdown.reduce((best, entry) => (entry.net > best.net ? entry : best), dailyBreakdown[0])
        : null;
    const worstDay =
      dailyBreakdown.length > 0
        ? dailyBreakdown.reduce((worst, entry) => (entry.net < worst.net ? entry : worst), dailyBreakdown[0])
        : null;

    const categoryRows = await loadVariantDailyRows(ctx, filters);
    const categoryMap = new Map<string, { categoryId: Id<"categories">; soldRevenue: number; soldQty: number; returnValue: number }>();
    for (const row of categoryRows) {
      const existing = categoryMap.get(row.categoryId) ?? {
        categoryId: row.categoryId,
        soldRevenue: 0,
        soldQty: 0,
        returnValue: 0,
      };
      existing.soldRevenue = normalizeMoney(existing.soldRevenue + row.soldRevenue);
      existing.soldQty += row.soldQty;
      existing.returnValue = normalizeMoney(existing.returnValue + row.returnValue);
      categoryMap.set(row.categoryId, existing);
    }
    const categoryContribution = await Promise.all(
      Array.from(categoryMap.values()).map(async (entry) => {
        const category = await ctx.db.get(entry.categoryId);
        return {
          ...entry,
          categoryName: category?.name ?? "Unknown",
          netRevenue: normalizeMoney(entry.soldRevenue - entry.returnValue),
        };
      }),
    );
    categoryContribution.sort((a, b) => b.netRevenue - a.netRevenue);

    const inventoryState = await computeInventoryHealthState(ctx, filters);
    const exceptionCards = [
      {
        key: "returns_spike",
        title: "Return pressure",
        value: metrics.returnValue,
        detail:
          metrics.grossRevenue > 0
            ? `${normalizeMoney((metrics.returnValue / metrics.grossRevenue) * 100)}% of gross`
            : "No return activity",
      },
      {
        key: "discount_load",
        title: "Discount load",
        value: currentSummary.totalDiscount,
        detail:
          metrics.grossRevenue > 0
            ? `${normalizeMoney((currentSummary.totalDiscount / metrics.grossRevenue) * 100)}% of gross`
            : "No sales in range",
      },
      {
        key: "stock_risk",
        title: "Low-stock risk",
        value: String(inventoryState.lowStock.length + inventoryState.outOfStock.length),
        detail: `${inventoryState.outOfStock.length} out, ${inventoryState.lowStock.length} low`,
      },
    ];

    return {
      metrics: {
        ...metrics,
        totalLineDiscount,
        totalOrderDiscount,
        totalDiscount: normalizeMoney(totalLineDiscount + totalOrderDiscount),
      },
      summary: summaryWithComparison(currentSummary, previousSummary),
      dailyBreakdown,
      dailyTrend,
      paymentMix: metrics.paymentMix,
      discountMix: {
        lineDiscount: totalLineDiscount,
        orderDiscount: totalOrderDiscount,
      },
      highlights: {
        bestDay,
        worstDay,
        strongestCategory: categoryContribution[0] ?? null,
        weakestCategory: categoryContribution[categoryContribution.length - 1] ?? null,
      },
      categoryContribution: categoryContribution.slice(0, 8),
      exceptionCards,
      suggestions: snapshot
        ? JSON.parse(snapshot.payload)
        : await buildDashboardSuggestions(ctx),
      snapshotGeneratedAt: snapshot?.generatedAt ?? null,
    };
  },
});

// Sales screen summary stats
export const salesSummaryStats = query({
  args: {
    fromDate: nullableStringValidator,
    toDate: nullableStringValidator,
    paymentMethod: v.union(v.literal("all"), v.literal("cash"), v.literal("upi_mock")),
    status: v.union(v.literal("all"), v.literal("completed"), v.literal("returned_partial"), v.literal("returned_full")),
  },
  handler: async (ctx, args) => {
    const lower = args.fromDate ?? "0000-01-01";
    const upper = args.toDate ?? "9999-12-31";

    const rollups = await ctx.db
      .query("dailySalesRollups")
      .withIndex("by_businessDate", (q) =>
        q.gte("businessDate", lower).lte("businessDate", upper),
      )
      .take(120);

    const totalRevenue = normalizeMoney(rollups.reduce((s, r) => s + r.grossRevenue, 0));
    const totalReturns = normalizeMoney(rollups.reduce((s, r) => s + r.returnValue, 0));
    const saleCount = rollups.reduce((s, r) => s + r.orderCount, 0);
    const discountTotal = normalizeMoney(
      rollups.reduce((s, r) => s + r.lineDiscountTotal + r.orderDiscountTotal, 0),
    );

    return {
      totalRevenue,
      totalReturns,
      netRevenue: normalizeMoney(totalRevenue - totalReturns),
      avgOrderValue: saleCount > 0 ? normalizeMoney(totalRevenue / saleCount) : 0,
      saleCount,
      discountTotal,
    };
  },
});

export const salesAnalysis = query({
  args: reportFilterArgs,
  handler: async (ctx, args) => {
    const filters = resolveReportFilters(args);
    const sales = await loadSales(ctx, filters);
    const previousSales = filters.compareMode
      ? await loadSales(ctx, previousPeriodFor(filters))
      : [];

    const buildSummary = (rows: Doc<"sales">[]) => {
      const subtotal = normalizeMoney(rows.reduce((sum, row) => sum + row.subtotal, 0));
      const total = normalizeMoney(rows.reduce((sum, row) => sum + row.total, 0));
      const discounts = normalizeMoney(
        rows.reduce((sum, row) => sum + row.lineDiscountTotal + row.orderDiscount, 0),
      );
      const returns = rows.filter((row) => row.status !== "completed").length;
      return {
        revenue: total,
        subtotal,
        discounts,
        receipts: rows.length,
        units: rows.reduce((sum, row) => sum + row.totalQty, 0),
        avgOrderValue: rows.length > 0 ? normalizeMoney(total / rows.length) : 0,
        returnCount: returns,
      };
    };

    const trendMap = new Map<string, { date: string; revenue: number; receipts: number; discounts: number; returns: number }>();
    const weekdayMap = new Map<string, { label: string; revenue: number; receipts: number }>();
    const hourlyMap = new Map<number, { hour: number; revenue: number; receipts: number }>();
    const paymentMix = { cash: 0, upi_mock: 0 };
    let namedCustomers = 0;
    let walkInCustomers = 0;

    for (const sale of sales) {
      const day = trendMap.get(sale.businessDate) ?? {
        date: sale.businessDate,
        revenue: 0,
        receipts: 0,
        discounts: 0,
        returns: 0,
      };
      day.revenue = normalizeMoney(day.revenue + sale.total);
      day.receipts += 1;
      day.discounts = normalizeMoney(day.discounts + sale.lineDiscountTotal + sale.orderDiscount);
      if (sale.status !== "completed") day.returns += 1;
      trendMap.set(sale.businessDate, day);

      const weekdayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(new Date(sale.createdAt));
      const weekday = weekdayMap.get(weekdayLabel) ?? { label: weekdayLabel, revenue: 0, receipts: 0 };
      weekday.revenue = normalizeMoney(weekday.revenue + sale.total);
      weekday.receipts += 1;
      weekdayMap.set(weekdayLabel, weekday);

      const hour = new Date(sale.createdAt).getHours();
      const hourEntry = hourlyMap.get(hour) ?? { hour, revenue: 0, receipts: 0 };
      hourEntry.revenue = normalizeMoney(hourEntry.revenue + sale.total);
      hourEntry.receipts += 1;
      hourlyMap.set(hour, hourEntry);

      paymentMix[sale.paymentMethod] = normalizeMoney(paymentMix[sale.paymentMethod] + sale.total);
      if (sale.customerName && sale.customerName.trim().length > 0) namedCustomers += 1;
      else walkInCustomers += 1;
    }

    const topTransactions = sales
      .slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
    const discountHeavy = sales
      .slice()
      .sort(
        (a, b) =>
          b.lineDiscountTotal + b.orderDiscount - (a.lineDiscountTotal + a.orderDiscount),
      )
      .slice(0, 12);

    return {
      summary: summaryWithComparison(buildSummary(sales), buildSummary(previousSales)),
      trend: Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      weekdayBreakdown: Array.from(weekdayMap.values()).sort((a, b) => b.revenue - a.revenue),
      hourlyBreakdown: Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour),
      paymentMix,
      customerMix: {
        named: namedCustomers,
        walkIn: walkInCustomers,
      },
      topTransactions,
      discountHeavy,
      transactionRows: sales.slice(0, 60),
    };
  },
});

export const productPerformance = query({
  args: reportFilterArgs,
  handler: async (ctx, args) => {
    const filters = resolveReportFilters(args);
    const rows = await loadVariantDailyRows(ctx, filters);
    const byVariant = new Map<
      string,
      {
        productId: Id<"products">;
        productCode: string;
        productName: string;
        variantLabel: string;
        categoryId: Id<"categories">;
        soldQty: number;
        soldRevenue: number;
        returnQty: number;
        returnValue: number;
        lastSoldAt: number | null;
      }
    >();

    for (const row of rows) {
      const existing = byVariant.get(row.variantId) ?? {
        productId: row.productId,
        productCode: row.productCode,
        productName: row.productName,
        variantLabel: row.variantLabel,
        categoryId: row.categoryId,
        soldQty: 0,
        soldRevenue: 0,
        returnQty: 0,
        returnValue: 0,
        lastSoldAt: row.lastSoldAt,
      };
      existing.soldQty += row.soldQty;
      existing.soldRevenue = normalizeMoney(existing.soldRevenue + row.soldRevenue);
      existing.returnQty += row.returnQty;
      existing.returnValue = normalizeMoney(existing.returnValue + row.returnValue);
      existing.lastSoldAt =
        existing.lastSoldAt && row.lastSoldAt
          ? Math.max(existing.lastSoldAt, row.lastSoldAt)
          : existing.lastSoldAt ?? row.lastSoldAt;
      byVariant.set(row.variantId, existing);
    }

    let allVariants = Array.from(byVariant.entries()).map(([variantId, value]) => ({
      variantId,
      ...value,
      netRevenue: normalizeMoney(value.soldRevenue - value.returnValue),
      avgPrice: value.soldQty > 0 ? normalizeMoney(value.soldRevenue / value.soldQty) : 0,
    }));

    if (filters.movementBucket === "top_sellers") {
      allVariants = allVariants.filter((entry) => entry.soldQty > 0).sort((a, b) => b.soldQty - a.soldQty);
    } else if (filters.movementBucket === "slow_movers") {
      allVariants = allVariants.filter((entry) => entry.soldQty > 0).sort((a, b) => a.soldQty - b.soldQty);
    } else if (filters.movementBucket === "high_returns") {
      allVariants = allVariants.filter((entry) => entry.returnQty > 0).sort((a, b) => b.returnQty - a.returnQty);
    } else if (filters.movementBucket === "discount_heavy") {
      allVariants = allVariants.sort((a, b) => b.soldRevenue - b.netRevenue - (a.soldRevenue - a.netRevenue));
    }

    // Category breakdown
    const byCat = new Map<string, { categoryId: string; soldQty: number; soldRevenue: number; returnValue: number }>();
    for (const v of allVariants) {
      const e = byCat.get(v.categoryId) ?? { categoryId: v.categoryId, soldQty: 0, soldRevenue: 0, returnValue: 0 };
      e.soldQty += v.soldQty;
      e.soldRevenue = normalizeMoney(e.soldRevenue + v.soldRevenue);
      e.returnValue = normalizeMoney(e.returnValue + v.returnValue);
      byCat.set(v.categoryId, e);
    }
    const categoryBreakdownRaw = Array.from(byCat.values());
    // Resolve names
    const catBreakdown = await Promise.all(
      categoryBreakdownRaw.map(async (c) => {
        const cat = await ctx.db.get(c.categoryId as Id<"categories">);
        return { ...c, categoryName: cat?.name ?? "Unknown" };
      }),
    );

    // Dead stock — active variants with 0 sales in period
    const variantsWithSales = new Set(byVariant.keys());
    const allActive = await ctx.db
      .query("productVariants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(500);
    const deadStock = allActive
      .filter((v) => !variantsWithSales.has(v._id))
      .filter((v) => {
        if (filters.categoryId && v.categoryId !== filters.categoryId) return false;
        if (filters.subcategoryId && v.subcategoryId !== filters.subcategoryId) return false;
        if (filters.productId && v.productId !== filters.productId) return false;
        if (filters.variantId && v._id !== filters.variantId) return false;
        return true;
      })
      .map((v) => ({
        variantId: v._id,
        productId: v.productId,
        productCode: v.productCode,
        productName: v.productName,
        variantLabel: v.optionSummary,
        displayCode: v.displayCode,
        salePrice: v.salePrice,
      }))
      .slice(0, 30);

    const trendingUp = await computeTrendingState(ctx, filters);
    const previousRows = filters.compareMode
      ? await loadVariantDailyRows(ctx, previousPeriodFor(filters))
      : [];
    const currentSummary = {
      soldQty: allVariants.reduce((sum, entry) => sum + entry.soldQty, 0),
      soldRevenue: normalizeMoney(allVariants.reduce((sum, entry) => sum + entry.soldRevenue, 0)),
      returnQty: allVariants.reduce((sum, entry) => sum + entry.returnQty, 0),
      returnValue: normalizeMoney(allVariants.reduce((sum, entry) => sum + entry.returnValue, 0)),
      netRevenue: normalizeMoney(allVariants.reduce((sum, entry) => sum + entry.netRevenue, 0)),
    };
    const previousSummary = {
      soldQty: previousRows.reduce((sum, entry) => sum + entry.soldQty, 0),
      soldRevenue: normalizeMoney(previousRows.reduce((sum, entry) => sum + entry.soldRevenue, 0)),
      returnQty: previousRows.reduce((sum, entry) => sum + entry.returnQty, 0),
      returnValue: normalizeMoney(previousRows.reduce((sum, entry) => sum + entry.returnValue, 0)),
      netRevenue: normalizeMoney(previousRows.reduce((sum, entry) => sum + entry.soldRevenue - entry.returnValue, 0)),
    };
    const highReturnItems = allVariants
      .filter((entry) => entry.returnQty > 0)
      .slice()
      .sort((a, b) => b.returnQty - a.returnQty)
      .slice(0, 10);

    return {
      summary: summaryWithComparison(currentSummary, previousSummary),
      allVariants: allVariants.sort((a, b) => b.soldRevenue - a.soldRevenue),
      topSelling: allVariants
        .slice()
        .sort((a, b) => b.soldQty - a.soldQty)
        .slice(0, 10),
      lowSelling: allVariants
        .slice()
        .sort((a, b) => a.soldQty - b.soldQty)
        .slice(0, 10),
      highReturnItems,
      categoryBreakdown: catBreakdown.sort((a, b) => b.soldRevenue - a.soldRevenue),
      deadStock,
      trendingUp: trendingUp.slice(0, 10),
    };
  },
});

export const inventoryHealth = query({
  args: reportFilterArgs,
  handler: async (ctx, args) => {
    const filters = resolveReportFilters(args);
    const state = await computeInventoryHealthState(ctx, filters);
    const all = [...state.lowStock, ...state.outOfStock, ...state.slowMoving];
    const uniqueItems = Array.from(new Map(all.map((i) => [i.variantId, i])).values());

    // Total stock value & SKU count from full active set
    const fullVariants = await ctx.db
      .query("productVariants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(500);
    const filtered = fullVariants.filter((v) => {
      if (filters.categoryId && v.categoryId !== filters.categoryId) return false;
      if (filters.subcategoryId && v.subcategoryId !== filters.subcategoryId) return false;
      if (filters.productId && v.productId !== filters.productId) return false;
      if (filters.variantId && v._id !== filters.variantId) return false;
      return true;
    });
    let totalStockValue = 0;
    const tiers = { zero: 0, low: 0, medium: 0, high: 0, overstock: 0 };
    const ageBuckets = { no_recent_sale: 0, last_7_days: 0, last_30_days: 0, last_60_days: 0, over_60_days: 0 };
    await Promise.all(
      filtered.map(async (v) => {
        const il = await getInventoryLevelOrThrow(ctx, v._id);
        const stockValue = normalizeMoney(il.onHand * v.salePrice);
        totalStockValue += stockValue;
        if (il.onHand <= 0) tiers.zero++;
        else if (il.onHand <= 5) tiers.low++;
        else if (il.onHand <= 20) tiers.medium++;
        else tiers.high++;
        if (il.onHand > Math.max(v.reorderThreshold * 4, 20)) tiers.overstock++;
        const daysSinceSale =
          typeof il.lastSaleAt === "number"
            ? Math.floor((Date.now() - il.lastSaleAt) / 86_400_000)
            : null;
        if (daysSinceSale === null) ageBuckets.no_recent_sale++;
        else if (daysSinceSale <= 7) ageBuckets.last_7_days++;
        else if (daysSinceSale <= 30) ageBuckets.last_30_days++;
        else if (daysSinceSale <= 60) ageBuckets.last_60_days++;
        else ageBuckets.over_60_days++;
        return null;
      }),
    );
    totalStockValue = normalizeMoney(totalStockValue);

    // Enrich low/out/slow lists with stockValue and recommendedReorder
    const enrichList = (list: typeof state.lowStock) =>
      list.map((item) => ({
        ...item,
        stockValue: normalizeMoney(item.onHand * (filtered.find((v) => v._id === item.variantId)?.salePrice ?? 0)),
        recommendedReorder: Math.max(0, item.reorderThreshold - item.onHand),
      }));

    const lowStock = enrichList(state.lowStock).slice(0, 30);
    const outOfStock = enrichList(state.outOfStock).slice(0, 30);
    const slowMoving = enrichList(state.slowMoving).slice(0, 30);
    const deadStock = slowMoving.filter((item) => item.onHand > 0 && item.daysSinceSale === null).slice(0, 30);
    const overstock = uniqueItems.filter((item) => item.onHand > Math.max(item.reorderThreshold * 4, 20)).slice(0, 30);

    return {
      summary: summaryWithComparison(
        {
          totalStockValue,
          totalSKUs: filtered.length,
          lowStock: state.lowStock.length,
          outOfStock: state.outOfStock.length,
          slowMoving: state.slowMoving.length,
        },
        { totalStockValue: 0, totalSKUs: 0, lowStock: 0, outOfStock: 0, slowMoving: 0 },
      ),
      counts: {
        lowStock: state.lowStock.length,
        outOfStock: state.outOfStock.length,
        slowMoving: state.slowMoving.length,
        deadStock: deadStock.length,
        overstock: overstock.length,
      },
      totalStockValue,
      totalSKUs: filtered.length,
      stockTiers: tiers,
      ageBuckets,
      lowStock,
      outOfStock,
      slowMoving,
      deadStock,
      overstock,
      visibleList:
        filters.movementBucket === "dead_stock"
          ? deadStock
          : filters.movementBucket === "slow_movers"
            ? slowMoving
            : filters.stockState === "low_stock"
              ? lowStock
              : filters.stockState === "out_of_stock"
                ? outOfStock
                : uniqueItems.slice(0, 40),
      revenueAtRisk: normalizeMoney(0),
    };
  },
});

export const returnsReport = query({
  args: {
    ...reportFilterArgs,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const filters: ReportFilters = {
      fromDate: args.fromDate,
      toDate: args.toDate,
      categoryId: args.categoryId,
      subcategoryId: args.subcategoryId,
      productId: args.productId,
      variantId: args.variantId,
      paymentMethod: args.paymentMethod,
      returnStatus: args.returnStatus,
      datePreset: args.datePreset,
      compareMode: args.compareMode,
      stockState: args.stockState,
      movementBucket: args.movementBucket,
      salesStatus: args.salesStatus,
      groupBy: args.groupBy,
      sortBy: args.sortBy,
    };
    const resolvedFilters = resolveReportFilters(filters);
    const returnItems = await loadReturnItems(ctx, resolvedFilters);
    const saleItems = await loadSaleItems(ctx, resolvedFilters);
    const returns = await ctx.db
      .query("returns")
      .withIndex("by_businessDate", (q) =>
        q
          .gte("businessDate", resolvedFilters.fromDate ?? "0000-01-01")
          .lte("businessDate", resolvedFilters.toDate ?? "9999-12-31"),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const returnValue = normalizeMoney(
      returnItems.reduce((sum, item) => sum + item.refundAmount, 0),
    );
    const returnedUnits = returnItems.reduce((sum, item) => sum + item.quantity, 0);
    const saleOrderIds = new Set(saleItems.map((i) => i.saleId));
    const totalSalesRevenue = normalizeMoney(
      saleItems.reduce((sum, i) => sum + i.lineTotal, 0),
    );
    const returnRate = saleOrderIds.size > 0
      ? normalizeMoney((returns.page.length / saleOrderIds.size) * 100)
      : 0;
    const returnValuePct = totalSalesRevenue > 0
      ? normalizeMoney((returnValue / totalSalesRevenue) * 100)
      : 0;

    // Most returned products
    const byVariant = new Map<string, { productName: string; variantLabel: string; productCode: string; returnQty: number; returnValue: number }>();
    for (const ri of returnItems) {
      const e = byVariant.get(ri.variantId) ?? { productName: ri.productName, variantLabel: ri.variantLabel, productCode: ri.productCode, returnQty: 0, returnValue: 0 };
      e.returnQty += ri.quantity;
      e.returnValue = normalizeMoney(e.returnValue + ri.refundAmount);
      byVariant.set(ri.variantId, e);
    }
    const mostReturned = Array.from(byVariant.entries())
      .map(([variantId, v]) => ({ variantId, ...v }))
      .sort((a, b) => b.returnQty - a.returnQty)
      .slice(0, 15);
    const timelineMap = new Map<string, { date: string; returnValue: number; returnQty: number }>();
    for (const item of returnItems) {
      const current = timelineMap.get(item.businessDate) ?? { date: item.businessDate, returnValue: 0, returnQty: 0 };
      current.returnValue = normalizeMoney(current.returnValue + item.refundAmount);
      current.returnQty += item.quantity;
      timelineMap.set(item.businessDate, current);
    }

    // Enrich return page with items
    const enrichedPage = await Promise.all(
      returns.page.map(async (ret) => {
        const items = await ctx.db
          .query("returnItems")
          .withIndex("by_returnId", (q) => q.eq("returnId", ret._id))
          .take(50);
        return {
          ...ret,
          items: items.map((i) => ({
            productName: i.productName,
            variantLabel: i.variantLabel,
            productCode: i.productCode,
            quantity: i.quantity,
            refundAmount: i.refundAmount,
          })),
        };
      }),
    );
    const refundMethodMix = enrichedPage.reduce(
      (acc, ret) => {
        acc[ret.refundMethod] = normalizeMoney(acc[ret.refundMethod] + ret.subtotal);
        return acc;
      },
      { cash: 0, upi_mock: 0 },
    );
    const previousSummary = resolvedFilters.compareMode
      ? await ctx.runQuery(publicApi.reports.returnsReport, {
          ...previousPeriodFor(resolvedFilters),
          paginationOpts: { numItems: 1, cursor: null },
        })
      : null;

    const summary = summaryWithComparison(
      {
        returnValue,
        returnCount: returnItems.length,
        returnedUnits,
        returnRate,
        returnValuePct,
      },
      previousSummary?.summary?.current ?? {
        returnValue: 0,
        returnCount: 0,
        returnedUnits: 0,
        returnRate: 0,
        returnValuePct: 0,
      },
    );

    return {
      summary: {
        ...summary,
        ...summary.current,
      },
      mostReturned,
      refundMethodMix,
      timeline: Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      page: enrichedPage,
      isDone: returns.isDone,
      continueCursor: returns.continueCursor,
    };
  },
});

export const refreshDashboardSnapshot = internalMutation({
  args: {},
  handler: async (ctx) => {
    const payload = await buildDashboardSuggestions(ctx);
    const existing = await ctx.db
      .query("reportSnapshots")
      .withIndex("by_key", (q) => q.eq("key", "dashboard"))
      .unique();
    const generatedAt = Date.now();
    const generatedDate = makeBusinessDate(generatedAt);

    if (!existing) {
      await ctx.db.insert("reportSnapshots", {
        key: "dashboard",
        generatedDate,
        generatedAt,
        payload: JSON.stringify(payload),
      });
      return;
    }

    await ctx.db.patch(existing._id, {
      generatedDate,
      generatedAt,
      payload: JSON.stringify(payload),
    });
  },
});

function rowsToCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

export const exportCsv = action({
  args: {
    kind: v.union(
      v.literal("executiveSummary"),
      v.literal("executiveTrend"),
      v.literal("salesTransactions"),
      v.literal("salesTrend"),
      v.literal("productPerformance"),
      v.literal("inventoryRisk"),
      v.literal("returnsDetail"),
      v.literal("salesTransactions"),
    ),
    scope: v.optional(
      v.union(
        v.literal("current_view"),
        v.literal("detail_rows"),
        v.literal("summary_and_detail"),
      ),
    ),
    ...reportFilterArgs,
  },
  handler: async (ctx, args) => {
    const { kind, scope, ...filterArgs } = args;

    if (kind === "executiveSummary") {
      const r: any = await ctx.runQuery(publicApi.reports.overview, filterArgs);
      const rows = [
        ["Summary Metric", "Value"],
        ["Net Revenue", r.summary.current.revenue],
        ["Gross Revenue", r.summary.current.grossRevenue],
        ["Total Returns", r.summary.current.returnValue],
        ["Total Discounts", r.summary.current.totalDiscount],
        ["Order Count", r.summary.current.orderCount],
        ["Units Sold", r.summary.current.unitsSold],
        ["Avg Order Value", r.summary.current.avgOrderValue],
        ["Cash Revenue", r.paymentMix.cash],
        ["UPI Revenue", r.paymentMix.upi_mock],
      ];
      if (scope !== "current_view") {
        rows.push([]);
        rows.push(["Date", "Orders", "Revenue", "Returns", "Net", "Discounts"]);
        rows.push(
          ...(r.dailyBreakdown ?? []).map((d: any) => [
            d.date,
            d.orders,
            d.revenue,
            d.returns,
            d.net,
            d.discounts,
          ]),
        );
      }
      return rowsToCsv(rows);
    }

    if (kind === "executiveTrend") {
      const r: any = await ctx.runQuery(publicApi.reports.overview, filterArgs);
      return rowsToCsv([
        ["Date", "Orders", "Revenue", "Returns", "Net", "Discounts", "Avg Order"],
        ...(r.dailyTrend ?? []).map((d: any) => [
          d.date,
          d.orders,
          d.revenue,
          d.returns,
          d.net,
          d.discounts,
          d.avgOrderValue,
        ]),
      ]);
    }

    if (kind === "salesTrend") {
      const r: any = await ctx.runQuery(publicApi.reports.salesAnalysis, filterArgs);
      const rows = [
        ["Date", "Revenue", "Receipts", "Discounts", "Returns"],
        ...(r.trend ?? []).map((entry: any) => [
          entry.date,
          entry.revenue,
          entry.receipts,
          entry.discounts,
          entry.returns,
        ]),
      ];
      if (scope === "summary_and_detail") {
        rows.push([]);
        rows.push(["Weekday", "Revenue", "Receipts"]);
        rows.push(
          ...(r.weekdayBreakdown ?? []).map((entry: any) => [
            entry.label,
            entry.revenue,
            entry.receipts,
          ]),
        );
      }
      return rowsToCsv(rows);
    }

    if (kind === "productPerformance") {
      const r: any = await ctx.runQuery(publicApi.reports.productPerformance, filterArgs);
      return rowsToCsv([
        ["Product Code", "Product Name", "Variant", "Units Sold", "Revenue", "Returns Qty", "Return Value", "Net Revenue", "Avg Price", "Last Sold"],
        ...(r.allVariants ?? []).map((v: any) => [
          v.productCode,
          v.productName,
          v.variantLabel,
          v.soldQty,
          v.soldRevenue,
          v.returnQty,
          v.returnValue,
          v.netRevenue,
          v.avgPrice,
          v.lastSoldAt ? new Date(v.lastSoldAt).toISOString().slice(0, 10) : "Never",
        ]),
      ]);
    }

    if (kind === "inventoryRisk") {
      const r: any = await ctx.runQuery(publicApi.reports.inventoryHealth, filterArgs);
      const allItems = [
        ...(r.lowStock ?? []).map((i: any) => ({ ...i, segment: "Low Stock" })),
        ...(r.outOfStock ?? []).map((i: any) => ({ ...i, segment: "Out of Stock" })),
        ...(r.slowMoving ?? []).map((i: any) => ({ ...i, segment: "Slow Moving" })),
        ...(r.deadStock ?? []).map((i: any) => ({ ...i, segment: "Dead Stock" })),
      ];
      return rowsToCsv([
        ["Segment", "Product Code", "Display Code", "Product Name", "Variant", "On Hand", "Reorder Threshold", "Stock Value", "Reorder Qty", "Days Since Sale"],
        ...allItems.map((i: any) => [
          i.segment,
          i.productCode,
          i.displayCode,
          i.productName,
          i.variantLabel,
          i.onHand,
          i.reorderThreshold,
          i.stockValue ?? 0,
          i.recommendedReorder ?? 0,
          i.daysSinceSale ?? "Never",
        ]),
      ]);
    }

    if (kind === "returnsDetail") {
      const r: any = await ctx.runQuery(publicApi.reports.returnsReport, {
        ...filterArgs,
        paginationOpts: { numItems: 200, cursor: null },
      });
      const rows: string[][] = [
        ["Return Code", "Sale Code", "Date", "Refund Method", "Product", "Variant", "Qty", "Refund Amount"],
      ];
      for (const ret of r.page ?? []) {
        for (const item of ret.items ?? []) {
          rows.push([
            ret.returnCode,
            ret.saleCode,
            new Date(ret.createdAt).toISOString().slice(0, 10),
            ret.refundMethod,
            item.productName,
            item.variantLabel,
            item.quantity,
            item.refundAmount,
          ]);
        }
      }
      return rowsToCsv(rows);
    }

    const r: any = await ctx.runQuery(publicApi.reports.salesAnalysis, filterArgs);
    return rowsToCsv([
      ["Sale Code", "Date", "Status", "Payment", "Customer", "Phone", "Subtotal", "Total", "Items", "Units"],
      ...(r.transactionRows ?? []).map((s: any) => [
        s.saleCode,
        s.businessDate,
        s.status,
        s.paymentMethod,
        s.customerName ?? "Walk-in",
        s.customerPhone ?? "",
        s.subtotal,
        s.total,
        s.itemCount,
        s.totalQty,
      ]),
    ]);
  },
});
