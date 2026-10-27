"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  SlidersHorizontal,
  X,
  Package,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Product, Category, Brand } from "@/lib/types";
import ProductCard from "@/components/products/ProductCard";
import ShopFilterSidebar, { detectProductBrand } from "@/components/products/ShopFilterSidebar";
import { executeIntelligentSearch, SearchEngineResults } from "@/lib/search/search-engine";

interface ProductsClientProps {
  initialProducts: Product[];
  categories: Category[];
  brands?: Brand[];
}

const PRIMARY_CATEGORY_TABS = [
  { id: "all", label: "All" },
  { id: "phones", label: "Phones", filterKeywords: ["phone", "smartphone", "smartphones", "iphone", "samsung", "galaxy", "redmi", "xiaomi", "pixel", "oneplus", "oppo", "vivo", "realme", "honor", "mobile", "handset"] },
  { id: "laptops-tablets", label: "Laptop & Tab", filterKeywords: ["laptop", "macbook", "tablet", "tab", "ipad"] },
  { id: "audio", label: "Audio", filterKeywords: ["audio", "headphone", "earphone", "speaker", "airpod", "buds"] },
  { id: "wearables", label: "Wearables", filterKeywords: ["watch", "band", "wearable"] },
  { id: "power", label: "Power", filterKeywords: ["power", "battery", "charger", "cable", "adapter"] },
  { id: "accessories", label: "Accessories", filterKeywords: ["accessory", "case", "cover", "tempered", "gimbal"] },
];

const ITEMS_PER_PAGE = 16;

function getEffectivePrice(p: Product): number {
  if (p.sale_price && p.sale_price > 0 && p.sale_price < p.price) {
    return p.sale_price;
  }
  return p.price || 0;
}

// Windowed desktop pagination generator
function getPaginationItems(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function ProductsClient({
  initialProducts = [],
  categories = [],
  brands = [],
}: ProductsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ── 1. Category Tab State ── */
  const [activePrimaryTab, setActivePrimaryTab] = useState<string>(
    () => searchParams.get("tab") || "all"
  );

  /* ── 2. Filters State ── */
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const p = searchParams.get("category");
    return p ? p.split(",").filter(Boolean) : [];
  });

  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    const p = searchParams.get("brand");
    return p ? p.split(",").filter(Boolean) : [];
  });

  const [inStockOnly, setInStockOnly] = useState(searchParams.get("stock") === "in_stock");
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>(() => {
    const p = searchParams.get("avail");
    return p ? p.split(",").filter(Boolean) : [];
  });

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [sortKey, setSortKey] = useState<string>(searchParams.get("sort") || "featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  /* ── 3. Price State ── */
  const [pendingMin, setPendingMin] = useState(searchParams.get("minPrice") || "");
  const [pendingMax, setPendingMax] = useState(searchParams.get("maxPrice") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [priceError, setPriceError] = useState("");
  const [sliderLow, setSliderLow] = useState(0);
  const [sliderHigh, setSliderHigh] = useState(1000000);

  /* ── 4. Pagination State ── */
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const p = searchParams.get("page");
    return p ? Math.max(1, parseInt(p)) : 1;
  });

  /* ── 5. Mobile Filter Drawer ── */
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  /* ── Keep state in sync with URL searchParams (e.g. Mega Menu navigation) ── */
  useEffect(() => {
    const tabParam = searchParams.get("tab") || "all";
    setActivePrimaryTab(tabParam);

    const catParam = searchParams.get("category");
    setSelectedCategories(catParam ? catParam.split(",").map((s) => s.trim()).filter(Boolean) : []);

    const brandParam = searchParams.get("brand");
    setSelectedBrands(brandParam ? brandParam.split(",").map((s) => s.trim()).filter(Boolean) : []);

    setInStockOnly(searchParams.get("stock") === "in_stock");

    const availParam = searchParams.get("avail");
    setSelectedAvailability(availParam ? availParam.split(",").map((s) => s.trim()).filter(Boolean) : []);

    const searchParam = searchParams.get("search") || "";
    setSearchQuery(searchParam);

    const sortParam = searchParams.get("sort") || "featured";
    setSortKey(sortParam);

    const minParam = searchParams.get("minPrice") || "";
    const maxParam = searchParams.get("maxPrice") || "";
    setMinPrice(minParam);
    setMaxPrice(maxParam);
    setPendingMin(minParam);
    setPendingMax(maxParam);

    const pageParam = searchParams.get("page");
    setCurrentPage(pageParam ? Math.max(1, parseInt(pageParam)) : 1);
  }, [searchParams]);

  /* ── URL Parameter Synchronization ── */
  const updateUrlParams = useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, val]) => {
        if (val === null || val === "" || val === undefined) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });

      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handlePrimaryTabChange = (tabId: string) => {
    setActivePrimaryTab(tabId);
    setCurrentPage(1);
    updateUrlParams({ tab: tabId === "all" ? null : tabId, page: null });
  };

  const handleToggleCategory = (catId: string) => {
    const updated = selectedCategories.includes(catId)
      ? selectedCategories.filter((c) => c !== catId)
      : [...selectedCategories, catId];
    setSelectedCategories(updated);
    setCurrentPage(1);
    updateUrlParams({ category: updated.length ? updated.join(",") : null, page: null });
  };

  const handleClearCategories = () => {
    setSelectedCategories([]);
    setCurrentPage(1);
    updateUrlParams({ category: null, page: null });
  };

  const handleToggleBrand = (brandName: string) => {
    const updated = selectedBrands.includes(brandName)
      ? selectedBrands.filter((b) => b !== brandName)
      : [...selectedBrands, brandName];
    setSelectedBrands(updated);
    setCurrentPage(1);
    updateUrlParams({ brand: updated.length ? updated.join(",") : null, page: null });
  };

  const handleClearBrands = () => {
    setSelectedBrands([]);
    setCurrentPage(1);
    updateUrlParams({ brand: null, page: null });
  };

  const handleToggleInStock = () => {
    const next = !inStockOnly;
    setInStockOnly(next);
    setCurrentPage(1);
    updateUrlParams({ stock: next ? "in_stock" : null, page: null });
  };

  const handleToggleAvailability = (avail: string) => {
    const updated = selectedAvailability.includes(avail)
      ? selectedAvailability.filter((a) => a !== avail)
      : [...selectedAvailability, avail];
    setSelectedAvailability(updated);
    setCurrentPage(1);
    updateUrlParams({ avail: updated.length ? updated.join(",") : null, page: null });
  };

  const handleApplyPrice = () => {
    setMinPrice(pendingMin);
    setMaxPrice(pendingMax);
    setCurrentPage(1);
    updateUrlParams({
      minPrice: pendingMin || null,
      maxPrice: pendingMax || null,
      page: null,
    });
  };

  const handleSortChange = (newSort: string) => {
    setSortKey(newSort);
    updateUrlParams({ sort: newSort === "featured" ? null : newSort });
  };

  const handleClearAll = () => {
    setActivePrimaryTab("all");
    setSelectedCategories([]);
    setSelectedBrands([]);
    setInStockOnly(false);
    setSelectedAvailability([]);
    setPendingMin("");
    setPendingMax("");
    setMinPrice("");
    setMaxPrice("");
    setSearchQuery("");
    setSortKey("featured");
    setCurrentPage(1);
    router.push(pathname, { scroll: false });
  };

  /* ── 4. Intelligent Search Engine Execution ── */
  const searchEngineResults: SearchEngineResults | null = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return executeIntelligentSearch(searchQuery, initialProducts, categories, brands);
  }, [searchQuery, initialProducts, categories, brands]);

  /* ── Filtered and Sorted Products ── */
  const filteredProducts = useMemo(() => {
    // If search is active, use ranked candidate products from search engine
    const baseProducts = searchEngineResults ? searchEngineResults.products : initialProducts;

    const filtered = baseProducts.filter((p) => {
      // 1. Primary Tab Filter
      if (activePrimaryTab && activePrimaryTab !== "all") {
        const tabObj = PRIMARY_CATEGORY_TABS.find((t) => t.id === activePrimaryTab);
        if (tabObj && tabObj.filterKeywords) {
          const pName = (p.name || "").toLowerCase();
          const pCat = (p.category_name || p.categoryName || "").toLowerCase();
          const pGroup = (p.productType || "").toLowerCase();
          const pBrand = (p.brand_name || p.brandName || p.brand || detectProductBrand(p) || "").toLowerCase();

          const matchesTab = tabObj.filterKeywords.some(
            (kw) => pName.includes(kw) || pCat.includes(kw) || pGroup.includes(kw) || pBrand.includes(kw)
          );
          if (!matchesTab) return false;
        }
      }

      // 2. Sidebar / URL Query Categories
      if (selectedCategories.length > 0) {
        const cName = (p.category_name || p.categoryName || "").toLowerCase().trim();
        const cId = (p.category_id || "").toLowerCase().trim();
        const cSlug = (p.category_slug || "").toLowerCase().trim();
        const pName = (p.name || "").toLowerCase().trim();
        const pType = (p.productType || "").toLowerCase().trim();

        const matchesCategory = selectedCategories.some((sel) => {
          const s = sel.toLowerCase().trim();
          if (!s || s === "all") return true;

          // Direct equality or substring containment
          if (cName === s || cId === s || cSlug === s) return true;
          if (cName.includes(s) || (s.length >= 3 && s.includes(cName))) return true;
          if (cId.includes(s) || (s.length >= 3 && s.includes(cId))) return true;
          if (cSlug.includes(s) || (s.length >= 3 && s.includes(cSlug))) return true;

          // Normalization of common clean keys (remove "cat-", dashes, spaces)
          const cleanS = s.replace(/^cat-/, "").replace(/[^a-z0-9]/g, "");
          const cleanCName = cName.replace(/[^a-z0-9]/g, "");
          const cleanCId = cId.replace(/^cat-/, "").replace(/[^a-z0-9]/g, "");
          const cleanCSlug = cSlug.replace(/[^a-z0-9]/g, "");
          if (cleanCName && cleanS && (cleanCName.includes(cleanS) || cleanS.includes(cleanCName))) return true;
          if (cleanCId && cleanS && (cleanCId.includes(cleanS) || cleanS.includes(cleanCId))) return true;
          if (cleanCSlug && cleanS && (cleanCSlug.includes(cleanS) || cleanS.includes(cleanCSlug))) return true;

          // Semantic mappings:
          if (s === "smartphones" || s === "phones" || s === "phone" || s === "mobile" || s === "cat-smartphones" || s === "feature-phone") {
            return cName.includes("phone") || cName.includes("smartphone") || cSlug.includes("phone") || pType === "phone";
          }
          if (s === "earbuds" || s === "buds" || s === "earbud" || s === "tws" || s === "cat-earbuds" || s === "earbuds-tws" || s === "ear-phone" || s === "earphones") {
            return cName.includes("bud") || cName.includes("ear") || cName.includes("headphone") || pName.includes("earbuds") || pName.includes("airpods") || pName.includes("buds") || pName.includes("earphone");
          }
          if (s === "charging-cables" || s === "cable" || s === "cables" || s === "cat-cables" || s === "cable-organizer") {
            return cName.includes("cable") || cSlug.includes("cable") || pName.includes("cable");
          }
          if (s === "chargers-adapters" || s === "charger" || s === "chargers" || s === "adapter" || s === "adapters" || s === "cat-charger" || s === "cat-adapter" || s === "wifi-adapter") {
            return cName.includes("charger") || cName.includes("adapter") || cSlug.includes("charger") || cSlug.includes("adapter") || pName.includes("adapter") || pName.includes("charger") || pName.includes("power adapter");
          }
          if (s === "power-banks" || s === "power-bank" || s === "powerbank" || s === "powerbanks" || s === "battery" || s === "cat-powerbanks" || s === "cat-battery") {
            return cName.includes("power") || cName.includes("battery") || pName.includes("power bank") || pName.includes("powerbank") || pName.includes("battery");
          }
          if (s === "laptops-tablets" || s === "laptops" || s === "laptop" || s === "tablets" || s === "tablet" || s === "tab" || s === "ipad" || s === "lap & mac" || s === "cat-laptops" || s === "cat-tab" || s === "cat-ipad") {
            return cName.includes("laptop") || cName.includes("macbook") || cName.includes("tab") || cName.includes("ipad") || pName.includes("macbook") || pName.includes("tab") || pName.includes("ipad") || pName.includes("laptop");
          }
          if (s === "smart-watches" || s === "smart-watch" || s === "watches" || s === "watch" || s === "cat-watches" || s === "smart-fitband" || s === "straps" || s === "wearables") {
            return cName.includes("watch") || cName.includes("fitband") || cName.includes("strap") || pName.includes("watch") || pName.includes("band");
          }
          if (s === "phone-cases" || s === "cases" || s === "case" || s === "covers" || s === "displays" || s === "display" || s === "screen-protectors" || s === "cat-cases" || s === "cat-screen-protectors") {
            return cName.includes("case") || cName.includes("cover") || cName.includes("display") || cName.includes("screen") || pName.includes("case") || pName.includes("tempered") || pName.includes("guard");
          }
          if (s === "headphones" || s === "headphone" || s === "cat-headphones" || s === "neckband") {
            return cName.includes("headphone") || cName.includes("neckband") || pName.includes("headphone") || pName.includes("headset") || pName.includes("neckband");
          }
          if (s === "keyboards" || s === "keyboard" || s === "mouse" || s === "cat-keyboard" || s === "cat-mouse") {
            return cName.includes("keyboard") || cName.includes("mouse") || pName.includes("keyboard") || pName.includes("mouse");
          }
          if (s === "gimbals" || s === "gimbal" || s === "tripod" || s === "stand" || s === "lights" || s === "selife-stick" || s === "cat--gimbal" || s === "cat-tripod" || s === "cat-stand" || s === "cat-lights") {
            return cName.includes("gimbal") || cName.includes("tripod") || cName.includes("stand") || cName.includes("light") || cName.includes("stick") || pName.includes("gimbal") || pName.includes("tripod") || pName.includes("stick") || pName.includes("light");
          }
          if (s === "otg" || s === "storage-devices" || s === "bag" || s === "bags" || s === "smart-pencil" || s === "smart-finder" || s === "itag" || s === "cat-otg" || s === "cat-s" || s === "cat-bag" || s === "cat-bags" || s === "cat-smart-pencil" || s === "cat-smart-finder" || s === "cat-itag") {
            return cName.includes("otg") || cName.includes("storage") || cName.includes("bag") || cName.includes("pencil") || cName.includes("finder") || cName.includes("itag") || pName.includes("otg") || pName.includes("pencil") || pName.includes("finder") || pName.includes("bag") || pName.includes("drive");
          }

          return false;
        });
        if (!matchesCategory) return false;
      }

      // 3. Brand (Case-Insensitive & Normalized check)
      if (selectedBrands.length > 0) {
        const brand = detectProductBrand(p).toLowerCase();
        const pBrandName = (p.brand_name || p.brandName || p.brand || "").toLowerCase();
        const pName = (p.name || "").toLowerCase();

        const matchesBrand = selectedBrands.some((sb) => {
          const cleanSb = sb.toLowerCase().trim().replace(/^brand-/, "");
          return (
            brand === cleanSb ||
            pBrandName === cleanSb ||
            pBrandName.includes(cleanSb) ||
            pName.includes(cleanSb)
          );
        });
        if (!matchesBrand) return false;
      }

      // 4. In Stock Only
      if (inStockOnly || selectedAvailability.includes("in_stock")) {
        if (p.stock_status === "out_of_stock" || (typeof p.stock_count === "number" && p.stock_count <= 0)) {
          return false;
        }
      }

      // 5. Price Filter
      const effPrice = getEffectivePrice(p);
      if (minPrice && effPrice < Number(minPrice)) return false;
      if (maxPrice && effPrice > Number(maxPrice)) return false;

      return true;
    });

    // If search is active and sort is featured/default, preserve search engine ranking!
    if (searchEngineResults && (sortKey === "featured" || !sortKey)) {
      return filtered;
    }

    return filtered.sort((a, b) => {
      const pa = getEffectivePrice(a);
      const pb = getEffectivePrice(b);

      if (sortKey === "price_asc" || sortKey === "price-asc") return pa - pb;
      if (sortKey === "price_desc" || sortKey === "price-desc") return pb - pa;
      if (sortKey === "newest") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortKey === "discount" || sortKey === "biggest-discount") {
        const discA = a.old_price && a.old_price > a.price ? (a.old_price - a.price) / a.old_price : 0;
        const discB = b.old_price && b.old_price > b.price ? (b.old_price - b.price) / b.old_price : 0;
        return discB - discA;
      }
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [
    initialProducts,
    searchEngineResults,
    activePrimaryTab,
    selectedCategories,
    selectedBrands,
    inStockOnly,
    selectedAvailability,
    minPrice,
    maxPrice,
    sortKey,
  ]);

  /* ── Active Filter Chips ── */
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];

    if (activePrimaryTab !== "all") {
      const t = PRIMARY_CATEGORY_TABS.find((tab) => tab.id === activePrimaryTab);
      chips.push({
        id: "tab",
        label: t?.label || activePrimaryTab,
        onRemove: () => handlePrimaryTabChange("all"),
      });
    }

    selectedCategories.forEach((c) => {
      chips.push({
        id: `cat-${c}`,
        label: c,
        onRemove: () => handleToggleCategory(c),
      });
    });

    selectedBrands.forEach((b) => {
      chips.push({
        id: `brand-${b}`,
        label: b,
        onRemove: () => handleToggleBrand(b),
      });
    });

    if (inStockOnly) {
      chips.push({
        id: "instock",
        label: "In Stock",
        onRemove: handleToggleInStock,
      });
    }

    if (minPrice || maxPrice) {
      const mn = minPrice ? `From LKR ${Number(minPrice).toLocaleString()}` : "";
      const mx = maxPrice ? `Up to LKR ${Number(maxPrice).toLocaleString()}` : "";
      chips.push({
        id: "price",
        label: [mn, mx].filter(Boolean).join(" - "),
        onRemove: () => {
          setPendingMin("");
          setPendingMax("");
          setMinPrice("");
          setMaxPrice("");
          updateUrlParams({ minPrice: null, maxPrice: null, page: null });
        },
      });
    }

    if (searchQuery.trim()) {
      chips.push({
        id: "search",
        label: `"${searchQuery.trim()}"`,
        onRemove: () => {
          setSearchQuery("");
          updateUrlParams({ search: null, page: null });
        },
      });
    }

    return chips;
  }, [
    activePrimaryTab,
    selectedCategories,
    selectedBrands,
    inStockOnly,
    minPrice,
    maxPrice,
    searchQuery,
    updateUrlParams,
  ]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateUrlParams({ page: page === 1 ? null : page.toString() });
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  const sidebarProps = {
    allProducts: initialProducts,
    categories,
    selectedCategories,
    onToggleCategory: handleToggleCategory,
    onClearCategories: handleClearCategories,
    selectedBrands,
    onToggleBrand: handleToggleBrand,
    onClearBrands: handleClearBrands,
    priceMin: 0,
    priceMax: 1000000,
    sliderLow,
    sliderHigh,
    onSliderChange: (low: number, high: number) => {
      setSliderLow(low);
      setSliderHigh(high);
    },
    pendingMin,
    pendingMax,
    setPendingMin,
    setPendingMax,
    priceError,
    onApplyPrice: handleApplyPrice,
    selectedAvailability,
    onToggleAvailability: handleToggleAvailability,
    onClearAll: handleClearAll,
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans pb-24 w-full">
      <div className="max-w-[1440px] px-3 sm:px-6 lg:px-8 mx-auto pt-2 sm:pt-6 w-full">
        
        {/* ── 1. Breadcrumb ── */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-medium text-neutral-500 mb-3 select-none"
        >
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <span className="text-neutral-400">/</span>
          <span className="text-black font-bold">
            Shop All
          </span>
        </nav>

        {/* Accessible heading for SEO and screen readers */}
        <h1 className="sr-only">
          Mobile Phones &amp; Accessories in Sri Lanka
        </h1>

        {/* ── 3. Compact Toolbar Row ── */}
        <div className="flex items-center justify-between gap-2.5 mb-4 sm:mb-6 flex-wrap">
          {/* Left: Filtered Count */}
          <div className="text-xs sm:text-sm font-bold text-neutral-800 flex items-center gap-1.5">
            <span>{filteredProducts.length}</span>
            <span className="text-neutral-500 font-normal">
              {filteredProducts.length === 1 ? "Product" : "Products"}
            </span>
          </div>

          {/* Right: Filters Button, Sort, View Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Filters Button (Mobile & Desktop Toggle) */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                activeChips.length > 0
                  ? "bg-black text-white border border-black"
                  : "bg-white border border-neutral-200/90 hover:bg-neutral-50 text-neutral-800"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeChips.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-black text-[9px] font-black flex items-center justify-center">
                  {activeChips.length}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <select
                value={sortKey}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-white border border-neutral-200/90 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-800 outline-none cursor-pointer shadow-2xs hover:bg-neutral-50"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "grid" ? "bg-neutral-100 text-black font-bold" : "text-neutral-400 hover:text-black"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "list" ? "bg-neutral-100 text-black font-bold" : "text-neutral-400 hover:text-black"
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. Active Filter Chips Row ── */}
        {activeChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6 pb-2">
            <span className="text-xs font-bold text-neutral-500">Active Filters:</span>
            {activeChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 border border-neutral-200/80 rounded-full text-xs font-semibold text-neutral-800"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-black cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-bold text-[#ED0712] hover:text-red-700 ml-2 cursor-pointer transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── 5. Two-Column Layout (Sidebar + Product Grid) ── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Desktop Filter Sidebar (240px wide, sticky below navbar) */}
          <aside className="hidden lg:block w-[240px] shrink-0 sticky top-28 self-start bg-white max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
            <ShopFilterSidebar {...sidebarProps} />
          </aside>

          {/* Main Product Grid Area */}
          <main className="flex-1 min-w-0 w-full">
            {filteredProducts.length === 0 ? (
              /* Empty State */
              <div className="bg-[#FAFAFB] border border-neutral-200/80 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-2xs my-8">
                <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-4 text-neutral-400 shadow-2xs">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-neutral-900 tracking-tight mb-1">
                  No products match your filters.
                </h3>
                <p className="text-xs text-neutral-500 mb-5">
                  Try clearing your selected filters or searching for another term.
                </p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              /* Product Grid (4 Columns Desktop) */
              <div>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3.5 lg:gap-4"
                      : "grid grid-cols-1 gap-3 sm:gap-4"
                  }
                >
                  {paginatedProducts.map((product, idx) => (
                    <ProductCard key={product.id} product={product} priority={idx < 8} />
                  ))}
                </div>

                {/* ── 6. Pagination Controls ── */}
                {totalPages > 1 && (
                  <div className="mt-12 pt-6 border-t border-neutral-200 w-full">
                    {/* Mobile Compact Pagination (< sm) */}
                    <div className="flex sm:hidden items-center justify-between gap-2 w-full">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Prev</span>
                      </button>

                      <span className="text-xs font-extrabold text-neutral-800 font-mono">
                        Page {currentPage} of {totalPages}
                      </span>

                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Desktop Pagination (>= sm) - Exact Original Layout */}
                    <div className="hidden sm:flex items-center justify-between w-full">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="px-4 py-2 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {getPaginationItems(currentPage, totalPages).map((item, idx) => (
                          item === "..." ? (
                            <span
                              key={`dots-${idx}`}
                              className="w-8 h-8 flex items-center justify-center text-xs text-neutral-400 font-bold select-none"
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={item}
                              type="button"
                              onClick={() => handlePageChange(item as number)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                currentPage === item
                                  ? "bg-black text-white shadow-xs"
                                  : "text-neutral-600 hover:bg-neutral-100"
                              }`}
                            >
                              {item}
                            </button>
                          )
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="px-4 py-2 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

      </div>

      {/* ── 7. Mobile Filter Full-Height Bottom Sheet / Drawer ── */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setShowMobileFilters(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Sheet */}
          <div className="relative bg-white rounded-t-3xl max-h-[88vh] flex flex-col z-10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-20">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-black" />
                <h3 className="font-extrabold text-sm text-black">Filter Products</h3>
                {activeChips.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-black">
                    {activeChips.length}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 overscroll-contain">
              <ShopFilterSidebar {...sidebarProps} />
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-neutral-100 flex items-center gap-3 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={handleClearAll}
                className="py-3 px-4 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:text-black transition-colors"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 py-3 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <span>Show {filteredProducts.length} Products</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
