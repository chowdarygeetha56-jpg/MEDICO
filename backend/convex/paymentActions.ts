"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { anyApi } from "convex/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";

const internalApi = anyApi as any;

function requiredSecret(name: "RAZORPAY_KEY_ID" | "RAZORPAY_KEY_SECRET") {
  const value = process.env[name];
  if (!value) throw new ConvexError("Razorpay is not configured for this deployment.");
  return value;
}

export const createRazorpayOrder = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in before starting payment.");
    const checkout = await ctx.runQuery(internalApi.payments.getForPayment, { orderId, userId });
    if (!checkout) throw new ConvexError("Order is not available for payment.");
    const keyId = requiredSecret("RAZORPAY_KEY_ID");
    const keySecret = requiredSecret("RAZORPAY_KEY_SECRET");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: checkout.order.totalPaise, currency: "INR", receipt: checkout.order.orderNumber }),
    });
    const payload = await response.json() as { id?: string; error?: { description?: string } };
    if (!response.ok || !payload.id) throw new ConvexError(payload.error?.description ?? "Razorpay could not create the payment order.");
    await ctx.runMutation(internalApi.payments.recordGatewayOrder, { paymentId: checkout.payment._id, gatewayOrderId: payload.id });
    return { keyId, gatewayOrderId: payload.id, amountPaise: checkout.order.totalPaise, currency: "INR", orderNumber: checkout.order.orderNumber };
  },
});

export const verifyRazorpayPayment = action({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in before verifying payment.");
    const checkout = await ctx.runQuery(internalApi.payments.getForPayment, { orderId: args.orderId, userId });
    if (!checkout?.payment.gatewayOrderId || checkout.payment.gatewayOrderId !== args.razorpayOrderId) throw new ConvexError("Payment order does not match.");
    const keyId = requiredSecret("RAZORPAY_KEY_ID");
    const keySecret = requiredSecret("RAZORPAY_KEY_SECRET");
    const expectedSignature = createHmac("sha256", keySecret).update(`${args.razorpayOrderId}|${args.razorpayPaymentId}`).digest("hex");
    const received = Buffer.from(args.razorpaySignature);
    const expected = Buffer.from(expectedSignature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new ConvexError("Payment signature verification failed.");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(args.razorpayPaymentId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
    });
    const payment = await response.json() as { order_id?: string; amount?: number; currency?: string; status?: string };
    if (!response.ok || payment.order_id !== args.razorpayOrderId || payment.amount !== checkout.order.totalPaise || payment.currency !== "INR" || payment.status !== "captured") {
      throw new ConvexError("Razorpay has not confirmed a captured payment for this order.");
    }
    return ctx.runMutation(internalApi.payments.confirmCapture, { paymentId: checkout.payment._id, gatewayPaymentId: args.razorpayPaymentId });
  },
});

export const processRazorpayRefund = action({
  args: { refundId: v.id("refunds") },
  handler: async (ctx, { refundId }) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) throw new ConvexError("Administrator access required.");
    const refund = await ctx.runQuery(internalApi.refunds.getForGateway, { refundId, adminId });
    if (!refund) throw new ConvexError("Refund is not approved or its payment is unavailable.");
    const keyId = requiredSecret("RAZORPAY_KEY_ID");
    const keySecret = requiredSecret("RAZORPAY_KEY_SECRET");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(refund.payment.gatewayPaymentId!)}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: refund.refund.amountPaise, notes: { reason: refund.refund.reason } }),
    });
    const payload = await response.json() as { id?: string; status?: string; error?: { description?: string } };
    if (!response.ok || !payload.id || !["pending", "processed"].includes(payload.status ?? "")) {
      throw new ConvexError(payload.error?.description ?? "Razorpay could not create this refund.");
    }
    if (payload.status === "processed") {
      await ctx.runMutation(internalApi.refunds.markProcessed, { refundId, gatewayRefundId: payload.id });
    } else {
      await ctx.runMutation(internalApi.refunds.recordGatewayRefund, { refundId, gatewayRefundId: payload.id });
    }
    return { status: payload.status, refundId: payload.id };
  },
});