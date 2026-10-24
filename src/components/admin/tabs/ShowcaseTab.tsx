"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Save,
  Check,
  Smartphone,
  Monitor,
  Upload,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sun,
  Moon,
  Palette,
  Maximize2,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, Category, VisualShowcaseSettings, VisualShowcaseSlide, ShowcasePlacement } from "@/lib/types";
import { DEFAULT_SHOWCASE_SETTINGS } from "@/lib/data";
import { uploadImageWithFallback } from "@/lib/upload-utils";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

interface ShowcaseTabProps {
  products: Product[];
  categories: Category[];
  initialSettings?: VisualShowcaseSettings | null;
  onRefresh?: () => void;
}

const PLACEMENT_OPTIONS: { value: ShowcasePlacement; label: string; icon: string }[] = [
  // ── Product Catalogue Line Placements (Row by Row) ──
  { value: "below_product_line_1", label: 'Below Product Line 1 (After 1st Row)', icon: "🛍️" },
  { value: "below_product_line_2", label: 'Below Product Line 2 (After 2nd Row)', icon: "🛍️" },
  { value: "below_product_line_3", label: 'Below Product Line 3 (After 3rd Row)', icon: "🛍️" },
  { value: "below_product_line_4", label: 'Below Product Line 4 (After 4th Row)', icon: "🛍️" },
  { value: "below_product_line_5", label: 'Below Product Line 5 (After 5th Row)', icon: "🛍️" },
  { value: "below_product_line_6", label: 'Below Product Line 6 (After 6th Row)', icon: "🛍️" },
  { value: "below_product_line_8", label: 'Below Product Line 8 (After 8th Row)', icon: "🛍️" },
  { value: "below_product_line_10", label: 'Below Product Line 10 (After 10th Row)', icon: "🛍️" },
  { value: "custom_product_line", label: 'Custom Product Line (Specify Row Number)', icon: "🔢" },

  // ── Homepage Section Placements ──
  { value: "below_category", label: 'Below "Shop by Category"', icon: "📱" },
  { value: "above_brand", label: 'Above "Shop by Brand"', icon: "🏷️" },
  { value: "below_brand", label: 'Below "Shop by Brand"', icon: "🏷️" },
  { value: "below_gallery", label: 'Below "Life at 1PLACE.LK" (Gallery)', icon: "📸" },
  { value: "below_reviews", label: 'Below "Reviews from Google"', icon: "⭐" },
  { value: "above_why_choose", label: 'Above "Why Choose 1PLACE.LK"', icon: "🛡️" },
  { value: "below_why_choose", label: 'Below "Why Choose 1PLACE.LK"', icon: "🛡️" },
  { value: "below_hero", label: "Below Hero Banner Slider", icon: "🌟" },
  { value: "below_new_arrivals", label: 'Below "New Arrivals"', icon: "🚀" },
  { value: "below_featured_phones", label: 'Below "Featured Mobile Phones"', icon: "📱" },
  { value: "below_featured_accessories", label: 'Below "Featured Accessories"', icon: "🎧" },
  { value: "above_location", label: "Above Store Location & Footer", icon: "📍" },
];

function getPlacementDisplay(placement?: ShowcasePlacement, product_line?: number) {
  if (placement === "custom_product_line" || (placement && placement.startsWith("below_product_line_"))) {
    const lineNum = product_line ?? (placement.startsWith("below_product_line_") ? parseInt(placement.replace("below_product_line_", ""), 10) : 2);
    return `🛍️ Below Product Line ${lineNum} (Row ${lineNum})`;
  }
  const opt = PLACEMENT_OPTIONS.find((p) => p.value === (placement || "below_category"));
  return opt ? `${opt.icon} ${opt.label}` : '📱 Below "Shop by Category"';
}

export default function ShowcaseTab({
  products = [],
  categories = [],
  initialSettings,
  onRefresh,
}: ShowcaseTabProps) {
  const { isLight } = useAdminTheme();
  const [settings, setSettings] = useState<VisualShowcaseSettings>(() => {
    if (initialSettings && initialSettings.slides && initialSettings.slides.length > 0) {
      return initialSettings;
    }
    return DEFAULT_SHOWCASE_SETTINGS;
  });

  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(null);

  // Sync settings when initialSettings changes
  useEffect(() => {
    if (initialSettings && initialSettings.slides && initialSettings.slides.length > 0) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // Load from Firestore on mount if not provided
  useEffect(() => {
    async function fetchShowcaseSettings() {
      try {
        const snap = await getDoc(doc(db, "settings", "visual_product_showcase"));
        if (snap.exists()) {
          const data = snap.data() as VisualShowcaseSettings;
          if (data && data.slides && data.slides.length > 0) {
            setSettings(data);
          }
        }
      } catch (err) {
        console.warn("Could not fetch showcase settings:", err);
      }
    }
    if (!initialSettings) {
      fetchShowcaseSettings();
    }
  }, [initialSettings]);

  const slides = settings.slides || DEFAULT_SHOWCASE_SETTINGS.slides || [];

  // Save Settings to Firestore
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: VisualShowcaseSettings = {
        ...settings,
        slides: slides.map((s, idx) => ({
          ...s,
          placement: s.placement || settings.placement || "below_category",
          order: idx + 1,
        })),
        updated_at: new Date().toISOString(),
      };
      await setDoc(doc(db, "settings", "visual_product_showcase"), payload, { merge: true });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to save showcase settings:", err);
      alert("Failed to save showcase settings. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  // Reset to Factory Default Settings
  const handleResetDefaults = () => {
    if (confirm("Reset all showcase slides to the original factory default showcase?")) {
      setSettings(DEFAULT_SHOWCASE_SETTINGS);
      setActiveSlideIndex(0);
    }
  };

  // Add New Slide
  const handleAddSlide = () => {
    const newSlide: VisualShowcaseSlide = {
      id: `slide-${Date.now()}`,
      enabled: true,
      eyebrow: "NEW",
      eyebrow_bg: "#FFFFFF",
      eyebrow_color: "#000000",
      title: "Galaxy S26 Ultra",
      subtitle: "",
      desktop_image: "",
      bg_type: "image",
      bg_image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1600&auto=format&fit=crop",
      bg_image_mobile: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop",
      bg_overlay_opacity: 20,
      bg_overlay_color: "#000000",
      text_align: "center",
      content_position: "center",
      heading_color: "#FFFFFF",
      subtitle_color: "#E5E5E5",
      primary_cta_text: "Explore",
      primary_cta_url: "/products",
      secondary_cta_text: "Buy Now",
      secondary_cta_url: "/products",
      show_secondary_cta: true,
      placement: "below_product_line_2",
      product_line: 2,
      banner_size_ratio: "1024x387",
      banner_size_ratio_mobile: "1024x387",
      order: slides.length + 1,
    };

    setSettings((prev) => ({
      ...prev,
      slides: [...(prev.slides || []), newSlide],
    }));
    setActiveSlideIndex(slides.length);
  };

  // Delete Slide
  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      alert("You must keep at least 1 showcase slide.");
      return;
    }
    if (confirm(`Delete slide #${index + 1} (${slides[index]?.title || "Slide"})?`)) {
      setSettings((prev) => {
        const nextSlides = (prev.slides || []).filter((_, i) => i !== index);
        return { ...prev, slides: nextSlides };
      });
      setActiveSlideIndex(Math.max(0, index - 1));
    }
  };

  // Update a specific slide field
  const updateSlide = (index: number, updates: Partial<VisualShowcaseSlide>) => {
    setSettings((prev) => {
      const nextSlides = [...(prev.slides || [])];
      nextSlides[index] = { ...nextSlides[index], ...updates };
      return { ...prev, slides: nextSlides };
    });
  };

  // Reorder Slides
  const moveSlide = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;

    setSettings((prev) => {
      const nextSlides = [...(prev.slides || [])];
      const temp = nextSlides[index];
      nextSlides[index] = nextSlides[targetIdx];
      nextSlides[targetIdx] = temp;
      return { ...prev, slides: nextSlides };
    });
    setActiveSlideIndex(targetIdx);
  };

  // Image Upload Handler (Supports Background Image, Mobile Background, Desktop Foreground, Mobile Foreground)
  const handleImageUpload = async (
    index: number,
    file: File,
    type: "background" | "background_mobile" | "desktop" | "mobile"
  ) => {
    const key = `${index}-${type}`;
    try {
      setUploadingImageKey(key);
      const uploadedUrl = await uploadImageWithFallback(file, "showcase");
      if (uploadedUrl) {
        if (type === "background") {
          updateSlide(index, { bg_image: uploadedUrl, bg_type: "image" });
        } else if (type === "background_mobile") {
          updateSlide(index, { bg_image_mobile: uploadedUrl, bg_type: "image" });
        } else if (type === "desktop") {
          updateSlide(index, { desktop_image: uploadedUrl });
        } else {
          updateSlide(index, { mobile_image: uploadedUrl });
        }
      }
    } catch (err) {
      console.error("Error uploading showcase image:", err);
      alert("Failed to upload image.");
    } finally {
      setUploadingImageKey(null);
    }
  };

  // Autofill from Product Selector
  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId || p.slug === productId);
    if (!prod) return;

    updateSlide(index, {
      title: prod.name,
      subtitle: prod.description ? prod.description.slice(0, 60) + "..." : "Authentic quality with official warranty.",
      desktop_image: prod.images?.[0] || "",
      primary_cta_url: `/products/${prod.slug}`,
      secondary_cta_url: `/products/${prod.slug}`,
      product_id: prod.id,
    });
  };

  // Autofill from Category Selector
  const handleSelectCategory = (index: number, categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId || c.slug === categoryId);
    if (!cat) return;

    updateSlide(index, {
      title: cat.name,
      subtitle: cat.description || `Browse original ${cat.name} with official warranty.`,
      desktop_image: cat.image_url || "",
      primary_cta_url: `/products?category=${cat.slug || cat.id}`,
      secondary_cta_url: `/products?category=${cat.slug || cat.id}`,
      category_id: cat.id,
    });
  };

  const previewSlide = slides[activeSlideIndex] || slides[0];

  // Preview header contents check
  const prevIsImageBg = previewSlide?.bg_type === "image" && Boolean(previewSlide?.bg_image);
  const prevBgImageUrl =
    previewDevice === "mobile" && previewSlide?.bg_image_mobile
      ? previewSlide.bg_image_mobile
      : previewSlide?.bg_image || "";
  const prevOverlayOpacity = (previewSlide?.bg_overlay_opacity ?? (prevIsImageBg ? 20 : 0)) / 100;
  const prevOverlayColor = previewSlide?.bg_overlay_color || "#000000";

  const prevHasEyebrow = Boolean(previewSlide?.eyebrow && previewSlide.eyebrow.trim().length > 0);
  const prevHasTitle = Boolean(previewSlide?.title && previewSlide.title.trim().length > 0);
  const prevHasSubtitle = Boolean(previewSlide?.subtitle && previewSlide.subtitle.trim().length > 0);
  const prevHasPrimaryCta = Boolean(previewSlide?.primary_cta_text && previewSlide.primary_cta_text.trim().length > 0);
  const prevHasSecondaryCta = Boolean(
    previewSlide?.show_secondary_cta !== false &&
    previewSlide?.secondary_cta_text &&
    previewSlide.secondary_cta_text.trim().length > 0
  );
  const prevHasButtons = prevHasPrimaryCta || prevHasSecondaryCta;
  const prevHasHeader = prevHasEyebrow || prevHasTitle || prevHasSubtitle || prevHasButtons;
  const prevHasForeground = Boolean(
    previewSlide?.desktop_image && previewSlide.desktop_image.trim().length > 0
  );

  const prevTextAlign = previewSlide?.text_align || "center";
  const prevAlignClass =
    prevTextAlign === "left"
      ? "text-left items-start"
      : prevTextAlign === "right"
      ? "text-right items-end"
      : "text-center items-center";

  const prevButtonsJustify =
    prevTextAlign === "left"
      ? "justify-start"
      : prevTextAlign === "right"
      ? "justify-end"
      : "justify-center";

  return (
    <div className="space-y-8">
      {/* ── Top Header & Global Toggle Bar ── */}
      <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        <div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${isLight ? "bg-blue-50 text-blue-600" : "bg-blue-500/10 text-blue-400"} flex items-center justify-center font-bold`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                Featured Visual Showcase
              </h1>
              <p className={`text-xs sm:text-sm font-normal ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Create and position full-width cinematic showcase banners with background images &amp; text overlay across your homepage.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Section Visibility Switch */}
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border cursor-pointer ${
              settings.enabled
                ? isLight
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : isLight
                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                  : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                settings.enabled ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            {settings.enabled ? "Showcase: ACTIVE" : "Showcase: HIDDEN"}
          </button>

          {/* Auto-Slide Toggle */}
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, auto_slide: !prev.auto_slide }))}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
              settings.auto_slide !== false
                ? isLight
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                : isLight
                  ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  : "bg-white/5 text-white/40 border-white/10"
            }`}
          >
            {settings.auto_slide !== false ? "Auto-Rotate: 6s" : "Auto-Rotate: OFF"}
          </button>

          {/* Floating Animation Global Toggle */}
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, enable_animation: prev.enable_animation === false }))}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
              settings.enable_animation !== false
                ? isLight
                  ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  : "bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20"
                : isLight
                  ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  : "bg-white/5 text-white/40 border-white/10 hover:text-white"
            }`}
          >
            {settings.enable_animation !== false ? "✨ Animation: ON" : "✨ Animation: OFF"}
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
              isLight
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
            }`}
            title="Reset to default showcase"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4" /> Changes Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Showcase
              </>
            )}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in border ${
          isLight
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>Featured Visual Showcase saved successfully and live on the homepage!</span>
        </div>
      )}

      {/* ── Main Layout: Slide Editor on Left (7 cols) + Live Preview on Right (5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Slides Manager (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Add Slide Button & Header */}
          <div className="flex items-center justify-between">
            <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              <Layers className="w-4 h-4 text-blue-500" /> Showcase Banners ({slides.length})
            </h2>
            <button
              type="button"
              onClick={handleAddSlide}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 border cursor-pointer ${
                isLight
                  ? "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs"
                  : "bg-white/10 hover:bg-white/15 text-white border-white/10"
              }`}
            >
              <Plus className="w-4 h-4" /> Add Banner
            </button>
          </div>

          {slides.map((slide, idx) => {
            const isExpanded = activeSlideIndex === idx;
            const slidePlacement = slide.placement || "below_category";

            return (
              <div
                key={slide.id || `editor-slide-${idx}`}
                className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl transition-all overflow-hidden ${
                  isExpanded
                    ? isLight ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500/40 ring-1 ring-blue-500/20"
                    : isLight ? "hover:border-slate-300" : "hover:border-white/20"
                }`}
              >
                {/* Slide Header Summary */}
                <div
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`p-5 flex items-center justify-between cursor-pointer select-none transition-colors gap-3 ${
                    isLight ? "bg-slate-50/70 hover:bg-slate-50" : "bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                      isLight ? "bg-slate-200 text-slate-800" : "bg-white/10 text-white"
                    }`}>
                      #{idx + 1}
                    </span>
                    <div className="truncate space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-bold text-sm truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                          {slide.title || `Banner #${idx + 1} (${slide.bg_type === "image" ? "Full Background Image" : "Showcase"})`}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            slide.enabled !== false
                              ? isLight ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isLight ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {slide.enabled !== false ? "Active" : "Disabled"}
                        </span>
                        {/* Placement Tag Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border truncate max-w-[200px] ${
                          isLight ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        }`}>
                          {getPlacementDisplay(slidePlacement, slide.product_line)}
                        </span>
                        {slide.bg_type === "image" && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                          }`}>
                            🖼️ Full BG Image
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        {slide.primary_cta_url ? `Links to: ${slide.primary_cta_url}` : "Links to: /products"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Reorder Buttons */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSlide(idx, "up");
                      }}
                      disabled={idx === 0}
                      className={`p-1.5 rounded-lg disabled:opacity-20 cursor-pointer ${
                        isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSlide(idx, "down");
                      }}
                      disabled={idx === slides.length - 1}
                      className={`p-1.5 rounded-lg disabled:opacity-20 cursor-pointer ${
                        isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Slide Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(idx);
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors ml-1 cursor-pointer"
                      title="Delete Slide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Slide Expanded Editor Body ── */}
                {isExpanded && (
                  <div className="p-6 border-t border-white/10 space-y-6 bg-white/[0.01]">
                    {/* 1. Placement & Active Status */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                            Homepage Placement Position
                          </label>
                          <p className="text-[11px] text-white/50">
                            Choose where on the homepage or after which product line this showcase banner is displayed.
                          </p>
                        </div>

                        <select
                          value={slide.placement || "below_category"}
                          onChange={(e) => {
                            const val = e.target.value as ShowcasePlacement;
                            let lineNum: number | undefined = slide.product_line;
                            if (val.startsWith("below_product_line_")) {
                              lineNum = parseInt(val.replace("below_product_line_", ""), 10);
                            }
                            updateSlide(idx, { placement: val, product_line: lineNum });
                          }}
                          className="bg-[#1E293B] border border-blue-500/40 text-amber-300 px-3 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        >
                          {PLACEMENT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom / Configurable Product Line Row Input */}
                      {(slide.placement === "custom_product_line" || slide.placement?.startsWith("below_product_line_")) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 shrink-0">
                              🔢 Product Grid Row / Line Number:
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={
                                slide.product_line ??
                                (slide.placement?.startsWith("below_product_line_")
                                  ? parseInt(slide.placement.replace("below_product_line_", ""), 10)
                                  : 2)
                              }
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                updateSlide(idx, {
                                  product_line: val,
                                  placement: "custom_product_line",
                                });
                              }}
                              className="w-20 px-2.5 py-1 rounded-lg bg-[#0F172A] border border-amber-500/50 text-white text-xs font-extrabold text-center focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                          </div>
                          <span className="text-[11px] text-white/70">
                            Banner will be placed after row #{slide.product_line ?? 2} (e.g. after {((slide.product_line ?? 2) * 2)} cards on mobile, {((slide.product_line ?? 2) * 6)} cards on desktop)
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-xs text-white/70 font-semibold">Slide Active Status</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateSlide(idx, { enabled: slide.enabled === false })}
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                              slide.enabled !== false
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {slide.enabled !== false ? "ACTIVE" : "DISABLED"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateSlide(idx, {
                                enable_animation: slide.enable_animation === false,
                              })
                            }
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                              slide.enable_animation !== false
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-white/10 text-white/40 border border-white/10"
                            }`}
                          >
                            {slide.enable_animation !== false ? "ANIMATION ON" : "ANIMATION OFF"}
                          </button>
                        </div>
                      </div>

                      {/* Quick Store Autofill */}
                      <div className="flex items-center gap-2 pt-1">
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleSelectProduct(idx, e.target.value);
                          }}
                          defaultValue=""
                          className="bg-[#1E293B] border border-white/10 px-2.5 py-1.5 rounded-xl text-white outline-none text-[11px] cursor-pointer"
                        >
                          <option value="" disabled>
                            Autofill from Product...
                          </option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>

                        <select
                          onChange={(e) => {
                            if (e.target.value) handleSelectCategory(idx, e.target.value);
                          }}
                          defaultValue=""
                          className="bg-[#1E293B] border border-white/10 px-2.5 py-1.5 rounded-xl text-white outline-none text-[11px] cursor-pointer"
                        >
                          <option value="" disabled>
                            Autofill from Category...
                          </option>
                          {categories.map((c) => (
                            <option key={c.id || c.slug} value={c.id || c.slug}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* ── BANNER SIZE / ASPECT RATIO SELECTOR (DESKTOP & MOBILE INDEPENDENT) ── */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                      {/* 1. Desktop Ratio */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white/90 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Monitor className="w-4 h-4 text-purple-400" /> 🖥️ Desktop Banner Size &amp; Ratio
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">
                            {slide.banner_size_ratio || "default"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {[
                            { id: "1024x387", label: "1024 × 387", badge: "~2.6:1 Showcase", desc: "Flagship Banner (Reference Size)" },
                            { id: "default", label: "Default", badge: "Auto Fit", desc: "Standard ~600px" },
                            { id: "1080x1080", label: "1080 × 1080", badge: "1:1 Square", desc: "Square Box" },
                            { id: "860x270", label: "860 × 270", badge: "~3.2:1 Wide", desc: "Compact Strip" },
                            { id: "1920x850", label: "1920 × 850", badge: "~2.3:1 Wide", desc: "Cinematic Wide" },
                            { id: "1080x1440", label: "1080 × 1440", badge: "3:4 Portrait", desc: "Tall Poster" },
                          ].map((preset) => {
                            const isSelected = (slide.banner_size_ratio || "default") === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => updateSlide(idx, { banner_size_ratio: preset.id as any })}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                                  isSelected
                                    ? "bg-purple-600/20 border-purple-500 text-white shadow-md ring-1 ring-purple-500"
                                    : "bg-black/30 border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-xs text-white">{preset.label}</span>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isSelected ? "bg-purple-500 text-white" : "bg-white/10 text-white/50"}`}>
                                    {preset.badge}
                                  </span>
                                </div>
                                <p className="text-[10px] leading-tight text-white/50 line-clamp-1">{preset.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Mobile Ratio */}
                      <div className="space-y-2 pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white/90 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-emerald-400" /> 📱 Mobile Banner Size &amp; Ratio (Independent)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                            {slide.banner_size_ratio_mobile || "default"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {[
                            { id: "1024x387", label: "1024 × 387", badge: "~2.6:1 Showcase", desc: "Flagship Banner (Reference Size)" },
                            { id: "default", label: "Auto (Match Desktop)", badge: "Auto", desc: "Responsive Flow" },
                            { id: "1080x1080", label: "1080 × 1080", badge: "1:1 Square", desc: "Mobile Square" },
                            { id: "860x270", label: "860 × 270", badge: "~3.2:1 Wide", desc: "Slim Mobile Strip" },
                            { id: "1920x850", label: "1920 × 850", badge: "~2.3:1 Wide", desc: "Wide Banner" },
                            { id: "1080x1440", label: "1080 × 1440", badge: "3:4 Story", desc: "Full Mobile Poster" },
                          ].map((preset) => {
                            const isSelected = (slide.banner_size_ratio_mobile || "default") === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => updateSlide(idx, { banner_size_ratio_mobile: preset.id as any })}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                                  isSelected
                                    ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500"
                                    : "bg-black/30 border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-xs text-white">{preset.label}</span>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isSelected ? "bg-emerald-500 text-white" : "bg-white/10 text-white/50"}`}>
                                    {preset.badge}
                                  </span>
                                </div>
                                <p className="text-[10px] leading-tight text-white/50 line-clamp-1">{preset.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 2. Background Styling (Full Background Image, Gradient, Solid Color) */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-bold text-white/90 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Palette className="w-4 h-4 text-blue-400" /> Background Mode &amp; Styling
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateSlide(idx, { bg_type: "image" })}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                              slide.bg_type === "image"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                : "bg-white/5 text-white/60 hover:text-white border border-white/10"
                            }`}
                          >
                            🖼️ Full Background Image
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSlide(idx, { bg_type: "gradient" })}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              slide.bg_type === "gradient" || (!slide.bg_type && !slide.bg_image)
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                : "bg-white/5 text-white/60 hover:text-white border border-white/10"
                            }`}
                          >
                            Subtle Gradient
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSlide(idx, { bg_type: "color" })}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              slide.bg_type === "color"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                : "bg-white/5 text-white/60 hover:text-white border border-white/10"
                            }`}
                          >
                            Solid Color
                          </button>
                        </div>
                      </div>

                      {/* FULL BACKGROUND IMAGE CONTROLS */}
                      {slide.bg_type === "image" && (
                        <div className="space-y-4 pt-2">
                          {/* ── BANNER SIZE / ASPECT RATIO SELECTOR ── */}
                          <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Maximize2 className="w-3.5 h-3.5" /> Banner Size &amp; Aspect Ratio Preset
                              </label>
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">
                                {slide.banner_size_ratio || "default"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                              {[
                                { id: "1024x387", label: "1024 × 387", badge: "~2.6:1 Showcase", desc: "Flagship Banner (Reference Size)" },
                                { id: "default", label: "Default", badge: "Auto Fit", desc: "Auto Product Flow" },
                                { id: "1080x1080", label: "1080 × 1080", badge: "1:1 Square", desc: "Square Banner" },
                                { id: "860x270", label: "860 × 270", badge: "~3.2:1 Wide", desc: "Slim Banner Strip" },
                                { id: "1920x850", label: "1920 × 850", badge: "~2.3:1 Wide", desc: "Panoramic Wide" },
                                { id: "1080x1440", label: "1080 × 1440", badge: "3:4 Portrait", desc: "Vertical Poster" },
                              ].map((preset) => {
                                const isSelected = (slide.banner_size_ratio || "default") === preset.id;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => updateSlide(idx, { banner_size_ratio: preset.id as any })}
                                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                                      isSelected
                                        ? "bg-blue-600/30 border-blue-500 text-white shadow-md ring-1 ring-blue-500"
                                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
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

                          {/* Desktop Background Image */}
                          <div className="flex items-start gap-4 p-3 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="w-24 h-20 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
                              {slide.bg_image ? (
                                <img
                                  src={slide.bg_image}
                                  alt="Background preview"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-white/20" />
                              )}
                              {uploadingImageKey === `${idx}-background` && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-2">
                              <span className="text-[11px] font-bold text-white/90">
                                Full Desktop Background Image (Required)
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-1.5 shrink-0">
                                  <Upload className="w-3.5 h-3.5" /> Upload Image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleImageUpload(idx, e.target.files[0], "background");
                                      }
                                    }}
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={slide.bg_image || ""}
                                  onChange={(e) => updateSlide(idx, { bg_image: e.target.value })}
                                  placeholder="https://images.unsplash.com/..."
                                  className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white outline-none font-mono text-[11px] focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Mobile Background Image (Optional) */}
                          <div className="flex items-start gap-4 p-3 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="w-24 h-20 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
                              {slide.bg_image_mobile ? (
                                <img
                                  src={slide.bg_image_mobile}
                                  alt="Mobile background preview"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Smartphone className="w-6 h-6 text-white/20" />
                              )}
                              {uploadingImageKey === `${idx}-background_mobile` && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-2">
                              <span className="text-[11px] font-bold text-white/80">
                                Mobile Background Image (Optional — falls back to desktop)
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shrink-0">
                                  <Upload className="w-3.5 h-3.5" /> Upload Mobile
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleImageUpload(idx, e.target.files[0], "background_mobile");
                                      }
                                    }}
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={slide.bg_image_mobile || ""}
                                  onChange={(e) => updateSlide(idx, { bg_image_mobile: e.target.value })}
                                  placeholder="Leave blank to use desktop image"
                                  className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white outline-none font-mono text-[11px]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Overlay Darkness / Dimming Slider & Tint */}
                          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-white/80">
                                Text Overlay Tint &amp; Dimming: {slide.bg_overlay_opacity ?? 25}%
                              </label>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-white/40">Presets:</span>
                                {[
                                  { label: "0% Clear", val: 0 },
                                  { label: "20% Soft", val: 20 },
                                  { label: "40% Balanced", val: 40 },
                                  { label: "60% High", val: 60 },
                                ].map((p) => (
                                  <button
                                    key={p.val}
                                    type="button"
                                    onClick={() => updateSlide(idx, { bg_overlay_opacity: p.val })}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                      (slide.bg_overlay_opacity ?? 25) === p.val
                                        ? "bg-blue-600 text-white"
                                        : "bg-white/5 text-white/60 hover:text-white"
                                    }`}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="0"
                                max="90"
                                value={slide.bg_overlay_opacity ?? 25}
                                onChange={(e) =>
                                  updateSlide(idx, { bg_overlay_opacity: Number(e.target.value) })
                                }
                                className="w-full accent-blue-500 cursor-pointer"
                              />

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-white/50">Tint:</span>
                                <input
                                  type="color"
                                  value={slide.bg_overlay_color || "#000000"}
                                  onChange={(e) =>
                                    updateSlide(idx, { bg_overlay_color: e.target.value })
                                  }
                                  className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border border-white/20"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Text Alignment & Content Placement */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                              <label className="block text-[11px] font-bold text-white/80">
                                Text Alignment Over Banner
                              </label>
                              <div className="flex items-center gap-2">
                                {[
                                  { id: "left", label: "Left", icon: AlignLeft },
                                  { id: "center", label: "Center", icon: AlignCenter },
                                  { id: "right", label: "Right", icon: AlignRight },
                                ].map((al) => {
                                  const IconComp = al.icon;
                                  const isSel = (slide.text_align || "center") === al.id;
                                  return (
                                    <button
                                      key={al.id}
                                      type="button"
                                      onClick={() => updateSlide(idx, { text_align: al.id as any })}
                                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        isSel
                                          ? "bg-blue-600 text-white shadow-sm"
                                          : "bg-white/5 text-white/60 hover:text-white"
                                      }`}
                                    >
                                      <IconComp className="w-3.5 h-3.5" />
                                      <span>{al.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                              <label className="block text-[11px] font-bold text-white/80">
                                Vertical Content Position
                              </label>
                              <div className="flex items-center gap-2">
                                {[
                                  { id: "top", label: "Top" },
                                  { id: "center", label: "Center" },
                                  { id: "bottom", label: "Bottom" },
                                ].map((pos) => {
                                  const isSel = (slide.content_position || "center") === pos.id;
                                  return (
                                    <button
                                      key={pos.id}
                                      type="button"
                                      onClick={() =>
                                        updateSlide(idx, { content_position: pos.id as any })
                                      }
                                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                        isSel
                                          ? "bg-blue-600 text-white shadow-sm"
                                          : "bg-white/5 text-white/60 hover:text-white"
                                      }`}
                                    >
                                      <span>{pos.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SOLID COLOR CONTROLS */}
                      {slide.bg_type === "color" && (
                        <div className="flex items-center gap-3 pt-2">
                          <input
                            type="color"
                            value={slide.bg_color || "#FFFFFF"}
                            onChange={(e) => updateSlide(idx, { bg_color: e.target.value })}
                            className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-white/20 shrink-0"
                          />
                          <input
                            type="text"
                            value={slide.bg_color || "#FFFFFF"}
                            onChange={(e) => updateSlide(idx, { bg_color: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white font-mono font-bold uppercase outline-none focus:border-blue-500"
                          />
                        </div>
                      )}

                      {/* GRADIENT CONTROLS */}
                      {(slide.bg_type === "gradient" || (!slide.bg_type && !slide.bg_image)) && (
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-white/50 font-bold mb-1">
                                Gradient Top Color
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={slide.bg_gradient_from || "#F2F6FA"}
                                  onChange={(e) => updateSlide(idx, { bg_gradient_from: e.target.value })}
                                  className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-white/20 shrink-0"
                                />
                                <input
                                  type="text"
                                  value={slide.bg_gradient_from || "#F2F6FA"}
                                  onChange={(e) => updateSlide(idx, { bg_gradient_from: e.target.value })}
                                  className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white font-mono text-[11px] outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] text-white/50 font-bold mb-1">
                                Gradient Bottom Color
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={slide.bg_gradient_to || "#FFFFFF"}
                                  onChange={(e) => updateSlide(idx, { bg_gradient_to: e.target.value })}
                                  className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-white/20 shrink-0"
                                />
                                <input
                                  type="text"
                                  value={slide.bg_gradient_to || "#FFFFFF"}
                                  onChange={(e) => updateSlide(idx, { bg_gradient_to: e.target.value })}
                                  className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white font-mono text-[11px] outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Quick Presets */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-white/40 mr-1">Presets:</span>
                            {[
                              { name: "Ice Blue", from: "#F2F6FA", to: "#FFFFFF" },
                              { name: "Titanium Warm", from: "#FAF6F2", to: "#FFFFFF" },
                              { name: "Dark Midnight", from: "#0F172A", to: "#020617" },
                              { name: "Soft Grey", from: "#F5F5F7", to: "#FFFFFF" },
                              { name: "Pure White", from: "#FFFFFF", to: "#FFFFFF" },
                            ].map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() =>
                                  updateSlide(idx, {
                                    bg_type: "gradient",
                                    bg_gradient_from: preset.from,
                                    bg_gradient_to: preset.to,
                                  })
                                }
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-white/70 font-semibold transition-colors cursor-pointer"
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Text Overlay & Typography (Badge, Heading, Subtitle) */}
                    <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-white/90 text-xs uppercase tracking-wider">
                          Text Overlay Over Banner
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-white/40">Text Tone:</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateSlide(idx, {
                                heading_color: "#FFFFFF",
                                subtitle_color: "#E5E5E5",
                              })
                            }
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Moon className="w-3 h-3" /> Light Text
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSlide(idx, {
                                heading_color: "#1D1D1F",
                                subtitle_color: "#6E6E73",
                              })
                            }
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Sun className="w-3 h-3" /> Dark Text
                          </button>
                        </div>
                      </div>

                      {/* Eyebrow / Campaign Tag */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Eyebrow / Campaign Badge Tag <span className="text-white/40 font-normal normal-case">(e.g. "New", "Galaxy AI", "Special Deal")</span>
                          </label>
                          <input
                            type="text"
                            value={slide.eyebrow ?? "New"}
                            onChange={(e) => updateSlide(idx, { eyebrow: e.target.value })}
                            placeholder="e.g. New (leave blank to hide)"
                            className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white text-xs outline-none focus:border-blue-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Badge Colors
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={slide.eyebrow_bg || "#000000"}
                                onChange={(e) => updateSlide(idx, { eyebrow_bg: e.target.value })}
                                className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border border-white/20"
                                title="Badge Background Color"
                              />
                              <span className="text-[9px] text-white/40">BG</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={slide.eyebrow_color || "#FFFFFF"}
                                onChange={(e) => updateSlide(idx, { eyebrow_color: e.target.value })}
                                className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border border-white/20"
                                title="Badge Text Color"
                              />
                              <span className="text-[9px] text-white/40">Text</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Product Heading & Color */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Main Heading Title <span className="text-white/40 font-normal normal-case">(e.g. "Galaxy S26 Ultra")</span>
                          </label>
                          <input
                            type="text"
                            value={slide.title || ""}
                            onChange={(e) => updateSlide(idx, { title: e.target.value })}
                            placeholder="e.g. Galaxy S26 Ultra (leave blank for clean graphic banner)"
                            className="w-full bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl text-white font-bold outline-none focus:border-blue-500 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Heading Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={slide.heading_color || (slide.bg_type === "image" ? "#FFFFFF" : "#1D1D1F")}
                              onChange={(e) => updateSlide(idx, { heading_color: e.target.value })}
                              className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-white/20 shrink-0"
                            />
                            <input
                              type="text"
                              value={slide.heading_color || (slide.bg_type === "image" ? "#FFFFFF" : "#1D1D1F")}
                              onChange={(e) => updateSlide(idx, { heading_color: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 px-2 py-1.5 rounded-xl text-white font-mono text-[11px] uppercase outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Subtitle & Color */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Subtitle / Description Overlay <span className="text-white/40 font-normal normal-case">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={slide.subtitle || ""}
                            onChange={(e) => updateSlide(idx, { subtitle: e.target.value })}
                            placeholder="e.g. Power. Precision. Ultra Redefined."
                            className="w-full bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Subtitle Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={slide.subtitle_color || (slide.bg_type === "image" ? "#E5E5E5" : "#6E6E73")}
                              onChange={(e) => updateSlide(idx, { subtitle_color: e.target.value })}
                              className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-white/20 shrink-0"
                            />
                            <input
                              type="text"
                              value={slide.subtitle_color || (slide.bg_type === "image" ? "#E5E5E5" : "#6E6E73")}
                              onChange={(e) => updateSlide(idx, { subtitle_color: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 px-2 py-1.5 rounded-xl text-white font-mono text-[11px] uppercase outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Foreground Product Image (Transparent Cutout — Optional when using Full Background Image) */}
                    <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-white/80 text-xs uppercase tracking-wider">
                          Foreground Product Image (Transparent PNG / Cutout)
                        </label>
                        <span className="text-[10px] text-white/40 font-normal">
                          {slide.bg_type === "image" ? "Optional if graphics are in background" : "Recommended PNG"}
                        </span>
                      </div>

                      {/* Desktop Image */}
                      <div className="flex items-start gap-4 p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
                          {slide.desktop_image ? (
                            <img
                              src={slide.desktop_image}
                              alt="Desktop cutout"
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-white/20" />
                          )}
                          {uploadingImageKey === `${idx}-desktop` && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 text-white animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <span className="text-[11px] font-bold text-white/80">Desktop Product Cutout</span>
                          <div className="flex items-center gap-2">
                            <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-1.5 shrink-0">
                              <Upload className="w-3.5 h-3.5" /> Upload Cutout
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleImageUpload(idx, e.target.files[0], "desktop");
                                  }
                                }}
                              />
                            </label>
                            <input
                              type="text"
                              value={slide.desktop_image || ""}
                              onChange={(e) => updateSlide(idx, { desktop_image: e.target.value })}
                              placeholder="Leave blank if whole design is inside background image"
                              className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white outline-none font-mono text-[11px]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mobile Foreground Image */}
                      <div className="flex items-start gap-4 p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
                          {slide.mobile_image ? (
                            <img
                              src={slide.mobile_image}
                              alt="Mobile cutout"
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Smartphone className="w-6 h-6 text-white/20" />
                          )}
                          {uploadingImageKey === `${idx}-mobile` && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 text-white animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <span className="text-[11px] font-bold text-white/80">
                            Mobile Product Cutout (Optional)
                          </span>
                          <div className="flex items-center gap-2">
                            <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shrink-0">
                              <Upload className="w-3.5 h-3.5" /> Upload Mobile
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleImageUpload(idx, e.target.files[0], "mobile");
                                  }
                                }}
                              />
                            </label>
                            <input
                              type="text"
                              value={slide.mobile_image || ""}
                              onChange={(e) => updateSlide(idx, { mobile_image: e.target.value })}
                              placeholder="Leave blank to use desktop image"
                              className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white outline-none font-mono text-[11px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5. Destination URL & Action Buttons Configuration */}
                    <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <label className="block font-bold text-white/90 text-xs uppercase tracking-wider">
                        Destination Link &amp; CTA Buttons
                      </label>

                      {/* Primary CTA (Target Product URL) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                        <div>
                          <label className="block text-[10px] text-white/70 font-bold mb-1 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3 text-blue-400" />
                            Banner Click Destination URL
                          </label>
                          <input
                            type="text"
                            value={slide.primary_cta_url || ""}
                            onChange={(e) => updateSlide(idx, { primary_cta_url: e.target.value })}
                            placeholder="/products/samsung-s26-ultra or /products"
                            className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white font-mono outline-none focus:border-blue-500 text-[11px]"
                          />
                          <p className="text-[10px] text-white/40 mt-1">
                            Clicking the banner navigates to this URL.
                          </p>
                        </div>

                        <div>
                          <label className="block text-[10px] text-white/50 font-bold mb-1">
                            Primary CTA Button Label (Optional)
                          </label>
                          <input
                            type="text"
                            value={slide.primary_cta_text || ""}
                            onChange={(e) => updateSlide(idx, { primary_cta_text: e.target.value })}
                            placeholder="e.g. Explore (or leave blank)"
                            className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white font-bold outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Secondary CTA (Outlined Button) */}
                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white/80 text-xs">Secondary CTA (Outlined Button)</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateSlide(idx, { show_secondary_cta: slide.show_secondary_cta === false })
                            }
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                              slide.show_secondary_cta !== false
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-white/10 text-white/40"
                            }`}
                          >
                            {slide.show_secondary_cta !== false ? "ENABLED" : "DISABLED"}
                          </button>
                        </div>

                        {slide.show_secondary_cta !== false && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="block text-[10px] text-white/50 font-bold mb-1">
                                Secondary CTA Label
                              </label>
                              <input
                                type="text"
                                value={slide.secondary_cta_text || ""}
                                onChange={(e) => updateSlide(idx, { secondary_cta_text: e.target.value })}
                                placeholder="Buy Now"
                                className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-white/50 font-bold mb-1">
                                Secondary CTA URL
                              </label>
                              <input
                                type="text"
                                value={slide.secondary_cta_url || ""}
                                onChange={(e) => updateSlide(idx, { secondary_cta_url: e.target.value })}
                                placeholder="/products/..."
                                className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white font-mono outline-none focus:border-blue-500 text-[11px]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Real-Time Interactive Live Preview (Col 5) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl p-5 space-y-4`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? "border-slate-200" : "border-white/10"}`}>
              <div className="flex items-center gap-2">
                <Eye className={`w-4 h-4 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
                <h3 className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Live Showcase Preview</h3>
              </div>

              {/* Viewport Switcher */}
              <div className={`flex items-center p-1 rounded-xl border ${isLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewDevice === "desktop" ? "bg-[#2563EB] text-white shadow-xs" : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewDevice === "mobile" ? "bg-[#2563EB] text-white shadow-xs" : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
              </div>
            </div>

            {/* Position and Animation indicator badges in preview */}
            {previewSlide && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-white/50 text-[11px]">Position:</span>
                  <span className="font-bold text-amber-300 text-[11px] truncate">
                    {getPlacementDisplay(previewSlide.placement, previewSlide.product_line)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {prevIsImageBg && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      BG IMAGE
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                      previewSlide.enable_animation !== false && settings.enable_animation !== false
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : "bg-white/10 text-white/40"
                    }`}
                  >
                    {previewSlide.enable_animation !== false && settings.enable_animation !== false
                      ? "✨ ANIMATION ON"
                      : "ANIMATION OFF"}
                  </span>
                </div>
              </div>
            )}

            {/* Preview Frame */}
            <div
              className={`rounded-2xl overflow-hidden border border-white/10 mx-auto transition-all shadow-inner relative ${
                previewDevice === "desktop" ? "w-full" : "max-w-xs"
              }`}
            >
              {previewSlide ? (
                <div
                  style={
                    prevIsImageBg
                      ? { backgroundColor: "#0A0A0A" }
                      : previewSlide.bg_type === "color" && previewSlide.bg_color
                      ? { backgroundColor: previewSlide.bg_color }
                      : {
                          background: `linear-gradient(180deg, ${
                            previewSlide.bg_gradient_from || "#F2F6FA"
                          } 0%, ${previewSlide.bg_gradient_to || "#FFFFFF"} 100%)`,
                        }
                  }
                  className={`p-4 sm:p-5 pb-0 flex flex-col ${
                    prevHasForeground ? "justify-between" : "justify-center py-8"
                  } items-center select-none ${
                    (previewDevice === "mobile"
                      ? previewSlide.banner_size_ratio_mobile || previewSlide.banner_size_ratio
                      : previewSlide.banner_size_ratio) === "1024x387" ||
                    (previewDevice === "mobile"
                      ? previewSlide.banner_size_ratio_mobile || previewSlide.banner_size_ratio
                      : previewSlide.banner_size_ratio) === "widescreen"
                      ? "aspect-[1024/387] min-h-[190px]"
                      : (previewDevice === "mobile"
                          ? previewSlide.banner_size_ratio_mobile || previewSlide.banner_size_ratio
                          : previewSlide.banner_size_ratio) === "860x270"
                      ? "aspect-[860/270] min-h-[160px]"
                      : (previewDevice === "mobile"
                          ? previewSlide.banner_size_ratio_mobile || previewSlide.banner_size_ratio
                          : previewSlide.banner_size_ratio) === "1080x1080"
                      ? "aspect-square min-h-[300px]"
                      : "min-h-[420px] sm:min-h-[460px]"
                  } relative overflow-hidden`}
                >
                  {/* Full Background Image in Preview */}
                  {prevIsImageBg && prevBgImageUrl && (
                    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
                      <img
                        src={prevBgImageUrl}
                        alt="Preview background"
                        className="w-full h-full object-cover"
                      />
                      {prevOverlayOpacity > 0 && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundColor: prevOverlayColor,
                            opacity: prevOverlayOpacity,
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Top / Overlaid Text Block */}
                  {prevHasHeader && (
                    <div className={`space-y-1.5 z-10 mb-1 w-full flex flex-col ${prevAlignClass}`}>
                      {/* Eyebrow Badge */}
                      {prevHasEyebrow && (
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-0.5 shadow-sm"
                          style={{
                            backgroundColor: previewSlide.eyebrow_bg || "#000000",
                            color: previewSlide.eyebrow_color || "#FFFFFF",
                          }}
                        >
                          {previewSlide.eyebrow}
                        </span>
                      )}

                      {/* Main Title */}
                      {prevHasTitle && (
                        <h4
                          className="font-bold text-xl sm:text-2xl tracking-tight leading-tight"
                          style={{
                            color:
                              previewSlide.heading_color ||
                              (prevIsImageBg ? "#FFFFFF" : "#1D1D1F"),
                          }}
                        >
                          {previewSlide.title}
                        </h4>
                      )}

                      {/* Subtitle */}
                      {prevHasSubtitle && (
                        <p
                          className="text-xs sm:text-sm font-normal max-w-xs"
                          style={{
                            color:
                              previewSlide.subtitle_color ||
                              (prevIsImageBg ? "#E5E5E5" : "#6E6E73"),
                          }}
                        >
                          {previewSlide.subtitle}
                        </p>
                      )}

                      {/* CTA Buttons */}
                      {prevHasButtons && (
                        <div className={`flex items-center gap-2 pt-1.5 ${prevButtonsJustify}`}>
                          {prevHasPrimaryCta && (
                            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-neutral-900 text-white shadow-sm">
                              {previewSlide.primary_cta_text}
                            </span>
                          )}
                          {prevHasSecondaryCta && (
                            <span
                              className="px-4 py-1.5 rounded-full text-xs font-medium border border-current/30 backdrop-blur-xs bg-white/20"
                              style={{
                                color:
                                  previewSlide.heading_color ||
                                  (prevIsImageBg ? "#FFFFFF" : "#1D1D1F"),
                              }}
                            >
                              {previewSlide.secondary_cta_text}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Product Cutout Image (Rendered only if provided) */}
                  {prevHasForeground && (
                    <div className="relative w-full flex-1 flex items-end justify-center mt-1 pb-0 overflow-visible z-10">
                      <img
                        src={
                          previewDevice === "mobile" && previewSlide.mobile_image
                            ? previewSlide.mobile_image
                            : previewSlide.desktop_image
                        }
                        alt="preview"
                        className={`w-auto h-auto max-w-[98%] ${
                          prevHasHeader ? "max-h-[280px] sm:max-h-[320px]" : "max-h-[340px] sm:max-h-[380px]"
                        } object-contain object-bottom block drop-shadow-[0_15px_25px_rgba(0,0,0,0.15)]`}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-10 text-center text-neutral-400 text-xs">No active slide to preview</div>
              )}
            </div>

            {/* Slide Switcher Indicator in Preview */}
            {slides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSlideIndex(i)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activeSlideIndex === i ? "w-6 bg-blue-500" : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}

            <p className="text-[11px] text-white/40 text-center font-medium">
              Live representation of Banner #{activeSlideIndex + 1} ({getPlacementDisplay(previewSlide?.placement)})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
