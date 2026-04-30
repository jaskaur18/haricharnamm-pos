import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  applyDailyRollupDelta,
  applyVariantDailyDelta,
  buildReturnCode,
  buildSaleCode,
  calculateLineTotal,
  cartLineValidator,
  computeSaleStatus,
  getInventoryLevelOrThrow,
  getPrimaryMediaUrl,
  makeBusinessDate,
  nextSequence,
  normalizeMoney,
  nullableCategoryIdValidator,
  nullableStringValidator,
  touchInventoryLevel,
  upsertCustomer,
  deriveStockStatus,
  paymentMethodValidator,
} from "./lib";

const salePreviewLineValidator = v.array(cartLineValidator);

const returnLineValidator = v.array(
  v.object({
    saleItemId: v.id("saleItems"),
    quantity: v.number(),
  }),
);

function allocateOrderDiscount(
  lines: Array<{
    quantity: number;
    lineDiscount: number;
    unitPrice: number;
  }>,
  orderDiscount: number,
) {
  const bases = lines.map((line) =>
    normalizeMoney(line.unitPrice * line.quantity - line.lineDiscount),
  );
  const totalBase = bases.reduce((sum, value) => sum + value, 0);

  if (totalBase <= 0 || orderDiscount <= 0) {
    return bases.map(() => 0);
  }

  let remaining = normalizeMoney(orderDiscount);
  return bases.map((base, index) => {
    if (index === bases.length - 1) {
      return remaining;
    }

    const allocated = normalizeMoney((base / totalBase) * orderDiscount);
    remaining = normalizeMoney(remaining - allocated);
    return allocated;
  });
}

async function serializeCatalogItem(
  ctx: QueryCtx,
  variant: Doc<"productVariants">,
) {
  const inventoryLevel = await getInventoryLevelOrThrow(ctx, variant._id);
  const mediaUrl =
    (await getPrimaryMediaUrl(ctx, variant.productId, variant._id)) ??
    (await getPrimaryMediaUrl(ctx, variant.productId));

  return {
    _id: variant._id,
    productId: variant.productId,
    displayCode: variant.displayCode,
    productCode: variant.productCode,
    productName: variant.productName,
    label: variant.label,
    optionSummary: variant.optionSummary,
    barcode: variant.barcode,
    salePrice: variant.salePrice,
    reorderThreshold: variant.reorderThreshold,
    onHand: inventoryLevel.onHand,
    stockState: deriveStockStatus(inventoryLevel.onHand, variant.reorderThreshold),
    mediaUrl,
  };
}

export const catalogSearch = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: nullableStringValidator,
    categoryId: nullableCategoryIdValidator,
    subcategoryId: nullableCategoryIdValidator,
    stockState: v.union(
      v.literal("all"),
      v.literal("in_stock"),
      v.literal("low_stock"),
      v.literal("out_of_stock"),
    ),
  },
  handler: async (ctx, args) => {
    const searchValue = args.search?.trim() ?? "";

    if (searchValue.length > 0) {
      const directCode = await ctx.db
        .query("productVariants")
        .withIndex("by_displayCode", (q) => q.eq("displayCode", searchValue))
        .unique();
      const directBarcode = await ctx.db
        .query("productVariants")
        .withIndex("by_barcode", (q) => q.eq("barcode", searchValue))
        .unique();
      const directMatches = [directCode, directBarcode].filter(
        (row): row is Doc<"productVariants"> => !!row && row.status === "active",
      );

      if (directMatches.length > 0) {
        const serializedMatches = await Promise.all(
          directMatches.map((match) => serializeCatalogItem(ctx, match)),
        );
        return {
          page: serializedMatches.filter((p) => args.stockState === "all" || p.stockState === args.stockState),
          isDone: true,
          continueCursor: args.paginationOpts.cursor,
        };
      }

      const searchQuery = ctx.db
        .query("productVariants")
        .withSearchIndex("search_by_searchText", (q) => {
          let searchBuilder = q.search("searchText", searchValue).eq(
            "status",
            "active",
          );

          if (args.categoryId) {
            searchBuilder = searchBuilder.eq("categoryId", args.categoryId);
          }
          if (args.subcategoryId) {
            searchBuilder = searchBuilder.eq("subcategoryId", args.subcategoryId);
          }
          return searchBuilder;
        });

      const result = await searchQuery.paginate(args.paginationOpts);
      const serializedPage = await Promise.all(
        result.page.map((variant) => serializeCatalogItem(ctx, variant)),
      );
      return {
        ...result,
        page: serializedPage.filter((p) => args.stockState === "all" || p.stockState === args.stockState),
      };
    }

    let baseQuery;
    if (args.subcategoryId) {
      const subcategoryId = args.subcategoryId;
      baseQuery = ctx.db
        .query("productVariants")
        .withIndex("by_status_and_subcategoryId", (q) =>
          q.eq("status", "active").eq("subcategoryId", subcategoryId),
        );
    } else if (args.categoryId) {
      const categoryId = args.categoryId;
      baseQuery = ctx.db
        .query("productVariants")
        .withIndex("by_status_and_categoryId", (q) =>
          q.eq("status", "active").eq("categoryId", categoryId),
        );
    } else {
      baseQuery = ctx.db
        .query("productVariants")
        .withIndex("by_status", (q) => q.eq("status", "active"));
    }

    const result = await baseQuery.order("desc").paginate(args.paginationOpts);
    const serializedPage = await Promise.all(
      result.page.map((variant) => serializeCatalogItem(ctx, variant)),
    );
    return {
      ...result,
      page: serializedPage.filter((p) => args.stockState === "all" || p.stockState === args.stockState),
    };
  },
});

export const resolveBarcode = query({
  args: { barcode: v.string() },
  handler: async (ctx, args) => {
    const directCode = await ctx.db
      .query("productVariants")
      .withIndex("by_displayCode", (q) => q.eq("displayCode", args.barcode))
      .unique();
    const directBarcode = await ctx.db
      .query("productVariants")
      .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode))
      .unique();
    const match = [directCode, directBarcode].find(
      (row): row is Doc<"productVariants"> => !!row && row.status === "active",
    );

    if (match) {
      return serializeCatalogItem(ctx, match);
    }
    return null;
  },
});

export const previewSale = query({
  args: {
    items: salePreviewLineValidator,
    orderDiscount: v.number(),
  },
  handler: async (ctx, args) => {
    const lines: Array<{
      variantId: Doc<"productVariants">["_id"];
      productId: Doc<"productVariants">["productId"];
      productCode: string;
      displayCode: string;
      productName: string;
      variantLabel: string;
      quantity: number;
      unitPrice: number;
      lineDiscount: number;
      baseLineTotal: number;
      onHand: number;
    }> = [];

    for (const item of args.items) {
      const variant = await ctx.db.get(item.variantId);
      if (!variant || variant.status !== "active") {
        throw new Error("Variant is not available for sale");
      }

      const inventoryLevel = await getInventoryLevelOrThrow(ctx, item.variantId);
      if (inventoryLevel.onHand < item.quantity) {
        throw new Error(`Not enough stock for ${variant.displayCode}`);
      }

      lines.push({
        variantId: item.variantId,
        productId: variant.productId,
        productCode: variant.productCode,
        displayCode: variant.displayCode,
        productName: variant.productName,
        variantLabel: variant.optionSummary,
        quantity: item.quantity,
        unitPrice: variant.salePrice,
        lineDiscount: normalizeMoney(item.lineDiscount),
        baseLineTotal: calculateLineTotal(
          variant.salePrice,
          item.quantity,
          normalizeMoney(item.lineDiscount),
        ),
        onHand: inventoryLevel.onHand,
      });
    }

    const subtotal = normalizeMoney(
      lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    );
    const lineDiscountTotal = normalizeMoney(
      lines.reduce((sum, line) => sum + line.lineDiscount, 0),
    );
    const discountableTotal = normalizeMoney(subtotal - lineDiscountTotal);
    const safeOrderDiscount = Math.min(
      normalizeMoney(args.orderDiscount),
      discountableTotal,
    );
    const allocations = allocateOrderDiscount(lines, safeOrderDiscount);
    const previewLines = lines.map((line, index) => ({
      ...line,
      orderDiscountAllocation: allocations[index],
      lineTotal: normalizeMoney(line.baseLineTotal - allocations[index]),
    }));

    return {
      lines: previewLines,
      summary: {
        subtotal,
        lineDiscountTotal,
        orderDiscount: safeOrderDiscount,
        total: normalizeMoney(
          previewLines.reduce((sum, line) => sum + line.lineTotal, 0),
        ),
        totalQty: previewLines.reduce((sum, line) => sum + line.quantity, 0),
        itemCount: previewLines.length,
      },
    };
  },
});

export const createSale = mutation({
  args: {
    items: salePreviewLineValidator,
    orderDiscount: v.number(),
    paymentMethod: paymentMethodValidator,
    paymentNote: nullableStringValidator,
    customerName: nullableStringValidator,
    customerPhone: nullableStringValidator,
    notes: nullableStringValidator,
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Cannot create an empty sale");
    }

    const timestamp = Date.now();
    const businessDate = makeBusinessDate(timestamp);
    const hydratedLines: Array<{
      item: { variantId: Doc<"productVariants">["_id"]; quantity: number; lineDiscount: number };
      variant: Doc<"productVariants">;
      inventoryLevel: Doc<"inventoryLevels">;
    }> = [];

    for (const item of args.items) {
      if (item.quantity <= 0) {
        throw new Error("Sale quantity must be greater than zero");
      }

      const variant = await ctx.db.get(item.variantId);
      if (!variant || variant.status !== "active") {
        throw new Error("Variant is no longer available");
      }

      const inventoryLevel = await getInventoryLevelOrThrow(ctx, item.variantId);
      if (inventoryLevel.onHand < item.quantity) {
        throw new Error(`Insufficient stock for ${variant.displayCode}`);
      }

      hydratedLines.push({
        item,
        variant,
        inventoryLevel,
      });
    }

    const subtotal = normalizeMoney(
      hydratedLines.reduce(
        (sum, line) => sum + line.variant.salePrice * line.item.quantity,
        0,
      ),
    );
    const lineDiscountTotal = normalizeMoney(
      hydratedLines.reduce((sum, line) => sum + line.item.lineDiscount, 0),
    );
    const safeOrderDiscount = Math.min(
      normalizeMoney(args.orderDiscount),
      normalizeMoney(subtotal - lineDiscountTotal),
    );
    const orderAllocations = allocateOrderDiscount(
      hydratedLines.map((line) => ({
        quantity: line.item.quantity,
        lineDiscount: line.item.lineDiscount,
        unitPrice: line.variant.salePrice,
      })),
      safeOrderDiscount,
    );

    const sequenceNumber = await nextSequence(ctx, "sale");
    const saleCode = buildSaleCode(sequenceNumber);
    const customerId = await upsertCustomer(
      ctx,
      args.customerName,
      args.customerPhone,
    );
    const saleId = await ctx.db.insert("sales", {
      sequenceNumber,
      saleCode,
      businessDate,
      status: "completed",
      paymentMethod: args.paymentMethod,
      paymentNote: args.paymentNote,
      subtotal,
      lineDiscountTotal,
      orderDiscount: safeOrderDiscount,
      total: 0,
      totalQty: hydratedLines.reduce(
        (sum, line) => sum + line.item.quantity,
        0,
      ),
      itemCount: hydratedLines.length,
      customerId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      notes: args.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    let orderTotal = 0;

    for (let index = 0; index < hydratedLines.length; index += 1) {
      const line = hydratedLines[index];
      const orderDiscountAllocation = orderAllocations[index];
      const baseLineTotal = calculateLineTotal(
        line.variant.salePrice,
        line.item.quantity,
        line.item.lineDiscount,
      );
      const lineTotal = normalizeMoney(baseLineTotal - orderDiscountAllocation);
      orderTotal = normalizeMoney(orderTotal + lineTotal);

      await ctx.db.insert("saleItems", {
        saleId,
        businessDate,
        paymentMethod: args.paymentMethod,
        saleStatus: "completed",
        productId: line.variant.productId,
        variantId: line.variant._id,
        categoryId: line.variant.categoryId,
        subcategoryId: line.variant.subcategoryId,
        productCode: line.variant.productCode,
        productName: line.variant.productName,
        variantLabel: line.variant.optionSummary,
        quantity: line.item.quantity,
        returnedQuantity: 0,
        unitPrice: line.variant.salePrice,
        lineDiscount: normalizeMoney(line.item.lineDiscount),
        lineTotal,
        createdAt: timestamp,
      });

      const nextOnHand = line.inventoryLevel.onHand - line.item.quantity;
      await touchInventoryLevel(
        ctx,
        line.variant._id,
        nextOnHand,
        "sale",
        saleCode,
        timestamp,
        timestamp,
      );
      await ctx.db.insert("stockMovements", {
        variantId: line.variant._id,
        productId: line.variant.productId,
        businessDate,
        type: "sale",
        quantityDelta: line.item.quantity * -1,
        quantityAfter: nextOnHand,
        reason: "POS sale",
        referenceCode: saleCode,
        note: null,
        createdAt: timestamp,
      });
      await applyVariantDailyDelta(ctx, {
        businessDate,
        productId: line.variant.productId,
        variantId: line.variant._id,
        categoryId: line.variant.categoryId,
        subcategoryId: line.variant.subcategoryId,
        productCode: line.variant.productCode,
        productName: line.variant.productName,
        variantLabel: line.variant.optionSummary,
        soldQty: line.item.quantity,
        soldRevenue: lineTotal,
        returnQty: 0,
        returnValue: 0,
        lastSoldAt: timestamp,
        lastReturnedAt: null,
      });
    }

    await ctx.db.patch(saleId, {
      total: orderTotal,
      updatedAt: Date.now(),
    });

    await applyDailyRollupDelta(ctx, businessDate, {
      grossRevenue: orderTotal,
      orderCount: 1,
      unitsCount: hydratedLines.reduce((sum, line) => sum + line.item.quantity, 0),
      lineDiscountTotal,
      orderDiscountTotal: safeOrderDiscount,
      returnCount: 0,
      returnValue: 0,
      cashRevenue: args.paymentMethod === "cash" ? orderTotal : 0,
      upiRevenue: args.paymentMethod === "upi" ? orderTotal : 0,
    });

    return {
      saleId,
      saleCode,
    };
  },
});

export const saleDetail = query({
  args: {
    saleId: v.id("sales"),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) {
      return null;
    }

    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_saleId", (q) => q.eq("saleId", args.saleId))
      .take(100);
    const returns = await ctx.db
      .query("returns")
      .withIndex("by_saleId", (q) => q.eq("saleId", args.saleId))
      .take(20);

    const serializedItems = await Promise.all(
      items.map(async (item) => {
        const mediaUrl =
          (await getPrimaryMediaUrl(ctx, item.productId, item.variantId)) ??
          (await getPrimaryMediaUrl(ctx, item.productId));
        return {
          ...item,
          mediaUrl,
          remainingQty: item.quantity - item.returnedQuantity,
        };
      })
    );

    const serializedReturns = await Promise.all(
      returns.map(async (returnRow) => {
        const returnItems = await ctx.db
          .query("returnItems")
          .withIndex("by_returnId", (q) => q.eq("returnId", returnRow._id))
          .take(50);
        return {
          ...returnRow,
          items: returnItems,
        };
      })
    );

    return {
      ...sale,
      items: serializedItems,
      returns: serializedReturns,
    };
  },
});

export const salesList = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: nullableStringValidator,
    fromDate: nullableStringValidator,
    toDate: nullableStringValidator,
    paymentMethod: v.union(
      v.literal("all"),
      v.literal("cash"),
      v.literal("upi"),
    ),
    status: v.union(
      v.literal("all"),
      v.literal("completed"),
      v.literal("returned_partial"),
      v.literal("returned_full"),
    ),
  },
  handler: async (ctx, args) => {
    const lowerBound = args.fromDate ?? "0000-01-01";
    const upperBound = args.toDate ?? "9999-12-31";

    let queryBuilder;
    if (args.paymentMethod !== "all") {
      const paymentMethod = args.paymentMethod;
      queryBuilder = ctx.db
        .query("sales")
        .withIndex("by_paymentMethod_and_businessDate", (q) =>
          q
            .eq("paymentMethod", paymentMethod)
            .gte("businessDate", lowerBound)
            .lte("businessDate", upperBound),
        );
    } else if (args.status !== "all") {
      const status = args.status;
      queryBuilder = ctx.db
        .query("sales")
        .withIndex("by_status_and_businessDate", (q) =>
          q
            .eq("status", status)
            .gte("businessDate", lowerBound)
            .lte("businessDate", upperBound),
        );
    } else {
      queryBuilder = ctx.db.query("sales").withIndex("by_businessDate", (q) =>
        q.gte("businessDate", lowerBound).lte("businessDate", upperBound),
      );
    }

    const result = await queryBuilder.order("desc").paginate(args.paginationOpts);
    const searchValue = args.search?.trim().toLowerCase() ?? "";
    const page = result.page.filter((sale) => {
      if (args.status !== "all" && sale.status !== args.status) {
        return false;
      }
      if (searchValue.length === 0) {
        return true;
      }

      return (
        sale.saleCode.toLowerCase().includes(searchValue) ||
        (sale.customerName ?? "").toLowerCase().includes(searchValue) ||
        (sale.customerPhone ?? "").toLowerCase().includes(searchValue)
      );
    });

    return {
      ...result,
      page,
    };
  },
});

export const createReturn = mutation({
  args: {
    saleId: v.id("sales"),
    items: returnLineValidator,
    refundMethod: paymentMethodValidator,
    refundNote: nullableStringValidator,
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Select at least one sale item to return");
    }

    const sale = await ctx.db.get(args.saleId);
    if (!sale) {
      throw new Error("Sale not found");
    }

    const saleItems = await ctx.db
      .query("saleItems")
      .withIndex("by_saleId", (q) => q.eq("saleId", args.saleId))
      .take(100);
    const saleItemMap = new Map(
      saleItems.map((saleItem) => [saleItem._id, saleItem]),
    );

    const timestamp = Date.now();
    const businessDate = makeBusinessDate(timestamp);
    const sequenceNumber = await nextSequence(ctx, "return");
    const returnCode = buildReturnCode(sequenceNumber);

    let subtotal = 0;
    let totalQty = 0;

    const createdReturnId = await ctx.db.insert("returns", {
      sequenceNumber,
      returnCode,
      saleId: args.saleId,
      saleCode: sale.saleCode,
      businessDate,
      status: "completed",
      refundMethod: args.refundMethod,
      refundNote: args.refundNote,
      subtotal: 0,
      totalQty: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    for (const requestedItem of args.items) {
      const saleItem = saleItemMap.get(requestedItem.saleItemId);
      if (!saleItem) {
        throw new Error("Sale item not found");
      }

      const remainingQty = saleItem.quantity - saleItem.returnedQuantity;
      if (requestedItem.quantity <= 0 || requestedItem.quantity > remainingQty) {
        throw new Error(`Invalid return quantity for ${saleItem.productCode}`);
      }

      const refundAmount = normalizeMoney(
        (saleItem.lineTotal / saleItem.quantity) * requestedItem.quantity,
      );
      subtotal = normalizeMoney(subtotal + refundAmount);
      totalQty += requestedItem.quantity;

      await ctx.db.insert("returnItems", {
        returnId: createdReturnId,
        saleId: args.saleId,
        saleItemId: saleItem._id,
        businessDate,
        productId: saleItem.productId,
        variantId: saleItem.variantId,
        categoryId: saleItem.categoryId,
        subcategoryId: saleItem.subcategoryId,
        productCode: saleItem.productCode,
        productName: saleItem.productName,
        variantLabel: saleItem.variantLabel,
        quantity: requestedItem.quantity,
        refundAmount,
        createdAt: timestamp,
      });

      await ctx.db.patch(saleItem._id, {
        returnedQuantity: saleItem.returnedQuantity + requestedItem.quantity,
      });

      const variant = await ctx.db.get(saleItem.variantId);
      if (!variant) {
        throw new Error("Variant missing for return");
      }

      const inventoryLevel = await getInventoryLevelOrThrow(ctx, saleItem.variantId);
      const nextOnHand = inventoryLevel.onHand + requestedItem.quantity;
      await touchInventoryLevel(
        ctx,
        saleItem.variantId,
        nextOnHand,
        "return",
        returnCode,
        timestamp,
      );
      await ctx.db.insert("stockMovements", {
        variantId: saleItem.variantId,
        productId: saleItem.productId,
        businessDate,
        type: "return",
        quantityDelta: requestedItem.quantity,
        quantityAfter: nextOnHand,
        reason: "Sales return",
        referenceCode: returnCode,
        note: args.refundNote,
        createdAt: timestamp,
      });
      await applyVariantDailyDelta(ctx, {
        businessDate,
        productId: saleItem.productId,
        variantId: saleItem.variantId,
        categoryId: saleItem.categoryId,
        subcategoryId: saleItem.subcategoryId,
        productCode: saleItem.productCode,
        productName: saleItem.productName,
        variantLabel: saleItem.variantLabel,
        soldQty: 0,
        soldRevenue: 0,
        returnQty: requestedItem.quantity,
        returnValue: refundAmount,
        lastSoldAt: null,
        lastReturnedAt: timestamp,
      });
    }

    const refreshedSaleItems = await ctx.db
      .query("saleItems")
      .withIndex("by_saleId", (q) => q.eq("saleId", args.saleId))
      .take(100);
    const totalSoldQty = refreshedSaleItems.reduce(
      (sum, saleItem) => sum + saleItem.quantity,
      0,
    );
    const totalReturnedQty = refreshedSaleItems.reduce(
      (sum, saleItem) => sum + saleItem.returnedQuantity,
      0,
    );
    const nextStatus = computeSaleStatus(totalSoldQty, totalReturnedQty);

    await ctx.db.patch(sale._id, {
      status: nextStatus,
      updatedAt: timestamp,
    });
    await ctx.db.patch(createdReturnId, {
      subtotal,
      totalQty,
      updatedAt: timestamp,
    });

    await applyDailyRollupDelta(ctx, businessDate, {
      grossRevenue: 0,
      orderCount: 0,
      unitsCount: 0,
      lineDiscountTotal: 0,
      orderDiscountTotal: 0,
      returnCount: 1,
      returnValue: subtotal,
      cashRevenue: 0,
      upiRevenue: 0,
    });

    return {
      returnId: createdReturnId,
      returnCode,
    };
  },
});

export const catalogProductDetails = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();

    const serializedVariants = await Promise.all(
      variants.map(async (v) => {
        const il = await ctx.db
          .query("inventoryLevels")
          .withIndex("by_variantId", (q) => q.eq("variantId", v._id))
          .unique();
        return {
          _id: v._id,
          label: v.label,
          displayCode: v.displayCode,
          optionSummary: v.optionSummary,
          salePrice: v.salePrice,
          reorderThreshold: v.reorderThreshold,
          attributes: v.attributes,
          onHand: il?.onHand ?? 0,
        };
      }),
    );

    return {
      _id: product._id,
      name: product.name,
      description: product.description,
      brandCopy: product.brandCopy,
      merchandisingTags: product.merchandisingTags,
      productCode: product.productCode,
      variants: serializedVariants,
    };
  },
});

export const productMediaGallery = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const mediaRows = await ctx.db
      .query("productMedia")
      .withIndex("by_productId_and_sortOrder", (q) => q.eq("productId", args.productId))
      .collect();

    const result: any[] = [];
    for (const row of mediaRows) {
      const url = await ctx.storage.getUrl(row.storageId);
      if (url) {
        result.push({ ...row, url });
      }
    }
    return result;
  },
});
