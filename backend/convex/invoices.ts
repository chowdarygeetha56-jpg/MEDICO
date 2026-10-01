import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const mine = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		return ctx.db.query("invoices").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(50);
	},
});