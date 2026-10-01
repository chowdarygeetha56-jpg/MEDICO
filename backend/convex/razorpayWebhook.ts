import { httpAction } from "./_generated/server";
import { anyApi } from "convex/server";

const internalApi = anyApi as any;

function constantTimeEqual(left: string, right: string) {
	if (!/^[0-9a-f]{64}$/i.test(left) || left.length !== right.length) return false;
	let mismatch = 0;
	for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	return mismatch === 0;
}

async function verifySignature(body: string, signature: string, secret: string) {
	const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
	const expected = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
	return constantTimeEqual(signature, expected);
}

export const handle = httpAction(async (ctx, request) => {
	const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
	const signature = request.headers.get("x-razorpay-signature") ?? "";
	if (!secret) return new Response("Webhook is not configured", { status: 503 });
	const body = await request.text();
	if (!(await verifySignature(body, signature, secret))) return new Response("Invalid signature", { status: 401 });

	let event: {
		event?: string;
		payload?: {
			payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string; error_description?: string } };
			refund?: { entity?: { id?: string; payment_id?: string; status?: string; error_reason?: string } };
		};
	};
	try {
		event = JSON.parse(body) as typeof event;
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	const payment = event.payload?.payment?.entity;
	if (event.event === "payment.captured" && payment?.order_id && payment.id) {
		const record = await ctx.runQuery(internalApi.payments.getWebhookPayment, { gatewayOrderId: payment.order_id });
		if (!record || record.payment.amountPaise !== payment.amount || payment.currency !== "INR" || payment.status !== "captured") return new Response("Payment does not match an MEDICO order", { status: 409 });
		await ctx.runMutation(internalApi.payments.confirmCapture, { paymentId: record.payment._id, gatewayPaymentId: payment.id });
	} else if (event.event === "payment.failed" && payment?.order_id) {
		const record = await ctx.runQuery(internalApi.payments.getWebhookPayment, { gatewayOrderId: payment.order_id });
		if (record) await ctx.runMutation(internalApi.payments.fail, { paymentId: record.payment._id, message: payment.error_description ?? "Payment failed at Razorpay." });
	}

	const refund = event.payload?.refund?.entity;
	if (event.event === "refund.processed" && refund?.id) {
		const record = await ctx.runQuery(internalApi.refunds.getByGatewayId, { gatewayRefundId: refund.id });
		if (record) await ctx.runMutation(internalApi.refunds.markProcessed, { refundId: record._id, gatewayRefundId: refund.id });
	} else if (event.event === "refund.failed" && refund?.id) {
		const record = await ctx.runQuery(internalApi.refunds.getByGatewayId, { gatewayRefundId: refund.id });
		if (record) await ctx.runMutation(internalApi.refunds.markFailed, { refundId: record._id, message: refund.error_reason ?? "Razorpay reported that the refund failed." });
	}

	return new Response("ok", { status: 200 });
});