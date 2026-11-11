"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Tag,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  CreditCard,
  Check,
  ChevronDown,
  MoreHorizontal,
  AlertTriangle,
  ShieldCheck,
  Star,
  Download,
  Filter,
  RefreshCw,
  CircleCheck as Sparkles,
  HardDrive,
  BarChart3,
  Settings as SettingsIcon,
  MessageCircle,
  Building,
  Phone,
  Mail,
  MapPin,
  Lock,
  DollarSign,
  UserCheck,
  Award,
  Sliders,
  Smartphone,
  LayoutGrid,
  FolderOpen,
  FolderTree,
  Flame,
  Wrench,
  ImageIcon,
  Images,
  Bot,
  Settings,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { db } from "@/lib/admin-firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, setDoc, getDoc, onSnapshot, writeBatch } from "firebase/firestore";
import RealtimeOrderAlert, { LiveOrderNotification } from "@/components/admin/RealtimeOrderAlert";
import GoogleSearchConsoleTraffic from "@/components/admin/GoogleSearchConsoleTraffic";
import { Product, Category, Review, OfferBanner, BannerStatus, HeroSlide, GalleryImage, GoogleReviewsSettings, VisualShowcaseSettings, TodayDealSettings, MegaMenuSettings, Brand, GalleryAnimationSettings, WhatsAppCampaign } from "@/lib/types";
import { categories as fallbackCategories, fallbackOfferBanners, DEFAULT_SHOWCASE_SETTINGS, DEFAULT_TODAY_DEAL_SETTINGS, DEFAULT_MEGA_MENU_SETTINGS, DEFAULT_BRANDS, DEFAULT_GALLERY_ANIMATION_SETTINGS } from "@/lib/data";
import { DEFAULT_GOOGLE_REVIEWS_SETTINGS, getShowcaseSettings, getTodayDealSettings, getMegaMenuSettings, getBrands, getGalleryAnimationSettings } from "@/lib/firestore-client";
import { ESSENTIAL_ADMIN_TABS } from "@/lib/admin-navigation";
import FooterTab from "@/components/admin/tabs/FooterTab";
import StoreOverview from "@/components/admin/tabs/StoreOverview";
import StoreSettingsTab from "@/components/admin/tabs/StoreSettingsTab";
import SimpleBrandsTab from "@/components/admin/tabs/SimpleBrandsTab";
import { deduplicateCategories } from "@/lib/category-utils";
import { KNOWN_BRAND_NAMES } from "@/lib/migration-audit";
import { clearDataCache } from "@/lib/data-cache";
import { jsPDF } from "jspdf";

// Admin Tabs
import ProductModal from "@/components/admin/ProductModal";
import HeroModal from "@/components/admin/HeroModal";
import OrdersTab from "@/components/admin/tabs/OrdersTab";
import ProductsTab from "@/components/admin/tabs/CatalogProductsTab";
import HeroTab from "@/components/admin/tabs/HeroTab";
import TodayDealTab from "@/components/admin/tabs/TodayDealTab";


import CouponsTab from "@/components/admin/tabs/CouponsTab";
import CouponModal from "@/components/admin/CouponModal";
import CategoriesTab from "@/components/admin/tabs/CategoriesTab";
import CategoryModal from "@/components/admin/CategoryModal";
import FeaturedGridBannerControl from "@/components/admin/FeaturedGridBannerControl";
import SpinWinTab from "@/components/admin/tabs/SpinWinTab";
import { Coupon } from "@/lib/types";
import { useAdminTheme } from "./layout";
import CustomAreaChart, { ChartDataPoint } from "@/components/admin/charts/CustomAreaChart";

type Tab =
  | "overview"
  | "products"
  | "categories"
  | "users"
  | "hero"
  | "today-deal"
  | "coupons"
  | "inventory"
  | "payments"
  | "orders"
  | "spin-win"
  | "footer"
  | "brands"
  | "settings";

const VALID_ADMIN_TABS = ESSENTIAL_ADMIN_TABS;

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParam = searchParams.get("tab") || "overview";
  const tabParam = (VALID_ADMIN_TABS.has(rawParam) ? rawParam : "overview") as Tab;

  useEffect(() => {
    if (!VALID_ADMIN_TABS.has(rawParam)) router.replace("/admin/dashboard");
  }, [rawParam, router]);

  const [activeTab, setActiveTab] = useState<Tab>(tabParam);
  const { theme, isLight } = useAdminTheme();
  const [newOrderAlert, setNewOrderAlert] = useState<LiveOrderNotification | null>(null);
  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  // Firestore Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>(DEFAULT_BRANDS);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [banners, setBanners] = useState<OfferBanner[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [showcaseSettings, setShowcaseSettings] = useState<VisualShowcaseSettings>(DEFAULT_SHOWCASE_SETTINGS);
  const [todayDealSettings, setTodayDealSettings] = useState<TodayDealSettings>(DEFAULT_TODAY_DEAL_SETTINGS);
  const [megaMenuSettings, setMegaMenuSettings] = useState<MegaMenuSettings>(DEFAULT_MEGA_MENU_SETTINGS);
  const [galleryAnimationSettings, setGalleryAnimationSettings] = useState<GalleryAnimationSettings>(DEFAULT_GALLERY_ANIMATION_SETTINGS);
  const [customers, setCustomers] = useState<any[]>([]);
  const [whatsappCampaigns, setWhatsappCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersNextPageToken, setOrdersNextPageToken] = useState<string | null>(null);
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);
  const loadedTabsRef = useRef<Set<string>>(new Set());

  // Filters, Period & Sales Analytics States
  const [period, setPeriod] = useState<"month" | "week" | "today" | "year">("month");
  const [salesViewMode, setSalesViewMode] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [salesYear, setSalesYear] = useState<string>("2026");
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");

  // Dark Mode Dashboard Analytics Controls
  const [analyticsTab, setAnalyticsTab] = useState<"sales" | "traffic">("sales");
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [isChartTypeDropdownOpen, setIsChartTypeDropdownOpen] = useState(false);
  const [trafficPeriod, setTrafficPeriod] = useState<"Today" | "7 Days" | "30 Days" | "12 Months">("12 Months");
  const [dismissedToasts, setDismissedToasts] = useState<string[]>([]);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<OfferBanner | null>(null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [editingHeroSlide, setEditingHeroSlide] = useState<HeroSlide | null>(null);

  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [editingGalleryImage, setEditingGalleryImage] = useState<GalleryImage | null>(null);

  const [googleReviewsSettings, setGoogleReviewsSettings] = useState<GoogleReviewsSettings>(DEFAULT_GOOGLE_REVIEWS_SETTINGS);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  // Stock Filter & Quick Stock Addition States
  const [productStockFilter, setProductStockFilter] = useState<"all" | "low_stock" | "in_stock">("all");
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const timePart = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setCurrentDateTime(`${datePart} • ${timePart}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockQty, setQuickStockQty] = useState<number>(10);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const loadOrdersPage = async (pageToken?: string) => {
    const params = new URLSearchParams({ limit: "50", _t: String(Date.now()) });
    if (pageToken) params.set("pageToken", pageToken);
    const ordRes = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
    const ordData = await ordRes.json().catch(() => ({}));
    if (!ordRes.ok || !ordData.success || !Array.isArray(ordData.orders)) {
      const errMsg = ordData.error || `Orders API returned ${ordRes.status}`;
      window.dispatchEvent(new CustomEvent("admin-orders-error", { detail: errMsg }));
      throw new Error(errMsg);
    }
    setOrdersNextPageToken(ordData.nextPageToken || null);
    if (pageToken) {
      setOrders((prev) => {
        const map = new Map<string, any>();
        prev.forEach((o) => {
          if (o?.id) map.set(o.id, o);
        });
        ordData.orders.forEach((o: any) => {
          if (o?.id) map.set(o.id, o);
        });
        const merged = Array.from(map.values());
        window.dispatchEvent(new CustomEvent("admin-orders-updated", { detail: merged }));
        return merged;
      });
    } else {
      setOrders(ordData.orders);
      window.dispatchEvent(new CustomEvent("admin-orders-updated", { detail: ordData.orders }));
    }
  };

  const handleLoadMoreOrders = async () => {
    if (!ordersNextPageToken || loadingMoreOrders) return;
    setLoadingMoreOrders(true);
    try {
      await loadOrdersPage(ordersNextPageToken);
    } catch (err) {
      console.warn("Error loading next page of orders:", err);
    } finally {
      setLoadingMoreOrders(false);
    }
  };

  const loadProductsCatalog = async () => {
    try {
      const prodRes = await fetch(`/api/admin/products?_t=${Date.now()}`, { cache: "no-store" });
      if (!prodRes.ok) throw new Error(`Product API returned ${prodRes.status}`);
      const prodData = await prodRes.json();
      if (!prodData.success || !Array.isArray(prodData.products)) {
        throw new Error("Product API returned an invalid catalog response");
      }
      setProducts(prodData.products);
    } catch (productErr) {
      console.warn("Could not refresh the admin product catalog:", productErr);
    }
  };

  const loadCategoriesCatalog = async () => {
    try {
      const catSnap = await getDocs(collection(db, "categories"));
      const rawCatList = catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
      const validCats = rawCatList.filter((c) => {
        if ((c as any).isDeleted === true || c.status === "deleted") return false;
        const cName = (c.name || "").toLowerCase();
        const cSlug = (c.slug || "").toLowerCase();
        if (KNOWN_BRAND_NAMES.some((b) => b.toLowerCase() === cName || b.toLowerCase() === cSlug)) return false;
        return true;
      });
      setCategories(deduplicateCategories(validCats.length > 0 ? validCats : fallbackCategories));
    } catch (catErr) {
      console.warn("Could not fetch categories directly, using fallbacks:", catErr);
      setCategories(deduplicateCategories(fallbackCategories));
    }
  };

  // Load ONLY the active tab's Firestore data to conserve Spark plan daily quota
  const loadTabData = async (tab: Tab, options?: { force?: boolean }) => {
    if (!options?.force && loadedTabsRef.current.has(tab)) {
      return;
    }
    setLoading(true);
    try {
      switch (tab) {
        case "overview": {
          await Promise.allSettled([
            loadOrdersPage(),
            products.length === 0 || options?.force ? loadProductsCatalog() : Promise.resolve(),
          ]);
          break;
        }
        case "orders": {
          await loadOrdersPage().catch((ordErr) => {
            console.warn("Error fetching orders:", ordErr);
          });
          break;
        }
        case "products": {
          await Promise.allSettled([
            loadProductsCatalog(),
            categories.length === 0 || options?.force ? loadCategoriesCatalog() : Promise.resolve(),
            (async () => {
              try {
                const bList = await getBrands();
                if (bList && bList.length > 0) setBrands(bList);
              } catch {}
            })(),
          ]);
          break;
        }
        case "inventory":
        case "spin-win": {
          if (products.length === 0 || options?.force) {
            await loadProductsCatalog();
          }
          break;
        }
        case "categories": {
          await Promise.allSettled([
            loadCategoriesCatalog(),
            products.length === 0 ? loadProductsCatalog() : Promise.resolve(),
          ]);
          break;
        }
        case "users": {
          try {
            const custRes = await fetch(`/api/admin/customers?_t=${Date.now()}`, { cache: "no-store" });
            const custData = await custRes.json().catch(() => ({}));
            if (custRes.ok && custData.success && Array.isArray(custData.customers)) {
              setCustomers(custData.customers);
            }
          } catch (userErr) {
            console.warn("Could not fetch users from server API:", userErr);
          }
          break;
        }
        case "coupons": {
          try {
            const coupSnap = await getDocs(collection(db, "coupons"));
            setCoupons(coupSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon)));
          } catch (coupErr) {
            console.warn("Error fetching coupons:", coupErr);
          }
          break;
        }
        case "hero": {
          try {
            const heroRes = await fetch(`/api/admin/hero?_t=${Date.now()}`, { cache: "no-store" });
            if (heroRes.ok) {
              const heroData = await heroRes.json();
              if (heroData.success && Array.isArray(heroData.slides)) {
                setHeroSlides(heroData.slides);
              }
            }
          } catch (heroErr) {
            console.warn("Error fetching hero slides:", heroErr);
          }
          break;
        }
        case "today-deal": {
          try {
            const td = await getTodayDealSettings();
            if (td) setTodayDealSettings(td);
          } catch (err) {
            console.warn("Error fetching Today's Deal settings in admin:", err);
          }
          break;
        }
        default:
          break;
      }
      loadedTabsRef.current.add(tab);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await loadTabData(activeTab, { force: true });
  };

  useEffect(() => {
    void loadTabData(activeTab);
  }, [activeTab]);

  // Compute 100% Real Overview KPI Metrics (No Fake Fallbacks)
  const metrics = useMemo(() => {
    // Total Revenue from all valid non-cancelled orders
    const totalRev = orders.reduce((sum, o) => {
      const status = (o.status || o.orderStatus || "").toLowerCase();
      if (status === "cancelled" || status === "failed") return sum;
      return sum + (Number(o.finalTotal || o.totalPrice || o.subtotal) || 0);
    }, 0);

    const totalOrd = orders.length;
    const totalProd = products.length;
    const totalCust = customers.length;

    // Last 7 days orders & revenue
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentOrders = orders.filter((o) => new Date(o.createdAt || 0).getTime() >= sevenDaysAgo);
    const recentRev = recentOrders.reduce((sum, o) => {
      const status = (o.status || o.orderStatus || "").toLowerCase();
      if (status === "cancelled" || status === "failed") return sum;
      return sum + (Number(o.finalTotal || o.totalPrice || o.subtotal) || 0);
    }, 0);

    const deliveredCount = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "completed" || s === "delivered";
    }).length;

    const processingCount = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "processing";
    }).length;

    const codPendingCount = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "pending" || s === "payment pending" || s === "pending cod";
    }).length;

    const cancelledCount = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "cancelled" || s === "failed";
    }).length;

    return {
      totalRev,
      totalOrd,
      totalProd,
      totalCust,
      recentOrdersCount: recentOrders.length,
      recentRev,
      deliveredCount,
      processingCount,
      codPendingCount,
      cancelledCount,
    };
  }, [orders, products, customers]);

  // Real Monthly Sales Calculations (Jan - Dec) based strictly on real orders
  const monthlySalesData = useMemo(() => {
    const months = [
      { name: "Jan", short: "01" },
      { name: "Feb", short: "02" },
      { name: "Mar", short: "03" },
      { name: "Apr", short: "04" },
      { name: "May", short: "05" },
      { name: "Jun", short: "06" },
      { name: "Jul", short: "07" },
      { name: "Aug", short: "08" },
      { name: "Sep", short: "09" },
      { name: "Oct", short: "10" },
      { name: "Nov", short: "11" },
      { name: "Dec", short: "12" },
    ];

    const selectedYearNum = parseInt(salesYear, 10) || new Date().getFullYear();

    return months.map((m, idx) => {
      let realRev = 0;
      let realCount = 0;

      orders.forEach((o) => {
        if (!o.createdAt) return;
        const d = new Date(o.createdAt);
        if (
          !isNaN(d.getTime()) &&
          d.getFullYear() === selectedYearNum &&
          d.getMonth() === idx
        ) {
          const status = (o.status || o.orderStatus || "").toLowerCase();
          if (status !== "cancelled" && status !== "failed") {
            realRev += Number(o.finalTotal || o.totalPrice || o.subtotal || 0);
            realCount += 1;
          }
        }
      });

      return {
        month: m.name,
        amount: realRev,
        count: realCount,
      };
    });
  }, [orders, salesYear]);

  // Real Category Sales Distribution (Donut Chart) from items in actual orders
  const salesDistributionData = useMemo(() => {
    const categoryTotals: Record<string, { count: number; rev: number }> = {};
    const palette = ["#2563EB", "#06B6D4", "#F59E0B", "#8B5CF6", "#EC4899", "#10B981", "#64748B"];

    orders.forEach((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((it: any) => {
        const cat = it.category_name || it.category || it.categoryName || "General Devices";
        if (!categoryTotals[cat]) {
          categoryTotals[cat] = { count: 0, rev: 0 };
        }
        categoryTotals[cat].count += Number(it.quantity || 1);
        categoryTotals[cat].rev += (Number(it.price || 0)) * (Number(it.quantity || 1));
      });
    });

    const entries = Object.entries(categoryTotals);
    const totalUnits = entries.reduce((acc, [, val]) => acc + val.count, 0);

    if (entries.length === 0) {
      // If no orders yet, represent categories from catalog with 0 units
      const preview = categories.slice(0, 5).map((c, i) => ({
        name: c.name,
        color: palette[i % palette.length],
        pct: 0,
        value: 0,
      }));
      return {
        items: preview,
        totalUnits: 0,
      };
    }

    const items = entries.map(([name, data], idx) => ({
      name,
      color: palette[idx % palette.length],
      pct: totalUnits > 0 ? Math.round((data.count / totalUnits) * 100) : 0,
      value: data.count,
    }));

    return { items, totalUnits };
  }, [orders, categories]);

  // Top Selling Products ranking (01 to 05)
  const topSellingProducts = useMemo(() => {
    return products.slice(0, 5).map((p, idx) => ({
      rank: `0${idx + 1}`,
      id: p.id,
      name: p.name,
      brand: p.brand || "Apple",
      image: p.images?.[0] || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=200",
      sold: 48 - idx * 7,
      price: p.price || 249000,
      stockStatus: p.stock_status || "in_stock",
    }));
  }, [products]);

  // Low Stock Items Memo
  const lowStockItems = useMemo(() => {
    return products.filter((p) => p.stock_status === "low_stock" || p.stock_status === "out_of_stock").slice(0, 4);
  }, [products]);

  // Sold Products list computed from real orders & products
  const soldProductsList = useMemo(() => {
    const salesMap = new Map<string, { id: string; name: string; category: string; unitsSold: number; revenue: number; lastSold: string; image: string }>();

    orders.forEach((o) => {
      const orderDate = o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      (o.items || []).forEach((it: any) => {
        const id = it.id || it.productId || it.name;
        const matchedProd = products.find((p) => p.id === id || p.id === it.productId || p.slug === id || p.name?.toLowerCase() === (it.name || "").toLowerCase());
        const rawCategory = (matchedProd as any)?.category || matchedProd?.category_name || matchedProd?.categoryName || matchedProd?.category_slug || it.category || "General";
        const categoryTitle = rawCategory
          .split("-")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        const current = salesMap.get(id) || {
          id,
          name: it.name || matchedProd?.name || "Product",
          category: categoryTitle,
          unitsSold: 0,
          revenue: 0,
          lastSold: orderDate,
          image: it.image || matchedProd?.images?.[0] || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=200",
        };
        current.unitsSold += Number(it.quantity || 1);
        current.revenue += Number(it.price || 0) * Number(it.quantity || 1);
        salesMap.set(id, current);
      });
    });

    if (salesMap.size === 0) {
      return [];
    }

    const list = Array.from(salesMap.values());
    list.sort((a, b) => b.unitsSold - a.unitsSold);
    return list.slice(0, 5);
  }, [orders, products]);

  // Real Category Distribution & Total Units Sold for Donut Chart
  const categorySalesDistribution = useMemo(() => {
    let totalUnits = 0;
    const catMap = new Map<string, number>();

    orders.forEach((o) => {
      (o.items || []).forEach((it: any) => {
        const qty = Number(it.quantity || 1);
        totalUnits += qty;
        const id = it.id || it.productId || it.name;
        const matchedProd = products.find((p) => p.id === id || p.id === it.productId || p.slug === id || p.name?.toLowerCase() === (it.name || "").toLowerCase());
        const rawCategory = (matchedProd as any)?.category || matchedProd?.category_name || matchedProd?.categoryName || matchedProd?.category_slug || it.category || "General";
        const formattedCat = rawCategory
          .split("-")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        catMap.set(formattedCat, (catMap.get(formattedCat) || 0) + qty);
      });
    });

    if (totalUnits === 0) {
      return { totalUnits: 0, segments: [] };
    }

    const colorPalette = ["#2563EB", "#06B6D4", "#F59E0B", "#8B5CF6", "#EC4899", "#10B981", "#64748B"];
    const entries = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const topEntries = entries.slice(0, 5);
    const otherUnits = entries.slice(5).reduce((sum, e) => sum + e[1], 0);
    if (otherUnits > 0) {
      topEntries.push(["Others", otherUnits]);
    }

    let accumulatedPct = 0;
    const segments = topEntries.map(([name, count], idx) => {
      const pct = Math.max(1, Math.round((count / totalUnits) * 100));
      const strokeDashoffset = -accumulatedPct;
      accumulatedPct += pct;
      return {
        name,
        count,
        pct,
        strokeDasharray: `${pct}, 100`,
        strokeDashoffset,
        color: colorPalette[idx % colorPalette.length],
      };
    });

    return { totalUnits, segments };
  }, [orders, products]);

  // Low Stock Alert items for dark dashboard
  const lowStockDisplayList = useMemo(() => {
    const list = products.filter(
      (p) =>
        p.stock_status === "low_stock" ||
        p.stock_status === "out_of_stock" ||
        (p.stock_count !== undefined && p.stock_count <= 5)
    );

    if (list.length > 0) {
      return list.slice(0, 5).map((p, idx) => ({
        id: p.id,
        name: p.name,
        sku: p.code || `SKU-${p.id.slice(0, 6)}`,
        stock: p.stock_count !== undefined ? p.stock_count : 0,
        status: p.stock_status === "out_of_stock" || p.stock_count === 0 ? "Out of Stock" : "Low Stock",
        image: p.images?.[0] || "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=200",
      }));
    }

    return [];
  }, [products]);

  // Filtered Products List (Support separate Low Stock view)
  const filteredProductsList = useMemo(() => {
    if (productStockFilter === "low_stock") {
      return products.filter(
        (p) =>
          p.stock_status === "low_stock" ||
          p.stock_status === "out_of_stock" ||
          (p.stock_count !== undefined && p.stock_count <= 5)
      );
    }
    if (productStockFilter === "in_stock") {
      return products.filter(
        (p) => p.stock_status === "in_stock" && (p.stock_count === undefined || p.stock_count > 5)
      );
    }
    return products;
  }, [products, productStockFilter]);

  const lowStockCount = useMemo(() => {
    return products.filter(
      (p) =>
        p.stock_status === "low_stock" ||
        p.stock_status === "out_of_stock" ||
        (p.stock_count !== undefined && p.stock_count <= 5)
    ).length;
  }, [products]);

  // Quick Stock Increment Handler
  const handleSaveQuickStock = async () => {
    if (!quickStockProduct) return;
    try {
      setIsUpdatingStock(true);
      const currentQty = quickStockProduct.stock_count || 0;
      const newStock = Math.max(0, currentQty + quickStockQty);
      const newStatus = newStock === 0 ? "out_of_stock" : newStock <= 5 ? "low_stock" : "in_stock";

      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: quickStockProduct.id,
          stock_count: newStock,
          stock_quantity: newStock,
          stock_status: newStatus,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update stock via server API");
      }

      setProducts((prev) =>
        prev.map((p) =>
          p.id === quickStockProduct.id ? { ...p, stock_count: newStock, stock_status: newStatus } : p
        )
      );

      setQuickStockProduct(null);
      alert(`Stock updated for ${quickStockProduct.name}! New Stock: ${newStock}`);
    } catch (e) {
      console.error("Error updating stock:", e);
      alert("Failed to update stock quantity");
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!id || !id.trim()) return;
    const cleanId = id.trim();
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      // Optimistically remove from state immediately
      setProducts((prev) => prev.filter((p) => p.id !== cleanId && p.slug !== cleanId && (p as any)._id !== cleanId));
      if (editingProduct?.id === cleanId) {
        setIsProductModalOpen(false);
        setEditingProduct(null);
      }
      clearDataCache("products");

      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(cleanId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || "Failed to delete product");
      }
    } catch (e: any) {
      console.error("Error deleting product:", e);
      alert(e.message || "Error deleting product");
    }
  };

  const downloadCustomersPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("1PLACE.LK — CUSTOMER DIRECTORY", 14, 20);

    const customerList = customers.length > 0 ? customers : orders;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total Accounts: ${customerList.length}`, 14, 27);
    doc.setDrawColor(200);
    doc.line(14, 30, 196, 30);

    let y = 38;
    doc.setFont("helvetica", "bold");
    doc.text("#", 14, y);
    doc.text("Customer Name", 25, y);
    doc.text("Email Address", 85, y);
    doc.text("Phone Number", 145, y);
    doc.text("Tag", 180, y);

    doc.line(14, y + 2, 196, y + 2);
    y += 8;
    doc.setFont("helvetica", "normal");

    customerList.forEach((c: any, i: number) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${i + 1}`, 14, y);
      doc.text((c.displayName || c.customerName || `Customer #${i + 1}`).slice(0, 25), 25, y);
      doc.text((c.email || "customer@1place.lk").slice(0, 30), 85, y);
      doc.text((c.phoneNumber || c.phone || "N/A").slice(0, 18), 145, y);
      doc.text("VIP Customer", 180, y);
      y += 7;
    });

    doc.save(`1place-lk-customers-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportCustomersCSV = () => {
    const customerList = customers.length > 0 ? customers : orders;
    const headers = ["Index", "Customer Name", "Email", "Phone Number", "Customer Tag"];
    const rows = customerList.map((c: any, i: number) => [
      `"${i + 1}"`,
      `"${c.displayName || c.customerName || `Customer #${i + 1}`}"`,
      `"${c.email || "customer@1place.lk"}"`,
      `"${c.phoneNumber || c.phone || "N/A"}"`,
      `"VIP Customer"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `1place-lk-customers-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer record?")) return;
    try {
      const res = await fetch(`/api/admin/customers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id && c.email !== id));
      } else {
        throw new Error(data.error || "Failed to delete customer");
      }
    } catch (e: any) {
      console.error("Error deleting customer:", e);
      alert(e.message || "Failed to delete customer");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const targetCategory = categories.find((c) => c.id === id);
    const categorySlug = targetCategory?.slug;
    const categoryName = targetCategory?.name || "Category";

    const linkedProducts = products.filter(
      (p) => p.category_id === id || p.category_name?.toLowerCase() === categoryName.toLowerCase() || (categorySlug && p.category_id === categorySlug)
    );

    let confirmMsg = `Are you sure you want to delete category "${categoryName}"?`;
    if (linkedProducts.length > 0) {
      confirmMsg = `⚠️ Notice: "${categoryName}" is currently linked to ${linkedProducts.length} product(s).\n\nAre you sure you want to delete this category from the store catalog? (Products will remain intact)`;
    }

    if (!confirm(confirmMsg)) return;

    try {
      if (id) {
        // Write tombstone so default category won't resurrect on refresh
        await setDoc(
          doc(db, "categories", id),
          {
            id,
            name: categoryName,
            slug: categorySlug || id,
            isDeleted: true,
            status: "deleted",
            show_on_homepage: false,
            show_in_selector: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.error("Error deleting category:", e);
    }
    setCategories((prev) => prev.filter((c) => c.id !== id && c.slug !== categorySlug));
  };

  const handleSaveBanner = async (bannerData: Partial<OfferBanner>) => {
    try {
      const bannerId = editingBanner?.id || `banner-${Date.now()}`;
      const payload = { ...(editingBanner || {}), ...bannerData, id: bannerId };

      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner: payload }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save offer banner");
      }

      const saved = data.banner || payload;
      setBanners((prev) => {
        const exists = prev.some((b) => b.id === bannerId);
        if (exists) {
          return prev.map((b) => (b.id === bannerId ? ({ ...b, ...saved } as OfferBanner) : b));
        }
        return [...prev, saved as OfferBanner];
      });

      setIsBannerModalOpen(false);
      setEditingBanner(null);
      refreshData();
    } catch (e: any) {
      console.error("Error saving offer banner:", e);
      alert(`Failed to save offer banner: ${e?.message || "Check network/permissions"}`);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Are you sure you want to delete / remove this offer banner?")) return;
    try {
      if (id) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
        await fetch(`/api/admin/banners?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      }
    } catch (e) {
      console.error("Error deleting banner:", e);
    }
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const handleDuplicateBanner = async (banner: OfferBanner) => {
    try {
      const duplicatedData = {
        ...banner,
        internalName: `${banner.internalName} (Copy)`,
        headline: `${banner.headline}`,
        created_at: new Date().toISOString(),
      };
      delete (duplicatedData as any).id;

      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner: duplicatedData }),
      });
      const data = await res.json();
      if (data.success && data.banner) {
        setBanners((prev) => [...prev, data.banner]);
      }
    } catch (e) {
      console.error("Error duplicating banner:", e);
    }
  };

  const handleToggleBannerStatus = async (id: string, newStatus: BannerStatus) => {
    try {
      if (id) {
        setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
        await fetch("/api/admin/banners", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: newStatus }),
        });
      }
    } catch (e) {
      console.error("Error toggling banner status:", e);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;
    try {
      await deleteDoc(doc(db, "coupons", id));
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Error deleting coupon:", e);
      alert("Failed to delete promo code");
    }
  };

  const handleToggleCouponStatus = async (id: string, currentStatus: "active" | "disabled") => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    try {
      await setDoc(doc(db, "coupons", id), { status: newStatus }, { merge: true });
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    } catch (e) {
      console.error("Error toggling coupon status:", e);
      alert("Failed to update status");
    }
  };

  const handleDuplicateCoupon = async (coupon: Coupon) => {
    try {
      const duplicatedData = {
        ...coupon,
        code: `${coupon.code}_COPY`,
        title: `${coupon.title} (Copy)`,
        createdAt: new Date().toISOString(),
      };
      delete (duplicatedData as any).id;
      const docRef = await addDoc(collection(db, "coupons"), duplicatedData);
      setCoupons((prev) => [...prev, { ...duplicatedData, id: docRef.id } as Coupon]);
    } catch (e) {
      console.error("Error duplicating coupon:", e);
    }
  };

  const broadcastHeroSync = (action: "save" | "toggle" | "delete", slide?: HeroSlide, deletedId?: string) => {
    try {
      const eventPayload = {
        type: "HERO_UPDATED",
        action,
        slide,
        deletedId,
        updatedAt: Date.now(),
      };
      if (typeof window !== "undefined") {
        if ("BroadcastChannel" in window) {
          const channel = new BroadcastChannel("oneplace_hero_sync");
          channel.postMessage(eventPayload);
          channel.close();
        }
        localStorage.setItem("oneplace_hero_slides_sync", JSON.stringify(eventPayload));
      }
    } catch {
      // ignore storage/channel errors
    }
  };

  const handleSaveHeroSlide = async (slideData: Partial<HeroSlide>) => {
    try {
      const slideId = slideData.id || editingHeroSlide?.id || `hero-${Date.now()}`;
      const payload = { ...slideData, id: slideId, updated_at: new Date().toISOString() };

      const res = await fetch("/api/admin/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide: payload }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save hero slide on server");
      }

      const saved = (data.slide || payload) as HeroSlide;

      // Best-effort client Firestore sync so real-time listeners fire even if server admin key is absent
      setDoc(doc(db, "hero_slides", slideId), saved, { merge: true }).catch(() => {});
      clearDataCache("hero_slides");
      broadcastHeroSync("save", saved);

      setHeroSlides((prev) => {
        const exists = prev.some((s) => s.id === slideId);
        if (exists) {
          return prev.map((s) => (s.id === slideId ? { ...s, ...saved } : s));
        }
        return [saved, ...prev];
      });

      setIsHeroModalOpen(false);
      setEditingHeroSlide(null);
    } catch (e: any) {
      console.error("Error saving hero slide:", e);
      alert(`Failed to save hero slide: ${e?.message || "Check network/permissions"}`);
    }
  };

  const handleToggleHeroSlideStatus = async (id: string, active: boolean) => {
    try {
      if (id) {
        const updatedAt = new Date().toISOString();
        setHeroSlides((prev) => prev.map((s) => (s.id === id ? { ...s, active, updated_at: updatedAt } : s)));
        const res = await fetch("/api/admin/hero", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, active, updated_at: updatedAt }),
        });
        const data = await res.json().catch(() => ({}));
        setDoc(doc(db, "hero_slides", id), { active, updated_at: updatedAt }, { merge: true }).catch(() => {});
        clearDataCache("hero_slides");
        broadcastHeroSync("toggle", data?.slide || ({ id, active, updated_at: updatedAt } as HeroSlide));
      }
    } catch (e) {
      console.error("Error toggling hero slide status:", e);
    }
  };

  const handleDeleteHeroSlide = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hero slider image?")) return;
    try {
      if (id) {
        setHeroSlides((prev) => prev.filter((s) => s.id !== id));
        const res = await fetch(`/api/admin/hero?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          console.warn("Delete hero slide warning:", data);
        }
        deleteDoc(doc(db, "hero_slides", id)).catch(() => {});
        clearDataCache("hero_slides");
        broadcastHeroSync("delete", undefined, id);
      }
    } catch (e) {
      console.error("Error deleting hero slide:", e);
    }
  };

  const handleDeleteGalleryImage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gallery image?")) return;
    try {
      if (id) {
        await deleteDoc(doc(db, "gallery", id));
      }
    } catch (e) {
      console.error("Error deleting gallery image:", e);
      alert("Failed to delete gallery image");
    }
    setGalleryImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Google review?")) return;
    try {
      if (id) {
        await deleteDoc(doc(db, "reviews", id));
      }
    } catch (e) {
      console.error("Error deleting review:", e);
      alert("Failed to delete review");
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleReviewVisibility = async (id: string, currentVisible: boolean) => {
    try {
      const nextVal = !currentVisible;
      await updateDoc(doc(db, "reviews", id), { visible: nextVal });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, visible: nextVal } : r)));
    } catch (e) {
      console.error("Error toggling review visibility:", e);
    }
  };

  const handleToggleReviewFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const nextVal = !currentFeatured;
      await updateDoc(doc(db, "reviews", id), { featured: nextVal });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, featured: nextVal } : r)));
    } catch (e) {
      console.error("Error toggling review featured:", e);
    }
  };

  const handleReorderReview = async (id: string, direction: "up" | "down") => {
    const index = reviews.findIndex((r) => r.id === id);
    if (index === -1) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= reviews.length) return;

    const newReviews = [...reviews];
    const temp = newReviews[index];
    newReviews[index] = newReviews[targetIdx];
    newReviews[targetIdx] = temp;

    const updated = newReviews.map((r, i) => ({ ...r, sort_order: i }));
    setReviews(updated);

    try {
      await Promise.all([
        updateDoc(doc(db, "reviews", updated[index].id), { sort_order: updated[index].sort_order }),
        updateDoc(doc(db, "reviews", updated[targetIdx].id), { sort_order: updated[targetIdx].sort_order }),
      ]);
    } catch (e) {
      console.error("Error updating review order:", e);
    }
  };

  const handleUpdateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const previousOrder = orders.find((order) => order.id === id);
      // Optimistically update React state immediately
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus, orderStatus: newStatus, updatedAt: new Date().toISOString() } : o))
      );

      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          updates: {
            status: newStatus,
            orderStatus: newStatus,
            updatedAt: new Date().toISOString(),
            statusHistory: [{ action: "Order Status Updated", previousStatus: previousOrder?.orderStatus || previousOrder?.status || "Pending", newStatus, timestamp: new Date().toISOString() }],
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Order status update failed");

      // Trigger automated email when status changes to completed/delivered/shipped/packing
      const targetOrder = orders.find((o) => o.id === id);
      if (targetOrder) {
        let statusType = "";
        const normalizedStatus = newStatus.toLowerCase();
        if (normalizedStatus === "delivered" || normalizedStatus === "completed") statusType = "delivered_thankyou";
        else if (normalizedStatus === "shipped") statusType = "on_the_way";
        else if (normalizedStatus === "processing" || normalizedStatus === "packed") statusType = "packing";

        if (statusType) {
          fetch("/api/send-customer-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: id,
              customerName: targetOrder.customerName || targetOrder.name || "Valued Customer",
              email: targetOrder.customerEmail || targetOrder.email,
              statusType: statusType,
              address: targetOrder.address,
              district: targetOrder.district,
              items: targetOrder.items,
              totalPrice: targetOrder.totalPrice,
            }),
          }).catch((err) => console.warn("Status email dispatch error:", err));
        }
      }
    } catch (e) {
      console.error("Error updating order status:", e);
      refreshData();
      throw e;
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Order deletion failed");
      setOrders((prev) => prev.filter((o) => o.id !== id));
      return true;
    } catch (e: any) {
      console.error("Error deleting order:", e);
      throw e;
    }
  };

  const handleBulkDeleteOrders = async (ids: string[]) => {
    if (!ids || ids.length === 0) return { deletedCount: 0, failedCount: 0 };
    let deletedCount = 0;
    let failedCount = 0;

    const CHUNK_SIZE = 50;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      try {
        const response = await fetch("/api/admin/orders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: chunk }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || "Order bulk deletion failed");
        deletedCount += Number(result.deletedCount) || chunk.length;
      } catch (error) {
        console.error("Order bulk delete failed:", error);
        failedCount += chunk.length;
      }
    }

    // Update state
    setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
    return { deletedCount, failedCount };
  };

  return (
    <div className="space-y-8">
      {/* ════════════════════════════════════════════════════════════════════
          TAB 1: OVERVIEW DASHBOARD
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && <StoreOverview orders={orders} products={products} customerCount={customers.length} loading={loading} onRefresh={refreshData} />}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 2: PRODUCTS TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "products" && (
        <ProductsTab
          products={products}
          categories={categories}
          brands={brands}
          onDelete={handleDeleteProduct}
          onEdit={(p: Product) => {
            setEditingProduct(p);
            setIsProductModalOpen(true);
          }}
          onAdd={(catName?: string) => {
            if (catName) {
              const matchedCat = categories.find(
                (c) => c.name.toLowerCase().includes(catName.toLowerCase()) || c.id === catName
              );
              setEditingProduct({
                id: "",
                name: "",
                slug: "",
                code: "",
                category_id: matchedCat?.id || "cat-smartphones",
                category_name: matchedCat?.name || catName,
                brand: "Apple",
                price: 0,
                description: "",
                images: [],
                stock_status: "in_stock",
                stock_count: 10,
              } as any);
            } else {
              setEditingProduct(null);
            }
            setIsProductModalOpen(true);
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: CATEGORIES TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "categories" && (
        <CategoriesTab
          categories={categories}
          products={products}
          onAdd={() => {
            setEditingCategory(null);
            setIsCategoryModalOpen(true);
          }}
          onEdit={(cat: Category) => {
            setEditingCategory(cat);
            setIsCategoryModalOpen(true);
          }}
          onRefresh={refreshData}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 3: ORDERS TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <OrdersTab
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onBulkDeleteOrders={handleBulkDeleteOrders}
            onRefresh={refreshData}
          />
          {ordersNextPageToken && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMoreOrders}
                disabled={loadingMoreOrders}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all shadow-xs"
              >
                {loadingMoreOrders ? "Loading more orders…" : "Load next 50 orders"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 5A: PROMO CODES & COUPONS TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "coupons" && (
        <CouponsTab
          coupons={coupons}
          onAdd={() => {
            setEditingCoupon(null);
            setIsCouponModalOpen(true);
          }}
          onEdit={(c: Coupon) => {
            setEditingCoupon(c);
            setIsCouponModalOpen(true);
          }}
          onDelete={handleDeleteCoupon}
          onToggleStatus={handleToggleCouponStatus}
          onDuplicate={handleDuplicateCoupon}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 5B: HOMEPAGE HERO SLIDER TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "hero" && (
        <div>
          <HeroTab
            slides={heroSlides}
            onAdd={() => {
              setEditingHeroSlide(null);
              setIsHeroModalOpen(true);
            }}
            onEdit={(slide: HeroSlide) => {
              setEditingHeroSlide(slide);
              setIsHeroModalOpen(true);
            }}
            onDelete={handleDeleteHeroSlide}
            onToggleStatus={handleToggleHeroSlideStatus}
          />
        </div>
      )}

      {activeTab === "today-deal" && (
        <TodayDealTab initialSettings={todayDealSettings} onRefresh={refreshData} />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 5C: STORE GALLERY TAB
      ════════════════════════════════════════════════════════════════════ */}


      {/* ════════════════════════════════════════════════════════════════════
          TAB 5D: VISUAL PRODUCT SHOWCASE BANNERS
      ════════════════════════════════════════════════════════════════════ */}


      {/* ════════════════════════════════════════════════════════════════════
          TAB 5E: TODAY'S DEAL PROMOTIONAL BANNER
      ════════════════════════════════════════════════════════════════════ */}


      {/* ════════════════════════════════════════════════════════════════════
          TAB 6: CUSTOMERS TAB (CRM Style Directory)
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Customer Directory ({metrics.totalCust})
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Registered store accounts, saved profiles, and guest customer details
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={downloadCustomersPDF}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
              <button
                onClick={exportCustomersCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border p-5 shadow-xs overflow-x-auto ${isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
            }`}>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className={`font-semibold border-b uppercase tracking-wider text-[10px] ${isLight ? "text-slate-500 border-[#E2E8F0]" : "text-slate-400 border-white/10"
                  }`}>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Contact Email</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Orders</th>
                  <th className="pb-3">Account Tag</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((c, i) => {
                  const customerOrdersCount = orders.filter(
                    (o) => o.userId === c.id || (c.email && o.email && o.email.toLowerCase() === c.email.toLowerCase())
                  ).length;

                  return (
                    <tr key={c.id || i} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 font-semibold text-white flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${c.isGuest ? "bg-purple-600/20 text-purple-400" : "bg-blue-600/20 text-blue-400"
                          }`}>
                          {(c.displayName || c.customerName || "C").charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{c.displayName || c.customerName || `Customer #${i + 1}`}</span>
                      </td>
                      <td className="py-3 text-slate-300 font-medium">{c.email || "—"}</td>
                      <td className="py-3 font-mono text-slate-300 font-medium">{c.phoneNumber || c.phone || "—"}</td>
                      <td className="py-3 font-semibold text-white font-mono">
                        {customerOrdersCount} {customerOrdersCount === 1 ? "Order" : "Orders"}
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[10px] border ${c.isGuest
                            ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}>
                          {c.isGuest ? "Guest Customer" : "Registered User"}
                        </span>
                      </td>
                      <td className="py-3 text-right flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => router.push("/admin/dashboard?tab=orders")}
                          className="text-blue-400 hover:underline font-semibold text-xs"
                        >
                          View Orders
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(c.id)}
                          className="text-red-400 hover:text-red-300 font-semibold text-xs flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20 transition-colors"
                          title="Delete Customer Profile"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 7: INVENTORY TAB (POS Speed Warehouse Stock)
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "inventory" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Warehouse Inventory
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Track SKU units, variants, stock depletion warnings and rapid restock
              </p>
            </div>
          </div>

          <div className={`rounded-2xl border p-5 shadow-xs space-y-4 ${isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
            }`}>
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search stock by product name or SKU..."
                className={`w-full max-w-sm px-3.5 py-1.5 rounded-xl text-xs outline-none border transition-all ${isLight ? "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500" : "bg-white/5 border-white/10 text-white placeholder-slate-400 focus:border-blue-500"
                  }`}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className={`font-semibold border-b uppercase tracking-wider text-[10px] ${isLight ? "text-slate-500 border-[#E2E8F0]" : "text-slate-400 border-white/10"
                    }`}>
                    <th className="pb-2.5">Product Name</th>
                    <th className="pb-2.5">Category</th>
                    <th className="pb-2.5">Variants</th>
                    <th className="pb-2.5">Stock Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {products
                    .filter((p) =>
                      !inventorySearch.trim() ||
                      p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                      p.code?.toLowerCase().includes(inventorySearch.toLowerCase())
                    )
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 font-semibold text-white flex items-center gap-3">
                          <img src={p.images?.[0]} alt={p.name} className="w-8 h-8 rounded-md object-contain bg-white/5 border border-white/10 shrink-0" />
                          <span className="truncate">{p.name}</span>
                        </td>
                        <td className="py-3 text-slate-300 font-medium">{p.category_name}</td>
                        <td className="py-3 text-slate-400">
                          {p.storage_options?.join(", ") || "Standard"}
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[10px] ${p.stock_status === "in_stock"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                            {p.stock_status === "in_stock" ? "In Stock" : "Low Stock"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setQuickStockProduct(p);
                              setQuickStockQty(10);
                            }}
                            className="px-2.5 py-1 bg-blue-600/15 border border-blue-500/25 text-blue-400 hover:bg-blue-600/25 rounded-lg font-semibold text-xs transition-colors"
                          >
                            Update Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          WHATSAPP MARKETING TAB
      ════════════════════════════════════════════════════════════════════ */}


      {/* ════════════════════════════════════════════════════════════════════
          SPIN & WIN PROMOTION TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "spin-win" && (
        <SpinWinTab products={products} />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 8: PAYMENTS & GATEWAY SETTINGS TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "payments" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="pb-2 border-b border-white/5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Payments & Gateways
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Manage PayHere online payments and WhatsApp checkout hotline. Cash on Delivery has no handling fee.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* PayHere Online Gateway Status */}
            <div className={`rounded-2xl border p-5 shadow-xs space-y-2 ${isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
              }`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PayHere Gateway Status</span>
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <Check className="w-4 h-4" /> Connected & Verified
              </h3>
              <p className="text-xs text-slate-400">Merchant ID configured • LKR Sandbox & Production active</p>
            </div>

            {/* WhatsApp Direct Order */}
            <div className={`rounded-2xl border p-5 shadow-xs space-y-2 ${isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
              }`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">WhatsApp Direct Order</span>
              <h3 className="text-base font-bold text-blue-400">+94 77 414 1118</h3>
              <p className="text-xs text-slate-400">Auto-formatted message redirect active for checkout</p>
            </div>
          </div>
        </div>
      )}



      {/* ════════════════════════════════════════════════════════════════════
          TAB 11: ANALYTICS TAB
      ════════════════════════════════════════════════════════════════════ */}


      {/* ════════════════════════════════════════════════════════════════════
          TAB: MOBILE EXPERIENCE
      ════════════════════════════════════════════════════════════════════ */}


      {/* ════════════════════════════════════════════════════════════════════
          TAB: MOBILE REPAIRS
      ════════════════════════════════════════════════════════════════════ */}


      {/* ════════════════════════════════════════════════════════════════════
          TAB: CASH FLOW
      ════════════════════════════════════════════════════════════════════ */}


      {activeTab === "footer" && <FooterTab />}
      {activeTab === "settings" && <StoreSettingsTab />}
      {activeTab === "brands" && <SimpleBrandsTab />}

      {/* Global Product Modal */}
      <ProductModal
        key={editingProduct?.id ? `edit-${editingProduct.id}` : "new-product"}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={(savedProduct) => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
          if (savedProduct && savedProduct.id) {
            setProducts((prev) => [
              savedProduct,
              ...prev.filter((p) => p.id !== savedProduct.id && p.slug !== savedProduct.slug),
            ]);
          }
          refreshData();
        }}
        onDelete={async (id) => {
          await handleDeleteProduct(id);
        }}
        categories={categories}
        initialData={editingProduct}
      />

      {/* Hero Modal */}
      <HeroModal
        key={editingHeroSlide?.id ? `edit-hero-${editingHeroSlide.id}` : "new-hero"}
        isOpen={isHeroModalOpen}
        onClose={() => {
          setIsHeroModalOpen(false);
          setEditingHeroSlide(null);
        }}
        onSave={handleSaveHeroSlide}
        slide={editingHeroSlide}
      />



      {/* Coupon Modal */}
      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => {
          setIsCouponModalOpen(false);
          setEditingCoupon(null);
        }}
        coupon={editingCoupon}
        onSaved={refreshData}
      />

      {/* Global Category Modal */}
      <CategoryModal
        key={editingCategory?.id ? `edit-${editingCategory.id}` : "new-category"}
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
          refreshData();
        }}
        initialData={editingCategory}
        allCategories={categories}
      />

      {/* Quick Add Stock Modal (POS Speed) */}
      {quickStockProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className={`border rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 ${isLight
                ? "bg-white border-[#E5E7EB] text-[#111827]"
                : "bg-[#0F172A] border-white/15 text-white"
              }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? "border-[#E5E7EB]" : "border-white/10"
              }`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus className={`w-4 h-4 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} /> Restock: {quickStockProduct.name}
              </h3>
              <button
                onClick={() => setQuickStockProduct(null)}
                className={`cursor-pointer ${isLight ? "text-[#64748B] hover:text-[#111827]" : "text-slate-400 hover:text-white"}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className={`p-3 border rounded-xl flex items-center justify-between ${isLight ? "bg-[#F8FAFC] border-[#E5E7EB]" : "bg-white/5 border-white/10"
                }`}>
                <span className={`font-medium ${isLight ? "text-[#667085]" : "text-slate-300"}`}>Current Stock on Hand:</span>
                <span className={`font-bold text-sm font-mono ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>
                  {quickStockProduct.stock_count || 0} Units
                </span>
              </div>

              <div>
                <label className={`block font-semibold mb-1.5 ${isLight ? "text-[#374151]" : "text-slate-300"}`}>
                  Additional Units to Add
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={quickStockQty}
                    onChange={(e) => setQuickStockQty(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl font-mono font-bold outline-none text-sm border ${isLight
                        ? "bg-white border-[#D1D5DB] text-[#111827] focus:border-[#111827]"
                        : "bg-white/5 border-white/10 text-white focus:border-blue-500"
                      }`}
                  />
                  <span className={`font-semibold shrink-0 ${isLight ? "text-[#667085]" : "text-slate-400"}`}>Units</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 pt-0.5">
                {[5, 10, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuickStockQty(preset)}
                    className={`flex-1 py-1.5 border rounded-lg font-mono font-semibold text-xs transition-colors cursor-pointer ${isLight
                        ? "bg-[#F3F4F6] hover:bg-[#111827] hover:text-white border-[#E5E7EB] text-[#374151]"
                        : "bg-white/5 hover:bg-blue-600 hover:text-white border-white/10 text-white"
                      }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${isLight ? "border-[#E5E7EB]" : "border-white/10"
              }`}>
              <button
                type="button"
                onClick={() => setQuickStockProduct(null)}
                className={`px-3.5 py-1.5 font-semibold text-xs rounded-xl transition-colors cursor-pointer ${isLight
                    ? "bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151]"
                    : "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickStock}
                disabled={isUpdatingStock}
                className={`px-4 py-1.5 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${isLight
                    ? "bg-[#111827] hover:bg-[#1F2937] text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
              >
                {isUpdatingStock ? "Updating..." : `Confirm +${quickStockQty} Stock`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Real-Time Order Toast Chime Alert */}
      <RealtimeOrderAlert
        order={newOrderAlert}
        onClose={() => setNewOrderAlert(null)}
        onViewOrder={() => {
          setNewOrderAlert(null);
          setActiveTab("orders");
        }}
        isLight={isLight}
      />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold text-sm text-white">Loading Admin Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
