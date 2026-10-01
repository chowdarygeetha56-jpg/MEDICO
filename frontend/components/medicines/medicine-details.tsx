"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowLeft, Minus, Plus, ShieldAlert, ShoppingBag } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useConvexReady } from "@/components/providers/convex-provider";
import ProductCard from "@/components/medicines/product-card";
import { formatRupees, medicineMrpPaise, medicineSellingPricePaise } from "@/lib/format";

export default function MedicineDetails({ id }: { id: string }) {
  const ready = useConvexReady();
  return ready ? <ConnectedMedicineDetails id={id as Id<"medicines">} /> : (
    <main className="detail-page"><Link className="back-link" href="/medicines"><ArrowLeft size={16} /> Back to medicines</Link><div className="preview-setup"><strong>Live product details unavailable</strong><span>Connect the MEDICO Convex deployment to view the selected item&apos;s verified details and place orders.</span></div></main>
  );
}

function ConnectedMedicineDetails({ id }: { id: Id<"medicines"> }) {
  const medicine = useQuery(api.medicines.getById, { id });
  const related = useQuery(api.medicines.list, medicine?.categoryId ? { categoryId: medicine.categoryId, sort: "popular" } : "skip");
  const { isAuthenticated } = useConvexAuth();
  const add = useMutation(api.cart.add);
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (medicine === undefined) return <main className="detail-page"><p>Loading product...</p></main>;
  if (!medicine) return <main className="detail-page"><div className="empty-panel"><strong>Medicine not found</strong><p>This product may have been removed or is no longer available.</p><Link className="button button--outline" href="/medicines">Browse medicines</Link></div></main>;

  const medicineId = medicine._id;

  async function addItem(goToCheckout: boolean) {
    if (!isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(goToCheckout ? "/checkout" : "/cart")}`);
      return;
    }
    setPending(true);
    setMessage("");
    try {
      await add({ medicineId, quantity });
      if (goToCheckout) router.push("/checkout");
      else setMessage("Added to your cart.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add this medicine.");
    } finally {
      setPending(false);
    }
  }

  const relatedItems = (related ?? []).filter((item) => item._id !== medicine._id).slice(0, 4);
  const price = medicineSellingPricePaise(medicine);
  const mrp = medicineMrpPaise(medicine);
  const canPurchase = medicine.pricePaise !== undefined && medicine.stock !== undefined && medicine.prescriptionRequired !== undefined;
  const productMeta = [medicine.genericName, medicine.strength, medicine.dosageForm, medicine.packSize ?? medicine.packageDescription].filter(Boolean).join(" · ");

  return (
    <main className="detail-page">
      <Link className="back-link" href="/medicines"><ArrowLeft size={16} /> Back to medicines</Link>
      <section className="detail-layout">
        <div className="detail-art">{medicine.image && <Image src={medicine.image} alt={`Package image for ${medicine.name}`} fill sizes="(max-width: 760px) 100vw, 50vw" priority />}<span className="detail-art__label">FDA/openFDA information record</span></div>
        <div className="detail-copy">
          <p className="eyebrow"><span className="eyebrow__dot" /> {medicine.brand ?? medicine.manufacturer ?? "FDA NDC listing"}</p>
          <h1>{medicine.name}</h1>
          <p className="detail-generic">{productMeta || "Product details unavailable"}</p>
          <p className={medicine.stock === undefined || medicine.stock > 0 ? "detail-stock" : "detail-stock detail-stock--empty"}>{medicine.stock === undefined ? "Stock information unavailable" : medicine.stock === 0 ? "Out of stock" : medicine.stock <= 10 ? `Only ${medicine.stock} left` : "In stock"}</p>
          <div className="detail-price"><strong>{price === undefined ? "Price currently unavailable" : formatRupees(price)}</strong>{mrp !== undefined && price !== undefined && mrp > price && <><del>{formatRupees(mrp)}</del><span>{medicine.discountPercent}% off</span></>}</div>
          {medicine.priceSource === "MEDICO_DEMO" && <p className="detail-description">Demo store price, not a vendor quote.</p>}
          {medicine.prescriptionRequired && <div className="rx-warning"><ShieldAlert size={18} /><span>A valid prescription must be approved before this medicine can be fulfilled.</span></div>}
          {medicine.prescriptionRequired === undefined && <p className="detail-description">Prescription status unavailable in this source listing.</p>}
          {medicine.description && <p className="detail-description">{medicine.description}</p>}
          <div className="detail-buy-row">
            <div className="quantity-control" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={!canPurchase || quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={15} /></button>
              <span aria-live="polite">{quantity}</span>
              <button type="button" aria-label="Increase quantity" disabled={!canPurchase || quantity >= Math.min(25, medicine.stock ?? 0)} onClick={() => setQuantity((value) => Math.min(25, medicine.stock ?? 0, value + 1))}><Plus size={15} /></button>
            </div>
            <button className="button button--primary" type="button" disabled={!canPurchase || medicine.stock === 0 || pending} onClick={() => void addItem(false)}><ShoppingBag size={16} />{pending ? "Adding..." : canPurchase ? "Add to cart" : "Information only"}</button>
            <button className="button button--outline" type="button" disabled={!canPurchase || medicine.stock === 0 || pending} onClick={() => void addItem(true)}>Buy now</button>
          </div>
          {message && <p className="form-message" role="status">{message}</p>}
          {!isAuthenticated && <p className="detail-signin">You will be asked to sign in before adding items to your cart.</p>}
        </div>
      </section>
      <section className="detail-information" aria-label="Product information">
        <div><span>Manufacturer / labeler</span><strong>{medicine.manufacturer ?? "Not listed"}</strong></div>
        {medicine.activeIngredients?.length ? <div><span>Active ingredients</span><p>{medicine.activeIngredients.map((item) => `${item.name}${item.strength ? ` (${item.strength})` : ""}`).join(", ")}</p></div> : null}
        {medicine.therapeuticClass?.length ? <div><span>Therapeutic class</span><p>{medicine.therapeuticClass.join(", ")}</p></div> : null}
        {medicine.route?.length ? <div><span>Route</span><p>{medicine.route.join(", ")}</p></div> : null}
        {medicine.usageInfo && <div><span>Usage information</span><p>{medicine.usageInfo}</p></div>}
        {medicine.storageInfo && <div><span>Storage</span><p>{medicine.storageInfo}</p></div>}
        {medicine.safetyInfo && <div><span>Safety information</span><p>{medicine.safetyInfo}</p></div>}
      </section>
      <p className="medical-disclaimer">FDA/openFDA U.S. listing information only. Listing does not establish FDA approval, Indian approval, local availability, price, or stock. Consult a licensed clinician or pharmacist.</p>
      {relatedItems.length > 0 && <section className="related-products"><div className="section-heading"><h2>Related medicines</h2><Link className="section-link" href="/medicines">View all</Link></div><div className="product-grid">{relatedItems.map((item) => <ProductCard key={item._id} medicine={item} />)}</div></section>}
    </main>
  );
}