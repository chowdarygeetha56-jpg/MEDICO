import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

export const mine = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		return ctx.db.query("payments").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(50);
	},
});

export const adminList = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		return ctx.db.query("payments").order("desc").take(100);
	},
});

export const getForPayment = internalQuery({
	args: { orderId: v.id("orders"), userId: v.id("users") },
	handler: async (ctx, { orderId, userId }) => {
		const order = await ctx.db.get(orderId);
		const payment = await ctx.db.query("payments").withIndex("by_order", (q) => q.eq("orderId", orderId)).unique();
		if (!order || order.userId !== userId || order.paymentStatus !== "pending" || !payment || payment.status !== "created") return null;
		return { order, payment };
	},
});

export const recordGatewayOrder = internalMutation({
	args: { paymentId: v.id("payments"), gatewayOrderId: v.string() },
	handler: async (ctx, { paymentId, gatewayOrderId }) => {
		const payment = await ctx.db.get(paymentId);
		if (!payment || payment.status !== "created") throw new ConvexError("Payment is no longer available.");
		await ctx.db.patch(paymentId, { gatewayOrderId, updatedAt: Date.now() });
	},
});

export const confirmCapture = internalMutation({
	args: { paymentId: v.id("payments"), gatewayPaymentId: v.string() },
	handler: async (ctx, { paymentId, gatewayPaymentId }) => {
		const payment = await ctx.db.get(paymentId);
		if (!payment) throw new ConvexError("Payment record not found.");
		if (payment.status === "captured") return { confirmed: true, orderId: payment.orderId };
		if (payment.status !== "created" || !payment.gatewayOrderId) throw new ConvexError("Payment is not ready for confirmation.");
		const order = await ctx.db.get(payment.orderId);
		if (!order || order.paymentStatus !== "pending") throw new ConvexError("Order is not awaiting payment.");
		const items = await ctx.db.query("orderItems").withIndex("by_order", (q) => q.eq("orderId", order._id)).collect();
		for (const item of items) {
			const medicine = await ctx.db.get(item.medicineId);
			const inventory = await ctx.db.query("inventory").withIndex("by_medicine", (q) => q.eq("medicineId", item.medicineId)).unique();
			if (!medicine || medicine.stock === undefined) throw new ConvexError(`${item.name} has no confirmed stock information.`);
			if (medicine.stock < item.quantity) throw new ConvexError(`Only ${medicine.stock} units of ${item.name} are currently available.`);
			await ctx.db.patch(medicine._id, { stock: medicine.stock - item.quantity, updatedAt: Date.now() });
			if (inventory) await ctx.db.patch(inventory._id, { stock: inventory.stock - item.quantity, updatedAt: Date.now() });
			const cartItem = await ctx.db.query("cartItems").withIndex("by_user_medicine", (q) => q.eq("userId", payment.userId).eq("medicineId", item.medicineId)).unique();
			if (cartItem) await ctx.db.delete(cartItem._id);
		}
		const now = Date.now();
		await ctx.db.patch(paymentId, { gatewayPaymentId, status: "captured", updatedAt: now });
		await ctx.db.patch(order._id, { paymentStatus: "paid", status: "placed", updatedAt: now });
		if (order.couponCode) {
			const coupon = await ctx.db.query("coupons").withIndex("by_code", (q) => q.eq("code", order.couponCode!)).unique();
			if (coupon) await ctx.db.patch(coupon._id, { usageCount: coupon.usageCount + 1 });
		}
		await ctx.db.insert("invoices", { orderId: order._id, userId: order.userId, invoiceNumber: `INV-${order.orderNumber}`, amountPaise: order.totalPaise, issuedAt: now });
		await ctx.db.insert("notifications", { userId: order.userId, title: "Payment successful", message: `Payment for order ${order.orderNumber} was confirmed.`, type: "payment", createdAt: now });
		return { confirmed: true, orderId: order._id };
	},
});

export const fail = internalMutation({
	args: { paymentId: v.id("payments"), message: v.string() },
	handler: async (ctx, { paymentId, message }) => {
		const payment = await ctx.db.get(paymentId);
		if (!payment || payment.status === "captured") return;
		const now = Date.now();
		await ctx.db.patch(paymentId, { status: "failed", failureMessage: message.slice(0, 300), updatedAt: now });
		const order = await ctx.db.get(payment.orderId);
		if (order?.paymentStatus === "pending") {
			await ctx.db.patch(order._id, { paymentStatus: "failed", status: "cancelled", updatedAt: now });
			await ctx.db.insert("notifications", { userId: order.userId, title: "Payment not completed", message: `Payment for order ${order.orderNumber} was not completed. You can start a new checkout from your cart.`, type: "payment", createdAt: now });
		}
	},
});

export const adminMarkRefunded = mutation({
	args: { id: v.id("payments") },
	handler: async (ctx, { id }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		const payment = await ctx.db.get(id);
		if (!payment || payment.status !== "captured") throw new ConvexError("Only captured payments may be refunded.");
		throw new ConvexError("Refunds must be processed and verified through Razorpay before updating this record.");
	},
});

export const getWebhookPayment = internalQuery({
	args: { gatewayOrderId: v.string() },
	handler: async (ctx, { gatewayOrderId }) => {
		const payment = await ctx.db.query("payments").withIndex("by_gateway_order", (q) => q.eq("gatewayOrderId", gatewayOrderId)).unique();
		if (!payment) return null;
		const order = await ctx.db.get(payment.orderId);
		return order ? { order, payment } : null;
	},
});