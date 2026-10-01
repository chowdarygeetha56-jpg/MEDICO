import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
	args: {},
	handler: async (ctx) =>
		ctx.db
			.query("categories")
			.withIndex("by_slug")
			.collect()
			.then((categories) => categories.filter((category) => category.active).sort((a, b) => a.sortOrder - b.sortOrder)),
});

export const adminCreate = mutation({
	args: { name: v.string(), slug: v.string(), description: v.string(), icon: v.string(), sortOrder: v.number() },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		const slug = args.slug.trim().toLowerCase();
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || args.name.trim().length < 2) throw new ConvexError("Enter a category name and a valid URL slug.");
		if (await ctx.db.query("categories").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()) throw new ConvexError("That category slug already exists.");
		return ctx.db.insert("categories", { ...args, name: args.name.trim(), slug, description: args.description.trim(), active: true, createdAt: Date.now() });
	},
});

export const adminUpdate = mutation({
	args: { id: v.id("categories"), name: v.string(), slug: v.string(), description: v.string(), icon: v.string(), sortOrder: v.number() },
	handler: async (ctx, { id, ...args }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		const slug = args.slug.trim().toLowerCase();
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || args.name.trim().length < 2) throw new ConvexError("Enter a category name and a valid URL slug.");
		const duplicate = await ctx.db.query("categories").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
		if (duplicate && duplicate._id !== id) throw new ConvexError("That category slug already exists.");
		await ctx.db.patch(id, { ...args, name: args.name.trim(), slug, description: args.description.trim() });
	},
});

export const adminSetActive = mutation({
	args: { id: v.id("categories"), active: v.boolean() },
	handler: async (ctx, { id, active }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		if (!(await ctx.db.get(id))) throw new ConvexError("Category not found.");
		await ctx.db.patch(id, { active });
	},
});

export const adminList = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		return ctx.db.query("categories").collect();
	},
});