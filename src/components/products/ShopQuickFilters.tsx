"use client";

import React, { useMemo } from "react";
import { Check, Flame, Tag, ShieldCheck } from "lucide-react";
import { Product } from "@/lib/types";

interface ShopQuickFiltersProps {
  products: Product[];
  inStockOnly: boolean;
  onToggleInStock: () => void;
  onSaleOnly: boolean;
  onToggleOnSale: () => void;
  newArrivalsOnly: boolean;
  onToggleNewArrivals: () => void;
  quickPriceMax: number | null;
  onToggleQuickPrice: (val: number | null) => void;
  selectedBrands: string[];
  onToggleBrand: (brand: string) => void;
  className?: string;
}

export default function ShopQuickFilters({
  products,
  inStockOnly,
  onToggleInStock,
  onSaleOnly,
  onToggleOnSale,
  newArrivalsOnly,
  onToggleNewArrivals,
  quickPriceMax,
  onToggleQuickPrice,
  selectedBrands,
  onToggleBrand,
  className = "",
}: ShopQuickFiltersProps) {
  // Check existence of matching products for each quick filter
  const hasInStock = useMemo(
    () => products.some((p) => p.stock_status !== "out_of_stock"),
    [products]
  );

  const hasBestDeals = useMemo(
    () => products.some((p) => (p.old_price && p.old_price > p.price) || (p.sale_price && p.sale_price < p.price)),
    [products]
  );

  const hasNewArrivals = useMemo(
    () => products.some((p) => p.is_new_arrival === true),
    [products]
  );

  const hasUnder25k = useMemo(
    () => products.some((p) => (p.sale_price || p.price) <= 25000 && (p.sale_price || p.price) > 0),
    [products]
  );

  const hasUnder50k = useMemo(
    () => products.some((p) => (p.sale_price || p.price) <= 50000 && (p.sale_price || p.price) > 0),
    [products]
  );

  const hasApple = useMemo(
    () =>
      products.some((p) => {
        const b = (p.brand_name || p.brand || p.name || "").toLowerCase();
        return b.includes("apple") || b.includes("iphone") || b.includes("ipad");
      }),
    [products]
  );

  const hasSamsung = useMemo(
    () =>
      products.some((p) => {
        const b = (p.brand_name || p.brand || p.name || "").toLowerCase();
        return b.includes("samsung") || b.includes("galaxy");
      }),
    [products]
  );

  const isAppleSelected = selectedBrands.some((b) => b.toLowerCase() === "apple");
  const isSamsungSelected = selectedBrands.some((b) => b.toLowerCase() === "samsung");

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      
      {/* 1. In Stock */}
      {hasInStock && (
        <button
          type="button"
          onClick={onToggleInStock}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
            inStockOnly
              ? "bg-neutral-900 text-white shadow-2xs"
              : "bg-neutral-100/90 hover:bg-neutral-200/80 text-neutral-700 hover:text-black border border-transparent"
          }`}
        >
          {inStockOnly && <Check className="w-3 h-3 stroke-[3]" />}
          <span>In Stock</span>
        </button>
      )}

      {/* 2. Best Deals */}
      {hasBestDeals && (
        <button
          type="button"
          onClick={onToggleOnSale}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
            onSaleOnly
              ? "bg-red-600 text-white shadow-2xs"
              : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/60"
          }`}
        >
          <Flame className="w-3 h-3 text-red-500" />
          <span>Best Deals</span>
        </button>
      )}

      {/* 3. New Arrivals */}
      {hasNewArrivals && (
        <button
          type="button"
          onClick={onToggleNewArrivals}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
            newArrivalsOnly
              ? "bg-neutral-900 text-white shadow-2xs"
              : "bg-neutral-100/90 hover:bg-neutral-200/80 text-neutral-700 hover:text-black border border-transparent"
          }`}
        >
          <span>New Arrivals</span>
        </button>
      )}

      {/* 4. Under LKR 25,000 */}
      {hasUnder25k && (
        <button
          type="button"
          onClick={() => onToggleQuickPrice(quickPriceMax === 25000 ? null : 25000)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
            quickPriceMax === 25000
              ? "bg-neutral-900 text-white shadow-2xs"
              : "bg-neutral-100/90 hover:bg-neutral-200/80 text-neutral-700 hover:text-black border border-transparent"
          }`}
        >
          {quickPriceMax === 25000 && <Check className="w-3 h-3 stroke-[3]" />}
          <span>Under LKR 25,000</span>
        </button>
      )}

      {/* 5. Under LKR 50,000 */}
      {hasUnder50k && (
        <button
          type="button"
          onClick={() => onToggleQuickPrice(quickPriceMax === 50000 ? null : 50000)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
            quickPriceMax === 50000
              ? "bg-neutral-900 text-white shadow-2xs"
              : "bg-neutral-100/90 hover:bg-neutral-200/80 text-neutral-700 hover:text-black border border-transparent"
          }`}
        >
          {quickPriceMax === 50000 && <Check className="w-3 h-3 stroke-[3]" />}
          <span>Under LKR 50,000</span>
        </button>
      )}

      {/* 6. Apple */}
      {hasApple && (
        <button
          type="button"
          onClick={() => onToggleBrand("Apple")}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
            isAppleSelected
              ? "bg-neutral-900 text-white shadow-2xs"
              : "bg-neutral-100/90 hover:bg-neutral-200/80 text-neutral-700 hover:text-black border border-transparent"
          }`}
        >
          {isAppleSelected && <Check className="w-3 h-3 stroke-[3]" />}
          <span>Apple</span>
        </button>
      )}

      {/* 7. Samsung */}
      {hasSamsung && (
        <button
          type="button"
          onClick={() => onToggleBrand("Samsung")}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
            isSamsungSelected
              ? "bg-neutral-900 text-white shadow-2xs"
              : "bg-neutral-100/90 hover:bg-neutral-200/80 text-neutral-700 hover:text-black border border-transparent"
          }`}
        >
          {isSamsungSelected && <Check className="w-3 h-3 stroke-[3]" />}
          <span>Samsung</span>
        </button>
      )}

    </div>
  );
}
