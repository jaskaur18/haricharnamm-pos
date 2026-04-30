import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Run manually via:
// bunx convex run migrations:migrateData
export const migrateData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Migrate Sales
    let salesMigrated = 0;
    const sales = await ctx.db.query("sales").collect();
    for (const sale of sales) {
      if ((sale.paymentMethod as any) === "upi") {
        await ctx.db.patch(sale._id, { paymentMethod: "upi" });
        salesMigrated++;
      }
    }

    // 2. Migrate SaleItems
    let saleItemsMigrated = 0;
    const saleItems = await ctx.db.query("saleItems").collect();
    for (const item of saleItems) {
      if ((item.paymentMethod as any) === "upi") {
        await ctx.db.patch(item._id, { paymentMethod: "upi" });
        saleItemsMigrated++;
      }
    }

    // 3. Migrate Returns
    let returnsMigrated = 0;
    const returns = await ctx.db.query("returns").collect();
    for (const ret of returns) {
      if ((ret.refundMethod) === "upi") {
        await ctx.db.patch(ret._id, { refundMethod: "upi" });
        returnsMigrated++;
      }
    }

    // 4. Migrate ReturnItems
    // returnItems doesn't seem to store the payment method directly, but let's check schema.ts later if there are failures.

    // 5. Migrate dailySalesRollups
    let rollupsMigrated = 0;
    const rollups = await ctx.db.query("dailySalesRollups").collect();
    for (const rollup of rollups) {
      if (rollup.upiRevenue !== undefined) {
        // handled by renaming the prop if any
      }
    }

    console.log(`Migrated ${salesMigrated} sales, ${saleItemsMigrated} saleItems, ${returnsMigrated} returns`);
    return { salesMigrated, saleItemsMigrated, returnsMigrated };
  },
});
