"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, BadgeCheck, Clock3, Headset, ShieldCheck, Sparkles, Truck } from "lucide-react";
import ProductCard, { type MedicineCardItem } from "@/components/medicines/product-card";
import { api } from "@backend/convex/_generated/api";
import { useConvexReady } from "@/components/providers/convex-provider";
import { categorySeed, medicineSeed } from "@backend/convex/seedData";

const popularProducts: MedicineCardItem[] = medicineSeed
  .filter((medicine) => medicine.popularity >= 70)
  .slice(0, 4)
  .map(({ name, genericName, brand, strength, packSize, pricePaise, discountPercent, stock, prescriptionRequired, image }) => ({
    name, genericName, brand, strength, packSize, pricePaise, discountPercent, stock, prescriptionRequired, image,
  }));

export default function HomeSections() {
  const ready = useConvexReady();
  const categories = useQuery(api.categories.list, ready ? {} : "skip");
  const medicines = useQuery(api.medicines.list, ready ? { sort: "popular" } : "skip");

  return (
    <>
      <section className="home-section home-section--categories" aria-labelledby="home-categories-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow__dot" /> Browse essentials</p><h2 id="home-categories-title">A little easier to find.</h2></div><Link className="section-link" href="/categories">Explore categories <ArrowRight size={16} /></Link></div>
        <div className="home-category-grid">
          {ready
            ? (categories ?? []).slice(0, 6).map((category, index) => <Link className="home-category" href={`/categories/${category.slug}`} key={category.slug}><span>{String(index + 1).padStart(2, "0")}</span><strong>{category.name}</strong><ArrowRight size={16} /></Link>)
            : categorySeed.slice(0, 6).map((category, index) => <Link className="home-category" href={`/categories/${category.slug}`} key={category.slug}><span>{String(index + 1).padStart(2, "0")}</span><strong>{category.name}</strong><ArrowRight size={16} /></Link>)}
        </div>
        {ready && categories === undefined && <p role="status">Loading categories...</p>}
        {ready && categories?.length === 0 && <p>No categories are available yet.</p>}
      </section>

      <section className="home-section home-section--products" aria-labelledby="home-products-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow__dot" /> Popular picks</p><h2 id="home-products-title">Everyday health essentials.</h2></div><Link className="section-link" href="/medicines">Shop medicines <ArrowRight size={16} /></Link></div>
        {!ready && <div className="preview-setup preview-setup--subtle"><strong>Sample catalogue preview</strong><span>Live prices, inventory, and add-to-cart require the MEDICO Convex deployment.</span></div>}
        <div className="product-grid">
          {ready
            ? (medicines ?? []).slice(0, 4).map((medicine) => <ProductCard key={medicine._id} medicine={medicine} />)
            : popularProducts.map((medicine) => <ProductCard key={medicine.name} medicine={medicine} />)}
        </div>
        {ready && medicines === undefined && <p role="status">Loading medicines...</p>}
        {ready && medicines?.length === 0 && <p>No medicines are available yet.</p>}
      </section>

      <section className="prescription-band" aria-labelledby="prescription-band-title">
        <div className="prescription-band__icon"><BadgeCheck size={27} /></div>
        <div><p className="eyebrow">Prescription support</p><h2 id="prescription-band-title">Your prescription stays part of the process.</h2><p>Upload a valid prescription for eligible products. Medicines that require one cannot be fulfilled until it is reviewed.</p></div>
        <Link className="button button--light" href="/prescription">Upload a prescription <ArrowRight size={16} /></Link>
      </section>

      <section className="home-section home-section--steps" aria-labelledby="how-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow__dot" /> The MEDICO way</p><h2 id="how-title">A clearer path to everyday care.</h2></div></div>
        <div className="steps-grid">
          <article><span>01</span><h3>Find your essentials</h3><p>Search by product, brand, or browse by category.</p></article>
          <article><span>02</span><h3>Share your prescription</h3><p>Only when a listed medicine requires one.</p></article>
          <article><span>03</span><h3>Choose delivery</h3><p>Review your order and payment before confirming.</p></article>
        </div>
      </section>

      <section className="care-points" aria-label="MEDICO commitments">
        <div><ShieldCheck size={22} /><strong>Careful by design</strong><span>Clear product and prescription information.</span></div>
        <div><Truck size={22} /><strong>Delivery details upfront</strong><span>See delivery charges before checkout.</span></div>
        <div><Headset size={22} /><strong>Help when you need it</strong><span>Support links are easy to find.</span></div>
        <div><Clock3 size={22} /><strong>Know where things stand</strong><span>Order milestones when the store is connected.</span></div>
      </section>

      <section className="home-faq" aria-labelledby="faq-title">
        <div><p className="eyebrow"><span className="eyebrow__dot" /> Good to know</p><h2 id="faq-title">A few helpful answers.</h2><p>We keep product guidance factual. For personal medical questions, ask a licensed clinician or pharmacist.</p><Link className="section-link" href="/medicines">Browse the catalogue <Sparkles size={15} /></Link></div>
        <div className="faq-list">
          <details><summary>Can I order prescription medicines?</summary><p>Prescription-required products are held until a valid prescription is submitted and approved. Do not use this website as a substitute for professional advice.</p></details>
          <details><summary>Is checkout available right now?</summary><p>Checkout and payment require the MEDICO Convex deployment and Razorpay credentials. The site will not report a payment as successful without server-side verification.</p></details>
          <details><summary>Where does my information go?</summary><p>Account, order, and prescription data are stored in the configured Convex deployment. This local preview is not connected to a deployment.</p></details>
        </div>
      </section>
    </>
  );
}