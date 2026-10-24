"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Package, RefreshCw, ArrowRight, Check } from "lucide-react";
import ProductCard from "@/components/products/ProductCard";
import TodayDealSection from "@/components/home/today-deal-section";
import VisualProductShowcase from "@/components/home/visual-product-showcase";
import { Product, Category, TodayDealSettings, VisualShowcaseSettings, VisualShowcaseSlide } from "@/lib/types";
import { collection, doc, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeProduct, deduplicateProductsBySlug } from "@/lib/firestore-client";
import { DEFAULT_SHOWCASE_SETTINGS } from "@/lib/data";

interface ShopAllProductsSectionProps {
  initialProducts?: Product[];
  categories?: Category[];
  todayDealSettings?: TodayDealSettings | null;
  showcaseSettings?: VisualShowcaseSettings | null;
}

const ITEMS_PER_BATCH = 18; // 3 full rows of 6 cards on desktop

export default function ShopAllProductsSection({
  initialProducts = [],
  todayDealSettings,
  showcaseSettings,
}: ShopAllProductsSectionProps) {
  const [productsList, setProductsList] = useState<Product[]>(() =>
    deduplicateProductsBySlug(initialProducts)
  );
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_BATCH);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [colsCount, setColsCount] = useState<number>(6);
  const [liveShowcaseSettings, setLiveShowcaseSettings] = useState<VisualShowcaseSettings | null>(() => {
    return showcaseSettings || DEFAULT_SHOWCASE_SETTINGS;
  });
  const sectionRef = useRef<HTMLElement>(null);

  // Responsive column detection (2 cols on mobile, 3 sm, 4 md, 5 lg, 6 xl)
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1280) {
        setColsCount(6);
      } else if (w >= 1024) {
        setColsCount(5);
      } else if (w >= 768) {
        setColsCount(4);
      } else if (w >= 640) {
        setColsCount(3);
      } else {
        setColsCount(2);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── 1. Real-Time Products Listener ──
  useEffect(() => {
    try {
      const q = query(collection(db, "products"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveDocs = snapshot.docs.map((d) =>
              normalizeProduct({ ...d.data(), id: d.id } as Product)
            );
            if (liveDocs.length > 0) {
              setProductsList(deduplicateProductsBySlug(liveDocs));
            }
          }
        },
        (err) => {
          console.warn("Firestore onSnapshot error in ShopAllProductsSection:", err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn("Real-time listener setup failed, using server products:", e);
    }
  }, []);

  // ── 2. Real-Time Visual Showcase Settings Listener ──
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, "settings", "visual_product_showcase"), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as VisualShowcaseSettings;
          if (data && data.slides && data.slides.length > 0) {
            setLiveShowcaseSettings(data);
          }
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Could not listen to visual showcase settings:", e);
    }
  }, []);

  // Update if server revalidation provides newer products
  useEffect(() => {
    if (initialProducts.length > 0) {
      setProductsList((prev) => (prev.length === 0 ? deduplicateProductsBySlug(initialProducts) : prev));
    }
  }, [initialProducts]);

  // ── 3. Filter for Valid Published Products (Exclude draft, inactive, archived, deleted) ──
  const publishedProducts = useMemo(() => {
    return productsList.filter((p) => {
      const status = (p.status || "").toLowerCase().trim();
      if (status === "draft" || status === "inactive" || status === "archived" || status === "deleted") {
        return false;
      }
      if ((p as any).is_deleted === true || (p as any).deleted === true) {
        return false;
      }
      return true;
    });
  }, [productsList]);

  // Currently visible products slice (Pagination)
  const displayedProducts = useMemo(() => {
    return publishedProducts.slice(0, visibleCount);
  }, [publishedProducts, visibleCount]);

  // ── 4. Collect Showcase Banners Grouped by Target Product Line ──
  const showcaseBannersByLine = useMemo(() => {
    const activeSettings = liveShowcaseSettings || showcaseSettings || DEFAULT_SHOWCASE_SETTINGS;
    if (!activeSettings || activeSettings.enabled === false) {
      return new Map<number, VisualShowcaseSlide[]>();
    }

    const lineMap = new Map<number, VisualShowcaseSlide[]>();
    const slides = activeSettings.slides || DEFAULT_SHOWCASE_SETTINGS.slides || [];
    const globalPlacement = activeSettings.placement;

    slides.forEach((slide) => {
      if (slide.enabled === false) return;

      const placement = slide.placement || globalPlacement || "below_category";
      let targetLine: number | null = null;

      if (typeof slide.product_line === "number" && slide.product_line > 0) {
        targetLine = slide.product_line;
      } else if (typeof placement === "string" && placement.startsWith("below_product_line_")) {
        const parsed = parseInt(placement.replace("below_product_line_", ""), 10);
        if (!isNaN(parsed) && parsed > 0) {
          targetLine = parsed;
        }
      } else if (placement === "custom_product_line" && typeof slide.product_line === "number") {
        targetLine = slide.product_line;
      }

      if (targetLine !== null) {
        const existing = lineMap.get(targetLine) || [];
        existing.push(slide);
        lineMap.set(targetLine, existing);
      }
    });

    return lineMap;
  }, [liveShowcaseSettings, showcaseSettings]);

  // ── 5. Plan Interleaved Segments (Products + Banners + Today's Deal) ──
  // Lines where elements should be inserted
  const segments = useMemo(() => {
    type Insertion =
      | { type: "showcase"; line: number; slides: VisualShowcaseSlide[] }
      | { type: "today_deal"; line: number };

    const insertions: Insertion[] = [];

    // Add Showcase Banners at their specified lines
    showcaseBannersByLine.forEach((slides, line) => {
      insertions.push({
        type: "showcase",
        line,
        slides,
      });
    });

    // Add Today's Deal banner at line 4 by default (or clean 4 rows on any screen)
    if (todayDealSettings) {
      insertions.push({
        type: "today_deal",
        line: 4,
      });
    }

    // Sort insertions by product line ascending
    insertions.sort((a, b) => a.line - b.line);

    // Build chunks of products split at insertion points
    const result: Array<{
      products: Product[];
      insertionAfter?: Insertion;
    }> = [];

    let lastIndex = 0;

    insertions.forEach((ins) => {
      const cutIndex = ins.line * colsCount;
      if (cutIndex > lastIndex && lastIndex < displayedProducts.length) {
        const slice = displayedProducts.slice(lastIndex, cutIndex);
        result.push({
          products: slice,
          insertionAfter: ins,
        });
        lastIndex = cutIndex;
      } else if (cutIndex <= lastIndex && lastIndex < displayedProducts.length) {
        // If multiple insertions at the exact same line, attach insertion with empty products
        result.push({
          products: [],
          insertionAfter: ins,
        });
      }
    });

    // Add any remaining products after the last insertion
    if (lastIndex < displayedProducts.length) {
      result.push({
        products: displayedProducts.slice(lastIndex),
      });
    }

    // Fallback if no insertions were applied but we have products
    if (result.length === 0 && displayedProducts.length > 0) {
      result.push({
        products: displayedProducts,
      });
    }

    return result;
  }, [displayedProducts, colsCount, showcaseBannersByLine, todayDealSettings]);

  const hasMore = visibleCount < publishedProducts.length;
  const remainingCount = Math.max(0, publishedProducts.length - visibleCount);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + ITEMS_PER_BATCH);
      setIsLoadingMore(false);
    }, 250);
  };

  if (publishedProducts.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="shop-all-products"
      aria-label="Shop All Products"
      className="w-full py-6 sm:py-8 font-sans"
    >
      {/* ── Interleaved Product Grids & Showcase Banners ── */}
      {segments.map((segment, segIdx) => (
        <React.Fragment key={`segment-${segIdx}`}>
          {/* Product Cards Grid Chunk */}
          {segment.products.length > 0 && (
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 lg:gap-4">
                {segment.products.map((product) => (
                  <div key={product.id} className="h-full">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insertion 1: Visual Product Showcase Banner at this Product Line */}
          {segment.insertionAfter?.type === "showcase" && (
            <div className="w-full my-6 sm:my-10">
              <VisualProductShowcase
                settings={liveShowcaseSettings}
                slides={segment.insertionAfter.slides}
              />
            </div>
          )}

          {/* Insertion 2: Today's Deal Promotional Banner */}
          {segment.insertionAfter?.type === "today_deal" && todayDealSettings && (
            <div className="w-full my-8 sm:my-14">
              <TodayDealSection settings={todayDealSettings} />
            </div>
          )}
        </React.Fragment>
      ))}

      {/* ── Empty State if No Products ── */}
      {displayedProducts.length === 0 && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 text-center bg-white border border-[#E8E8E8] rounded-2xl p-8 max-w-md mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#111111] mb-1">No products found</h3>
            <p className="text-xs text-neutral-500 mb-4">
              No products are currently available in the catalogue.
            </p>
          </div>
        </div>
      )}

      {/* ── Progress Bar & Load More Products Section ── */}
      {publishedProducts.length > 0 && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mt-12 sm:mt-16 flex flex-col items-center justify-center max-w-sm sm:max-w-md mx-auto text-center font-sans px-4">
            {/* Progress Header: Showing X of Y products & Percentage */}
            <div className="w-full flex items-center justify-between text-xs sm:text-[13px] font-medium text-neutral-600 mb-2">
              <span>
                Showing <span className="font-bold text-neutral-900">{Math.min(displayedProducts.length, publishedProducts.length)}</span> of <span className="font-bold text-neutral-900">{publishedProducts.length}</span> products
              </span>
              <span className="font-bold text-neutral-900">
                {publishedProducts.length > 0
                  ? Math.min(100, Math.round((Math.min(displayedProducts.length, publishedProducts.length) / publishedProducts.length) * 100))
                  : 100}%
              </span>
            </div>

            {/* Thin Progress Bar with Burgundy Fill */}
            <div className="w-full h-1.5 sm:h-2 bg-neutral-200/90 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-[#64152F] rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${
                    publishedProducts.length > 0
                      ? Math.min(100, Math.round((Math.min(displayedProducts.length, publishedProducts.length) / publishedProducts.length) * 100))
                      : 100
                  }%`,
                }}
                role="progressbar"
                aria-valuenow={
                  publishedProducts.length > 0
                    ? Math.min(100, Math.round((Math.min(displayedProducts.length, publishedProducts.length) / publishedProducts.length) * 100))
                    : 100
                }
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            {/* Load More Button */}
            {hasMore ? (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-8 sm:px-10 py-3 sm:py-3.5 bg-[#64152F] hover:bg-[#4E0F23] text-white text-xs sm:text-sm font-bold rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 group disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label={`Load ${remainingCount} more products`}
              >
                <RefreshCw className={`w-4 h-4 text-white shrink-0 ${isLoadingMore ? "animate-spin" : "opacity-90"}`} />
                <span>Load More Products</span>
                {remainingCount > 0 && (
                  <span className="text-white/80 font-normal text-xs">
                    ({remainingCount} remaining)
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-white transition-transform group-hover:translate-x-1 shrink-0" />
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-100 border border-neutral-200/70 text-neutral-600 text-xs font-semibold">
                <Check className="w-4 h-4 text-[#64152F]" />
                <span>All {publishedProducts.length} products loaded</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
