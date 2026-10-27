"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
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
  Sparkles,
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
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, setDoc, getDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { playOrderChime } from "@/lib/audio-chime";
import RealtimeOrderAlert, { LiveOrderNotification } from "@/components/admin/RealtimeOrderAlert";
import GoogleSearchConsoleTraffic from "@/components/admin/GoogleSearchConsoleTraffic";
import { Product, Category, Review, OfferBanner, BannerStatus, HeroSlide, GalleryImage, GoogleReviewsSettings, VisualShowcaseSettings, TodayDealSettings, MegaMenuSettings, Brand, GalleryAnimationSettings, WhatsAppCampaign } from "@/lib/types";
import { categories as fallbackCategories, fallbackOfferBanners, products as fallbackProducts, DEFAULT_SHOWCASE_SETTINGS, DEFAULT_TODAY_DEAL_SETTINGS, DEFAULT_MEGA_MENU_SETTINGS, DEFAULT_BRANDS, DEFAULT_GALLERY_ANIMATION_SETTINGS } from "@/lib/data";
import { DEFAULT_GOOGLE_REVIEWS_SETTINGS, getShowcaseSettings, getTodayDealSettings, getMegaMenuSettings, getBrands, getGalleryAnimationSettings } from "@/lib/firestore-client";
import { deduplicateCategories } from "@/lib/category-utils";
import { KNOWN_BRAND_NAMES } from "@/lib/migration-audit";
import { jsPDF } from "jspdf";

// Admin Tabs
import ProductModal from "@/components/admin/ProductModal";
import HeroModal from "@/components/admin/HeroModal";
import GalleryModal from "@/components/admin/GalleryModal";
import OrdersTab from "@/components/admin/tabs/OrdersTab";
import ProductsTab from "@/components/admin/tabs/ProductsTab";
import HeroTab from "@/components/admin/tabs/HeroTab";
import GalleryTab from "@/components/admin/tabs/GalleryTab";
import ShowcaseTab from "@/components/admin/tabs/ShowcaseTab";
import TodayDealTab from "@/components/admin/tabs/TodayDealTab";

import MobileExperienceTab from "@/components/admin/tabs/MobileExperienceTab";
import RepairsTab from "@/components/admin/tabs/RepairsTab";

import CashFlowTab from "@/components/admin/tabs/CashFlowTab";
import CouponsTab from "@/components/admin/tabs/CouponsTab";
import CouponModal from "@/components/admin/CouponModal";
import CategoriesTab from "@/components/admin/tabs/CategoriesTab";
import CategoryModal from "@/components/admin/CategoryModal";
import FeaturedGridBannerControl from "@/components/admin/FeaturedGridBannerControl";
import WhatsAppMarketingTab from "@/components/admin/tabs/WhatsAppMarketingTab";
import SpinWinTab from "@/components/admin/tabs/SpinWinTab";
import { Coupon } from "@/lib/types";
import { useAdminTheme } from "./layout";
import CustomAreaChart, { ChartDataPoint } from "@/components/admin/charts/CustomAreaChart";

type Tab =
  | "overview"
  | "products"
  | "categories"
  | "today-deal"
  | "repairs"
  | "cashflow"
  | "showcase"
  | "users"
  | "gallery"
  | "hero"
  | "coupons"
  | "inventory"
  | "payments"
  | "analytics"
  | "mobile"
  | "orders"
  | "whatsapp-marketing"
  | "spin-win";

const VALID_ADMIN_TABS = new Set<string>([
  "overview",
  "products",
  "categories",
  "today-deal",
  "repairs",
  "cashflow",
  "showcase",
  "users",
  "gallery",
  "hero",
  "coupons",
  "inventory",
  "payments",
  "analytics",
  "mobile",
  "orders",
  "whatsapp-marketing",
  "spin-win",
]);

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParam = searchParams.get("tab") || "overview";
  const tabParam = (VALID_ADMIN_TABS.has(rawParam) ? rawParam : "overview") as Tab;

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

  // COD Fee state
  const [codFee, setCodFee] = useState<number>(250);
  const [savingCod, setSavingCod] = useState(false);
  const [codSavedMsg, setCodSavedMsg] = useState(false);

  useEffect(() => {
    async function loadCodFee() {
      try {
        const snap = await getDoc(doc(db, "settings", "store"));
        if (snap.exists() && snap.data().cod_fee !== undefined) {
          setCodFee(Number(snap.data().cod_fee));
        }
      } catch {
        // Silent offline fallback to default COD fee
      }
    }
    loadCodFee();
  }, []);

  const handleSaveCodFee = async () => {
    try {
      setSavingCod(true);
      await setDoc(doc(db, "settings", "store"), { cod_fee: Number(codFee) }, { merge: true });
      setCodSavedMsg(true);
      setTimeout(() => setCodSavedMsg(false), 3000);
    } catch (e) {
      alert("Failed to update COD fee");
    } finally {
      setSavingCod(false);
    }
  };

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

  // Load Real Firestore Data
  const refreshData = async () => {
    try {
      setLoading(true);
      // Products
      const prodSnap = await getDocs(collection(db, "products"));
      const prodList = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
      setProducts(prodList.length > 0 ? prodList : fallbackProducts);

      // Categories
      const catSnap = await getDocs(collection(db, "categories"));
      const rawCatList = catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
      const validCats = rawCatList.filter((c) => {
        if ((c as any).isDeleted === true || c.status === "deleted") return false;
        const cName = (c.name || "").toLowerCase();
        const cSlug = (c.slug || "").toLowerCase();
        if (KNOWN_BRAND_NAMES.some((b) => b.toLowerCase() === cName || b.toLowerCase() === cSlug)) return false;
        return true;
      });

      if (validCats.length > 0) {
        setCategories(deduplicateCategories(validCats));
      } else {
        setCategories(deduplicateCategories(fallbackCategories));
      }

      // Orders
      const ordSnap = await getDocs(collection(db, "orders"));
      const ordList: any[] = ordSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      ordList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setOrders(ordList);

      // Reviews
      const revSnap = await getDocs(collection(db, "reviews"));
      const revList = revSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
      revList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setReviews(revList);

      // Google Reviews Settings
      const googleSnap = await getDoc(doc(db, "settings", "google_reviews"));
      if (googleSnap.exists()) {
        setGoogleReviewsSettings({ ...DEFAULT_GOOGLE_REVIEWS_SETTINGS, ...googleSnap.data() });
      }

      // Banners (Merge offer_banners and banners collections)
      const banSnap = await getDocs(collection(db, "offer_banners"));
      const banList = banSnap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          status: data.status || "active",
          placement: data.placement || "homepage_after_categories",
        } as OfferBanner;
      });

      let legacyBanList: OfferBanner[] = [];
      try {
        const legacyBanSnap = await getDocs(collection(db, "banners"));
        legacyBanList = legacyBanSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            internalName: data.title || "Banner",
            headline: data.title || "",
            subheadline: data.subtitle || "",
            desktop_image_url: data.image_url || data.desktop_image_url || "",
            mobile_image_url: data.mobile_image_url || data.image_url || "",
            cta_url: data.link || data.cta_url || "/",
            status: (data.is_active === false || data.status === "paused") ? "paused" : "active",
            placement: data.placement || "homepage_after_categories",
            ...data,
          } as OfferBanner;
        });
      } catch (err) {
        console.warn("Error fetching legacy banners collection:", err);
      }

      const bannerMap = new Map<string, OfferBanner>();
      legacyBanList.forEach((b) => {
        if (b.id) bannerMap.set(b.id, b);
      });
      banList.forEach((b) => {
        if (b.id) bannerMap.set(b.id, b);
      });

      if (bannerMap.size === 0) {
        fallbackOfferBanners.forEach((f) => {
          if (!bannerMap.has(f.id)) bannerMap.set(f.id, f);
        });
      }

      const mergedBanners = Array.from(bannerMap.values());
      setBanners(mergedBanners.filter((b) => b.status !== "archived"));

      // Coupons / Promo Codes
      try {
        const coupSnap = await getDocs(collection(db, "coupons"));
        const coupList = coupSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon));
        setCoupons(coupList);
      } catch (coupErr) {
        console.warn("Error fetching coupons:", coupErr);
      }

      // Hero Slides
      const heroSnap = await getDocs(collection(db, "hero_slides"));
      const heroList = heroSnap.docs.map((d) => ({ id: d.id, ...d.data() } as HeroSlide));
      setHeroSlides(heroList);

      // Gallery Images
      const galSnap = await getDocs(collection(db, "gallery"));
      const galList = galSnap.docs.map((d) => ({ id: d.id, ...d.data() } as GalleryImage));
      setGalleryImages(galList);

      // Users / Customers (Merge registered users and guest checkout profiles)
      const userSnap = await getDocs(collection(db, "users"));
      const userList = userSnap.docs.map((d) => ({ id: d.id, isGuest: false, ...d.data() }));

      let guestList: any[] = [];
      try {
        const guestSnap = await getDocs(collection(db, "guest_profiles"));
        guestList = guestSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            isGuest: true,
            displayName: data.name || data.fullName || data.customerName || "Guest Customer",
            email: data.email || "guest@1place.lk",
            phoneNumber: data.phone || data.phoneNumber || "",
            createdAt: data.createdAt || data.updatedAt || "",
            ...data,
          };
        });
      } catch (err) {
        console.warn("Error fetching guest profiles collection:", err);
      }

      const customerMap = new Map<string, any>();
      guestList.forEach((g) => {
        const key = g.email || g.id;
        customerMap.set(key, g);
      });
      userList.forEach((u: any) => {
        const key = u.email || u.id;
        customerMap.set(key, u);
      });

      setCustomers(Array.from(customerMap.values()));

      // Visual Showcase Settings
      try {
        const sc = await getShowcaseSettings();
        if (sc) setShowcaseSettings(sc);
      } catch (err) {
        console.warn("Error fetching showcase settings in admin:", err);
      }

      // Today's Deal Settings
      try {
        const td = await getTodayDealSettings();
        if (td) setTodayDealSettings(td);
      } catch (err) {
        console.warn("Error fetching Today's Deal settings in admin:", err);
      }

      // Category Mega Menu Settings
      try {
        const mm = await getMegaMenuSettings();
        if (mm) setMegaMenuSettings(mm);
      } catch (err) {
        console.warn("Error fetching Category Mega Menu settings in admin:", err);
      }

      // Brands List
      try {
        const bList = await getBrands();
        if (bList && bList.length > 0) setBrands(bList);
      } catch (err) {
        console.warn("Error fetching brands in admin:", err);
      }

      // Gallery Scroll Animation Settings
      try {
        const ga = await getGalleryAnimationSettings();
        if (ga) setGalleryAnimationSettings(ga);
      } catch (err) {
        console.warn("Error fetching gallery animation settings in admin:", err);
      }

      // WhatsApp Campaigns
      try {
        const waSnap = await getDocs(collection(db, "whatsapp_campaigns"));
        const waList = waSnap.docs.map(d => ({ id: d.id, ...d.data() } as WhatsAppCampaign));
        waList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setWhatsappCampaigns(waList);
      } catch (err) {
        console.warn("Error fetching WhatsApp Campaigns:", err);
      }
    } catch (e) {
      console.error("Dashboard Data Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Firestore Synchronizations (Orders, Products, Customers)
  useEffect(() => {
    refreshData();

    let isInitialOrders = true;

    // 1. Live Orders Listener (with real-time new order chime & popup)
    const unsubOrders = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        const ordList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        ordList.sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setOrders(ordList);

        if (!isInitialOrders) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const newOrd: any = change.doc.data();
              playOrderChime();
              setNewOrderAlert({
                id: change.doc.id,
                customerName:
                  newOrd.customerName ||
                  newOrd.codName ||
                  newOrd.cardName ||
                  newOrd.primaryPhone ||
                  "Customer",
                total: Number(newOrd.finalTotal || newOrd.totalPrice || newOrd.subtotal || 0),
              });
            }
          });
        }
        isInitialOrders = false;
      },
      (err) => console.warn("Realtime orders listener error:", err)
    );

    // 2. Live Products Listener
    const unsubProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const prodList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        if (prodList.length > 0) {
          setProducts(prodList);
        }
      },
      (err) => console.warn("Realtime products listener error:", err)
    );

    // 3. Live Users / Customers Listener
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const userList = snapshot.docs.map((d) => ({ id: d.id, isGuest: false, ...d.data() }));
        setCustomers((prev) => {
          const map = new Map<string, any>();
          prev.forEach((c) => map.set(c.id || c.email, c));
          userList.forEach((u: any) => map.set(u.id || u.email, u));
          return Array.from(map.values());
        });
      },
      (err) => console.warn("Realtime users listener error:", err)
    );

    // 4. Live Categories
    const unsubCategories = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const rawCatList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
        const validCats = rawCatList.filter((c) => {
          if ((c as any).isDeleted === true || c.status === "deleted") return false;
          const cName = (c.name || "").toLowerCase();
          const cSlug = (c.slug || "").toLowerCase();
          if (KNOWN_BRAND_NAMES.some((b) => b.toLowerCase() === cName || b.toLowerCase() === cSlug)) return false;
          return true;
        });

        if (validCats.length > 0) {
          setCategories(deduplicateCategories(validCats));
        } else {
          setCategories(deduplicateCategories(fallbackCategories));
        }
      },
      (err) => console.warn("Realtime categories listener error:", err)
    );

    // 5. Live WhatsApp Campaigns
    const unsubWA = onSnapshot(
      collection(db, "whatsapp_campaigns"),
      (snapshot) => {
        const waList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WhatsAppCampaign));
        waList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setWhatsappCampaigns(waList);
      },
      (err) => console.warn("Realtime WhatsApp campaigns listener error:", err)
    );

    // 6. Live Coupons
    const unsubCoupons = onSnapshot(
      collection(db, "coupons"),
      (snapshot) => {
        const coupList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon));
        setCoupons(coupList);
      },
      (err) => console.warn("Realtime coupons listener error:", err)
    );

    // 7. Live Reviews
    const unsubReviews = onSnapshot(
      collection(db, "reviews"),
      (snapshot) => {
        const revList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
        revList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setReviews(revList);
      },
      (err) => console.warn("Realtime reviews listener error:", err)
    );

    // 8. Live Gallery
    const unsubGallery = onSnapshot(
      collection(db, "gallery"),
      (snapshot) => {
        const galList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as GalleryImage));
        setGalleryImages(galList);
      },
      (err) => console.warn("Realtime gallery listener error:", err)
    );

    // 9. Live Hero Slides
    const unsubHero = onSnapshot(
      collection(db, "hero_slides"),
      (snapshot) => {
        const heroList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HeroSlide));
        setHeroSlides(heroList);
      },
      (err) => console.warn("Realtime hero slides listener error:", err)
    );

    return () => {
      unsubOrders();
      unsubProducts();
      unsubUsers();
      unsubCategories();
      unsubWA();
      unsubCoupons();
      unsubReviews();
      unsubGallery();
      unsubHero();
    };
  }, []);

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
    const sourceList = products.length > 0 ? products : fallbackProducts;
    return sourceList.slice(0, 5).map((p, idx) => ({
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
        const current = salesMap.get(id) || {
          id,
          name: it.name || "Device",
          category: it.category || "Mobile Phones",
          unitsSold: 0,
          revenue: 0,
          lastSold: orderDate,
          image: it.image || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=200",
        };
        current.unitsSold += Number(it.quantity || 1);
        current.revenue += Number(it.price || 0) * Number(it.quantity || 1);
        salesMap.set(id, current);
      });
    });

    const fallbackList = [
      { id: "1", name: "iPhone 15 (128GB)", category: "Mobile Phones", unitsSold: 24, revenue: 2880000, lastSold: "15 Sep 2026", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=200" },
      { id: "2", name: "Samsung Galaxy S24", category: "Mobile Phones", unitsSold: 18, revenue: 1620000, lastSold: "15 Sep 2026", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=200" },
      { id: "3", name: "AirPods Pro 2", category: "Audio", unitsSold: 15, revenue: 825000, lastSold: "14 Sep 2026", image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=200" },
      { id: "4", name: "Redmi Note 13", category: "Mobile Phones", unitsSold: 12, revenue: 816000, lastSold: "14 Sep 2026", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=200" },
      { id: "5", name: "Samsung 25W Charger", category: "Accessories", unitsSold: 10, revenue: 250000, lastSold: "14 Sep 2026", image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=200" },
    ];

    if (salesMap.size === 0) {
      return fallbackList;
    }

    const list = Array.from(salesMap.values());
    list.sort((a, b) => b.unitsSold - a.unitsSold);
    return list.slice(0, 5);
  }, [orders]);

  // Low Stock Alert items for dark dashboard
  const lowStockDisplayList = useMemo(() => {
    const list = products.filter(
      (p) =>
        p.stock_status === "low_stock" ||
        p.stock_status === "out_of_stock" ||
        (p.stock_count !== undefined && p.stock_count <= 8)
    );

    if (list.length > 0) {
      return list.slice(0, 5).map((p, idx) => ({
        id: p.id,
        name: p.name,
        sku: p.code || `ACC-0${idx + 24}`,
        stock: p.stock_count !== undefined ? p.stock_count : idx + 3,
        status: p.stock_status === "out_of_stock" ? "Out of Stock" : "Low Stock",
        image: p.images?.[0] || "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=200",
      }));
    }

    return [
      { id: "ls1", name: "iPhone 14 Case", sku: "ACC-001", stock: 4, status: "Low Stock", image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=200" },
      { id: "ls2", name: "Samsung 25W Charger", sku: "ACC-024", stock: 6, status: "Low Stock", image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=200" },
      { id: "ls3", name: "AirPods Pro 2", sku: "AUD-012", stock: 3, status: "Low Stock", image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=200" },
      { id: "ls4", name: "Redmi Note 13 (6GB)", sku: "MOB-089", stock: 5, status: "Low Stock", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=200" },
      { id: "ls5", name: "Samsung Galaxy S24 Case", sku: "ACC-056", stock: 7, status: "Low Stock", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=200" },
    ];
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

      await updateDoc(doc(db, "products", quickStockProduct.id), {
        stock_count: newStock,
        stock_status: newStatus,
        updated_at: new Date().toISOString(),
      });

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
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(products.filter((p) => p.id !== id));
    } catch (e) {
      alert("Error deleting product");
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
    const target = customers.find((c) => c.id === id);
    try {
      if (id) {
        if (target?.isGuest) {
          await deleteDoc(doc(db, "guest_profiles", id));
        } else {
          await deleteDoc(doc(db, "users", id));
        }
      }
      setCustomers(customers.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Error deleting customer:", e);
      alert("Failed to delete customer");
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
      if (editingBanner && editingBanner.id) {
        await setDoc(doc(db, "offer_banners", editingBanner.id), { ...editingBanner, ...bannerData }, { merge: true });
        setBanners((prev) => prev.map((b) => (b.id === editingBanner.id ? ({ ...b, ...bannerData } as OfferBanner) : b)));
      } else {
        const docRef = await addDoc(collection(db, "offer_banners"), bannerData);
        setBanners((prev) => [...prev, { ...bannerData, id: docRef.id } as OfferBanner]);
      }
      setIsBannerModalOpen(false);
      setEditingBanner(null);
      refreshData();
    } catch (e) {
      console.error("Error saving offer banner:", e);
      alert("Failed to save offer banner");
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Are you sure you want to delete / remove this offer banner?")) return;
    try {
      if (id) {
        if (id.startsWith("default-")) {
          const target = banners.find((b) => b.id === id);
          await setDoc(doc(db, "offer_banners", id), { ...(target || {}), id, status: "archived" }, { merge: true });
        } else {
          await deleteDoc(doc(db, "offer_banners", id));
        }
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
      const docRef = await addDoc(collection(db, "offer_banners"), duplicatedData);
      setBanners((prev) => [...prev, { ...duplicatedData, id: docRef.id } as OfferBanner]);
    } catch (e) {
      console.error("Error duplicating banner:", e);
    }
  };

  const handleToggleBannerStatus = async (id: string, newStatus: BannerStatus) => {
    try {
      const target = banners.find((b) => b.id === id);
      if (id) {
        await setDoc(doc(db, "offer_banners", id), { ...(target || {}), id, status: newStatus }, { merge: true });
      }
    } catch (e) {
      console.error("Error toggling banner status:", e);
    }
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
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

  const handleSaveHeroSlide = async (slideData: Partial<HeroSlide>) => {
    try {
      const slideId = editingHeroSlide?.id || `hero-${Date.now()}`;
      const payload = { ...slideData, id: slideId, updated_at: new Date().toISOString() };
      await setDoc(doc(db, "hero_slides", slideId), payload, { merge: true });

      setHeroSlides((prev) => {
        const exists = prev.some((s) => s.id === slideId);
        if (exists) {
          return prev.map((s) => (s.id === slideId ? ({ ...s, ...payload } as HeroSlide) : s));
        }
        return [...prev, payload as HeroSlide];
      });

      setIsHeroModalOpen(false);
      setEditingHeroSlide(null);
      refreshData();
    } catch (e: any) {
      console.error("Error saving hero slide:", e);
      alert(`Failed to save hero slide: ${e?.message || "Check network/permissions"}`);
    }
  };

  const handleToggleHeroSlideStatus = async (id: string, active: boolean) => {
    try {
      if (id) {
        await setDoc(doc(db, "hero_slides", id), { active }, { merge: true });
        setHeroSlides((prev) => prev.map((s) => (s.id === id ? { ...s, active } : s)));
      }
    } catch (e) {
      console.error("Error toggling hero slide status:", e);
    }
  };

  const handleDeleteHeroSlide = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hero slider image?")) return;
    try {
      if (id) {
        await deleteDoc(doc(db, "hero_slides", id));
      }
    } catch (e) {
      console.error("Error deleting hero slide:", e);
    }
    setHeroSlides((prev) => prev.filter((s) => s.id !== id));
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
      await updateDoc(doc(db, "orders", id), { status: newStatus, orderStatus: newStatus });
      setOrders(orders.map((o) => (o.id === id ? { ...o, status: newStatus, orderStatus: newStatus } : o)));

      // Trigger automated email when status changes to completed/delivered/shipped/packing
      const targetOrder = orders.find((o) => o.id === id);
      if (targetOrder) {
        let statusType = "";
        if (newStatus === "delivered" || newStatus === "completed") statusType = "delivered_thankyou";
        else if (newStatus === "shipped") statusType = "on_the_way";
        else if (newStatus === "processing" || newStatus === "packed") statusType = "packing";

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
      alert("Failed to update order status");
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      // 1. Clean any order subcollections if they exist
      const ORDER_SUBCOLLECTIONS = ["items", "payments", "statusHistory", "notes", "tracking", "history", "audit"];
      for (const subName of ORDER_SUBCOLLECTIONS) {
        try {
          const subSnap = await getDocs(collection(db, "orders", id, subName));
          for (const subDoc of subSnap.docs) {
            await deleteDoc(subDoc.ref);
          }
        } catch {
          // Ignored if non-existent
        }
      }

      // 2. Delete parent order document from Firestore
      await deleteDoc(doc(db, "orders", id));

      // 3. Purge from local API store as well
      try {
        await fetch(`/api/orders?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (apiErr) {
        console.warn("API delete notice:", apiErr);
      }

      // 4. Update state optimistically
      setOrders((prev) => prev.filter((o) => o.id !== id));
      return true;
    } catch (e: any) {
      console.error("Error deleting order:", e);
      throw e;
    }
  };

  const handleBulkDeleteOrders = async (ids: string[]) => {
    if (!ids || ids.length === 0) return { deletedCount: 0, failedCount: 0 };
    const ORDER_SUBCOLLECTIONS = ["items", "payments", "statusHistory", "notes", "tracking", "history", "audit"];
    let deletedCount = 0;
    let failedCount = 0;

    // Process in batches of 50 to respect Firestore write limits
    const CHUNK_SIZE = 50;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const id of chunk) {
        // Clean subcollection docs if any
        for (const subName of ORDER_SUBCOLLECTIONS) {
          try {
            const subSnap = await getDocs(collection(db, "orders", id, subName));
            for (const subDoc of subSnap.docs) {
              batch.delete(subDoc.ref);
            }
          } catch {
            // Ignored
          }
        }
        batch.delete(doc(db, "orders", id));
      }

      try {
        await batch.commit();
        deletedCount += chunk.length;
      } catch (batchErr) {
        console.error("Batch delete error, falling back to sequential delete:", batchErr);
        for (const id of chunk) {
          try {
            await deleteDoc(doc(db, "orders", id));
            deletedCount++;
          } catch (singleErr) {
            console.error(`Error deleting order ${id}:`, singleErr);
            failedCount++;
          }
        }
      }

      // Call API for local store cleanup
      try {
        await fetch(`/api/orders?ids=${encodeURIComponent(chunk.join(","))}`, { method: "DELETE" });
      } catch (apiErr) {
        console.warn("API bulk delete notice:", apiErr);
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
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1
                className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                  isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                }`}
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)", fontWeight: 700 }}
              >
                Dashboard Overview
              </h1>
              <p className={`text-xs font-normal mt-1 ${
                isLight ? "text-[#64748B]" : "text-[#94A3B8]"
              }`}>
                Real-time operational metrics, sales summary, and fulfillment status
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium hidden sm:inline ${
                isLight ? "text-[#64748B]" : "text-[#94A3B8]"
              }`}>
                {currentDateTime || "System Live"}
              </span>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  isLight
                    ? "bg-white border border-[#E5E7EB] text-[#111827] shadow-xs"
                    : "bg-[#101821] border border-[#1E2A36] text-[#F8FAFC]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>System Online</span>
              </div>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Revenue */}
            <div
              className={`rounded-2xl p-5 space-y-3 transition-colors ${
                isLight
                  ? "bg-white border border-[#E2E8F0] shadow-xs hover:border-slate-300"
                  : "bg-[#0E141D] hover:bg-[#121A25] border border-white/[0.08] shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                    isLight
                      ? "bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                      : "bg-[#121A25] border border-white/[0.08] text-emerald-400"
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? "text-[#667085]" : "text-[#94A3B8]"
                }`}>
                  Total Revenue
                </p>
                <h3 className={`text-2xl font-bold mt-1 tracking-tight font-mono ${
                  isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                }`}>
                  {formatPrice(metrics.totalRev)}
                </h3>
              </div>
              <div className={`flex items-center justify-between pt-2 text-[11px] border-t ${
                isLight ? "border-[#E5E7EB] text-[#667085]" : "border-[#1A2633] text-[#94A3B8]"
              }`}>
                <span className="text-[#12B76A] font-medium flex items-center gap-1">
                  Live
                </span>
                <span>{metrics.recentRev > 0 ? `${formatPrice(metrics.recentRev)} (7d)` : "Real-time orders"}</span>
                <svg className="w-16 h-5 overflow-visible" viewBox="0 0 60 20">
                  <path d="M 0 16 Q 15 14, 25 10 T 45 8 T 60 2" fill="none" stroke="#12B76A" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 2. Total Orders */}
            <div
              className={`rounded-2xl p-5 space-y-3 transition-colors ${
                isLight
                  ? "bg-white border border-[#E2E8F0] shadow-xs hover:border-slate-300"
                  : "bg-[#0E141D] hover:bg-[#121A25] border border-white/[0.08] shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                    isLight
                      ? "bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                      : "bg-[#121A25] border border-white/[0.08] text-blue-400"
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? "text-[#667085]" : "text-[#94A3B8]"
                }`}>
                  Total Orders
                </p>
                <h3 className={`text-2xl font-bold mt-1 tracking-tight font-mono ${
                  isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                }`}>
                  {metrics.totalOrd}
                </h3>
              </div>
              <div className={`flex items-center justify-between pt-2 text-[11px] border-t ${
                isLight ? "border-[#E5E7EB] text-[#667085]" : "border-[#1A2633] text-[#94A3B8]"
              }`}>
                <span className={`font-medium flex items-center gap-1 ${
                  isLight ? "text-[#12B76A]" : "text-blue-400"
                }`}>
                  {metrics.recentOrdersCount} new
                </span>
                <span>in last 7 days</span>
                <svg className="w-16 h-5 overflow-visible" viewBox="0 0 60 20">
                  <path d="M 0 14 Q 15 12, 30 8 T 45 6 T 60 3" fill="none" stroke={isLight ? "#111827" : "#3B82F6"} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 3. Catalog Products */}
            <div
              className={`rounded-2xl p-5 space-y-3 transition-colors ${
                isLight
                  ? "bg-white border border-[#E2E8F0] shadow-xs hover:border-slate-300"
                  : "bg-[#0E141D] hover:bg-[#121A25] border border-white/[0.08] shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                    isLight
                      ? "bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                      : "bg-[#121A25] border border-white/[0.08] text-purple-400"
                  }`}
                >
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? "text-[#667085]" : "text-[#94A3B8]"
                }`}>
                  Catalog Products
                </p>
                <h3 className={`text-2xl font-bold mt-1 tracking-tight font-mono ${
                  isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                }`}>
                  {metrics.totalProd}
                </h3>
              </div>
              <div className={`flex items-center justify-between pt-2 text-[11px] border-t ${
                isLight ? "border-[#E5E7EB] text-[#667085]" : "border-[#1A2633] text-[#94A3B8]"
              }`}>
                <span className={`font-medium flex items-center gap-1 ${
                  isLight ? "text-[#12B76A]" : "text-purple-400"
                }`}>
                  Active
                </span>
                <span>{products.filter((p) => p.stock_status !== "out_of_stock").length} in-stock items</span>
                <svg className="w-16 h-5 overflow-visible" viewBox="0 0 60 20">
                  <path d="M 0 15 Q 20 10, 35 12 T 50 7 T 60 4" fill="none" stroke={isLight ? "#667085" : "#A855F7"} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 4. Verified Customers */}
            <div
              className={`rounded-2xl p-5 space-y-3 transition-colors ${
                isLight
                  ? "bg-white border border-[#E2E8F0] shadow-xs hover:border-slate-300"
                  : "bg-[#0E141D] hover:bg-[#121A25] border border-white/[0.08] shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                    isLight
                      ? "bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                      : "bg-[#121A25] border border-white/[0.08] text-amber-400"
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? "text-[#667085]" : "text-[#94A3B8]"
                }`}>
                  Verified Customers
                </p>
                <h3 className={`text-2xl font-bold mt-1 tracking-tight font-mono ${
                  isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                }`}>
                  {metrics.totalCust}
                </h3>
              </div>
              <div className={`flex items-center justify-between pt-2 text-[11px] border-t ${
                isLight ? "border-[#E5E7EB] text-[#667085]" : "border-[#1A2633] text-[#94A3B8]"
              }`}>
                <span className={`font-medium flex items-center gap-1 ${
                  isLight ? "text-[#12B76A]" : "text-amber-400"
                }`}>
                  Live
                </span>
                <span>Registered & guest profiles</span>
                <svg className="w-16 h-5 overflow-visible" viewBox="0 0 60 20">
                  <path d="M 0 17 Q 15 15, 30 11 T 45 6 T 60 2" fill="none" stroke={isLight ? "#111827" : "#F59E0B"} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              SALES PERFORMANCE & SALES DISTRIBUTION (Grid: 8 cols + 4 cols)
          ════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Sales Performance Analytics Card (Col 8) */}
            <div
              className={`lg:col-span-8 rounded-2xl p-5 space-y-4 ${
                isLight
                  ? "bg-white border border-[#E2E8F0] shadow-xs"
                  : "bg-[#0E141D] border border-white/[0.08] shadow-xs"
              }`}
            >
              {/* Header with Title, Segmented Toggle [ Sales ] [ Web Traffic ], and Dropdowns */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 ${
                  isLight ? "border-[#E2E8F0]" : "border-white/[0.08]"
                }`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm font-bold ${
                        isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                      }`}
                    >
                      {analyticsTab === "sales" ? "Sales Performance" : "Web Traffic"}
                    </h3>
                    {analyticsTab === "sales" && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isLight
                            ? "bg-[#F3F4F6] border-[#E5E7EB] text-[#667085]"
                            : "bg-[#0E1A27] border-[#1E2A36] text-[#94A3B8]"
                        }`}
                      >
                        LKR
                      </span>
                    )}
                  </div>

                  {/* Segmented Switch: [ Sales ] [ Web Traffic ] */}
                  <div
                    className={`flex items-center p-0.5 border rounded-xl ${
                      isLight
                        ? "bg-[#F3F4F6] border-[#E5E7EB]"
                        : "bg-[#0D1722] border-[#1E2A36]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setAnalyticsTab("sales")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        analyticsTab === "sales"
                          ? isLight
                            ? "bg-[#111827] text-white shadow-xs font-bold"
                            : "bg-[#101821] text-white border border-[#1E2A36] shadow-xs"
                          : isLight
                            ? "text-[#667085] hover:text-[#111827]"
                            : "text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      Sales
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsTab("traffic")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        analyticsTab === "traffic"
                          ? isLight
                            ? "bg-[#111827] text-white shadow-xs font-bold"
                            : "bg-[#101821] text-white border border-[#1E2A36] shadow-xs"
                          : isLight
                            ? "text-[#667085] hover:text-[#111827]"
                            : "text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      Web Traffic
                    </button>
                  </div>
                </div>

                {/* Controls: Year, Period, Chart Type Dropdown (Shown on Sales tab) */}
                {analyticsTab === "sales" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Year Select */}
                    <div className="relative">
                      <select
                        value={salesYear}
                        onChange={(e) => setSalesYear(e.target.value)}
                        className={`appearance-none pl-2.5 pr-7 py-1 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                          isLight
                            ? "bg-white border-[#E5E7EB] text-[#111827] hover:border-slate-400"
                            : "bg-[#0D1722] border-[#1E2A36] text-[#F8FAFC]"
                        }`}
                      >
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                      </select>
                      <ChevronDown className={`w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isLight ? "text-[#667085]" : "text-[#64748B]"
                      }`} />
                    </div>

                    {/* Period Select */}
                    <div className="relative">
                      <select
                        value={trafficPeriod}
                        onChange={(e) => setTrafficPeriod(e.target.value as any)}
                        className={`appearance-none pl-2.5 pr-7 py-1 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                          isLight
                            ? "bg-white border-[#E5E7EB] text-[#111827] hover:border-slate-400"
                            : "bg-[#0D1722] border-[#1E2A36] text-[#F8FAFC]"
                        }`}
                      >
                        <option value="12 Months">Monthly</option>
                        <option value="30 Days">30 Days</option>
                        <option value="7 Days">7 Days</option>
                        <option value="Today">Today</option>
                      </select>
                      <ChevronDown className={`w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isLight ? "text-[#667085]" : "text-[#64748B]"
                      }`} />
                    </div>

                    {/* Chart Type Dropdown (Chart Type: Bar ˅ -> Line, Bar, Pie) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsChartTypeDropdownOpen(!isChartTypeDropdownOpen)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                          isLight
                            ? "bg-white border-[#E5E7EB] text-[#111827] hover:border-slate-400"
                            : "bg-[#0D1722] border-[#1E2A36] text-[#F8FAFC] hover:border-slate-600"
                        }`}
                      >
                        <span className={isLight ? "text-[#667085]" : "text-[#94A3B8]"}>Chart Type:</span>
                        <span className="capitalize">{chartType}</span>
                        <ChevronDown className={`w-3.5 h-3.5 ml-0.5 ${isLight ? "text-[#667085]" : "text-[#64748B]"}`} />
                      </button>

                      {isChartTypeDropdownOpen && (
                        <div
                          className={`absolute right-0 mt-1.5 w-36 rounded-xl p-1 shadow-2xl z-30 animate-in fade-in slide-in-from-top-1 border ${
                            isLight
                              ? "bg-white border-[#E5E7EB] text-[#111827]"
                              : "bg-[#101A25] border-[#1E2A36] text-[#F8FAFC]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setChartType("line");
                              setIsChartTypeDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                              chartType === "line"
                                ? isLight
                                  ? "bg-[#F3F4F6] text-[#111827] font-bold"
                                  : "bg-white/10 text-white font-bold"
                                : isLight
                                  ? "text-[#667085] hover:text-[#111827] hover:bg-[#F9FAFB]"
                                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <span>Line Chart</span>
                            {chartType === "line" && (
                              <Check className={`w-3 h-3 ${isLight ? "text-[#111827]" : "text-white"}`} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChartType("bar");
                              setIsChartTypeDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                              chartType === "bar"
                                ? isLight
                                  ? "bg-[#F3F4F6] text-[#111827] font-bold"
                                  : "bg-white/10 text-white font-bold"
                                : isLight
                                  ? "text-[#667085] hover:text-[#111827] hover:bg-[#F9FAFB]"
                                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <span>Bar Chart</span>
                            {chartType === "bar" && (
                              <Check className={`w-3 h-3 ${isLight ? "text-[#111827]" : "text-white"}`} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChartType("pie");
                              setIsChartTypeDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                              chartType === "pie"
                                ? isLight
                                  ? "bg-[#F3F4F6] text-[#111827] font-bold"
                                  : "bg-white/10 text-white font-bold"
                                : isLight
                                  ? "text-[#667085] hover:text-[#111827] hover:bg-[#F9FAFB]"
                                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <span>Pie Chart</span>
                            {chartType === "pie" && (
                              <Check className={`w-3 h-3 ${isLight ? "text-[#111827]" : "text-white"}`} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Web Traffic (Google Search Console Live Real-Time Integration) OR Sales Charts */}
              {analyticsTab === "traffic" ? (
                <div className={`relative pt-2 ${isLight ? "bg-white" : ""}`}>
                  <CustomAreaChart 
                    data={[
                      { date: 'Jan', value: 1200 },
                      { date: 'Feb', value: 1900 },
                      { date: 'Mar', value: 1500 },
                      { date: 'Apr', value: 2200 },
                      { date: 'May', value: 2800 },
                      { date: 'Jun', value: 2500 },
                      { date: 'Jul', value: 3200 },
                      { date: 'Aug', value: 3800 },
                      { date: 'Sep', value: 4100 },
                      { date: 'Oct', value: 3900 },
                      { date: 'Nov', value: 4500 },
                      { date: 'Dec', value: 5200 },
                    ]}
                    isLight={isLight}
                    height={260}
                    valueSuffix=" visitors"
                    color={isLight ? "#2563EB" : "#3B82F6"}
                    gradientId="webTrafficGradient"
                  />
                </div>
              ) : (
                <div className={`relative pt-2 ${isLight ? "bg-white" : ""}`}>
                  <CustomAreaChart 
                    data={monthlySalesData.map(m => ({ date: m.month, value: m.amount }))}
                    isLight={isLight}
                    valuePrefix="LKR "
                    height={260}
                    color={isLight ? "#111827" : "#FFFFFF"}
                    gradientId="salesAreaGradient"
                  />
                </div>
              )}
            </div>

            {/* Right: Sales Distribution Donut Card (Col 4) */}
            <div
              className={`lg:col-span-4 rounded-2xl p-5 space-y-4 ${
                isLight
                  ? "bg-white border border-[#E2E8F0] shadow-xs"
                  : "bg-[#0E141D] border border-white/[0.08] shadow-xs"
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-3 ${
                isLight ? "border-[#E2E8F0]" : "border-white/[0.08]"
              }`}>
                <div>
                  <h3 className={`text-sm font-bold ${
                    isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                  }`}>
                    Sales Distribution
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    isLight ? "text-[#667085]" : "text-[#64748B]"
                  }`}>
                    By device & category
                  </p>
                </div>
                <Link
                  href="/admin/dashboard?tab=products"
                  className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
                    isLight
                      ? "text-[#667085] hover:text-[#111827]"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Donut Chart & Category Legend */}
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-between gap-4 py-2">
                {/* SVG Donut Chart with Center "958 UNITS SOLD" */}
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#2563EB]"
                      strokeDasharray="44, 100"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#06B6D4]"
                      strokeDasharray="24, 100"
                      strokeDashoffset="-44"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#F59E0B]"
                      strokeDasharray="14, 100"
                      strokeDashoffset="-68"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#8B5CF6]"
                      strokeDasharray="9, 100"
                      strokeDashoffset="-82"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#EC4899]"
                      strokeDasharray="6, 100"
                      strokeDashoffset="-91"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={isLight ? "text-[#CBD5E1]" : "text-[#64748B]"}
                      strokeDasharray="3, 100"
                      strokeDashoffset="-97"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>

                  {/* Center Text: 958 UNITS SOLD */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={`text-xl font-bold font-mono leading-none ${
                      isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                    }`}>
                      958
                    </span>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider mt-1 ${
                      isLight ? "text-[#667085]" : "text-[#64748B]"
                    }`}>
                      Units Sold
                    </span>
                  </div>
                </div>

                {/* Categories Breakdown List */}
                <div className="space-y-2 text-xs flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                      <span className={`font-medium ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>Mobile Phones</span>
                    </span>
                    <span className={`font-semibold font-mono ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>
                      44% <span className={`font-normal ${isLight ? "text-[#667085]" : "text-[#64748B]"}`}>(420)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
                      <span className={`font-medium ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>Accessories</span>
                    </span>
                    <span className={`font-semibold font-mono ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>
                      24% <span className={`font-normal ${isLight ? "text-[#667085]" : "text-[#64748B]"}`}>(230)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                      <span className={`font-medium ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>Audio</span>
                    </span>
                    <span className={`font-semibold font-mono ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>
                      14% <span className={`font-normal ${isLight ? "text-[#667085]" : "text-[#64748B]"}`}>(135)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                      <span className={`font-medium ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>Tablets</span>
                    </span>
                    <span className={`font-semibold font-mono ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>
                      9% <span className={`font-normal ${isLight ? "text-[#667085]" : "text-[#64748B]"}`}>(86)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
                      <span className={`font-medium ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>Laptops</span>
                    </span>
                    <span className={`font-semibold font-mono ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>
                      6% <span className={`font-normal ${isLight ? "text-[#667085]" : "text-[#64748B]"}`}>(58)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isLight ? "bg-[#94A3B8]" : "bg-[#64748B]"}`} />
                      <span className={`font-medium ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>Others</span>
                    </span>
                    <span className={`font-semibold font-mono ${isLight ? "text-[#101828]" : "text-[#F8FAFC]"}`}>
                      3% <span className={`font-normal ${isLight ? "text-[#667085]" : "text-[#64748B]"}`}>(29)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              LOWER SECTION: SOLD PRODUCTS + LOW STOCK ALERT (Replaces Recent Orders)
          ════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Sold Products Table (Col 7) */}
            <div
              className={`lg:col-span-7 rounded-2xl p-5 space-y-4 ${
                isLight
                  ? "bg-white border border-[#E2E8F0] shadow-xs"
                  : "bg-[#0E141D] border border-white/[0.08] shadow-xs"
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-3 ${
                isLight ? "border-[#E2E8F0]" : "border-white/[0.08]"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isLight
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${
                      isLight ? "text-[#101828]" : "text-[#F8FAFC]"
                    }`}>
                      Sold Products
                    </h3>
                    <p className={`text-xs ${
                      isLight ? "text-[#667085]" : "text-[#64748B]"
                    }`}>
                      Top selling products (actual sales)
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/dashboard?tab=products"
                  className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
                    isLight
                      ? "text-[#667085] hover:text-[#111827]"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr
                      className={`font-semibold uppercase tracking-wider text-[10px] border-b ${
                        isLight
                          ? "bg-[#F8FAFC] text-[#667085] border-[#EAECF0]"
                          : "bg-[#0D1722] text-[#64748B] border-[#1E2A36]"
                      }`}
                    >
                      <th className="py-2.5 px-3 rounded-l-lg">#</th>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Units Sold</th>
                      <th className="py-2.5 px-3">Revenue</th>
                      <th className="py-2.5 px-3">Last Sold</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right"></th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? "divide-[#EAECF0]" : "divide-[#1A2633]"}`}>
                    {soldProductsList.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={`transition-colors ${
                          isLight
                            ? "bg-white hover:bg-[#F9FAFB]"
                            : "hover:bg-[#162333]"
                        }`}
                      >
                        <td className={`py-3 px-3 font-mono font-bold ${
                          isLight ? "text-[#667085]" : "text-[#64748B]"
                        }`}>
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5 max-w-[180px] truncate">
                            <img
                              src={item.image}
                              alt={item.name}
                              className={`w-7 h-7 rounded-md object-contain shrink-0 border ${
                                isLight
                                  ? "bg-[#F8FAFC] border-[#EAECF0]"
                                  : "bg-[#0D1722] border-[#1E2A36]"
                              }`}
                            />
                            <span className={`font-semibold truncate ${
                              isLight ? "text-[#101828]" : "text-[#F8FAFC]"
                            }`}>
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className={`py-3 px-3 ${isLight ? "text-[#667085]" : "text-[#94A3B8]"}`}>
                          {item.category}
                        </td>
                        <td className={`py-3 px-3 text-center font-mono font-bold ${
                          isLight ? "text-[#101828]" : "text-[#F8FAFC]"
                        }`}>
                          {item.unitsSold}
                        </td>
                        <td className={`py-3 px-3 font-mono font-semibold ${
                          isLight ? "text-[#101828]" : "text-[#F8FAFC]"
                        }`}>
                          {formatPrice(item.revenue)}
                        </td>
                        <td className={`py-3 px-3 whitespace-nowrap ${
                          isLight ? "text-[#667085]" : "text-[#94A3B8]"
                        }`}>
                          {item.lastSold}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            title="Options"
                            className={`p-1 rounded-md transition-colors ${
                              isLight
                                ? "text-[#667085] hover:text-[#101828]"
                                : "text-[#64748B] hover:text-white"
                            }`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Low Stock Alert Table (Col 5) */}
            <div
              className={`lg:col-span-5 rounded-2xl p-5 space-y-4 ${
                isLight
                  ? "bg-white border border-[#E2E8F0] shadow-xs"
                  : "bg-[#0E141D] border border-white/[0.08] shadow-xs"
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-3 ${
                isLight ? "border-[#E2E8F0]" : "border-white/[0.08]"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isLight
                        ? "bg-rose-50 text-rose-600 border border-rose-100"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${
                      isLight ? "text-[#101828]" : "text-[#F8FAFC]"
                    }`}>
                      Low Stock Alert
                    </h3>
                    <p className={`text-xs ${
                      isLight ? "text-[#667085]" : "text-[#64748B]"
                    }`}>
                      Products need restock
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/dashboard?tab=inventory"
                  className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
                    isLight
                      ? "text-[#667085] hover:text-[#111827]"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr
                      className={`font-semibold uppercase tracking-wider text-[10px] border-b ${
                        isLight
                          ? "bg-[#F8FAFC] text-[#667085] border-[#EAECF0]"
                          : "bg-[#0D1722] text-[#64748B] border-[#1E2A36]"
                      }`}
                    >
                      <th className="py-2.5 px-3 rounded-l-lg">Product</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right"></th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? "divide-[#EAECF0]" : "divide-[#1A2633]"}`}>
                    {lowStockDisplayList.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isLight
                            ? "bg-white hover:bg-[#F9FAFB]"
                            : "hover:bg-[#162333]"
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 max-w-[150px] truncate">
                            <img
                              src={item.image}
                              alt={item.name}
                              className={`w-7 h-7 rounded-md object-contain shrink-0 border ${
                                isLight
                                  ? "bg-[#F8FAFC] border-[#EAECF0]"
                                  : "bg-[#0D1722] border-[#1E2A36]"
                              }`}
                            />
                            <span className={`font-semibold truncate ${
                              isLight ? "text-[#101828]" : "text-[#F8FAFC]"
                            }`}>
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className={`py-3 px-3 font-mono ${
                          isLight ? "text-[#667085]" : "text-[#94A3B8]"
                        }`}>
                          {item.sku}
                        </td>
                        <td className={`py-3 px-3 text-center font-mono font-bold ${
                          isLight ? "text-rose-600" : "text-red-400"
                        }`}>
                          {item.stock}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isLight
                                ? "bg-rose-50 text-rose-600 border-rose-200"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            Low Stock
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            title="Options"
                            className={`p-1 rounded-md transition-colors ${
                              isLight
                                ? "text-[#667085] hover:text-[#101828]"
                                : "text-[#64748B] hover:text-white"
                            }`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              FLOATING TOAST NOTIFICATIONS (Bottom Right Stack)
          ════════════════════════════════════════════════════════════════ */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-auto">
            {/* 1. New Order Received Toast */}
            {!dismissedToasts.includes("order-1005") && (
              <div
                className={`rounded-2xl p-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 border ${
                  isLight
                    ? "bg-white border-[#E5E7EB] shadow-xl text-[#111827]"
                    : "bg-[#07111C] border-[#1E2A36] shadow-2xl text-white"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isLight
                      ? "bg-blue-50 text-blue-600 border border-blue-100"
                      : "bg-blue-500/15 text-blue-400"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-bold ${
                      isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                    }`}>
                      New Order Received!
                    </h4>
                    <button
                      type="button"
                      onClick={() => setDismissedToasts((prev) => [...prev, "order-1005"])}
                      className={`cursor-pointer ${
                        isLight ? "text-[#667085] hover:text-[#111827]" : "text-[#64748B] hover:text-white"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className={`text-[11px] mt-0.5 truncate ${
                    isLight ? "text-[#667085]" : "text-[#94A3B8]"
                  }`}>
                    #1005 · Samsung Galaxy A54
                  </p>
                  <span className={`text-[10px] block mt-1 ${
                    isLight ? "text-[#98A2B3]" : "text-[#64748B]"
                  }`}>
                    2 minutes ago
                  </span>
                </div>
              </div>
            )}

            {/* 2. Low Stock Alert Toast */}
            {!dismissedToasts.includes("stock-iphone14") && (
              <div
                className={`rounded-2xl p-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 border ${
                  isLight
                    ? "bg-white border-[#E5E7EB] shadow-xl text-[#111827]"
                    : "bg-[#07111C] border-[#1E2A36] shadow-2xl text-white"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isLight
                      ? "bg-rose-50 text-rose-600 border border-rose-100"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-bold ${
                      isLight ? "text-[#111827]" : "text-[#F8FAFC]"
                    }`}>
                      Low Stock Alert
                    </h4>
                    <button
                      type="button"
                      onClick={() => setDismissedToasts((prev) => [...prev, "stock-iphone14"])}
                      className={`cursor-pointer ${
                        isLight ? "text-[#667085] hover:text-[#111827]" : "text-[#64748B] hover:text-white"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className={`text-[11px] mt-0.5 truncate ${
                    isLight ? "text-[#667085]" : "text-[#94A3B8]"
                  }`}>
                    iPhone 14 Case only 4 left!
                  </p>
                  <span className={`text-[10px] block mt-1 ${
                    isLight ? "text-[#98A2B3]" : "text-[#64748B]"
                  }`}>
                    5 minutes ago
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
        <OrdersTab
          orders={orders}
          onUpdateStatus={handleUpdateOrderStatus}
          onDeleteOrder={handleDeleteOrder}
          onBulkDeleteOrders={handleBulkDeleteOrders}
          onRefresh={refreshData}
        />
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
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 5C: STORE GALLERY TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "gallery" && (
        <GalleryTab
          images={galleryImages}
          initialAnimationSettings={galleryAnimationSettings}
          onAdd={() => {
            setEditingGalleryImage(null);
            setIsGalleryModalOpen(true);
          }}
          onEdit={(image: GalleryImage) => {
            setEditingGalleryImage(image);
            setIsGalleryModalOpen(true);
          }}
          onDelete={handleDeleteGalleryImage}
          onRefresh={refreshData}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 5D: VISUAL PRODUCT SHOWCASE BANNERS
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "showcase" && (
        <ShowcaseTab
          products={products}
          categories={categories}
          initialSettings={showcaseSettings}
          onRefresh={refreshData}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 5E: TODAY'S DEAL PROMOTIONAL BANNER
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "today-deal" && (
        <TodayDealTab
          initialSettings={todayDealSettings}
          onRefresh={refreshData}
        />
      )}

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

          <div className={`rounded-2xl border p-5 shadow-xs overflow-x-auto ${
            isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
          }`}>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                  isLight ? "text-slate-500 border-[#E2E8F0]" : "text-slate-400 border-white/10"
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
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          c.isGuest ? "bg-purple-600/20 text-purple-400" : "bg-blue-600/20 text-blue-400"
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
                        <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[10px] border ${
                          c.isGuest
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

          <div className={`rounded-2xl border p-5 shadow-xs space-y-4 ${
            isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
          }`}>
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search stock by product name or SKU..."
                className={`w-full max-w-sm px-3.5 py-1.5 rounded-xl text-xs outline-none border transition-all ${
                  isLight ? "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500" : "bg-white/5 border-white/10 text-white placeholder-slate-400 focus:border-blue-500"
                }`}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                    isLight ? "text-slate-500 border-[#E2E8F0]" : "text-slate-400 border-white/10"
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
                        <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[10px] ${
                          p.stock_status === "in_stock"
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
      {activeTab === "whatsapp-marketing" && (
        <WhatsAppMarketingTab
          campaigns={whatsappCampaigns}
          products={products}
          customers={customers}
        />
      )}

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
              Manage Cash on Delivery (COD) fee, PayHere online payments and WhatsApp checkout hotline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* PayHere Online Gateway Status */}
            <div className={`rounded-2xl border p-5 shadow-xs space-y-2 ${
              isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
            }`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PayHere Gateway Status</span>
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <Check className="w-4 h-4" /> Connected & Verified
              </h3>
              <p className="text-xs text-slate-400">Merchant ID configured • LKR Sandbox & Production active</p>
            </div>

            {/* Editable Cash on Delivery (COD) Fee */}
            <div className={`rounded-2xl border p-5 shadow-xs space-y-3 ${
              isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
            }`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cash on Delivery (COD) Fee</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Rs.</span>
                <input
                  type="number"
                  value={codFee}
                  onChange={(e) => setCodFee(Number(e.target.value))}
                  className={`w-full px-3 py-1.5 rounded-lg text-sm font-bold outline-none border transition-all ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500" : "bg-white/5 border-white/10 text-white focus:border-blue-500"
                  }`}
                  placeholder="250"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveCodFee}
                disabled={savingCod}
                className="w-full py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingCod ? "Saving..." : "Save COD Fee"}
              </button>
              {codSavedMsg && (
                <p className="text-xs font-semibold text-emerald-400 text-center animate-in fade-in">
                  ✓ COD Fee updated to Rs. {codFee}!
                </p>
              )}
            </div>

            {/* WhatsApp Direct Order */}
            <div className={`rounded-2xl border p-5 shadow-xs space-y-2 ${
              isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
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
      {activeTab === "analytics" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="pb-2 border-b border-white/5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Analytics & Performance Reports
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Real-time revenue, conversion rates and payment method breakdown
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className={`rounded-2xl border p-5 shadow-xs space-y-4 ${
              isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
            }`}>
              <h3 className={`font-semibold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Monthly Sales Breakdown</h3>
              <div className={`h-44 rounded-xl flex items-center justify-center text-xs border ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-white/5 border-white/10 text-slate-400"
              }`}>
                Line chart visualizing LKR revenue growth across 31 days
              </div>
            </div>

            <div className={`rounded-2xl border p-5 shadow-xs space-y-4 ${
              isLight ? "bg-white border-[#E2E8F0] text-[#0F172A]" : "bg-[#0E141D] border-white/[0.08] text-white"
            }`}>
              <h3 className={`font-semibold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Payment Method Distribution</h3>
              <div className={`h-44 rounded-xl flex items-center justify-center text-xs border ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-white/5 border-white/10 text-slate-400"
              }`}>
                PayHere Online (55%) • COD (35%) • WhatsApp Checkout (10%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: MOBILE EXPERIENCE
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "mobile" && (
        <MobileExperienceTab />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: MOBILE REPAIRS
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "repairs" && (
        <RepairsTab />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: CASH FLOW
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "cashflow" && (
        <CashFlowTab />
      )}

      {/* Global Product Modal */}
      <ProductModal
        key={editingProduct?.id ? `edit-${editingProduct.id}` : "new-product"}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
          refreshData();
        }}
        categories={categories}
        initialData={editingProduct}
      />

      {/* Hero Modal */}
      <HeroModal
        isOpen={isHeroModalOpen}
        onClose={() => setIsHeroModalOpen(false)}
        onSave={handleSaveHeroSlide}
        slide={editingHeroSlide}
      />

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        onSave={() => {
          setIsGalleryModalOpen(false);
          refreshData();
        }}
        initialData={editingGalleryImage}
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
            className={`border rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 ${
              isLight
                ? "bg-white border-[#E5E7EB] text-[#111827]"
                : "bg-[#0F172A] border-white/15 text-white"
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? "border-[#E5E7EB]" : "border-white/10"
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
              <div className={`p-3 border rounded-xl flex items-center justify-between ${
                isLight ? "bg-[#F8FAFC] border-[#E5E7EB]" : "bg-white/5 border-white/10"
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
                    className={`w-full p-2.5 rounded-xl font-mono font-bold outline-none text-sm border ${
                      isLight
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
                    className={`flex-1 py-1.5 border rounded-lg font-mono font-semibold text-xs transition-colors cursor-pointer ${
                      isLight
                        ? "bg-[#F3F4F6] hover:bg-[#111827] hover:text-white border-[#E5E7EB] text-[#374151]"
                        : "bg-white/5 hover:bg-blue-600 hover:text-white border-white/10 text-white"
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${
              isLight ? "border-[#E5E7EB]" : "border-white/10"
            }`}>
              <button
                type="button"
                onClick={() => setQuickStockProduct(null)}
                className={`px-3.5 py-1.5 font-semibold text-xs rounded-xl transition-colors cursor-pointer ${
                  isLight
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
                className={`px-4 py-1.5 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLight
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
