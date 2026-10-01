import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const bootstrapFirstAdmin = mutation({
	args: { email: v.string(), token: v.string() },
	handler: async (ctx, { email, token }) => {
		const expectedToken = process.env.MEDICO_ADMIN_BOOTSTRAP_TOKEN;
		if (!expectedToken || token !== expectedToken) throw new ConvexError("Admin bootstrap is disabled or the token is invalid.");
		const users = await ctx.db.query("users").take(1000);
		if (users.some((user) => user.role === "admin")) throw new ConvexError("An administrator is already configured.");
		const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email.trim().toLowerCase())).unique();
		if (!user) throw new ConvexError("Create the target account before promoting it.");
		await ctx.db.patch(user._id, { role: "admin" });
		return { promoted: true, userId: user._id };
	},
});

export const overview = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		const [users, medicines, orders, prescriptions, inventory] = await Promise.all([
			ctx.db.query("users").take(1000),
			ctx.db.query("medicines").take(1000),
			ctx.db.query("orders").take(1000),
			ctx.db.query("prescriptions").withIndex("by_status", (q) => q.eq("status", "pending")).take(1000),
			ctx.db.query("inventory").take(1000),
		]);
		return {
			users: users.length,
			activeMedicines: medicines.filter((medicine) => medicine.active).length,
			orders: orders.length,
			paidRevenuePaise: orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.totalPaise, 0),
			pendingPrescriptions: prescriptions.length,
			lowStock: inventory.filter((item) => item.stock <= item.lowStockThreshold).length,
		};
	},
});

export const listUsers = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		const users = await ctx.db.query("users").take(200);
		return users.map((user) => ({ id: user._id, name: user.name ?? "Unnamed customer", email: user.email ?? null, phone: user.phone ?? null, role: user.role ?? "customer", joinedAt: user._creationTime }));
	},
});

export const setUserRole = mutation({
	args: { id: v.id("users"), role: v.union(v.literal("customer"), v.literal("admin")) },
	handler: async (ctx, { id, role }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		if (id === userId && role !== "admin") throw new ConvexError("You cannot remove your own administrator access.");
		if (!(await ctx.db.get(id))) throw new ConvexError("User not found.");
		await ctx.db.patch(id, { role });
	},
});