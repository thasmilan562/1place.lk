"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Brand,
  Department,
  DepartmentBrandPageConfig,
  DepartmentBrandCategoryTab,
  Product,
  ResponsiveBannerImage,
} from "@/lib/types";
import {
  getBrandsFromDb,
  saveBrandToDb,
  deleteBrandFromDb,
  getDepartmentsFromDb,
  getDepartmentBrandPageConfig,
  saveDepartmentBrandPageConfig,
  generateDefaultDepartmentPageConfig,
  DEFAULT_DEPARTMENTS,
  getDefaultBrandDepartments,
} from "@/lib/firestore-brands";
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Search,
  Eye,
  Copy,
  Upload,
  Link as LinkIcon,
  CircleCheck as Sparkles,
  Image as ImageIcon,
  AlertCircle,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  Layers,
  Palette,
  Sliders,
  CheckCircle2,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  Save,
  Check,
  Clipboard,
  X,
  ChevronRight,
  Info,
  Globe,
  SlidersHorizontal,
  ArrowRight,
  Maximize2,
} from "lucide-react";
import { uploadImageWithFallback } from "@/lib/upload-utils";
import DepartmentBrandHero from "@/components/brand/DepartmentBrandHero";
import { getDeptPrefix, formatDeptOrderCode, parseDeptOrderNumber } from "@/lib/utils";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

const BRAND_LOGO_PRESETS = [
  { name: "Apple", logo: "https://cdn.simpleicons.org/apple/000000" },
  { name: "Samsung", logo: "https://cdn.simpleicons.org/samsung/000000" },
  { name: "Xiaomi", logo: "https://cdn.simpleicons.org/xiaomi/FF6900" },
  { name: "Google Pixel", logo: "https://cdn.simpleicons.org/google/000000" },
  { name: "OnePlus", logo: "https://cdn.simpleicons.org/oneplus/F5010C" },
  { name: "Honor", logo: "https://cdn.simpleicons.org/honor/000000" },
  { name: "Vivo", logo: "https://cdn.simpleicons.org/vivo/000000" },
  { name: "Oppo", logo: "https://cdn.simpleicons.org/oppo/000000" },
  { name: "Realme", logo: "https://cdn.simpleicons.org/realme/000000" },
  { name: "JBL", logo: "https://cdn.simpleicons.org/jbl/FF3300" },
  { name: "Anker", logo: "https://cdn.simpleicons.org/anker/000000" },
  { name: "Baseus", logo: "https://cdn.simpleicons.org/baseus/000000" },
  { name: "UGREEN", logo: "https://cdn.simpleicons.org/ugreen/000000" },
  { name: "Hoco", logo: "https://icon.horse/icon/hocotech.com" },
  { name: "Joyroom", logo: "https://icon.horse/icon/joyroom.com" },
  { name: "Oraimo", logo: "https://icon.horse/icon/oraimo.com" },
];

// Helper: probe image dimensions and calculate ratio
async function probeImageDetails(url: string, targetRatio: number): Promise<Partial<ResponsiveBannerImage>> {
  if (!url || !url.trim()) {
    return { validationStatus: "untested" };
  }

  const trimmed = url.trim();
  if (trimmed.startsWith("javascript:") || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image/"))) {
    return {
      validationStatus: "error",
      validationMessage: "Invalid URL scheme. Please use HTTPS or uploaded image.",
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timeout = setTimeout(() => {
      resolve({
        imageUrl: trimmed,
        validationStatus: "error",
        validationMessage: "Unable to load image (timeout or invalid URL).",
      });
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const ratio = height > 0 ? Number((width / height).toFixed(2)) : 0;

      // Extract format if available
      let format = "Unknown";
      if (trimmed.includes(".webp")) format = "WebP";
      else if (trimmed.includes(".png")) format = "PNG";
      else if (trimmed.includes(".jpg") || trimmed.includes(".jpeg")) format = "JPEG";
      else if (trimmed.includes(".avif")) format = "AVIF";
      else if (trimmed.startsWith("data:image/webp")) format = "WebP";
      else if (trimmed.startsWith("data:image/png")) format = "PNG";
      else if (trimmed.startsWith("data:image/jpeg")) format = "JPEG";

      // Ratio validation
      const diff = Math.abs(ratio - targetRatio) / targetRatio;
      let status: "perfect" | "acceptable" | "warning" = "perfect";
      let msg = `Perfect ratio (${ratio} vs target ${targetRatio})`;

      if (diff > 0.25) {
        status = "warning";
        msg = `Incorrect ratio (${ratio}). Target is ${targetRatio}. Image will be cropped on storefront.`;
      } else if (diff > 0.08) {
        status = "acceptable";
        msg = `Acceptable ratio (${ratio}). Target is ${targetRatio}.`;
      }

      resolve({
        imageUrl: trimmed,
        actualWidth: width,
        actualHeight: height,
        actualRatio: ratio,
        format,
        validationStatus: status,
        validationMessage: msg,
      });
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve({
        imageUrl: trimmed,
        validationStatus: "error",
        validationMessage: "Unable to load image. Check the URL and CORS permissions.",
      });
    };

    img.src = trimmed;
  });
}

export default function BrandsTab({ products = [] }: { products?: Product[] }) {
  const { isLight } = useAdminTheme();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [modalSubTab, setModalSubTab] = useState<"general" | "departments" | "pages" | "preview">("general");

  // Form State for Brand
  const [formData, setFormData] = useState<Partial<Brand>>({
    name: "",
    slug: "",
    logo_url: "",
    icon_url: "",
    description: "",
    assigned_departments: ["phones"],
    status: "active",
    enabled: true,
    show_on_homepage: true,
    featured: false,
    order: 1,
    seo_title: "",
    seo_description: "",
  });

  // Department Pages Form State (Keyed by department slug)
  const [activePageDeptSlug, setActivePageDeptSlug] = useState<string>("phones");
  const [pageConfigs, setPageConfigs] = useState<Record<string, DepartmentBrandPageConfig>>({});
  const [editingDepartmentBanner, setEditingDepartmentBanner] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Probe Image Details State
  const [desktopProbe, setDesktopProbe] = useState<Partial<ResponsiveBannerImage>>({});
  const [tabletProbe, setTabletProbe] = useState<Partial<ResponsiveBannerImage>>({});
  const [mobileProbe, setMobileProbe] = useState<Partial<ResponsiveBannerImage>>({});

  const fetchBrandsAndDepartments = async () => {
    setLoading(true);
    try {
      const [brandData, deptData] = await Promise.all([
        getBrandsFromDb(),
        getDepartmentsFromDb(),
      ]);
      setBrands(brandData);
      setDepartments(deptData);
    } catch (e) {
      console.error("Failed to fetch brands/departments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandsAndDepartments();
  }, []);

  // Open Modal for Create or Edit
  const handleOpenModal = async (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      const assigned =
        brand.assigned_departments && brand.assigned_departments.length > 0
          ? brand.assigned_departments
          : getDefaultBrandDepartments(brand.slug, brand.product_group);

      setFormData({
        ...brand,
        assigned_departments: assigned,
        enabled: brand.enabled !== false && brand.status !== "inactive",
      });

      // Load all department page configs for this brand
      const configs: Record<string, DepartmentBrandPageConfig> = {};
      for (const deptSlug of departments.map((d) => d.slug)) {
        const config = await getDepartmentBrandPageConfig(deptSlug, brand.slug);
        if (config) {
          configs[deptSlug] = config;
        } else {
          configs[deptSlug] = generateDefaultDepartmentPageConfig(deptSlug, brand);
        }
      }
      setPageConfigs(configs);
      setActivePageDeptSlug(assigned[0] || "phones");
    } else {
      setEditingBrand(null);
      const newBrand: Partial<Brand> = {
        name: "",
        slug: "",
        logo_url: "",
        icon_url: "",
        description: "",
        assigned_departments: ["phones"],
        status: "active",
        enabled: true,
        show_on_homepage: true,
        featured: false,
        order: brands.length + 1,
      };
      setFormData(newBrand);

      // Automated Draft Configs for newly added brand
      const configs: Record<string, DepartmentBrandPageConfig> = {};
      for (const dept of departments) {
        configs[dept.slug] = generateDefaultDepartmentPageConfig(dept.slug, {
          id: `brand-temp`,
          name: "New Brand",
          slug: "new-brand",
          status: "active",
          enabled: true,
        });
      }
      setPageConfigs(configs);
      setActivePageDeptSlug("phones");
    }
    setModalSubTab("general");
    setEditingDepartmentBanner(null);
    setIsModalOpen(true);
    setSaveSuccess(false);
    setHasUnsavedChanges(false);
  };

  const handleToggleDepartment = (deptSlug: string) => {
    const current = formData.assigned_departments || [];
    let updated: string[];
    if (current.includes(deptSlug)) {
      if (current.length === 1) {
        alert("A brand must be assigned to at least one department.");
        return;
      }
      updated = current.filter((s) => s !== deptSlug);
    } else {
      updated = [...current, deptSlug];
    }
    setFormData({ ...formData, assigned_departments: updated });
    setHasUnsavedChanges(true);
    if (!updated.includes(activePageDeptSlug)) {
      setActivePageDeptSlug(updated[0] || "phones");
    }
  };

  const handleUpdateActivePageConfig = useCallback((updates: Partial<DepartmentBrandPageConfig>) => {
    setHasUnsavedChanges(true);
    setPageConfigs((prev) => {
      const current = prev[activePageDeptSlug] || generateDefaultDepartmentPageConfig(
        activePageDeptSlug,
        (editingBrand || { id: "temp", name: formData.name || "", slug: formData.slug || "" }) as Brand
      );
      return {
        ...prev,
        [activePageDeptSlug]: {
          ...current,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }, [activePageDeptSlug, editingBrand, formData.name, formData.slug]);

  // Validate images when active config changes
  useEffect(() => {
    const cfg = pageConfigs[activePageDeptSlug];
    if (cfg) {
      const deskUrl = cfg.desktop?.imageUrl || cfg.desktopBannerUrl || "";
      if (deskUrl) {
        probeImageDetails(deskUrl, 3.20).then(setDesktopProbe);
      } else {
        setDesktopProbe({});
      }

      const tabUrl = cfg.tablet?.imageUrl || cfg.tabletBannerUrl || "";
      if (tabUrl) {
        probeImageDetails(tabUrl, 2.00).then(setTabletProbe);
      } else {
        setTabletProbe({});
      }

      const mobUrl = cfg.mobile?.imageUrl || cfg.mobileBannerUrl || "";
      if (mobUrl) {
        probeImageDetails(mobUrl, 0.82).then(setMobileProbe);
      } else {
        setMobileProbe({});
      }
    }
  }, [activePageDeptSlug, pageConfigs]);

  const handlePasteClipboard = async (type: "desktop" | "tablet" | "mobile") => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const url = text.trim();
        if (type === "desktop") {
          handleUpdateActivePageConfig({
            desktopBannerUrl: url,
            desktop: { imageUrl: url, focalPosition: "center" },
          });
          probeImageDetails(url, 3.20).then(setDesktopProbe);
        } else if (type === "tablet") {
          handleUpdateActivePageConfig({
            tabletBannerUrl: url,
            tablet: { imageUrl: url, focalPosition: "center" },
          });
          probeImageDetails(url, 2.00).then(setTabletProbe);
        } else {
          handleUpdateActivePageConfig({
            mobileBannerUrl: url,
            mobile: { imageUrl: url, focalPosition: "center" },
          });
          probeImageDetails(url, 0.82).then(setMobileProbe);
        }
      }
    } catch {
      alert("Clipboard access is restricted or empty. Please paste manually into the input.");
    }
  };

  const handleBannerUpload = async (file: File, type: "desktop" | "tablet" | "mobile") => {
    setUploadingBanner(type);
    try {
      const url = await uploadImageWithFallback(file, "brand-banners");
      if (url) {
        if (type === "desktop") {
          handleUpdateActivePageConfig({
            desktopBannerUrl: url,
            desktop: { imageUrl: url, focalPosition: "center" },
          });
          probeImageDetails(url, 3.20).then(setDesktopProbe);
        } else if (type === "tablet") {
          handleUpdateActivePageConfig({
            tabletBannerUrl: url,
            tablet: { imageUrl: url, focalPosition: "center" },
          });
          probeImageDetails(url, 2.00).then(setTabletProbe);
        } else {
          handleUpdateActivePageConfig({
            mobileBannerUrl: url,
            mobile: { imageUrl: url, focalPosition: "center" },
          });
          probeImageDetails(url, 0.82).then(setMobileProbe);
        }
      }
    } catch (err) {
      console.error("Banner upload failed:", err);
      alert("Failed to upload banner image. Please try entering a URL instead.");
    } finally {
      setUploadingBanner(null);
    }
  };

  const handleSaveBrand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name?.trim()) {
      alert("Brand name is required.");
      return;
    }

    const slug =
      formData.slug?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    setIsSaving(true);
    try {
      const brandToSave: Brand = {
        id: editingBrand?.id || `brand-${slug}`,
        name: formData.name.trim(),
        slug,
        logo_url: formData.logo_url?.trim() || "",
        icon_url: formData.icon_url?.trim() || "",
        description: formData.description?.trim() || "",
        assigned_departments: formData.assigned_departments && formData.assigned_departments.length > 0 ? formData.assigned_departments : ["phones"],
        status: formData.enabled !== false ? "active" : "inactive",
        enabled: formData.enabled !== false,
        show_on_homepage: formData.show_on_homepage !== false,
        featured: Boolean(formData.featured),
        order: Number(formData.order) || 1,
        sort_order: Number(formData.order) || 1,
        department_order: formData.department_order || {},
        seo_title: formData.seo_title || `${formData.name.trim()} Products | 1PLACE.LK`,
        seo_description: formData.seo_description || "",
        updatedAt: new Date().toISOString(),
      };

      // Save brand to DB
      await saveBrandToDb(brandToSave);

      // Optimistically update brands state immediately
      setBrands((prev) => {
        const filtered = prev.filter((b) => b.id !== brandToSave.id && b.slug !== brandToSave.slug);
        return [brandToSave, ...filtered];
      });

      // Save each department page configuration safely
      for (const deptSlug of brandToSave.assigned_departments || ["phones"]) {
        try {
          const config = pageConfigs[deptSlug] || generateDefaultDepartmentPageConfig(deptSlug, brandToSave);
          const configToSave: DepartmentBrandPageConfig = {
            ...config,
            id: `${deptSlug}_${slug}`,
            brandId: brandToSave.id,
            brandSlug: slug,
            departmentSlug: deptSlug,
            enabled: true,
            status: config.status || "published",
            updatedAt: new Date().toISOString(),
          };
          await saveDepartmentBrandPageConfig(configToSave);
        } catch (deptErr) {
          console.warn(`Could not save department page for ${deptSlug}:`, deptErr);
        }
      }

      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      await fetchBrandsAndDepartments();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 500);
    } catch (err) {
      console.error("Failed to save brand:", err);
      alert("Failed to save brand details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBrand = async (brandId: string, brandName: string) => {
    const targetBrand = brands.find((b) => b.id === brandId || b.name === brandName);
    if (!confirm(`Are you sure you want to delete brand "${brandName}"? This will also remove all its department page configurations.`)) {
      return;
    }
    // Optimistically remove from state immediately
    setBrands((prev) => prev.filter((b) => b.id !== brandId && b.name !== brandName && b.slug !== targetBrand?.slug));
    try {
      await deleteBrandFromDb(brandId, targetBrand || { id: brandId, name: brandName });
      await fetchBrandsAndDepartments();
    } catch (e) {
      console.error("Failed to delete brand:", e);
      alert("Failed to delete brand.");
    }
  };

  const handleUpdateBrandOrder = async (brand: Brand, newOrder: number, deptSlug?: string) => {
    let updatedBrand: Brand;
    if (deptSlug && deptSlug !== "all") {
      const newDeptOrder = {
        ...(brand.department_order || {}),
        [deptSlug]: newOrder,
      };
      updatedBrand = {
        ...brand,
        department_order: newDeptOrder,
      };
    } else {
      updatedBrand = {
        ...brand,
        order: newOrder,
        sort_order: newOrder,
      };
    }
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? updatedBrand : b))
    );
    try {
      await saveBrandToDb(updatedBrand);
    } catch (e) {
      console.error("Failed to update brand order:", e);
    }
  };

  // Filtered & Sorted Brands
  const filteredBrands = useMemo(() => {
    return brands
      .filter((b) => {
        if (selectedDeptFilter !== "all") {
          const depts = b.assigned_departments || getDefaultBrandDepartments(b.slug, b.product_group);
          if (!depts.includes(selectedDeptFilter)) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = b.name.toLowerCase().includes(q);
          const matchSlug = b.slug.toLowerCase().includes(q);
          return matchName || matchSlug;
        }
        return true;
      })
      .sort((a, b) => {
        if (selectedDeptFilter !== "all") {
          const orderA = a.department_order?.[selectedDeptFilter] ?? a.sort_order ?? a.order ?? 999;
          const orderB = b.department_order?.[selectedDeptFilter] ?? b.sort_order ?? b.order ?? 999;
          return Number(orderA) - Number(orderB);
        }
        return Number(a.sort_order ?? a.order ?? 999) - Number(b.sort_order ?? b.order ?? 999);
      });
  }, [brands, selectedDeptFilter, searchQuery]);

  const activeDepartment =
    departments.find((d) => d.slug === activePageDeptSlug) || departments[0] || {
      id: "dept-phones",
      name: "Phones",
      slug: "phones",
    };

  const activePageConfig =
    pageConfigs[activePageDeptSlug] ||
    generateDefaultDepartmentPageConfig(
      activePageDeptSlug,
      (editingBrand || { id: "temp", name: formData.name || "Brand", slug: formData.slug || "brand" }) as Brand
    );

  return (
    <div
      className={`space-y-5 animate-fadeIn ${
        isLight ? "text-slate-900" : "text-[#F8FAFC]"
      }`}
    >
      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isLight
                ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-sm"
                : "bg-blue-600/10 text-blue-500 border border-blue-500/20"
            }`}
          >
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1
              className={`text-2xl font-bold tracking-tight ${
                isLight ? "text-slate-900" : "text-[#F8FAFC]"
              }`}
            >
              Brands
            </h1>
            <p
              className={`text-[13px] font-normal mt-0.5 ${
                isLight ? "text-slate-500" : "text-[#94A3B8]"
              }`}
            >
              Manage brands, assign departments, and configure brand catalog visibility.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Brand</span>
        </button>
      </div>

      {/* ── 2. FILTER & SEARCH TOOLBAR ── */}
      <div
        className={`rounded-2xl p-2.5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-[#0E141D] border-white/[0.08]"
        }`}
      >
        {/* Left: Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isLight ? "text-slate-400" : "text-[#94A3B8]"
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brands by name or slug..."
            className={`w-full bg-transparent pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none transition-colors ${
              isLight
                ? "text-slate-900 placeholder-slate-400 focus:bg-slate-50"
                : "text-[#F8FAFC] placeholder-slate-500 focus:bg-white/[0.03]"
            }`}
          />
        </div>

        {/* Right: Department Segmented Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedDeptFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border cursor-pointer ${
              selectedDeptFilter === "all"
                ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                : isLight
                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                : "bg-[#121A25] hover:bg-[#1A2535] text-[#94A3B8] hover:text-[#F8FAFC] border-white/[0.08]"
            }`}
          >
            All Departments ({brands.length})
          </button>
          {departments.map((dept) => {
            const count = brands.filter((b) => {
              const depts = b.assigned_departments || getDefaultBrandDepartments(b.slug, b.product_group);
              return depts.includes(dept.slug);
            }).length;
            const isSelected = selectedDeptFilter === dept.slug;
            return (
              <button
                key={dept.slug}
                type="button"
                onClick={() => setSelectedDeptFilter(dept.slug)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                    : isLight
                    ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-[#121A25] hover:bg-[#1A2535] text-[#94A3B8] hover:text-[#F8FAFC] border-white/[0.08]"
                }`}
              >
                {dept.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. BRAND COUNT ── */}
      <div className="flex items-center justify-between text-xs px-1">
        <span
          className={`font-medium ${
            isLight ? "text-slate-500" : "text-[#94A3B8]"
          }`}
        >
          {filteredBrands.length} Brands
          {filteredBrands.length !== brands.length && ` (${brands.length} total)`}
        </span>
      </div>

      {/* ── 4. BRANDS TABLE ── */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-sm ${
          isLight
            ? "bg-white border-slate-200"
            : "bg-[#0E141D] border-white/[0.08]"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                isLight
                  ? "bg-slate-50 text-slate-500 border-slate-200"
                  : "bg-[#0B111A] text-[#64748B] border-white/[0.08]"
              }`}
            >
              <tr>
                <th className="py-3 px-4 w-28 text-center">
                  {selectedDeptFilter !== "all"
                    ? `${departments.find((d) => d.slug === selectedDeptFilter)?.name || selectedDeptFilter} Order`
                    : "Order"}
                </th>
                <th className="py-3 px-5">Brand</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Assigned Departments</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Homepage</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isLight ? "divide-slate-100" : "divide-white/[0.06]"
              }`}
            >
              {filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No brands match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => {
                  const depts =
                    brand.assigned_departments ||
                    getDefaultBrandDepartments(brand.slug, brand.product_group);
                  const currentOrder =
                    selectedDeptFilter !== "all"
                      ? (brand.department_order?.[selectedDeptFilter] ??
                        brand.sort_order ??
                        brand.order ??
                        1)
                      : (brand.sort_order ?? brand.order ?? 1);
                  const isActive =
                    brand.enabled !== false && brand.status !== "inactive";
                  const isVisible = brand.show_on_homepage !== false;

                  return (
                    <tr
                      key={brand.id}
                      className={`h-[68px] transition-colors ${
                        isLight
                          ? "hover:bg-slate-50"
                          : "hover:bg-[#121A25]/60"
                      }`}
                    >
                      {/* ORDER */}
                      <td className="py-3 px-4 text-center">
                        {selectedDeptFilter !== "all" ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] border ${
                                selectedDeptFilter === "phones"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : selectedDeptFilter === "laptops-tablets"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {getDeptPrefix(selectedDeptFilter)}
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={currentOrder}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 1) {
                                  handleUpdateBrandOrder(
                                    brand,
                                    val,
                                    selectedDeptFilter
                                  );
                                }
                              }}
                              className={`w-12 border px-1.5 py-1 rounded-lg font-mono font-semibold text-center text-xs outline-none transition-colors ${
                                isLight
                                  ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                                  : "bg-[#121A25] border-white/10 text-white focus:border-blue-500"
                              }`}
                              title={`Edit ${formatDeptOrderCode(
                                selectedDeptFilter,
                                currentOrder
                              )} position`}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {depts.map((dSlug) => {
                              const orderNum =
                                brand.department_order?.[dSlug] ??
                                brand.sort_order ??
                                brand.order ??
                                1;
                              const prefix = getDeptPrefix(dSlug);
                              return (
                                <span
                                  key={dSlug}
                                  className={`px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] border ${
                                    dSlug === "phones"
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : dSlug === "laptops-tablets"
                                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  }`}
                                  title={`${dSlug}: ${prefix}${orderNum}`}
                                >
                                  {prefix}
                                  {orderNum}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* BRAND (Logo + Name) */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl p-1.5 flex items-center justify-center shrink-0 border ${
                              isLight
                                ? "bg-slate-50 border-slate-200"
                                : "bg-white/[0.06] border-white/10"
                            }`}
                          >
                            {brand.logo_url ? (
                              <img
                                src={brand.logo_url}
                                alt={brand.name}
                                className={`w-full h-full object-contain ${
                                  isLight ? "" : "filter brightness-0 invert"
                                }`}
                              />
                            ) : (
                              <span
                                className={`font-semibold text-xs ${
                                  isLight ? "text-slate-600" : "text-white/60"
                                }`}
                              >
                                {brand.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`font-semibold block truncate text-sm leading-snug ${
                                isLight ? "text-slate-900" : "text-[#F8FAFC]"
                              }`}
                            >
                              {brand.name}
                            </span>
                            <span
                              className={`text-[11px] block truncate ${
                                isLight ? "text-slate-400" : "text-[#94A3B8]"
                              }`}
                            >
                              {brand.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* SLUG */}
                      <td
                        className={`py-3 px-4 font-mono text-xs ${
                          isLight ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {brand.slug}
                      </td>

                      {/* ASSIGNED DEPARTMENTS */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {depts.map((dSlug) => {
                            const dept = departments.find(
                              (d) => d.slug === dSlug
                            );
                            return (
                              <Link
                                key={dSlug}
                                href={`/shop-by-brand/${dSlug}/${brand.slug}`}
                                target="_blank"
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors flex items-center gap-1 ${
                                  isLight
                                    ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                    : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20"
                                }`}
                                title={`View ${brand.name} in ${
                                  dept?.name || dSlug
                                }`}
                              >
                                <span>{dept?.name || dSlug}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </Link>
                            );
                          })}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            isActive
                              ? isLight
                                ? "text-emerald-600"
                                : "text-[#10B981]"
                              : isLight
                              ? "text-slate-400"
                              : "text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-500"
                            }`}
                          />
                          <span>{isActive ? "Active" : "Inactive"}</span>
                        </span>
                      </td>

                      {/* HOMEPAGE */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            isVisible
                              ? isLight
                                ? "text-emerald-600"
                                : "text-[#10B981]"
                              : isLight
                              ? "text-slate-400"
                              : "text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isVisible ? "bg-emerald-500" : "bg-slate-500"
                            }`}
                          />
                          <span>{isVisible ? "Visible" : "Hidden"}</span>
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(brand)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isLight
                                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-[#141E2B] hover:bg-[#1C2A3C] text-slate-300 hover:text-white border-white/[0.08]"
                            }`}
                            title="Edit Brand & Department Pages"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteBrand(brand.id, brand.name)
                            }
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer"
                            title="Delete Brand"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EDIT / CREATE BRAND MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div
            className={`border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6 transition-all ${
              isLight
                ? "bg-white border-slate-200 text-slate-900"
                : "bg-[#0E141D] border-white/[0.12] text-[#F8FAFC]"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b shrink-0 ${
                isLight ? "border-slate-100" : "border-white/[0.08]"
              }`}
            >
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  {editingBrand ? `Edit Brand: ${editingBrand.name}` : "Add New Brand"}
                </h2>
                <p
                  className={`text-xs mt-0.5 ${
                    isLight ? "text-slate-500" : "text-[#94A3B8]"
                  }`}
                >
                  Configure brand details, assigned departments, and responsive banner artwork.
                </p>
              </div>

              {/* Sub-Tabs */}
              <div
                className={`flex items-center gap-1 p-1 rounded-xl border ${
                  isLight
                    ? "bg-slate-50 border-slate-200"
                    : "bg-[#121A25] border-white/[0.08]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setModalSubTab("general")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    modalSubTab === "general"
                      ? "bg-[#2563EB] text-white shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setModalSubTab("departments")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    modalSubTab === "departments"
                      ? "bg-[#2563EB] text-white shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Departments
                </button>
                <button
                  type="button"
                  onClick={() => setModalSubTab("pages")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    modalSubTab === "pages"
                      ? "bg-[#2563EB] text-white shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Department Pages
                </button>
                <button
                  type="button"
                  onClick={() => setModalSubTab("preview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    modalSubTab === "preview"
                      ? "bg-[#2563EB] text-white shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Eye className="w-3 h-3" /> Live Preview
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveBrand} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* SUBTAB 1: GENERAL BRAND SETTINGS */}
              {modalSubTab === "general" && (
                <div className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/70 font-bold mb-1">Brand Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ""}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="e.g. Apple"
                        className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-red-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 font-bold mb-1">Brand Slug</label>
                      <input
                        type="text"
                        value={formData.slug || ""}
                        onChange={(e) => {
                          setFormData({ ...formData, slug: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="e.g. apple"
                        className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 p-3.5 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="block text-white font-extrabold text-xs">
                          Display Order # (1, 2, 3...)
                        </label>
                        <p className="text-[11px] text-white/50 mt-0.5">
                          Set the exact display sequence on Homepage &quot;Shop by Brand&quot; (1 = First Brand Logo, 2 = Second, etc.)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white/60">Position:</span>
                        <input
                          type="number"
                          min="1"
                          value={formData.order ?? formData.sort_order ?? 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setFormData({ ...formData, order: val, sort_order: val });
                            setHasUnsavedChanges(true);
                          }}
                          className="w-20 bg-black/50 border border-white/20 px-3 py-1.5 rounded-xl text-white font-mono font-black text-center text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-2 p-3.5 bg-black/30 border border-white/10 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <label className="block text-white/80 font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-red-400" /> Brand Logo (Icon / SVG / PNG)
                        </label>
                        {formData.logo_url && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, logo_url: "" });
                              setHasUnsavedChanges(true);
                            }}
                            className="text-[11px] font-bold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Remove / Clear Logo
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Logo Preview Box */}
                        <div className="w-14 h-14 rounded-xl bg-white/10 p-2 flex items-center justify-center border border-white/15 shrink-0 overflow-hidden">
                          {formData.logo_url ? (
                            <img
                              src={formData.logo_url}
                              alt="Brand Logo"
                              className="w-full h-full object-contain filter brightness-0 invert"
                            />
                          ) : (
                            <span className="text-white/30 font-extrabold text-xs">NO LOGO</span>
                          )}
                        </div>

                        {/* Input & Upload */}
                        <div className="flex-1 space-y-2">
                          <input
                            type="url"
                            value={formData.logo_url || ""}
                            onChange={(e) => {
                              setFormData({ ...formData, logo_url: e.target.value });
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="https://cdn.simpleicons.org/apple/000000"
                            className="w-full bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl text-white outline-none focus:border-red-500 font-mono text-[11px]"
                          />
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id="brandLogoUpload"
                              accept="image/png,image/svg+xml,image/webp,image/jpeg"
                              className="hidden"
                              onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  try {
                                    const uploaded = await uploadImageWithFallback(e.target.files[0], "brands");
                                    if (uploaded) {
                                      setFormData({ ...formData, logo_url: uploaded });
                                      setHasUnsavedChanges(true);
                                    }
                                  } catch (err) {
                                    alert("Failed to upload brand logo.");
                                  }
                                }
                              }}
                            />
                            <label
                              htmlFor="brandLogoUpload"
                              className="px-3 py-1 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                            >
                              <Upload className="w-3 h-3 text-red-400" /> Upload File (PNG/SVG)
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
                        <span className="text-[10px] text-white/40">Presets:</span>
                        {BRAND_LOGO_PRESETS.slice(0, 10).map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, logo_url: preset.logo });
                              setHasUnsavedChanges(true);
                            }}
                            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-white/70 font-bold mb-1">Brand Description</label>
                      <textarea
                        rows={2}
                        value={formData.description || ""}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Genuine devices and original accessories..."
                        className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-red-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-white font-bold">
                        <input
                          type="checkbox"
                          checked={formData.show_on_homepage !== false}
                          onChange={(e) => {
                            setFormData({ ...formData, show_on_homepage: e.target.checked });
                            setHasUnsavedChanges(true);
                          }}
                          className="accent-red-600 rounded"
                        />
                        Show in Homepage &quot;Shop by Brand&quot;
                      </label>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-white font-bold">
                        <input
                          type="checkbox"
                          checked={formData.enabled !== false}
                          onChange={(e) => {
                            setFormData({ ...formData, enabled: e.target.checked });
                            setHasUnsavedChanges(true);
                          }}
                          className="accent-red-600 rounded"
                        />
                        Brand Enabled
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: DEPARTMENT ASSIGNMENT */}
              {modalSubTab === "departments" && (
                <div className="space-y-4">
                  <p className="text-xs text-white/60">
                    Select which store departments this brand belongs to and set its specific display sequence order for each department.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {departments.map((dept) => {
                      const isAssigned = (formData.assigned_departments || []).includes(dept.slug);
                      return (
                        <div
                          key={dept.slug}
                          onClick={() => handleToggleDepartment(dept.slug)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                            isAssigned
                              ? "bg-blue-600/10 border-blue-500/40 text-white shadow-lg"
                              : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => {}}
                              className="accent-blue-600 mt-1 rounded cursor-pointer"
                            />
                            <div>
                              <h4 className="font-extrabold text-sm text-white">{dept.name}</h4>
                              <p className="text-[11px] text-white/50 mt-1">{dept.description}</p>
                              <span className="inline-block text-[10px] font-mono text-blue-400 mt-2">
                                /shop-by-brand/{dept.slug}/{formData.slug || "brand"}
                              </span>
                            </div>
                          </div>

                          {isAssigned && (
                            <div
                              className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[11px] font-bold text-white/80">Order in {dept.name}:</span>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono font-black text-[11px] border ${
                                    dept.slug === "phones"
                                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                      : dept.slug === "laptops-tablets"
                                      ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  }`}
                                >
                                  {getDeptPrefix(dept.slug)}
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  value={formData.department_order?.[dept.slug] ?? formData.order ?? 1}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || 1;
                                    setFormData({
                                      ...formData,
                                      department_order: {
                                        ...(formData.department_order || {}),
                                        [dept.slug]: val,
                                      },
                                    });
                                    setHasUnsavedChanges(true);
                                  }}
                                  className="w-14 bg-black/60 border border-white/20 hover:border-blue-400 focus:border-blue-500 px-2 py-1 rounded-lg text-white font-mono font-bold text-center text-xs outline-none"
                                  title={`Order position in ${dept.name} (${getDeptPrefix(dept.slug)}${formData.department_order?.[dept.slug] ?? formData.order ?? 1})`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUBTAB 3: DEPARTMENT PAGES (BANNER MANAGER & PAGE CONTENT) */}
              {modalSubTab === "pages" && (
                <div className="space-y-6">
                  
                  {/* Department Page Overview Cards */}
                  {!editingDepartmentBanner ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white">Assigned Department Pages</h3>
                          <p className="text-xs text-white/50">
                            Each department has independent full-frame banner artwork and page headings.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(formData.assigned_departments || ["phones"]).map((dSlug) => {
                          const dept = departments.find((d) => d.slug === dSlug) || { name: dSlug, slug: dSlug };
                          const cfg = pageConfigs[dSlug] || generateDefaultDepartmentPageConfig(dSlug, { id: "temp", name: formData.name || "", slug: formData.slug || "" } as Brand);
                          const hasDesktop = Boolean(cfg.desktop?.imageUrl || cfg.desktopBannerUrl);
                          const hasTablet = Boolean(cfg.tablet?.imageUrl || cfg.tabletBannerUrl || cfg.useDesktopForTablet);
                          const hasMobile = Boolean(cfg.mobile?.imageUrl || cfg.mobileBannerUrl || cfg.useDesktopForMobile || cfg.useTabletForMobile);

                          return (
                            <div
                              key={dSlug}
                              className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 flex flex-col justify-between hover:border-white/20 transition-all shadow-md"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                                    <span>{dept.name}</span>
                                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                      /{dSlug}
                                    </span>
                                  </h4>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    cfg.status === "published" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                                  }`}>
                                    {cfg.status === "published" ? "Published" : "Draft"}
                                  </span>
                                </div>

                                {/* Banner Thumbnail Preview */}
                                <div className="relative w-full aspect-[16/5] rounded-xl overflow-hidden bg-neutral-900 border border-white/10 mb-3 flex items-center justify-center">
                                  {cfg.desktop?.imageUrl || cfg.desktopBannerUrl ? (
                                    <img
                                      src={cfg.desktop?.imageUrl || cfg.desktopBannerUrl}
                                      alt={`${formData.name} ${dept.name} Banner`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="text-center p-3 text-white/40">
                                      <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                      <span className="text-[11px] font-bold">No Banner Configured</span>
                                    </div>
                                  )}
                                </div>

                                {/* Status Badges */}
                                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono mb-2">
                                  <div className="bg-black/30 p-1.5 rounded-lg border border-white/5 text-center">
                                    <span className="text-white/40 block">Desktop</span>
                                    <span className={hasDesktop ? "text-emerald-400 font-bold" : "text-amber-400"}>
                                      {hasDesktop ? "Added" : "Missing"}
                                    </span>
                                  </div>
                                  <div className="bg-black/30 p-1.5 rounded-lg border border-white/5 text-center">
                                    <span className="text-white/40 block">Tablet</span>
                                    <span className={hasTablet ? "text-emerald-400 font-bold" : "text-amber-400"}>
                                      {hasTablet ? "Added" : "Missing"}
                                    </span>
                                  </div>
                                  <div className="bg-black/30 p-1.5 rounded-lg border border-white/5 text-center">
                                    <span className="text-white/40 block">Mobile</span>
                                    <span className={hasMobile ? "text-emerald-400 font-bold" : "text-amber-400"}>
                                      {hasMobile ? "Added" : "Missing"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card Actions */}
                              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePageDeptSlug(dSlug);
                                    setEditingDepartmentBanner(dSlug);
                                  }}
                                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Banner Manager</span>
                                </button>

                                <Link
                                  href={`/shop-by-brand/${dSlug}/${formData.slug || "apple"}`}
                                  target="_blank"
                                  className="p-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl border border-white/10 transition-colors"
                                  title="Open Live Page"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* ── BANNER MANAGER FORM FOR SELECTED DEPARTMENT ── */
                    <div className="space-y-6">
                      {/* Breadcrumb Back Button */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <button
                          type="button"
                          onClick={() => setEditingDepartmentBanner(null)}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>&larr; Back to Department Overview</span>
                        </button>

                        <span className="text-xs font-bold text-white bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/30">
                          {formData.name} &times; {activeDepartment.name}
                        </span>
                      </div>

                      {/* Status & Unsaved Indicator */}
                      <div className="flex items-center justify-between bg-black/30 p-3.5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activePageConfig.bannerEnabled !== false}
                              onChange={(e) => handleUpdateActivePageConfig({ bannerEnabled: e.target.checked })}
                              className="accent-blue-600 rounded"
                            />
                            <span>Banner Section Enabled</span>
                          </label>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            activePageConfig.status === "published" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {activePageConfig.status === "published" ? "Status: Published" : "Status: Draft"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateActivePageConfig({ status: activePageConfig.status === "published" ? "draft" : "published" })}
                            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            {activePageConfig.status === "published" ? "Switch to Draft" : "Publish"}
                          </button>
                        </div>
                      </div>

                      {/* ── BANNER FRAME SIZE & ASPECT RATIO SELECTOR ── */}
                      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Maximize2 className="w-3.5 h-3.5" /> Department Banner Size &amp; Aspect Ratio Preset
                          </label>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">
                            {activePageConfig.bannerSizeRatio || "default"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { id: "860x270", label: "860 × 270 (Default)", badge: "860×270", desc: "Crisp High-Res Banner Frame" },
                            { id: "default", label: "Widescreen", badge: "1920×600", desc: "Widescreen Frame" },
                            { id: "1080x1080", label: "1080 × 1080", badge: "1:1 Square", desc: "Square Banner Frame" },
                            { id: "1920x850", label: "1920 × 850", badge: "~2.3:1 Wide", desc: "Cinematic Panoramic Frame" },
                            { id: "1080x1440", label: "1080 × 1440", badge: "3:4 Portrait", desc: "Tall Story / Vertical Poster" },
                          ].map((preset) => {
                            const isSelected = (activePageConfig.bannerSizeRatio || "860x270") === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleUpdateActivePageConfig({ bannerSizeRatio: preset.id as any, banner_size_ratio: preset.id })}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                                  isSelected
                                    ? "bg-blue-600/30 border-blue-500 text-white shadow-md ring-1 ring-blue-500"
                                    : "bg-black/30 border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-[11px] text-white">{preset.label}</span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isSelected ? "bg-blue-500 text-white" : "bg-white/10 text-white/50"}`}>
                                    {preset.badge}
                                  </span>
                                </div>
                                <p className="text-[9px] leading-tight text-white/50 line-clamp-1">{preset.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── BANNER FRAME BACKGROUND COLOR ── */}
                      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Outer Frame Background Color
                          </label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-white/40 shadow-xs"
                              style={{ backgroundColor: activePageConfig.bannerBackgroundColor || "#F4F5F7" }}
                            />
                            <span className="text-[10px] font-mono text-white/60 font-bold uppercase">
                              {activePageConfig.bannerBackgroundColor || "#F4F5F7"}
                            </span>
                          </div>
                        </div>

                        {/* Preset Swatches */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                          {[
                            { hex: "#F4F5F7", label: "Light Slate (Default)" },
                            { hex: "#FFFFFF", label: "Pure White" },
                            { hex: "#FAFAFA", label: "Soft Neutral" },
                            { hex: "#0F172A", label: "Luxury Dark" },
                            { hex: "#F0F7FC", label: "Ice Sky" },
                            { hex: "#FFFAF3", label: "Ivory Cream" },
                            { hex: "#FEF3C7", label: "Amber Warm" },
                            { hex: "#FFF1F2", label: "Blush Rose" },
                          ].map((preset) => {
                            const isSelected =
                              (activePageConfig.bannerBackgroundColor || "#F4F5F7").toLowerCase() ===
                              preset.hex.toLowerCase();
                            return (
                              <button
                                key={preset.hex}
                                type="button"
                                onClick={() => handleUpdateActivePageConfig({ bannerBackgroundColor: preset.hex })}
                                className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-white/20 border-white ring-2 ring-blue-500/50 shadow-md"
                                    : "bg-black/30 border-white/10 hover:bg-white/10"
                                }`}
                              >
                                <div
                                  className="w-6 h-6 rounded-lg border border-white/30 shadow-2xs flex items-center justify-center"
                                  style={{ backgroundColor: preset.hex }}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 drop-shadow" />}
                                </div>
                                <span className="text-[10px] font-bold text-white leading-none line-clamp-1">
                                  {preset.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Color Input & Hex Code */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={
                                activePageConfig.bannerBackgroundColor?.startsWith("#") && activePageConfig.bannerBackgroundColor.length === 7
                                  ? activePageConfig.bannerBackgroundColor
                                  : "#F4F5F7"
                              }
                              onChange={(e) =>
                                handleUpdateActivePageConfig({ bannerBackgroundColor: e.target.value.toUpperCase() })
                              }
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 outline-none"
                            />
                            <span className="text-xs text-white/70 font-semibold">Custom Color Picker</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/50 font-mono">Hex:</span>
                            <input
                              type="text"
                              value={activePageConfig.bannerBackgroundColor || "#F4F5F7"}
                              onChange={(e) =>
                                handleUpdateActivePageConfig({ bannerBackgroundColor: e.target.value })
                              }
                              placeholder="#F4F5F7"
                              className="w-28 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-xs font-bold text-center outline-none focus:border-blue-500 uppercase"
                            />
                          </div>
                        </div>
                      </div>

                      {/* ── BANNER BACKGROUND BLUR & SIDE-FIT BLEND CONTROLS ── */}
                      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Ambient Background Blur &amp; Side Whitespace Fitting
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activePageConfig.bannerBlurEnabled !== false}
                              onChange={(e) =>
                                handleUpdateActivePageConfig({ bannerBlurEnabled: e.target.checked })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                          </label>
                        </div>

                        {/* Blur Intensity Selector */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/70 font-semibold">Blur Intensity</span>
                            <span className="font-mono text-[10px] text-indigo-400 uppercase font-bold">
                              {activePageConfig.bannerBlurStrength || "medium (30px)"}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { id: "low", label: "Low (16px)" },
                              { id: "medium", label: "Medium (30px)" },
                              { id: "high", label: "High (45px)" },
                              { id: "ultra", label: "Ultra (70px)" },
                            ].map((b) => {
                              const isSelected =
                                (activePageConfig.bannerBlurStrength || "medium") === b.id;
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateActivePageConfig({ bannerBlurStrength: b.id as any })
                                  }
                                  className={`py-1.5 px-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                                    isSelected
                                      ? "bg-indigo-600/40 border-indigo-500 text-white shadow-xs"
                                      : "bg-black/30 border-white/10 text-white/60 hover:bg-white/5"
                                  }`}
                                >
                                  {b.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Blend Mode for Seamless Whitespace Elimination */}
                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/70 font-semibold">Side Whitespace Seamless Blend</span>
                            <span className="font-mono text-[10px] text-indigo-400 uppercase font-bold">
                              {activePageConfig.bannerBlendMode || "multiply (Seamless)"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "multiply", label: "Seamless Blend", desc: "Hides white side borders completely" },
                              { id: "normal", label: "Normal", desc: "Standard (no blending)" },
                              { id: "screen", label: "Screen", desc: "For black/dark banners" },
                            ].map((m) => {
                              const isSelected =
                                (activePageConfig.bannerBlendMode || "multiply") === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateActivePageConfig({ bannerBlendMode: m.id as any })
                                  }
                                  className={`p-2 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between gap-0.5 ${
                                    isSelected
                                      ? "bg-indigo-600/40 border-indigo-500 text-white shadow-xs ring-1 ring-indigo-500"
                                      : "bg-black/30 border-white/10 text-white/60 hover:bg-white/5"
                                  }`}
                                >
                                  <span className="text-[11px] font-bold text-white">{m.label}</span>
                                  <span className="text-[9px] text-white/50 line-clamp-1">{m.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* ── 1. DESKTOP BANNER CONTROLS (1600 × 500px, 16:5) ── */}
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Monitor className="w-4 h-4 text-blue-400" />
                            Desktop Banner Image (16:5)
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText("1600 × 500px")}
                            className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                            title="Copy Recommended Size"
                          >
                            <span>1600 × 500px</span>
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Size Guidance */}
                        <div className="text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-0.5">
                          <div className="text-white/80 font-bold">Recommended: 1600 × 500px · Aspect ratio: 16:5 (3.20)</div>
                          <div className="text-white/50">Minimum: 1440 × 450px · Formats: WebP, AVIF, PNG · Max 1.5MB</div>
                        </div>

                        {/* URL input and action buttons */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-white/80">Desktop Banner Image URL</label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handlePasteClipboard("desktop")}
                                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Clipboard className="w-3 h-3" /> Paste URL
                              </button>
                              <label className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer">
                                <Upload className="w-3 h-3" />
                                <span>{uploadingBanner === "desktop" ? "Uploading..." : "Upload File"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleBannerUpload(file, "desktop");
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={activePageConfig.desktop?.imageUrl || activePageConfig.desktopBannerUrl || ""}
                              onChange={(e) => {
                                handleUpdateActivePageConfig({
                                  desktopBannerUrl: e.target.value,
                                  desktop: {
                                    imageUrl: e.target.value,
                                    focalPosition: activePageConfig.desktop?.focalPosition || "center",
                                  },
                                });
                              }}
                              placeholder="https://images.unsplash.com/... or upload"
                              className="flex-1 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-blue-500 font-mono text-xs"
                            />
                            {(activePageConfig.desktop?.imageUrl || activePageConfig.desktopBannerUrl) && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateActivePageConfig({
                                    desktopBannerUrl: "",
                                    desktop: undefined,
                                  });
                                  setDesktopProbe({});
                                }}
                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Clear Image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Image Probe & Validation Status */}
                        {desktopProbe.validationStatus && (
                          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                            desktopProbe.validationStatus === "perfect"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : desktopProbe.validationStatus === "acceptable"
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                              : desktopProbe.validationStatus === "warning"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              : "bg-red-500/10 border-red-500/30 text-red-300"
                          }`}>
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 flex-1">
                              <div className="font-bold">{desktopProbe.validationMessage}</div>
                              {desktopProbe.actualWidth && desktopProbe.actualHeight && (
                                <div className="text-[11px] opacity-80">
                                  Actual Size: {desktopProbe.actualWidth} &times; {desktopProbe.actualHeight}px · Format: {desktopProbe.format || "WebP"}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Focal Position Controls */}
                        <div className="space-y-2 text-xs pt-2 border-t border-white/10">
                          <label className="font-bold text-white/80 block">Focal Position</label>
                          <div className="flex items-center gap-2">
                            {["left", "center", "right"].map((pos) => (
                              <button
                                key={pos}
                                type="button"
                                onClick={() => {
                                  handleUpdateActivePageConfig({
                                    desktopFocalPosition: pos,
                                    desktop: {
                                      imageUrl: activePageConfig.desktop?.imageUrl || activePageConfig.desktopBannerUrl || "",
                                      focalPosition: pos,
                                    },
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                                  (activePageConfig.desktop?.focalPosition || activePageConfig.desktopFocalPosition || "center") === pos
                                    ? "bg-blue-600 text-white shadow"
                                    : "bg-white/5 text-white/60 hover:text-white"
                                }`}
                              >
                                {pos}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live 16:5 Crop Preview */}
                        {(activePageConfig.desktop?.imageUrl || activePageConfig.desktopBannerUrl) && (
                          <div className="space-y-1 pt-2">
                            <span className="text-[11px] font-bold text-white/60 block">Desktop 16:5 Crop Preview:</span>
                            <div className="relative w-full aspect-[16/5] rounded-xl overflow-hidden border border-white/10 bg-neutral-900">
                              <img
                                src={activePageConfig.desktop?.imageUrl || activePageConfig.desktopBannerUrl}
                                alt="Desktop Banner Preview"
                                style={{
                                  objectPosition: activePageConfig.desktop?.focalPosition || activePageConfig.desktopFocalPosition || "center",
                                }}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── 2. TABLET BANNER CONTROLS (1200 × 600px, 2:1) ── */}
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Tablet className="w-4 h-4 text-amber-400" />
                            Tablet Banner Image (2:1 Optional)
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText("1200 × 600px")}
                            className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                            title="Copy Recommended Size"
                          >
                            <span>1200 × 600px</span>
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Toggle Use Desktop for Tablet */}
                        <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer bg-black/30 p-2.5 rounded-xl border border-white/5">
                          <input
                            type="checkbox"
                            checked={activePageConfig.useDesktopForTablet !== false && !activePageConfig.tablet?.imageUrl && !activePageConfig.tabletBannerUrl}
                            onChange={(e) => {
                              handleUpdateActivePageConfig({
                                useDesktopForTablet: e.target.checked,
                                tabletBannerUrl: e.target.checked ? "" : activePageConfig.tabletBannerUrl,
                              });
                            }}
                            className="accent-amber-500 rounded"
                          />
                          <span>Use Desktop Banner for Tablet (Automatic Fallback)</span>
                        </label>

                        {/* Custom Tablet Image Fields */}
                        {(activePageConfig.useDesktopForTablet === false || activePageConfig.tablet?.imageUrl || activePageConfig.tabletBannerUrl) && (
                          <div className="space-y-3 pt-2">
                            <div className="text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-0.5">
                              <div className="text-white/80 font-bold">Recommended: 1200 × 600px · Aspect ratio: 2:1 (2.00)</div>
                              <div className="text-white/50">Formats: WebP, AVIF, PNG · Max 1.2MB</div>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <label className="font-bold text-white/80">Tablet Banner Image URL</label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handlePasteClipboard("tablet")}
                                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Clipboard className="w-3 h-3" /> Paste URL
                                  </button>
                                  <label className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer">
                                    <Upload className="w-3 h-3" />
                                    <span>{uploadingBanner === "tablet" ? "Uploading..." : "Upload File"}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleBannerUpload(file, "tablet");
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>

                              <input
                                type="url"
                                value={activePageConfig.tablet?.imageUrl || activePageConfig.tabletBannerUrl || ""}
                                onChange={(e) => {
                                  handleUpdateActivePageConfig({
                                    tabletBannerUrl: e.target.value,
                                    tablet: {
                                      imageUrl: e.target.value,
                                      focalPosition: activePageConfig.tablet?.focalPosition || "center",
                                    },
                                    useDesktopForTablet: false,
                                  });
                                }}
                                placeholder="https://images.unsplash.com/... or upload"
                                className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-amber-500 font-mono text-xs"
                              />
                            </div>

                            {/* Tablet Image Probe */}
                            {tabletProbe.validationStatus && (
                              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                                tabletProbe.validationStatus === "perfect"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              }`}>
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold">{tabletProbe.validationMessage}</div>
                                  {tabletProbe.actualWidth && (
                                    <div className="text-[11px] opacity-80">
                                      Actual: {tabletProbe.actualWidth} &times; {tabletProbe.actualHeight}px
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── 3. MOBILE BANNER CONTROLS (900 × 1100px, 4:5) ── */}
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-emerald-400" />
                            Mobile Banner Image (4:5 Optional)
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText("900 × 1100px")}
                            className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                            title="Copy Recommended Size"
                          >
                            <span>900 × 1100px</span>
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Toggle Use Tablet/Desktop for Mobile */}
                        <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer bg-black/30 p-2.5 rounded-xl border border-white/5">
                          <input
                            type="checkbox"
                            checked={activePageConfig.useDesktopForMobile !== false && !activePageConfig.mobile?.imageUrl && !activePageConfig.mobileBannerUrl}
                            onChange={(e) => {
                              handleUpdateActivePageConfig({
                                useDesktopForMobile: e.target.checked,
                                mobileBannerUrl: e.target.checked ? "" : activePageConfig.mobileBannerUrl,
                              });
                            }}
                            className="accent-emerald-500 rounded"
                          />
                          <span>Use Desktop/Tablet Banner for Mobile (Automatic Fallback)</span>
                        </label>

                        {/* Custom Mobile Image Fields */}
                        {(activePageConfig.useDesktopForMobile === false || activePageConfig.mobile?.imageUrl || activePageConfig.mobileBannerUrl) && (
                          <div className="space-y-3 pt-2">
                            <div className="text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-0.5">
                              <div className="text-white/80 font-bold">Recommended: 900 × 1100px · Aspect ratio: ~4:5 (0.82)</div>
                              <div className="text-white/50">Formats: WebP, AVIF, PNG · Max 1MB</div>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <label className="font-bold text-white/80">Mobile Banner Image URL</label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handlePasteClipboard("mobile")}
                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Clipboard className="w-3 h-3" /> Paste URL
                                  </button>
                                  <label className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer">
                                    <Upload className="w-3 h-3" />
                                    <span>{uploadingBanner === "mobile" ? "Uploading..." : "Upload File"}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleBannerUpload(file, "mobile");
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>

                              <input
                                type="url"
                                value={activePageConfig.mobile?.imageUrl || activePageConfig.mobileBannerUrl || ""}
                                onChange={(e) => {
                                  handleUpdateActivePageConfig({
                                    mobileBannerUrl: e.target.value,
                                    mobile: {
                                      imageUrl: e.target.value,
                                      focalPosition: activePageConfig.mobile?.focalPosition || "center",
                                    },
                                    useDesktopForMobile: false,
                                  });
                                }}
                                placeholder="https://images.unsplash.com/... or upload"
                                className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-emerald-500 font-mono text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── 4. ACCESSIBILITY & ALT TEXT ── */}
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-white block">Banner Alt Text (Accessibility)</label>
                          <label className="flex items-center gap-2 text-white/70 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(activePageConfig.decorative)}
                              onChange={(e) => handleUpdateActivePageConfig({ decorative: e.target.checked })}
                              className="accent-blue-600 rounded"
                            />
                            <span>Decorative image (empty alt)</span>
                          </label>
                        </div>

                        {!activePageConfig.decorative && (
                          <div>
                            <input
                              type="text"
                              value={activePageConfig.bannerAlt || ""}
                              onChange={(e) => handleUpdateActivePageConfig({ bannerAlt: e.target.value })}
                              placeholder={`e.g. ${formData.name} ${activeDepartment.name} models available at 1PLACE.LK`}
                              className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                            />
                            <div className="text-[10px] text-white/40 mt-1 text-right">
                              {(activePageConfig.bannerAlt || "").length} characters
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── 5. CLICKABLE BANNER LINK SETTINGS ── */}
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 text-xs">
                        <label className="flex items-center gap-2 font-bold text-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(activePageConfig.linkEnabled)}
                            onChange={(e) => handleUpdateActivePageConfig({ linkEnabled: e.target.checked })}
                            className="accent-blue-600 rounded"
                          />
                          <span>Make Complete Banner Clickable</span>
                        </label>

                        {activePageConfig.linkEnabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-2 border-t border-white/5">
                            <div>
                              <label className="block text-white/60 mb-1">Destination URL</label>
                              <input
                                type="text"
                                value={activePageConfig.destinationUrl || ""}
                                onChange={(e) => handleUpdateActivePageConfig({ destinationUrl: e.target.value })}
                                placeholder="/products/iphone-16-pro or https://..."
                                className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white outline-none focus:border-blue-500 font-mono text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-white/60 mb-1">Accessible Link Label (Aria)</label>
                              <input
                                type="text"
                                value={activePageConfig.linkAriaLabel || ""}
                                onChange={(e) => handleUpdateActivePageConfig({ linkAriaLabel: e.target.value })}
                                placeholder={`Shop ${formData.name} ${activeDepartment.name} collection`}
                                className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                              />
                            </div>

                            <div className="flex items-center pt-2">
                              <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(activePageConfig.openInNewTab)}
                                  onChange={(e) => handleUpdateActivePageConfig({ openInNewTab: e.target.checked })}
                                  className="accent-blue-600 rounded"
                                />
                                <span>Open Link in New Tab</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── 6. PAGE CONTENT HEADINGS (BELOW BANNER & TABS) ── */}
                      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 text-xs">
                        <span className="font-bold text-white block">Product Section Heading &amp; Description</span>

                        <div>
                          <label className="block text-white/70 font-bold mb-1">Section Heading</label>
                          <input
                            type="text"
                            value={activePageConfig.productSectionHeading || ""}
                            onChange={(e) => handleUpdateActivePageConfig({ productSectionHeading: e.target.value })}
                            placeholder={`e.g. ${formData.name} ${activeDepartment.name}`}
                            className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-blue-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-white/70 font-bold mb-1">Section Description</label>
                          <textarea
                            rows={2}
                            value={activePageConfig.productSectionDescription || ""}
                            onChange={(e) => handleUpdateActivePageConfig({ productSectionDescription: e.target.value })}
                            placeholder={`Explore genuine ${formData.name} ${activeDepartment.name.toLowerCase()} available at 1PLACE.LK.`}
                            className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-blue-500 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: LIVE PREVIEW */}
              {modalSubTab === "preview" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Previewing: {formData.name} in {activeDepartment.name}
                    </span>

                    <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("desktop")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          previewDevice === "desktop" ? "bg-blue-600 text-white" : "text-white/60"
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("tablet")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          previewDevice === "tablet" ? "bg-blue-600 text-white" : "text-white/60"
                        }`}
                      >
                        <Tablet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("mobile")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          previewDevice === "mobile" ? "bg-blue-600 text-white" : "text-white/60"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Render Live Hero Simulation */}
                  <div className={`mx-auto bg-white rounded-2xl p-6 border border-white/20 transition-all ${
                    previewDevice === "mobile" ? "max-w-xs" : previewDevice === "tablet" ? "max-w-2xl" : "w-full"
                  }`}>
                    {/* Breadcrumbs Preview */}
                    <div className="text-[10px] text-neutral-500 font-medium mb-3 select-none">
                      Home / Shop by Brand / {activeDepartment.name} / <span className="text-black font-bold">{formData.name}</span>
                    </div>

                    <DepartmentBrandHero
                      config={activePageConfig}
                      brand={{
                        id: editingBrand?.id || "temp",
                        name: formData.name || "Brand Name",
                        slug: formData.slug || "brand",
                        logo_url: formData.logo_url || "",
                        status: "active",
                      }}
                      department={activeDepartment}
                    />

                    {/* Underline Category Tabs Preview */}
                    <div className="flex items-center gap-4 border-b border-neutral-200 mb-4 pb-2 text-xs font-semibold text-neutral-600">
                      <span className="text-black font-extrabold border-b-2 border-red-600 pb-2 -mb-2.5">
                        All {activeDepartment.name}
                      </span>
                      <span>Featured Lineup</span>
                      <span>Accessories</span>
                    </div>

                    {/* Section Headings Preview */}
                    <div className="mt-4">
                      <h3 className="text-base font-extrabold text-neutral-900">
                        {activePageConfig.productSectionHeading || `${formData.name} ${activeDepartment.name}`}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {activePageConfig.productSectionDescription || `Explore genuine ${formData.name} ${activeDepartment.name.toLowerCase()} available at 1PLACE.LK.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div
                className={`flex items-center justify-between pt-4 border-t shrink-0 ${
                  isLight ? "border-slate-100" : "border-white/[0.08]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`px-4 py-2 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                      isLight
                        ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Close
                  </button>
                  {hasUnsavedChanges && (
                    <span className="text-amber-400 text-xs font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Unsaved changes
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {saveSuccess && (
                    <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved successfully!
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving..." : "Save Brand & Pages"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
