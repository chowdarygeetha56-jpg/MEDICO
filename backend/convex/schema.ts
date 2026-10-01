import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
	...authTables,
	users: defineTable({
		name: v.optional(v.string()),
		image: v.optional(v.string()),
		email: v.optional(v.string()),
		emailVerificationTime: v.optional(v.number()),
		phone: v.optional(v.string()),
		phoneVerificationTime: v.optional(v.number()),
		isAnonymous: v.optional(v.boolean()),
		role: v.optional(v.union(v.literal("customer"), v.literal("admin"))),
	})
		.index("email", ["email"])
		.index("phone", ["phone"]),
	categories: defineTable({
		name: v.string(),
		slug: v.string(),
		description: v.string(),
		icon: v.string(),
		sortOrder: v.number(),
		active: v.boolean(),
		createdAt: v.number(),
	}).index("by_slug", ["slug"]),
	medicines: defineTable({
		name: v.string(),
		genericName: v.optional(v.string()),
		brand: v.optional(v.string()),
		manufacturer: v.optional(v.string()),
		categoryId: v.optional(v.id("categories")),
		description: v.optional(v.string()),
		usageInfo: v.optional(v.string()),
		storageInfo: v.optional(v.string()),
		safetyInfo: v.optional(v.string()),
		activeIngredients: v.optional(v.array(v.object({ name: v.string(), strength: v.optional(v.string()) }))),
		strength: v.optional(v.string()),
		dosageForm: v.optional(v.string()),
		packSize: v.optional(v.string()),
		packageDescription: v.optional(v.string()),
		packageIdentifiers: v.optional(v.array(v.string())),
		route: v.optional(v.array(v.string())),
		productType: v.optional(v.string()),
		therapeuticClass: v.optional(v.array(v.string())),
		prescriptionRequired: v.optional(v.boolean()),
		prescriptionStatus: v.optional(v.string()),
		source: v.optional(v.string()),
		sourceId: v.optional(v.string()),
		sourceUpdatedAt: v.optional(v.string()),
		pricePaise: v.optional(v.number()),
		mrpPaise: v.optional(v.number()),
		currency: v.optional(v.string()),
		sku: v.optional(v.string()),
		vendorName: v.optional(v.string()),
		priceSource: v.optional(v.string()),
		discountPercent: v.optional(v.number()),
		image: v.optional(v.string()),
		stock: v.optional(v.number()),
		active: v.boolean(),
		popularity: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_category", ["categoryId", "active"])
		.index("by_active_popularity", ["active", "popularity"])
		.index("by_active", ["active"])
		.index("by_source_id", ["source", "sourceId"]),
	carts: defineTable({
		userId: v.id("users"),
		updatedAt: v.number(),
	}).index("by_user", ["userId"]),
	cartItems: defineTable({
		userId: v.id("users"),
		medicineId: v.id("medicines"),
		quantity: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_user_medicine", ["userId", "medicineId"]),
	addresses: defineTable({
		userId: v.id("users"),
		fullName: v.string(),
		mobile: v.string(),
		line1: v.string(),
		city: v.string(),
		state: v.string(),
		pincode: v.string(),
		isDefault: v.boolean(),
		createdAt: v.number(),
	}).index("by_user", ["userId"]),
	prescriptions: defineTable({
		userId: v.id("users"),
		storageId: v.id("_storage"),
		fileName: v.string(),
		mimeType: v.string(),
		sizeBytes: v.number(),
		status: v.union(
			v.literal("pending"),
			v.literal("under_review"),
			v.literal("approved"),
			v.literal("rejected"),
		),
		reviewerId: v.optional(v.id("users")),
		reviewNote: v.optional(v.string()),
		createdAt: v.number(),
		reviewedAt: v.optional(v.number()),
	})
		.index("by_user", ["userId"])
		.index("by_status", ["status"]),
	orders: defineTable({
		userId: v.id("users"),
		orderNumber: v.string(),
		address: v.object({
			fullName: v.string(),
			mobile: v.string(),
			line1: v.string(),
			city: v.string(),
			state: v.string(),
			pincode: v.string(),
		}),
		couponCode: v.optional(v.string()),
		subtotalPaise: v.number(),
		discountPaise: v.number(),
		deliveryPaise: v.number(),
		totalPaise: v.number(),
		paymentStatus: v.union(
			v.literal("pending"),
			v.literal("paid"),
			v.literal("failed"),
			v.literal("refunded"),
		),
		status: v.union(
			v.literal("awaiting_payment"),
			v.literal("placed"),
			v.literal("processing"),
			v.literal("packed"),
			v.literal("out_for_delivery"),
			v.literal("delivered"),
			v.literal("cancelled"),
		),
		prescriptionIds: v.array(v.id("prescriptions")),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_order_number", ["orderNumber"])
		.index("by_status", ["status"]),
	orderItems: defineTable({
		orderId: v.id("orders"),
		medicineId: v.id("medicines"),
		name: v.string(),
		brand: v.string(),
		sku: v.optional(v.string()),
		quantity: v.number(),
		unitPricePaise: v.number(),
		mrpPaise: v.optional(v.number()),
		discountPaise: v.optional(v.number()),
		subtotalPaise: v.optional(v.number()),
		currency: v.optional(v.string()),
		priceSource: v.optional(v.string()),
		prescriptionRequired: v.boolean(),
	}).index("by_order", ["orderId"]),
	payments: defineTable({
		orderId: v.id("orders"),
		userId: v.id("users"),
		gateway: v.literal("razorpay"),
		gatewayOrderId: v.optional(v.string()),
		gatewayPaymentId: v.optional(v.string()),
		amountPaise: v.number(),
		currency: v.literal("INR"),
		status: v.union(
			v.literal("created"),
			v.literal("authorized"),
			v.literal("captured"),
			v.literal("failed"),
			v.literal("refunded"),
		),
		failureMessage: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_order", ["orderId"])
		.index("by_user", ["userId"])
		.index("by_gateway_order", ["gatewayOrderId"]),
	refunds: defineTable({
		orderId: v.id("orders"),
		paymentId: v.id("payments"),
		userId: v.id("users"),
		amountPaise: v.number(),
		reason: v.string(),
		status: v.union(
			v.literal("requested"),
			v.literal("approved"),
			v.literal("rejected"),
			v.literal("processing"),
			v.literal("processed"),
			v.literal("failed"),
		),
		gatewayRefundId: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_status", ["status"])
		.index("by_gateway_refund", ["gatewayRefundId"]),
	invoices: defineTable({
		orderId: v.id("orders"),
		userId: v.id("users"),
		invoiceNumber: v.string(),
		amountPaise: v.number(),
		issuedAt: v.number(),
	})
		.index("by_order", ["orderId"])
		.index("by_user", ["userId"])
		.index("by_invoice_number", ["invoiceNumber"]),
	coupons: defineTable({
		code: v.string(),
		discountType: v.union(v.literal("percent"), v.literal("fixed")),
		discountValue: v.number(),
		minimumOrderPaise: v.number(),
		validFrom: v.number(),
		validUntil: v.number(),
		usageLimit: v.optional(v.number()),
		usageCount: v.number(),
		active: v.boolean(),
	}).index("by_code", ["code"]),
	notifications: defineTable({
		userId: v.id("users"),
		title: v.string(),
		message: v.string(),
		type: v.string(),
		readAt: v.optional(v.number()),
		createdAt: v.number(),
	}).index("by_user", ["userId"]),
	inventory: defineTable({
		medicineId: v.id("medicines"),
		stock: v.number(),
		lowStockThreshold: v.number(),
		updatedAt: v.number(),
	}).index("by_medicine", ["medicineId"]),
});

export default schema;