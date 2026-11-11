"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ShoppingBag, Eye, Heart, Check } from "lucide-react";
import { Product, NewArrivalsSettings } from "@/lib/types";
import { getProducts, getNewArrivalsSettings } from "@/lib/firestore-client";
import { DEFAULT_NEW_ARRIVALS_SETTINGS } from "@/lib/data";
import { formatPrice, announceToScreenReader, normalizeImageUrl } from "@/lib/utils";
import { useWishlist } from "@/lib/wishlist-context";
import { usePurchaseGuard } from "@/lib/use-purchase-guard";
import QuickViewModal from "@/components/ui/QuickViewModal";
import ScrollReveal from "@/components/ui/ScrollReveal";
import NewArrivalsGridBanner from "./NewArrivalsGridBanner";

export default function NewArrivalsSection({
  initialProducts,
  initialSettings,
}: {
  initialProducts?: Product[];
  initialSettings?: NewArrivalsSettings | null;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [settings, setSettings] = useState<NewArrivalsSettings>(
    initialSettings || DEFAULT_NEW_ARRIVALS_SETTINGS
  );
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  const { handleAuthenticatedPurchase } = usePurchaseGuard();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Load products if initialProducts not supplied
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      getProducts().then((res) => {
        if (res && res.length > 0) setProducts(res);
      });
    }
  }, [initialProducts]);

  // Load settings if initialSettings not supplied
  useEffect(() => {
    if (!initialSettings) {
      getNewArrivalsSettings()
        .then((data) => {
          if (data) {
            setSettings({
              ...DEFAULT_NEW_ARRIVALS_SETTINGS,
              ...data,
              custom_product_ids: Array.isArray(data.custom_product_ids)
                ? data.custom_product_ids
                : [],
            });
          }
        })
        .catch(() => {});
    }
  }, [initialSettings]);

  // Compute New Arrivals list:
  const newArrivalProducts = useMemo(() => {
    const activeProducts = products.filter(
      (p) => p.status !== "draft" && p.status !== "inactive"
    );
    const limitCount =
      settings.display_count && settings.display_count > 0
        ? settings.display_count
        : 8;

    if (
      settings.mode === "custom" &&
      settings.custom_product_ids &&
      settings.custom_product_ids.length > 0
    ) {
      const map = new Map(activeProducts.map((p) => [p.id, p]));
      const curated = settings.custom_product_ids
        .map((id) => map.get(id))
        .filter((p): p is Product => Boolean(p));

      if (curated.length > 0) {
        return curated.slice(0, limitCount);
      }
    }

    // Automatic Mode Fallback
    const markedNew = activeProducts.filter((p) => p.is_new_arrival === true);

    if (markedNew.length >= limitCount) {
      return markedNew.slice(0, limitCount);
    }

    // Sort by created_at descending if not enough manually marked products
    const sortedLatest = [...activeProducts].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    // Merge markedNew and latest products ensuring uniqueness
    const merged = Array.from(new Set([...markedNew, ...sortedLatest]));
    return merged.slice(0, limitCount);
  }, [products, settings]);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();

    handleAuthenticatedPurchase({
      action: "add-to-cart",
      product,
      onSuccess: () => {
        setAddedMap((prev) => ({ ...prev, [product.id]: true }));
        announceToScreenReader(`${product.name} added to bag.`);
        setTimeout(() => {
          setAddedMap((prev) => ({ ...prev, [product.id]: false }));
        }, 2000);
      },
    });
  };

  if (settings.enabled === false) {
    return null;
  }

  return (
    <>
      <ScrollReveal
        as="section"
        id="new-arrivals"
        aria-label="New Arrivals"
        stagger={0.06}
        yOffset={18}
        className="py-6 sm:py-12 md:py-16 bg-[#FAFAFA] border-b border-neutral-100 font-sans select-none overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Section Header: Single Canonical H2 */}
          <div data-reveal-item className="mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-[#090909] tracking-tight">
              {settings.section_title || "New Arrivals"}
            </h2>
            <p className="text-neutral-500 text-xs sm:text-base mt-0.5 sm:mt-1 font-medium">
              {settings.section_subtitle ||
                "Explore the latest premium devices and lifestyle electronics at 1PLACE.LK."}
            </p>
          </div>

          {/* Unified Responsive Products Container:
              On mobile (< md): Smooth native horizontal touch snap rail
              On desktop (>= md): Elegant multi-column product grid with banner */}
          <div
            data-reveal-item
            className="flex md:grid overflow-x-auto md:overflow-visible scrollbar-none snap-x snap-mandatory md:snap-none sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0"
          >
            {newArrivalProducts.map((product, idx) => {
              const isWishlisted = isInWishlist(product.id);
              const isOutOfStock = product.stock_status === "out_of_stock";

              const hasDiscount =
                Boolean(product.old_price) &&
                typeof product.old_price === "number" &&
                typeof product.price === "number" &&
                product.old_price > product.price &&
                Math.round(
                  ((product.old_price - product.price) / product.old_price) * 100
                ) > 0;

              const discountPercent = hasDiscount
                ? Math.round(
                    ((product.old_price! - product.price) / product.old_price!) *
                      100
                  )
                : 0;

              const mainImage = normalizeImageUrl(
                product.images?.[0] ||
                  product.image ||
                  product.image_url ||
                  "/placeholder-phone.webp"
              );

              return (
                <React.Fragment key={product.id}>
                  {idx === 2 && (
                    <div className="hidden md:block col-span-1">
                      <NewArrivalsGridBanner />
                    </div>
                  )}

                  <div className="w-[45vw] min-w-[155px] max-w-[200px] md:w-auto md:min-w-0 md:max-w-none shrink-0 md:shrink snap-start md:snap-align-none h-full">
                    <div className="group relative bg-white border border-neutral-200/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs md:shadow-xs hover:shadow-md hover:border-black md:hover:-translate-y-1 transition-all duration-300 h-full">
                      {/* Image Section */}
                      <div className="product-image-container relative aspect-square bg-white p-2 sm:p-3 flex items-center justify-center overflow-hidden rounded-t-2xl border-b border-neutral-100/80">
                        {/* Out of Stock Badge */}
                        {isOutOfStock && (
                          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                            <span className="bg-neutral-800 text-white text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              Sold Out
                            </span>
                          </div>
                        )}

                        {/* Discount Badge */}
                        {hasDiscount && (
                          <div className="product-offer-badge absolute bottom-0 left-0 z-10">
                            <span className="bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-tr-lg uppercase tracking-wider shadow-2xs inline-block">
                              -{discountPercent}% OFF
                            </span>
                          </div>
                        )}

                        {/* Quick View & Wishlist Buttons (Desktop) */}
                        <div className="hidden sm:flex absolute bottom-2.5 right-2.5 z-10 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQuickViewProduct(product)}
                            aria-label="Quick View"
                            className="w-8 h-8 rounded-full bg-white/95 backdrop-blur border border-neutral-200 flex items-center justify-center text-neutral-700 hover:scale-110 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Quick View"
                          >
                            <Eye className="w-4 h-4 text-neutral-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleWishlist(product.id)}
                            aria-label="Wishlist"
                            className="w-8 h-8 rounded-full bg-white/95 backdrop-blur border border-neutral-200 flex items-center justify-center text-neutral-700 hover:scale-110 active:scale-95 transition-all shadow-xs cursor-pointer"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isWishlisted
                                  ? "fill-red-500 text-red-500"
                                  : "text-neutral-600"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Product Image Link */}
                        <Link
                          href={`/products/${product.slug}`}
                          className="w-full h-full flex items-center justify-center"
                        >
                          <img
                            src={mainImage}
                            alt={product.name}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/placeholder-phone.webp";
                            }}
                          />
                        </Link>
                      </div>

                      {/* Details Section */}
                      <div className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between bg-white">
                        <div>
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1 truncate">
                            {product.brand_name ||
                              product.brand ||
                              product.category_name ||
                              "1PLACE.LK"}
                          </span>

                          <Link
                            href={`/products/${product.slug}`}
                            className="block"
                          >
                            <h3 className="font-bold text-xs sm:text-sm md:text-base text-[#090909] line-clamp-2 leading-snug group-hover:text-neutral-600 transition-colors min-h-[2rem] sm:min-h-[2.5rem] mb-1.5 sm:mb-2">
                              {product.name}
                            </h3>
                          </Link>

                          {product.warranty && (
                            <span className="hidden sm:block text-[11px] text-neutral-500 font-medium mb-2 truncate">
                              🛡️ {product.warranty}
                            </span>
                          )}
                        </div>

                        {/* Price & Action Button */}
                        <div className="pt-2 sm:pt-3 border-t border-neutral-100 mt-auto">
                          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                            <span className="font-black text-sm sm:text-base md:text-lg text-[#090909]">
                              {formatPrice(product.price)}
                            </span>
                            {hasDiscount && (
                              <span className="text-[11px] sm:text-xs text-neutral-400 line-through font-medium">
                                {formatPrice(product.old_price!)}
                              </span>
                            )}
                          </div>

                          {/* Desktop Action Button */}
                          <div className="hidden sm:block">
                            {isOutOfStock &&
                            (product.productType === "phone" ||
                              (product.category_name || "")
                                .toLowerCase()
                                .includes("phone") ||
                              (product.category_name || "")
                                .toLowerCase()
                                .includes("mobile") ||
                              (product.category_name || "")
                                .toLowerCase()
                                .includes("smartphone") ||
                              (product.category_name || "")
                                .toLowerCase()
                                .includes("laptop") ||
                              (product.name || "")
                                .toLowerCase()
                                .includes("iphone") ||
                              (product.name || "")
                                .toLowerCase()
                                .includes("galaxy") ||
                              Boolean(product.hasStorageVariants)) ? (
                              <Link
                                href={`/products/${product.slug}?book=true`}
                                className="w-full py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                              >
                                <span>Pre-Order / Book</span>
                              </Link>
                            ) : (
                              <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={(e) => handleAddToCart(e, product)}
                                className={`w-full py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-2xs ${
                                  isOutOfStock
                                    ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                    : addedMap[product.id]
                                    ? "bg-emerald-600 text-white"
                                    : "bg-black text-white hover:bg-neutral-800 cursor-pointer"
                                }`}
                              >
                                {addedMap[product.id] ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span>Added</span>
                                  </>
                                ) : isOutOfStock ? (
                                  <span>Sold Out</span>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-4 h-4" />
                                    <span>Add to Bag</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Quick View Modal */}
        <QuickViewModal
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      </ScrollReveal>
    </>
  );
}
