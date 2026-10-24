"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brand } from "@/lib/types";
import { DEFAULT_BRANDS } from "@/lib/data";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";

type Tab = "phones" | "laptops" | "accessories";

interface ShopByBrandShowcaseProps {
  brands?: Brand[];
  selectedBrands: string[];
  onBrandToggle: (brandName: string) => void;
  onClearBrands?: () => void;
}

function BrandFilterCard({
  brand,
  isSelected,
  onToggle,
  index,
}: {
  brand: Brand;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
      className={`group relative flex flex-col items-center justify-center p-3.5 sm:p-5 rounded-2xl border text-center transition-all duration-250 cursor-pointer select-none outline-none min-h-[120px] sm:min-h-[135px] ${
        isSelected
          ? "border-black bg-neutral-900 text-white shadow-md ring-2 ring-black ring-offset-2 scale-[1.02]"
          : "border-neutral-200/90 bg-white hover:border-neutral-400 hover:shadow-xs text-neutral-800 hover:bg-neutral-50/80"
      }`}
    >
      {/* Selected Indicator Badge */}
      {isSelected && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-black shadow-xs">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      )}

      {/* Brand Logo Container */}
      <div className="h-12 sm:h-16 w-full flex items-center justify-center mb-2 p-1 overflow-hidden">
        {!imgError && (brand.logo_url || (brand as any).logo || (brand as any).image_url) ? (
          <img
            src={brand.logo_url || (brand as any).logo || (brand as any).image_url}
            alt={brand.logo_alt_text || `${brand.name} logo`}
            className={`max-h-full max-w-full w-auto h-auto object-contain transition-all duration-300 ease-out ${
              isSelected
                ? "brightness-0 invert scale-105"
                : "opacity-90 group-hover:opacity-100 group-hover:scale-105"
            }`}
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className={`text-lg sm:text-2xl font-black font-mono tracking-tight ${
              isSelected ? "text-white" : "text-black"
            }`}
          >
            {brand.name.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>

      {/* Brand Label */}
      <span
        className={`text-xs sm:text-[13px] font-bold truncate max-w-full transition-colors ${
          isSelected ? "text-white" : "text-neutral-700 group-hover:text-black"
        }`}
      >
        {brand.name}
      </span>
    </motion.button>
  );
}

export default function ShopByBrandShowcase({
  brands = [],
  selectedBrands = [],
  onBrandToggle,
  onClearBrands,
}: ShopByBrandShowcaseProps) {
  const [activeTab, setActiveTab] = useState<Tab>("phones");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sourceBrands = useMemo(() => {
    const brandMap = new Map<string, Brand>();
    (brands && brands.length > 0 ? brands : DEFAULT_BRANDS).forEach((b) => {
      if (
        b.isDeleted === true ||
        (b as any).status === "deleted" ||
        b.status === "inactive" ||
        !b.name ||
        b.name === "undefined"
      ) {
        return;
      }
      const normKey = b.name.toLowerCase().trim() || b.slug.toLowerCase();
      if (!brandMap.has(normKey)) {
        brandMap.set(normKey, b);
      }
    });
    return Array.from(brandMap.values());
  }, [brands]);

  const visibleBrands = useMemo(() => {
    return sourceBrands
      .filter((b) => b.show_on_homepage !== false && b.status !== "inactive" && b.enabled !== false)
      .filter((b) => {
        const group = (b.product_group || "smartphones") as string;
        if (activeTab === "phones") return group === "smartphones" || group === "phones";
        if (activeTab === "laptops") return group === "laptops";
        if (activeTab === "accessories") return group === "accessories" || group === "audio" || group === "other";
        return true;
      })
      .sort((a, b) => {
        const orderA = Number(a.sort_order ?? a.order ?? 999);
        const orderB = Number(b.sort_order ?? b.order ?? 999);
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [sourceBrands, activeTab]);

  return (
    <section className="bg-neutral-50/70 border-b border-neutral-200/80 transition-all duration-300">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 sm:py-10">
        
        {/* Header Title & Subtitle + Collapse Toggle */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 mb-6">
          <div className="text-center sm:text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-200/70 text-[10px] font-black uppercase tracking-wider text-neutral-700">
              Official Brands
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#090909] tracking-tight">
              Shop by Brand
            </h2>
            <p className="text-neutral-500 text-xs sm:text-sm font-medium max-w-xl">
              Browse our full lineup of genuine products from top global manufacturers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedBrands.length > 0 && onClearBrands && (
              <button
                type="button"
                onClick={onClearBrands}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-xs font-bold text-neutral-700 hover:border-black hover:text-black transition-colors shadow-2xs"
              >
                <X className="w-3.5 h-3.5" />
                Clear Brand Filter ({selectedBrands.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-xs font-bold text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors shadow-2xs"
            >
              <span>{isCollapsed ? "Show Brands" : "Hide Brands"}</span>
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {/* Tab Switcher */}
              <div className="flex justify-center sm:justify-start mb-6">
                <div className="inline-flex items-center p-1 rounded-full bg-white border border-neutral-200/90 shadow-2xs relative">
                  {(["phones", "laptops", "accessories"] as Tab[]).map((t) => {
                    const isActive = activeTab === t;
                    const label =
                      t === "phones"
                        ? "Phones"
                        : t === "laptops"
                        ? "Laptop & Tab"
                        : "Accessories";

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveTab(t)}
                        className={`relative px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 z-10 ${
                          isActive ? "text-white" : "text-neutral-600 hover:text-black"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="shop-brand-tab-pill"
                            className="absolute inset-0 bg-black rounded-full shadow-xs -z-10"
                            transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brand Grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 sm:gap-3.5"
                >
                  {visibleBrands.map((brand, i) => {
                    const isSelected = selectedBrands.some(
                      (sb) =>
                        sb.toLowerCase() === brand.name.toLowerCase() ||
                        sb.toLowerCase() === (brand.slug || "").toLowerCase()
                    );

                    return (
                      <BrandFilterCard
                        key={brand.id || brand.slug || i}
                        brand={brand}
                        isSelected={isSelected}
                        onToggle={() => onBrandToggle(brand.name)}
                        index={i}
                      />
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
