"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Flame,
  Save,
  Check,
  Smartphone,
  Monitor,
  Tablet,
  Upload,
  RefreshCw,
  Eye,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  Clock,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  CircleCheck as Sparkles,
  Sliders,
  Maximize2,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import { TodayDealSettings, TodayDealStatus } from "@/lib/types";
import { DEFAULT_TODAY_DEAL_SETTINGS } from "@/lib/data";
import { uploadImageWithFallback } from "@/lib/upload-utils";
import { clearDataCache } from "@/lib/firestore-client";
import TodayDealSection from "@/components/home/today-deal-section";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

interface TodayDealTabProps {
  initialSettings?: TodayDealSettings | null;
  onRefresh?: () => void;
}

// Convert ISO date string to datetime-local input string YYYY-MM-DDTHH:mm
function toDateTimeLocal(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

// Convert datetime-local input string to ISO string
function fromDateTimeLocal(localStr: string): string {
  if (!localStr) return "";
  try {
    const d = new Date(localStr);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  } catch {
    return "";
  }
}

export default function TodayDealTab({ initialSettings, onRefresh }: TodayDealTabProps) {
  const { isLight } = useAdminTheme();
  const [settings, setSettings] = useState<TodayDealSettings>(() => {
    return { ...DEFAULT_TODAY_DEAL_SETTINGS, ...(initialSettings || {}) };
  });

  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [uploadingSquare, setUploadingSquare] = useState(false);
  const [uploadingBgBanner, setUploadingBgBanner] = useState(false);
  const [activeTabGroup, setActiveTabGroup] = useState<"content" | "media" | "appearance" | "countdown">("content");

  // Sync initial settings if updated from parent
  useEffect(() => {
    if (initialSettings && Object.keys(initialSettings).length > 0) {
      setSettings((prev) => ({ ...prev, ...initialSettings }));
    }
  }, [initialSettings]);

  // Always fetch latest settings from Firestore on mount to guarantee fresh live data
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, "settings", "today_deal"));
        if (snap.exists() && isMounted) {
          const data = snap.data();
          setSettings((prev) => ({
            ...prev,
            ...data,
            frameBorderRadius: data.frameBorderRadius ?? 0,
            backgroundBannerBorderRadius: data.backgroundBannerBorderRadius ?? 0,
            borderRadius: data.borderRadius ?? 0,
          }));
          return;
        }

        const altSnap = await getDoc(doc(db, "siteSettings", "todayDeal"));
        if (altSnap.exists() && isMounted) {
          const altData = altSnap.data();
          setSettings((prev) => ({
            ...prev,
            ...altData,
            frameBorderRadius: altData.frameBorderRadius ?? 0,
            backgroundBannerBorderRadius: altData.backgroundBannerBorderRadius ?? 0,
            borderRadius: altData.borderRadius ?? 0,
          }));
        }
      } catch (err) {
        console.warn("Could not fetch today's deal settings:", err);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute live campaign status
  const campaignStatus: TodayDealStatus = useMemo(() => {
    if (!settings.enabled) return "draft";
    const now = Date.now();
    const startTime = settings.startsAt ? new Date(settings.startsAt).getTime() : 0;
    const endTime = settings.endsAt ? new Date(settings.endsAt).getTime() : 0;

    if (startTime && now < startTime) return "scheduled";
    if (endTime && now >= endTime) return "expired";
    return "live";
  }, [settings.enabled, settings.startsAt, settings.endsAt]);

  // Handle image upload
  const handleFileUpload = async (file: File, type: "desktop" | "mobile" | "square" | "bgBanner") => {
    if (type === "desktop") setUploadingDesktop(true);
    else if (type === "mobile") setUploadingMobile(true);
    else if (type === "square") setUploadingSquare(true);
    else setUploadingBgBanner(true);

    try {
      const downloadUrl = await uploadImageWithFallback(file, "today_deal");
      if (type === "desktop") {
        setSettings((prev) => ({ ...prev, desktopImageUrl: downloadUrl }));
      } else if (type === "mobile") {
        setSettings((prev) => ({ ...prev, mobileImageUrl: downloadUrl }));
      } else if (type === "square") {
        setSettings((prev) => ({ ...prev, squareImageUrl: downloadUrl }));
      } else {
        setSettings((prev) => ({ ...prev, backgroundBannerUrl: downloadUrl, backgroundBannerEnabled: true }));
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to upload image. Please try a smaller image file.");
    } finally {
      if (type === "desktop") setUploadingDesktop(false);
      else if (type === "mobile") setUploadingMobile(false);
      else if (type === "square") setUploadingSquare(false);
      else setUploadingBgBanner(false);
    }
  };

  // Save Settings to Firestore
  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      const payload: TodayDealSettings = {
        ...settings,
        status: campaignStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: "Admin",
      };

      // Save to primary settings doc
      await setDoc(doc(db, "settings", "today_deal"), payload, { merge: true });
      // Also sync to siteSettings doc if needed
      await setDoc(doc(db, "siteSettings", "todayDeal"), payload, { merge: true });

      // Invalidate memory data cache so public homepage and dashboard get fresh data immediately
      clearDataCache("settings:today_deal");
      clearDataCache("settings");

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to save today's deal settings:", err);
      alert("Failed to save settings. Please check your internet connection.");
    } finally {
      setSaving(false);
    }
  };

  // Reset to 1PLACE.LK defaults
  const handleResetDefaults = () => {
    if (confirm("Reset Today's Deal section to 1PLACE.LK official defaults? Any unsaved edits will be replaced.")) {
      setSettings(DEFAULT_TODAY_DEAL_SETTINGS);
    }
  };

  return (
    <div className="space-y-8 pb-16 font-sans">
      
      {/* ── TOP HEADER & SAVE ACTION ── */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl p-6`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl ${isLight ? "bg-red-50 text-red-600 border-red-200" : "bg-red-500/20 text-red-500 border-red-500/30"} flex items-center justify-center border shrink-0`}>
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                Today&apos;s Deal Promotional Banner
              </h1>
              {/* Campaign Status Badge */}
              <span
                className={`px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                  !settings.enabled
                    ? isLight ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-neutral-500/20 text-neutral-400 border-neutral-500/30"
                    : campaignStatus === "live"
                    ? isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : campaignStatus === "scheduled"
                    ? isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    : isLight ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}
              >
                ● {!settings.enabled ? "OFF (Disabled)" : campaignStatus}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Manage promotional banner image, real HTML overlay content, colors, and live countdown timer on homepage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Banner ON / OFF Switch */}
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 border cursor-pointer ${
              settings.enabled
                ? isLight
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                : isLight
                  ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            {settings.enabled ? "Banner: ON" : "Banner: OFF"}
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
              isLight
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" /> Saved Live!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── LIVE INTERACTIVE PREVIEW ── */}
      <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl p-6 space-y-4`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
              <Eye className={`w-4 h-4 ${isLight ? "text-blue-600" : "text-blue-400"}`} /> Live Interactive Preview
            </h3>
            <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Updates in real-time as you adjust content, colors, images, and countdown timer.
            </p>
          </div>

          {/* Device Tabs */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${isLight ? "bg-slate-100 border-slate-200" : "bg-black/40 border-white/10"}`}>
            <button
              type="button"
              onClick={() => setPreviewDevice("desktop")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                previewDevice === "desktop" ? "bg-[#2563EB] text-white shadow-xs" : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice("tablet")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                previewDevice === "tablet" ? "bg-[#2563EB] text-white shadow-xs" : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" /> Tablet
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice("mobile")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                previewDevice === "mobile" ? "bg-[#2563EB] text-white shadow-xs" : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>
        </div>

        {/* Device Canvas Frame */}
        <div className={`rounded-xl p-4 sm:p-6 flex items-center justify-center overflow-x-auto min-h-[300px] border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#020617] border-white/5"}`}>
          <div
            className="transition-all duration-300 w-full"
            style={{
              maxWidth: previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%",
            }}
          >
            <TodayDealSection settings={settings} isLivePreview={true} previewDevice={previewDevice} />
          </div>
        </div>
      </div>

      {/* ── SETTINGS CONFIGURATION PANELS ── */}
      <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl p-6 space-y-6`}>
        
        {/* Navigation Tabs for Configuration */}
        <div className={`flex items-center gap-2 border-b pb-4 overflow-x-auto custom-scrollbar ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <button
            type="button"
            onClick={() => setActiveTabGroup("content")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTabGroup === "content"
                ? isLight ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-white/15 text-white border border-white/20"
                : isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-white/50 hover:text-white"
            }`}
          >
            📝 Content &amp; Headlines
          </button>
          <button
            type="button"
            onClick={() => setActiveTabGroup("media")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTabGroup === "media"
                ? isLight ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-white/15 text-white border border-white/20"
                : isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-white/50 hover:text-white"
            }`}
          >
            🖼️ Banner Images &amp; Focal Points
          </button>
          <button
            type="button"
            onClick={() => setActiveTabGroup("appearance")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTabGroup === "appearance"
                ? isLight ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-white/15 text-white border border-white/20"
                : isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-white/50 hover:text-white"
            }`}
          >
            🎨 Overlay Box, Colors &amp; Layout
          </button>
          <button
            type="button"
            onClick={() => setActiveTabGroup("countdown")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTabGroup === "countdown"
                ? isLight ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-white/15 text-white border border-white/20"
                : isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-white/50 hover:text-white"
            }`}
          >
            ⏰ Countdown Timer &amp; Scheduling
          </button>
        </div>

        {/* ── GROUP A & B: CONTENT & HEADLINES ── */}
        {activeTabGroup === "content" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            
            {/* Visibility & Enable Switch */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Enable Today&apos;s Deal Section on Homepage
                </h4>
                <p className="text-[11px] text-white/50 mt-0.5">
                  When disabled, the section is completely removed from the homepage without leaving empty whitespace.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
              </label>
            </div>

            {/* Content Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                  Eyebrow Tagline
                </label>
                <input
                  type="text"
                  value={settings.eyebrow}
                  onChange={(e) => setSettings({ ...settings, eyebrow: e.target.value })}
                  placeholder="TODAY'S DEAL"
                  className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                  Main Headline
                </label>
                <input
                  type="text"
                  value={settings.heading}
                  onChange={(e) => setSettings({ ...settings, heading: e.target.value })}
                  placeholder="Today Only. Better Prices."
                  className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  placeholder="Limited-time savings on selected devices & accessories."
                  className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 resize-none font-medium text-xs"
                />
              </div>

              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                  CTA Button Label
                </label>
                <input
                  type="text"
                  value={settings.ctaLabel}
                  onChange={(e) => setSettings({ ...settings, ctaLabel: e.target.value })}
                  placeholder="Shop Today's Deals"
                  className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                  CTA Destination URL
                </label>
                <input
                  type="text"
                  value={settings.ctaUrl}
                  onChange={(e) => setSettings({ ...settings, ctaUrl: e.target.value })}
                  placeholder="/products"
                  className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                  Entire Banner Link (Optional)
                </label>
                <input
                  type="text"
                  value={settings.bannerUrl || ""}
                  onChange={(e) => setSettings({ ...settings, bannerUrl: e.target.value })}
                  placeholder="/products"
                  className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.openInNewTab}
                    onChange={(e) => setSettings({ ...settings, openInNewTab: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600" />
                </label>
                <span className="text-xs font-bold text-white/80">Open Links in New Tab</span>
              </div>
            </div>
          </div>
        )}

        {/* ── GROUP C: BANNER IMAGES & BACKGROUND MODES ── */}
        {activeTabGroup === "media" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            
            {/* ── BANNER SIZE / ASPECT RATIO SELECTOR ── */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-red-400" /> Today's Deal Banner Size &amp; Aspect Ratio
                  </h4>
                  <p className="text-[11px] text-white/50">
                    Select the aspect ratio / frame dimension for the Today's Deal showcase on the homepage.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono text-[10px] font-bold">
                  {settings.bannerSizeRatio || "default"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                {[
                  { id: "1080x1440", label: "1080 × 1440", badge: "⭐ Recommended", desc: "3:4 Portrait Poster • Official Live Store Standard" },
                  { id: "default", label: "Default", badge: "Auto Fit", desc: "Equal Height 50/50 Split Frame" },
                  { id: "1080x1080", label: "1080 × 1080", badge: "1:1 Square", desc: "Square Poster & Product Focus" },
                  { id: "860x270", label: "860 × 270", badge: "~3.2:1 Strip", desc: "Horizontal Banner" },
                  { id: "1920x850", label: "1920 × 850", badge: "~2.3:1 Wide", desc: "Panoramic Landscape Poster" },
                ].map((preset) => {
                  const isSelected = (settings.bannerSizeRatio || "1080x1440") === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, bannerSizeRatio: preset.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-red-600/20 border-red-500 text-white shadow-md ring-1 ring-red-500"
                          : "bg-black/30 border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-white">{preset.label}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isSelected ? "bg-red-500 text-white" : "bg-white/10 text-white/50"}`}>
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] leading-tight text-white/50 line-clamp-2">
                        {preset.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Banner Mode Switcher */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                    Banner Background Mode
                  </h4>
                  <p className="text-[11px] text-white/50">
                    Choose between a full-width background photo or a custom background color with a floating square product image.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, bannerMode: "full_image" })}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    (settings.bannerMode || "full_image") === "full_image"
                      ? "bg-blue-600/15 border-blue-500 text-white shadow-lg"
                      : "bg-black/30 border-white/10 text-white/50 hover:border-white/20"
                  }`}
                >
                  <div className="font-extrabold text-xs text-white flex items-center justify-between">
                    <span>1. Full-Width Background Photo</span>
                    {(settings.bannerMode || "full_image") === "full_image" && (
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Upload a high-resolution wide lifestyle or campaign image spanning the entire banner.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, bannerMode: "custom_bg_with_square_image" })}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    settings.bannerMode === "custom_bg_with_square_image"
                      ? "bg-red-600/15 border-red-500 text-white shadow-lg"
                      : "bg-black/30 border-white/10 text-white/50 hover:border-white/20"
                  }`}
                >
                  <div className="font-extrabold text-xs text-white flex items-center justify-between">
                    <span>2. Background Color + Square Product Asset</span>
                    {settings.bannerMode === "custom_bg_with_square_image" && (
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Pick custom background colors/gradients and align a square product visual on top.
                  </p>
                </button>
              </div>
            </div>

            {/* ── FULL BACKGROUND BANNER BEHIND BOTH CARDS ── */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-400" /> Full Background Banner (Behind Both Cards)
                  </h4>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Add a wide background banner behind both floating cards with customizable opacity overlay.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.backgroundBannerEnabled || false}
                    onChange={(e) => setSettings({ ...settings, backgroundBannerEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>

              {settings.backgroundBannerEnabled && (
                <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/60 font-bold uppercase tracking-wider mb-1">
                        Background Banner URL
                      </label>
                      <input
                        type="text"
                        value={settings.backgroundBannerUrl || ""}
                        onChange={(e) => setSettings({ ...settings, backgroundBannerUrl: e.target.value })}
                        placeholder="/Street Mobile (980 x 360 px) (1240 x 472 px).png or uploaded URL"
                        className="w-full bg-black/40 border border-white/10 px-3.5 py-2.5 rounded-xl text-white outline-none focus:border-indigo-500 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-white/60 font-bold uppercase tracking-wider mb-1">
                        Upload Background Banner Image
                      </label>
                      <input
                        type="file"
                        id="bgBannerDealImageUpload"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "bgBanner")}
                        className="hidden"
                      />
                      <label
                        htmlFor="bgBannerDealImageUpload"
                        className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 border border-white/10"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-400" />
                        {uploadingBgBanner ? "Uploading Background..." : "Upload Background Banner"}
                      </label>
                    </div>
                  </div>

                  {/* Darkness Overlay & Border Radius Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-white/60 font-bold uppercase tracking-wider">
                          Background Dark Overlay Tint
                        </label>
                        <span className="font-mono text-indigo-400 font-bold">
                          {settings.backgroundBannerOverlayOpacity ?? 30}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        step="5"
                        value={settings.backgroundBannerOverlayOpacity ?? 30}
                        onChange={(e) => setSettings({ ...settings, backgroundBannerOverlayOpacity: Number(e.target.value) })}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                        <span>0% (Bright Original)</span>
                        <span>30% (Recommended)</span>
                        <span>90% (Very Dark)</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-white/60 font-bold uppercase tracking-wider">
                          Background Container Border Radius
                        </label>
                        <span className="font-mono text-indigo-400 font-bold">
                          {settings.backgroundBannerBorderRadius ?? 0}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="48"
                        step="4"
                        value={settings.backgroundBannerBorderRadius ?? 0}
                        onChange={(e) => setSettings({ ...settings, backgroundBannerBorderRadius: Number(e.target.value) })}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                        <span>0px (Sharp Full Bleed)</span>
                        <span>24px (Rounded)</span>
                        <span>48px (Pill)</span>
                      </div>
                    </div>
                  </div>

                  {settings.backgroundBannerUrl && (
                    <div className="relative rounded-xl overflow-hidden h-24 border border-white/10">
                      <img
                        src={settings.backgroundBannerUrl}
                        alt="Background Banner Preview"
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: `rgba(0, 0, 0, ${(settings.backgroundBannerOverlayOpacity ?? 30) / 100})` }}
                      />
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, backgroundBannerUrl: "", backgroundBannerEnabled: false })}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                        title="Remove Background Banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── MODE 1: FULL-WIDTH BACKGROUND PHOTO ── */}
            {(settings.bannerMode || "full_image") === "full_image" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs animate-in fade-in-50 duration-200">
                {/* Desktop Banner Image */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-blue-400" /> Desktop Banner Image
                    </h4>
                    <span className="text-[10px] font-bold text-white/40">1600 × 800 px (2:1)</span>
                  </div>

                  <div>
                    <label className="block text-white/60 font-bold uppercase tracking-wider mb-1">Image URL</label>
                    <input
                      type="text"
                      value={settings.desktopImageUrl}
                      onChange={(e) => setSettings({ ...settings, desktopImageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-black/40 border border-white/10 px-3.5 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <input
                      type="file"
                      id="desktopDealImageUpload"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "desktop")}
                      className="hidden"
                    />
                    <label
                      htmlFor="desktopDealImageUpload"
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 border border-white/10"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      {uploadingDesktop ? "Uploading Image..." : "Upload Desktop Banner"}
                    </label>
                  </div>

                  {/* Desktop Banner Image Live Thumbnail Preview */}
                  {settings.desktopImageUrl && (
                    <div className="relative rounded-xl overflow-hidden h-28 border border-white/10 group bg-black/50">
                      <img
                        src={settings.desktopImageUrl}
                        alt="Desktop Banner Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-2.5">
                        <span className="text-[10px] text-white/90 font-mono truncate max-w-[200px]">
                          {settings.desktopImageUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, desktopImageUrl: "" })}
                          className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                          title="Remove Desktop Banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Focal Position Selector */}
                  <div>
                    <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                      Desktop Focal Position
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["left", "center", "right"] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setSettings({ ...settings, desktopFocalPosition: pos })}
                          className={`py-2 rounded-xl font-bold uppercase text-[11px] transition-all capitalize cursor-pointer ${
                            settings.desktopFocalPosition === pos
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-white/5 text-white/50 hover:text-white"
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile Banner Image */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" /> Mobile Banner Image (Optional)
                    </h4>
                    <span className="text-[10px] font-bold text-white/40">900 × 1100 px</span>
                  </div>

                  <div>
                    <label className="block text-white/60 font-bold uppercase tracking-wider mb-1">Mobile Image URL</label>
                    <input
                      type="text"
                      value={settings.mobileImageUrl || ""}
                      onChange={(e) => setSettings({ ...settings, mobileImageUrl: e.target.value })}
                      placeholder="Leave empty to use desktop banner"
                      className="w-full bg-black/40 border border-white/10 px-3.5 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <input
                      type="file"
                      id="mobileDealImageUpload"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "mobile")}
                      className="hidden"
                    />
                    <label
                      htmlFor="mobileDealImageUpload"
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 border border-white/10"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      {uploadingMobile ? "Uploading Image..." : "Upload Mobile Banner"}
                    </label>
                  </div>

                  {/* Mobile Banner Image Live Thumbnail Preview */}
                  {settings.mobileImageUrl && (
                    <div className="relative rounded-xl overflow-hidden h-28 border border-white/10 group bg-black/50">
                      <img
                        src={settings.mobileImageUrl}
                        alt="Mobile Banner Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-2.5">
                        <span className="text-[10px] text-white/90 font-mono truncate max-w-[200px]">
                          {settings.mobileImageUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, mobileImageUrl: "" })}
                          className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                          title="Remove Mobile Banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mobile Focal Position Selector */}
                  <div>
                    <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                      Mobile Focal Position
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["left", "center", "right"] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setSettings({ ...settings, mobileFocalPosition: pos })}
                          className={`py-2 rounded-xl font-bold uppercase text-[11px] transition-all capitalize cursor-pointer ${
                            settings.mobileFocalPosition === pos
                              ? "bg-emerald-600 text-white shadow-md"
                              : "bg-white/5 text-white/50 hover:text-white"
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODE 2: CUSTOM BACKGROUND COLOR + SQUARE PRODUCT IMAGE ── */}
            {settings.bannerMode === "custom_bg_with_square_image" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                  
                  {/* Background Color / Gradient Setup */}
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                    <h4 className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Banner Base Background
                    </h4>

                    {/* Bg Type Switcher */}
                    <div className="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, bannerBgType: "solid" })}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          (settings.bannerBgType || "solid") === "solid"
                            ? "bg-white text-black shadow"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        Solid Color
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, bannerBgType: "gradient" })}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          settings.bannerBgType === "gradient"
                            ? "bg-white text-black shadow"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        Linear Gradient
                      </button>
                    </div>

                    {/* Solid Color Controls */}
                    {(settings.bannerBgType || "solid") === "solid" ? (
                      <div className="space-y-3">
                        <label className="block text-white/60 font-bold mb-1">Pick Solid Background Color</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={settings.bannerBgColor || "#090909"}
                            onChange={(e) => setSettings({ ...settings, bannerBgColor: e.target.value })}
                            className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={settings.bannerBgColor || "#090909"}
                            onChange={(e) => setSettings({ ...settings, bannerBgColor: e.target.value })}
                            className="flex-1 bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-white font-mono text-xs"
                          />
                        </div>

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-white/40">Presets:</span>
                          {[
                            { name: "Onyx Black", hex: "#090909" },
                            { name: "Midnight Slate", hex: "#0F172A" },
                            { name: "Deep Indigo", hex: "#1E1B4B" },
                            { name: "Ruby Crimson", hex: "#450A0A" },
                            { name: "Emerald Pine", hex: "#064E3B" },
                            { name: "Cobalt Blue", hex: "#172554" },
                          ].map((p) => (
                            <button
                              key={p.hex}
                              type="button"
                              onClick={() => setSettings({ ...settings, bannerBgColor: p.hex })}
                              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[10px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: p.hex }} />
                              <span>{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Gradient Controls */
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-white/60 font-bold mb-1">Gradient Start</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={settings.bannerBgGradientFrom || "#0F172A"}
                                onChange={(e) => setSettings({ ...settings, bannerBgGradientFrom: e.target.value })}
                                className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={settings.bannerBgGradientFrom || "#0F172A"}
                                onChange={(e) => setSettings({ ...settings, bannerBgGradientFrom: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-lg text-white font-mono text-[11px]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-white/60 font-bold mb-1">Gradient End</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={settings.bannerBgGradientTo || "#020617"}
                                onChange={(e) => setSettings({ ...settings, bannerBgGradientTo: e.target.value })}
                                className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={settings.bannerBgGradientTo || "#020617"}
                                onChange={(e) => setSettings({ ...settings, bannerBgGradientTo: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 px-2 py-1.5 rounded-lg text-white font-mono text-[11px]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Gradient Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-white/40">Presets:</span>
                          {[
                            { name: "Midnight Slate", from: "#0F172A", to: "#020617" },
                            { name: "Crimson Blaze", from: "#7F1D1D", to: "#18181B" },
                            { name: "Deep Amethyst", from: "#312E81", to: "#0F172A" },
                            { name: "Cyber Teal", from: "#134E4A", to: "#020617" },
                          ].map((p) => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => setSettings({ ...settings, bannerBgGradientFrom: p.from, bannerBgGradientTo: p.to })}
                              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Square Product Image Setup & Alignment */}
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-400" /> Square Product Image Asset
                      </h4>
                      <span className="text-[10px] font-bold text-white/40">1:1 Square (PNG / JPG)</span>
                    </div>

                    <div>
                      <label className="block text-white/60 font-bold uppercase tracking-wider mb-1">Square Image URL</label>
                      <input
                        type="text"
                        value={settings.squareImageUrl || ""}
                        onChange={(e) => setSettings({ ...settings, squareImageUrl: e.target.value })}
                        placeholder="https://images.unsplash.com/... or transparent PNG"
                        className="w-full bg-black/40 border border-white/10 px-3.5 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <input
                        type="file"
                        id="squareDealImageUpload"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "square")}
                        className="hidden"
                      />
                      <label
                        htmlFor="squareDealImageUpload"
                        className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 border border-white/10"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        {uploadingSquare ? "Uploading Square Image..." : "Upload Square Image"}
                      </label>
                    </div>

                    {/* Square Product Image Live Thumbnail Preview */}
                    {settings.squareImageUrl && (
                      <div className="relative rounded-xl overflow-hidden h-28 border border-white/10 group bg-black/50 flex items-center justify-center">
                        <img
                          src={settings.squareImageUrl}
                          alt="Square Product Preview"
                          className="h-full w-auto object-contain"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-2.5">
                          <span className="text-[10px] text-white/90 font-mono truncate max-w-[200px]">
                            {settings.squareImageUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, squareImageUrl: "" })}
                            className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                            title="Remove Square Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Square Image Alignment Selector */}
                    <div>
                      <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                        Image Alignment on Desktop
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["left", "center", "right"] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setSettings({ ...settings, squareImagePosition: pos })}
                            className={`py-2 rounded-xl font-bold uppercase text-[11px] transition-all capitalize cursor-pointer ${
                              (settings.squareImagePosition || "right") === pos
                                ? "bg-emerald-600 text-white shadow-md"
                                : "bg-white/5 text-white/50 hover:text-white"
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Size & Border Radius Sliders */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <div className="flex items-center justify-between text-white/60 mb-1">
                          <span className="font-bold">Image Scale</span>
                          <span className="font-mono text-white">{settings.squareImageSize || 42}%</span>
                        </div>
                        <input
                          type="range"
                          min="25"
                          max="55"
                          step="1"
                          value={settings.squareImageSize || 42}
                          onChange={(e) => setSettings({ ...settings, squareImageSize: Number(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-white/60 mb-1">
                          <span className="font-bold">Border Radius</span>
                          <span className="font-mono text-white">{settings.squareImageBorderRadius ?? 16}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="36"
                          step="2"
                          value={settings.squareImageBorderRadius ?? 16}
                          onChange={(e) => setSettings({ ...settings, squareImageBorderRadius: Number(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ── CARD & FRAME SIZING / FULL FIT CONTROLS ── */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-5 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" /> Frame Size &amp; Image Fit Controls
                </h4>
                <span className="text-[10px] font-bold text-white/50">Customizable Frame &amp; Poster Fit</span>
              </div>

              {/* 1. Image Fit Mode */}
              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-2">
                  Image Fit Mode in Frame
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "cover", label: "🖼️ Cover (Full Edge-to-Edge)", desc: "Fills card with zero white borders" },
                    { id: "contain", label: "🔍 Contain (Fit Entire Image)", desc: "Keeps full aspect ratio visible" },
                    { id: "fill", label: "↔️ Stretch Fill", desc: "Stretches to frame dimensions" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, imageFit: mode.id as any })}
                      className={`p-3 rounded-xl text-left font-bold transition-all cursor-pointer border ${
                        (settings.imageFit || "cover") === mode.id
                          ? "bg-purple-600 text-white border-purple-400 shadow-md"
                          : "bg-white/5 text-white/60 hover:text-white border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs">{mode.label}</div>
                      <div className="text-[10px] font-normal opacity-70 mt-0.5">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Card Padding */}
              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-2">
                  Frame Inner Padding
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "none", label: "No Padding (0px)", sub: "Full Bleed" },
                    { id: "compact", label: "Compact (16px)", sub: "Tight" },
                    { id: "normal", label: "Normal (24px)", sub: "Standard" },
                    { id: "spacious", label: "Spacious (40px)", sub: "Wide" },
                  ].map((pad) => (
                    <button
                      key={pad.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, cardPadding: pad.id as any })}
                      className={`py-2.5 px-3 rounded-xl font-bold text-center text-xs transition-all cursor-pointer border ${
                        (settings.cardPadding || "none") === pad.id
                          ? "bg-purple-600 text-white border-purple-400 shadow-md"
                          : "bg-white/5 text-white/60 hover:text-white border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div>{pad.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Frame Height Slider + Corner Radius */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-wider">
                      Frame Height
                    </label>
                    <span className="font-mono text-purple-400 font-bold">
                      {settings.frameHeight || 480}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="320"
                    max="650"
                    step="10"
                    value={settings.frameHeight || 480}
                    onChange={(e) => setSettings({ ...settings, frameHeight: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                    <span>320px (Compact)</span>
                    <span>480px (Default)</span>
                    <span>650px (Tall)</span>
                  </div>
                </div>

                {/* 4. Frame Corner Radius */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-wider">
                      Frame Corner Radius
                    </label>
                    <span className="font-mono text-purple-400 font-bold">
                      {settings.frameBorderRadius ?? 36}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    step="2"
                    value={settings.frameBorderRadius ?? 36}
                    onChange={(e) => setSettings({ ...settings, frameBorderRadius: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                    <span>12px (Subtle)</span>
                    <span>36px (Default)</span>
                    <span>48px (Ultra Smooth)</span>
                  </div>
                </div>
              </div>

              {/* 5. Image Zoom / Scale */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-white/60 font-bold uppercase tracking-wider">
                    Image Scale / Zoom
                  </label>
                  <span className="font-mono text-purple-400 font-bold">
                    {settings.imageScale ?? 100}%
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="130"
                  step="5"
                  value={settings.imageScale ?? 100}
                  onChange={(e) => setSettings({ ...settings, imageScale: Number(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/60 font-bold uppercase tracking-wider text-xs mb-1.5">
                Accessible Image Alt Text (SEO)
              </label>
              <input
                type="text"
                value={settings.imageAlt}
                onChange={(e) => setSettings({ ...settings, imageAlt: e.target.value })}
                placeholder="Today's Deal promotional devices and accessories"
                className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-medium text-xs"
              />
            </div>
          </div>
        )}

        {/* ── GROUP D: OVERLAY BOX, COLORS & LAYOUT ── */}
        {activeTabGroup === "appearance" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            
            {/* Color Pickers Matrix */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Color Customization (HEX &amp; Color Pickers)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                
                {/* Box Background */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Box Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.boxBackgroundColor || "#090909"}
                      onChange={(e) => setSettings({ ...settings, boxBackgroundColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.boxBackgroundColor}
                      onChange={(e) => setSettings({ ...settings, boxBackgroundColor: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Heading Color */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Heading Text</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.headingColor || "#FFFFFF"}
                      onChange={(e) => setSettings({ ...settings, headingColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.headingColor}
                      onChange={(e) => setSettings({ ...settings, headingColor: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Description Color */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Description Text</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.descriptionColor || "#E5E5E5"}
                      onChange={(e) => setSettings({ ...settings, descriptionColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.descriptionColor}
                      onChange={(e) => setSettings({ ...settings, descriptionColor: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Eyebrow / Live Dot */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Eyebrow &amp; Live Dot</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.eyebrowColor || "#ED0712"}
                      onChange={(e) => setSettings({ ...settings, eyebrowColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.eyebrowColor}
                      onChange={(e) => setSettings({ ...settings, eyebrowColor: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* CTA Background */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">CTA Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.ctaBackgroundColor || "#ED0712"}
                      onChange={(e) => setSettings({ ...settings, ctaBackgroundColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.ctaBackgroundColor}
                      onChange={(e) => setSettings({ ...settings, ctaBackgroundColor: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* CTA Text Color */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">CTA Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.ctaTextColor || "#FFFFFF"}
                      onChange={(e) => setSettings({ ...settings, ctaTextColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.ctaTextColor}
                      onChange={(e) => setSettings({ ...settings, ctaTextColor: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Countdown Background */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Timer Box Bg</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.countdownBackgroundColor || "#FFFFFF"}
                      onChange={(e) => setSettings({ ...settings, countdownBackgroundColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.countdownBackgroundColor}
                      onChange={(e) => setSettings({ ...settings, countdownBackgroundColor: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Countdown Text Color */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Timer Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.countdownTextColor || "#090909"}
                      onChange={(e) => setSettings({ ...settings, countdownTextColor: e.target.value })}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.countdownTextColor}
                      onChange={(e) => setSettings({ ...settings, countdownTextColor: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Box Positioning & Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              
              {/* Horizontal Position */}
              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-2">
                  Box Position (Horizontal)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["left", "center", "right"] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setSettings({ ...settings, boxPosition: pos })}
                      className={`py-2.5 rounded-xl font-bold uppercase text-[11px] transition-all capitalize ${
                        settings.boxPosition === pos ? "bg-red-600 text-white shadow-md" : "bg-white/5 text-white/50 hover:text-white"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vertical Alignment */}
              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-2">
                  Vertical Alignment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["top", "center", "bottom"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setSettings({ ...settings, verticalAlignment: align })}
                      className={`py-2.5 rounded-xl font-bold uppercase text-[11px] transition-all capitalize ${
                        settings.verticalAlignment === align ? "bg-red-600 text-white shadow-md" : "bg-white/5 text-white/50 hover:text-white"
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Layout Mode */}
              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-2">
                  Mobile Layout Mode (&lt; 768px)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, mobileLayout: "stacked" })}
                    className={`py-2.5 rounded-xl font-bold uppercase text-[11px] transition-all ${
                      settings.mobileLayout === "stacked" ? "bg-red-600 text-white shadow-md" : "bg-white/5 text-white/50 hover:text-white"
                    }`}
                  >
                    Stacked (Clean)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, mobileLayout: "overlay" })}
                    className={`py-2.5 rounded-xl font-bold uppercase text-[11px] transition-all ${
                      settings.mobileLayout === "overlay" ? "bg-red-600 text-white shadow-md" : "bg-white/5 text-white/50 hover:text-white"
                    }`}
                  >
                    Overlay
                  </button>
                </div>
              </div>

              {/* Box Width Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-white/60 font-bold">
                  <span>Box Width (Desktop)</span>
                  <span className="text-white">{settings.boxWidth ?? 40}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="60"
                  value={settings.boxWidth ?? 40}
                  onChange={(e) => setSettings({ ...settings, boxWidth: Number(e.target.value) })}
                  className="w-full accent-red-600"
                />
              </div>

              {/* Box Opacity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-white/60 font-bold">
                  <span>Box Opacity</span>
                  <span className="text-white">{settings.boxBackgroundOpacity ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={settings.boxBackgroundOpacity ?? 100}
                  onChange={(e) => setSettings({ ...settings, boxBackgroundOpacity: Number(e.target.value) })}
                  className="w-full accent-red-600"
                />
              </div>

              {/* Dark Image Overlay */}
              <div className="space-y-1">
                <div className="flex justify-between text-white/60 font-bold">
                  <span>Image Dark Tint Overlay</span>
                  <span className="text-white">{settings.imageOverlayOpacity ?? 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={settings.imageOverlayOpacity ?? 0}
                  onChange={(e) => setSettings({ ...settings, imageOverlayOpacity: Number(e.target.value) })}
                  className="w-full accent-red-600"
                />
              </div>

              {/* Corner Radius */}
              <div className="space-y-1">
                <div className="flex justify-between text-white/60 font-bold">
                  <span>Border Radius</span>
                  <span className="text-white">{settings.borderRadius ?? 8}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={settings.borderRadius ?? 8}
                  onChange={(e) => setSettings({ ...settings, borderRadius: Number(e.target.value) })}
                  className="w-full accent-red-600"
                />
              </div>

              {/* Box Padding */}
              <div className="space-y-1">
                <div className="flex justify-between text-white/60 font-bold">
                  <span>Internal Padding</span>
                  <span className="text-white">{settings.boxPadding ?? 32}px</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="48"
                  value={settings.boxPadding ?? 32}
                  onChange={(e) => setSettings({ ...settings, boxPadding: Number(e.target.value) })}
                  className="w-full accent-red-600"
                />
              </div>

            </div>
          </div>
        )}

        {/* ── GROUP E: COUNTDOWN TIMER & EXPIRY ── */}
        {activeTabGroup === "countdown" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200 text-xs">
            
            {/* Enable Countdown Switch */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Enable Live Countdown Timer
                </h4>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Calculates time based on Asia/Colombo timezone without client hydration mismatches.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.countdownEnabled}
                  onChange={(e) => setSettings({ ...settings, countdownEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
              </label>
            </div>

            {/* Date Time Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                  Start Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocal(settings.startsAt)}
                  onChange={(e) => setSettings({ ...settings, startsAt: fromDateTimeLocal(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                  End Date &amp; Time (Expiry)
                </label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocal(settings.endsAt)}
                  onChange={(e) => setSettings({ ...settings, endsAt: fromDateTimeLocal(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                  Timezone Standard
                </label>
                <select
                  value={settings.timezone || "Asia/Colombo"}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-red-500 font-bold text-xs"
                >
                  <option value="Asia/Colombo" className="bg-[#0F172A]">Asia/Colombo (Sri Lanka Time, GMT+5:30)</option>
                  <option value="Asia/Dubai" className="bg-[#0F172A]">Asia/Dubai (GST, GMT+4)</option>
                  <option value="UTC" className="bg-[#0F172A]">UTC / GMT Standard</option>
                </select>
              </div>
            </div>

            {/* Quick Timer Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-white/50">⚡ Quick Timer Presets:</span>
              {[
                {
                  label: "🌙 Midnight Tonight (11:59 PM)",
                  getDates: () => {
                    const now = new Date();
                    const end = new Date();
                    end.setHours(23, 59, 59, 999);
                    return { startsAt: now.toISOString(), endsAt: end.toISOString() };
                  },
                },
                {
                  label: "🚀 +24 Hours",
                  getDates: () => {
                    const now = new Date();
                    const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    return { startsAt: now.toISOString(), endsAt: end.toISOString() };
                  },
                },
                {
                  label: "⚡ +12 Hours",
                  getDates: () => {
                    const now = new Date();
                    const end = new Date(Date.now() + 12 * 60 * 60 * 1000);
                    return { startsAt: now.toISOString(), endsAt: end.toISOString() };
                  },
                },
                {
                  label: "📅 +7 Days",
                  getDates: () => {
                    const now = new Date();
                    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    return { startsAt: now.toISOString(), endsAt: end.toISOString() };
                  },
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const { startsAt, endsAt } = preset.getDates();
                    setSettings((prev) => ({ ...prev, startsAt, endsAt, countdownEnabled: true }));
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Expiry Behavior Selector */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" /> Expiry Behavior (What happens when timer reaches 00:00:00)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: "hide", label: "Hide Complete Section (Recommended)", desc: "Automatically removes section without leaving any empty whitespace" },
                  { id: "deal-ended", label: 'Show "Deal Ended"', desc: "Keeps banner visible with closed deal status" },
                  { id: "replacement-cta", label: "Replace with Another CTA", desc: "Swaps button link & label to browse catalog" },
                  { id: "keep-banner", label: "Keep Banner Visible", desc: "Hides timer only, banner stays clickable" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, expiryAction: item.id as any })}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      settings.expiryAction === item.id
                        ? "bg-red-600/20 border-red-500 text-white"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    <span className="font-extrabold text-white text-xs">{item.label}</span>
                    <span className="text-[10px] text-white/40 mt-1">{item.desc}</span>
                  </button>
                ))}
              </div>

              {settings.expiryAction === "replacement-cta" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-white/60 font-bold uppercase tracking-wider mb-1">
                      Replacement CTA Label
                    </label>
                    <input
                      type="text"
                      value={settings.replacementCtaLabel || ""}
                      onChange={(e) => setSettings({ ...settings, replacementCtaLabel: e.target.value })}
                      placeholder="Browse All Deals"
                      className="w-full bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-red-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 font-bold uppercase tracking-wider mb-1">
                      Replacement CTA URL
                    </label>
                    <input
                      type="text"
                      value={settings.replacementCtaUrl || ""}
                      onChange={(e) => setSettings({ ...settings, replacementCtaUrl: e.target.value })}
                      placeholder="/products"
                      className="w-full bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-red-500 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
