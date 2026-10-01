import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  categorySeed,
  medicineSeed,
  standardMedicineDescription,
  standardMedicineSafety,
  standardMedicineStorage,
  standardMedicineUsage,
} from "./seedData";

export const seedSampleCatalog = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const seedToken = process.env.MEDICO_SEED_TOKEN;
    if (!seedToken || token !== seedToken) {
      throw new ConvexError("Catalog seeding is disabled or the seed token is invalid.");
    }
    const existing = await ctx.db.query("medicines").take(1);
    if (existing.length > 0) return { seeded: false, message: "Catalog already contains products." };

    const now = Date.now();
    const categoryIds = new Map<string, Id<"categories">>();
    for (const [sortOrder, category] of categorySeed.entries()) {
      const categoryId = await ctx.db.insert("categories", { ...category, sortOrder, active: true, createdAt: now });
      categoryIds.set(category.slug, categoryId);
    }

    for (const product of medicineSeed) {
      const categoryId = categoryIds.get(product.category);
      if (!categoryId) throw new ConvexError(`Missing seed category: ${product.category}`);
      const medicineId = await ctx.db.insert("medicines", {
        name: product.name,
        genericName: product.genericName,
        brand: product.brand,
        manufacturer: product.manufacturer,
        categoryId,
        description: standardMedicineDescription,
        usageInfo: standardMedicineUsage,
        storageInfo: standardMedicineStorage,
        safetyInfo: standardMedicineSafety,
        strength: product.strength,
        packSize: product.packSize,
        pricePaise: product.pricePaise,
        discountPercent: product.discountPercent,
        image: product.image,
        stock: product.stock,
        prescriptionRequired: product.prescriptionRequired,
        active: true,
        popularity: product.popularity,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("inventory", { medicineId, stock: product.stock, lowStockThreshold: 10, updatedAt: now });
    }
    const couponExpiry = now + 90 * 24 * 60 * 60 * 1000;
    await ctx.db.insert("coupons", { code: "WELCOME10", discountType: "percent", discountValue: 10, minimumOrderPaise: 29900, validFrom: now, validUntil: couponExpiry, usageCount: 0, active: true });
    await ctx.db.insert("coupons", { code: "MEDICO50", discountType: "fixed", discountValue: 5000, minimumOrderPaise: 49900, validFrom: now, validUntil: couponExpiry, usageCount: 0, active: true });
    return { seeded: true, categories: categorySeed.length, medicines: medicineSeed.length, coupons: 2 };
  },
});