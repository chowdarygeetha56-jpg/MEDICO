import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const mine = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		return ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(50);
	},
});

export const markRead = mutation({
	args: { id: v.id("notifications") },
	handler: async (ctx, { id }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to manage notifications.");
		const notification = await ctx.db.get(id);
		if (!notification || notification.userId !== userId) throw new ConvexError("Notification not found.");
		if (!notification.readAt) await ctx.db.patch(id, { readAt: Date.now() });
	},
});