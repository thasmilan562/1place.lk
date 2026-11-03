"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { categories as fallbackCategories } from "@/lib/data";
import { getCategories } from "@/lib/firestore-client";
import { deduplicateCategories } from "@/lib/category-utils";

interface Props { categories?: Category[]; products?: Product[] }
function CategoryCollection({ categories: initialCategories, products = [] }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const pathname = usePathname();
  const selected = useSearchParams()?.get("category");
  useEffect(() => {
    if (initialCategories?.length) { setCategories(initialCategories); return; }
    let active = true;
    getCategories().then(items => { if (active) setCategories(items.length ? items : fallbackCategories); }).catch(() => { if (active) setCategories(fallbackCategories); });
    return () => { active = false; };
  }, [initialCategories]);
  const items = deduplicateCategories(categories.length ? categories : fallbackCategories);
  if (!items.length) return null;
  return <section id="categories-strip" className="category-collection" aria-labelledby="category-collection-title">
    <div className="category-collection__inner">
      <div className="category-collection__heading"><div><p>EXPLORE THE COLLECTION</p><h2 id="category-collection-title">Shop by category.</h2></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("open-categories-menu"))}>View all <ChevronRight size={16}/></button></div>
      <div className="category-collection__grid">{items.slice(0, 10).map(category => {
        const categoryName = category.name.trim().toLowerCase();
        const categoryProduct = products.find(product =>
          product.category_id === category.id || product.categoryId === category.id ||
          product.category_slug === category.slug || product.categorySlug === category.slug ||
          product.category_name?.trim().toLowerCase() === categoryName ||
          product.categoryName?.trim().toLowerCase() === categoryName
        );
        const imageUrl = category.image_url || category.iconUrl || categoryProduct?.images?.[0] || categoryProduct?.image_url || categoryProduct?.image || categoryProduct?.cover_image;
        return <Link key={category.id || category.slug} href={`/category/${category.slug}`} className="category-collection__card" aria-current={pathname === `/category/${category.slug}` || selected === category.slug ? "page" : undefined}>
          <div className="category-collection__image">
            {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <CategoryIcon category={category} className="h-7 w-7" />}
          </div>
          <span>{category.name}</span>
        </Link>;
      })}</div>
    </div>
  </section>;
}
export default function CircularCategories(props: Props) { return <Suspense fallback={null}><CategoryCollection {...props}/></Suspense>; }
