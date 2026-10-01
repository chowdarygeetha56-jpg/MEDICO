"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, FileText, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import AuthGate from "@/components/auth/auth-gate";
import { useConvexReady } from "@/components/providers/convex-provider";
import { formatRupees } from "@/lib/format";

const statusLabels: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  placed: "Order placed",
  processing: "Processing",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrdersView() {
  const ready = useConvexReady();
  return ready ? <AuthGate><ConnectedOrders /></AuthGate> : <main className="orders-page"><div className="preview-setup"><strong>Order history is not connected</strong><span>Connect Convex and sign in to view real orders.</span></div></main>;
}

function ConnectedOrders() {
  const orders = useQuery(api.orders.mine, {});
  return (
    <main className="orders-page">
      <header className="catalog-heading"><p className="eyebrow"><span className="eyebrow__dot" /> Your MEDICO account</p><h1>Orders and tracking</h1><p>Payment and order status update only after the store confirms each step.</p></header>
      {orders === undefined ? <div className="empty-panel">Loading your orders...</div> : orders.length === 0 ? <div className="empty-panel"><strong>No orders yet.</strong><p>Your confirmed orders will appear here.</p><Link className="button button--primary" href="/medicines">Browse medicines</Link></div> : (
        <div className="order-list">{orders.map((order) => (
          <article className="order-card" key={order._id}>
            <div className="order-card__top"><div><span className="order-card__number">{order.orderNumber}</span><span>{new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span></div><span className={`status-pill status-pill--${order.status}`}>{statusLabels[order.status] ?? order.status}</span></div>
            <div className="order-card__products">{order.items.map((item) => <span key={item._id}>{item.name} × {item.quantity}</span>)}</div>
            <div className="order-card__bottom"><span className={`payment-state payment-state--${order.paymentStatus}`}>{order.paymentStatus === "paid" ? "Payment confirmed" : `Payment ${order.paymentStatus}`}</span><strong>{formatRupees(order.totalPaise)}</strong><Link className="section-link" href={`/orders/${order._id}`}>View details <ArrowRight size={15} /></Link></div>
          </article>
        ))}</div>
      )}
    </main>
  );
}

export function OrderDetailView({ id }: { id: string }) {
  const ready = useConvexReady();
  return ready ? <AuthGate><ConnectedOrderDetail id={id as Id<"orders">} /></AuthGate> : <main className="orders-page"><div className="preview-setup"><strong>Order details are not connected</strong><span>Connect Convex and sign in to view order details.</span></div></main>;
}

function ConnectedOrderDetail({ id }: { id: Id<"orders"> }) {
  const router = useRouter();
  const order = useQuery(api.orders.getMine, { id });
  const refunds = useQuery(api.refunds.mine, {});
  const cancel = useMutation(api.orders.cancel);
  const addToCart = useMutation(api.cart.add);
  const requestRefund = useMutation(api.refunds.request);
  const [message, setMessage] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [pending, setPending] = useState(false);
  if (order === undefined) return <main className="orders-page"><p>Loading order...</p></main>;
  if (!order) return <main className="orders-page"><div className="empty-panel"><strong>Order not found.</strong><p>This order may not exist or may belong to a different account.</p><Link className="button button--outline" href="/orders">Back to orders</Link></div></main>;

  const timeline = [
    { key: "placed", label: "Order placed", icon: PackageCheck },
    { key: "processing", label: "Processing", icon: PackageCheck },
    { key: "packed", label: "Packed", icon: PackageCheck },
    { key: "out_for_delivery", label: "Out for delivery", icon: Truck },
    { key: "delivered", label: "Delivered", icon: PackageCheck },
  ];
  const currentIndex = timeline.findIndex((item) => item.key === order.status);
  const canCancel = order.status === "awaiting_payment" && order.paymentStatus !== "paid";
  const orderItems = order.items;
  const existingRefund = refunds?.find((refund) => refund.orderId === id && refund.status !== "rejected");
  const canRequestRefund = order.paymentStatus === "paid" && ["delivered", "cancelled"].includes(order.status) && !existingRefund;

  async function cancelOrder() {
    setPending(true);
    setMessage("");
    try { await cancel({ id }); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not cancel this order."); } finally { setPending(false); }
  }

  async function reorder() {
    setPending(true);
    setMessage("");
    try {
      for (const item of orderItems) await addToCart({ medicineId: item.medicineId, quantity: item.quantity });
      router.push("/cart");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Some products could not be added to your cart.");
    } finally { setPending(false); }
  }

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      await requestRefund({ orderId: id, reason: refundReason.trim() });
      setRefundReason("");
      setMessage("Refund request submitted for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit the refund request.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="orders-page">
      <Link className="back-link" href="/orders">← Back to orders</Link>
      <header className="catalog-heading"><p className="eyebrow"><span className="eyebrow__dot" /> Order details</p><h1>{order.orderNumber}</h1><p>Placed {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}</p></header>
      <div className="order-detail-layout">
        <section className="checkout-step-panel"><div className="section-heading"><h2>Order progress</h2><span className={`status-pill status-pill--${order.status}`}>{statusLabels[order.status] ?? order.status}</span></div>
          {order.status === "cancelled" ? <p className="inline-note">This order was cancelled. Payment status: {order.paymentStatus}.</p> : order.status === "awaiting_payment" ? <p className="inline-note">Payment is not confirmed. Return to checkout to start a payment attempt.</p> : <ol className="order-timeline">{timeline.map((item, index) => { const Icon = item.icon; return <li className={index <= currentIndex ? "is-complete" : ""} key={item.key}><span><Icon size={16} /></span><strong>{item.label}</strong></li>; })}</ol>}
          <h3>Items</h3><div className="checkout-line-items">{order.items.map((item) => <div className="checkout-line-item" key={item._id}><span>{item.name} · {item.brand} × {item.quantity}{item.prescriptionRequired && <small>Prescription required</small>}</span><strong>{formatRupees(item.unitPricePaise * item.quantity)}</strong></div>)}</div>
          <h3>Delivery address</h3><address className="order-address">{order.address.fullName}<br />{order.address.line1}<br />{order.address.city}, {order.address.state} {order.address.pincode}<br />{order.address.mobile}</address>
          {message && <p className="form-error" role="alert">{message}</p>}
          {canRequestRefund && <form className="refund-request" onSubmit={(event) => void submitRefund(event)}><label htmlFor="refund-reason">Request a refund</label><textarea id="refund-reason" required minLength={5} maxLength={500} value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="Tell us why you are requesting a refund" /><button className="button button--outline" type="submit" disabled={pending || refunds === undefined}>Submit refund request</button></form>}
          {existingRefund && <p className="inline-note">Refund request status: {existingRefund.status}.</p>}
          <div className="form-actions"><button className="button button--outline" type="button" disabled={pending} onClick={() => void reorder()}><RotateCcw size={16} /> Reorder</button>{order.invoice && <button className="button button--outline" type="button" onClick={() => window.print()}><FileText size={16} /> Print invoice</button>}{canCancel && <button className="button button--danger" type="button" disabled={pending} onClick={() => void cancelOrder()}>Cancel order</button>}</div>
        </section>
        <aside className="order-summary"><h2>Payment and totals</h2><div className="summary-line"><span>Payment</span><span>{order.paymentStatus}</span></div><div className="summary-line"><span>Subtotal</span><span>{formatRupees(order.subtotalPaise)}</span></div><div className="summary-line"><span>Discount</span><span>-{formatRupees(order.discountPaise)}</span></div><div className="summary-line"><span>Delivery</span><span>{formatRupees(order.deliveryPaise)}</span></div><div className="summary-line summary-line--total"><strong>Total</strong><strong>{formatRupees(order.totalPaise)}</strong></div>{order.invoice && <p className="summary-note">Invoice {order.invoice.invoiceNumber}</p>}</aside>
      </div>
    </main>
  );
}