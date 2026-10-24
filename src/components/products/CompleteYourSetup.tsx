"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Product } from "@/lib/types";
import ProductCard from "@/components/products/ProductCard";

interface CompleteYourSetupProps {
  currentProduct: Product;
  allProducts: Product[];
}

export default function CompleteYourSetup({
  currentProduct,
  allProducts,
}: CompleteYourSetupProps) {
  const recommendations = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];

    // Filter out current product and out-of-stock items if desired
    const pool = allProducts.filter((p) => p.id !== currentProduct.id);

    // 1. Manually specified related products
    if (currentProduct.related_products && currentProduct.related_products.length > 0) {
      const manualMatch = pool.filter((p) => currentProduct.related_products!.includes(p.id));
      if (manualMatch.length >= 4) return manualMatch.slice(0, 4);
    }

    const catName = (currentProduct.category_name || "").toLowerCase();
    const prodName = currentProduct.name.toLowerCase();

    // Determine category type
    const isPhone = catName.includes("phone") || catName.includes("iphone") || catName.includes("samsung") || catName.includes("xiaomi") || catName.includes("oppo") || catName.includes("vivo") || catName.includes("realme") || catName.includes("oneplus") || catName.includes("google");
    const isWatch = catName.includes("watch");
    const isAudio = catName.includes("earbud") || catName.includes("headphone") || catName.includes("sound");
    const isSpeaker = catName.includes("speaker");
    const isCharger = catName.includes("charger") || catName.includes("power") || catName.includes("cable");
    const isLaptop = catName.includes("laptop") || catName.includes("macbook");

    let targetCategories: string[] = [];

    if (isPhone) {
      targetCategories = ["charger", "cable", "power bank", "earbud", "watch", "case", "accessory"];
    } else if (isWatch) {
      targetCategories = ["phone", "iphone", "samsung", "charger", "strap", "accessory"];
    } else if (isAudio || isSpeaker) {
      targetCategories = ["phone", "iphone", "samsung", "charger", "power bank", "accessory"];
    } else if (isCharger) {
      targetCategories = ["phone", "iphone", "samsung", "cable", "power bank"];
    } else if (isLaptop) {
      targetCategories = ["charger", "bag", "mouse", "headphone", "accessory"];
    } else {
      // Accessory fallback -> suggest phones first
      targetCategories = ["phone", "iphone", "samsung", "xiaomi", "accessory"];
    }

    // Score products based on category match & brand compatibility
    const scored = pool.map((item) => {
      let score = 0;
      const itemCat = (item.category_name || "").toLowerCase();
      const itemName = item.name.toLowerCase();

      // Category match rank
      targetCategories.forEach((target, idx) => {
        if (itemCat.includes(target) || itemName.includes(target)) {
          score += (targetCategories.length - idx) * 10;
        }
      });

      // Brand compatibility match (e.g. Apple product -> suggest Apple/Anker accessories)
      if (currentProduct.category_name && item.category_name === currentProduct.category_name) {
        score += 5;
      }

      return { item, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Pick top 4 products
    let result = scored.map((s) => s.item).slice(0, 4);

    // Fallback if not enough scored items
    if (result.length < 4) {
      const remaining = pool.filter((p) => !result.some((r) => r.id === p.id));
      result = [...result, ...remaining.slice(0, 4 - result.length)];
    }

    return result;
  }, [currentProduct, allProducts]);

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <section className="mt-16 sm:mt-24 pt-12 border-t border-[#EAEAEA]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
            Recommendations
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
            Complete Your Setup
          </h2>
        </div>

        <Link
          href="/products"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-black hover:underline group"
        >
          View All Products
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Grid on Desktop / Scrollable Carousel on Mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {recommendations.map((product) => (
          <div key={product.id} className="h-full">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
