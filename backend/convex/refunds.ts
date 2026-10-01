import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

export const mine = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		return ctx.db.query("refunds").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(50);
	},
});

export const request = mutation({
	args: { orderId: v.id("orders"), reason: v.string() },
	handler: async (ctx, { orderId, reason }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to request a refund.");
		const order = await ctx.db.get(orderId);
		if (!order || order.userId !== userId) throw new ConvexError("Order not found.");
		if (order.paymentStatus !== "paid" || !["delivered", "cancelled"].includes(order.status)) throw new ConvexError("This order is not currently eligible for a refund request.");
		const payment = await ctx.db.query("payments").withIndex("by_order", (q) => q.eq("orderId", orderId)).unique();
		if (!payment || payment.status !== "captured") throw new ConvexError("No captured payment is available to refund.");
		const prior = await ctx.db.query("refunds").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
		if (prior.some((refund) => refund.orderId === orderId && !["rejected"].includes(refund.status))) throw new ConvexError("A refund request already exists for this order.");
		return ctx.db.insert("refunds", { orderId, paymentId: payment._id, userId, amountPaise: payment.amountPaise, reason: reason.trim().slice(0, 500), status: "requested", createdAt: Date.now(), updatedAt: Date.now() });
	},
});

export const adminList = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		return ctx.db.query("refunds").order("desc").take(100);
	},
});

export const review = mutation({
	args: { id: v.id("refunds"), decision: v.union(v.literal("approved"), v.literal("rejected")) },
	handler: async (ctx, { id, decision }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		const refund = await ctx.db.get(id);
		if (!refund || refund.status !== "requested") throw new ConvexError("Refund is no longer awaiting review.");
		await ctx.db.patch(id, { status: decision, updatedAt: Date.now() });
		if (decision === "rejected") await ctx.db.insert("notifications", { userId: refund.userId, title: "Refund request update", message: "Your refund request was not approved. Contact support for details.", type: "refund", createdAt: Date.now() });
	},
});

export const getForGateway = internalQuery({
	args: { refundId: v.id("refunds"), adminId: v.id("users") },
	handler: async (ctx, { refundId, adminId }) => {
		if ((await ctx.db.get(adminId))?.role !== "admin") return null;
		const refund = await ctx.db.get(refundId);
		if (!refund || refund.status !== "approved") return null;
		const payment = await ctx.db.get(refund.paymentId);
		if (!payment || payment.status !== "captured" || !payment.gatewayPaymentId) return null;
		return { refund, payment };
	},
});

export const recordGatewayRefund = internalMutation({
	args: { refundId: v.id("refunds"), gatewayRefundId: v.string() },
	handler: async (ctx, { refundId, gatewayRefundId }) => {
		const refund = await ctx.db.get(refundId);
		if (!refund || refund.status !== "approved") return;
		await ctx.db.patch(refundId, { status: "processing", gatewayRefundId, updatedAt: Date.now() });
	},
});

export const markProcessed = internalMutation({
	args: { refundId: v.id("refunds"), gatewayRefundId: v.string() },
	handler: async (ctx, { refundId, gatewayRefundId }) => {
		const refund = await ctx.db.get(refundId);
		if (!refund || !["approved", "processing"].includes(refund.status)) return;
		const payment = await ctx.db.get(refund.paymentId);
		if (!payment || payment.status !== "captured") throw new ConvexError("Payment is not refundable.");
		const now = Date.now();
		await ctx.db.patch(refundId, { status: "processed", gatewayRefundId, updatedAt: now });
		await ctx.db.patch(payment._id, { status: "refunded", updatedAt: now });
		await ctx.db.patch(refund.orderId, { paymentStatus: "refunded", updatedAt: now });
		await ctx.db.insert("notifications", { userId: refund.userId, title: "Refund processed", message: `Your refund was submitted to Razorpay (reference ${gatewayRefundId}).`, type: "refund", createdAt: now });
	},
});

export const getByGatewayId = internalQuery({
	args: { gatewayRefundId: v.string() },
	handler: async (ctx, { gatewayRefundId }) =>
		ctx.db.query("refunds").withIndex("by_gateway_refund", (q) => q.eq("gatewayRefundId", gatewayRefundId)).unique(),
});

export const markFailed = internalMutation({
	args: { refundId: v.id("refunds"), message: v.string() },
	handler: async (ctx, { refundId, message }) => {
		const refund = await ctx.db.get(refundId);
		if (!refund || refund.status !== "processing") return;
		await ctx.db.patch(refundId, { status: "failed", updatedAt: Date.now() });
		await ctx.db.insert("notifications", { userId: refund.userId, title: "Refund needs attention", message: message.slice(0, 300) || "The refund did not complete. MEDICO support will review it.", type: "refund", createdAt: Date.now() });
	},
});