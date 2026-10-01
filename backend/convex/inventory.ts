import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const lowStock = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		const rows = await ctx.db.query("inventory").collect();
		return rows.filter((row) => row.stock <= row.lowStockThreshold);
	},
});

export const setStock = mutation({
	args: { medicineId: v.id("medicines"), stock: v.number(), lowStockThreshold: v.number() },
	handler: async (ctx, { medicineId, stock, lowStockThreshold }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		if (!Number.isInteger(stock) || stock < 0 || stock > 100000 || !Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) throw new ConvexError("Enter a valid stock count and threshold.");
		const medicine = await ctx.db.get(medicineId);
		if (!medicine) throw new ConvexError("Medicine not found.");
		await ctx.db.patch(medicineId, { stock, updatedAt: Date.now() });
		const inventory = await ctx.db.query("inventory").withIndex("by_medicine", (q) => q.eq("medicineId", medicineId)).unique();
		if (inventory) await ctx.db.patch(inventory._id, { stock, lowStockThreshold, updatedAt: Date.now() });
		else await ctx.db.insert("inventory", { medicineId, stock, lowStockThreshold, updatedAt: Date.now() });
	},
});