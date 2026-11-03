"use client";

import React, { useState, useEffect } from "react";
import { GalleryImage, GalleryAnimationSettings, HeroSlide } from "@/lib/types";
import { DEFAULT_GALLERY_ANIMATION_SETTINGS } from "@/lib/data";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Save,
  Check,
  RotateCcw,
  CircleCheck as Sparkles,
  Sliders,
  Gauge,
  Hand,
  ArrowLeftRight,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

export function getPlatformMeta(platform?: string, post_url?: string) {
  let p = (platform || "").toLowerCase();
  
  if ((!p || p === "none") && post_url) {
    if (post_url.includes("instagram.com")) p = "instagram";
    else if (post_url.includes("tiktok.com")) p = "tiktok";
    else if (post_url.includes("facebook.com") || post_url.includes("fb.watch")) p = "facebook";
    else if (post_url.includes("youtube.com") || post_url.includes("youtu.be")) p = "youtube";
    else if (post_url.startsWith("http")) p = "other";
  }

  switch (p) {
    case "instagram":
      return {
        name: "Instagram",
        label: "View on Instagram",
        badgeBg: "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white",
        icon: "📸",
        glow: "hover:border-pink-500/50 hover:shadow-[0_15px_35px_rgba(236,72,153,0.3)]",
      };
    case "tiktok":
      return {
        name: "TikTok",
        label: "Watch on TikTok",
        badgeBg: "bg-black text-white border border-cyan-400/40",
        icon: "🎵",
        glow: "hover:border-cyan-400/50 hover:shadow-[0_15px_35px_rgba(34,211,238,0.3)]",
      };
    case "facebook":
      return {
        name: "Facebook",
        label: "View on Facebook",
        badgeBg: "bg-blue-600 text-white",
        icon: "📘",
        glow: "hover:border-blue-500/50 hover:shadow-[0_15px_35px_rgba(59,130,246,0.3)]",
      };
    case "youtube":
      return {
        name: "YouTube",
        label: "Watch on YouTube",
        badgeBg: "bg-red-600 text-white",
        icon: "▶️",
        glow: "hover:border-red-500/50 hover:shadow-[0_15px_35px_rgba(239,68,68,0.3)]",
      };
    case "other":
      return {
        name: "Social Post",
        label: "View Post",
        badgeBg: "bg-slate-800 text-white border border-white/20",
        icon: "🔗",
        glow: "hover:border-blue-400/50 hover:shadow-[0_15px_35px_rgba(96,165,250,0.3)]",
      };
    default:
      return null;
  }
}

interface GalleryTabProps {
  images: GalleryImage[];
  initialAnimationSettings?: GalleryAnimationSettings | null;
  onAdd: () => void;
  onEdit: (image: GalleryImage) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
}

export default function GalleryTab({
  images,
  initialAnimationSettings,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
}: GalleryTabProps) {
  const { isLight } = useAdminTheme();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [activeSection, setActiveSection] = useState<"photos" | "animation">("photos");

  const [animSettings, setAnimSettings] = useState<GalleryAnimationSettings>(() => ({
    ...DEFAULT_GALLERY_ANIMATION_SETTINGS,
    ...(initialAnimationSettings || {}),
  }));

  const [savingAnim, setSavingAnim] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (initialAnimationSettings) {
      setAnimSettings((prev) => ({ ...prev, ...initialAnimationSettings }));
    }
  }, [initialAnimationSettings]);

  const handleSaveAnimation = async () => {
    setSavingAnim(true);
    setSavedSuccess(false);
    try {
      const payload: GalleryAnimationSettings = {
        ...animSettings,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "settings", "gallery_animation"), payload, { merge: true });
      await setDoc(doc(db, "siteSettings", "galleryAnimation"), payload, { merge: true });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onRefresh?.();
    } catch (e) {
      console.error("Error saving gallery animation settings:", e);
      alert("Failed to save animation settings. Please check console.");
    } finally {
      setSavingAnim(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset gallery scroll animation settings to recommended defaults?")) {
      setAnimSettings(DEFAULT_GALLERY_ANIMATION_SETTINGS);
    }
  };

  const filteredImages = images.filter((img) => {
    if (filterCategory === "all") return true;
    return img.category === filterCategory;
  });

  return (
    <div className="space-y-6">
      {/* ── Homepage Section Visibility Switch ── */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
        animSettings.enabled !== false
          ? "bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
          : "bg-white/5 border-white/10 opacity-75"
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${animSettings.enabled !== false ? "text-emerald-400" : "text-white/40"}`} />
            <span className="font-extrabold text-sm text-white">Homepage Store Gallery Section</span>
          </div>
          <p className="text-xs text-white/50">
            {animSettings.enabled !== false
              ? `VISIBLE ON HOMEPAGE • Displays photo marquee on 1place.lk`
              : "HIDDEN • Gallery section is currently hidden from the homepage"}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={animSettings.enabled !== false}
              onChange={async (e) => {
                const nextVal = e.target.checked;
                setAnimSettings((prev) => ({ ...prev, enabled: nextVal }));
                try {
                  await setDoc(doc(db, "settings", "gallery_animation"), { enabled: nextVal, updatedAt: new Date().toISOString() }, { merge: true });
                  await setDoc(doc(db, "siteSettings", "galleryAnimation"), { enabled: nextVal, updatedAt: new Date().toISOString() }, { merge: true });
                  onRefresh?.();
                } catch (err) {
                  console.error("Error updating gallery visibility:", err);
                }
              }}
              className="sr-only peer"
            />
            <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
          </label>
        </div>
      </div>

      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border ${
        isLight ? "bg-white border-slate-200 shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        <div>
          <h3 className={`text-xl font-bold flex items-center gap-2.5 ${isLight ? "text-[#0F172A]" : "text-white"}`}>
            <Sparkles className="w-5 h-5 text-blue-600" />
            Store Gallery &amp; Apple-Style Rail Manager
          </h3>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
            Manage your showroom photo gallery items and configure the smooth continuous horizontal scroll marquee.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className={`flex p-1 rounded-xl border ${isLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"}`}>
            <button
              onClick={() => setActiveSection("photos")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === "photos"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
              }`}
            >
              Gallery Photos ({images.length})
            </button>
            <button
              onClick={() => setActiveSection("animation")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSection === "animation"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Scroll Animation
            </button>
          </div>

          {activeSection === "photos" && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Photo
            </button>
          )}
        </div>
      </div>

      {activeSection === "photos" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            {(["all", "shop", "repairs", "customers"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  filterCategory === cat
                    ? "bg-white text-slate-900 shadow"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat} ({cat === "all" ? images.length : images.filter((i) => i.category === cat).length})
              </button>
            ))}
          </div>

          {filteredImages.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/5 space-y-3">
              <p className="text-white/60 text-sm">No gallery items found in this category.</p>
              <button
                onClick={onAdd}
                className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-all"
              >
                + Add Gallery Image
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredImages.map((img) => {
                const platformMeta = getPlatformMeta(img.platform, img.post_url);

                return (
                  <div
                    key={img.id}
                    className={`group relative aspect-[4/5] rounded-2xl overflow-hidden bg-white/5 border transition-all ${
                      img.visible !== false ? "border-white/10 hover:border-white/30" : "border-red-500/30 opacity-60"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={img.caption || `Gallery image`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center p-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(img)}
                          className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all"
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(img.id)}
                          className="p-2.5 rounded-xl bg-red-500/20 backdrop-blur-sm text-red-300 hover:bg-red-500/30 transition-all"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {img.post_url && (
                          <a
                            href={img.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-blue-500/30 backdrop-blur-sm text-blue-300 hover:bg-blue-500/50 transition-all"
                            title="View Social Post"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                      {img.category && (
                        <span className="px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-lg text-[9px] font-bold text-white/90 uppercase tracking-wider">
                          {img.category}
                        </span>
                      )}

                      {platformMeta && (
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md ${platformMeta.badgeBg}`}>
                          <span>{platformMeta.icon}</span>
                          <span>{platformMeta.name}</span>
                        </span>
                      )}
                    </div>

                    {img.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                        <p className="text-white text-xs font-semibold truncate leading-tight">{img.title || img.caption}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSection === "animation" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Continuous Endless Marquee Engine</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                Apple-Style Media Rail
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={handleSaveAnimation}
                disabled={savingAnim}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {savingAnim ? "Saving..." : "Save Animation Settings"}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 space-y-6">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-blue-400">
                <Gauge className="w-4 h-4" />
                Continuous Movement &amp; Speeds
              </h4>

              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">Endless Scrolling</span>
                  <span className="text-[11px] text-white/50 block">Enable continuous horizontal loop</span>
                </div>
                <input
                  type="checkbox"
                  checked={animSettings.endlessScrollEnabled}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, endlessScrollEnabled: e.target.checked }))}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">Autoplay Motion</span>
                  <span className="text-[11px] text-white/50 block">Continuously advance cards horizontally</span>
                </div>
                <input
                  type="checkbox"
                  checked={animSettings.autoplayEnabled}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, autoplayEnabled: e.target.checked }))}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-white/60" />
                  Scroll Direction
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAnimSettings((prev) => ({ ...prev, direction: "left" }))}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      animSettings.direction === "left"
                        ? "bg-blue-600 text-white border-blue-500 shadow-md"
                        : "bg-white/5 text-white/60 hover:text-white border-white/10"
                    }`}
                  >
                    Right to Left (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnimSettings((prev) => ({ ...prev, direction: "right" }))}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      animSettings.direction === "right"
                        ? "bg-blue-600 text-white border-blue-500 shadow-md"
                        : "bg-white/5 text-white/60 hover:text-white border-white/10"
                    }`}
                  >
                    Left to Right
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-blue-400" />
                    Desktop Speed (Screens ≥ 1024px)
                  </span>
                  <span className="font-mono text-blue-400 font-bold">{animSettings.desktopSpeed} px/s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={2}
                  value={animSettings.desktopSpeed}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, desktopSpeed: Number(e.target.value) }))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Tablet className="w-3.5 h-3.5 text-emerald-400" />
                    Tablet Speed (Screens 768px – 1023px)
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{animSettings.tabletSpeed} px/s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={2}
                  value={animSettings.tabletSpeed}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, tabletSpeed: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                    Mobile Speed (Screens &lt; 768px)
                  </span>
                  <span className="font-mono text-amber-400 font-bold">{animSettings.mobileSpeed} px/s</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={60}
                  step={2}
                  value={animSettings.mobileSpeed}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, mobileSpeed: Number(e.target.value) }))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 space-y-6">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-emerald-400">
                <Hand className="w-4 h-4" />
                Interactions &amp; Pause Controls
              </h4>

              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">Pause on Pointer Hover</span>
                  <span className="text-[11px] text-white/50 block">Pause movement when cursor is over rail</span>
                </div>
                <input
                  type="checkbox"
                  checked={animSettings.pauseOnHover}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, pauseOnHover: e.target.checked }))}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">Pause on Keyboard Focus</span>
                  <span className="text-[11px] text-white/50 block">Pause when user tabs into gallery cards</span>
                </div>
                <input
                  type="checkbox"
                  checked={animSettings.pauseOnFocus}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, pauseOnFocus: e.target.checked }))}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">Pause on Touch / Drag</span>
                  <span className="text-[11px] text-white/50 block">Pause while user is dragging or swiping</span>
                </div>
                <input
                  type="checkbox"
                  checked={animSettings.pauseOnInteraction}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, pauseOnInteraction: e.target.checked }))}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">Manual Drag &amp; Swipe</span>
                  <span className="text-[11px] text-white/50 block">Allow mouse dragging and touch swipe</span>
                </div>
                <input
                  type="checkbox"
                  checked={animSettings.dragEnabled}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, dragEnabled: e.target.checked }))}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Autoplay Resume Delay</span>
                  <span className="font-mono text-blue-400 font-bold">{animSettings.resumeDelay} ms</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={4000}
                  step={100}
                  value={animSettings.resumeDelay}
                  onChange={(e) => setAnimSettings((prev) => ({ ...prev, resumeDelay: Number(e.target.value) }))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Edge Fade Masks</span>
                    <span className="text-[11px] text-white/50 block">Soft gradient fade at viewport borders</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={animSettings.edgeFadeEnabled}
                    onChange={(e) => setAnimSettings((prev) => ({ ...prev, edgeFadeEnabled: e.target.checked }))}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                {animSettings.edgeFadeEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/70">Fade Width ({animSettings.edgeFadeWidth}px)</label>
                      <input
                        type="range"
                        min={20}
                        max={150}
                        value={animSettings.edgeFadeWidth}
                        onChange={(e) => setAnimSettings((prev) => ({ ...prev, edgeFadeWidth: Number(e.target.value) }))}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-white/70">Fade Background Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={animSettings.edgeFadeColor || "#F2F2F2"}
                          onChange={(e) => setAnimSettings((prev) => ({ ...prev, edgeFadeColor: e.target.value }))}
                          className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={animSettings.edgeFadeColor || "#F2F2F2"}
                          onChange={(e) => setAnimSettings((prev) => ({ ...prev, edgeFadeColor: e.target.value }))}
                          className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HeroTab({
  slides,
  onAdd,
  onEdit,
  onDelete,
  onInitDefaults,
}: {
  slides: HeroSlide[];
  onAdd: () => void;
  onEdit: (slide: HeroSlide) => void;
  onDelete: (id: string) => void;
  onInitDefaults: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Homepage Hero Slideshow</h3>
          <p className="text-xs text-white/40 mt-0.5">
            Manage, reorder, or update your hero section background wallpapers ({slides.length} slides in database)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {slides.length === 0 && (
            <button
              onClick={onInitDefaults}
              className="px-4 py-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all active:scale-[0.98]"
            >
              + Load 4 Default Wallpapers to DB
            </button>
          )}
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-semibold hover:bg-white/90 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Hero Slide
          </button>
        </div>
      </div>

      {slides.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/5 space-y-3">
          <p className="text-white/60 text-sm">
            No custom hero slides currently stored in database. The homepage is displaying the 4 default 4K wallpapers.
          </p>
          <button
            onClick={onInitDefaults}
            className="px-5 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-semibold hover:bg-white/90 transition-all"
          >
            Click here to import default wallpapers into Database to start editing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`group relative rounded-2xl overflow-hidden border transition-all ${
                slide.active !== false
                  ? "bg-white/5 border-white/10 hover:border-white/20"
                  : "bg-white/5 border-red-500/30 opacity-60"
              }`}
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-slate-900 relative">
                <img
                  src={slide.image_url}
                  alt={slide.alt || "Hero slide"}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/hero-slide-1.png";
                  }}
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs font-bold text-white">
                    Order #{slide.sort_order}
                  </span>
                  <span
                    className={`px-2.5 py-1 backdrop-blur-md rounded-lg text-xs font-semibold ${
                      slide.active !== false
                        ? "bg-emerald-500/80 text-white"
                        : "bg-red-500/80 text-white"
                    }`}
                  >
                    {slide.active !== false ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(slide)}
                      className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all"
                      title="Edit Slide"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(slide.id)}
                      className="p-2.5 rounded-xl bg-red-500/20 backdrop-blur-sm text-red-300 hover:bg-red-500/30 transition-all"
                      title="Delete Slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <p className="text-sm font-medium text-white truncate pr-2">
                  {slide.alt || "1PLACE.LK Hero Banner"}
                </p>
                <span className="text-xs text-white/40 flex-shrink-0">ID: {slide.id.slice(0, 6)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
