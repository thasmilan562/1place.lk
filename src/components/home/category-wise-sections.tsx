"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, CircleCheck as Sparkles } from "lucide-react";
import ProductCard from "@/components/products/ProductCard";
import { Product, Category } from "@/lib/types";
import { normalizeCategorySlug, uniqueById } from "@/lib/utils";

interface CategoryWiseSectionsProps {
  initialProducts?: Product[];
  categories?: Category[];
}

interface CategorySectionDef {
  key: string;
  title: string;
  subtitle: string;
  slug: string;
  categoryKeywords: string[];
}

const FEATURED_CATEGORY_DEFS: CategorySectionDef[] = [
  {
    key: "electronics",
    title: "Best Deals on Electronics",
    subtitle: "Premium home entertainment, audio gear, and cutting-edge tech gadgets.",
    slug: "electronics",
    categoryKeywords: ["electronic", "electronics", "tv", "appliance", "gadget", "gaming"],
  },
  {
    key: "mobiles-tablets",
    title: "Mobiles & Tablets",
    subtitle: "Flagship smartphones and powerful tablets with authentic official warranty.",
    slug: "mobiles-tablets",
    categoryKeywords: ["mobile", "phone", "smartphone", "tablet", "ipad", "mobiles-tablets"],
  },
  {
    key: "computers",
    title: "Laptops & Computers",
    subtitle: "High-performance MacBooks, notebooks, workstations, and computing gear.",
    slug: "computers",
    categoryKeywords: ["computer", "computers", "laptop", "laptops", "macbook", "pc"],
  },
  {
    key: "fashion",
    title: "Fashion & Accessories",
    subtitle: "Curated modern wardrobe essentials, designer wear, and stylish accessories.",
    slug: "fashion",
    categoryKeywords: ["fashion", "clothing", "wear", "apparel", "shirt"],
  },
  {
    key: "beauty-skincare",
    title: "Beauty & Skincare",
    subtitle: "Dermatologist-approved skincare, premium beauty products, and fragrances.",
    slug: "beauty-skincare",
    categoryKeywords: ["beauty", "skincare", "cosmetic", "perfume", "fragrance"],
  },
  {
    key: "home-living",
    title: "Home & Living",
    subtitle: "Smart lifestyle essentials and decor for your modern living space.",
    slug: "home-living",
    categoryKeywords: ["home", "living", "kitchen", "furniture", "lifestyle"],
  },
  {
    key: "toys-kids",
    title: "Toys & Kids",
    subtitle: "Safe, engaging, and educational toys designed for infants, toddlers, and kids.",
    slug: "toys-kids",
    categoryKeywords: ["toy", "toys", "kid", "kids", "baby", "children"],
  },
  {
    key: "sports-fitness",
    title: "Sports & Fitness",
    subtitle: "Activewear, fitness trackers, and equipment for peak athletic performance.",
    slug: "sports-fitness",
    categoryKeywords: ["sport", "sports", "fitness", "gym", "workout", "exercise"],
  },
  {
    key: "accessories",
    title: "Premium Tech Accessories",
    subtitle: "Fast GaN chargers, durable braided cables, protective cases, and mounts.",
    slug: "accessories",
    categoryKeywords: ["accessories", "accessory", "cable", "charger", "powerbank", "earbuds"],
  },
];

export default function CategoryWiseSections({
  initialProducts = [],
  categories = [],
}: CategoryWiseSectionsProps) {
  // Published products only
  const validProducts = useMemo(() => {
    return uniqueById(
      initialProducts.filter(
        (p) => !p.status || (p.status !== "draft" && p.status !== "inactive")
      )
    );
  }, [initialProducts]);

  // Group products into category sections
  const activeSections = useMemo(() => {
    // When catalog has 3 or fewer items, avoid repeating the same products across redundant homepage sections
    if (validProducts.length <= 3) return [];

    const sections: {
      key: string;
      title: string;
      subtitle: string;
      slug: string;
      products: Product[];
    }[] = [];

    const matchedProductIds = new Set<string>();

    // 1. Process predefined category definitions
    FEATURED_CATEGORY_DEFS.forEach((def) => {
      const matchingProducts = validProducts.filter((p) => {
        const catText = `${p.category_slug || ""} ${p.category_name || ""} ${p.category_id || ""}`.toLowerCase();
        return def.categoryKeywords.some((kw) => catText.includes(kw));
      });

      // HIDE the section when no eligible products exist in that category (Requirement 5)
      if (matchingProducts.length > 0) {
        sections.push({
          key: def.key,
          title: def.title,
          subtitle: def.subtitle,
          slug: def.slug,
          products: matchingProducts.slice(0, 6), // Show suitable 5-6 cards per section
        });

        matchingProducts.forEach((p) => matchedProductIds.add(p.id));
      }
    });

    // 2. Dynamically process any additional custom categories from Firestore that have products
    categories.forEach((cat) => {
      if (!cat.name || !cat.slug) return;
      const normSlug = normalizeCategorySlug(cat.slug);

      // Check if already covered
      const alreadyHandled = sections.some((s) => s.slug === normSlug);
      if (alreadyHandled) return;

      const catProducts = validProducts.filter((p) => {
        const pSlug = normalizeCategorySlug(p.category_slug || p.categorySlug || p.category_name || p.category_id || "");
        return pSlug === normSlug;
      });

      // Only add if there are products in this custom category
      if (catProducts.length > 0) {
        sections.push({
          key: `custom-${cat.id || normSlug}`,
          title: cat.name,
          subtitle: cat.description || `Browse the latest collection of ${cat.name} at 1PLACE.LK.`,
          slug: cat.slug,
          products: catProducts.slice(0, 6),
        });
      }
    });

    return sections;
  }, [validProducts, categories]);

  if (activeSections.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-10 sm:space-y-16 py-6 font-sans select-none">
      {activeSections.map((sec, idx) => {
        const isAlternateBg = idx % 2 === 1;

        return (
          <section
            key={sec.key}
            aria-label={sec.title}
            className={`w-full py-8 sm:py-12 ${
              isAlternateBg ? "bg-[#F7F7F7] border-y border-[#E8E8E8]" : "bg-white"
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* ── Category Section Header ── */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8 border-b border-[#E8E8E8] pb-4">
                <div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#111111] tracking-tight">
                    {sec.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-1 line-clamp-1">
                    {sec.subtitle}
                  </p>
                </div>

                {/* Working "View All" Button navigating to correct Category page (Requirement 5) */}
                <Link
                  href={`/category/${sec.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#64152F] hover:text-[#4E0F23] transition-colors shrink-0 group self-start sm:self-auto"
                >
                  <span>View All in {sec.title.split(" ")[0]}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* ── Product Cards Grid (Desktop 6 cards/row, Tablet 3-4, Mobile 2) ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 lg:gap-4">
                {sec.products.map((product) => (
                  <div key={`${sec.key}-${product.id}`} className="h-full">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
