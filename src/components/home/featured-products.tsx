"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/products/ProductCard";
import { Product } from "@/lib/types";
import { uniqueById } from "@/lib/utils";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function FeaturedProducts({
  initialProducts,
  initialVisible = true,
}: {
  initialProducts?: Product[];
  initialVisible?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(initialVisible);

  useEffect(() => {
    setIsVisible(initialVisible);
  }, [initialVisible]);

  const featuredProducts = useMemo(() => {
    const unique = uniqueById(initialProducts || []);
    let filtered = unique.filter((p) => p.featured && p.price > 0);
    if (filtered.length === 0) {
      filtered = unique.filter((p) => p.price > 0).slice(0, 8);
    }
    return filtered.slice(0, 8);
  }, [initialProducts]);

  // When disabled or empty, completely remove from the DOM
  if (!isVisible || featuredProducts.length === 0) {
    return null;
  }

  return (
    <ScrollReveal
      as="section"
      id="featured-products"
      aria-label="Featured Products"
      stagger={0.06}
      yOffset={16}
      className="py-6 sm:py-8 md:py-12 bg-white relative overflow-hidden font-sans select-none"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        {/* Section Header Matching Reference */}
        <div data-reveal-item className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#111111]">
            Featured Products
          </h2>
          <Link
            href="/products?featured=true"
            className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#68122F] hover:text-[#520d23] hover:underline transition-colors shrink-0 group"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Responsive Products Grid: 4 cols desktop, 3 tablet, 2 mobile */}
        <div
          data-reveal-item
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
        >
          {featuredProducts.map((product) => (
            <div key={`fp-${product.id}`} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
