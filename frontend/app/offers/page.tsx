import Link from "next/link";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import MedicineBrowser from "@/components/medicines/medicine-browser";
import OffersList from "@/components/checkout/offers-list";

export default function OffersPage() {
  return (
    <>
      <SiteHeader />
      <main className="offers-page">
        <section className="offers-hero"><p className="eyebrow"><span className="eyebrow__dot" /> Offers at MEDICO</p><h1>Good value, clearly shown.</h1><p>Explore products with listed discounts. Coupon eligibility and final prices are checked again by the store at checkout.</p><Link className="button button--primary" href="#discounted-products">Shop discounted products</Link></section>
        <section className="offers-coupons"><div className="section-heading"><div><p className="eyebrow"><span className="eyebrow__dot" /> Coupon codes</p><h2>Offers for your next order.</h2></div></div><OffersList /></section>
        <div id="discounted-products"><MedicineBrowser discountedOnly /></div>
      </main>
      <SiteFooter />
    </>
  );
}