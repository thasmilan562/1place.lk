"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { formatPrice } from "@/lib/utils";
import { Product, Category, Brand } from "@/lib/types";
import { db } from "@/lib/admin-firebase";
import { doc, updateDoc, writeBatch, setDoc } from "firebase/firestore";
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Tag,
  FolderTree,
  Smartphone, 
  CheckSquare, 
  Square, 
  CircleCheck as Sparkles, 
  RefreshCw, 
  SlidersHorizontal,
  Layers, 
  Star, 
  Rocket, 
  X, 
  RotateCcw,
  MoreHorizontal,
  Headphones,
  Watch,
  ShoppingBag,
  Laptop,
  Check,
  List,
  LayoutGrid,
  Filter,
  Grid,
  Folder,
  ArrowRight,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import BulkOfferModal from "@/components/admin/BulkOfferModal";
import {
  getProductCategory,
  getProductBrand,
  sanitizeCategoriesList,
  sanitizeBrandsList,
  normalizeCategoryKey,
  formatCategoryDisplayName,
  cleanCatalogString,
  isBrandName,
  STANDARD_CATEGORIES,
  STANDARD_BRANDS,
} from "@/lib/catalog-utils";
import { executeIntelligentSearch, SearchEngineResults } from "@/lib/search/search-engine";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

// ── Apple SVG Logo ──
function AppleLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.7-0.9 2.73 1 .08 1.96-.47 2.58-1.22z" />
    </svg>
  );
}

// ── Built-in Category SVG Icons ──
function CategoryIcon({ catName, className = "w-5 h-5 text-blue-400" }: { catName: string; className?: string }) {
  const norm = (catName || "").toLowerCase();
  if (norm.includes("bud") || norm.includes("earbud") || norm.includes("earphone") || norm.includes("tws")) {
    return <Headphones className={className} />;
  }
  if (norm.includes("phone") || norm.includes("mobile") || norm.includes("smartphone")) {
    return <Smartphone className={className} />;
  }
  if (norm.includes("watch") || norm.includes("wearable")) {
    return <Watch className={className} />;
  }
  if (norm.includes("access") || norm.includes("case") || norm.includes("cover") || norm.includes("charger") || norm.includes("adapter") || norm.includes("cable")) {
    return <ShoppingBag className={className} />;
  }
  if (norm.includes("laptop") || norm.includes("macbook") || norm.includes("tab") || norm.includes("ipad")) {
    return <Laptop className={className} />;
  }
  return <Package className={className} />;
}

export default function ProductsTab({ 
  products, 
  onDelete, 
  onEdit, 
  onAdd,
  categories = [],
  brands = []
}: { 
  products: Product[]; 
  onDelete: (id: string) => void;
  onEdit: (product: Product) => void;
  onAdd: (categoryName?: string) => void;
  categories?: Category[];
  brands?: Brand[];
}) {
  const { isLight } = useAdminTheme();

  // ── Mode Switch: "categories" (Category-First Flow) | "all_products" (Global Table) ──
  const [catalogMode, setCatalogMode] = useState<"categories" | "all_products">("all_products");

  // ── Navigation State: Category & Brand ──
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  // ── Category Selection Page State ──
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>("");
  const [categorySort, setCategorySort] = useState<"name_asc" | "name_desc" | "count_desc" | "count_asc">("name_asc");
  const [categoryViewMode, setCategoryViewMode] = useState<"grid" | "list">("grid");

  // ── Product View Filters & Search (Category or All Products) ──
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [selectedShowcaseFilter, setSelectedShowcaseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recently_updated");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // All Products mode extra dropdown filters
  const [allProdCategoryFilter, setAllProdCategoryFilter] = useState<string>("all");
  const [allProdBrandFilter, setAllProdBrandFilter] = useState<string>("all");

  // Header More Actions Dropdown
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Row More Actions Dropdown (row id or null)
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [isCustomBulkCategory, setIsCustomBulkCategory] = useState(false);
  const [customBulkCategoryText, setCustomBulkCategoryText] = useState("");

  const [bulkBrand, setBulkBrand] = useState<string>("");
  const [isCustomBulkBrand, setIsCustomBulkBrand] = useState(false);
  const [customBulkBrandText, setCustomBulkBrandText] = useState("");

  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);

  // Bulk Offer Campaign Modal State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerModalCategory, setOfferModalCategory] = useState<string>("");
  const [offerModalBrand, setOfferModalBrand] = useState<string>("");
  const [offerModalSelectedIds, setOfferModalSelectedIds] = useState<string[]>([]);

  const handleOpenOfferModal = (category?: string, brand?: string, selectedIds?: string[]) => {
    setOfferModalCategory(category || "");
    setOfferModalBrand(brand || "");
    setOfferModalSelectedIds(selectedIds || []);
    setIsOfferModalOpen(true);
  };

  // Quick Stock Edit State
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<number>(0);
  const [isSavingStock, setIsSavingStock] = useState<boolean>(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (headerMenuRef.current && !headerMenuRef.current.contains(target as Node)) {
        setIsHeaderMenuOpen(false);
      }
      if (target && !target.closest("[data-row-menu]")) {
        setActiveRowMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ── URL History Synchronization (Browser Back / Forward / Direct Link) ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    const readUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("category");
      const brandParam = params.get("brand");
      const modeParam = params.get("catalog_mode");

      if (modeParam === "all_products" || (!modeParam && !catParam)) {
        setCatalogMode("all_products");
      } else {
        setCatalogMode("categories");
      }

      if (catParam) {
        setSelectedCategory(decodeURIComponent(catParam));
        setSelectedBrand(brandParam ? decodeURIComponent(brandParam) : "all");
      } else {
        setSelectedCategory(null);
        setSelectedBrand("all");
      }
    };

    readUrlState();
    window.addEventListener("popstate", readUrlState);
    return () => window.removeEventListener("popstate", readUrlState);
  }, []);

  const syncUrl = useCallback((newMode: "categories" | "all_products", newCat: string | null, newBrand: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);

    if (newMode === "all_products") {
      url.searchParams.set("catalog_mode", "all_products");
      url.searchParams.delete("category");
      url.searchParams.delete("brand");
    } else {
      url.searchParams.delete("catalog_mode");
      if (newCat) {
        url.searchParams.set("category", encodeURIComponent(newCat));
        if (newBrand && newBrand !== "all") {
          url.searchParams.set("brand", encodeURIComponent(newBrand));
        } else {
          url.searchParams.delete("brand");
        }
      } else {
        url.searchParams.delete("category");
        url.searchParams.delete("brand");
      }
    }

    window.history.pushState({}, "", url.toString());
  }, []);

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setSelectedBrand("all");
    setProductSearchQuery("");
    syncUrl("categories", catName, "all");
  };

  const handleSelectBrand = (brandName: string) => {
    setSelectedBrand(brandName);
    syncUrl("categories", selectedCategory, brandName);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedBrand("all");
    setProductSearchQuery("");
    syncUrl("categories", null, "all");
  };

  const handleSwitchMode = (newMode: "categories" | "all_products") => {
    setCatalogMode(newMode);
    if (newMode === "categories") {
      setSelectedCategory(null);
      setSelectedBrand("all");
      syncUrl("categories", null, "all");
    } else {
      syncUrl("all_products", null, "all");
    }
  };

  // ── Stable Normalized Category Counts ──
  // Aggregates counts by normalized key so case differences, leading/trailing spaces combine accurately
  const categoryCountsByKey = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const cat = getProductCategory(p);
      const key = normalizeCategoryKey(cat);
      if (key) {
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  const getCategoryCount = useCallback((keyOrName: string): number => {
    const key = normalizeCategoryKey(keyOrName);
    return categoryCountsByKey[key] || 0;
  }, [categoryCountsByKey]);

  // Backward compatibility alias
  const categoryProductCountMap = categoryCountsByKey;

  // Brand logo map from Firestore brands collection
  const brandLogoMap = useMemo(() => {
    const map: Record<string, string> = {};
    brands.forEach((b) => {
      const nameKey = (b.name || "").toLowerCase().trim();
      const slugKey = (b.slug || "").toLowerCase().trim();
      const logo = b.logo_url || b.icon_url || "";
      if (logo) {
        if (nameKey) map[nameKey] = logo;
        if (slugKey) map[slugKey] = logo;
      }
    });
    return map;
  }, [brands]);

  // Helper to get real image for any category (used for banner view or previews)
  const getCategoryDisplayImage = useCallback((catName: string, categoryDoc?: Category): string | null => {
    if (categoryDoc?.image_url && categoryDoc.image_url.trim()) {
      return categoryDoc.image_url;
    }
    const targetKey = normalizeCategoryKey(catName);
    const matchingProd = products.find((p) => {
      const c = normalizeCategoryKey(getProductCategory(p));
      const hasImg = (p.images && p.images.length > 0 && p.images[0]) || p.image_url || p.image;
      return c === targetKey && Boolean(hasImg);
    });
    if (matchingProd) {
      return matchingProd.images?.[0] || matchingProd.image_url || matchingProd.image || null;
    }
    return null;
  }, [products]);

  // ── Full Dynamic Deduplicated Categories Data List ──
  // Deduplicates categories by normalized key so BAG, bag, " BAG ", BUDS, buds, MIC, mic each appear ONLY ONCE
  const categoryList = useMemo(() => {
    const categoryMap = new Map<string, {
      key: string;
      name: string;
      displayName: string;
      slug: string;
      count: number;
      imageUrl: string | null;
      description: string;
      catDoc?: Category;
    }>();

    // 1. Ingest from Firestore categories collection
    categories.forEach((catDoc) => {
      const rawName = catDoc?.name || "";
      const clean = cleanCatalogString(rawName).trim().replace(/\s+/g, " ");
      if (!clean) return;

      const key = normalizeCategoryKey(clean);
      if (!key) return;

      if (isBrandName(clean) || key === "apple" || key === "samsung" || key === "xiaomi" || key === "redmi") {
        return;
      }

      const existing = categoryMap.get(key);
      const count = getCategoryCount(key);
      const displayName = formatCategoryDisplayName(clean, catDoc.name);
      const slug = catDoc.slug || key.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const imageUrl = getCategoryDisplayImage(clean, catDoc);

      if (!existing) {
        categoryMap.set(key, {
          key,
          name: clean,
          displayName,
          slug,
          count,
          imageUrl,
          description: catDoc.description || "",
          catDoc,
        });
      } else {
        if (!existing.catDoc && catDoc) existing.catDoc = catDoc;
        if (!existing.description && catDoc.description) existing.description = catDoc.description;
        if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
        if (existing.displayName === existing.displayName.toUpperCase() && displayName !== displayName.toUpperCase()) {
          existing.displayName = displayName;
        }
      }
    });

    // 2. Ingest from Products (ensures categories used by products are never lost even without a category document)
    products.forEach((p) => {
      const rawCat = getProductCategory(p);
      const clean = cleanCatalogString(rawCat).trim().replace(/\s+/g, " ");
      if (!clean) return;

      const key = normalizeCategoryKey(clean);
      if (!key) return;

      if (isBrandName(clean) || key === "apple" || key === "samsung" || key === "xiaomi" || key === "redmi") {
        return;
      }

      const existing = categoryMap.get(key);
      const count = getCategoryCount(key);

      if (!existing) {
        const catDoc = categories.find((c) => normalizeCategoryKey(c?.name) === key || normalizeCategoryKey(c?.slug) === key);
        const displayName = formatCategoryDisplayName(clean, catDoc?.name);
        const slug = catDoc?.slug || key.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const imageUrl = getCategoryDisplayImage(clean, catDoc);

        categoryMap.set(key, {
          key,
          name: clean,
          displayName,
          slug,
          count,
          imageUrl,
          description: catDoc?.description || "",
          catDoc,
        });
      }
    });

    return Array.from(categoryMap.values());
  }, [categories, products, getCategoryCount, getCategoryDisplayImage]);

  // ── Real Dynamic Unique Categories & Brands for Dropdowns ──
  const dynamicCategories = useMemo(() => {
    return categoryList.map((c) => c.name);
  }, [categoryList]);

  const dynamicBrands = useMemo(() => {
    const fromProducts = products.map((p) => getProductBrand(p));
    const fromFirestore = brands.map((b) => b?.name || "");
    return sanitizeBrandsList([...fromFirestore, ...fromProducts]);
  }, [brands, products]);

  // ── Filtered & Sorted Categories for Main View ──
  const displayedCategories = useMemo(() => {
    let list = [...categoryList];

    const q = categorySearchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((cat) => {
        const nameMatch = cat.displayName.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q);
        const keyMatch = cat.key.includes(q);
        const slugMatch = cat.slug.toLowerCase().includes(q);
        const descMatch = cat.description.toLowerCase().includes(q);
        return nameMatch || keyMatch || slugMatch || descMatch;
      });
    }

    if (categorySort === "name_asc") {
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else if (categorySort === "name_desc") {
      list.sort((a, b) => b.displayName.localeCompare(a.displayName));
    } else if (categorySort === "count_desc") {
      list.sort((a, b) => b.count - a.count);
    } else if (categorySort === "count_asc") {
      list.sort((a, b) => a.count - b.count);
    }

    return list;
  }, [categoryList, categorySearchQuery, categorySort]);

  // Active Category Object (if a category is currently selected)
  const activeCategoryData = useMemo(() => {
    if (!selectedCategory) return null;
    const targetKey = normalizeCategoryKey(selectedCategory);
    const found = categoryList.find((c) => c.key === targetKey || c.name.toLowerCase() === selectedCategory.toLowerCase());
    if (found) return found;

    return {
      key: targetKey,
      name: selectedCategory,
      displayName: formatCategoryDisplayName(selectedCategory),
      slug: targetKey.replace(/[^a-z0-9]+/g, "-"),
      count: getCategoryCount(targetKey),
      imageUrl: getCategoryDisplayImage(selectedCategory),
      description: "",
      catDoc: undefined,
    };
  }, [selectedCategory, categoryList, getCategoryCount, getCategoryDisplayImage]);

  // All Products in the Selected Category (Matched by normalized key so no products are lost)
  const currentCategoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    const targetKey = normalizeCategoryKey(selectedCategory);
    return products.filter((p) => {
      const cat = getProductCategory(p);
      return normalizeCategoryKey(cat) === targetKey;
    });
  }, [products, selectedCategory]);

  // Brand Selector List for the Selected Category
  const categoryBrandsList = useMemo(() => {
    if (!selectedCategory) return [];

    const brandCounts: Record<string, number> = {};
    currentCategoryProducts.forEach((p) => {
      const b = getProductBrand(p);
      brandCounts[b] = (brandCounts[b] || 0) + 1;
    });

    const allBrandsSet = new Set([...Object.keys(brandCounts)]);
    const list: { name: string; count: number; logoUrl: string | null }[] = [];

    allBrandsSet.forEach((brandName) => {
      const count = brandCounts[brandName] || 0;
      const logoUrl = brandLogoMap[brandName.toLowerCase()] || null;
      list.push({ name: brandName, count, logoUrl });
    });

    list.sort((a, b) => {
      if (a.count > 0 && b.count === 0) return -1;
      if (a.count === 0 && b.count > 0) return 1;
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [selectedCategory, currentCategoryProducts, brandLogoMap]);

  // ── Scoped Products for Active View (Category View or All Products) ──
  const baseScopedProducts = useMemo(() => {
    if (catalogMode === "categories") {
      if (!selectedCategory) return [];
      if (selectedBrand === "all") return currentCategoryProducts;
      return currentCategoryProducts.filter((p) => getProductBrand(p).toLowerCase() === selectedBrand.toLowerCase());
    } else {
      // All Products mode with dropdown filters
      return products.filter((p) => {
        const cat = getProductCategory(p);
        const brand = getProductBrand(p);
        const matchesCat = allProdCategoryFilter === "all" || cat.toLowerCase() === allProdCategoryFilter.toLowerCase();
        const matchesBrand = allProdBrandFilter === "all" || brand.toLowerCase() === allProdBrandFilter.toLowerCase();
        return matchesCat && matchesBrand;
      });
    }
  }, [catalogMode, selectedCategory, selectedBrand, currentCategoryProducts, products, allProdCategoryFilter, allProdBrandFilter]);

  // ── Intelligent Search Engine (Exact Home Webpage Algorithm) ──
  const searchEngineResults = useMemo(() => {
    const q = productSearchQuery.trim();
    if (!q || baseScopedProducts.length === 0) return null;
    return executeIntelligentSearch(q, baseScopedProducts, categories, brands);
  }, [productSearchQuery, baseScopedProducts, categories, brands]);

  // ── Global Intelligent Search for Category Selection Screen (Exact Home Webpage Algorithm) ──
  const mainSearchEngineResults = useMemo(() => {
    const q = categorySearchQuery.trim();
    if (!q || products.length === 0) return null;
    return executeIntelligentSearch(q, products, categories, brands);
  }, [categorySearchQuery, products, categories, brands]);

  // ── Global Intelligent Search for Category View (Cross-category suggestions) ──
  const globalCategorySearchEngineResults = useMemo(() => {
    const q = productSearchQuery.trim();
    if (!q || products.length === 0 || !selectedCategory) return null;
    return executeIntelligentSearch(q, products, categories, brands);
  }, [productSearchQuery, products, selectedCategory, categories, brands]);

  // Filter Scoped Products by Search & Showcase Status
  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.trim();
    let list = baseScopedProducts;

    if (q && searchEngineResults) {
      list = searchEngineResults.products;
    }

    return list.filter((p) => {
      let matchesShowcase = true;
      if (selectedShowcaseFilter === "featured") {
        matchesShowcase = Boolean(p.featured);
      } else if (selectedShowcaseFilter === "new_arrival") {
        matchesShowcase = Boolean(p.is_new_arrival);
      } else if (selectedShowcaseFilter === "discounted") {
        matchesShowcase = Boolean(p.old_price && p.old_price > p.price);
      } else if (selectedShowcaseFilter === "low_stock") {
        const qty = p.variant_combos && p.variant_combos.length > 0
          ? p.variant_combos.reduce((s, v) => s + (Number(v.stock_quantity) || 0), 0)
          : Number(p.stock_quantity ?? p.stock_count ?? (p as any).stock ?? 0);
        matchesShowcase = p.stock_status === "low_stock" || (qty > 0 && qty <= 5);
      } else if (selectedShowcaseFilter === "out_of_stock") {
        const qty = p.variant_combos && p.variant_combos.length > 0
          ? p.variant_combos.reduce((s, v) => s + (Number(v.stock_quantity) || 0), 0)
          : Number(p.stock_quantity ?? p.stock_count ?? (p as any).stock ?? 0);
        matchesShowcase = p.stock_status === "out_of_stock" || qty === 0;
      }

      return matchesShowcase;
    });
  }, [baseScopedProducts, productSearchQuery, searchEngineResults, selectedShowcaseFilter]);

  // Sort Filtered Products (Preserves Intelligent Search Ranking when searching!)
  const sortedProducts = useMemo(() => {
    if (productSearchQuery.trim() && sortBy === "recently_updated") {
      return filteredProducts;
    }

    const list = [...filteredProducts];
    if (sortBy === "recently_updated") {
      return list.sort((a, b) => new Date((b as any).updated_at || (b as any).updatedAt || b.created_at || (b as any).createdAt || 0).getTime() - new Date((a as any).updated_at || (a as any).updatedAt || a.created_at || (a as any).createdAt || 0).getTime());
    }
    if (sortBy === "newest") {
      return list.sort((a, b) => new Date(b.created_at || (b as any).createdAt || 0).getTime() - new Date(a.created_at || (a as any).createdAt || 0).getTime());
    }
    if (sortBy === "oldest") {
      return list.sort((a, b) => new Date(a.created_at || (a as any).createdAt || 0).getTime() - new Date(b.created_at || (b as any).createdAt || 0).getTime());
    }
    if (sortBy === "price_asc") {
      return list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    }
    if (sortBy === "price_desc") {
      return list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }
    if (sortBy === "name_asc") {
      return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    if (sortBy === "stock_asc") {
      return list.sort((a, b) => (Number(a.stock_count || 0)) - (Number(b.stock_count || 0)));
    }
    return list;
  }, [filteredProducts, sortBy, productSearchQuery]);

  // ── Multi-select Handlers ──
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllProductList = (targetList: Product[]) => {
    const listIds = targetList.map((p) => p.id);
    const allSelected = listIds.length > 0 && listIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !listIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...listIds])));
    }
  };

  const selectAllFiltered = () => {
    selectAllProductList(sortedProducts);
  };

  // ── 1-Click Fast Toggle Featured State ──
  const handleToggleFeatured = async (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const newFeatured = !product.featured;
      product.featured = newFeatured;
      await updateDoc(doc(db, "products", product.id), {
        featured: newFeatured,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to toggle featured:", err);
      alert("Failed to update Featured status.");
    }
  };

  // ── 1-Click Fast Toggle New Arrival State ──
  const handleToggleNewArrival = async (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const newArrival = !product.is_new_arrival;
      product.is_new_arrival = newArrival;
      await updateDoc(doc(db, "products", product.id), {
        is_new_arrival: newArrival,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to toggle new arrival:", err);
      alert("Failed to update New Arrival status.");
    }
  };

  // ── Bulk Actions Handlers ──
  const handleBulkSetFeatured = async (featuredState: boolean) => {
    if (selectedProductIds.length === 0) return;
    try {
      setIsUpdatingBulk(true);
      const batch = writeBatch(db);
      selectedProductIds.forEach((id) => {
        const pRef = doc(db, "products", id);
        batch.update(pRef, {
          featured: featuredState,
          updated_at: new Date().toISOString(),
        });
      });
      await batch.commit();
      alert(`Successfully updated ${selectedProductIds.length} products!`);
      setSelectedProductIds([]);
      window.location.reload();
    } catch (err) {
      console.error("Bulk featured update failed:", err);
      alert("Failed to update featured status in bulk.");
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const handleBulkSetNewArrival = async (newArrivalState: boolean) => {
    if (selectedProductIds.length === 0) return;
    try {
      setIsUpdatingBulk(true);
      const batch = writeBatch(db);
      selectedProductIds.forEach((id) => {
        const pRef = doc(db, "products", id);
        batch.update(pRef, {
          is_new_arrival: newArrivalState,
          updated_at: new Date().toISOString(),
        });
      });
      await batch.commit();
      alert(`Successfully updated ${selectedProductIds.length} products!`);
      setSelectedProductIds([]);
      window.location.reload();
    } catch (err) {
      console.error("Bulk new arrival update failed:", err);
      alert("Failed to update new arrival status in bulk.");
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  // ── Quick Inline Stock Editor Save Handler ──
  const handleQuickStockSave = async (product: Product) => {
    try {
      setIsSavingStock(true);
      const newQty = Math.max(0, Number(tempStockValue) || 0);
      const newStatus = newQty === 0 ? "out_of_stock" : newQty <= 5 ? "low_stock" : "in_stock";

      let updatedVariants = product.variant_combos;
      if (Array.isArray(updatedVariants) && updatedVariants.length > 0) {
        updatedVariants = updatedVariants.map((v) => ({
          ...v,
          stock_quantity: newQty,
          available_stock: newQty,
        }));
      }

      const updateData: Record<string, any> = {
        stock_quantity: newQty,
        stock_count: newQty,
        stock_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (updatedVariants) updateData.variant_combos = updatedVariants;

      await setDoc(doc(db, "products", product.id), updateData, { merge: true });

      product.stock_quantity = newQty;
      product.stock_count = newQty;
      product.stock_status = newStatus;
      if (updatedVariants) product.variant_combos = updatedVariants;
      setEditingStockId(null);
    } catch (e) {
      console.error("Failed to update stock:", e);
      alert("Failed to update stock quantity.");
    } finally {
      setIsSavingStock(false);
    }
  };

  // ── Bulk Move Category ──
  const handleApplyBulkCategory = async () => {
    const finalCategory = isCustomBulkCategory ? customBulkCategoryText.trim() : bulkCategory.trim();
    if (!finalCategory || selectedProductIds.length === 0) return;
    try {
      setIsUpdatingBulk(true);
      const batch = writeBatch(db);
      const targetSlug = finalCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      selectedProductIds.forEach((id) => {
        const pRef = doc(db, "products", id);
        batch.update(pRef, {
          category_name: finalCategory,
          categoryName: finalCategory,
          category_slug: targetSlug,
          categorySlug: targetSlug,
          categoryId: targetSlug,
          category_id: targetSlug,
          category: finalCategory,
          updated_at: new Date().toISOString(),
        });
      });

      await batch.commit();
      alert(`Successfully updated Category to "${finalCategory}" for ${selectedProductIds.length} products!`);
      setSelectedProductIds([]);
      setBulkCategory("");
      setCustomBulkCategoryText("");
      setIsCustomBulkCategory(false);
      window.location.reload();
    } catch (e) {
      console.error("Error bulk updating category:", e);
      alert("Failed to update products in bulk.");
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  // ── Bulk Move Brand ──
  const handleApplyBulkBrand = async () => {
    const finalBrand = isCustomBulkBrand ? customBulkBrandText.trim() : bulkBrand.trim();
    if (!finalBrand || selectedProductIds.length === 0) return;
    try {
      setIsUpdatingBulk(true);
      const batch = writeBatch(db);

      selectedProductIds.forEach((id) => {
        const pRef = doc(db, "products", id);
        batch.update(pRef, {
          brand_name: finalBrand,
          brandName: finalBrand,
          brand: finalBrand,
          updated_at: new Date().toISOString(),
        });
      });

      await batch.commit();
      alert(`Successfully updated Brand to "${finalBrand}" for ${selectedProductIds.length} products!`);
      setSelectedProductIds([]);
      setBulkBrand("");
      setCustomBulkBrandText("");
      setIsCustomBulkBrand(false);
      window.location.reload();
    } catch (e) {
      console.error("Error bulk updating brand:", e);
      alert("Failed to update products in bulk.");
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  // ── Single Product Quick Reassign State (Category & Brand) ──
  const [reassignProduct, setReassignProduct] = useState<Product | null>(null);
  const [targetNewCategory, setTargetNewCategory] = useState<string>("");
  const [isCustomReassignCategory, setIsCustomReassignCategory] = useState<boolean>(false);
  const [customReassignCategoryText, setCustomReassignCategoryText] = useState<string>("");
  const [targetNewBrand, setTargetNewBrand] = useState<string>("");
  const [isCustomReassignBrand, setIsCustomReassignBrand] = useState<boolean>(false);
  const [customReassignBrandText, setCustomReassignBrandText] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  const handleOpenReassign = (product: Product) => {
    setReassignProduct(product);
    const curCat = getProductCategory(product);
    const curBrand = getProductBrand(product);
    setTargetNewCategory(curCat);
    setIsCustomReassignCategory(false);
    setCustomReassignCategoryText("");
    setTargetNewBrand(curBrand);
    setIsCustomReassignBrand(false);
    setCustomReassignBrandText("");
  };

  const handleSaveReassign = async () => {
    if (!reassignProduct) return;
    const finalCat = isCustomReassignCategory ? customReassignCategoryText.trim() : targetNewCategory.trim();
    const finalBrand = isCustomReassignBrand ? customReassignBrandText.trim() : targetNewBrand.trim();

    if (!finalCat) {
      alert("Please select or enter a Category.");
      return;
    }
    if (!finalBrand) {
      alert("Please select or enter a Brand.");
      return;
    }

    try {
      setIsReassigning(true);
      const catSlug = finalCat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const brandSlug = finalBrand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const updatePayload: Record<string, any> = {
        category_name: finalCat,
        categoryName: finalCat,
        category: finalCat,
        category_slug: catSlug,
        categorySlug: catSlug,
        categoryId: `cat-${catSlug}`,
        category_id: `cat-${catSlug}`,
        brand: finalBrand,
        brand_name: finalBrand,
        brandName: finalBrand,
        brand_id: `brand-${brandSlug}`,
        brand_slug: brandSlug,
        brandId: `brand-${brandSlug}`,
        brandSlug: brandSlug,
        updated_at: new Date().toISOString(),
      };

      await updateDoc(doc(db, "products", reassignProduct.id), updatePayload);
      Object.assign(reassignProduct, updatePayload);
      alert(`Successfully moved "${reassignProduct.name}" to [${finalCat}] → [${finalBrand}]!`);
      setReassignProduct(null);
    } catch (err) {
      console.error("Failed to reassign category and brand:", err);
      alert("Failed to move product. Please try again.");
    } finally {
      setIsReassigning(false);
    }
  };

  // ── 1-Click Catalog Auto-Standardizer ──
  const handleStandardizeCatalogData = async () => {
    if (!confirm("Standardize database? This will assign correct Category & Brand to all products.")) return;
    try {
      setIsNormalizing(true);
      const batch = writeBatch(db);
      let count = 0;

      products.forEach((p) => {
        const correctCat = getProductCategory(p);
        const correctBrand = getProductBrand(p);
        const pRef = doc(db, "products", p.id);
        batch.update(pRef, {
          category_name: correctCat,
          categoryName: correctCat,
          brand_name: correctBrand,
          brandName: correctBrand,
          brand: correctBrand,
          updated_at: new Date().toISOString(),
        });
        count++;
      });

      await batch.commit();
      alert(`Successfully standardized ${count} products in Firestore!`);
      window.location.reload();
    } catch (e) {
      console.error("Standardization failed:", e);
      alert("Failed to standardize database.");
    } finally {
      setIsNormalizing(false);
    }
  };

  // ── Real Dynamic Metrics ──
  const totalCount = products.length;
  const totalFeaturedCount = products.filter((p) => p.featured).length;
  const totalNewArrivalsCount = products.filter((p) => p.is_new_arrival).length;
  const inStockCount = products.filter((p) => p.stock_status === "in_stock").length;
  const lowStockCount = products.filter((p) => p.stock_status === "low_stock").length;
  const outOfStockCount = products.filter((p) => p.stock_status === "out_of_stock").length;

  // ── Unified High-Performance Product Table / Grid Renderer ──
  const renderProductTableContent = (
    productsList: Product[],
    options?: {
      showCategory?: boolean;
      emptyTitle?: string;
      emptySubtitle?: string;
      onResetAction?: () => void;
      resetActionText?: string;
    }
  ) => {
    const showCat = options?.showCategory ?? true;
    const isAllSelected = productsList.length > 0 && productsList.every((p) => selectedProductIds.includes(p.id));

    if (productsList.length === 0) {
      return (
        <div className={`border border-dashed rounded-2xl p-12 text-center space-y-3 ${
          isLight ? "bg-white border-[#E5E7EB] text-slate-500" : "bg-[#0E141D] border-white/[0.08] text-slate-400"
        }`}>
          <Package className="w-10 h-10 mx-auto opacity-40 text-blue-500" />
          <div>
            <p className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
              {options?.emptyTitle || "No products found"}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {options?.emptySubtitle || "Try adjusting your search terms or filters."}
            </p>
          </div>
          {options?.onResetAction && (
            <div className="pt-2">
              <button
                type="button"
                onClick={options.onResetAction}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{options.resetActionText || "Reset"}</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {productsList.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);
            const stockQty = product.variant_combos && product.variant_combos.length > 0
              ? product.variant_combos.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0)
              : Number(product.stock_quantity ?? product.stock_count ?? (product as any).stock ?? 0);
            const brandName = getProductBrand(product);
            const catName = getProductCategory(product);

            return (
              <div
                key={product.id}
                className={`rounded-2xl p-3 border transition-all flex flex-col justify-between ${
                  isSelected
                    ? isLight ? "bg-blue-50 border-blue-500" : "bg-blue-900/20 border-blue-500"
                    : isLight ? "bg-white border-slate-200 hover:border-slate-300" : "bg-[#0E141D] border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-bold uppercase truncate max-w-[90px]">
                      {brandName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="w-full h-24 flex items-center justify-center p-2 rounded-xl bg-black/20 mb-2 cursor-pointer group"
                    title="Edit product"
                  >
                    {product.images && product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                    ) : (
                      <Smartphone className="w-8 h-8 text-slate-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className={`font-bold text-xs line-clamp-2 hover:underline text-left cursor-pointer ${
                      isLight ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {product.name}
                  </button>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">SKU: {product.sku || product.code || "—"}</p>
                  <p className={`text-sm font-bold font-mono mt-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                    {formatPrice(product.price)}
                  </p>
                </div>

                <div className={`flex items-center justify-between pt-3 mt-3 border-t ${
                  isLight ? "border-slate-100" : "border-white/[0.06]"
                }`}>
                  <span className="text-xs font-mono text-slate-400">{stockQty} units</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      className="px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold hover:bg-blue-600/30 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(product.id)}
                      className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={`rounded-2xl border overflow-hidden ${
        isLight ? "bg-white border-[#E5E7EB] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-semibold uppercase tracking-wider ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-[#080C12]/80 border-white/[0.06] text-[#94A3B8]"
              }`}>
                <th className="py-3 pl-4 pr-2 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={isAllSelected}
                    onChange={() => selectAllProductList(productsList)}
                    className="rounded border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-semibold">Product</th>
                {showCat && <th className="py-3 px-4 font-semibold">Category</th>}
                <th className="py-3 px-4 font-semibold">Brand</th>
                <th className="py-3 px-4 font-semibold">SKU</th>
                <th className="py-3 px-4 font-semibold">Price</th>
                <th className="py-3 px-4 font-semibold">Stock</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Tags</th>
                <th className="py-3 pr-6 pl-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? "divide-slate-100" : "divide-white/[0.03]"}`}>
              {productsList.map((product) => {
                const isSelected = selectedProductIds.includes(product.id);
                const stockQty = product.variant_combos && product.variant_combos.length > 0
                  ? product.variant_combos.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0)
                  : Number(product.stock_quantity ?? product.stock_count ?? (product as any).stock ?? 0);
                const isEditingStock = editingStockId === product.id;
                const isFeatured = Boolean(product.featured);
                const isNew = Boolean(product.is_new_arrival);
                const catName = getProductCategory(product);
                const brandName = getProductBrand(product);
                const brandLogo = brandLogoMap[brandName.toLowerCase()];
                const isApple = brandName.toLowerCase() === "apple";

                return (
                  <tr
                    key={product.id}
                    className={`transition-colors ${
                      isSelected
                        ? isLight ? "bg-blue-50/80" : "bg-blue-600/10"
                        : isLight ? "hover:bg-slate-50/80" : "hover:bg-white/[0.025]"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 pl-4 pr-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Select ${product.name}`}
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(product.id)}
                        className="rounded border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Product */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onEdit(product)}
                          className="shrink-0 text-left cursor-pointer group focus:outline-none"
                          title="Click to edit product"
                        >
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className={`w-10 h-10 object-contain rounded-xl p-1 shrink-0 border transition-transform group-hover:scale-105 ${
                                isLight ? "bg-slate-100 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
                              }`}
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                              isLight ? "bg-slate-100 border-slate-200 text-slate-400" : "bg-[#121A25] border-white/[0.08] text-slate-500"
                            }`}>
                              <Smartphone className="w-5 h-5" />
                            </div>
                          )}
                        </button>

                        <div className="min-w-0 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => onEdit(product)}
                            className={`font-semibold text-xs leading-snug line-clamp-1 text-left hover:underline cursor-pointer ${
                              isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                            }`}
                            title={product.name}
                          >
                            {product.name}
                          </button>
                          <p className={`text-[11px] font-mono ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
                            {product.sku || product.code || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category (Optional) */}
                    {showCat && (
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setCategorySearchQuery("");
                            setProductSearchQuery("");
                            handleSelectCategory(catName);
                          }}
                          className="px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          title={`Browse category: ${catName}`}
                        >
                          <span>{catName}</span>
                          <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      </td>
                    )}

                    {/* Brand */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {brandLogo ? (
                          <img src={brandLogo} alt={brandName} className="w-4 h-4 object-contain rounded-sm" />
                        ) : isApple ? (
                          <AppleLogo className={`w-3.5 h-3.5 ${isLight ? "text-slate-700" : "text-slate-300"}`} />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-blue-500/80" />
                        )}
                        <span className={`font-semibold text-xs ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                          {brandName}
                        </span>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className={`py-3.5 px-4 font-mono text-xs ${isLight ? "text-slate-600" : "text-[#94A3B8]"}`}>
                      {product.sku || product.code || "—"}
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className={`font-bold font-mono text-xs ${isLight ? "text-[#111827]" : "text-white"}`}>
                          {formatPrice(product.price)}
                        </p>
                        {product.old_price && product.old_price > product.price && (
                          <p className={`text-[10px] line-through font-mono ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                            {formatPrice(product.old_price)}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="py-3.5 px-4 font-mono">
                      {isEditingStock ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min="0"
                            value={tempStockValue}
                            onChange={(e) => setTempStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                            className={`w-16 px-2 py-1 rounded-lg text-xs font-bold focus:outline-none border ${
                              isLight
                                ? "bg-white border-blue-500 text-slate-900"
                                : "bg-black border-blue-500 text-white"
                            }`}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickStockSave(product)}
                            disabled={isSavingStock}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            title="Save Stock"
                          >
                            {isSavingStock ? "..." : <Check className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStockId(null)}
                            className={`px-1.5 py-1 rounded-lg text-[10px] cursor-pointer ${
                              isLight ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStockId(product.id);
                            setTempStockValue(stockQty);
                          }}
                          className={`font-medium hover:underline cursor-pointer text-left ${
                            isLight ? "text-slate-700" : "text-slate-300"
                          }`}
                          title="Click to edit stock"
                        >
                          <span>{stockQty} units</span>
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {product.stock_status === "in_stock" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>In stock</span>
                        </span>
                      )}
                      {product.stock_status === "low_stock" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Low stock</span>
                        </span>
                      )}
                      {product.stock_status === "out_of_stock" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span>Out of stock</span>
                        </span>
                      )}
                    </td>

                    {/* Tags */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFeatured(product, e)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isFeatured
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25"
                              : isLight
                              ? "bg-transparent text-slate-400 border-transparent hover:border-slate-300 hover:text-slate-600"
                              : "bg-transparent text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300"
                          }`}
                          title="Toggle Featured status"
                        >
                          <Star className={`w-2.5 h-2.5 ${isFeatured ? "fill-amber-400 text-amber-400" : ""}`} />
                          <span>Featured</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleToggleNewArrival(product, e)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isNew
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/40 hover:bg-blue-500/25"
                              : isLight
                              ? "bg-transparent text-slate-400 border-transparent hover:border-slate-300 hover:text-slate-600"
                              : "bg-transparent text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300"
                          }`}
                          title="Toggle New Arrival status"
                        >
                          <span>New</span>
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-6 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onEdit(product)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isLight
                              ? "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                              : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border-blue-500/30"
                          }`}
                          title="Edit Product"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-500" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(product.id)}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer text-red-500 hover:text-red-400 ${
                            isLight ? "border-slate-200 hover:bg-red-50" : "border-white/[0.08] hover:bg-red-500/10"
                          }`}
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="relative inline-block text-left" data-row-menu={product.id}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRowMenuId(activeRowMenuId === product.id ? null : product.id);
                            }}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                              isLight
                                ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                                : "border-white/[0.08] bg-[#121A25] hover:bg-white/10 text-slate-400 hover:text-white"
                            }`}
                            title="More Row Actions"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {activeRowMenuId === product.id && (
                            <div
                              className={`absolute right-0 mt-1.5 w-44 rounded-xl p-1 shadow-2xl border z-30 animate-in fade-in slide-in-from-top-2 ${
                                isLight
                                  ? "bg-white border-slate-200 text-slate-800"
                                  : "bg-[#0E141D] border-white/[0.1] text-[#F8FAFC]"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowMenuId(null);
                                  onEdit(product);
                                }}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                                  isLight ? "hover:bg-slate-100" : "hover:bg-white/5"
                                }`}
                              >
                                <Edit className="w-3.5 h-3.5 text-blue-400" />
                                <span>Edit Product</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowMenuId(null);
                                  handleOpenReassign(product);
                                }}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                                  isLight ? "hover:bg-slate-100" : "hover:bg-white/5"
                                }`}
                              >
                                <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                                <span>Change Category</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowMenuId(null);
                                  setEditingStockId(product.id);
                                  setTempStockValue(stockQty);
                                }}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                                  isLight ? "hover:bg-slate-100" : "hover:bg-white/5"
                                }`}
                              >
                                <Package className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Quick Stock Edit</span>
                              </button>

                              <div className={`my-1 border-t ${isLight ? "border-slate-100" : "border-white/[0.06]"}`} />

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowMenuId(null);
                                  onDelete(product.id);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Product</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-5 relative pb-28 font-sans ${isLight ? "text-[#111827]" : "text-[#F8FAFC]"}`}>
      
      {/* ════════════════════════════════════════════════════════════════════
         1. COMPACT PROFESSIONAL HEADER & MODE TOGGLE
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Product Catalog
            </h1>

            {/* Mode Switcher Pill: [ Categories ] [ All Products ] */}
            <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
            }`}>
              <button
                type="button"
                onClick={() => handleSwitchMode("categories")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  catalogMode === "categories"
                    ? isLight
                      ? "bg-white text-blue-600 shadow-xs font-bold"
                      : "bg-[#2563EB] text-white font-bold shadow-sm"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-[#94A3B8] hover:text-white"
                }`}
              >
                Categories
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("all_products")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  catalogMode === "all_products"
                    ? isLight
                      ? "bg-white text-blue-600 shadow-xs font-bold"
                      : "bg-[#2563EB] text-white font-bold shadow-sm"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-[#94A3B8] hover:text-white"
                }`}
              >
                All Products
              </button>
            </div>
          </div>

          <p className={`text-xs sm:text-sm mt-0.5 ${isLight ? "text-[#667085]" : "text-[#94A3B8]"}`}>
            {catalogMode === "categories" && !selectedCategory
              ? "Manage products by category. Click a category to view brands and products."
              : catalogMode === "categories" && selectedCategory
              ? `Browsing category ${selectedCategory}`
              : "Complete inventory management and bulk actions across all catalog products."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Header More (...) Menu */}
          <div className="relative" ref={headerMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsHeaderMenuOpen(!isHeaderMenuOpen);
              }}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isLight
                  ? "bg-white hover:bg-slate-50 border-[#E5E7EB] text-[#374151]"
                  : "bg-[#0E141D] hover:bg-[#121A25] border-white/[0.08] text-[#94A3B8] hover:text-white"
              }`}
              title="More Actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isHeaderMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-56 rounded-2xl p-1.5 shadow-2xl border z-30 animate-in fade-in slide-in-from-top-2 ${
                  isLight
                    ? "bg-white border-[#E5E7EB] text-[#111827]"
                    : "bg-[#0E141D] border-white/[0.1] text-[#F8FAFC]"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    handleOpenOfferModal(selectedCategory || undefined);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                    isLight ? "hover:bg-slate-100 text-amber-600" : "hover:bg-white/5 text-amber-400"
                  }`}
                >
                  <Tag className="w-4 h-4 text-amber-500" />
                  <span>Bulk Offer Manager</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    handleStandardizeCatalogData();
                  }}
                  disabled={isNormalizing}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                    isLight ? "hover:bg-slate-100 text-emerald-600" : "hover:bg-white/5 text-emerald-400"
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-500 ${isNormalizing ? "animate-spin" : ""}`} />
                  <span>Auto-Fix Catalog Data</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary CTA: + Add Product */}
          <button
            type="button"
            onClick={() => onAdd(selectedCategory || undefined)}
            className="px-4 sm:px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
         2. 6 SUMMARY METRIC CARDS (Always Real dynamic metrics)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Products */}
        <div className={`p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3.5 ${
          isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-[#38BDF8] shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              Total Products
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h4 className="text-xl font-bold font-mono tracking-tight">
                {totalCount}
              </h4>
              
            </div>
          </div>
        </div>

        {/* Featured */}
        <div className={`p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3.5 ${
          isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              Featured
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h4 className="text-xl font-bold font-mono tracking-tight text-amber-500 dark:text-amber-400">
                {totalFeaturedCount}
              </h4>
              
            </div>
          </div>
        </div>

        {/* New Arrivals */}
        <div className={`p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3.5 ${
          isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
            <Rocket className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              New Arrivals
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h4 className="text-xl font-bold font-mono tracking-tight text-purple-500 dark:text-purple-400">
                {totalNewArrivalsCount}
              </h4>
              
            </div>
          </div>
        </div>

        {/* In Stock */}
        <div className={`p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3.5 ${
          isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              In Stock
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h4 className="text-xl font-bold font-mono tracking-tight text-emerald-500 dark:text-emerald-400">
                {inStockCount}
              </h4>
              
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className={`p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3.5 ${
          isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              Low Stock
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h4 className="text-xl font-bold font-mono tracking-tight text-amber-500 dark:text-amber-400">
                {lowStockCount}
              </h4>
              
            </div>
          </div>
        </div>

        {/* Out of Stock */}
        <div className={`p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3.5 ${
          isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
              Out of Stock
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h4 className="text-xl font-bold font-mono tracking-tight text-red-500 dark:text-red-400">
                {outOfStockCount}
              </h4>
              
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
         3. VIEW 1: CATEGORY SELECTION PAGE (Main default screen)
      ════════════════════════════════════════════════════════════════════ */}
      {catalogMode === "categories" && !selectedCategory && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Category Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Categories and Products */}
            <div className="relative flex-1 max-w-lg">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`} />
              <input
                type="text"
                placeholder="Search products, categories, SKU or brand (e.g. s24, airpods, buds, charger)..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-medium outline-none border transition-all ${
                  isLight
                    ? "bg-white border-[#E5E7EB] text-[#111827] placeholder-slate-400 focus:border-blue-500"
                    : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC] placeholder-slate-500 focus:border-blue-500"
                }`}
              />
              {categorySearchQuery && (
                <button
                  type="button"
                  onClick={() => setCategorySearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort & View Toggle */}
            <div className="flex items-center gap-3">
              {/* Category Sort */}
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Sort:</span>
                <div className="relative">
                  <select
                    value={categorySort}
                    onChange={(e) => setCategorySort(e.target.value as any)}
                    className={`appearance-none pl-3 pr-7 py-2 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                      isLight
                        ? "bg-white border-[#E5E7EB] text-[#111827]"
                        : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
                    }`}
                  >
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="count_desc">Product Count (High to Low)</option>
                    <option value="count_asc">Product Count (Low to High)</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                </div>
              </div>

              {/* View Mode Toggle: [ Grid ] [ List ] */}
              <div className={`flex items-center p-0.5 rounded-xl border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryViewMode("grid");
                    setViewMode("grid");
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    (categorySearchQuery.trim() ? viewMode === "grid" : categoryViewMode === "grid")
                      ? isLight ? "bg-white text-blue-600 shadow-xs" : "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryViewMode("list");
                    setViewMode("table");
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    (categorySearchQuery.trim() ? viewMode === "table" : categoryViewMode === "list")
                      ? isLight ? "bg-white text-blue-600 shadow-xs" : "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="List / Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {categorySearchQuery.trim().length > 0 ? (
            /* ── INSTANT INTELLIGENT SEARCH RESULTS VIEW (Exact Home Webpage Algorithm) ── */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Search Result Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold tracking-tight">
                    Instant Search Results:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                    {mainSearchEngineResults?.products.length || 0} product{(mainSearchEngineResults?.products.length || 0) === 1 ? "" : "s"} found
                  </span>
                  <span className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    for &ldquo;<strong className={isLight ? "text-slate-900" : "text-white"}>{categorySearchQuery}</strong>&rdquo;
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCategorySearchQuery("")}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                      isLight
                        ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
                        : "border-white/[0.1] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Search (View Categories)</span>
                  </button>
                </div>
              </div>

              {/* Typo Correction ("Did You Mean") Suggestion Chip */}
              {mainSearchEngineResults?.didYouMean && (
                <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  isLight ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-500/10 border-amber-500/20 text-amber-200"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Did you mean:{" "}
                      <button
                        type="button"
                        onClick={() => setCategorySearchQuery(mainSearchEngineResults.didYouMean!)}
                        className="font-bold underline text-amber-400 hover:text-amber-300 cursor-pointer ml-1"
                      >
                        &ldquo;{mainSearchEngineResults.didYouMean}&rdquo;
                      </button>
                      ?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategorySearchQuery(mainSearchEngineResults.didYouMean!)}
                    className="px-2.5 py-1 bg-amber-500 text-black font-bold rounded-lg text-[11px] hover:bg-amber-400 transition-colors cursor-pointer shrink-0"
                  >
                    Apply Correction
                  </button>
                </div>
              )}

              {/* Matching Categories (Text Only Cards) */}
              {displayedCategories.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Matching Categories ({displayedCategories.length}):
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                    {displayedCategories.map((cat) => (
                      <div
                        key={cat.key}
                        onClick={() => {
                          setCategorySearchQuery("");
                          handleSelectCategory(cat.name);
                        }}
                        className={`group rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                          isLight
                            ? "bg-white hover:bg-slate-50/80 border-[#E5E7EB] hover:border-blue-400 shadow-xs hover:shadow-md"
                            : "bg-[#0E141D] hover:bg-[#121A25] border-white/[0.08] hover:border-white/20 hover:shadow-lg"
                        }`}
                      >
                        <div className="min-w-0">
                          <h3
                            className={`text-sm sm:text-[15px] font-bold tracking-tight truncate leading-snug ${
                              isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                            }`}
                            title={cat.displayName}
                          >
                            {cat.displayName}
                          </h3>
                          <p className={`text-xs font-medium mt-1 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
                            {cat.count} {cat.count === 1 ? "product" : "products"}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-blue-400/80 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instant Search Product Table / Grid */}
              {renderProductTableContent(mainSearchEngineResults?.products || [], {
                showCategory: true,
                emptyTitle: `No products found matching "${categorySearchQuery}"`,
                emptySubtitle: "Try checking for typos or searching by brand, model, SKU, or category name.",
                onResetAction: () => setCategorySearchQuery(""),
                resetActionText: "Back to All Categories",
              })}
            </div>
          ) : (
            /* ── ALL CATEGORIES GRID / LIST VIEW (Default Screen) ── */
            <>
              {/* Section Header */}
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">
                  All Categories <span className={`text-xs font-normal ml-1 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>({displayedCategories.length})</span>
                </h2>
              </div>

              {/* Category Cards Display */}
              {displayedCategories.length === 0 ? (
                <div className={`border border-dashed rounded-2xl p-12 text-center space-y-3 ${
                  isLight ? "bg-white border-[#E5E7EB] text-slate-500" : "bg-[#0E141D] border-white/[0.08] text-slate-400"
                }`}>
                  <FolderTree className="w-10 h-10 mx-auto opacity-40 text-blue-500" />
                  <div>
                    <p className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                      No categories found
                    </p>
                    <p className="text-xs mt-1 opacity-70">
                      Try clearing your search query to see all categories.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategorySearchQuery("")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Search</span>
                  </button>
                </div>
              ) : categoryViewMode === "grid" ? (
                /* Category Grid View (Clean 4-Column Responsive Layout - TEXT ONLY, NO ICONS/IMAGES) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {displayedCategories.map((cat) => (
                    <div
                      key={cat.key}
                      onClick={() => handleSelectCategory(cat.name)}
                      className={`group rounded-2xl p-4 sm:p-5 border transition-all duration-150 cursor-pointer flex items-center justify-between gap-4 ${
                        isLight
                          ? "bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] hover:border-blue-500/40 shadow-xs hover:shadow-sm"
                          : "bg-[#0E141D] hover:bg-[#121A25] border-white/[0.08] hover:border-white/[0.14] shadow-xs"
                      }`}
                    >
                      {/* Left: Category Name + Product Count (TEXT ONLY) */}
                      <div className="min-w-0">
                        <h3
                          className={`text-sm sm:text-[15px] font-bold tracking-tight truncate leading-snug ${
                            isLight ? "text-[#0F172A]" : "text-[#F8FAFC]"
                          }`}
                          title={cat.displayName}
                        >
                          {cat.displayName}
                        </h3>
                        <p className={`text-xs font-medium mt-1 ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
                          {cat.count} {cat.count === 1 ? "product" : "products"}
                        </p>
                      </div>

                      {/* Right: Arrow on Right (moves slightly on hover) */}
                      <ChevronRight className="w-4 h-4 text-blue-500/70 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                /* Category List View (Clean Compact Rows - TEXT ONLY, NO ICONS/IMAGES) */
                <div className={`rounded-2xl border divide-y overflow-hidden ${
                  isLight ? "bg-white border-[#E5E7EB] divide-slate-100 shadow-xs" : "bg-[#0E141D] border-white/[0.08] divide-white/[0.04]"
                }`}>
                  {displayedCategories.map((cat) => (
                    <div
                      key={cat.key}
                      onClick={() => handleSelectCategory(cat.name)}
                      className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors group ${
                        isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="min-w-0">
                        <h4 className={`text-sm sm:text-base font-bold tracking-tight ${isLight ? "text-[#111827]" : "text-[#F8FAFC]"}`}>
                          {cat.displayName}
                        </h4>
                        {cat.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{cat.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold ${isLight ? "text-slate-600" : "text-[#94A3B8]"}`}>
                          {cat.count} {cat.count === 1 ? "product" : "products"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         4. VIEW 2: CATEGORY PRODUCT VIEW (When Category is Clicked)
      ════════════════════════════════════════════════════════════════════ */}
      {catalogMode === "categories" && selectedCategory && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Breadcrumbs & Back Navigation */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBackToCategories}
                className={`p-1.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isLight
                    ? "bg-white hover:bg-slate-100 border-[#E5E7EB] text-slate-700"
                    : "bg-[#0E141D] hover:bg-[#121A25] border-white/[0.08] text-slate-300 hover:text-white"
                }`}
                title="Back to Categories"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 font-medium">
                <button
                  type="button"
                  onClick={handleBackToCategories}
                  className={`hover:underline cursor-pointer ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}
                >
                  Product Catalog
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                <button
                  type="button"
                  onClick={() => handleSelectBrand("all")}
                  className={`font-bold hover:underline cursor-pointer ${
                    selectedBrand === "all"
                      ? isLight ? "text-[#111827]" : "text-white"
                      : isLight ? "text-slate-500" : "text-[#94A3B8]"
                  }`}
                >
                  {selectedCategory}
                </button>
                {selectedBrand !== "all" && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className={`font-bold ${isLight ? "text-[#111827]" : "text-white"}`}>
                      {selectedBrand}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleBackToCategories}
              className={`text-xs font-semibold hover:underline hidden sm:inline-block cursor-pointer ${
                isLight ? "text-blue-600" : "text-blue-400"
              }`}
            >
              ← Back to Categories
            </button>
          </div>

          {/* Category Header Banner Card */}
          <div className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isLight ? "bg-white border-[#E5E7EB] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
          }`}>
            <div className="flex items-center gap-3.5">
              {/* Category Large Image */}
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center p-1.5 shrink-0 overflow-hidden border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
              }`}>
                {activeCategoryData?.imageUrl ? (
                  <img
                    src={activeCategoryData.imageUrl}
                    alt={selectedCategory}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <CategoryIcon catName={selectedCategory} className="w-7 h-7 text-blue-400" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight">
                    {selectedCategory}
                  </h2>
                  {selectedBrand !== "all" && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">
                      {selectedBrand}
                    </span>
                  )}
                </div>
                {activeCategoryData?.description ? (
                  <p className={`text-xs mt-0.5 line-clamp-1 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
                    {activeCategoryData.description}
                  </p>
                ) : (
                  <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
                    Category inventory and brand management.
                  </p>
                )}
              </div>
            </div>

            {/* Right: Category Count Badge + Actions */}
            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/[0.08] text-white"
              }`}>
                {currentCategoryProducts.length} {currentCategoryProducts.length === 1 ? "product" : "products"}
              </span>

              <button
                type="button"
                onClick={() => handleOpenOfferModal(selectedCategory, selectedBrand !== "all" ? selectedBrand : undefined)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                title={`Apply offer to ${selectedCategory}`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Offer</span>
              </button>

              <button
                type="button"
                onClick={() => onAdd(selectedCategory)}
                className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Horizontal Brand Selector (prominent scrollable bar) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Brands</span>
              {categoryBrandsList.length > 6 && (
                <span className="text-[10px] lowercase text-slate-500 font-normal">scroll for more &rarr;</span>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none touch-pan-x">
              {/* All Brands Pill */}
              <button
                type="button"
                onClick={() => handleSelectBrand("all")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                  selectedBrand === "all"
                    ? "bg-[#2563EB] text-white border-blue-600 shadow-sm"
                    : isLight
                    ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-[#0E141D] hover:bg-[#121A25] border-white/[0.08] text-[#94A3B8] hover:text-white"
                }`}
              >
                <span>All Brands</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  selectedBrand === "all" ? "bg-white/20 text-white" : isLight ? "bg-slate-100 text-slate-600" : "bg-white/10 text-slate-300"
                }`}>
                  {currentCategoryProducts.length}
                </span>
              </button>

              {/* Individual Brand Pills */}
              {categoryBrandsList.map((brandItem) => {
                const isSelected = selectedBrand.toLowerCase() === brandItem.name.toLowerCase();
                const isApple = brandItem.name.toLowerCase() === "apple";

                return (
                  <button
                    key={brandItem.name}
                    type="button"
                    onClick={() => handleSelectBrand(brandItem.name)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                      isSelected
                        ? isLight
                          ? "bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500/20"
                          : "bg-blue-600/20 border-blue-500 text-white font-bold ring-2 ring-blue-500/30"
                        : isLight
                        ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        : "bg-[#0E141D] hover:bg-[#121A25] border-white/[0.08] text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    {/* Brand Logo / Icon */}
                    {brandItem.logoUrl ? (
                      <img
                        src={brandItem.logoUrl}
                        alt={brandItem.name}
                        className="w-4 h-4 object-contain rounded-sm"
                      />
                    ) : isApple ? (
                      <AppleLogo className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    ) : (
                      <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-blue-400" : "bg-slate-600"}`} />
                    )}

                    <span>{brandItem.name}</span>

                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isSelected
                        ? isLight ? "bg-blue-200/60 text-blue-900" : "bg-blue-500/30 text-white"
                        : isLight ? "bg-slate-100 text-slate-600" : "bg-white/10 text-slate-400"
                    }`}>
                      {brandItem.count}
                    </span>

                    {brandItem.count > 0 && (
                      <ChevronRight className={`w-3 h-3 -ml-0.5 opacity-60 ${isSelected ? "text-white" : ""}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search, Filter & View Controls Toolbar */}
          <div className="space-y-2.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              {/* Product Search Input (Intelligent Search with Typo/Synonym support) */}
              <div className="relative flex-1">
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`} />
                <input
                  type="text"
                  placeholder={`Search products in ${selectedCategory}${selectedBrand !== "all" ? ` > ${selectedBrand}` : ""}...`}
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium outline-none border transition-all ${
                    isLight
                      ? "bg-white border-[#E5E7EB] text-[#111827] placeholder-slate-400 focus:border-blue-500"
                      : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC] placeholder-slate-500 focus:border-blue-500"
                  }`}
                />
                {productSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProductSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters & Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={selectedShowcaseFilter}
                    onChange={(e) => setSelectedShowcaseFilter(e.target.value)}
                    className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                      isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
                    }`}
                  >
                    <option value="all">All Status</option>
                    <option value="featured">Featured</option>
                    <option value="new_arrival">New Arrivals</option>
                    <option value="discounted">Discounted / Sale</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                </div>

                {/* Sort Filter */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                      isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
                    }`}
                  >
                    <option value="recently_updated">Recently Updated</option>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="name_asc">Name: A to Z</option>
                    <option value="stock_asc">Stock Level</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                </div>

                {/* Table / Grid Switcher */}
                <div className={`flex items-center p-0.5 rounded-xl border ${
                  isLight ? "bg-slate-100 border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
                }`}>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === "table"
                        ? isLight ? "bg-white text-blue-600 shadow-xs font-bold" : "bg-blue-600 text-white shadow-xs font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === "grid"
                        ? isLight ? "bg-white text-blue-600 shadow-xs font-bold" : "bg-blue-600 text-white shadow-xs font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reset Filters */}
                {(productSearchQuery || selectedShowcaseFilter !== "all" || selectedBrand !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearchQuery("");
                      setSelectedShowcaseFilter("all");
                      setSelectedBrand("all");
                      syncUrl("categories", selectedCategory, "all");
                    }}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700" : "bg-white/5 hover:bg-white/10 border-white/[0.08] text-amber-400"
                    }`}
                    title="Reset filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Typo suggestion from Intelligent Search */}
            {searchEngineResults?.didYouMean && (
              <div className="flex items-center gap-2 text-xs py-1 text-amber-400">
                <span>Did you mean:</span>
                <button
                  type="button"
                  onClick={() => setProductSearchQuery(searchEngineResults.didYouMean!)}
                  className="font-bold underline cursor-pointer"
                >
                  &quot;{searchEngineResults.didYouMean}&quot;
                </button>
              </div>
            )}

            {/* Counts & Select All Sub-Bar */}
            <div className={`flex items-center justify-between pt-1 text-xs ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
              <div className="flex items-center gap-4">
                <span className="font-semibold">
                  <strong className={isLight ? "text-slate-900" : "text-white"}>{sortedProducts.length}</strong> products
                </span>

                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className={`flex items-center gap-1.5 font-medium hover:underline cursor-pointer ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={selectedProductIds.length > 0 && selectedProductIds.length === sortedProducts.length}
                    onChange={selectAllFiltered}
                    className="rounded border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Select All</span>
                </button>
              </div>
            </div>
          </div>


          {/* Products Table/Grid Content for Selected Category */}
          {renderProductTableContent(sortedProducts, {
            showCategory: false,
            emptyTitle: `No products found in ${selectedCategory} matching current filters`,
            emptySubtitle: "Try clearing brand or status filters, or check for typos.",
            onResetAction: () => {
              setProductSearchQuery("");
              setSelectedBrand("all");
              setSelectedShowcaseFilter("all");
            },
            resetActionText: "Reset Category Filters",
          })}

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         5. VIEW 3: ALL PRODUCTS MODE (Complete Global Management Experience)
      ════════════════════════════════════════════════════════════════════ */}
      {catalogMode === "all_products" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Main All Products Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`} />
              <input
                type="text"
                placeholder="Search all products, SKU, brand, or category..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium outline-none border transition-all ${
                  isLight
                    ? "bg-white border-[#E5E7EB] text-[#111827] placeholder-slate-400 focus:border-blue-500"
                    : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC] placeholder-slate-500 focus:border-blue-500"
                }`}
              />
              {productSearchQuery && (
                <button
                  type="button"
                  onClick={() => setProductSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={allProdCategoryFilter}
                  onChange={(e) => setAllProdCategoryFilter(e.target.value)}
                  className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                    isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
                  }`}
                >
                  <option value="all">All Categories</option>
                  {dynamicCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
              </div>

              {/* Brand Dropdown */}
              <div className="relative">
                <select
                  value={allProdBrandFilter}
                  onChange={(e) => setAllProdBrandFilter(e.target.value)}
                  className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                    isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
                  }`}
                >
                  <option value="all">All Brands</option>
                  {dynamicBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
              </div>

              {/* Status Dropdown */}
              <div className="relative">
                <select
                  value={selectedShowcaseFilter}
                  onChange={(e) => setSelectedShowcaseFilter(e.target.value)}
                  className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                    isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="featured">Featured ({totalFeaturedCount})</option>
                  <option value="new_arrival">New Arrivals ({totalNewArrivalsCount})</option>
                  <option value="discounted">Discounted / Sale</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                    isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
                  }`}
                >
                  <option value="recently_updated">Recently Updated</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="stock_asc">Stock Level</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
              </div>

              {/* Table / Grid Switcher */}
              <div className={`flex items-center p-0.5 rounded-xl border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "table" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "grid" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Reset */}
              {(productSearchQuery || allProdCategoryFilter !== "all" || allProdBrandFilter !== "all" || selectedShowcaseFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearchQuery("");
                    setAllProdCategoryFilter("all");
                    setAllProdBrandFilter("all");
                    setSelectedShowcaseFilter("all");
                  }}
                  className="px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/5 hover:bg-white/10 text-amber-400 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Typo suggestion from Intelligent Search */}
          {searchEngineResults?.didYouMean && (
            <div className="flex items-center gap-2 text-xs py-1 text-amber-400">
              <span>Did you mean:</span>
              <button
                type="button"
                onClick={() => setProductSearchQuery(searchEngineResults.didYouMean!)}
                className="font-bold underline cursor-pointer"
              >
                &quot;{searchEngineResults.didYouMean}&quot;
              </button>
            </div>
          )}

          {/* Cross-Category Global Search Hint */}
          {productSearchQuery.trim().length > 0 &&
            sortedProducts.length === 0 &&
            globalCategorySearchEngineResults &&
            globalCategorySearchEngineResults.products.length > 0 && (
              <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                isLight ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-blue-600/10 border-blue-500/20 text-blue-200"
              }`}>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    No products found in <strong>{selectedCategory}</strong>, but found{" "}
                    <strong>{globalCategorySearchEngineResults.products.length}</strong> matching product{globalCategorySearchEngineResults.products.length === 1 ? "" : "s"} across the catalog!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const q = productSearchQuery;
                    setProductSearchQuery("");
                    setSelectedCategory(null);
                    setCategorySearchQuery(q);
                    syncUrl("categories", null, "all");
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  View Global Results &rarr;
                </button>
              </div>
          )}

          {/* Counts & Select All Sub-Bar */}
          <div className={`flex items-center justify-between pt-1 text-xs ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
            <div className="flex items-center gap-4">
              <span className="font-semibold">
                <strong className={isLight ? "text-slate-900" : "text-white"}>{sortedProducts.length}</strong> products
              </span>

              <button
                type="button"
                onClick={selectAllFiltered}
                className={`flex items-center gap-1.5 font-medium hover:underline cursor-pointer ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                <input
                  type="checkbox"
                  aria-label="Select all products"
                  checked={selectedProductIds.length > 0 && selectedProductIds.length === sortedProducts.length}
                  onChange={selectAllFiltered}
                  className="rounded border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>Select All</span>
              </button>
            </div>
          </div>

          {/* Products Table/Grid Content for All Products Mode */}
          {renderProductTableContent(sortedProducts, {
            showCategory: true,
            emptyTitle: "No products found matching filters",
            emptySubtitle: "Try adjusting your search terms or clearing category, brand, or status filters.",
            onResetAction: () => {
              setProductSearchQuery("");
              setAllProdCategoryFilter("all");
              setAllProdBrandFilter("all");
              setSelectedShowcaseFilter("all");
            },
            resetActionText: "Reset All Filters",
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         6. STICKY BULK ACTIONS TOOLBAR (Appears when 1+ products selected)
      ════════════════════════════════════════════════════════════════════ */}
      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-[#0E141D]/95 border border-[#2563EB]/40 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center shadow-md">
              {selectedProductIds.length}
            </span>
            <div>
              <p className="text-xs font-bold text-white">Selected Products</p>
              <p className="text-[10px] text-slate-400">Apply batch updates or promotions</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleBulkSetFeatured(true)}
              disabled={isUpdatingBulk}
              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>Feature</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkSetNewArrival(true)}
              disabled={isUpdatingBulk}
              className="px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Mark New</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenOfferModal(selectedCategory || undefined, selectedBrand !== "all" ? selectedBrand : undefined, selectedProductIds)}
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Apply Offer</span>
            </button>

            {/* Bulk Category Change */}
            <div className="flex items-center gap-1">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="px-2 py-1.5 bg-[#121A25] border border-white/[0.1] rounded-xl text-xs font-semibold text-white focus:outline-none max-w-[120px]"
              >
                <option value="">Move Category</option>
                {dynamicCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyBulkCategory}
                disabled={!bulkCategory || isUpdatingBulk}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Set
              </button>
            </div>

            {/* Bulk Brand Change */}
            <div className="flex items-center gap-1">
              <select
                value={bulkBrand}
                onChange={(e) => setBulkBrand(e.target.value)}
                className="px-2 py-1.5 bg-[#121A25] border border-white/[0.1] rounded-xl text-xs font-semibold text-amber-300 focus:outline-none max-w-[120px]"
              >
                <option value="">Move Brand</option>
                {dynamicBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyBulkBrand}
                disabled={!bulkBrand || isUpdatingBulk}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Set
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedProductIds([])}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-semibold ml-auto cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         7. BULK OFFER CAMPAIGN MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <BulkOfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        products={products}
        categories={dynamicCategories}
        brands={dynamicBrands}
        initialCategory={offerModalCategory}
        initialBrand={offerModalBrand}
        initialSelectedIds={offerModalSelectedIds}
      />

      {/* ════════════════════════════════════════════════════════════════════
         8. QUICK REASSIGN CATEGORY & BRAND MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {reassignProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 ${
            isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/10 text-white"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? "border-slate-100" : "border-white/10"}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Change Category &amp; Brand</h3>
                  <p className="text-[11px] text-slate-400">Move product across catalog hierarchy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassignProduct(null)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#121A25] border-white/5"
            }`}>
              {reassignProduct.images && reassignProduct.images[0] ? (
                <img
                  src={reassignProduct.images[0]}
                  alt=""
                  className="w-10 h-10 object-contain rounded-lg p-0.5 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-xs truncate">{reassignProduct.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Current: {getProductCategory(reassignProduct)} &rarr; {getProductBrand(reassignProduct)}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomReassignCategory(!isCustomReassignCategory);
                      if (!isCustomReassignCategory) setCustomReassignCategoryText("");
                    }}
                    className="text-[11px] text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    {isCustomReassignCategory ? "List" : "+ Custom"}
                  </button>
                </div>

                {isCustomReassignCategory ? (
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type category..."
                    value={customReassignCategoryText}
                    onChange={(e) => setCustomReassignCategoryText(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-blue-500/50 rounded-xl text-white font-semibold outline-none"
                  />
                ) : (
                  <select
                    value={targetNewCategory}
                    onChange={(e) => setTargetNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-white font-semibold outline-none cursor-pointer"
                  >
                    {dynamicCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Brand</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomReassignBrand(!isCustomReassignBrand);
                      if (!isCustomReassignBrand) setCustomReassignBrandText("");
                    }}
                    className="text-[11px] text-amber-400 hover:underline font-medium cursor-pointer"
                  >
                    {isCustomReassignBrand ? "List" : "+ Custom"}
                  </button>
                </div>

                {isCustomReassignBrand ? (
                  <input
                    type="text"
                    placeholder="Type brand..."
                    value={customReassignBrandText}
                    onChange={(e) => setCustomReassignBrandText(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-amber-500/50 rounded-xl text-white font-semibold outline-none"
                  />
                ) : (
                  <select
                    value={targetNewBrand}
                    onChange={(e) => setTargetNewBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-amber-300 font-semibold outline-none cursor-pointer"
                  >
                    {dynamicBrands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2.5 pt-2 border-t ${isLight ? "border-slate-100" : "border-white/10"}`}>
              <button
                type="button"
                onClick={() => setReassignProduct(null)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReassign}
                disabled={isReassigning || (!targetNewCategory && !customReassignCategoryText.trim()) || (!targetNewBrand && !customReassignBrandText.trim())}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                {isReassigning ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
