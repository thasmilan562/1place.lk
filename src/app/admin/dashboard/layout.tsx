"use client";

import { useState, useEffect, useRef, useMemo, Suspense, createContext, useContext } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BUSINESS_INFO } from "@/lib/business-info";

export interface AdminThemeContextType {
  theme: "dark" | "light";
  isLight: boolean;
  toggleTheme: () => void;
}

export const AdminThemeContext = createContext<AdminThemeContextType>({
  theme: "dark",
  isLight: false,
  toggleTheme: () => {},
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  FolderTree,
  Tag,
  LayoutGrid,
  Sparkles,
  Flame,
  ShoppingBag,
  ShoppingCart,
  Wrench,
  DollarSign,
  ShieldCheck,
  Users,
  Images,
  ImageIcon,
  Globe,
  HardDrive,
  CreditCard,
  Star,
  BarChart3,
  Bot,
  Smartphone,
  Settings,
  Clock,
  LogOut,
  Search,
  Plus,
  HelpCircle,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  Megaphone,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { playOrderChime } from "@/lib/audio-chime";
import ProductModal from "@/components/admin/ProductModal";
import CommandPalette from "@/components/admin/CommandPalette";

interface NavSubItem {
  id: string;
  label: string;
  href: string;
}

interface NavSection {
  id: string;
  title: string;
  icon: any;
  items: NavSubItem[];
}

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    id: "catalog",
    title: "Catalog",
    icon: Package,
    items: [
      { id: "products", label: "Products", href: "/admin/dashboard?tab=products" },
      { id: "categories", label: "Categories", href: "/admin/dashboard?tab=categories" },
      { id: "showcase", label: "Visual Showcase", href: "/admin/dashboard?tab=showcase" },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    icon: ShoppingCart,
    items: [
      { id: "orders", label: "Orders", href: "/admin/dashboard?tab=orders" },
      { id: "today-deal", label: "Today’s Deal", href: "/admin/dashboard?tab=today-deal" },
      { id: "payments", label: "Payments & Gateways", href: "/admin/dashboard?tab=payments" },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    icon: Settings,
    items: [
      { id: "inventory", label: "Inventory Levels", href: "/admin/dashboard?tab=inventory" },
    ],
  },
  {
    id: "customers",
    title: "Customers",
    icon: Users,
    items: [
      { id: "users", label: "Customers Directory", href: "/admin/dashboard?tab=users" },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: Megaphone,
    items: [
      { id: "gallery", label: "Store Gallery Wall", href: "/admin/dashboard?tab=gallery" },
      { id: "whatsapp-marketing", label: "WhatsApp Marketing", href: "/admin/dashboard?tab=whatsapp-marketing" },
      { id: "hero", label: "Homepage Hero Slider", href: "/admin/dashboard?tab=hero" },
      { id: "spin-win", label: "Spin & Win Promotion", href: "/admin/dashboard?tab=spin-win" },
    ],
  },
];

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTabParam = searchParams.get("tab") || "overview";

  // Authentication State
  const [isAuthed, setIsAuthed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        sessionStorage.getItem("admin_auth") === "true" ||
        localStorage.getItem("admin_auth") === "true"
      );
    }
    return true;
  });

  // Theme State - Default to Dark Mode as requested
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("admin_theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_theme", nextTheme);
    }
  };

  // Sidebar Layout States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Accordion state: which main section is currently expanded (or null)
  const [expandedSection, setExpandedSection] = useState<string | null>(() => {
    const initialMatch = SIDEBAR_SECTIONS.find((sec) =>
      sec.items.some((item) => item.id === activeTabParam)
    );
    return initialMatch ? initialMatch.id : null;
  });

  // Auto-expand section if URL tab points inside it
  useEffect(() => {
    const currentSec = SIDEBAR_SECTIONS.find((sec) =>
      sec.items.some((item) => item.id === activeTabParam)
    );
    if (currentSec) {
      setExpandedSection(currentSec.id);
    }
  }, [activeTabParam]);

  const toggleSection = (sectionId: string) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
  };

  // Command Palette & Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Profile Dropdown state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth Guard
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth =
        sessionStorage.getItem("admin_auth") === "true" ||
        localStorage.getItem("admin_auth") === "true";
      if (!auth) {
        router.push("/admin/login");
      } else {
        setIsAuthed(true);
      }
    }
  }, [router]);

  // Keyboard shortcut: ⌘K or Ctrl+K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  // Real-time Orders listener for Notification Bell & Chime
  useEffect(() => {
    let isInitial = true;
    const unsub = onSnapshot(
      collection(db, "orders"),
      (snap) => {
        let count = 0;
        snap.docs.forEach((doc) => {
          const data = doc.data();
          const status = (data.status || data.orderStatus || "").toLowerCase();
          if (status === "pending" || status === "processing" || status === "payment pending") {
            count++;
          }
        });
        setPendingOrdersCount(count);

        if (!isInitial) {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              playOrderChime();
            }
          });
        }
        isInitial = false;
      },
      (err) => {
        console.warn("Realtime order notification listener error:", err);
      }
    );

    return () => unsub();
  }, []);

  // Listen for global open product modal event
  useEffect(() => {
    const handleOpenModal = () => setIsAddProductOpen(true);
    window.addEventListener("open-add-product-modal", handleOpenModal);
    return () => window.removeEventListener("open-add-product-modal", handleOpenModal);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    localStorage.removeItem("admin_auth");
    router.push("/admin/login");
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#080D14] flex flex-col items-center justify-center text-white font-sans p-4 gap-4">
        <div className="flex items-center gap-2 font-bold text-sm text-white/80">
          <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          Authenticating Admin Session...
        </div>
        <Link
          href="/admin/login"
          className="px-5 py-2 bg-white hover:bg-slate-200 text-[#080D14] text-xs font-bold rounded-xl shadow-lg transition-all"
        >
          Go to Admin Login
        </Link>
      </div>
    );
  }

  const isLight = theme === "light";
  const isDashboardActive = activeTabParam === "overview";

  return (
    <AdminThemeContext.Provider value={{ theme, isLight, toggleTheme }}>
      <div
        data-admin-root
        data-admin-theme={theme}
        data-theme={theme}
        className={`${theme === "dark" ? "dark" : "light"} flex h-screen overflow-hidden font-sans ${
          isLight ? "bg-[#F5F7FA] text-[#0F172A]" : "bg-[#080C12] text-[#F8FAFC]"
        }`}
      >
        {/* ── Mobile Sidebar Drawer Backdrop ── */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* ── Left Navigation Sidebar ── */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-200 shrink-0 border-r ${
            sidebarCollapsed ? "w-[68px]" : "w-[240px]"
          } ${
            isLight
              ? "bg-white border-[#E2E8F0]"
              : "bg-[#0E141D] border-white/[0.08]"
          } ${
            mobileSidebarOpen ? "translate-x-0 w-[250px]" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* 1. Brand Logo Header */}
          <div
            className={`h-16 px-4 border-b flex items-center shrink-0 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
            } ${sidebarCollapsed ? "justify-center" : "justify-between"}`}
          >
            <Link href="/admin/dashboard" className="flex items-center gap-3 group">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs shrink-0 bg-[#111111] border border-white/10 text-white p-1 overflow-hidden"
              >
                <img
                  src="/icon.svg"
                  alt="ONEPLACE"
                  className="w-full h-full object-contain"
                />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <img
                    src="/logo.png"
                    alt="ONEPLACE"
                    className={`h-5 w-auto max-w-[130px] object-contain block ${
                      !isLight ? "brightness-0 invert" : ""
                    }`}
                  />
                  <span
                    className={`text-[8px] font-bold tracking-widest uppercase block mt-1 ${
                      isLight ? "text-[#64748B]" : "text-white/50"
                    }`}
                  >
                    CONTROL CENTER
                  </span>
                </div>
              )}
            </Link>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className={`p-1 rounded-md lg:hidden ${
                isLight ? "text-[#64748B] hover:text-[#0F172A]" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Scrollable Accordion Navigation */}
          <nav
            data-admin-nav="true"
            className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3 space-y-1 custom-scrollbar"
          >
            {/* OVERVIEW / DASHBOARD */}
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileSidebarOpen(false)}
              title={sidebarCollapsed ? "Dashboard" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 relative ${
                sidebarCollapsed ? "justify-center" : ""
              } ${
                isDashboardActive
                  ? isLight
                    ? "bg-[#EFF6FF] text-[#2563EB] font-bold shadow-xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#2563EB] before:rounded-r"
                    : "bg-[rgba(37,99,235,0.14)] text-[#38BDF8] font-bold shadow-xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#2563EB] before:rounded-r"
                  : isLight
                  ? "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${
                isDashboardActive ? (isLight ? "text-[#2563EB]" : "text-[#38BDF8]") : (isLight ? "text-[#64748B]" : "text-[#94A3B8]")
              }`} />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>

            {/* 7 MAJOR ACCORDION SECTIONS */}
            {SIDEBAR_SECTIONS.map((section) => {
              const isExpanded = expandedSection === section.id && !sidebarCollapsed;
              const Icon = section.icon;
              const hasActiveChild = section.items.some((it) => it.id === activeTabParam);

              return (
                <div key={section.id} className="space-y-1">
                  {/* Clickable Main Section Heading */}
                  <button
                    type="button"
                    onClick={() => {
                      if (sidebarCollapsed) {
                        setSidebarCollapsed(false);
                        setExpandedSection(section.id);
                      } else {
                        toggleSection(section.id);
                      }
                    }}
                    title={sidebarCollapsed ? section.title : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      sidebarCollapsed ? "justify-center" : ""
                    } ${
                      hasActiveChild && !isExpanded
                        ? isLight
                          ? "text-[#2563EB] bg-[#EFF6FF] font-semibold"
                          : "text-[#38BDF8] bg-[rgba(37,99,235,0.14)] font-semibold"
                        : isLight
                        ? "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${
                        isLight
                          ? hasActiveChild && !isExpanded
                            ? "text-[#2563EB]"
                            : "text-[#64748B]"
                          : hasActiveChild && !isExpanded
                          ? "text-[#38BDF8]"
                          : "text-[#94A3B8]"
                      }`} />
                      {!sidebarCollapsed && <span className="truncate">{section.title}</span>}
                    </div>

                    {!sidebarCollapsed && (
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                          isLight ? "text-[#64748B]" : "text-[#94A3B8]"
                        } ${
                          isExpanded ? (isLight ? "rotate-90 text-[#0F172A]" : "rotate-90 text-white") : ""
                        }`}
                      />
                    )}
                  </button>

                  {/* Expanded Submenu Container */}
                  {!sidebarCollapsed && isExpanded && (
                    <div
                      className={`rounded-xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 border ${
                        isLight
                          ? "bg-[#F8FAFC] border-[#E2E8F0]"
                          : "bg-[#121A25] border-white/[0.08]"
                      }`}
                    >
                      {section.items.map((subItem) => {
                        const isSubActive = activeTabParam === subItem.id;

                        return (
                          <Link
                            key={subItem.id}
                            href={subItem.href}
                            onClick={() => setMobileSidebarOpen(false)}
                            className={`relative w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              isSubActive
                                ? isLight
                                  ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0] relative before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-[#2563EB] before:rounded-r"
                                  : "bg-[rgba(37,99,235,0.14)] text-[#38BDF8] font-bold shadow-xs border border-blue-500/20 relative before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-[#2563EB] before:rounded-r"
                                : isLight
                                ? "text-[#475569] hover:text-[#0F172A] hover:bg-white"
                                : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <span className="truncate">{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* 3. Pinned Footer: WhatsApp Support, Admin Profile & Sign Out */}
          <div
            className={`p-2.5 border-t space-y-2 shrink-0 ${
              isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
            }`}
          >
            {!sidebarCollapsed ? (
              <>
                {/* WhatsApp Support Row */}
                <a
                  href={`https://wa.me/${BUSINESS_INFO.whatsappNumber.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                    isLight
                      ? "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                      : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                    </div>
                    <span>WhatsApp Support</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-40" />
                </a>

                {/* Admin Profile Card */}
                <div
                  className={`flex items-center justify-between p-2 rounded-xl border ${
                    isLight
                      ? "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]"
                      : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${
                        isLight ? "bg-[#0F172A] text-white" : "bg-[#2563EB] text-white"
                      }`}
                    >
                      AD
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-semibold leading-none truncate">Admin</div>
                      <div className={`text-[10px] truncate mt-0.5 ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
                        Superadmin
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`} />
                </div>

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isLight
                      ? "text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEF2F2]"
                      : "text-[#94A3B8] hover:text-[#EF4444] hover:bg-red-500/10"
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className={`p-2 rounded-lg transition-colors ${
                    isLight
                      ? "text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEF2F2]"
                      : "text-[#94A3B8] hover:text-[#EF4444] hover:bg-red-500/10"
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main Content Shell ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header Bar (64px) */}
          <header
            data-admin-header="true"
            className={`h-16 border-b px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 transition-colors duration-150 ${
              isLight
                ? "bg-white border-[#E2E8F0]"
                : "bg-[#0E141D] border-white/[0.08]"
            }`}
          >
            {/* Left: Mobile Toggle & Desktop Collapse Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className={`p-2 rounded-lg lg:hidden ${
                  isLight ? "text-[#475569] hover:bg-[#F8FAFC]" : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                className={`hidden lg:flex p-2 rounded-lg transition-colors ${
                  isLight ? "text-[#475569] hover:bg-[#F8FAFC]" : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Empty Space */}
            <div className="flex-1 max-w-xl mx-2 sm:mx-4">
            </div>

            {/* Right Controls: Theme Toggle, Notifications, Admin Profile, Add Product Button */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight
                    ? "bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"
                    : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC] hover:bg-[#16212F]"
                }`}
              >
                {isLight ? <Moon className="w-4 h-4 text-[#475569]" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>

              {/* Notification Bell with real-time pending orders badge */}
              <button
                type="button"
                onClick={() => router.push("/admin/dashboard?tab=orders")}
                title={pendingOrdersCount > 0 ? `${pendingOrdersCount} Pending Orders` : "No pending orders"}
                className={`relative p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight
                    ? "bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"
                    : "bg-[#121A25] border-white/[0.08] text-[#94A3B8] hover:text-white hover:bg-[#16212F]"
                }`}
              >
                <Bell className="w-4 h-4" />
                {pendingOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                    {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                  </span>
                )}
              </button>

              {/* Admin Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isLight
                      ? "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]"
                      : "bg-[#121A25] border-white/[0.08] hover:bg-[#16212F] text-[#F8FAFC]"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isLight ? "bg-[#0F172A] text-white" : "bg-[#2563EB] text-white"
                    }`}
                  >
                    AD
                  </div>
                  <div className="hidden xl:block text-left leading-tight">
                    <div className="text-xs font-semibold leading-none">Admin</div>
                    <div className={`text-[10px] ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
                      Superadmin
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 hidden sm:block" />
                </button>

                {/* Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-56 rounded-2xl p-2 shadow-2xl border z-50 animate-in fade-in slide-in-from-top-2 ${
                      isLight
                        ? "bg-white border-[#E2E8F0] text-[#0F172A]"
                        : "bg-[#0E141D] border-white/[0.14] text-[#F8FAFC]"
                    }`}
                  >
                    <div className={`px-3 py-2 border-b ${isLight ? "border-[#E2E8F0]" : "border-white/[0.08]"}`}>
                      <p className="text-xs font-bold truncate">1place.lk Control Center</p>
                      <p className={`text-[11px] truncate mt-0.5 ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
                        admin@1place.lk
                      </p>
                      <span className="inline-block mt-1.5 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Store Superadmin
                      </span>
                    </div>

                    <div className="py-1 space-y-0.5 text-xs font-medium">
                      <a
                        href={BUSINESS_INFO.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isLight
                            ? "hover:bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A]"
                            : "hover:bg-white/5 text-[#94A3B8] hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>WhatsApp Support</span>
                        </span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    </div>

                    <div className={`pt-1 border-t ${isLight ? "border-[#E2E8F0]" : "border-white/[0.08]"}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#EF4444] hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Action Button: "+ Add Product" */}
              <button
                type="button"
                onClick={() => setIsAddProductOpen(true)}
                className="px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-[10px] shadow-xs hover:shadow-sm hover:-translate-y-px active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Product</span>
              </button>
            </div>
          </header>

          {/* Dynamic Tab Content Area */}
          <main
            className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 flex flex-col justify-between transition-colors duration-150 ${
              isLight ? "bg-[#F5F7FA]" : "bg-[#080C12]"
            }`}
          >
            <div className="flex-1">
              {children}
            </div>

            {/* Admin OS Footer */}
            <footer
              className={`mt-10 pt-6 pb-2 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                isLight ? "border-[#E2E8F0] text-[#64748B]" : "border-white/[0.08] text-[#94A3B8]"
              }`}
            >
              <p>© 2026 1place.lk Control Center Operating System.</p>
              <div className="flex items-center gap-3 text-xs font-medium">
                <a
                  href="https://wa.me/94771234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`transition-colors ${isLight ? "hover:text-[#0F172A]" : "hover:text-white"}`}
                >
                  Support Hotline
                </a>
              </div>
            </footer>
          </main>
        </div>

      {/* ── Global Overlay Layer ── */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenAddProduct={() => setIsAddProductOpen(true)}
      />

      <ProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSave={() => {
          setIsAddProductOpen(false);
          window.location.reload();
        }}
        categories={[]}
      />
    </div>
  </AdminThemeContext.Provider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#071525] flex items-center justify-center text-white text-sm font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            Loading Admin Workspace...
          </div>
        </div>
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
