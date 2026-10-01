import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const mine = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const items = await ctx.db.query("cartItems").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
		const rows = await Promise.all(items.map(async (item) => ({ item, medicine: await ctx.db.get(item.medicineId) })));
		return rows.filter((row) => row.medicine?.active).map(({ item, medicine }) => {
			const product = medicine!;
			const unitPricePaise = product.pricePaise === undefined
				? undefined
				: product.priceSource === "MEDICO_DEMO"
					? product.pricePaise
					: Math.round((product.pricePaise * (100 - (product.discountPercent ?? 0))) / 100);
			return {
				...item,
				medicine: product,
				medicineName: product.name,
				sku: product.sku,
				unitPricePaise,
				subtotalPaise: unitPricePaise === undefined ? undefined : unitPricePaise * item.quantity,
				prescriptionRequired: product.prescriptionRequired,
			};
		});
	},
});

export const add = mutation({
	args: { medicineId: v.id("medicines"), quantity: v.optional(v.number()) },
	handler: async (ctx, { medicineId, quantity = 1 }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to add items to your cart.");
		if (!Number.isInteger(quantity) || quantity < 1 || quantity > 25) throw new ConvexError("Choose a quantity from 1 to 25.");
		const medicine = await ctx.db.get(medicineId);
		if (!medicine?.active) throw new ConvexError("This product is no longer available.");
		if (medicine.pricePaise === undefined || medicine.stock === undefined || medicine.prescriptionRequired === undefined) {
			throw new ConvexError("This FDA information listing is not available for purchase.");
		}
		const existing = await ctx.db.query("cartItems").withIndex("by_user_medicine", (q) => q.eq("userId", userId).eq("medicineId", medicineId)).unique();
		const nextQuantity = (existing?.quantity ?? 0) + quantity;
		if (medicine.stock < nextQuantity) {
			const availableToAdd = Math.max(0, medicine.stock - (existing?.quantity ?? 0));
			throw new ConvexError(`Only ${availableToAdd} units are currently available.`);
		}
		const now = Date.now();
		if (existing) await ctx.db.patch(existing._id, { quantity: nextQuantity, updatedAt: now });
		else await ctx.db.insert("cartItems", { userId, medicineId, quantity, createdAt: now, updatedAt: now });
		const cart = await ctx.db.query("carts").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
		if (cart) await ctx.db.patch(cart._id, { updatedAt: now });
		else await ctx.db.insert("carts", { userId, updatedAt: now });
		return { quantity: nextQuantity };
	},
});

export const setQuantity = mutation({
	args: { itemId: v.id("cartItems"), quantity: v.number() },
	handler: async (ctx, { itemId, quantity }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to update your cart.");
		const item = await ctx.db.get(itemId);
		if (!item || item.userId !== userId) throw new ConvexError("Cart item not found.");
		if (!Number.isInteger(quantity) || quantity < 0 || quantity > 25) throw new ConvexError("Choose a quantity from 0 to 25.");
		if (quantity === 0) {
			await ctx.db.delete(itemId);
			return null;
		}
		const medicine = await ctx.db.get(item.medicineId);
		if (!medicine?.active || medicine.pricePaise === undefined || medicine.stock === undefined || medicine.prescriptionRequired === undefined) {
			throw new ConvexError("This item is missing store price, stock, or prescription information.");
		}
		if (medicine.stock < quantity) throw new ConvexError(`Only ${medicine.stock} units are currently available.`);
		await ctx.db.patch(itemId, { quantity, updatedAt: Date.now() });
		return { quantity };
	},
});

export const remove = mutation({
	args: { itemId: v.id("cartItems") },
	handler: async (ctx, { itemId }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to update your cart.");
		const item = await ctx.db.get(itemId);
		if (item?.userId === userId) await ctx.db.delete(itemId);
	},
});