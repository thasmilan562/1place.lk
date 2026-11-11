"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Phone,
  MapPin,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  ShoppingCart,
  User,
  LogOut,
  Search,
  Heart,
  Package,
  Truck,
  ShieldCheck,
  RotateCcw,
  HelpCircle,
  CircleCheck as Sparkles,
  ArrowRight,
  LayoutGrid,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, normalizeImageUrl } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import AuthModal from "@/components/auth/AuthModal";
import CartDrawer from "@/components/cart/PremiumCartDrawer";
import { getAdminCategories, getProducts } from "@/lib/firestore-client";
import { Category, Product } from "@/lib/types";
import { executeIntelligentSearch } from "@/lib/search/search-engine";
import { KNOWN_BRAND_NAMES } from "@/lib/migration-audit";
import UserAvatar from "@/components/ui/UserAvatar";
import BrandLogo from "@/components/ui/BrandLogo";
import { BUSINESS_INFO } from "@/lib/business-info";
import CategoryMenu from "./CategoryMenu";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [cartOpen, setCartOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [catList, setCatList] = useState<Category[]>([]);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [searchCatalog, setSearchCatalog] = useState<Product[]>([]);
  const [searchCatalogLoaded, setSearchCatalogLoaded] = useState(false);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [debouncedSearchInput, setDebouncedSearchInput] = useState("");
  const { user, profile, gender, signOut } = useAuth();
  const { itemCount, total } = useCart();
  const { wishlist } = useWishlist();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchInput(searchInput.trim()), 140);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const searchMatches = useMemo(() => {
    if (debouncedSearchInput.length < 2 || searchCatalog.length === 0) return [];
    return executeIntelligentSearch(debouncedSearchInput, searchCatalog, [], []).products.slice(0, 5);
  }, [debouncedSearchInput, searchCatalog]);

  const loadSearchCatalog = () => {
    setSearchSuggestionsOpen(true);
    if (searchCatalogLoaded) return;
    setSearchCatalogLoaded(true);
    getProducts()
      .then((items) => setSearchCatalog(items.filter((product) => product.status !== "deleted" && product.status !== "inactive" && product.status !== "draft")))
      .catch((error) => {
        console.error("Could not load product search catalog:", error);
        setSearchCatalogLoaded(false);
      });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchSuggestionsOpen(false);
      router.push(`/products?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const renderSearchSuggestions = () => searchSuggestionsOpen && searchInput.trim().length >= 2 ? (
    <div className="absolute left-0 right-0 top-full z-[75] mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-[0_18px_48px_rgba(0,0,0,.16)]" role="listbox" aria-label="Matching products">
      {searchMatches.length > 0 ? searchMatches.map((product) => (
        <button
          key={product.id || product.slug}
          type="button"
          role="option"
          aria-selected="false"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setSearchSuggestionsOpen(false);
            router.push(`/products/${product.slug}`);
          }}
          className="flex w-full items-center gap-3 border-b border-neutral-100 px-3 py-2.5 text-left last:border-0 hover:bg-neutral-50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5f5f7] p-1">
            {(product.primary_image || product.cover_image || product.image_url || product.image || product.images?.[0]) && <img src={normalizeImageUrl(product.primary_image || product.cover_image || product.image_url || product.image || product.images?.[0] || "")} alt="" className="h-full w-full object-contain" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-neutral-900">{product.name}</span>
            <span className="mt-0.5 block text-xs text-neutral-500">{product.brand_name || product.brandName || product.category_name || "OnePlace product"}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-neutral-900">{formatPrice(product.sale_price && product.sale_price > 0 && product.sale_price < product.price ? product.sale_price : product.price)}</span>
        </button>
      )) : searchCatalogLoaded ? (
        <p className="px-4 py-4 text-sm text-neutral-500">No matching products. Press Enter to search all products.</p>
      ) : (
        <p className="px-4 py-4 text-sm text-neutral-500">Finding matching products…</p>
      )}
      <button type="submit" className="flex w-full items-center justify-between bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-100">
        <span>See all results for “{searchInput.trim()}”</span><ArrowRight className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  // Dynamic navbar height observer to guarantee zero layout shift
  const baseNavbarHeightRef = useRef<number>(0);
  useEffect(() => {
    const updateNavbarHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        // Only set base padding from un-scrolled state so page scroll position doesn't jump
        if (!isScrolled || baseNavbarHeightRef.current === 0) {
          baseNavbarHeightRef.current = height;
          document.documentElement.style.setProperty("--navbar-height", `${height}px`);
        }
      }
    };
    updateNavbarHeight();
    const ro = new ResizeObserver(updateNavbarHeight);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", updateNavbarHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateNavbarHeight);
    };
  }, [pathname, isScrolled]);

  // Load Firestore categories
  useEffect(() => {
    async function loadCats() {
      try {
        setCatList(await getAdminCategories(true));
      } catch (e) {
        console.warn("Could not load admin categories in Header:", e);
      }
    }
    loadCats();
  }, []);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Event bus listeners for search / cart / auth
  useEffect(() => {
    const handleOpenAuth = () => { setAuthTab("signin"); setAuthOpen(true); };
    const handleOpenCart = () => setCartOpen(true);
    const handleOpenCategories = () => { setAuthOpen(false); setCartOpen(false); setIsCategoriesDropdownOpen(true); setIsMobileMenuOpen(false); };
    window.addEventListener("open-categories-menu", handleOpenCategories);
    window.addEventListener("open-auth-modal", handleOpenAuth);
    window.addEventListener("open-cart-drawer", handleOpenCart);
    return () => {
      window.removeEventListener("open-categories-menu", handleOpenCategories);
      window.removeEventListener("open-auth-modal", handleOpenAuth);
      window.removeEventListener("open-cart-drawer", handleOpenCart);
    };
  }, []);

  useEffect(() => {
    if (authOpen || cartOpen) setIsCategoriesDropdownOpen(false);
  }, [authOpen, cartOpen]);

  // Close categories dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setIsCategoriesDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCategoriesDropdownOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Lock body scroll on mobile drawer open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Clean deduplicated categories
  const uniqueNavCategories = useMemo(() => {
    const seenSlugs = new Set<string>();
    const brandLowerList = KNOWN_BRAND_NAMES.map((b) => b.toLowerCase());
    const unique: Category[] = [];

    catList.forEach((c) => {
      if (!c || !c.name || c.status === "inactive" || c.status === "deleted" || c.isDeleted === true || c.show_in_menu === false || c.parent_id) return;
      const cleanName = c.name.toLowerCase().trim();
      const cleanSlug = (c.slug || "").toLowerCase().trim();
      if (brandLowerList.includes(cleanName)) return;
      if (cleanSlug && seenSlugs.has(cleanSlug)) return;
      if (cleanSlug) seenSlugs.add(cleanSlug);
      unique.push(c);
    });

    return unique.sort((a, b) => (a.sortOrder ?? a.sort_order ?? 99) - (b.sortOrder ?? b.sort_order ?? 99));
  }, [catList]);

  // Hide header on admin and standalone login page
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) {
    return null;
  }

  return (
    <>
      <header
        ref={headerRef}
        data-site-header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-sans border-b",
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-md border-neutral-200/90"
            : "bg-white shadow-2xs border-[#E8E8E8]"
        )}
      >
        {/* ── Main Header Row (Smooth Shrink on Scroll) ── */}
        <div
          className={cn(
            "max-w-7xl mx-auto px-4 lg:px-8 transition-all duration-300 ease-in-out",
            isScrolled ? "py-1.5 lg:py-2" : "py-2.5 lg:py-3.5"
          )}
        >
          {/* ── Desktop & Mobile Top Row ── */}
          <div className="flex items-center justify-between gap-3 lg:gap-4">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-[#111111] hover:text-[#68122F] hover:bg-neutral-100 transition-colors"
            >
              <Menu className="w-6 h-6 stroke-[2]" />
            </button>

            {/* Official ONEPLACE Logo (smooth scale on scroll) */}
            <div
              className={cn(
                "transition-all duration-300 ease-in-out origin-left flex items-center shrink-0",
                isScrolled ? "scale-90" : "scale-100"
              )}
            >
              <BrandLogo
                variant="header"
                href="/"
                priority
                onClick={() => {
                  if (pathname === "/") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              />
            </div>

            {/* Desktop Wide Centered Product Search Input & Burgundy Button */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden lg:flex flex-1 max-w-2xl mx-6 relative"
            >
              <div
                className={cn(
                  "flex items-center w-full bg-[#F5F5F5] hover:bg-[#EFEFEF] focus-within:bg-white border border-[#E0E0E0] focus-within:border-[#68122F] rounded-lg overflow-hidden transition-all duration-200 shadow-2xs",
                  isScrolled ? "h-9 lg:h-9.5" : "h-10.5"
                )}
              >
                <input
                  type="text"
                  aria-label="Search products"
                  value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setSearchSuggestionsOpen(true); }}
                    onFocus={loadSearchCatalog}
                    onBlur={() => window.setTimeout(() => setSearchSuggestionsOpen(false), 120)}
                    onKeyDown={(e) => { if (e.key === "Escape") setSearchSuggestionsOpen(false); }}
                  placeholder="Search for products, brands and categories..."
                  className={cn(
                    "flex-1 h-full px-4 text-[#111111] bg-transparent outline-none placeholder:text-neutral-400 font-normal transition-all duration-200",
                    isScrolled ? "text-xs" : "text-sm"
                  )}
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className={cn(
                    "h-full bg-[#68122F] hover:bg-[#520d23] text-white flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0",
                    isScrolled ? "px-4.5" : "px-5.5"
                  )}
                >
                  <Search className={cn("transition-all duration-200", isScrolled ? "w-3.5 h-3.5 stroke-[2.5]" : "w-4 h-4 stroke-[2.5]")} />
                </button>
              </div>
              {renderSearchSuggestions()}
            </form>

            {/* Header Right Actions: Account/Sign In, Sign Up, Wishlist, Cart */}
            <div className={cn("flex items-center transition-all duration-300", isScrolled ? "gap-1.5 sm:gap-3" : "gap-2 sm:gap-4")}>
              {/* Account / Sign In / Sign Up */}
              <div className="hidden lg:flex items-center gap-1.5 relative">
                {user ? (
                  <>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg font-semibold text-[#111111] hover:text-[#68122F] hover:bg-neutral-50 transition-all cursor-pointer",
                        isScrolled ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"
                      )}
                      aria-label="Account menu"
                    >
                      <UserAvatar
                        gender={gender || profile?.gender || "male"}
                        name={user.displayName || "User"}
                        photoURL={user.photoURL}
                        size="sm"
                      />
                      <span className="truncate max-w-[110px]">
                        {user.displayName?.split(" ")[0] || "Account"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                    </button>

                    {/* Profile Dropdown */}
                    <AnimatePresence>
                      {userMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-60 bg-white border border-[#E8E8E8] rounded-xl shadow-xl z-50 p-2 text-[#111111]"
                          >
                            <div className="px-3 py-2.5 border-b border-[#E8E8E8] mb-1">
                              <p className="text-xs font-bold text-[#111111] truncate">{user.displayName || "Customer"}</p>
                              <p className="text-[11px] text-[#666666] truncate">{user.email}</p>
                            </div>
                            <Link
                              href="/orders"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-[#68122F] hover:bg-neutral-50 rounded-lg transition-colors"
                            >
                              <Package className="w-4 h-4" />
                              <span>My Orders &amp; Track</span>
                            </Link>
                            <Link
                              href="/wishlist"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-[#68122F] hover:bg-neutral-50 rounded-lg transition-colors"
                            >
                              <Heart className="w-4 h-4" />
                              <span>My Wishlist ({wishlist.length})</span>
                            </Link>
                            <button
                              onClick={async () => {
                                await signOut();
                                setUserMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer mt-1 border-t border-[#E8E8E8] pt-2"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Sign Out</span>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className={cn("flex items-center gap-1.5 font-semibold text-neutral-800 transition-all duration-300", isScrolled ? "text-[11px]" : "text-xs")}>
                    <button
                      onClick={() => { setAuthTab("signin"); setAuthOpen(true); }}
                      className="flex items-center gap-1.5 hover:text-[#68122F] px-2 py-1.5 rounded-md hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <User className={cn("text-neutral-600 transition-all", isScrolled ? "w-3.5 h-3.5" : "w-4 h-4")} />
                      <span>Sign In</span>
                    </button>
                    <span className="text-neutral-300">|</span>
                    <button
                      onClick={() => { setAuthTab("signup"); setAuthOpen(true); }}
                      className="hover:text-[#68122F] px-2 py-1.5 rounded-md hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <span>Sign Up</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Wishlist Icon with Live Count */}
              <Link
                href="/wishlist"
                className={cn(
                  "relative rounded-lg text-neutral-800 hover:text-[#68122F] hover:bg-neutral-50 transition-all flex items-center",
                  isScrolled ? "p-1.5" : "p-2"
                )}
                aria-label={`Wishlist (${wishlist.length} items)`}
              >
                <Heart className={cn("stroke-[1.8] transition-all", isScrolled ? "w-5 h-5" : "w-5.5 h-5.5")} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#68122F] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              {/* Shopping Cart Icon with Live Count & Total */}
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className={cn(
                  "relative flex items-center rounded-lg text-neutral-800 hover:text-[#68122F] hover:bg-neutral-50 transition-all cursor-pointer",
                  isScrolled ? "gap-1.5 p-1.5" : "gap-2 p-2"
                )}
                aria-label={`Shopping cart with ${itemCount} items`}
              >
                <div className="relative">
                  <ShoppingCart className={cn("stroke-[1.8] transition-all", isScrolled ? "w-5 h-5" : "w-5.5 h-5.5")} />
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#68122F] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </div>
                <div className="hidden xl:flex flex-col text-left leading-tight ml-1">
                  <span className="text-[10px] text-neutral-500 font-medium">Cart</span>
                  <span className={cn("font-bold text-[#111111] transition-all", isScrolled ? "text-[11px]" : "text-xs")}>
                    {total > 0 ? `LKR ${total.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "LKR 0.00"}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Row 2: Full-Width Search Input Matching Mobile Reference Image */}
          <form
            onSubmit={handleSearchSubmit}
            className="lg:hidden flex items-center w-full mt-2.5 relative"
          >
            <div className="relative w-full flex items-center bg-[#F3F4F6] rounded-xl overflow-hidden border border-neutral-200/80 focus-within:border-[#68122F] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 stroke-[2] pointer-events-none" />
              <input
                type="text"
                aria-label="Search products"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setSearchSuggestionsOpen(true); }}
                onFocus={loadSearchCatalog}
                onBlur={() => window.setTimeout(() => setSearchSuggestionsOpen(false), 120)}
                onKeyDown={(e) => { if (e.key === "Escape") setSearchSuggestionsOpen(false); }}
                placeholder="Search for products, brands and categories..."
                className="w-full h-10.5 pl-10 pr-4 text-xs text-[#111111] bg-transparent outline-none placeholder:text-neutral-400 font-normal"
              />
            </div>
            {renderSearchSuggestions()}
          </form>
        </div>

        {/* ── Desktop Category Navigation Sub-Header Row Matching Desktop Reference Image ── */}
        <div className="hidden lg:block border-t border-[#F0F0F0] bg-white">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <nav aria-label="Store navigation" className="flex items-center justify-center gap-8 py-2.5 text-xs font-semibold">
              <Link
                href="/products"
                className={cn(
                  "transition-colors whitespace-nowrap py-0.5",
                  pathname.startsWith("/products") ? "text-[#68122F] font-bold" : "text-[#333333] hover:text-[#68122F]"
                )}
              >
                Shop All
              </Link>
              <button
                type="button"
                aria-expanded={isCategoriesDropdownOpen}
                aria-haspopup="dialog"
                onClick={() => setIsCategoriesDropdownOpen((open) => !open)}
                className="text-[#666666] hover:text-[#68122F] transition-colors whitespace-nowrap py-0.5"
              >
                Categories <ChevronDown className="inline w-3 h-3 ml-1" />
              </button>
            </nav>
          </div>
        </div>
      </header>
      <CategoryMenu open={isCategoriesDropdownOpen} onClose={() => setIsCategoriesDropdownOpen(false)} categories={uniqueNavCategories} />

      {/* ── 4. Mobile Navigation Drawer ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[340px] bg-white z-[90] lg:hidden flex flex-col shadow-2xl border-r border-[#E8E8E8]"
            >
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
                <BrandLogo
                  variant="mobile"
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation List */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold text-[#111111] hover:bg-[#F7F7F7] transition-colors"
                >
                  <span>Home</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>
                <Link
                  href="/#categories-strip"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold text-[#111111] hover:bg-[#F7F7F7] transition-colors"
                >
                  <span>All Categories</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>
                <Link
                  href="/products?sort=newest"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold text-[#111111] hover:bg-[#F7F7F7] transition-colors"
                >
                  <span>New Arrivals</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>
                <Link
                  href="/products"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold text-[#111111] hover:bg-[#F7F7F7] transition-colors"
                >
                  <span>Shop All Products</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>
                <Link
                  href="/shop-by-brand"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold text-[#111111] hover:bg-[#F7F7F7] transition-colors"
                >
                  <span>Brands</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold text-[#111111] hover:bg-[#F7F7F7] transition-colors"
                >
                  <span>Track Order</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold text-[#111111] hover:bg-[#F7F7F7] transition-colors"
                >
                  <span>Help & Contact</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>

              </div>

              {/* Drawer Bottom Actions */}
              <div className="p-4 border-t border-[#E8E8E8] bg-[#F7F7F7] space-y-2.5">
                {user ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-white border border-[#E8E8E8] rounded-xl">
                    <div className="flex items-center gap-2 truncate">
                      <UserAvatar
                        gender={gender || profile?.gender || "male"}
                        name={user.displayName || "User"}
                        photoURL={user.photoURL}
                        size="sm"
                      />
                      <div className="truncate text-left">
                        <p className="text-xs font-bold text-[#111111] truncate">{user.displayName || "Customer"}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setAuthOpen(true);
                    }}
                    className="w-full min-h-[44px] py-2.5 rounded-xl font-bold text-xs bg-[#111111] hover:bg-[#350713] text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span>Login / Sign Up</span>
                  </button>
                )}

                <a
                  href={`tel:${BUSINESS_INFO.phoneMobileIntl}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-[#E8E8E8] text-xs font-bold text-[#111111] hover:bg-neutral-50 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#64152F]" />
                  <span>Call {BUSINESS_INFO.phoneMobile}</span>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal isOpen={authOpen} initialTab={authTab} onClose={() => setAuthOpen(false)} />

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
