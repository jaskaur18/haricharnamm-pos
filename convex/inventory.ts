import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  buildProductCode,
  getInventoryLevelOrThrow,
  getPrimaryMediaUrl,
  makeBusinessDate,
  makeSearchText,
  nextSequence,
  nullableCategoryIdValidator,
  nullableStringValidator,
  nullableVariantIdValidator,
  productStatusValidator,
  slugify,
  touchInventoryLevel,
  variantAttributeValidator,
  deriveStockStatus,
} from "./lib";

const variantInputValidator = v.object({
  variantId: nullableVariantIdValidator,
  label: v.string(),
  barcode: nullableStringValidator,
  attributes: variantAttributeValidator,
  salePrice: v.number(),
  reorderThreshold: v.number(),
  openingQuantity: v.number(),
});

const saveProductArgs = {
  name: v.string(),
  description: v.string(),
  categoryId: v.id("categories"),
  subcategoryId: nullableCategoryIdValidator,
  status: productStatusValidator,
  brandCopy: v.string(),
  notes: nullableStringValidator,
  merchandisingTags: v.array(v.string()),
  variants: v.array(variantInputValidator),
};

const DEFAULT_CATEGORY_SEED = [
  {
    name: "Crowns & Mukuts",
    subcategories: ["Peacock Feather", "Stone Work", "Festival"],
  },
  {
    name: "Necklaces & Haar",
    subcategories: ["Tulsi", "Pearl", "Decorative"],
  },
  {
    name: "Vastra & Poshak",
    subcategories: ["Daily", "Premium", "Seasonal"],
  },
  {
    name: "Pooja Accessories",
    subcategories: ["Garlands", "Flutes", "Chowki Decor"],
  },
];

function buildVariantSearchText(
  productName: string,
  productCode: string,
  displayCode: string,
  label: string,
  barcode: string | null,
  attributes: Array<{ name: string; value: string }>,
) {
  return makeSearchText([
    productName,
    productCode,
    displayCode,
    label,
    barcode,
    ...attributes.map((attribute) => `${attribute.name} ${attribute.value}`),
  ]);
}

function makeVariantLabel(
  label: string,
  attributes: Array<{ name: string; value: string }>,
) {
  if (attributes.length === 0) {
    return label.trim();
  }

  return makeSearchText([
    label,
    attributes.map((attribute) => attribute.value).join(" / "),
  ]);
}

async function serializeVariantCard(
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
    productCode: variant.productCode,
    displayCode: variant.displayCode,
    productName: variant.productName,
    label: variant.label,
    optionSummary: variant.optionSummary,
    barcode: variant.barcode,
    salePrice: variant.salePrice,
    reorderThreshold: variant.reorderThreshold,
    status: variant.status,
    categoryId: variant.categoryId,
    subcategoryId: variant.subcategoryId,
    onHand: inventoryLevel.onHand,
    lastSaleAt: inventoryLevel.lastSaleAt,
    stockState: deriveStockStatus(inventoryLevel.onHand, variant.reorderThreshold),
    mediaUrl,
  };
}

export const listCategories = query({
  args: {
    includeInactive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const categoryRows = await ctx.db.query("categories").take(200);
    const activeRows = args.includeInactive
      ? categoryRows
      : categoryRows.filter((row) => row.isActive);

    const byParent = new Map<string, Doc<"categories">[]>();
    for (const row of activeRows) {
      const key = row.parentCategoryId ?? "root";
      const bucket = byParent.get(key) ?? [];
      bucket.push(row);
      byParent.set(key, bucket);
    }

    return (byParent.get("root") ?? [])
      .filter((row) => row.level === "category")
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((category) => ({
        ...category,
        children: (byParent.get(category._id) ?? [])
          .filter((row) => row.level === "subcategory")
          .sort((left, right) => left.sortOrder - right.sortOrder),
      }));
  },
});

export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("categories").take(1);
    if (existing.length > 0) {
      return { created: false };
    }

    for (let index = 0; index < DEFAULT_CATEGORY_SEED.length; index += 1) {
      const category = DEFAULT_CATEGORY_SEED[index];
      const categoryId = await ctx.db.insert("categories", {
        name: category.name,
        slug: slugify(category.name),
        parentCategoryId: null,
        level: "category",
        isActive: true,
        sortOrder: index,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (
        let subcategoryIndex = 0;
        subcategoryIndex < category.subcategories.length;
        subcategoryIndex += 1
      ) {
        const subcategory = category.subcategories[subcategoryIndex];
        await ctx.db.insert("categories", {
          name: subcategory,
          slug: slugify(`${category.name}-${subcategory}`),
          parentCategoryId: categoryId,
          level: "subcategory",
          isActive: true,
          sortOrder: subcategoryIndex,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    return { created: true };
  },
});

export const saveCategory = mutation({
  args: {
    categoryId: nullableCategoryIdValidator,
    name: v.string(),
    parentCategoryId: nullableCategoryIdValidator,
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const slug = slugify(args.name);
    const level = args.parentCategoryId ? "subcategory" : "category";

    if (!args.categoryId) {
      const siblingRows = await ctx.db
        .query("categories")
        .withIndex("by_parentCategoryId_and_sortOrder", (q) =>
          q.eq("parentCategoryId", args.parentCategoryId),
        )
        .take(100);

      const nextSortOrder =
        siblingRows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

      return await ctx.db.insert("categories", {
        name: args.name,
        slug,
        parentCategoryId: args.parentCategoryId,
        level,
        isActive: args.isActive,
        sortOrder: nextSortOrder,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.categoryId, {
      name: args.name,
      slug,
      parentCategoryId: args.parentCategoryId,
      level,
      isActive: args.isActive,
      updatedAt: now,
    });

    return args.categoryId;
  },
});

export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parentCategoryId_and_sortOrder", (q) =>
        q.eq("parentCategoryId", args.categoryId),
      )
      .take(1);

    if (children.length > 0) {
      throw new Error("Cannot delete a category that has subcategories.");
    }

    // Check if products use this category/subcategory
    const productsUsingCategory = await ctx.db
      .query("products")
      .withIndex("by_categoryId_and_status", (q) => q.eq("categoryId", args.categoryId))
      .take(1);
      
    if (productsUsingCategory.length > 0) {
       throw new Error("Cannot delete category. It is being referenced by existing products.");
    }

    const productsUsingSub = await ctx.db
      .query("products")
      .withIndex("by_subcategoryId_and_status", (q) => q.eq("subcategoryId", args.categoryId))
      .take(1);

    if (productsUsingSub.length > 0) {
       throw new Error("Cannot delete subcategory. It is being referenced by existing products.");
    }

    await ctx.db.delete(args.categoryId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachMedia = mutation({
  args: {
    productId: v.id("products"),
    variantId: nullableVariantIdValidator,
    storageId: v.id("_storage"),
    caption: nullableStringValidator,
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("productMedia")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        productId: args.productId,
        variantId: args.variantId,
        caption: args.caption,
        sortOrder: args.sortOrder,
      });
      return existing._id;
    }

    return await ctx.db.insert("productMedia", {
      productId: args.productId,
      variantId: args.variantId,
      storageId: args.storageId,
      caption: args.caption,
      sortOrder: args.sortOrder,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: nullableStringValidator,
    categoryId: nullableCategoryIdValidator,
    subcategoryId: nullableCategoryIdValidator,
    status: v.union(v.literal("all"), v.literal("active"), v.literal("archived")),
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
        (row): row is Doc<"productVariants"> => !!row,
      );
      if (directMatches.length > 0) {
        const serializedMatches = await Promise.all(
          directMatches.map((match) => serializeVariantCard(ctx, match))
        );
        return {
          page: serializedMatches,
          isDone: true,
          continueCursor: args.paginationOpts.cursor,
        };
      }

      const searchQuery = ctx.db
        .query("productVariants")
        .withSearchIndex("search_by_searchText", (q) => {
          let searchBuilder = q.search("searchText", searchValue);

          if (args.status !== "all") {
            searchBuilder = searchBuilder.eq("status", args.status);
          }
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
        result.page.map((variant) => serializeVariantCard(ctx, variant))
      );
      const page = serializedPage.filter(
        (serialized) =>
          args.stockState === "all" || serialized.stockState === args.stockState
      );

      return {
        ...result,
        page,
      };
    }

    let baseQuery;
    if (args.subcategoryId && args.status !== "all") {
      const status = args.status;
      const subcategoryId = args.subcategoryId;
      baseQuery = ctx.db
        .query("productVariants")
        .withIndex("by_status_and_subcategoryId", (q) =>
          q.eq("status", status).eq("subcategoryId", subcategoryId),
        );
    } else if (args.categoryId && args.status !== "all") {
      const status = args.status;
      const categoryId = args.categoryId;
      baseQuery = ctx.db
        .query("productVariants")
        .withIndex("by_status_and_categoryId", (q) =>
          q.eq("status", status).eq("categoryId", categoryId),
        );
    } else if (args.subcategoryId) {
      const subcategoryId = args.subcategoryId;
      baseQuery = ctx.db
        .query("productVariants")
        .withIndex("by_subcategoryId", (q) => q.eq("subcategoryId", subcategoryId));
    } else if (args.categoryId) {
      const categoryId = args.categoryId;
      baseQuery = ctx.db
        .query("productVariants")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", categoryId));
    } else if (args.status !== "all") {
      const status = args.status;
      baseQuery = ctx.db
        .query("productVariants")
        .withIndex("by_status", (q) => q.eq("status", status));
    } else {
      baseQuery = ctx.db.query("productVariants");
    }

    const result = await baseQuery.order("desc").paginate(args.paginationOpts);
    const serializedPage = await Promise.all(
      result.page.map((variant) => serializeVariantCard(ctx, variant))
    );
    const page = serializedPage.filter(
      (serialized) =>
        args.stockState === "all" || serialized.stockState === args.stockState
    );

    return {
      ...result,
      page,
    };
  },
});

export const detail = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      return null;
    }

    const category = await ctx.db.get(product.categoryId);
    const subcategory = product.subcategoryId
      ? await ctx.db.get(product.subcategoryId)
      : null;
    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(50);
    const mediaRows = await ctx.db
      .query("productMedia")
      .withIndex("by_productId_and_sortOrder", (q) => q.eq("productId", args.productId))
      .take(20);

    const serializedVariants = await Promise.all(
      variants.map(async (variant) => {
        const inventoryLevel = await getInventoryLevelOrThrow(ctx, variant._id);
        const mediaUrl =
          (await getPrimaryMediaUrl(ctx, variant.productId, variant._id)) ??
          (await getPrimaryMediaUrl(ctx, variant.productId));
        return {
          ...variant,
          inventoryLevel,
          mediaUrl,
        };
      })
    );

    const media = await Promise.all(
      mediaRows.map(async (row) => ({
        ...row,
        url: await ctx.storage.getUrl(row.storageId),
      }))
    );

    return {
      ...product,
      category,
      subcategory,
      variants: serializedVariants,
      media,
    };
  },
});

export const create = mutation({
  args: saveProductArgs,
  handler: async (ctx, args) => {
    const now = Date.now();
    const productSequence = await nextSequence(ctx, "product");
    const productCode = buildProductCode(productSequence);
    const productId = await ctx.db.insert("products", {
      sequenceNumber: productSequence,
      productCode,
      name: args.name,
      description: args.description,
      categoryId: args.categoryId,
      subcategoryId: args.subcategoryId,
      status: args.status,
      brandCopy: args.brandCopy,
      notes: args.notes,
      merchandisingTags: args.merchandisingTags,
      createdAt: now,
      updatedAt: now,
    });

    for (let index = 0; index < args.variants.length; index += 1) {
      const variant = args.variants[index];
      const sequenceNumber = index + 1;
      const displayCode = `${productCode}-${String(sequenceNumber).padStart(2, "0")}`;
      const optionSummary = makeVariantLabel(variant.label, variant.attributes);
      const variantId = await ctx.db.insert("productVariants", {
        productId,
        productCode,
        productName: args.name,
        categoryId: args.categoryId,
        subcategoryId: args.subcategoryId,
        status: args.status,
        sequenceNumber,
        displayCode,
        barcode: variant.barcode,
        label: variant.label,
        optionSummary,
        attributes: variant.attributes,
        salePrice: variant.salePrice,
        reorderThreshold: variant.reorderThreshold,
        searchText: buildVariantSearchText(
          args.name,
          productCode,
          displayCode,
          variant.label,
          variant.barcode,
          variant.attributes,
        ),
        createdAt: now,
        updatedAt: now,
      });

      const businessDate = makeBusinessDate(now);
      await ctx.db.insert("inventoryLevels", {
        variantId,
        onHand: variant.openingQuantity,
        lastMovementAt: now,
        lastMovementType: variant.openingQuantity > 0 ? "opening" : "none",
        lastReferenceCode: variant.openingQuantity > 0 ? productCode : null,
        lastSaleAt: null,
        updatedAt: now,
      });

      if (variant.openingQuantity > 0) {
        await ctx.db.insert("stockMovements", {
          variantId,
          productId,
          businessDate,
          type: "opening",
          quantityDelta: variant.openingQuantity,
          quantityAfter: variant.openingQuantity,
          reason: "Initial stock",
          referenceCode: productCode,
          note: null,
          createdAt: now,
        });
      }
    }

    return {
      productId,
      productCode,
    };
  },
});

export const update = mutation({
  args: {
    productId: v.id("products"),
    ...saveProductArgs,
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.productId, {
      name: args.name,
      description: args.description,
      categoryId: args.categoryId,
      subcategoryId: args.subcategoryId,
      status: args.status,
      brandCopy: args.brandCopy,
      notes: args.notes,
      merchandisingTags: args.merchandisingTags,
      updatedAt: now,
    });

    const existingVariants = await ctx.db
      .query("productVariants")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(50);
    const existingVariantMap = new Map(
      existingVariants.map((variant) => [variant._id, variant]),
    );
    const submittedVariantIds = new Set<string>();
    let nextSequenceNumber =
      existingVariants.reduce(
        (max, variant) => Math.max(max, variant.sequenceNumber),
        0,
      ) + 1;

    for (const variantInput of args.variants) {
      const existingVariant = variantInput.variantId
        ? existingVariantMap.get(variantInput.variantId)
        : null;

      if (!existingVariant) {
        const displayCode = `${product.productCode}-${String(nextSequenceNumber).padStart(2, "0")}`;
        const optionSummary = makeVariantLabel(
          variantInput.label,
          variantInput.attributes,
        );
        const variantId = await ctx.db.insert("productVariants", {
          productId: args.productId,
          productCode: product.productCode,
          productName: args.name,
          categoryId: args.categoryId,
          subcategoryId: args.subcategoryId,
          status: args.status,
          sequenceNumber: nextSequenceNumber,
          displayCode,
          barcode: variantInput.barcode,
          label: variantInput.label,
          optionSummary,
          attributes: variantInput.attributes,
          salePrice: variantInput.salePrice,
          reorderThreshold: variantInput.reorderThreshold,
          searchText: buildVariantSearchText(
            args.name,
            product.productCode,
            displayCode,
            variantInput.label,
            variantInput.barcode,
            variantInput.attributes,
          ),
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("inventoryLevels", {
          variantId,
          onHand: variantInput.openingQuantity,
          lastMovementAt: now,
          lastMovementType: variantInput.openingQuantity > 0 ? "opening" : "none",
          lastReferenceCode:
            variantInput.openingQuantity > 0 ? product.productCode : null,
          lastSaleAt: null,
          updatedAt: now,
        });

        if (variantInput.openingQuantity > 0) {
          await ctx.db.insert("stockMovements", {
            variantId,
            productId: args.productId,
            businessDate: makeBusinessDate(now),
            type: "opening",
            quantityDelta: variantInput.openingQuantity,
            quantityAfter: variantInput.openingQuantity,
            reason: "Opening stock",
            referenceCode: product.productCode,
            note: null,
            createdAt: now,
          });
        }

        nextSequenceNumber += 1;
        continue;
      }

      submittedVariantIds.add(existingVariant._id);
      await ctx.db.patch(existingVariant._id, {
        productName: args.name,
        categoryId: args.categoryId,
        subcategoryId: args.subcategoryId,
        status: args.status,
        barcode: variantInput.barcode,
        label: variantInput.label,
        optionSummary: makeVariantLabel(
          variantInput.label,
          variantInput.attributes,
        ),
        attributes: variantInput.attributes,
        salePrice: variantInput.salePrice,
        reorderThreshold: variantInput.reorderThreshold,
        searchText: buildVariantSearchText(
          args.name,
          product.productCode,
          existingVariant.displayCode,
          variantInput.label,
          variantInput.barcode,
          variantInput.attributes,
        ),
        updatedAt: now,
      });
    }

    for (const existingVariant of existingVariants) {
      if (submittedVariantIds.has(existingVariant._id)) {
        continue;
      }

      await ctx.db.patch(existingVariant._id, {
        productName: args.name,
        categoryId: args.categoryId,
        subcategoryId: args.subcategoryId,
        status: "archived",
        updatedAt: now,
      });
    }

    return {
      productId: args.productId,
      productCode: product.productCode,
    };
  },
});

export const adjustStock = mutation({
  args: {
    variantId: v.id("productVariants"),
    quantityDelta: v.number(),
    reason: v.string(),
    note: nullableStringValidator,
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.variantId);
    if (!variant) {
      throw new Error("Variant not found");
    }

    const inventoryLevel = await getInventoryLevelOrThrow(ctx, args.variantId);
    const nextOnHand = inventoryLevel.onHand + args.quantityDelta;

    if (nextOnHand < 0) {
      throw new Error("Stock adjustment would move quantity below zero");
    }

    const now = Date.now();
    await touchInventoryLevel(
      ctx,
      args.variantId,
      nextOnHand,
      "manual_adjustment",
      variant.displayCode,
      now,
    );
    await ctx.db.insert("stockMovements", {
      variantId: args.variantId,
      productId: variant.productId,
      businessDate: makeBusinessDate(now),
      type: "manual_adjustment",
      quantityDelta: args.quantityDelta,
      quantityAfter: nextOnHand,
      reason: args.reason,
      referenceCode: variant.displayCode,
      note: args.note,
      createdAt: now,
    });

    return {
      nextOnHand,
    };
  },
});
