"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowDownWideNarrow, Search, SlidersHorizontal } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useConvexReady } from "@/components/providers/convex-provider";
import ProductCard from "@/components/medicines/product-card";
import { medicineSellingPricePaise } from "@/lib/format";

type SortOption = "popular" | "price-asc" | "price-desc" | "newest";

export default function MedicineBrowser({ initialSearch = "", initialCategory = "", discountedOnly = false }: { initialSearch?: string; initialCategory?: string; discountedOnly?: boolean }) {
  const ready = useConvexReady();
  return ready ? <ConnectedMedicineBrowser initialSearch={initialSearch} initialCategory={initialCategory} discountedOnly={discountedOnly} /> : <PreviewMedicineBrowser initialSearch={initialSearch} initialCategory={initialCategory} discountedOnly={discountedOnly} />;
}

function ConnectedMedicineBrowser({ initialSearch, initialCategory, discountedOnly }: { initialSearch: string; initialCategory: string; discountedOnly: boolean }) {
  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [maxPrice, setMaxPrice] = useState(100000);
  const [prescriptionOnly, setPrescriptionOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("popular");
  const categories = useQuery(api.categories.list, {});
  const selectedCategory = categories?.find((category) => category.slug === initialCategory);
  const effectiveCategoryId = categoryId || selectedCategory?._id;
  const medicines = useQuery(api.medicines.list, {
    search: search.trim() || undefined,
    categoryId: effectiveCategoryId as Id<"categories"> | undefined,
    prescriptionRequired: prescriptionOnly ? true : undefined,
    inStockOnly: inStockOnly || undefined,
    sort,
  });
  const brands = useMemo(() => [...new Set((medicines ?? []).flatMap((medicine) => medicine.brand ? [medicine.brand] : []))].sort(), [medicines]);
  const filtered = (medicines ?? []).filter((medicine) => {
    const sellingPricePaise = medicineSellingPricePaise(medicine);
    return (!brand || medicine.brand === brand) &&
      (sellingPricePaise === undefined ? maxPrice === 100000 : sellingPricePaise <= maxPrice) &&
      (!discountedOnly || (medicine.discountPercent ?? 0) > 0);
  });

  return (
    <main className="shop-page">
      <section className="shop-heading">
        <p className="eyebrow"><span className="eyebrow__dot" /> MEDICO pharmacy</p>
        <h1>Medicines, made easier to find.</h1>
        <p>U.S. medicine listings sourced from FDA/openFDA. They do not indicate Indian approval, availability, local stock, or retail price.</p>
        <form className="shop-search" action="/medicines" method="get">
          <Search size={19} aria-hidden="true" />
          <input aria-label="Search medicines" name="q" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try paracetamol, vitamins, or a brand" list="medicine-suggestions" />
          <datalist id="medicine-suggestions">{(medicines ?? []).slice(0, 8).map((medicine) => <option key={medicine._id} value={medicine.name} />)}</datalist>
          <button className="button button--primary" type="submit">Search</button>
        </form>
      </section>
      <div className="shop-layout">
        <aside className="shop-filters" aria-label="Medicine filters">
          <div className="shop-filters__title"><SlidersHorizontal size={17} /><strong>Filters</strong></div>
          <label className="field-label" htmlFor="filter-category">Category</label>
          <select id="filter-category" value={effectiveCategoryId ?? ""} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">All categories</option>
            {(categories ?? []).map((category) => <option value={category._id} key={category._id}>{category.name}</option>)}
          </select>
          <label className="field-label" htmlFor="filter-brand">Brand</label>
          <select id="filter-brand" value={brand} onChange={(event) => setBrand(event.target.value)}>
            <option value="">All brands</option>
            {brands.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
          <label className="field-label" htmlFor="filter-price">Maximum price: ₹{(maxPrice / 100).toLocaleString("en-IN")}</label>
          <input id="filter-price" type="range" min="5000" max="100000" step="5000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
          <label className="filter-check"><input type="checkbox" checked={prescriptionOnly} onChange={(event) => setPrescriptionOnly(event.target.checked)} /> Prescription required</label>
          <label className="filter-check"><input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} /> In stock only</label>
          <button className="text-button" type="button" onClick={() => { setSearch(""); setCategoryId(""); setBrand(""); setMaxPrice(100000); setPrescriptionOnly(false); setInStockOnly(false); setSort("popular"); }}>Clear filters</button>
        </aside>
        <section className="shop-results" aria-labelledby="shop-results-heading">
          <div className="shop-results__toolbar">
            <div><h2 id="shop-results-heading">{discountedOnly ? "Discounted products" : initialCategory && selectedCategory ? selectedCategory.name : "All medicines"}</h2><span>{filtered.length} products</span></div>
            <label className="sort-control"><ArrowDownWideNarrow size={16} /><span className="sr-only">Sort products</span>
              <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
                <option value="popular">Most popular</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="newest">Newest</option>
              </select>
            </label>
          </div>
          {medicines === undefined ? <div className="empty-panel"><p>Loading medicines...</p></div> : filtered.length === 0 ? (
            <div className="empty-panel"><strong>No matching medicines</strong><p>Try changing your search or filters.</p><Link className="button button--outline" href="/medicines">Browse all medicines</Link></div>
          ) : (
            <div className="product-grid">{filtered.map((medicine) => <ProductCard medicine={medicine} key={medicine._id} />)}</div>
          )}
        </section>
      </div>
    </main>
  );
}

function PreviewMedicineBrowser({ initialSearch, initialCategory, discountedOnly }: { initialSearch: string; initialCategory: string; discountedOnly: boolean }) {
  return (
    <main className="shop-page">
      <section className="shop-heading">
        <p className="eyebrow"><span className="eyebrow__dot" /> MEDICO pharmacy</p>
        <h1>Medicines, made easier to find.</h1>
        <p>U.S. medicine listings sourced from FDA/openFDA. They do not indicate Indian approval, availability, local stock, or retail price.</p>
        <form className="shop-search" action="/medicines" method="get"><Search size={19} aria-hidden="true" /><input aria-label="Search medicines" name="q" defaultValue={initialSearch} placeholder="Search medicine information" /><button className="button button--primary" type="submit">Search</button></form>
      </section>
      <div className="preview-setup"><strong>Store connection required</strong><span>Connect Convex to load medicines from the database.</span></div>
      <div className="shop-results__toolbar"><h2>{discountedOnly ? "Discounted products" : initialCategory || "All medicines"}</h2><span>0 products</span></div>
      <div className="empty-panel"><strong>Store connection required</strong><p>Medicines will appear here when the Convex deployment is connected.</p><Link className="button button--outline" href="/medicines">Browse all medicines</Link></div>
    </main>
  );
}