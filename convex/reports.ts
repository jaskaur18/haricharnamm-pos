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

    return {
      metrics,
      suggestions: snapshot
        ? JSON.parse(snapshot.payload)
        : await buildDashboardSuggestions(ctx),
      snapshotGeneratedAt: snapshot?.generatedAt ?? null,
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

    const rowsArray = Array.from(byVariant.entries()).map(([variantId, value]) => ({
      variantId,
      ...value,
    }));
    const trendingUp = await computeTrendingState(ctx, args);

    return {
      topSelling: rowsArray
        .slice()
        .sort((left, right) => right.soldQty - left.soldQty)
        .slice(0, 10),
      lowSelling: rowsArray
        .slice()
        .sort((left, right) => left.soldQty - right.soldQty)
        .slice(0, 10),
      trendingUp: trendingUp.slice(0, 10),
    };
  },
});

export const inventoryHealth = query({
  args: reportFilterArgs,
  handler: async (ctx, args) => {
    const state = await computeInventoryHealthState(ctx, args);
    return {
      counts: {
        lowStock: state.lowStock.length,
        outOfStock: state.outOfStock.length,
        slowMoving: state.slowMoving.length,
      },
      lowStock: state.lowStock.slice(0, 20),
      outOfStock: state.outOfStock.slice(0, 20),
      slowMoving: state.slowMoving.slice(0, 20),
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
    const returns = await ctx.db
      .query("returns")
      .withIndex("by_businessDate", (q) =>
        q
          .gte("businessDate", filters.fromDate ?? "0000-01-01")
          .lte("businessDate", filters.toDate ?? "9999-12-31"),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      summary: {
        returnValue: normalizeMoney(
          returnItems.reduce((sum, item) => sum + item.refundAmount, 0),
        ),
        returnCount: returnItems.length,
        returnedUnits: returnItems.reduce((sum, item) => sum + item.quantity, 0),
      },
      page: returns.page,
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
    ),
    ...reportFilterArgs,
  },
  handler: async (ctx, args) => {
    if (args.kind === "overview") {
      const overviewResult: any = await ctx.runQuery(publicApi.reports.overview, args);
      return rowsToCsv([
        ["metric", "value"],
        ["revenue", overviewResult.metrics.revenue],
        ["grossRevenue", overviewResult.metrics.grossRevenue],
        ["returnValue", overviewResult.metrics.returnValue],
        ["orderCount", overviewResult.metrics.orderCount],
        ["unitsSold", overviewResult.metrics.unitsSold],
        ["avgOrderValue", overviewResult.metrics.avgOrderValue],
        ["cashRevenue", overviewResult.metrics.paymentMix.cash],
        ["upiRevenue", overviewResult.metrics.paymentMix.upi_mock],
      ]);
    }

    if (args.kind === "productPerformance") {
      const report: any = await ctx.runQuery(publicApi.reports.productPerformance, args);
      return rowsToCsv([
        ["segment", "productCode", "productName", "variantLabel", "soldQty", "soldRevenue"],
        ...report.topSelling.map((row: any) => [
          "topSelling",
          row.productCode,
          row.productName,
          row.variantLabel,
          row.soldQty,
          row.soldRevenue,
        ]),
        ...report.lowSelling.map((row: any) => [
          "lowSelling",
          row.productCode,
          row.productName,
          row.variantLabel,
          row.soldQty,
          row.soldRevenue,
        ]),
      ]);
    }

    if (args.kind === "inventoryHealth") {
      const report: any = await ctx.runQuery(publicApi.reports.inventoryHealth, args);
      return rowsToCsv([
        ["segment", "productCode", "displayCode", "productName", "variantLabel", "onHand"],
        ...report.lowStock.map((row: any) => [
          "lowStock",
          row.productCode,
          row.displayCode,
          row.productName,
          row.variantLabel,
          row.onHand,
        ]),
        ...report.outOfStock.map((row: any) => [
          "outOfStock",
          row.productCode,
          row.displayCode,
          row.productName,
          row.variantLabel,
          row.onHand,
        ]),
        ...report.slowMoving.map((row: any) => [
          "slowMoving",
          row.productCode,
          row.displayCode,
          row.productName,
          row.variantLabel,
          row.onHand,
        ]),
      ]);
    }

    const report: any = await ctx.runQuery(publicApi.reports.returnsReport, {
      ...args,
      paginationOpts: {
        numItems: 100,
        cursor: null,
      },
    });
    return rowsToCsv([
      ["metric", "value"],
      ["returnValue", report.summary.returnValue],
      ["returnCount", report.summary.returnCount],
      ["returnedUnits", report.summary.returnedUnits],
    ]);
  },
});
