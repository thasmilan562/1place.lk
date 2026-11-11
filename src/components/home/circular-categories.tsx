"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { getAdminCategories } from "@/lib/firestore-client";
import { deduplicateCategories } from "@/lib/category-utils";

interface Props { categories?: Category[]; products?: Product[] }
function getGeneratedCategoryArt(category: Category): string | undefined {
  const key = `${category.name} ${category.slug}`.toLowerCase();
  if (/teddy|bear/.test(key)) return "/images/category-icons/white/teddy-bear.webp";
  if (/watch/.test(key)) return "/images/category-icons/white/watch.webp";
  if (/hot\s*wheel|hotwheel/.test(key)) return "/images/category-icons/white/hot-wheel.webp";
  if (/gift.*flower|flower.*gift|bouquet|flower/.test(key)) return "/images/category-icons/white/gift-flowers.webp";
  if (/gift/.test(key)) return "/images/category-icons/white/gift-items.webp";
  if (/laptop|macbook|computer/.test(key)) return "/images/category-icons/laptops.webp";
  if (/beauty|skincare|skin-care|cosmetic/.test(key)) return "/images/category-icons/white/beauty.webp";
  if (/sport|fitness|gym/.test(key)) return "/images/category-icons/sports-fitness.webp";
  if (/toy|game/.test(key)) return "/images/category-icons/white/toys-games.webp";
  if (/home|living|furniture/.test(key)) return "/images/category-icons/white/home-living.webp";
  if (/fashion|clothing|apparel/.test(key)) return "/images/category-icons/white/fashion.webp";
  if (/electronic|smartphone|mobile|phone|tablet|accessor|earbud|headphone|speaker|audio|power\s*bank|charger|adapter|cable|camera|gimbal|projector|router|stand/.test(key)) return "/images/category-icons/white/electronics.webp";
  return undefined;
}

function CategoryCollection({ categories: initialCategories, products = [] }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const pathname = usePathname();
  const selected = useSearchParams()?.get("category");
  useEffect(() => {
    let active = true;
    getAdminCategories(true).then(items => { if (active) setCategories(items); }).catch(() => { if (active) setCategories([]); });
    return () => { active = false; };
  }, []);
  const items = deduplicateCategories(categories).filter((category) =>
    category.status !== "inactive" && category.status !== "deleted" &&
    category.isDeleted !== true && !/laptop|macbook|sports?|fitness/.test(`${category.name} ${category.slug}`.toLowerCase())
  );
  if (!items.length) return null;
  return <section id="categories-strip" className="category-collection" aria-labelledby="category-collection-title">
    <div className="category-collection__inner">
      <div className="category-collection__heading"><div><p>BROWSE THE COLLECTION</p><h2 id="category-collection-title">Shop by category.</h2></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("open-categories-menu"))}>View all <ChevronRight size={16}/></button></div>
      <div className="category-collection__grid">{items.map(category => {
        const categoryName = category.name.trim().toLowerCase();
        const categoryProduct = products.find(product =>
          product.category_id === category.id || product.categoryId === category.id ||
          product.category_slug === category.slug || product.categorySlug === category.slug ||
          product.category_name?.trim().toLowerCase() === categoryName ||
          product.categoryName?.trim().toLowerCase() === categoryName
        );
        const imageUrl = getGeneratedCategoryArt(category) || category.image_url || category.iconUrl || categoryProduct?.images?.[0] || categoryProduct?.image_url || categoryProduct?.image || categoryProduct?.cover_image;
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


