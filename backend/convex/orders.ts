import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const DELIVERY_FEE_PAISE = 4000;
const FREE_DELIVERY_THRESHOLD_PAISE = 49900;

async function readCart(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
	const items = await ctx.db.query("cartItems").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
	const rows = await Promise.all(items.map(async (item) => ({ item, medicine: await ctx.db.get(item.medicineId) })));
	return rows.filter((row) => row.medicine?.active).map(({ item, medicine }) => ({ item, medicine: medicine! }));
}

function linePrice(pricePaise: number, discountPercent: number) {
	return Math.round((pricePaise * (100 - discountPercent)) / 100);
}

function sellingPrice(medicine: { pricePaise?: number; discountPercent?: number; priceSource?: string }) {
	if (medicine.pricePaise === undefined) return undefined;
	return medicine.priceSource === "MEDICO_DEMO"
		? medicine.pricePaise
		: linePrice(medicine.pricePaise, medicine.discountPercent ?? 0);
}

export const preview = query({
	args: { couponCode: v.optional(v.string()) },
	handler: async (ctx, { couponCode }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return { authenticated: false, items: [], subtotalPaise: 0, discountPaise: 0, deliveryPaise: 0, totalPaise: 0 };
		const rows = await readCart(ctx, userId);
		const items = rows.map(({ item, medicine }) => ({
			itemId: item._id,
			medicine,
			quantity: item.quantity,
			unitPricePaise: sellingPrice(medicine),
			available: sellingPrice(medicine) !== undefined && medicine.stock !== undefined && medicine.prescriptionRequired !== undefined && medicine.stock >= item.quantity,
		}));
		const subtotalPaise = items.reduce((sum, item) => sum + (item.available ? (item.unitPricePaise ?? 0) * item.quantity : 0), 0);
		let discountPaise = 0;
		let couponMessage: string | null = null;
		if (couponCode?.trim()) {
			const coupon = await ctx.db.query("coupons").withIndex("by_code", (q) => q.eq("code", couponCode.trim().toUpperCase())).unique();
			const now = Date.now();
			if (!coupon?.active || now < coupon.validFrom || now > coupon.validUntil || (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit)) {
				couponMessage = "That coupon code is not available.";
			} else if (subtotalPaise < coupon.minimumOrderPaise) {
				couponMessage = "Your order does not meet this coupon's minimum spend.";
			} else {
				discountPaise = Math.min(subtotalPaise, coupon.discountType === "percent" ? Math.floor((subtotalPaise * coupon.discountValue) / 100) : coupon.discountValue);
				couponMessage = "Coupon applied.";
			}
		}
		const deliveryPaise = subtotalPaise - discountPaise >= FREE_DELIVERY_THRESHOLD_PAISE ? 0 : DELIVERY_FEE_PAISE;
		return {
			authenticated: true,
			items,
			subtotalPaise,
			discountPaise,
			deliveryPaise,
			totalPaise: Math.max(0, subtotalPaise - discountPaise + deliveryPaise),
			couponMessage,
			couponCode: discountPaise > 0 ? couponCode?.trim().toUpperCase() : null,
			hasUnavailableItems: items.some((item) => !item.available),
			hasPrescriptionItems: items.some((item) => item.medicine.prescriptionRequired),
		};
	},
});

export const createCheckout = mutation({
	args: {
		addressId: v.id("addresses"),
		couponCode: v.optional(v.string()),
		prescriptionIds: v.array(v.id("prescriptions")),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in before placing an order.");
		const address = await ctx.db.get(args.addressId);
		if (!address || address.userId !== userId) throw new ConvexError("Select one of your saved delivery addresses.");
		const rows = await readCart(ctx, userId);
		if (rows.length === 0) throw new ConvexError("Your cart is empty.");
		for (const { item, medicine } of rows) {
			if (medicine.pricePaise === undefined || medicine.stock === undefined || medicine.prescriptionRequired === undefined) {
				throw new ConvexError(`${medicine.name} does not have store price, stock, or prescription information.`);
			}
			if (medicine.stock < item.quantity) throw new ConvexError(`Only ${medicine.stock} units of ${medicine.name} are currently available.`);
		}
		const subtotalPaise = rows.reduce((sum, { item, medicine }) => sum + sellingPrice(medicine)! * item.quantity, 0);
		let discountPaise = 0;
		let appliedCode: string | undefined;
		if (args.couponCode?.trim()) {
			const code = args.couponCode.trim().toUpperCase();
			const coupon = await ctx.db.query("coupons").withIndex("by_code", (q) => q.eq("code", code)).unique();
			const now = Date.now();
			if (!coupon?.active || now < coupon.validFrom || now > coupon.validUntil || (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit)) throw new ConvexError("That coupon code is no longer valid.");
			if (subtotalPaise < coupon.minimumOrderPaise) throw new ConvexError("Your order does not meet this coupon's minimum spend.");
			discountPaise = Math.min(subtotalPaise, coupon.discountType === "percent" ? Math.floor((subtotalPaise * coupon.discountValue) / 100) : coupon.discountValue);
			appliedCode = code;
		}
		const prescriptionRequired = rows.some(({ medicine }) => medicine.prescriptionRequired);
		if (prescriptionRequired) {
			const approved = await Promise.all(args.prescriptionIds.map(async (id) => {
				const prescription = await ctx.db.get(id);
				return prescription?.userId === userId && prescription.status === "approved";
			}));
			if (!approved.some(Boolean)) throw new ConvexError("An approved prescription is required before these medicines can be ordered.");
		}
		const deliveryPaise = subtotalPaise - discountPaise >= FREE_DELIVERY_THRESHOLD_PAISE ? 0 : DELIVERY_FEE_PAISE;
		const totalPaise = Math.max(0, subtotalPaise - discountPaise + deliveryPaise);
		const now = Date.now();
		const orderNumber = `MED-${now.toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
		const orderId = await ctx.db.insert("orders", {
			userId,
			orderNumber,
			address: { fullName: address.fullName, mobile: address.mobile, line1: address.line1, city: address.city, state: address.state, pincode: address.pincode },
			couponCode: appliedCode,
			subtotalPaise,
			discountPaise,
			deliveryPaise,
			totalPaise,
			paymentStatus: "pending",
			status: "awaiting_payment",
			prescriptionIds: args.prescriptionIds,
			createdAt: now,
			updatedAt: now,
		});
		for (const { item, medicine } of rows) {
			const unitPricePaise = sellingPrice(medicine)!;
			const mrpPaise = medicine.mrpPaise ?? (medicine.priceSource === "MEDICO_DEMO" ? undefined : medicine.pricePaise);
			const subtotalPaise = unitPricePaise * item.quantity;
			await ctx.db.insert("orderItems", {
				orderId,
				medicineId: medicine._id,
				name: medicine.name,
				brand: medicine.brand ?? medicine.name,
				sku: medicine.sku,
				quantity: item.quantity,
				unitPricePaise,
				mrpPaise,
				discountPaise: mrpPaise === undefined ? 0 : Math.max(0, (mrpPaise - unitPricePaise) * item.quantity),
				subtotalPaise,
				currency: medicine.currency ?? "INR",
				priceSource: medicine.priceSource,
				prescriptionRequired: medicine.prescriptionRequired ?? false,
			});
		}
		await ctx.db.insert("payments", { orderId, userId, gateway: "razorpay", amountPaise: totalPaise, currency: "INR", status: "created", createdAt: now, updatedAt: now });
		return { orderId, orderNumber, amountPaise: totalPaise };
	},
});

export const mine = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const orders = await ctx.db.query("orders").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(50);
		return Promise.all(orders.map(async (order) => ({ ...order, items: await ctx.db.query("orderItems").withIndex("by_order", (q) => q.eq("orderId", order._id)).collect() })));
	},
});

export const getMine = query({
	args: { id: v.id("orders") },
	handler: async (ctx, { id }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;
		const order = await ctx.db.get(id);
		if (!order || order.userId !== userId) return null;
		const items = await ctx.db.query("orderItems").withIndex("by_order", (q) => q.eq("orderId", id)).collect();
		const invoice = await ctx.db.query("invoices").withIndex("by_order", (q) => q.eq("orderId", id)).unique();
		return { ...order, items, invoice };
	},
});

export const cancel = mutation({
	args: { id: v.id("orders") },
	handler: async (ctx, { id }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to manage orders.");
		const order = await ctx.db.get(id);
		if (!order || order.userId !== userId) throw new ConvexError("Order not found.");
		if (order.status !== "awaiting_payment" || order.paymentStatus === "paid") throw new ConvexError("This order can no longer be cancelled online.");
		await ctx.db.patch(id, { status: "cancelled", updatedAt: Date.now() });
	},
});

export const adminList = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const user = await ctx.db.get(userId);
		if (user?.role !== "admin") throw new ConvexError("Administrator access required.");
		const orders = await ctx.db.query("orders").order("desc").take(100);
		return Promise.all(orders.map(async (order) => ({ ...order, items: await ctx.db.query("orderItems").withIndex("by_order", (q) => q.eq("orderId", order._id)).collect() })));
	},
});

export const adminSetStatus = mutation({
	args: { id: v.id("orders"), status: v.union(v.literal("processing"), v.literal("packed"), v.literal("out_for_delivery"), v.literal("delivered"), v.literal("cancelled")) },
	handler: async (ctx, { id, status }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		const order = await ctx.db.get(id);
		if (!order) throw new ConvexError("Order not found.");
		const transitions: Record<string, string[]> = {
			awaiting_payment: [], placed: ["processing", "cancelled"], processing: ["packed", "cancelled"], packed: ["out_for_delivery"], out_for_delivery: ["delivered"], delivered: [], cancelled: [],
		};
		if (!transitions[order.status]?.includes(status)) throw new ConvexError("That order status transition is not allowed.");
		if (status !== "cancelled" && order.paymentStatus !== "paid") throw new ConvexError("Confirm payment before processing this order.");
		await ctx.db.patch(id, { status, updatedAt: Date.now() });
		await ctx.db.insert("notifications", { userId: order.userId, title: "Order update", message: `Order ${order.orderNumber} is now ${status.replaceAll("_", " ")}.`, type: "order", createdAt: Date.now() });
	},
});

export const getForPayment = internalQuery({
	args: { orderId: v.id("orders"), userId: v.id("users") },
	handler: async (ctx, { orderId, userId }) => {
		const order = await ctx.db.get(orderId);
		if (!order || order.userId !== userId || order.paymentStatus !== "pending") return null;
		const payment = await ctx.db.query("payments").withIndex("by_order", (q) => q.eq("orderId", orderId)).unique();
		return payment ? { order, payment } : null;
	},
});