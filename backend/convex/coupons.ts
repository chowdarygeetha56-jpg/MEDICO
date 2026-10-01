import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const validate = query({
	args: { code: v.string(), subtotalPaise: v.number() },
	handler: async (ctx, { code, subtotalPaise }) => {
		if (!Number.isInteger(subtotalPaise) || subtotalPaise < 0) return { valid: false, message: "Invalid order amount.", discountPaise: 0 };
		const coupon = await ctx.db.query("coupons").withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase())).unique();
		const now = Date.now();
		if (!coupon?.active) return { valid: false, message: "That coupon code is not valid.", discountPaise: 0 };
		if (now < coupon.validFrom || now > coupon.validUntil) return { valid: false, message: "That coupon has expired.", discountPaise: 0 };
		if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) return { valid: false, message: "That coupon has reached its usage limit.", discountPaise: 0 };
		if (subtotalPaise < coupon.minimumOrderPaise) return { valid: false, message: "Your order does not meet this coupon's minimum spend.", discountPaise: 0 };
		const rawDiscount = coupon.discountType === "percent" ? Math.floor((subtotalPaise * coupon.discountValue) / 100) : coupon.discountValue;
		return { valid: true, message: "Coupon applied.", discountPaise: Math.min(subtotalPaise, rawDiscount), code: coupon.code };
	},
});

export const adminList = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const user = await ctx.db.get(userId);
		if (user?.role !== "admin") throw new ConvexError("Administrator access required.");
		return ctx.db.query("coupons").collect();
	},
});

export const create = mutation({
	args: {
		code: v.string(),
		discountType: v.union(v.literal("percent"), v.literal("fixed")),
		discountValue: v.number(),
		minimumOrderPaise: v.number(),
		validFrom: v.number(),
		validUntil: v.number(),
		usageLimit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in as an administrator.");
		const user = await ctx.db.get(userId);
		if (user?.role !== "admin") throw new ConvexError("Administrator access required.");
		const code = args.code.trim().toUpperCase();
		if (!/^[A-Z0-9_-]{3,24}$/.test(code)) throw new ConvexError("Coupon code must be 3-24 letters or numbers.");
		if (args.discountValue <= 0 || (args.discountType === "percent" && args.discountValue > 100)) throw new ConvexError("Enter a valid discount.");
		if (args.validUntil <= args.validFrom) throw new ConvexError("The expiry must be after the start date.");
		const existing = await ctx.db.query("coupons").withIndex("by_code", (q) => q.eq("code", code)).unique();
		if (existing) throw new ConvexError("That coupon code already exists.");
		return ctx.db.insert("coupons", { ...args, code, usageCount: 0, active: true });
	},
});

export const setActive = mutation({
	args: { id: v.id("coupons"), active: v.boolean() },
	handler: async (ctx, { id, active }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		if (!(await ctx.db.get(id))) throw new ConvexError("Coupon not found.");
		await ctx.db.patch(id, { active });
	},
});

export const listActive = query({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const coupons = await ctx.db.query("coupons").collect();
		return coupons.filter((coupon) => coupon.active && coupon.validFrom <= now && coupon.validUntil >= now && (coupon.usageLimit === undefined || coupon.usageCount < coupon.usageLimit));
	},
});