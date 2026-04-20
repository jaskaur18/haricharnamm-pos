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
};

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
};

function withDateBounds(filters: ReportFilters) {
  return {
    fromDate: filters.fromDate ?? "0000-01-01",
    toDate: filters.toDate ?? "9999-12-31",
  };
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
  return rows.filter((row) => {
    if (filters.categoryId && row.categoryId !== filters.categoryId) return false;
    if (filters.subcategoryId && row.subcategoryId !== filters.subcategoryId) {
      return false;
    }
    if (filters.productId && row.productId !== filters.productId) return false;
    if (filters.variantId && row.variantId !== filters.variantId) return false;
    if (
      filters.paymentMethod !== "all" &&
      row.paymentMethod !== filters.paymentMethod
    ) {
      return false;
    }
    return true;
  });
}

function filterReturnItems(rows: Doc<"returnItems">[], filters: ReportFilters) {
  return rows.filter((row) => {
    if (filters.categoryId && row.categoryId !== filters.categoryId) return false;
    if (filters.subcategoryId && row.subcategoryId !== filters.subcategoryId) {
      return false;
    }
    if (filters.productId && row.productId !== filters.productId) return false;
    if (filters.variantId && row.variantId !== filters.variantId) return false;
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
    const metrics = await computeOverviewMetrics(ctx, args);
    const snapshot = await ctx.db
      .query("reportSnapshots")
      .withIndex("by_key", (q) => q.eq("key", "dashboard"))
      .unique();

    // Daily breakdown table
    const { fromDate, toDate } = withDateBounds(args);
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

    return {
      metrics: {
        ...metrics,
        totalLineDiscount,
        totalOrderDiscount,
        totalDiscount: normalizeMoney(totalLineDiscount + totalOrderDiscount),
      },
      dailyBreakdown,
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

export const productPerformance = query({
  args: reportFilterArgs,
  handler: async (ctx, args) => {
    const rows = await loadVariantDailyRows(ctx, args);
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

    const allVariants = Array.from(byVariant.entries()).map(([variantId, value]) => ({
      variantId,
      ...value,
      netRevenue: normalizeMoney(value.soldRevenue - value.returnValue),
      avgPrice: value.soldQty > 0 ? normalizeMoney(value.soldRevenue / value.soldQty) : 0,
    }));

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
        if (args.categoryId && v.categoryId !== args.categoryId) return false;
        if (args.subcategoryId && v.subcategoryId !== args.subcategoryId) return false;
        if (args.productId && v.productId !== args.productId) return false;
        if (args.variantId && v._id !== args.variantId) return false;
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

    const trendingUp = await computeTrendingState(ctx, args);

    return {
      allVariants: allVariants.sort((a, b) => b.soldRevenue - a.soldRevenue),
      topSelling: allVariants
        .slice()
        .sort((a, b) => b.soldQty - a.soldQty)
        .slice(0, 10),
      lowSelling: allVariants
        .slice()
        .sort((a, b) => a.soldQty - b.soldQty)
        .slice(0, 10),
      categoryBreakdown: catBreakdown.sort((a, b) => b.soldRevenue - a.soldRevenue),
      deadStock,
      trendingUp: trendingUp.slice(0, 10),
    };
  },
});

export const inventoryHealth = query({
  args: reportFilterArgs,
  handler: async (ctx, args) => {
    const state = await computeInventoryHealthState(ctx, args);
    const all = [...state.lowStock, ...state.outOfStock, ...state.slowMoving];
    const uniqueItems = Array.from(new Map(all.map((i) => [i.variantId, i])).values());

    // Total stock value & SKU count from full active set
    const fullVariants = await ctx.db
      .query("productVariants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(500);
    const filtered = fullVariants.filter((v) => {
      if (args.categoryId && v.categoryId !== args.categoryId) return false;
      if (args.subcategoryId && v.subcategoryId !== args.subcategoryId) return false;
      if (args.productId && v.productId !== args.productId) return false;
      if (args.variantId && v._id !== args.variantId) return false;
      return true;
    });
    let totalStockValue = 0;
    const tiers = { zero: 0, low: 0, medium: 0, high: 0 };
    const enriched = await Promise.all(
      filtered.map(async (v) => {
        const il = await getInventoryLevelOrThrow(ctx, v._id);
        const stockValue = normalizeMoney(il.onHand * v.salePrice);
        totalStockValue += stockValue;
        if (il.onHand <= 0) tiers.zero++;
        else if (il.onHand <= 5) tiers.low++;
        else if (il.onHand <= 20) tiers.medium++;
        else tiers.high++;
        return { variantId: v._id, onHand: il.onHand };
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

    return {
      counts: {
        lowStock: state.lowStock.length,
        outOfStock: state.outOfStock.length,
        slowMoving: state.slowMoving.length,
      },
      totalStockValue,
      totalSKUs: filtered.length,
      stockTiers: tiers,
      lowStock: enrichList(state.lowStock).slice(0, 30),
      outOfStock: enrichList(state.outOfStock).slice(0, 30),
      slowMoving: enrichList(state.slowMoving).slice(0, 30),
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
    };
    const returnItems = await loadReturnItems(ctx, filters);
    const saleItems = await loadSaleItems(ctx, filters);
    const returns = await ctx.db
      .query("returns")
      .withIndex("by_businessDate", (q) =>
        q
          .gte("businessDate", filters.fromDate ?? "0000-01-01")
          .lte("businessDate", filters.toDate ?? "9999-12-31"),
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

    return {
      summary: {
        returnValue,
        returnCount: returnItems.length,
        returnedUnits,
        returnRate,
        returnValuePct,
      },
      mostReturned,
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
      v.literal("overview"),
      v.literal("productPerformance"),
      v.literal("inventoryHealth"),
      v.literal("returnsReport"),
      v.literal("salesTransactions"),
    ),
    ...reportFilterArgs,
  },
  handler: async (ctx, args) => {
    const { kind, ...filterArgs } = args;

    if (kind === "overview") {
      const r: any = await ctx.runQuery(publicApi.reports.overview, filterArgs);
      const rows = [
        ["Date", "Orders", "Revenue", "Returns", "Net", "Discounts"],
        ...(r.dailyBreakdown ?? []).map((d: any) => [
          d.date, d.orders, d.revenue, d.returns, d.net, d.discounts,
        ]),
        [],
        ["Summary Metric", "Value"],
        ["Net Revenue", r.metrics.revenue],
        ["Gross Revenue", r.metrics.grossRevenue],
        ["Total Returns", r.metrics.returnValue],
        ["Total Discounts", r.metrics.totalDiscount],
        ["Order Count", r.metrics.orderCount],
        ["Units Sold", r.metrics.unitsSold],
        ["Avg Order Value", r.metrics.avgOrderValue],
        ["Cash Revenue", r.metrics.paymentMix.cash],
        ["UPI Revenue", r.metrics.paymentMix.upi_mock],
      ];
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

    if (kind === "inventoryHealth") {
      const r: any = await ctx.runQuery(publicApi.reports.inventoryHealth, filterArgs);
      const allItems = [
        ...(r.lowStock ?? []).map((i: any) => ({ ...i, segment: "Low Stock" })),
        ...(r.outOfStock ?? []).map((i: any) => ({ ...i, segment: "Out of Stock" })),
        ...(r.slowMoving ?? []).map((i: any) => ({ ...i, segment: "Slow Moving" })),
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

    if (kind === "returnsReport") {
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

    // salesTransactions — every sale as a row
    const sales: any = await ctx.runQuery(publicApi.pos.salesList, {
      paginationOpts: { numItems: 500, cursor: null },
      search: null,
      fromDate: filterArgs.fromDate,
      toDate: filterArgs.toDate,
      paymentMethod: filterArgs.paymentMethod,
      status: "all",
    });
    return rowsToCsv([
      ["Sale Code", "Date", "Status", "Payment", "Customer", "Phone", "Subtotal", "Total", "Items", "Units"],
      ...(sales.page ?? []).map((s: any) => [
        s.saleCode,
        s.businessDate,
        s.status,
        s.paymentMethod,
        s.customerName ?? "Walk-in",
        s.customerPhone ?? "",
        s.total,
        s.total,
        s.itemCount,
        s.totalQty,
      ]),
    ]);
  },
});
