"use client";

import React, { useState, useMemo } from "react";
import { Product, ProductVariantCombo } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { db } from "@/lib/admin-firebase";
import { doc, writeBatch } from "firebase/firestore";
import {
  getProductCategory,
  getProductBrand,
  sanitizeCategoriesList,
  sanitizeBrandsList,
  isPhoneSegment,
  isLaptopTabletSegment,
  isAccessorySegment,
  STANDARD_CATEGORIES,
  STANDARD_BRANDS,
} from "@/lib/catalog-utils";
import {
  X,
  Tag,
  Percent,
  DollarSign,
  RotateCcw,
  CircleCheck as Sparkles,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  Calculator,
  GitFork,
  ShieldCheck,
  Smartphone,
  Laptop,
  Headphones,
} from "lucide-react";

interface BulkOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: string[];
  brands: string[];
  initialCategory?: string;
  initialBrand?: string;
  initialSelectedIds?: string[];
  onSuccess?: () => void;
}

type DiscountType = "percentage" | "fixed_discount" | "fixed_price" | "reset";
export type ScopeType =
  | "brand_accessories" // Brand + Accessories 🎧
  | "brand_phones"      // Brand + Phones 📱
  | "brand_laptops"     // Brand + Laptops & Tablets 💻📱
  | "category_brand"    // Brand + Any Category 🏷️
  | "brand_only"        // Brand Only 🏢
  | "category_only"     // Category Only 📁
  | "selected"          // Selected Products ✅
  | "all";              // All Products 🌐

export default function BulkOfferModal({
  isOpen,
  onClose,
  products,
  categories,
  brands,
  initialCategory = "",
  initialBrand = "",
  initialSelectedIds = [],
  onSuccess,
}: BulkOfferModalProps) {
  // Targeting Scope
  const [scope, setScope] = useState<ScopeType>(
    initialSelectedIds.length > 0
      ? "selected"
      : initialBrand && initialCategory
      ? "brand_accessories"
      : initialBrand
      ? "brand_only"
      : initialCategory
      ? "category_only"
      : "brand_accessories"
  );

  const [targetCategory, setTargetCategory] = useState<string>(initialCategory);
  const [targetBrand, setTargetBrand] = useState<string>(initialBrand);

  // 1. Sanitized, pure category list (Zero brands included)
  const cleanCategories = useMemo(() => {
    const fromProducts = products.map((p) => getProductCategory(p));
    return sanitizeCategoriesList([...(categories || []), ...fromProducts]);
  }, [categories, products]);

  // 2. Sanitized, pure brand list (Zero categories included)
  const cleanBrands = useMemo(() => {
    const fromProducts = products.map((p) => getProductBrand(p));
    return sanitizeBrandsList([...(brands || []), ...fromProducts]);
  }, [brands, products]);

  // 3. Segment counts for selected brand
  const brandPhoneCount = useMemo(() => {
    if (!targetBrand) return 0;
    const brandLower = targetBrand.toLowerCase();
    return products.filter((p) => getProductBrand(p).toLowerCase() === brandLower && isPhoneSegment(p)).length;
  }, [targetBrand, products]);

  const brandLaptopTabletCount = useMemo(() => {
    if (!targetBrand) return 0;
    const brandLower = targetBrand.toLowerCase();
    return products.filter((p) => getProductBrand(p).toLowerCase() === brandLower && isLaptopTabletSegment(p)).length;
  }, [targetBrand, products]);

  const brandAccessoryCount = useMemo(() => {
    if (!targetBrand) return 0;
    const brandLower = targetBrand.toLowerCase();
    return products.filter((p) => getProductBrand(p).toLowerCase() === brandLower && isAccessorySegment(p)).length;
  }, [targetBrand, products]);

  // 4. Dynamic Categories for the selected Brand (with item counts)
  const brandCategoriesWithCounts = useMemo(() => {
    if (!targetBrand) return [];
    const brandLower = targetBrand.toLowerCase();
    const map = new Map<string, number>();

    products.forEach((p) => {
      if (getProductBrand(p).toLowerCase() === brandLower) {
        if (scope === "brand_accessories" && !isAccessorySegment(p)) return;
        if (scope === "brand_phones" && !isPhoneSegment(p)) return;
        if (scope === "brand_laptops" && !isLaptopTabletSegment(p)) return;

        const cat = getProductCategory(p);
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [targetBrand, products, scope]);

  // Total products for target brand
  const totalBrandProductsCount = useMemo(() => {
    if (!targetBrand) return 0;
    const brandLower = targetBrand.toLowerCase();
    return products.filter((p) => getProductBrand(p).toLowerCase() === brandLower).length;
  }, [targetBrand, products]);

  // Offer Configuration
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [updateVariantsProportionally, setUpdateVariantsProportionally] = useState<boolean>(true);

  // Execution State
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync initial props when opened
  React.useEffect(() => {
    if (isOpen) {
      if (initialSelectedIds && initialSelectedIds.length > 0) {
        setScope("selected");
      } else if (initialCategory && initialBrand) {
        setScope("brand_accessories");
        setTargetCategory(initialCategory);
        setTargetBrand(initialBrand);
      } else if (initialCategory) {
        setScope("category_only");
        setTargetCategory(initialCategory);
      } else if (initialBrand) {
        setScope("brand_only");
        setTargetBrand(initialBrand);
      }
      setDiscountValue(0);
      setStatusMessage(null);
    }
  }, [isOpen, initialCategory, initialBrand, initialSelectedIds]);

  // Filter matched products based on scope
  const targetProducts = useMemo(() => {
    return products.filter((p) => {
      if (scope === "selected") {
        return initialSelectedIds.includes(p.id);
      }
      if (scope === "all") {
        return true;
      }
      const pCat = getProductCategory(p).toLowerCase();
      const pBrand = getProductBrand(p).toLowerCase();
      const brandMatch = targetBrand ? pBrand === targetBrand.toLowerCase() : true;

      // 1. BRAND + ACCESSORIES 🎧
      if (scope === "brand_accessories") {
        if (!brandMatch) return false;
        if (!isAccessorySegment(p)) return false;
        return targetCategory ? pCat === targetCategory.toLowerCase() : true;
      }

      // 2. BRAND + PHONES 📱
      if (scope === "brand_phones") {
        if (!brandMatch) return false;
        if (!isPhoneSegment(p)) return false;
        return targetCategory ? pCat === targetCategory.toLowerCase() : true;
      }

      // 3. BRAND + LAPTOPS & TABLETS 💻📱
      if (scope === "brand_laptops") {
        if (!brandMatch) return false;
        if (!isLaptopTabletSegment(p)) return false;
        return targetCategory ? pCat === targetCategory.toLowerCase() : true;
      }

      // 4. BRAND + ANY CATEGORY 🏷️
      if (scope === "category_brand") {
        const catMatch = targetCategory ? pCat === targetCategory.toLowerCase() : true;
        return brandMatch && catMatch;
      }

      // 5. BRAND ONLY 🏢
      if (scope === "brand_only") {
        return brandMatch;
      }

      // 6. CATEGORY ONLY 📁
      if (scope === "category_only") {
        return targetCategory ? pCat === targetCategory.toLowerCase() : true;
      }

      return false;
    });
  }, [products, scope, initialSelectedIds, targetCategory, targetBrand]);

  // Price Calculation Preview Function (Always strictly calculated from permanent Old Price / Original MRP)
  const calculateNewPricing = (product: Product) => {
    const currentPrice = Number(product.price) || 0;
    // The permanent fixed base price is the existing old_price if set, or product.price
    const fixedOriginalPrice = (Number(product.old_price) && Number(product.old_price) > 0)
      ? Number(product.old_price)
      : currentPrice;

    if (discountType === "reset") {
      // Restore original base price as main selling price and remove discount badge
      return {
        price: fixedOriginalPrice,
        old_price: null,
        discountPercent: 0,
        fixedOriginalPrice,
      };
    }

    let newPrice = fixedOriginalPrice;
    let oldPrice: number | null = fixedOriginalPrice;

    if (discountType === "percentage") {
      const pct = Math.min(99, Math.max(0, Number(discountValue) || 0));
      newPrice = Math.round(fixedOriginalPrice * (1 - pct / 100));
    } else if (discountType === "fixed_discount") {
      const discountAmount = Math.max(0, Number(discountValue) || 0);
      newPrice = Math.max(0, fixedOriginalPrice - discountAmount);
    } else if (discountType === "fixed_price") {
      newPrice = Math.max(0, Number(discountValue) || 0);
    }

    // Ensure valid prices: if discount doesn't lower the price, no strike-through badge
    if (newPrice >= fixedOriginalPrice) {
      oldPrice = null;
    } else {
      oldPrice = fixedOriginalPrice;
    }

    const discountPercent = oldPrice && oldPrice > newPrice
      ? Math.round(((oldPrice - newPrice) / oldPrice) * 100)
      : 0;

    return {
      price: newPrice,
      old_price: oldPrice,
      discountPercent,
      fixedOriginalPrice,
    };
  };

  // Execute Batch Firestore Offer Application
  const handleApplyOffer = async () => {
    if (targetProducts.length === 0) {
      alert("No products match the selected targeting criteria.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to apply this offer to ${targetProducts.length} product(s)?\nScope: ${scope.toUpperCase()}`
      )
    ) {
      return;
    }

    try {
      setIsApplying(true);
      setStatusMessage(null);

      // Process in batches of 400 (Firestore max is 500)
      const batchSize = 400;
      let totalUpdated = 0;

      for (let i = 0; i < targetProducts.length; i += batchSize) {
        const batchChunk = targetProducts.slice(i, i + batchSize);
        const batch = writeBatch(db);

        batchChunk.forEach((product) => {
          const { price: newPrice, old_price: newOldPrice } = calculateNewPricing(product);

          const updatePayload: Record<string, any> = {
            price: newPrice,
            old_price: newOldPrice,
            updated_at: new Date().toISOString(),
          };

          // If product has variant combos and proportional update is enabled
          if (updateVariantsProportionally && product.has_variants && product.variant_combos && product.variant_combos.length > 0) {
            const productFixedBase = (Number(product.old_price) && Number(product.old_price) > 0)
              ? Number(product.old_price)
              : Number(product.price) || 1;

            const updatedCombos = product.variant_combos.map((combo: ProductVariantCombo) => {
              const comboCurrentPrice = Number(combo.price) || productFixedBase;
              // Permanent fixed combo price is combo.old_price if set, or combo.price
              const comboFixedOriginal = (Number(combo.old_price) && Number(combo.old_price) > 0)
                ? Number(combo.old_price)
                : comboCurrentPrice;

              if (discountType === "reset") {
                return {
                  ...combo,
                  price: comboFixedOriginal,
                  old_price: null,
                };
              }

              let updatedComboPrice = comboFixedOriginal;
              let updatedComboOldPrice: number | null = comboFixedOriginal;

              if (discountType === "percentage") {
                const pct = Math.min(99, Math.max(0, Number(discountValue) || 0));
                updatedComboPrice = Math.round(comboFixedOriginal * (1 - pct / 100));
                updatedComboOldPrice = comboFixedOriginal;
              } else if (discountType === "fixed_discount") {
                const discountAmount = Math.max(0, Number(discountValue) || 0);
                updatedComboPrice = Math.max(0, comboFixedOriginal - discountAmount);
                updatedComboOldPrice = comboFixedOriginal;
              } else if (discountType === "fixed_price") {
                // If variant had price delta, retain proportional ratio from base
                const ratio = comboFixedOriginal / (productFixedBase || 1);
                updatedComboPrice = Math.round((Number(discountValue) || 0) * ratio);
                updatedComboOldPrice = comboFixedOriginal;
              }

              return {
                ...combo,
                price: updatedComboPrice,
                old_price: updatedComboPrice < updatedComboOldPrice ? updatedComboOldPrice : null,
              };
            });

            updatePayload.variant_combos = updatedCombos;
          }

          const docRef = doc(db, "products", product.id);
          batch.update(docRef, updatePayload);
          totalUpdated++;
        });

        await batch.commit();
      }

      setStatusMessage({
        type: "success",
        text: `Successfully updated promotional offers for ${totalUpdated} product(s)!`,
      });

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      console.error("Bulk offer application failed:", err);
      setStatusMessage({
        type: "error",
        text: `Failed to apply offer: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-outfit">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-8 text-white">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-red-950/50 via-slate-900 to-amber-950/40 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <Tag className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Brand &amp; Accessories Offer Manager
              </h3>
              <p className="text-xs text-white/50">
                Apply bulk promotional discounts: Select Brand First &nbsp;➔&nbsp; Select Category / Accessories Second
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* ── STEP 1: TARGETING SCOPE & INTERACTIVE ROOT MAP ── */}
          <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Layers className="w-4 h-4" /> 1. Select Targeting Scope &amp; Hierarchy
              </h4>
              <span className="text-[11px] font-bold text-white/50">
                Mode:{" "}
                <strong className="text-amber-400 uppercase">
                  {scope === "brand_accessories"
                    ? "Brand + Accessories 🎧"
                    : scope === "brand_phones"
                    ? "Brand + Phones 📱"
                    : scope === "brand_laptops"
                    ? "Brand + Laptops & Tablets 💻"
                    : scope === "category_brand"
                    ? "Brand + Any Category 🏷️"
                    : scope.replace("_", " + ")}
                </strong>
              </span>
            </div>

            {/* Scope Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "brand_accessories", label: "Brand + Accessories 🎧", badge: "Accessories" },
                { id: "brand_phones", label: "Brand + Phones 📱", badge: "Smartphones" },
                { id: "brand_laptops", label: "Brand + Laptops & Tablets 💻", badge: "Laptops + Tablets" },
                { id: "category_brand", label: "Brand + Category 🏷️", badge: "Custom Combo" },
                { id: "brand_only", label: "Brand Only 🏢", badge: "All Brand Items" },
                { id: "category_only", label: "Category Only 📁", badge: "All Brands" },
                { id: "selected", label: `Selected (${initialSelectedIds.length}) ✅`, badge: "Manual" },
                { id: "all", label: "All Products 🌐", badge: "Full Catalog" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setScope(item.id as ScopeType);
                    setTargetCategory("");
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left flex flex-col justify-between gap-1 ${
                    scope === item.id
                      ? "bg-gradient-to-r from-red-600 to-amber-600 text-white border-red-500 shadow-md shadow-red-600/25 scale-[1.02]"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="font-black text-[12px]">{item.label}</span>
                  <span className={`text-[9px] uppercase tracking-wider font-semibold ${scope === item.id ? "text-amber-200" : "text-white/40"}`}>
                    {item.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* ── INTERACTIVE ROOT MAP / ROADMAP VISUAL FLOW ── */}
            <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-blue-950/40 rounded-2xl border border-amber-500/25 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-400">
                  <GitFork className="w-3.5 h-3.5 text-amber-400 rotate-90" />
                  <span>Targeting Root Map Flow</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  {scope === "brand_phones"
                    ? "Brand ➔ Phones Segment ➔ Target Items"
                    : scope === "brand_laptops"
                    ? "Brand ➔ Laptops & Tablets Segment ➔ Target Items"
                    : scope === "brand_accessories"
                    ? "Brand ➔ Accessories Segment ➔ Target Items"
                    : "Brand ➔ Category / Accessories ➔ Target Items"}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Node 1: Root Brand */}
                <div className={`flex-1 min-w-[130px] p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                  scope === "category_only"
                    ? "opacity-40 bg-white/5 border-white/10 text-white/40"
                    : targetBrand
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm shadow-amber-500/15"
                    : "bg-white/5 border-amber-500/30 text-amber-400/80 animate-pulse"
                }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    targetBrand ? "bg-amber-500 text-black font-black" : "bg-white/10 text-white/40"
                  }`}>
                    1
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Step 1: Root Brand</p>
                    <p className="text-xs font-black truncate">
                      {scope === "category_only" ? "All Brands" : targetBrand ? `🏷️ ${targetBrand}` : "Select Brand..."}
                    </p>
                  </div>
                  {targetBrand && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>

                {/* Connecting Arrow 1 */}
                <div className="hidden sm:flex items-center text-white/30 shrink-0">
                  <ArrowRight className="w-4 h-4 text-amber-400/70" />
                </div>

                {/* Node 2: Segment / Category Branch */}
                <div className={`flex-1 min-w-[130px] p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                  scope === "brand_only"
                    ? "opacity-50 bg-white/5 border-white/10 text-white/50"
                    : targetCategory || (targetBrand && (scope === "brand_phones" || scope === "brand_laptops" || scope === "brand_accessories"))
                    ? "bg-blue-500/15 border-blue-500/50 text-blue-200 shadow-sm shadow-blue-500/15"
                    : "bg-white/5 border-white/10 text-white/40"
                }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    targetCategory || (targetBrand && (scope === "brand_phones" || scope === "brand_laptops" || scope === "brand_accessories"))
                      ? "bg-blue-500 text-white font-black"
                      : "bg-white/10 text-white/40"
                  }`}>
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                      {scope === "brand_phones"
                        ? "Step 2: Phone Models"
                        : scope === "brand_laptops"
                        ? "Step 2: Laptops & Tablets Models"
                        : scope === "brand_accessories"
                        ? "Step 2: Accessories Segment"
                        : "Step 2: Category / Accessories"}
                    </p>
                    <p className="text-xs font-black truncate">
                      {scope === "brand_only"
                        ? "All Devices & Accessories"
                        : scope === "brand_phones"
                        ? targetCategory
                          ? `📱 ${targetCategory}`
                          : targetBrand
                          ? `📱 All ${targetBrand} Phones`
                          : "Smartphones & Feature Phones"
                        : scope === "brand_laptops"
                        ? targetCategory
                          ? `💻 ${targetCategory}`
                          : targetBrand
                          ? `💻 All ${targetBrand} Laptops & Tablets`
                          : "Laptops, MacBooks & Tablets"
                        : scope === "brand_accessories"
                        ? targetCategory
                          ? `🎧 ${targetCategory}`
                          : targetBrand
                          ? `🎧 All ${targetBrand} Accessories`
                          : "All Brand Accessories"
                        : targetCategory
                        ? `📁 ${targetCategory}`
                        : targetBrand
                        ? `📁 All ${targetBrand} Items`
                        : "Select Category..."}
                    </p>
                  </div>
                  {(targetCategory || (targetBrand && (scope === "brand_phones" || scope === "brand_laptops" || scope === "brand_accessories"))) && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>

                {/* Connecting Arrow 2 */}
                <div className="hidden sm:flex items-center text-white/30 shrink-0">
                  <ArrowRight className="w-4 h-4 text-emerald-400/70" />
                </div>

                {/* Node 3: Target Result Products */}
                <div className={`flex-1 min-w-[130px] p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                  targetProducts.length > 0
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200 shadow-sm shadow-emerald-500/15"
                    : "bg-white/5 border-white/10 text-white/40"
                }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    targetProducts.length > 0 ? "bg-emerald-500 text-black font-black" : "bg-white/10 text-white/40"
                  }`}>
                    3
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Step 3: Targeted Items</p>
                    <p className="text-xs font-black truncate text-emerald-400">
                      {targetProducts.length > 0 ? `📦 ${targetProducts.length} Product(s)` : "0 Matched"}
                    </p>
                  </div>
                  {targetProducts.length > 0 && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
                </div>
              </div>
            </div>

            {/* Dynamic Selectors depending on scope (Brand FIRST, Category/Segment SECOND) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* 1. SELECT BRAND FIRST */}
              {(scope === "brand_accessories" ||
                scope === "brand_phones" ||
                scope === "brand_laptops" ||
                scope === "category_brand" ||
                scope === "brand_only") && (
                <div>
                  <label className="text-[11px] font-bold text-amber-400 block mb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-black inline-flex items-center justify-center">1</span>
                    <span>
                      {scope === "brand_phones"
                        ? "Step 1: Select Phone Brand"
                        : scope === "brand_laptops"
                        ? "Step 1: Select Laptop / Tablet Brand"
                        : scope === "brand_accessories"
                        ? "Step 1: Select Accessory Brand"
                        : "Step 1: Select Target Brand"}
                    </span>
                  </label>
                  <select
                    value={targetBrand}
                    onChange={(e) => {
                      setTargetBrand(e.target.value);
                      setTargetCategory("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
                  >
                    <option value="">-- Choose Brand --</option>
                    {cleanBrands.map((b) => (
                      <option key={b} value={b}>🏷️ {b}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2. SELECT CATEGORY / SEGMENT SECOND */}
              {(scope === "brand_accessories" ||
                scope === "brand_phones" ||
                scope === "brand_laptops" ||
                scope === "category_brand" ||
                scope === "category_only") && (
                <div>
                  <label className="text-[11px] font-bold text-blue-400 block mb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-black inline-flex items-center justify-center">
                      {scope === "category_only" ? "1" : "2"}
                    </span>
                    <span>
                      {scope === "brand_phones"
                        ? "Step 2: Filter Phone Types / Models"
                        : scope === "brand_laptops"
                        ? "Step 2: Filter Laptop & Tablet Types / Models"
                        : scope === "brand_accessories"
                        ? "Step 2: Select Accessories Category"
                        : "Step 2: Select Category / Accessories"}
                    </span>
                  </label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-blue-500/40 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-400 cursor-pointer shadow-sm"
                  >
                    {/* A. Brand + Phones Scope */}
                    {scope === "brand_phones" && targetBrand ? (
                      <>
                        <option value="">📱 All {targetBrand} Phones &amp; Smartphones ({brandPhoneCount} items)</option>
                        <option value="Smartphones">📱 Smartphones Only</option>
                        <option value="Feature Phones">📱 Feature Phones Only</option>
                      </>
                    ) : scope === "brand_phones" ? (
                      <>
                        <option value="">📱 All Phones &amp; Smartphones</option>
                        <option value="Smartphones">📱 Smartphones Only</option>
                        <option value="Feature Phones">📱 Feature Phones Only</option>
                      </>
                    ) : scope === "brand_laptops" && targetBrand ? (
                      /* B. Brand + Laptops & Tablets Scope */
                      <>
                        <option value="">💻 All {targetBrand} Laptops, MacBooks &amp; Tablets ({brandLaptopTabletCount} items)</option>
                        <option value="Laptops & MacBooks">💻 Laptops &amp; MacBooks Only</option>
                        <option value="Tablets & iPads">📱 Tablets &amp; iPads Only</option>
                      </>
                    ) : scope === "brand_laptops" ? (
                      <>
                        <option value="">💻 All Laptops, MacBooks &amp; Tablets</option>
                        <option value="Laptops & MacBooks">💻 Laptops &amp; MacBooks Only</option>
                        <option value="Tablets & iPads">📱 Tablets &amp; iPads Only</option>
                      </>
                    ) : scope === "brand_accessories" && targetBrand ? (
                      /* C. Brand + Accessories Scope */
                      <>
                        <option value="">🎧 All {targetBrand} Accessories ({brandAccessoryCount} items)</option>
                        {brandCategoriesWithCounts.length > 0 && (
                          <optgroup label={`Available Accessories for ${targetBrand}`}>
                            {brandCategoriesWithCounts.map(({ name, count }) => (
                              <option key={name} value={name}>🎧 {name} ({count} items)</option>
                            ))}
                          </optgroup>
                        )}
                        {cleanCategories
                          .filter((c) => !brandCategoriesWithCounts.some((bc) => bc.name === c) && c !== "Smartphones" && c !== "Feature Phones" && c !== "Laptops & MacBooks")
                          .length > 0 && (
                          <optgroup label="Other Accessory Categories">
                            {cleanCategories
                              .filter((c) => !brandCategoriesWithCounts.some((bc) => bc.name === c) && c !== "Smartphones" && c !== "Feature Phones" && c !== "Laptops & MacBooks")
                              .map((c) => (
                                <option key={c} value={c}>🎧 {c} (0 items)</option>
                              ))}
                          </optgroup>
                        )}
                      </>
                    ) : scope === "category_brand" && targetBrand ? (
                      /* D. Brand + Any Category Scope */
                      <>
                        <option value="">📁 All {targetBrand} Categories ({totalBrandProductsCount} items)</option>
                        {brandCategoriesWithCounts.length > 0 && (
                          <optgroup label={`Available for ${targetBrand}`}>
                            {brandCategoriesWithCounts.map(({ name, count }) => (
                              <option key={name} value={name}>📁 {name} ({count} items)</option>
                            ))}
                          </optgroup>
                        )}
                        {cleanCategories.filter((c) => !brandCategoriesWithCounts.some((bc) => bc.name === c)).length > 0 && (
                          <optgroup label="Other Categories">
                            {cleanCategories
                              .filter((c) => !brandCategoriesWithCounts.some((bc) => bc.name === c))
                              .map((c) => (
                                <option key={c} value={c}>📁 {c} (0 items)</option>
                              ))}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      /* General Fallback */
                      <>
                        <option value="">-- Choose Category --</option>
                        {cleanCategories.map((c) => (
                          <option key={c} value={c}>📁 {c}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-white/60 pt-1">
              <span>
                Matching Products: <strong className="text-white">{targetProducts.length} items</strong>
              </span>
              {targetProducts.length === 0 && (
                <span className="text-amber-400 font-bold">No products match current filter.</span>
              )}
            </div>
          </div>

          {/* ── STEP 2: OFFER / DISCOUNT TYPE & VALUE ── */}
          <div className="space-y-4 bg-black/30 p-4 rounded-2xl border border-white/5">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> 2. Discount / Promotional Pricing Rule
            </h4>

            {/* Discount Type Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "percentage", label: "Percentage % OFF", icon: Percent },
                { id: "fixed_discount", label: "Fixed LKR OFF", icon: DollarSign },
                { id: "fixed_price", label: "Set Fixed Price", icon: Tag },
                { id: "reset", label: "Reset / Clear Offer", icon: RotateCcw },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDiscountType(item.id as DiscountType)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      discountType === item.id
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Discount Value Input & Presets */}
            {discountType !== "reset" && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[11px] font-bold text-white/70 block mb-1">
                      {discountType === "percentage"
                        ? "Discount Percentage (%):"
                        : discountType === "fixed_discount"
                        ? "Discount Amount (LKR):"
                        : "Promotional Selling Price (LKR):"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={discountType === "percentage" ? 99 : 10000000}
                        value={discountValue === 0 ? "" : discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-white/20 rounded-xl text-base font-black text-white focus:outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">
                        {discountType === "percentage" ? "%" : "LKR"}
                      </span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <label className="text-[11px] font-bold text-white/50 block mb-1">Quick Presets</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {discountType === "percentage" &&
                        [5, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDiscountValue(pct)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/80 hover:text-amber-300 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
                          >
                            {pct}%
                          </button>
                        ))}

                      {discountType === "fixed_discount" &&
                        [1000, 2500, 5000, 10000, 20000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setDiscountValue(amt)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/80 hover:text-amber-300 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
                          >
                            -LKR {amt.toLocaleString()}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Fixed Base Price Protection Guarantee Banner */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-amber-300">Original Fixed Price (MRP / Old Price) Protection Active</p>
                    <p className="text-[11px] text-white/70 mt-0.5 leading-relaxed">
                      Discounts are always deducted from each product's permanent original Old Price (e.g. LKR 8,000). Changing discounts from 10% to 20% or clearing an offer will always re-calculate cleanly from LKR 8,000 without reducing or losing your base price.
                    </p>
                  </div>
                </div>

                {/* Calculation Options */}
                <div className="flex items-center gap-4 flex-wrap pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                    <input
                      type="checkbox"
                      checked={updateVariantsProportionally}
                      onChange={(e) => setUpdateVariantsProportionally(e.target.checked)}
                      className="rounded bg-zinc-900 border-white/20 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Also update internal Variant Combo Prices proportionally from their original base prices</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ── STEP 3: LIVE PREVIEW OF FIRST 5 PRODUCTS ── */}
          {targetProducts.length > 0 && (
            <div className="space-y-2 bg-black/20 p-4 rounded-2xl border border-white/5">
              <h4 className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center justify-between">
                <span>3. Live Price Preview (First {Math.min(5, targetProducts.length)} products)</span>
                <span className="text-amber-400 font-normal">Total targeted: {targetProducts.length} items</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 text-[10px] uppercase font-semibold">
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3">Fixed Base Price (MRP)</th>
                      <th className="py-2 px-3">Current Price</th>
                      <th className="py-2 px-3">New Selling Price</th>
                      <th className="py-2 px-3">Applied Offer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {targetProducts.slice(0, 5).map((p) => {
                      const calculated = calculateNewPricing(p);
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-bold text-white max-w-[220px] truncate">
                            {p.name}
                          </td>
                          <td className="py-2 px-3 font-bold text-amber-300">
                            {formatPrice(calculated.fixedOriginalPrice)}
                          </td>
                          <td className="py-2 px-3 text-white/50">
                            {formatPrice(p.price)}
                          </td>
                          <td className="py-2 px-3 font-black text-emerald-400">
                            {formatPrice(calculated.price)}
                          </td>
                          <td className="py-2 px-3">
                            {calculated.discountPercent > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 font-black text-[10px]">
                                -{calculated.discountPercent}% OFF (from {formatPrice(calculated.fixedOriginalPrice)})
                              </span>
                            ) : (
                              <span className="text-white/40 text-[10px] font-bold">Regular (No Discount)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-white/10">
          <div className="text-xs text-white/50">
            {targetProducts.length > 0 ? (
              <span>
                Ready to update <strong>{targetProducts.length} product(s)</strong>.
              </span>
            ) : (
              <span className="text-amber-400">Select matching category/brand to apply offer.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplyOffer}
              disabled={isApplying || targetProducts.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              {isApplying ? (
                <>Applying Bulk Campaign...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Offer to {targetProducts.length} Items</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
