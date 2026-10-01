"use client";

import { useQuery } from "convex/react";
import { BadgePercent, CalendarClock, Tag } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { useConvexReady } from "@/components/providers/convex-provider";
import { formatRupees } from "@/lib/format";

export default function OffersList() {
  const ready = useConvexReady();
  return ready ? <ConnectedOffersList /> : <div className="offers-code-list">{[
    { code: "WELCOME10", detail: "10% off · minimum order ₹299" },
    { code: "MEDICO50", detail: "₹50 off · minimum order ₹499" },
  ].map((offer) => <article className="offer-code" key={offer.code}><span className="offer-code__icon"><BadgePercent size={20} /></span><div><strong>{offer.code}</strong><span>{offer.detail}</span></div><Tag size={16} /></article>)}</div>;
}

function ConnectedOffersList() {
  const coupons = useQuery(api.coupons.listActive, {});
  if (coupons === undefined) return <div className="empty-panel">Loading available offers...</div>;
  if (coupons.length === 0) return <div className="empty-panel">There are no active coupon offers right now.</div>;
  return <div className="offers-code-list">{coupons.map((coupon) => <article className="offer-code" key={coupon._id}><span className="offer-code__icon"><BadgePercent size={20} /></span><div><strong>{coupon.code}</strong><span>{coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `${formatRupees(coupon.discountValue)} off`} · minimum order {formatRupees(coupon.minimumOrderPaise)}</span><small><CalendarClock size={12} /> Until {new Date(coupon.validUntil).toLocaleDateString("en-IN", { dateStyle: "medium" })}</small></div><Tag size={16} /></article>)}</div>;
}