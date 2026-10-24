"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Check, ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";
import { Product } from "@/lib/types";
import { getFrequentlyBoughtTogetherBundle } from "@/lib/recommendation-engine";
import { formatPrice, announceToScreenReader } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { usePurchaseGuard } from "@/lib/use-purchase-guard";

interface FrequentlyBoughtTogetherProps {
  currentProduct: Product;
  allProducts: Product[];
}

export default function FrequentlyBoughtTogether({
  currentProduct,
  allProducts,
}: FrequentlyBoughtTogetherProps) {
  const { addToCart } = useCart();
  const { handleAuthenticatedPurchase, user } = usePurchaseGuard();
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Compute bundle from recommendation engine
  const bundle = useMemo(() => {
    return getFrequentlyBoughtTogetherBundle(currentProduct, allProducts);
  }, [currentProduct, allProducts]);

  // Track checked states: primary is always checked or togglable
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return [currentProduct.id, ...bundle.bundleItems.map((b) => b.id)];
  });

  // Keep selectedIds in sync when product changes
  React.useEffect(() => {
    setSelectedIds([currentProduct.id, ...bundle.bundleItems.map((b) => b.id)]);
    setAddedSuccess(false);
  }, [currentProduct.id, bundle.bundleItems]);

  if (!bundle.bundleItems || bundle.bundleItems.length === 0) {
    return null;
  }

  const allBundleProducts = [bundle.primary, ...bundle.bundleItems];

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Calculate dynamic bundle totals based on active checkboxes
  const currentSelectedProducts = allBundleProducts.filter((p) => selectedIds.includes(p.id));
  const currentTotalPrice = currentSelectedProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  const currentOriginalPrice = currentSelectedProducts.reduce(
    (sum, p) => sum + (p.old_price && p.old_price > p.price ? p.old_price : p.price || 0),
    0
  );
  const currentSavings = Math.max(0, currentOriginalPrice - currentTotalPrice);

  const handleAddBundleToCart = () => {
    if (currentSelectedProducts.length === 0) return;

    if (!user) {
      handleAuthenticatedPurchase({
        action: "add-to-cart",
        product: currentProduct,
        quantity: 1,
      });
      return;
    }

    currentSelectedProducts.forEach((prod) => {
      addToCart({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        image: prod.images?.[0] || "/placeholder-phone.webp",
        quantity: 1,
      });
    });

    setAddedSuccess(true);
    announceToScreenReader(`${currentSelectedProducts.length} bundle items added to bag.`);

    setTimeout(() => {
      setAddedSuccess(false);
    }, 2500);
  };

  return (
    <div className="my-10 p-6 sm:p-8 bg-gradient-to-br from-neutral-900 via-zinc-900 to-black text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 relative z-10">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-2 border border-amber-400/30">
            <span>FREQUENTLY BOUGHT TOGETHER</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Complete Your Setup &amp; Save
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Pair with genuine compatible accessories for the ultimate out-of-the-box experience.
          </p>
        </div>

        {currentSavings > 0 && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black shrink-0">
            Save {formatPrice(currentSavings)}
          </div>
        )}
      </div>

      {/* ── Visual Product Connectors Row ── */}
      <div className="flex flex-col lg:flex-row items-center gap-6 relative z-10">
        {/* Products Visual Chain */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-start gap-3 sm:gap-4 flex-1">
          {allBundleProducts.map((item, idx) => {
            const isChecked = selectedIds.includes(item.id);
            const isPrimary = idx === 0;
            const mainImg = item.images?.[0] || "/placeholder-phone.webp";

            return (
              <React.Fragment key={item.id}>
                {idx > 0 && (
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 font-black shrink-0 shadow-sm">
                    <Plus className="w-4 h-4" />
                  </div>
                )}

                <div
                  onClick={() => handleToggle(item.id)}
                  className={`flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none max-w-[160px] sm:max-w-[180px] ${
                    isChecked
                      ? "bg-white/10 border-white/30 shadow-lg scale-100"
                      : "bg-white/5 border-white/5 opacity-40 hover:opacity-60 scale-95"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-black/50 p-2 flex items-center justify-center overflow-hidden mb-2 relative">
                    <img
                      src={mainImg}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain mix-blend-screen"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder-phone.webp";
                      }}
                    />
                    {isPrimary && (
                      <span className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                        This Item
                      </span>
                    )}
                  </div>

                  {/* Title & Price */}
                  <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug mb-1">
                    {item.name}
                  </p>
                  <span className="text-xs font-black text-amber-400">
                    {formatPrice(item.price)}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Bundle Buy Action Box ── */}
        <div className="w-full lg:w-72 bg-black/40 border border-white/15 p-5 rounded-2xl flex flex-col justify-between space-y-4 shrink-0 shadow-xl">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
              Bundle Total ({currentSelectedProducts.length} Items)
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-black text-white">
                {formatPrice(currentTotalPrice)}
              </span>
              {currentSavings > 0 && (
                <span className="text-xs text-neutral-400 line-through font-semibold">
                  {formatPrice(currentOriginalPrice)}
                </span>
              )}
            </div>
            {currentSavings > 0 && (
              <p className="text-[11px] text-emerald-400 font-bold mt-1">
                You save {formatPrice(currentSavings)} with this bundle!
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={currentSelectedProducts.length === 0 || addedSuccess}
            onClick={handleAddBundleToCart}
            className={`w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 cursor-pointer ${
              addedSuccess
                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                : currentSelectedProducts.length === 0
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : "bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20 hover:scale-[1.02]"
            }`}
          >
            {addedSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Bundle Added to Bag!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                <span>Add All {currentSelectedProducts.length} Items to Bag</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Checkbox itemized list */}
      <div className="mt-6 pt-5 border-t border-white/10 space-y-2 relative z-10">
        {allBundleProducts.map((item, idx) => {
          const isChecked = selectedIds.includes(item.id);
          const isPrimary = idx === 0;

          return (
            <label
              key={item.id}
              className="flex items-center gap-3 text-xs text-neutral-300 hover:text-white cursor-pointer select-none py-1"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(item.id)}
                className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-amber-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="leading-snug">
                <span className="font-black text-white">
                  {isPrimary ? "This item: " : "Add: "}
                </span>
                <Link
                  href={`/products/${item.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline text-neutral-200"
                >
                  {item.name}
                </Link>
                {" - "}
                <span className="text-amber-400 font-bold">{formatPrice(item.price)}</span>
                {item.warranty && (
                  <span className="text-[10px] text-neutral-400 ml-2">
                    🛡️ {item.warranty}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
