"use client";

import React, { useState, useEffect } from "react";
import {
  CircleCheck as Sparkles,
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
  Layers,
  X,
  Edit2,
  Calendar,
  Link as LinkIcon,
  RotateCcw,
  AlertCircle,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sun,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import {
  Product,
  Category,
  Brand,
  FeaturedCollectionsSettings,
  FeaturedCollectionCard,
} from "@/lib/types";
import { DEFAULT_FEATURED_COLLECTIONS } from "@/lib/data";
import { uploadImageWithFallback } from "@/lib/upload-utils";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

interface FeaturedCollectionsTabProps {
  products?: Product[];
  categories?: Category[];
  brands?: Brand[];
  initialSettings?: FeaturedCollectionsSettings | null;
  onRefresh?: () => void;
}

const FOCAL_POSITIONS = [
  { label: "Center", value: "center" },
  { label: "Top Center", value: "top center" },
  { label: "Bottom Center", value: "bottom center" },
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
  { label: "Top Left", value: "top left" },
  { label: "Top Right", value: "top right" },
  { label: "Bottom Left", value: "bottom left" },
  { label: "Bottom Right", value: "bottom right" },
  { label: "Custom", value: "custom" },
];

function isDarkTextTheme(card: FeaturedCollectionCard): boolean {
  if (card.text_color === "black" || card.text_color === "dark") return true;
  if (card.text_color === "white" || card.text_color === "light") return false;
  return card.theme === "light";
}

function resolveDestinationUrl(card: FeaturedCollectionCard, defaultUrl = "/products"): string {
  if (card.card_link_url && card.card_link_url.trim()) return card.card_link_url.trim();
  if (card.primary_cta_url && card.primary_cta_url.trim()) return card.primary_cta_url.trim();
  if (card.link_type === "category" && card.link_destination) {
    return `/products?category=${encodeURIComponent(card.link_destination)}`;
  }
  if (card.link_type === "brand" && card.link_destination) {
    return `/products?brand=${encodeURIComponent(card.link_destination)}`;
  }
  if (card.link_type === "product" && card.link_destination) {
    return `/products/${encodeURIComponent(card.link_destination)}`;
  }
  if (card.link_type === "custom" && card.link_destination) return card.link_destination;
  return defaultUrl;
}

export default function FeaturedCollectionsTab({
  products = [],
  categories = [],
  brands = [],
  initialSettings,
  onRefresh,
}: FeaturedCollectionsTabProps) {
  const { isLight } = useAdminTheme();
  const [settings, setSettings] = useState<FeaturedCollectionsSettings>(() => {
    if (initialSettings && initialSettings.cards && initialSettings.cards.length > 0) {
      return initialSettings;
    }
    return DEFAULT_FEATURED_COLLECTIONS;
  });

  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Card modal editor state
  const [editingCard, setEditingCard] = useState<FeaturedCollectionCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageSourceMode, setImageSourceMode] = useState<"url" | "upload">("url");
  const [modalImgPreviewError, setModalImgPreviewError] = useState(false);

  // Sync settings when initialSettings change
  useEffect(() => {
    if (initialSettings && initialSettings.cards && initialSettings.cards.length > 0) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // Load from Firestore on mount if initial not provided
  useEffect(() => {
    async function fetchSettings() {
      try {
        const snap = await getDoc(doc(db, "settings", "featured_collections"));
        if (snap.exists()) {
          const data = snap.data() as FeaturedCollectionsSettings;
          if (data && data.cards && data.cards.length > 0) {
            setSettings(data);
          }
        }
      } catch (err) {
        console.warn("Could not fetch featured collections settings:", err);
      }
    }
    if (!initialSettings) {
      fetchSettings();
    }
  }, [initialSettings]);

  const handleSaveToFirestore = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await setDoc(doc(db, "settings", "featured_collections"), settings);
      setSavedSuccess(true);
      if (onRefresh) onRefresh();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving featured collections:", err);
      alert("Failed to save settings. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm("Reset all Featured Collections cards to default 2x2 grid template?")) {
      setSettings(DEFAULT_FEATURED_COLLECTIONS);
    }
  };

  const handleMoveCard = (index: number, direction: "up" | "down") => {
    const newCards = [...settings.cards];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCards.length) return;

    const temp = newCards[index];
    newCards[index] = newCards[targetIndex];
    newCards[targetIndex] = temp;

    newCards.forEach((c, idx) => {
      c.sort_order = idx + 1;
    });

    setSettings({ ...settings, cards: newCards });
  };

  const handleDeleteCard = (cardId: string) => {
    if (confirm("Are you sure you want to delete this promotional banner?")) {
      const filtered = settings.cards.filter((c) => c.id !== cardId);
      filtered.forEach((c, idx) => {
        c.sort_order = idx + 1;
      });
      setSettings({ ...settings, cards: filtered });
    }
  };

  const handleToggleCardActive = (cardId: string) => {
    const updated = settings.cards.map((c) =>
      c.id === cardId ? { ...c, active: !c.active } : c
    );
    setSettings({ ...settings, cards: updated });
  };

  const handleOpenAddModal = () => {
    const newCard: FeaturedCollectionCard = {
      id: `fc-${Date.now()}`,
      eyebrow: "NEW COLLECTION",
      title: "Featured Title",
      subtitle: "Explore our latest world-class mobile devices.",
      primary_cta_text: "Shop Now",
      primary_cta_url: "/products",
      secondary_cta_text: "Learn More",
      secondary_cta_url: "/products",
      desktop_image_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1200&auto=format&fit=crop",
      mobile_image_url: "",
      focal_position: "center",
      image_fit: "cover",
      text_color: "auto",
      text_align: "center",
      content_position: "center",
      overlay_enabled: true,
      overlay_strength: 20,
      link_type: "category",
      link_destination: "smartphones",
      active: true,
      sort_order: settings.cards.length + 1,
    };
    setEditingCard(newCard);
    setModalImgPreviewError(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (card: FeaturedCollectionCard) => {
    setEditingCard({
      ...card,
      text_color: card.text_color || "auto",
      text_align: card.text_align || "center",
      content_position: card.content_position || "center",
      overlay_enabled: card.overlay_enabled !== false,
      overlay_strength: typeof card.overlay_strength === "number" ? card.overlay_strength : 20,
    });
    setModalImgPreviewError(false);
    setIsModalOpen(true);
  };

  const handleSaveModalCard = () => {
    if (!editingCard) return;
    if (!editingCard.title.trim()) {
      alert("Card title cannot be empty.");
      return;
    }
    if (!editingCard.desktop_image_url?.trim()) {
      alert("Please provide a desktop banner image URL or upload an image.");
      return;
    }

    const exists = settings.cards.some((c) => c.id === editingCard.id);
    let updatedCards: FeaturedCollectionCard[];

    if (exists) {
      updatedCards = settings.cards.map((c) =>
        c.id === editingCard.id ? editingCard : c
      );
    } else {
      updatedCards = [...settings.cards, editingCard];
    }

    updatedCards.forEach((c, idx) => {
      c.sort_order = idx + 1;
    });

    setSettings({ ...settings, cards: updatedCards });
    setIsModalOpen(false);
    setEditingCard(null);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "desktop_image_url" | "mobile_image_url"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editingCard) return;

    setUploadingImage(field);
    setModalImgPreviewError(false);
    try {
      const url = await uploadImageWithFallback(file, "featured_collections");
      setEditingCard((prev) => (prev ? { ...prev, [field]: url } : null));
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Image upload failed. Please try a direct URL.");
    } finally {
      setUploadingImage(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* ── Top Header & Global Actions ── */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border p-6 rounded-2xl`}>
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${isLight ? "bg-blue-50 text-blue-700" : "bg-blue-500/10 text-blue-400"} text-xs font-bold mb-2`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Square-Edged Full-Frame Banners</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            Featured Collections
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            2×2 full-frame image grid with overlay typography, customizable focal points, and zero corner radius.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all active:scale-95 cursor-pointer border ${
              isLight
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
            }`}
            title="Reset to default template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Banner</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToFirestore}
            disabled={saving}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer ${
              savedSuccess
                ? "bg-emerald-600 text-white"
                : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved Live!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Global Section Settings Bar ── */}
      <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled !== false}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 ${isLight ? "bg-slate-200" : "bg-neutral-800"} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500`}></div>
          </label>
          <div>
            <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Enable Section on Homepage</h4>
            <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              When toggled off, the entire Featured Collections section is hidden from the homepage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:w-64">
            <input
              type="text"
              placeholder="Section Title (Optional)"
              value={settings.title || ""}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none focus:border-blue-500 border ${
                isLight ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 placeholder:text-slate-400 focus:bg-white" : "bg-[#0B111A] border-white/[0.08] text-white placeholder-neutral-500"
              }`}
            />
          </div>
          <div className="flex-1 md:w-72">
            <input
              type="text"
              placeholder="Section Subtitle (Optional)"
              value={settings.subtitle || ""}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none focus:border-blue-500 border ${
                isLight ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 placeholder:text-slate-400 focus:bg-white" : "bg-[#0B111A] border-white/[0.08] text-white placeholder-neutral-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* ── Banners List & Manager ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Featured Banners ({settings.cards.length})</span>
          </h3>
          <span className="text-xs text-neutral-400">
            Top 4 active banners display in the full-screen 2×2 grid
          </span>
        </div>

        {settings.cards.length === 0 ? (
          <div className="bg-neutral-900 border border-dashed border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
              <Layers className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">No Banners Configured</h4>
            <p className="text-xs text-neutral-400 max-w-sm mb-6">
              Create your first promotional banner or restore the default curated 4-card template.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 cursor-pointer"
              >
                Load Default 4 Cards
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-xs font-bold text-white cursor-pointer"
              >
                + Add Banner
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {settings.cards.map((card, idx) => {
              const isDarkText = isDarkTextTheme(card);
              const alignLabel = card.text_align ? card.text_align.toUpperCase() : "CENTER";
              const posLabel = card.content_position ? card.content_position.toUpperCase() : "CENTER";
              const colorLabel = card.text_color === "black" ? "Black Text" : card.text_color === "white" ? "White Text" : "Auto Color";

              return (
                <div
                  key={card.id || idx}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-neutral-700 shadow-md"
                >
                  {/* Left: Square Thumbnail & Details */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-20 h-16 sm:w-24 sm:h-20 rounded-none overflow-hidden shrink-0 flex items-center justify-center border border-neutral-800 relative bg-neutral-950"
                      style={{ borderRadius: 0 }}
                    >
                      {card.desktop_image_url ? (
                        <img
                          src={card.desktop_image_url}
                          alt={card.title}
                          className="w-full h-full object-cover rounded-none"
                          style={{ objectPosition: card.focal_position || "center", borderRadius: 0 }}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-neutral-500 m-auto" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-mono font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        {card.eyebrow && (
                          <span className="text-[10px] font-extrabold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                            {card.eyebrow}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {colorLabel}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded">
                          {posLabel} / {alignLabel}
                        </span>
                        {card.overlay_enabled !== false && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            Overlay {card.overlay_strength ?? 20}%
                          </span>
                        )}
                        {!card.active && (
                          <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                            Hidden
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-white truncate">
                        {card.title}
                      </h4>
                      {card.subtitle && (
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                    <button
                      type="button"
                      onClick={() => handleToggleCardActive(card.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        card.active
                          ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                          : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                      }`}
                    >
                      {card.active ? "Active" : "Disabled"}
                    </button>

                    <div className="flex items-center gap-1 bg-neutral-800/80 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, "down")}
                        disabled={idx === settings.cards.length - 1}
                        className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(card)}
                      className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 transition-colors cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-colors cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Live Interactive Preview Simulator ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Full-Screen 2×2 Grid Simulator</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Live preview of square-edged banners with overlay typography and directional readability gradient.
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-neutral-800 border border-neutral-700">
            <button
              type="button"
              onClick={() => setPreviewDevice("desktop")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === "desktop"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop (2×2 Screen)</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice("mobile")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === "mobile"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Stack</span>
            </button>
          </div>
        </div>

        {/* Simulator Frame */}
        <div className="flex justify-center bg-black/50 p-2 sm:p-4 rounded-xl overflow-hidden border border-neutral-800/80">
          <div
            className={`transition-all duration-300 w-full ${
              previewDevice === "mobile"
                ? "max-w-[390px] bg-white rounded-none p-1.5 shadow-2xl border-4 border-neutral-800"
                : "max-w-6xl bg-white rounded-none p-2 shadow-xl"
            }`}
            style={{ borderRadius: 0 }}
          >
            {/* Simulator Grid */}
            <div
              className={`grid gap-2 ${
                previewDevice === "mobile" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              {settings.cards
                .filter((c) => c.active)
                .slice(0, 4)
                .map((card, idx) => {
                  const isDarkText = isDarkTextTheme(card);
                  const contentPosition = card.content_position || "center";
                  const contentJustify =
                    contentPosition === "top"
                      ? "justify-start"
                      : contentPosition === "bottom"
                      ? "justify-end"
                      : "justify-center";

                  const textAlign = card.text_align || "center";
                  const alignClass =
                    textAlign === "left"
                      ? "items-start text-left"
                      : textAlign === "right"
                      ? "items-end text-right"
                      : "items-center text-center";

                  // Directional overlay
                  const overlayEnabled = card.overlay_enabled !== false;
                  const rawStrength = typeof card.overlay_strength === "number" ? card.overlay_strength : 20;
                  const clampedStrength = Math.max(0, Math.min(25, rawStrength));
                  const alpha = (clampedStrength / 100).toFixed(2);
                  const baseColor = isDarkText ? "255, 255, 255" : "0, 0, 0";

                  let overlayBg = "none";
                  if (overlayEnabled && clampedStrength > 0) {
                    if (contentPosition === "top") {
                      overlayBg = `linear-gradient(to bottom, rgba(${baseColor}, ${alpha}) 0%, rgba(${baseColor}, 0) 65%)`;
                    } else if (contentPosition === "bottom") {
                      overlayBg = `linear-gradient(to top, rgba(${baseColor}, ${alpha}) 0%, rgba(${baseColor}, 0) 65%)`;
                    } else {
                      overlayBg = `radial-gradient(circle at center, rgba(${baseColor}, ${alpha}) 0%, rgba(${baseColor}, 0) 80%)`;
                    }
                  }

                  return (
                    <div
                      key={card.id || idx}
                      className="relative overflow-hidden w-full min-h-[260px] sm:min-h-[290px] rounded-none select-none bg-neutral-900"
                      style={{ borderRadius: 0 }}
                    >
                      {/* Full-Frame Absolute Image */}
                      <div className="absolute inset-0 w-full h-full p-0 m-0 z-0 rounded-none overflow-hidden" style={{ borderRadius: 0 }}>
                        {card.desktop_image_url ? (
                          <img
                            src={card.desktop_image_url}
                            alt={card.title}
                            className="w-full h-full object-cover block rounded-none"
                            style={{ objectPosition: card.focal_position || "center", borderRadius: 0 }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Readability Overlay */}
                      {overlayEnabled && clampedStrength > 0 && (
                        <div
                          className="absolute inset-0 z-5 pointer-events-none rounded-none"
                          style={{ background: overlayBg, borderRadius: 0 }}
                        />
                      )}

                      {/* Text Overlay */}
                      <div
                        className={`absolute inset-0 z-10 p-4 sm:p-5 flex flex-col ${contentJustify} pointer-events-none rounded-none`}
                        style={{ borderRadius: 0 }}
                      >
                        <div className={`flex flex-col ${alignClass} max-w-sm`}>
                          {card.eyebrow && (
                            <span
                              className={`text-[9px] font-semibold tracking-[0.08em] uppercase mb-0.5 ${
                                isDarkText ? "text-[#090909]/70" : "text-[#FFFFFF]/75"
                              }`}
                            >
                              {card.eyebrow}
                            </span>
                          )}
                          <h4
                            className={`text-base sm:text-lg font-semibold tracking-[-0.035em] leading-[1.1] line-clamp-2 ${
                              isDarkText ? "text-[#090909]" : "text-[#FFFFFF]"
                            }`}
                          >
                            {card.title}
                          </h4>
                          {card.subtitle && (
                            <p
                              className={`text-xs font-normal mt-1 leading-[1.35] line-clamp-2 ${
                                isDarkText ? "text-[#090909]/80" : "text-[#FFFFFF]/85"
                              }`}
                            >
                              {card.subtitle}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3">
                            <span
                              className={`px-3.5 py-1 rounded-full text-[11px] font-medium shadow-2xs ${
                                isDarkText
                                  ? "bg-[#090909] text-white"
                                  : "bg-white text-[#090909]"
                              }`}
                            >
                              {card.primary_cta_text || "Shop"}
                            </span>
                            {card.secondary_cta_text && (
                              <span
                                className={`text-[11px] font-medium flex items-center gap-0.5 ${
                                  isDarkText ? "text-[#090909]" : "text-white"
                                }`}
                              >
                                {card.secondary_cta_text || "Learn more"} ›
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card Edit / Create Modal ── */}
      {isModalOpen && editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-xl font-black text-white">
                  {settings.cards.some((c) => c.id === editingCard.id)
                    ? "Edit Promotional Banner"
                    : "Add New Promotional Banner"}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Full-frame edge-to-edge image, overlay typography, focal positioning, and readability overlay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="space-y-5">
              
              {/* Row 1: Eyebrow & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-300">
                    Eyebrow Badge (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FLAGSHIP SERIES"
                    value={editingCard.eyebrow || ""}
                    onChange={(e) =>
                      setEditingCard({ ...editingCard, eyebrow: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-neutral-300">
                    Banner Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Latest Smartphones"
                    value={editingCard.title}
                    onChange={(e) =>
                      setEditingCard({ ...editingCard, title: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Subtitle */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300">Subtitle / Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. Powerful technology. Made for every moment."
                  value={editingCard.subtitle || ""}
                  onChange={(e) =>
                    setEditingCard({ ...editingCard, subtitle: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Row 3: Overlay Layout & Typography Options (Text Align, Content Position, Text Color) */}
              <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-700/60 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Overlay Positioning & Typography</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Content Position (Vertical) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-300 block">
                      Content Position
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-neutral-800 p-1 rounded-xl border border-neutral-700">
                      {(["top", "center", "bottom"] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setEditingCard({ ...editingCard, content_position: pos })}
                          className={`py-1.5 text-xs font-bold capitalize rounded-lg transition-all cursor-pointer ${
                            (editingCard.content_position || "center") === pos
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Alignment (Horizontal) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-300 block">
                      Text Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-neutral-800 p-1 rounded-xl border border-neutral-700">
                      {(
                        [
                          { key: "left", icon: AlignLeft, label: "Left" },
                          { key: "center", icon: AlignCenter, label: "Centre" },
                          { key: "right", icon: AlignRight, label: "Right" },
                        ] as const
                      ).map(({ key, icon: Icon, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setEditingCard({ ...editingCard, text_align: key })}
                          className={`py-1.5 text-xs font-bold flex items-center justify-center gap-1 rounded-lg transition-all cursor-pointer ${
                            (editingCard.text_align || "center") === key
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-neutral-400 hover:text-white"
                          }`}
                          title={label}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Colour */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-300 block">
                      Text Colour
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-neutral-800 p-1 rounded-xl border border-neutral-700">
                      {(
                        [
                          { key: "auto", label: "Auto" },
                          { key: "white", label: "White" },
                          { key: "black", label: "Black" },
                        ] as const
                      ).map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setEditingCard({ ...editingCard, text_color: key })}
                          className={`py-1.5 text-xs font-bold capitalize rounded-lg transition-all cursor-pointer ${
                            (editingCard.text_color || "auto") === key
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Readability Overlay Toggle & Strength Slider */}
                <div className="pt-3 border-t border-neutral-700/60 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCard.overlay_enabled !== false}
                        onChange={(e) =>
                          setEditingCard({ ...editingCard, overlay_enabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <div>
                      <span className="text-xs font-bold text-white block">Readability Overlay</span>
                      <span className="text-[11px] text-neutral-400">
                        Subtle transparent directional gradient behind text
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-300">Overlay Strength</span>
                      <span className="font-mono text-blue-400 font-bold">
                        {editingCard.overlay_enabled !== false ? `${editingCard.overlay_strength ?? 20}%` : "Off (0%)"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="1"
                      disabled={editingCard.overlay_enabled === false}
                      value={editingCard.overlay_strength ?? 20}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          overlay_strength: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Image Source Controls (Upload vs URL) & Focal Point */}
              <div className="space-y-4 p-5 rounded-xl bg-neutral-800/60 border border-neutral-700/60">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-neutral-700/60">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                    <span>Full-Frame Banner Image</span>
                  </label>

                  {/* Mode Tabs */}
                  <div className="inline-flex items-center p-1 rounded-xl bg-neutral-800 border border-neutral-700">
                    <button
                      type="button"
                      onClick={() => setImageSourceMode("url")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        imageSourceMode === "url"
                          ? "bg-blue-600 text-white"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceMode("upload")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        imageSourceMode === "upload"
                          ? "bg-blue-600 text-white"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Upload Image
                    </button>
                  </div>
                </div>

                {/* Mode 1: Image URL */}
                {imageSourceMode === "url" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-300">
                        Desktop Image URL <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/... or https://..."
                        value={editingCard.desktop_image_url}
                        onChange={(e) => {
                          setModalImgPreviewError(false);
                          setEditingCard({
                            ...editingCard,
                            desktop_image_url: e.target.value,
                          });
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-300">
                        Mobile Image URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://... (Leave blank to reuse desktop image)"
                        value={editingCard.mobile_image_url || ""}
                        onChange={(e) =>
                          setEditingCard({
                            ...editingCard,
                            mobile_image_url: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Mode 2: Upload Image */}
                {imageSourceMode === "upload" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 space-y-2">
                        <label className="text-xs font-bold text-neutral-300 block">
                          Desktop Image File
                        </label>
                        <label className="w-full py-2.5 px-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>
                            {uploadingImage === "desktop_image_url"
                              ? "Uploading..."
                              : "Choose Desktop File"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, "desktop_image_url")}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 space-y-2">
                        <label className="text-xs font-bold text-neutral-300 block">
                          Mobile Image File (Optional)
                        </label>
                        <label className="w-full py-2.5 px-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>
                            {uploadingImage === "mobile_image_url"
                              ? "Uploading..."
                              : "Choose Mobile File"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, "mobile_image_url")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Alt Text & Focal Position Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-700/60">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-300">
                      Image Alt Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. iPhone 16 Pro in Natural Titanium"
                      value={editingCard.image_alt || ""}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          image_alt: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-300 flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-blue-400" />
                      <span>Image Focal Position</span>
                    </label>
                    <select
                      value={editingCard.focal_position || "center"}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          focal_position: e.target.value as any,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {FOCAL_POSITIONS.map((fp) => (
                        <option key={fp.value} value={fp.value}>
                          {fp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {editingCard.focal_position === "custom" && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-bold text-neutral-300">
                      Custom CSS Object-Position (e.g. 50% 20% or right top)
                    </label>
                    <input
                      type="text"
                      placeholder="50% 20%"
                      value={editingCard.custom_focal_position || ""}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          custom_focal_position: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Live Preview Box inside Modal */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300">
                      Live Banner Preview (Edge-to-Edge with Overlay)
                    </span>
                    {editingCard.desktop_image_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingCard({
                            ...editingCard,
                            desktop_image_url: "",
                            mobile_image_url: "",
                          })
                        }
                        className="text-[11px] text-red-400 hover:underline cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  <div
                    className="h-52 w-full rounded-none overflow-hidden border border-neutral-700 relative flex items-center justify-center bg-black"
                    style={{ borderRadius: 0 }}
                  >
                    {editingCard.desktop_image_url && !modalImgPreviewError ? (
                      <>
                        <img
                          src={editingCard.desktop_image_url}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-none"
                          style={{
                            objectPosition:
                              editingCard.focal_position === "custom"
                                ? editingCard.custom_focal_position || "center"
                                : editingCard.focal_position || "center",
                            borderRadius: 0,
                          }}
                          onError={() => setModalImgPreviewError(true)}
                        />

                        {/* Modal Readability Overlay Preview */}
                        {editingCard.overlay_enabled !== false && (
                          <div
                            className="absolute inset-0 z-5 pointer-events-none rounded-none"
                            style={{
                              borderRadius: 0,
                              background:
                                editingCard.content_position === "top"
                                  ? `linear-gradient(to bottom, rgba(${isDarkTextTheme(editingCard) ? "255,255,255" : "0,0,0"}, ${(
                                      (editingCard.overlay_strength ?? 20) / 100
                                    ).toFixed(2)}) 0%, rgba(0,0,0,0) 65%)`
                                  : editingCard.content_position === "bottom"
                                  ? `linear-gradient(to top, rgba(${isDarkTextTheme(editingCard) ? "255,255,255" : "0,0,0"}, ${(
                                      (editingCard.overlay_strength ?? 20) / 100
                                    ).toFixed(2)}) 0%, rgba(0,0,0,0) 65%)`
                                  : `radial-gradient(circle at center, rgba(${isDarkTextTheme(editingCard) ? "255,255,255" : "0,0,0"}, ${(
                                      (editingCard.overlay_strength ?? 20) / 100
                                    ).toFixed(2)}) 0%, rgba(0,0,0,0) 80%)`,
                            }}
                          />
                        )}

                        {/* Modal Text Overlay */}
                        <div
                          className={`absolute inset-0 z-10 p-5 flex flex-col ${
                            editingCard.content_position === "top"
                              ? "justify-start"
                              : editingCard.content_position === "bottom"
                              ? "justify-end"
                              : "justify-center"
                          } pointer-events-none rounded-none`}
                          style={{ borderRadius: 0 }}
                        >
                          <div
                            className={`flex flex-col ${
                              editingCard.text_align === "left"
                                ? "items-start text-left"
                                : editingCard.text_align === "right"
                                ? "items-end text-right"
                                : "items-center text-center"
                            } max-w-sm`}
                          >
                            {editingCard.eyebrow && (
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${
                                  isDarkTextTheme(editingCard) ? "text-neutral-800" : "text-white/80"
                                }`}
                              >
                                {editingCard.eyebrow}
                              </span>
                            )}
                            <h4
                              className={`text-base font-black tracking-tight leading-tight line-clamp-1 ${
                                isDarkTextTheme(editingCard)
                                  ? "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]"
                                  : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                              }`}
                            >
                              {editingCard.title || "Banner Title"}
                            </h4>
                            {editingCard.subtitle && (
                              <p
                                className={`text-xs font-normal mt-0.5 leading-snug line-clamp-1 ${
                                  isDarkTextTheme(editingCard)
                                    ? "text-neutral-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]"
                                    : "text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                                }`}
                              >
                                {editingCard.subtitle}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-semibold ${
                                  isDarkTextTheme(editingCard)
                                    ? "bg-black text-white"
                                    : "bg-white text-black"
                                }`}
                              >
                                {editingCard.primary_cta_text || "Shop Now"}
                              </span>
                              {editingCard.secondary_cta_text && (
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-xs ${
                                    isDarkTextTheme(editingCard)
                                      ? "border border-black/80 bg-white/40 text-black"
                                      : "border border-white/80 bg-black/30 text-white"
                                  }`}
                                >
                                  {editingCard.secondary_cta_text}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : modalImgPreviewError ? (
                      <div className="flex items-center gap-2 text-xs text-red-400 m-auto">
                        <AlertCircle className="w-4 h-4" />
                        <span>Invalid or broken image URL. Please check the address.</span>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500 m-auto">No Image Specified</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 5: CTA Buttons Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 p-3.5 rounded-xl bg-neutral-800/40 border border-neutral-800">
                  <label className="text-xs font-bold text-neutral-300">
                    Primary CTA (Shop Now / Explore)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Label (Shop Now)"
                      value={editingCard.primary_cta_text || ""}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          primary_cta_text: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="URL (/products/...)"
                      value={editingCard.primary_cta_url || ""}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          primary_cta_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-3.5 rounded-xl bg-neutral-800/40 border border-neutral-800">
                  <label className="text-xs font-bold text-neutral-300">
                    Secondary CTA (Learn More / Buy)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Label (Learn More)"
                      value={editingCard.secondary_cta_text || ""}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          secondary_cta_text: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="URL (/products/...)"
                      value={editingCard.secondary_cta_url || ""}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          secondary_cta_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Banner Destination Link */}
              <div className="p-4 rounded-xl bg-neutral-800/40 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Banner Destination Link (Clicking Card)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingCard.open_in_new_tab === true}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          open_in_new_tab: e.target.checked,
                        })
                      }
                      className="rounded bg-neutral-700 border-neutral-600 text-blue-600 focus:ring-0"
                    />
                    <span>Open in new tab</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-400">Destination Type</label>
                    <select
                      value={editingCard.link_type || "category"}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          link_type: e.target.value as any,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="category">Category</option>
                      <option value="brand">Brand</option>
                      <option value="product">Product</option>
                      <option value="custom">Custom URL</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-400">Select Target Destination</label>
                    {editingCard.link_type === "category" ? (
                      <select
                        value={editingCard.link_destination || ""}
                        onChange={(e) =>
                          setEditingCard({
                            ...editingCard,
                            link_destination: e.target.value,
                            primary_cta_url: `/products?category=${e.target.value}`,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select a Category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.slug || cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    ) : editingCard.link_type === "brand" ? (
                      <select
                        value={editingCard.link_destination || ""}
                        onChange={(e) =>
                          setEditingCard({
                            ...editingCard,
                            link_destination: e.target.value,
                            primary_cta_url: `/products?brand=${e.target.value}`,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select a Brand</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.slug || b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    ) : editingCard.link_type === "product" ? (
                      <select
                        value={editingCard.link_destination || ""}
                        onChange={(e) =>
                          setEditingCard({
                            ...editingCard,
                            link_destination: e.target.value,
                            primary_cta_url: `/products/${e.target.value}`,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select a Product</option>
                        {products.slice(0, 100).map((p) => (
                          <option key={p.id} value={p.slug}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="https://... or /products"
                        value={editingCard.link_destination || ""}
                        onChange={(e) =>
                          setEditingCard({
                            ...editingCard,
                            link_destination: e.target.value,
                            primary_cta_url: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Row 7: Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    <span>Start Date (Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={editingCard.start_date || ""}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        start_date: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    <span>Expiry Date (Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={editingCard.expiry_date || ""}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        expiry_date: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalCard}
                className="px-6 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer"
              >
                Save Banner
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
