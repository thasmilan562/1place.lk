"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Category } from "@/lib/types";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { categories as fallbackCategories } from "@/lib/data";
import { getCategories } from "@/lib/firestore-client";
import { KNOWN_BRAND_NAMES } from "@/lib/migration-audit";

interface CircularCategoriesProps {
  categories?: Category[];
}

function CircularCategoriesInner({ categories: initialCategories = [] }: CircularCategoriesProps) {
  const [categoriesList, setCategoriesList] = useState<Category[]>(initialCategories);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategoryParam = searchParams?.get("category") || null;

  // Load from DB if initialCategories not provided
  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategoriesList(initialCategories);
      return;
    }
    getCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategoriesList(cats);
        } else {
          setCategoriesList(fallbackCategories);
        }
      })
      .catch(() => {
        setCategoriesList(fallbackCategories);
      });
  }, [initialCategories]);

  // Clean, deduplicated, sorted active categories matching reference categories order
  const displayCategories = React.useMemo(() => {
    const brandLowerList = KNOWN_BRAND_NAMES.map((b) => b.toLowerCase());
    const seen = new Set<string>();
    const list: Category[] = [];

    const source = categoriesList && categoriesList.length > 0 ? categoriesList : fallbackCategories;
    source.forEach((c) => {
      if (!c || !c.name) return;
      if (c.isActive === false || c.status === "inactive" || c.status === "deleted") return;
      const cleanName = c.name.toLowerCase().trim();
      const cleanSlug = (c.slug || "").toLowerCase().trim();
      if (brandLowerList.includes(cleanName)) return;
      if (cleanSlug && seen.has(cleanSlug)) return;
      if (cleanSlug) seen.add(cleanSlug);
      list.push(c);
    });

    return list.sort((a, b) => (a.sortOrder ?? a.sort_order ?? 99) - (b.sortOrder ?? b.sort_order ?? 99));
  }, [categoriesList]);

  // Check scroll overflow to conditionally show arrow controls on desktop
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [displayCategories]);

  const handleScroll = (dir: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const distance = 300;
    scrollContainerRef.current.scrollBy({
      left: dir === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  if (displayCategories.length === 0) return null;

  return (
    <section
      id="categories-strip"
      aria-label="Shop by Category"
      className="w-full bg-white py-4 sm:py-6 select-none font-sans border-b border-neutral-100"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative">
        {/* Desktop Left Scroll Button (shown only when content overflows left) */}
        {showLeftArrow && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Scroll categories left"
            className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 border border-neutral-200 shadow-md text-neutral-700 items-center justify-center hover:bg-[#68122F] hover:text-white hover:border-[#68122F] transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}

        {/* Categories Horizontal Scrolling Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-start gap-4 sm:gap-6 lg:gap-8 overflow-x-auto scrollbar-none scroll-smooth px-1 py-1 snap-x snap-mandatory justify-start lg:justify-center"
        >
          {displayCategories.map((cat, index) => {
            const isRouteActive =
              pathname === `/category/${cat.slug}` ||
              activeCategoryParam === cat.slug;
            // On the home page without explicit filter, first item (Electronics) matches the reference's active burgundy highlight
            const isHighlighted = isRouteActive || (pathname === "/" && !activeCategoryParam && index === 0);

            return (
              <Link
                key={cat.id || cat.slug}
                href={`/category/${cat.slug}`}
                className="group flex flex-col items-center text-center shrink-0 w-16 sm:w-20 lg:w-24 snap-start focus:outline-none"
              >
                {/* Circular Icon Container */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-200 mb-2 shadow-2xs group-hover:scale-105 active:scale-95 ${
                    isHighlighted
                      ? "bg-[#68122F] text-white shadow-md shadow-[#68122F]/20"
                      : "bg-[#F3F4F6] text-neutral-800 hover:bg-[#E5E7EB]"
                  }`}
                >
                  <CategoryIcon
                    category={cat}
                    className={`w-6 h-6 transition-transform duration-200 ${
                      isHighlighted ? "text-white" : "text-neutral-800"
                    }`}
                  />
                </div>

                {/* Category Name */}
                <span
                  className={`text-xs sm:text-[13px] leading-tight line-clamp-1 transition-colors px-0.5 ${
                    isHighlighted
                      ? "font-bold text-[#68122F]"
                      : "font-semibold text-neutral-800 group-hover:text-[#68122F]"
                  }`}
                >
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Desktop Right Scroll Button (shown only when content overflows right) */}
        {showRightArrow && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Scroll categories right"
            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 border border-neutral-200 shadow-md text-neutral-700 items-center justify-center hover:bg-[#68122F] hover:text-white hover:border-[#68122F] transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}
      </div>
    </section>
  );
}

export default function CircularCategories(props: CircularCategoriesProps) {
  return (
    <React.Suspense fallback={null}>
      <CircularCategoriesInner {...props} />
    </React.Suspense>
  );
}
