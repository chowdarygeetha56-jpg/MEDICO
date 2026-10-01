"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Activity, Apple, Baby, BriefcaseMedical, Droplets, HeartPulse, Leaf, Pill, Sparkles, Sun, Wind } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { categorySeed, medicineSeed } from "@backend/convex/seedData";
import { useConvexReady } from "@/components/providers/convex-provider";

const categoryIcons = { Activity, Apple, Baby, BriefcaseMedical, Droplets, HeartPulse, Leaf, Sparkles, Sun, Wind } as const;

export default function CategoryBrowser() {
  const ready = useConvexReady();
  return ready ? <ConnectedCategoryBrowser /> : <PreviewCategoryBrowser />;
}

function PreviewCategoryBrowser() {
  return (
    <main className="catalog-page">
      <header className="catalog-heading"><p className="eyebrow"><span className="eyebrow__dot" /> Browse by need</p><h1>Health essentials, organized for you.</h1><p>Explore the sample categories. Connect Convex to see live inventory and order products.</p></header>
      <div className="preview-setup"><strong>Sample category preview</strong><span>Availability and product lists are not live until the MEDICO Convex deployment is configured.</span></div>
      <CategoryGrid categories={categorySeed.map((category) => ({ ...category, count: medicineSeed.filter((item) => item.category === category.slug).length }))} />
    </main>
  );
}

function ConnectedCategoryBrowser() {
  const categories = useQuery(api.categories.list, {});
  const medicines = useQuery(api.medicines.list, { sort: "popular" });
  if (!categories || !medicines) return <main className="catalog-page"><p>Loading categories...</p></main>;
  return (
    <main className="catalog-page">
      <header className="catalog-heading"><p className="eyebrow"><span className="eyebrow__dot" /> Browse by need</p><h1>Health essentials, organized for you.</h1><p>Choose a category to browse its available products.</p></header>
      <CategoryGrid categories={categories.map((category) => ({ ...category, count: medicines.filter((medicine) => medicine.categoryId === category._id).length }))} />
    </main>
  );
}

function CategoryGrid({ categories }: { categories: Array<{ name: string; slug: string; description: string; icon: string; count: number }> }) {
  return (
    <div className="category-grid">
      {categories.map((category, index) => {
        const Icon = categoryIcons[category.icon as keyof typeof categoryIcons] ?? Pill;
        return (
          <Link className="category-card" href={`/categories/${category.slug}`} key={category.slug}>
            <span className={`category-card__icon category-card__icon--${index % 4}`}><Icon size={23} strokeWidth={1.7} /></span>
            <span className="category-card__content"><strong>{category.name}</strong><span>{category.description}</span></span>
            <span className="category-card__count">{category.count} {category.count === 1 ? "item" : "items"}</span>
          </Link>
        );
      })}
    </div>
  );
}