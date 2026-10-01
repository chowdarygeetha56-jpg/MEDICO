import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const addressFields = {
	fullName: v.string(),
	mobile: v.string(),
	line1: v.string(),
	city: v.string(),
	state: v.string(),
	pincode: v.string(),
};

function validateAddress(address: { fullName: string; mobile: string; line1: string; city: string; state: string; pincode: string }) {
	if (address.fullName.trim().length < 2 || address.line1.trim().length < 5) throw new ConvexError("Enter a full name and street address.");
	if (!/^[6-9]\d{9}$/.test(address.mobile)) throw new ConvexError("Enter a valid 10-digit Indian mobile number.");
	if (!/^\d{6}$/.test(address.pincode)) throw new ConvexError("Enter a valid 6-digit PIN code.");
	if (!address.city.trim() || !address.state.trim()) throw new ConvexError("City and state are required.");
}

export const mine = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		return ctx.db.query("addresses").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
	},
});

export const add = mutation({
	args: { ...addressFields, isDefault: v.boolean() },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to save a delivery address.");
		validateAddress(args);
		const existing = await ctx.db.query("addresses").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
		const isDefault = args.isDefault || existing.length === 0;
		if (isDefault) await Promise.all(existing.map((address) => ctx.db.patch(address._id, { isDefault: false })));
		return ctx.db.insert("addresses", { ...args, userId, isDefault, createdAt: Date.now() });
	},
});

export const update = mutation({
	args: { id: v.id("addresses"), ...addressFields, isDefault: v.boolean() },
	handler: async (ctx, { id, ...args }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to edit a delivery address.");
		const address = await ctx.db.get(id);
		if (!address || address.userId !== userId) throw new ConvexError("Address not found.");
		validateAddress(args);
		if (args.isDefault) {
			const existing = await ctx.db.query("addresses").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
			await Promise.all(existing.filter((row) => row._id !== id).map((row) => ctx.db.patch(row._id, { isDefault: false })));
		}
		await ctx.db.patch(id, args);
	},
});

export const remove = mutation({
	args: { id: v.id("addresses") },
	handler: async (ctx, { id }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to manage delivery addresses.");
		const address = await ctx.db.get(id);
		if (address?.userId === userId) await ctx.db.delete(id);
	},
});