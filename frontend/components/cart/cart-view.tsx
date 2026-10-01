"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Minus, Plus, Tag, Trash2 } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import AuthGate from "@/components/auth/auth-gate";
import { useConvexReady } from "@/components/providers/convex-provider";
import { formatRupees } from "@/lib/format";

export default function CartView() {
  const ready = useConvexReady();
  return ready ? <AuthGate><ConnectedCart /></AuthGate> : (
    <main className="cart-page"><div className="preview-setup"><strong>Cart connection required</strong><span>Sign-in and cart persistence use Convex. Connect the deployment to add or save real cart items.</span></div><Link className="button button--primary" href="/medicines">Continue browsing</Link></main>
  );
}

function ConnectedCart() {
  const items = useQuery(api.cart.mine, {});
  const updateQuantity = useMutation(api.cart.setQuantity);
  const remove = useMutation(api.cart.remove);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState("");
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const summary = useQuery(api.orders.preview, { couponCode: couponCode || undefined });

  async function update(itemId: string, quantity: number) {
    setPendingItem(itemId);
    setMessage("");
    try {
      await updateQuantity({ itemId: itemId as never, quantity });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update your cart.");
    } finally {
      setPendingItem(null);
    }
  }

  async function removeItem(itemId: string) {
    setPendingItem(itemId);
    try {
      await remove({ itemId: itemId as never });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove this item.");
    } finally {
      setPendingItem(null);
    }
  }

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponCode("");
      setMessage("Enter a coupon code first.");
      return;
    }
    setCouponCode(code);
    setMessage("");
  }

  const empty = items?.length === 0;
  return (
    <main className="cart-page">
      <header className="catalog-heading"><p className="eyebrow"><span className="eyebrow__dot" /> Your MEDICO bag</p><h1>Your cart</h1><p>Products are reserved only after payment is verified.</p></header>
      {items === undefined ? <div className="empty-panel">Loading your cart...</div> : empty ? (
        <div className="empty-panel cart-empty"><strong>Your cart is empty.</strong><p>Browse the catalogue to find your everyday essentials.</p><Link className="button button--primary" href="/medicines">Continue shopping</Link></div>
      ) : (
        <div className="cart-layout">
          <section className="cart-items" aria-label="Cart items">
            {items.map((row) => {
              return (
                <article className="cart-item" key={row._id}>
                  <Link className="cart-item__art" href={`/medicines/${row.medicine._id}`} aria-label={`View ${row.medicine.name}`}><span aria-hidden="true">＋</span></Link>
                  <div className="cart-item__details"><p className="cart-item__brand">{row.medicine.brand ?? "FDA NDC listing"}</p><Link className="cart-item__name" href={`/medicines/${row.medicine._id}`}>{row.medicine.name}</Link><p>{row.medicine.strength ?? row.medicine.dosageForm ?? row.medicine.packageDescription ?? "Product details unavailable"}</p>{row.medicine.prescriptionRequired && <span className="product-card__rx">Prescription required</span>}<span className={row.medicine.stock === undefined || row.medicine.stock >= row.quantity ? "product-card__stock" : "product-card__stock product-card__stock--empty"}>{row.medicine.stock === undefined ? "Stock information unavailable" : row.medicine.stock >= row.quantity ? "In stock" : "Quantity exceeds current stock"}</span></div>
                  <div className="cart-item__actions"><strong>{row.subtotalPaise === undefined ? "Price currently unavailable" : formatRupees(row.subtotalPaise)}</strong><div className="quantity-control"><button type="button" aria-label={`Decrease ${row.medicine.name} quantity`} disabled={row.quantity <= 1 || pendingItem === row._id} onClick={() => void update(row._id, row.quantity - 1)}><Minus size={14} /></button><span>{row.quantity}</span><button type="button" aria-label={`Increase ${row.medicine.name} quantity`} disabled={row.quantity >= 25 || pendingItem === row._id} onClick={() => void update(row._id, row.quantity + 1)}><Plus size={14} /></button></div><button className="text-button cart-remove" type="button" disabled={pendingItem === row._id} onClick={() => void removeItem(row._id)}><Trash2 size={14} /> Remove</button></div>
                </article>
              );
            })}
            {message && <p className="form-error" role="alert">{message}</p>}
            <Link className="section-link" href="/medicines">Continue shopping</Link>
          </section>
          <aside className="order-summary" aria-label="Order summary">
            <h2>Order summary</h2>
            <form className="coupon-form" onSubmit={(event) => { event.preventDefault(); applyCoupon(); }}><label htmlFor="cart-coupon">Coupon code</label><div><Tag size={16} /><input id="cart-coupon" value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Enter code" /><button type="submit">Apply</button></div></form>
            {summary?.couponMessage && <p className={summary.discountPaise > 0 ? "coupon-message coupon-message--success" : "coupon-message"} role="status">{summary.couponMessage}</p>}
            {couponCode && <button className="text-button" type="button" onClick={() => { setCouponCode(""); setCouponInput(""); }}>Remove coupon</button>}
            <div className="summary-line"><span>Subtotal</span><span>{formatRupees(summary?.subtotalPaise ?? 0)}</span></div>
            <div className="summary-line"><span>Discount</span><span>-{formatRupees(summary?.discountPaise ?? 0)}</span></div>
            <div className="summary-line"><span>Delivery</span><span>{summary?.deliveryPaise === 0 ? "Free" : formatRupees(summary?.deliveryPaise ?? 0)}</span></div>
            <div className="summary-line summary-line--total"><strong>Total</strong><strong>{formatRupees(summary?.totalPaise ?? 0)}</strong></div>
            {summary?.hasPrescriptionItems && <p className="summary-note">Prescription-required items need an approved prescription before they can be fulfilled.</p>}
            <Link className="button button--primary checkout-link" aria-disabled={!items?.length || !!summary?.hasUnavailableItems} href={!items?.length || summary?.hasUnavailableItems ? "/cart" : "/checkout"}>Proceed to checkout</Link>
          </aside>
        </div>
      )}
    </main>
  );
}