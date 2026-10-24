"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  TrendingUp,
  Clock,
  ChevronRight,
  ArrowRight,
  Package,
  Tag,
  ShoppingBag,
  Trash2,
  CornerDownLeft,
  Flame,
  Check,
} from "lucide-react";
import { Product, Category, Brand } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { getProducts, getCategories, getBrands } from "@/lib/firestore-client";
import {
  executeIntelligentSearch,
  SearchEngineResults,
  normalizeText,
} from "@/lib/search/search-engine";
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearAllRecentSearches,
  recordProductSearchClick,
  TRENDING_SEARCHES,
} from "@/lib/search/search-history";

// ── In-memory data cache to prevent duplicate Firestore reads ──
let cachedProducts: Product[] | null = null;
let cachedCategories: Category[] | null = null;
let cachedBrands: Brand[] | null = null;

/** Helper to highlight matching substrings in text */
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>;

  const cleanText = text;
  const cleanHighlight = highlight.trim().toLowerCase();
  const index = cleanText.toLowerCase().indexOf(cleanHighlight);

  if (index === -1) {
    // Check word-by-word highlight
    const words = cleanHighlight.split(" ").filter(Boolean);
    const regex = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const parts = cleanText.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          words.some((w) => w.toLowerCase() === part.toLowerCase()) ? (
            <span key={i} className="text-amber-400 font-black bg-amber-400/10 px-0.5 rounded">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  }

  const before = cleanText.slice(0, index);
  const match = cleanText.slice(index, index + cleanHighlight.length);
  const after = cleanText.slice(index + cleanHighlight.length);

  return (
    <span>
      {before}
      <span className="text-amber-400 font-black bg-amber-400/10 px-0.5 rounded">{match}</span>
      {after}
    </span>
  );
}

export default function SearchOverlay() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Datasets
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // History & Suggestions
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchEngineResults | null>(null);

  // Keyboard navigation active index
  const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Global Keyboard Listeners (⌘K, Escape) & Event Trigger
  useEffect(() => {
    const handleOpenSearch = () => {
      setIsOpen(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("open-search-overlay", handleOpenSearch);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-search-overlay", handleOpenSearch);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // 2. Fetch or load cached data when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 100);

      if (cachedProducts && cachedCategories && cachedBrands) {
        setProducts(cachedProducts);
        setCategories(cachedCategories);
        setBrands(cachedBrands);
      } else {
        setIsLoading(true);
        Promise.all([getProducts(), getCategories(), getBrands()])
          .then(([pList, cList, bList]) => {
            cachedProducts = pList;
            cachedCategories = cList;
            cachedBrands = bList;
            setProducts(pList);
            setCategories(cList);
            setBrands(bList);
          })
          .catch((err) => console.error("Search data load error:", err))
          .finally(() => setIsLoading(false));
      }
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setDebouncedQuery("");
      setActiveItemIndex(-1);
      setSearchResults(null);
    }
  }, [isOpen]);

  // 3. Debounce search query input (150ms for snappy instant feel)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 120);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // 4. Run Intelligent Search Engine on debounced query
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults(null);
      setActiveItemIndex(-1);
      return;
    }

    const results = executeIntelligentSearch(
      debouncedQuery,
      products,
      categories,
      brands
    );
    setSearchResults(results);
    setActiveItemIndex(-1);
  }, [debouncedQuery, products, categories, brands]);

  // Flatten all navigable items for seamless keyboard Up/Down navigation
  const navigableItems = useMemo(() => {
    if (!searchResults || !debouncedQuery.trim()) return [];

    const items: Array<{
      type: "suggestion" | "category" | "brand" | "product";
      id: string;
      label: string;
      data: any;
    }> = [];

    // Suggestions
    searchResults.suggestions.forEach((s) => {
      items.push({ type: "suggestion", id: `sug-${s}`, label: s, data: s });
    });

    // Categories
    searchResults.categories.forEach((c) => {
      items.push({ type: "category", id: `cat-${c.category.slug}`, label: c.category.name, data: c.category });
    });

    // Brands
    searchResults.brands.forEach((b) => {
      items.push({ type: "brand", id: `brand-${b.brand.slug}`, label: b.brand.name, data: b.brand });
    });

    // Top Products (up to 6 for keyboard nav)
    searchResults.products.slice(0, 6).forEach((p) => {
      items.push({ type: "product", id: `prod-${p.id || p.slug}`, label: p.name, data: p });
    });

    return items;
  }, [searchResults, debouncedQuery]);

  // Handlers
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelectQuery = (searchTerm: string) => {
    addRecentSearch(searchTerm);
    handleClose();
    router.push(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleSelectProduct = (product: Product) => {
    if (query.trim()) {
      recordProductSearchClick(query, product.id || product.slug);
      addRecentSearch(query);
    }
    handleClose();
    router.push(`/products/${product.slug}`);
  };

  const handleSelectCategory = (category: Category) => {
    if (query.trim()) addRecentSearch(query);
    handleClose();
    router.push(`/products?category=${encodeURIComponent(category.slug || category.id)}`);
  };

  const handleSelectBrand = (brand: Brand) => {
    if (query.trim()) addRecentSearch(query);
    handleClose();
    router.push(`/products?brand=${encodeURIComponent(brand.slug || brand.name)}`);
  };

  const handleDeleteRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = removeRecentSearch(term);
    setRecentSearches(updated);
  };

  const handleClearAllRecents = () => {
    clearAllRecentSearches();
    setRecentSearches([]);
  };

  // Smart submission resolver: Directly routes to Product, Brand, Category, or Search Page
  const handleSmartSearchSubmit = (inputQuery: string) => {
    const rawQ = inputQuery.trim();
    if (!rawQ) return;
    const cleanQ = normalizeText(rawQ);

    // If user has navigated to an active item in dropdown with arrow keys
    if (activeItemIndex >= 0 && activeItemIndex < navigableItems.length) {
      const item = navigableItems[activeItemIndex];
      if (item.type === "suggestion") {
        handleSelectQuery(item.data);
        return;
      }
      if (item.type === "category") {
        handleSelectCategory(item.data);
        return;
      }
      if (item.type === "brand") {
        handleSelectBrand(item.data);
        return;
      }
      if (item.type === "product") {
        handleSelectProduct(item.data);
        return;
      }
    }

    // 1. Direct Brand Match (e.g. "Apple", "Samsung", "Xiaomi", "Anker", "Baseus", "Remax", "Hoco", "JBL", "Sony")
    const matchedBrand =
      brands.find((b) => {
        const bName = normalizeText(b.name || "");
        const bSlug = normalizeText(b.slug || "");
        return bName === cleanQ || bSlug === cleanQ;
      }) ||
      searchResults?.brands.find((bm) => {
        const bName = normalizeText(bm.brand.name || "");
        const bSlug = normalizeText(bm.brand.slug || "");
        return bName === cleanQ || bSlug === cleanQ || (bm.score >= 80 && cleanQ.length >= 3);
      })?.brand;

    if (matchedBrand) {
      handleSelectBrand(matchedBrand);
      return;
    }

    // 2. Direct Category Match (e.g. "Smartphones", "Chargers", "Earbuds", "Power Banks", "Covers", "Cases", "Cables")
    const matchedCat =
      categories.find((c) => {
        const cName = normalizeText(c.name || "");
        const cSlug = normalizeText(c.slug || "");
        return cName === cleanQ || cSlug === cleanQ;
      }) ||
      searchResults?.categories.find((cm) => {
        const cName = normalizeText(cm.category.name || "");
        const cSlug = normalizeText(cm.category.slug || "");
        return cName === cleanQ || cSlug === cleanQ || (cm.score >= 80 && cleanQ.length >= 3);
      })?.category;

    if (matchedCat) {
      handleSelectCategory(matchedCat);
      return;
    }

    // 3. Direct Specific Product Match (e.g. "iPhone 17 Pro", "S26", "Samsung S26", "AirPods Pro 2", "16 Pro Max")
    if (searchResults && searchResults.products.length > 0) {
      const topProduct = searchResults.products[0];
      const pName = normalizeText(topProduct.name || "");
      const pSlug = normalizeText(topProduct.slug || "");

      const isExactMatch = pName === cleanQ || pSlug === cleanQ;

      // Check if all tokens of cleanQ are contained in product name (e.g. "iphone", "17", "pro" in "Apple iPhone 17 Pro")
      const qTokens = cleanQ.split(" ").filter(Boolean);
      const allTokensInName = qTokens.length >= 1 && qTokens.every((t) => pName.includes(t));

      // Model number patterns or high confidence single product
      const isModelShortcut =
        cleanQ.startsWith("s2") ||
        cleanQ.startsWith("s1") ||
        cleanQ.startsWith("iphone") ||
        cleanQ.includes("17") ||
        cleanQ.includes("16") ||
        cleanQ.includes("15") ||
        cleanQ.includes("14") ||
        cleanQ.includes("13") ||
        cleanQ.includes("airpod") ||
        cleanQ.includes("ultra") ||
        cleanQ.includes("max");

      if (isExactMatch || searchResults.products.length === 1 || (allTokensInName && (qTokens.length >= 2 || isModelShortcut))) {
        handleSelectProduct(topProduct);
        return;
      }
    }

    // 4. Default: Open Search Catalog
    handleSelectQuery(rawQ);
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (navigableItems.length > 0) {
        setActiveItemIndex((prev) => (prev + 1 >= navigableItems.length ? 0 : prev + 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (navigableItems.length > 0) {
        setActiveItemIndex((prev) => (prev - 1 < 0 ? navigableItems.length - 1 : prev - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSmartSearchSubmit(query);
    }
  };

  if (!isOpen) return null;

  const hasSearchContent = Boolean(debouncedQuery.trim() && searchResults);
  const hasAnyMatches =
    searchResults &&
    (searchResults.products.length > 0 ||
      searchResults.categories.length > 0 ||
      searchResults.brands.length > 0 ||
      searchResults.suggestions.length > 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-2xl flex flex-col text-white select-none w-full h-full overflow-hidden font-outfit"
        ref={overlayRef}
      >
        {/* ── Top Header Search Bar (Apple Spotlight Luxury Style) ── */}
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-3 border-b border-neutral-800/80 flex items-center gap-3 shrink-0">
          <div className="relative flex-1 flex items-center bg-[#18181B] border border-neutral-700/70 focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-white/20 rounded-full px-4 py-2.5 sm:py-3 transition-all min-w-0">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search products, models, brands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-white text-sm sm:text-base placeholder-neutral-500 focus:outline-none font-medium tracking-tight"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors shrink-0 ml-1.5 cursor-pointer"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors shrink-0 cursor-pointer active:scale-95"
          >
            Cancel
          </button>
        </div>

        {/* ── Main Scrollable Body ── */}
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* ─────────────────────────────────────────────────────────────
             STATE 1: EMPTY QUERY (Recent Searches & Categories Only)
          ───────────────────────────────────────────────────────────── */}
          {!hasSearchContent && (
            <div className="space-y-6 animate-in fade-in-0 duration-150 font-sans">
              
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Recent Searches
                    </h3>
                    <button
                      type="button"
                      onClick={handleClearAllRecents}
                      className="text-[11px] text-neutral-500 hover:text-red-400 font-medium transition-colors cursor-pointer"
                    >
                      Clear History
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        onClick={() => handleSelectQuery(term)}
                        className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#18181B] hover:bg-[#27272A] border border-neutral-800 hover:border-neutral-700 text-xs sm:text-sm text-neutral-200 hover:text-white transition-all cursor-pointer"
                      >
                        <span className="truncate max-w-[200px]">{term}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRecent(e, term)}
                          className="text-neutral-500 hover:text-white p-0.5 rounded-full transition-colors ml-0.5 cursor-pointer"
                          aria-label={`Remove ${term}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Browse Categories (Clean minimal list without icons) */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                  Browse Categories
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[
                    { label: "Smartphones", slug: "smartphones" },
                    { label: "Smart Watches", slug: "smart-watches" },
                    { label: "Laptops & MacBooks", slug: "laptops" },
                    { label: "Earbuds & Audio", slug: "earbuds" },
                    { label: "Fast Chargers", slug: "chargers-adapters" },
                    { label: "Power Banks", slug: "power-banks" },
                    { label: "Cases & Covers", slug: "phone-cases" },
                    { label: "All Products", slug: "" },
                  ].map((cat) => (
                    <Link
                      key={cat.label}
                      href={cat.slug ? `/products?category=${cat.slug}` : "/products"}
                      onClick={handleClose}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-neutral-800 hover:border-neutral-700 text-xs sm:text-sm text-neutral-300 hover:text-white transition-all"
                    >
                      <span className="truncate font-medium">{cat.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
             STATE 2: SEARCH RESULTS & AUTOCOMPLETE DROPDOWN
          ───────────────────────────────────────────────────────────── */}
          {hasSearchContent && searchResults && (
            <div className="space-y-6">
              
              {/* 1. Typo Correction ("Did You Mean?") Alert Banner */}
              {searchResults.didYouMean && (
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Did you mean:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(searchResults.didYouMean!);
                        inputRef.current?.focus();
                      }}
                      className="font-black text-white underline underline-offset-4 decoration-amber-400 hover:text-amber-300 transition-colors cursor-pointer text-sm sm:text-base"
                    >
                      {searchResults.didYouMean}
                    </button>
                    <span className="text-white/60 text-[11px]">(Showing results for both)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectQuery(searchResults.didYouMean!)}
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-white px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 transition-all shrink-0 cursor-pointer"
                  >
                    Search &ldquo;{searchResults.didYouMean}&rdquo; →
                  </button>
                </div>
              )}

              {/* No Results Fallback */}
              {!hasAnyMatches && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-2xl">
                    🔍
                  </div>
                  <h3 className="text-lg font-bold text-white">No exact matches found for &ldquo;{query}&rdquo;</h3>
                  <p className="text-xs sm:text-sm text-white/60 max-w-md mx-auto">
                    Try checking for spelling errors, using simpler keywords, or browsing our full product catalog.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/products"
                      onClick={handleClose}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      Browse All Store Products <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Multi-Section Content Grid */}
              {hasAnyMatches && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Suggestions, Categories & Brands (5 cols on Desktop) */}
                  <div className="lg:col-span-5 space-y-5">
                    
                    {/* Search Suggestions */}
                    {searchResults.suggestions.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                          Keyword Suggestions
                        </h4>
                        <div className="space-y-1">
                          {searchResults.suggestions.map((sug) => {
                            const itemIdx = navigableItems.findIndex((item) => item.id === `sug-${sug}`);
                            const isActive = activeItemIndex === itemIdx;

                            return (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => handleSelectQuery(sug)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs sm:text-sm font-normal transition-all cursor-pointer group ${
                                  isActive
                                    ? "bg-white/15 text-white"
                                    : "hover:bg-white/10 text-neutral-300 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0" />
                                  <span className="truncate">
                                    <HighlightedText text={sug} highlight={query} />
                                  </span>
                                </div>
                                <CornerDownLeft className="w-3 h-3 text-neutral-500 group-hover:text-white shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Matching Categories */}
                    {searchResults.categories.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                          Categories
                        </h4>
                        <div className="space-y-1">
                          {searchResults.categories.map(({ category, count }) => {
                            const itemIdx = navigableItems.findIndex(
                              (item) => item.id === `cat-${category.slug}`
                            );
                            const isActive = activeItemIndex === itemIdx;

                            return (
                              <button
                                key={category.id || category.slug}
                                type="button"
                                onClick={() => handleSelectCategory(category)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs sm:text-sm font-normal transition-all cursor-pointer group ${
                                  isActive
                                    ? "bg-white/15 text-white"
                                    : "hover:bg-white/10 text-neutral-300 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="truncate font-medium">
                                    <HighlightedText text={category.name} highlight={query} />
                                  </span>
                                </div>
                                {count > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 shrink-0">
                                    {count} {count === 1 ? "item" : "items"}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Matching Brands */}
                    {searchResults.brands.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                          Brands
                        </h4>
                        <div className="space-y-1">
                          {searchResults.brands.map(({ brand, count }) => {
                            const itemIdx = navigableItems.findIndex(
                              (item) => item.id === `brand-${brand.slug}`
                            );
                            const isActive = activeItemIndex === itemIdx;

                            return (
                              <button
                                key={brand.id || brand.slug}
                                type="button"
                                onClick={() => handleSelectBrand(brand)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs sm:text-sm font-normal transition-all cursor-pointer group ${
                                  isActive
                                    ? "bg-white/15 text-white"
                                    : "hover:bg-white/10 text-neutral-300 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="truncate font-medium">
                                    <HighlightedText text={brand.name} highlight={query} />
                                  </span>
                                </div>
                                {count > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 shrink-0">
                                    {count} {count === 1 ? "product" : "products"}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Matching Products (7 cols on Desktop) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                        Products ({searchResults.totalMatches})
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleSelectQuery(query)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        View All Results <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {searchResults.products.slice(0, 6).map((product) => {
                        const itemIdx = navigableItems.findIndex(
                          (item) => item.id === `prod-${product.id || product.slug}`
                        );
                        const isActive = activeItemIndex === itemIdx;
                        const isOutOfStock = product.stock_status === "out_of_stock";
                        const effectivePrice =
                          product.sale_price && product.sale_price > 0 && product.sale_price < product.price
                            ? product.sale_price
                            : product.price;
                        const hasDiscount =
                          product.old_price &&
                          product.old_price > product.price &&
                          Math.round(((product.old_price - product.price) / product.old_price) * 100) > 0;

                        return (
                          <div
                            key={product.id || product.slug}
                            onClick={() => handleSelectProduct(product)}
                            className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer group ${
                              isActive
                                ? "bg-white/20 border-amber-400 shadow-lg scale-[1.01]"
                                : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/25"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                              {/* Product Thumbnail */}
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-neutral-900 border border-white/10 p-1 shrink-0 flex items-center justify-center overflow-hidden relative">
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                  />
                                ) : (
                                  <ShoppingBag className="w-5 h-5 text-white/30" />
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  {product.brand_name && (
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                                      {product.brand_name}
                                    </span>
                                  )}
                                  {product.category_name && (
                                    <span className="text-[10px] text-white/40 font-semibold truncate max-w-[120px]">
                                      • {product.category_name}
                                    </span>
                                  )}
                                </div>

                                <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                                  <HighlightedText text={product.name} highlight={query} />
                                </h5>

                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs sm:text-sm font-black text-white">
                                    {formatPrice(effectivePrice)}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-[10px] sm:text-xs text-white/40 line-through">
                                      {formatPrice(product.old_price!)}
                                    </span>
                                  )}
                                  {isOutOfStock ? (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-bold">
                                      Out of Stock
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                      In Stock
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-transform shrink-0" />
                          </div>
                        );
                      })}
                    </div>

                    {/* View All CTA Footer Bar */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleSelectQuery(query)}
                        className="w-full py-3 px-4 rounded-xl bg-white text-black hover:bg-amber-400 hover:text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 cursor-pointer"
                      >
                        <span>View All {searchResults.totalMatches} Products for &ldquo;{query}&rdquo;</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
