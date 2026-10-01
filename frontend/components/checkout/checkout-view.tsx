"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, Check, CreditCard, LoaderCircle, MapPin, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import AuthGate from "@/components/auth/auth-gate";
import { useConvexReady } from "@/components/providers/convex-provider";
import { formatRupees } from "@/lib/format";

type AddressForm = { fullName: string; mobile: string; line1: string; city: string; state: string; pincode: string };
const blankAddress: AddressForm = { fullName: "", mobile: "", line1: "", city: "", state: "", pincode: "" };

export default function CheckoutView() {
  const ready = useConvexReady();
  return ready ? <AuthGate><ConnectedCheckout /></AuthGate> : (
    <main className="checkout-page"><div className="preview-setup"><strong>Checkout is not connected</strong><span>Connect Convex and configure Razorpay server credentials before placing or paying for orders.</span></div><Link className="button button--outline" href="/cart">Return to cart</Link></main>
  );
}

function ConnectedCheckout() {
  const router = useRouter();
  const addresses = useQuery(api.addresses.mine, {});
  const prescriptions = useQuery(api.prescriptions.mine, {});
  const addAddress = useMutation(api.addresses.add);
  const updateAddress = useMutation(api.addresses.update);
  const removeAddress = useMutation(api.addresses.remove);
  const createCheckout = useMutation(api.orders.createCheckout);
  const createRazorpayOrder = useAction(api.paymentActions.createRazorpayOrder);
  const verifyRazorpayPayment = useAction(api.paymentActions.verifyRazorpayPayment);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAddressOverrideId, setSelectedAddressId] = useState<Id<"addresses"> | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<Id<"addresses"> | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>(blankAddress);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const cart = useQuery(api.orders.preview, { couponCode: couponCode || undefined });
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<Id<"prescriptions">[]>([]);
  const [method, setMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const selectedAddressId = selectedAddressOverrideId ?? (addresses?.find((item) => item.isDefault) ?? addresses?.[0])?._id ?? null;

  if (cart === undefined || addresses === undefined || prescriptions === undefined) return <main className="checkout-page"><div className="empty-panel">Loading checkout...</div></main>;
  if (!cart.authenticated) return <main className="checkout-page"><div className="empty-panel"><strong>Sign in to checkout</strong><Link className="button button--primary" href="/auth/signin">Sign in</Link></div></main>;
  if (cart.items.length === 0) return <main className="checkout-page"><div className="empty-panel"><strong>Your cart is empty.</strong><p>Add products before starting checkout.</p><Link className="button button--primary" href="/medicines">Browse medicines</Link></div></main>;
  if (cart.hasUnavailableItems) return <main className="checkout-page"><div className="empty-panel"><strong>Update your cart to continue.</strong><p>One or more products exceed current stock.</p><Link className="button button--primary" href="/cart">Review cart</Link></div></main>;

  const selectedAddress = addresses.find((item) => item._id === selectedAddressId);
  const approvedPrescriptions = prescriptions.filter((item) => item.status === "approved");
  const needsApprovedPrescription = cart.hasPrescriptionItems;

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      if (editingAddressId) {
        await updateAddress({ id: editingAddressId, ...addressForm, isDefault });
        setSelectedAddressId(editingAddressId);
      } else {
        const id = await addAddress({ ...addressForm, isDefault });
        setSelectedAddressId(id);
      }
      setAddressForm(blankAddress);
      setEditingAddressId(null);
      setShowAddressForm(false);
      setIsDefault(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this address.");
    } finally {
      setPending(false);
    }
  }

  function editAddress(address: NonNullable<typeof addresses>[number]) {
    setEditingAddressId(address._id);
    setAddressForm({ fullName: address.fullName, mobile: address.mobile, line1: address.line1, city: address.city, state: address.state, pincode: address.pincode });
    setIsDefault(address.isDefault);
    setShowAddressForm(true);
  }

  async function startPayment() {
    if (!selectedAddress) {
      setMessage("Choose a delivery address before continuing.");
      setStep(1);
      return;
    }
    if (needsApprovedPrescription && selectedPrescriptionIds.length === 0) {
      setMessage("Choose an approved prescription before continuing.");
      setStep(2);
      return;
    }
    if (typeof window.Razorpay !== "function") {
      setMessage("Razorpay Checkout did not load. Check your connection and try again.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const attempt = await createCheckout({ addressId: selectedAddress._id, couponCode: couponCode || undefined, prescriptionIds: selectedPrescriptionIds });
      const gatewayOrder = await createRazorpayOrder({ orderId: attempt.orderId });
      const checkout = new window.Razorpay({
        key: gatewayOrder.keyId,
        amount: gatewayOrder.amountPaise,
        currency: gatewayOrder.currency,
        name: "MEDICO",
        description: `Order ${gatewayOrder.orderNumber}`,
        order_id: gatewayOrder.gatewayOrderId,
        notes: { method },
        theme: { color: "#18745c" },
        handler: async (response) => {
          setPending(true);
          try {
            const result = await verifyRazorpayPayment({ orderId: attempt.orderId, razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature });
            if (result.confirmed) router.push(`/orders/${result.orderId}`);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Payment verification did not complete. Do not retry a captured payment; check your order history.");
          } finally {
            setPending(false);
          }
        },
        modal: { ondismiss: () => setPending(false) },
        prefill: { name: selectedAddress.fullName, contact: selectedAddress.mobile },
      });
      checkout.open();
      setPending(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment could not be started. Your cart has been kept.");
      setPending(false);
    }
  }

  const subtotalPaise = cart.subtotalPaise;
  const discountPaise = couponCode ? cart.discountPaise : 0;
  const deliveryPaise = subtotalPaise - discountPaise >= 49900 ? 0 : 4000;
  const totalPaise = subtotalPaise - discountPaise + deliveryPaise;

  return (
    <main className="checkout-page">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <header className="catalog-heading"><p className="eyebrow"><span className="eyebrow__dot" /> Secure checkout</p><h1>Complete your order.</h1><p>Your payment is only confirmed after MEDICO verifies it with Razorpay.</p></header>
      <ol className="checkout-steps">{["Delivery address", "Review order", "Payment"].map((label, index) => <li className={step === index + 1 ? "is-current" : step > index + 1 ? "is-complete" : ""} key={label}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span>{label}</li>)}</ol>
      <div className="checkout-layout">
        <section className="checkout-main">
          {step === 1 && <div className="checkout-step-panel"><div className="section-heading"><div><p className="eyebrow">Step 1</p><h2>Delivery address</h2></div><button className="button button--outline" type="button" onClick={() => { setEditingAddressId(null); setAddressForm(blankAddress); setShowAddressForm(true); }}><Plus size={16} /> Add address</button></div>
            {addresses.length === 0 && <p className="inline-note">Add a delivery address to continue.</p>}
            <div className="address-list">{addresses.map((address) => <label className={`address-option${selectedAddressId === address._id ? " is-selected" : ""}`} key={address._id}><input type="radio" name="address" checked={selectedAddressId === address._id} onChange={() => setSelectedAddressId(address._id)} /><MapPin size={17} /><span><strong>{address.fullName}</strong><span>{address.line1}, {address.city}, {address.state} {address.pincode}</span><span>{address.mobile}</span></span>{address.isDefault && <small>Default</small>}<button className="icon-button" type="button" aria-label="Edit address" onClick={(event) => { event.preventDefault(); editAddress(address); }}>Edit</button><button className="icon-button" type="button" aria-label="Delete address" onClick={(event) => { event.preventDefault(); void removeAddress({ id: address._id }).then(() => { if (selectedAddressId === address._id) setSelectedAddressId(null); }).catch((error) => setMessage(error.message)); }}><Trash2 size={15} /></button></label>)}</div>
            {showAddressForm && <form className="address-form" onSubmit={(event) => void saveAddress(event)}><div className="form-grid"><label>Full name<input autoComplete="name" required minLength={2} value={addressForm.fullName} onChange={(event) => setAddressForm({ ...addressForm, fullName: event.target.value })} /></label><label>Mobile number<input autoComplete="tel-national" inputMode="numeric" required pattern="[6-9][0-9]{9}" value={addressForm.mobile} onChange={(event) => setAddressForm({ ...addressForm, mobile: event.target.value })} /></label><label className="form-grid__wide">House / street<input autoComplete="street-address" required minLength={5} value={addressForm.line1} onChange={(event) => setAddressForm({ ...addressForm, line1: event.target.value })} /></label><label>City<input autoComplete="address-level2" required value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} /></label><label>State<input autoComplete="address-level1" required value={addressForm.state} onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })} /></label><label>PIN code<input autoComplete="postal-code" inputMode="numeric" required pattern="[0-9]{6}" value={addressForm.pincode} onChange={(event) => setAddressForm({ ...addressForm, pincode: event.target.value })} /></label></div><label className="filter-check"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Save as default address</label><div className="form-actions"><button className="button button--primary" type="submit" disabled={pending}>{pending ? "Saving..." : editingAddressId ? "Save changes" : "Save address"}</button><button className="button button--outline" type="button" onClick={() => setShowAddressForm(false)}>Cancel</button></div></form>}
            <button className="button button--primary" type="button" disabled={!selectedAddress} onClick={() => { setMessage(""); setStep(2); }}>Review order <ArrowRight size={16} /></button>
          </div>}
          {step === 2 && <div className="checkout-step-panel"><p className="eyebrow">Step 2</p><h2>Review your order</h2><div className="checkout-address"><MapPin size={17} /><div><strong>{selectedAddress?.fullName ?? "No address selected"}</strong><span>{selectedAddress ? `${selectedAddress.line1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.pincode}` : "Go back to add an address."}</span><button className="text-button" type="button" onClick={() => setStep(1)}>Change address</button></div></div>
            <div className="checkout-line-items">{cart.items.map((item) => <div className="checkout-line-item" key={item.itemId}><span>{item.medicine.name} × {item.quantity}{item.medicine.prescriptionRequired && <small>Prescription required</small>}</span><strong>{item.unitPricePaise === undefined ? "Price currently unavailable" : formatRupees(item.unitPricePaise * item.quantity)}</strong></div>)}</div>
            {cart.hasPrescriptionItems && <div className="prescription-select"><strong>Approved prescription</strong><p>At least one approved prescription must match the prescribed products. Uploads awaiting review cannot be used.</p>{approvedPrescriptions.length === 0 ? <Link className="button button--outline" href="/prescription">Upload a prescription</Link> : approvedPrescriptions.map((prescription) => <label className="filter-check" key={prescription._id}><input type="checkbox" checked={selectedPrescriptionIds.includes(prescription._id)} onChange={(event) => setSelectedPrescriptionIds((current) => event.target.checked ? [...current, prescription._id] : current.filter((id) => id !== prescription._id))} /> {prescription.fileName}</label>)}</div>}
            <form className="coupon-form" onSubmit={(event) => { event.preventDefault(); setCouponCode(coupon.trim().toUpperCase()); }}><label htmlFor="checkout-coupon">Coupon code</label><div><input id="checkout-coupon" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Enter code" /><button type="submit">Apply</button></div></form>{cart.couponMessage && <p className="coupon-message" role="status">{cart.couponMessage}</p>}
            <div className="form-actions"><button className="button button--outline" type="button" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button className="button button--primary" type="button" onClick={() => { setMessage(""); setStep(3); }}>Continue to payment <ArrowRight size={16} /></button></div>
          </div>}
          {step === 3 && <div className="checkout-step-panel"><p className="eyebrow">Step 3</p><h2>Choose a payment method</h2><p>Payments are handled by Razorpay. Card numbers and CVV are entered only in Razorpay Checkout and are never stored by MEDICO.</p><div className="payment-methods" role="radiogroup" aria-label="Payment method"><label className={method === "upi" ? "payment-method is-selected" : "payment-method"}><input type="radio" name="payment-method" checked={method === "upi"} onChange={() => setMethod("upi")} /><span>UPI</span></label><label className={method === "card" ? "payment-method is-selected" : "payment-method"}><input type="radio" name="payment-method" checked={method === "card"} onChange={() => setMethod("card")} /><CreditCard size={18} /><span>Card</span></label><label className={method === "netbanking" ? "payment-method is-selected" : "payment-method"}><input type="radio" name="payment-method" checked={method === "netbanking"} onChange={() => setMethod("netbanking")} /><span>Net banking</span></label></div><p className="inline-note">Cash on delivery is not enabled. Razorpay test/live keys must be configured on the Convex deployment to pay.</p><div className="payment-security"><ShieldCheck size={18} /><span>MEDICO confirms payment only after the backend validates Razorpay&apos;s signature and captured-payment status.</span></div>
            {message && <p className="form-error" role="alert">{message}</p>}
            <div className="form-actions"><button className="button button--outline" type="button" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button><button className="button button--primary" type="button" disabled={pending || !selectedAddress} onClick={() => void startPayment()}>{pending ? <LoaderCircle className="spin" size={17} /> : <CreditCard size={17} />}{pending ? "Waiting for secure payment..." : `Pay ${formatRupees(totalPaise)}`}</button></div>
          </div>}
        </section>
        <aside className="order-summary"><h2>Order summary</h2><div className="summary-line"><span>Products</span><span>{cart.items.reduce((sum, item) => sum + item.quantity, 0)}</span></div><div className="summary-line"><span>Subtotal</span><span>{formatRupees(subtotalPaise)}</span></div><div className="summary-line"><span>Discount</span><span>-{formatRupees(discountPaise)}</span></div><div className="summary-line"><span>Delivery</span><span>{deliveryPaise === 0 ? "Free" : formatRupees(deliveryPaise)}</span></div><div className="summary-line summary-line--total"><strong>Total</strong><strong>{formatRupees(totalPaise)}</strong></div><p className="summary-note">Taxes and final stock are checked by the store before payment capture.</p></aside>
      </div>
    </main>
  );
}