"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useConvexAuth, useMutation } from "convex/react";
import type { Doc } from "@backend/convex/_generated/dataModel";
import { ArrowUpRight, Pill, ShoppingBag } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { useConvexReady } from "@/components/providers/convex-provider";
import { formatRupees, medicineMrpPaise, medicineSellingPricePaise } from "@/lib/format";

export type MedicineCardItem = Pick<Doc<"medicines">, "name"> & Partial<Doc<"medicines">> & { id?: string };

export default function ProductCard({ medicine, categoryName }: { medicine: MedicineCardItem; categoryName?: string }) {
  const ready = useConvexReady();
  return ready ? <ConnectedProductCard medicine={medicine} categoryName={categoryName} /> : <ProductCardContent medicine={medicine} categoryName={categoryName} />;
}

function ConnectedProductCard({ medicine, categoryName }: { medicine: MedicineCardItem; categoryName?: string }) {
  const { isAuthenticated } = useConvexAuth();
  const add = useMutation(api.cart.add);
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function addToCart() {
    if (!medicine._id) return;
    if (!isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/cart")}`);
      return;
    }
    try {
      await add({ medicineId: medicine._id });
      setMessage("Added to cart");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add this item.");
    }
  }

  return <ProductCardContent medicine={medicine} categoryName={categoryName} onAdd={addToCart} message={message} />;
}

function ProductCardContent({
  medicine,
  categoryName,
  onAdd,
  message,
}: {
  medicine: MedicineCardItem;
  categoryName?: string;
  onAdd?: () => void;
  message?: string;
}) {
  const price = medicineSellingPricePaise(medicine);
  const mrp = medicineMrpPaise(medicine);
  const canPurchase = medicine.pricePaise !== undefined && medicine.stock !== undefined && medicine.prescriptionRequired !== undefined;
  const href = medicine._id ? `/medicines/${medicine._id}` : "/medicines";
  const productMeta = [medicine.strength, medicine.dosageForm, medicine.packSize ?? medicine.packageDescription].filter(Boolean).join(" · ");
  return (
    <article className="product-card">
      <Link className="product-card__image" href={href} aria-label={`View ${medicine.name}`}>
        <span className="product-card__art">{medicine.image && <Image src={medicine.image} alt="" fill sizes="(max-width: 760px) 45vw, 240px" />}</span>
        {(medicine.discountPercent ?? 0) > 0 && <span className="product-card__discount">{medicine.discountPercent}% off</span>}
        {medicine.prescriptionRequired && <span className="product-card__rx">Prescription required</span>}
      </Link>
      <div className="product-card__body">
        <p className="product-card__eyebrow">{categoryName ?? medicine.brand ?? medicine.manufacturer ?? "FDA NDC listing"}</p>
        <Link className="product-card__name" href={href}>{medicine.name}</Link>
        <p className="product-card__meta">{productMeta || "Product details unavailable"}</p>
        <div className="product-card__price-row">
          <strong>{price === undefined ? "Price currently unavailable" : formatRupees(price)}</strong>
          {mrp !== undefined && price !== undefined && mrp > price && <del>{formatRupees(mrp)}</del>}
        </div>
        {medicine.priceSource === "MEDICO_DEMO" && <small>Demo store price, not a vendor quote</small>}
        <p className={medicine.stock === undefined || medicine.stock > 0 ? "product-card__stock" : "product-card__stock product-card__stock--empty"}>
          {medicine.stock === undefined ? "Stock information unavailable" : medicine.stock === 0 ? "Out of stock" : medicine.stock <= 10 ? `Only ${medicine.stock} left` : "In stock"}
        </p>
        {onAdd ? (
          <button className="button button--primary product-card__add" type="button" disabled={!canPurchase || medicine.stock === 0} onClick={onAdd}>
            <ShoppingBag size={16} /> {canPurchase ? "Add to cart" : "Information only"}
          </button>
        ) : (
          <Link className="button button--outline product-card__add" href={href}>
            <ArrowUpRight size={16} /> View details
          </Link>
        )}
        {message && <p className="product-card__message" aria-live="polite">{message}</p>}
        <span className="product-card__generic"><Pill size={12} /> {medicine.genericName ?? medicine.activeIngredients?.map((ingredient) => ingredient.name).join(", ") ?? "Generic name unavailable"}</span>
      </div>
    </article>
  );
}