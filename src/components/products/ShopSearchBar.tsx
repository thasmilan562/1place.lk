"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ShoppingBag, ArrowRight, Tag, Package, CornerDownLeft } from "lucide-react";
import { Product, Category, Brand } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { executeIntelligentSearch, SearchEngineResults } from "@/lib/search/search-engine";
import { addRecentSearch, recordProductSearchClick } from "@/lib/search/search-history";

interface ShopSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  products: Product[];
  categories?: Category[];
  brands?: Brand[];
  className?: string;
}

export default function ShopSearchBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  products = [],
  categories = [],
  brands = [],
  className = "",
}: ShopSearchBarProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(searchQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep internal input in sync with external search query prop
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute intelligent search results based on input value
  const searchResults: SearchEngineResults | null = useMemo(() => {
    const q = inputValue.trim();
    if (!q || q.length < 1) return null;
    return executeIntelligentSearch(q, products, categories, brands);
  }, [inputValue, products, categories, brands]);

  const topProducts = useMemo(() => {
    return searchResults ? searchResults.products.slice(0, 5) : [];
  }, [searchResults]);

  // Handle typing
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setSelectedIndex(-1);
    setIsOpen(true);
    onSearchChange(val);
  };

  // Clear search
  const handleClear = () => {
    setInputValue("");
    setSelectedIndex(-1);
    setIsOpen(false);
    onSearchChange("");
    onSearchSubmit("");
    inputRef.current?.focus();
  };

  // Submit search query
  const handleSubmit = (val?: string) => {
    const queryToSubmit = val !== undefined ? val : inputValue;
    const clean = queryToSubmit.trim();
    if (clean) addRecentSearch(clean);
    setIsOpen(false);
    onSearchSubmit(clean);
  };

  // Click product
  const handleProductClick = (product: Product) => {
    if (inputValue.trim()) {
      recordProductSearchClick(inputValue, product.id || product.slug);
      addRecentSearch(inputValue);
    }
    setIsOpen(false);
    router.push(`/products/${product.slug}`);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev + 1;
        return next >= topProducts.length ? -1 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev - 1;
        return next < -1 ? topProducts.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < topProducts.length) {
        const selected = topProducts[selectedIndex];
        handleProductClick(selected);
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-[880px] mx-auto ${className}`}>
      {/* ── Main Input Container ── */}
      <div className="relative flex items-center">
        <div className="absolute left-4 sm:left-5 pointer-events-none text-neutral-400">
          <Search className="w-5 h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => {
            if (inputValue.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search iPhone, Samsung, earbuds, chargers…"
          className="w-full h-12 sm:h-14 pl-11 sm:pl-13 pr-12 rounded-2xl bg-neutral-100/90 hover:bg-neutral-100 focus:bg-white text-neutral-900 placeholder:text-neutral-400 text-sm sm:text-base font-medium border-2 border-transparent focus:border-black focus:shadow-md transition-all outline-none"
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 sm:right-4 p-1.5 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-200/70 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Instant Suggestions Popup Dropdown ── */}
      {isOpen && inputValue.trim().length > 0 && searchResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-neutral-200/90 shadow-2xl overflow-hidden z-50 divide-y divide-neutral-100 animate-in fade-in-0 zoom-in-95 duration-150 font-outfit">
          
          {/* Header with Did You Mean */}
          <div className="px-4 py-2.5 bg-neutral-50/80 flex items-center justify-between text-xs text-neutral-500 font-semibold">
            <span className="flex items-center gap-1.5">
              {searchResults.totalMatches > 0 ? `Matches (${searchResults.totalMatches} products)` : "Search Results"}
            </span>
            <span className="text-[11px] text-neutral-400 font-normal">Press Enter to search</span>
          </div>

          {/* Typo Correction Banner if any */}
          {searchResults.didYouMean && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-1.5 truncate">
                <span>Did you mean:</span>
                <button
                  type="button"
                  onClick={() => handleSubmit(searchResults.didYouMean!)}
                  className="font-bold text-black underline hover:text-amber-700 cursor-pointer truncate"
                >
                  {searchResults.didYouMean}
                </button>
              </div>
            </div>
          )}

          {/* Suggestions List */}
          {topProducts.length > 0 ? (
            <div className="py-1 max-h-[380px] overflow-y-auto">
              {topProducts.map((product, idx) => {
                const isSelected = selectedIndex === idx;
                const isOutOfStock = product.stock_status === "out_of_stock";
                const isLowStock = product.stock_status === "low_stock";
                const effectivePrice =
                  product.sale_price && product.sale_price > 0 && product.sale_price < product.price
                    ? product.sale_price
                    : product.price;
                const hasDiscount =
                  product.old_price &&
                  product.old_price > product.price &&
                  Math.round(((product.old_price - product.price) / product.old_price) * 100) > 0;

                return (
                  <button
                    key={product.id || product.slug}
                    type="button"
                    onClick={() => handleProductClick(product)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isSelected ? "bg-neutral-100" : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200/60 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <ShoppingBag className="w-5 h-5 text-neutral-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          {product.category_name && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate max-w-[120px]">
                              {product.category_name}
                            </span>
                          )}
                          {isOutOfStock ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-700">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              Low Stock
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                          {product.name}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-black text-neutral-900">
                        {formatPrice(effectivePrice)}
                      </div>
                      {hasDiscount && (
                        <div className="text-[10px] text-neutral-400 line-through">
                          {formatPrice(product.old_price!)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 px-4 text-center">
              <p className="text-sm font-bold text-neutral-800">
                No suggestions found for &ldquo;{inputValue}&rdquo;
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Try searching for phone models, brand names, or accessories.
              </p>
            </div>
          )}

          {/* Footer Action */}
          <div className="p-2.5 bg-neutral-50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="w-full py-2 px-3 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>View All Results for &ldquo;{inputValue.trim()}&rdquo; ({searchResults.totalMatches})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

