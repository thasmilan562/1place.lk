"use client";

import React, { useState, useEffect } from "react";
import { Review, GoogleReviewsSettings } from "@/lib/types";
import { DEFAULT_GOOGLE_REVIEWS_SETTINGS } from "@/lib/firestore-client";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Star,
  Eye,
  EyeOff,
  CircleCheck as Sparkles,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Save,
  CheckCircle2,
  Sliders,
  Gauge,
  Hand,
  ArrowLeftRight,
  Monitor,
  Smartphone,
  RotateCcw,
} from "lucide-react";
import { db } from "@/lib/admin-firebase";
import { doc, setDoc } from "firebase/firestore";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

interface ReviewsTabProps {
  reviews: Review[];
  settings: GoogleReviewsSettings;
  onAdd: () => void;
  onEdit: (review: Review) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, currentVisible: boolean) => void;
  onToggleFeatured: (id: string, currentFeatured: boolean) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onSaveSettings: (newSettings: GoogleReviewsSettings) => void;
}

export default function ReviewsTab({
  reviews,
  settings,
  onAdd,
  onEdit,
  onDelete,
  onToggleVisibility,
  onToggleFeatured,
  onReorder,
  onSaveSettings,
}: ReviewsTabProps) {
  const { isLight } = useAdminTheme();

  // Settings Form State
  const [googleSettings, setGoogleSettings] = useState<GoogleReviewsSettings>(() => ({
    ...DEFAULT_GOOGLE_REVIEWS_SETTINGS,
    ...(settings || {}),
  }));

  useEffect(() => {
    if (settings) {
      setGoogleSettings((prev) => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<"general" | "animation">("general");

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "featured" | "visible" | "hidden">("all");

  const handleSaveGoogleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "google_reviews"), googleSettings, { merge: true });
      onSaveSettings(googleSettings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (e) {
      console.error("Error saving Google Reviews settings:", e);
      alert("Failed to save Google Reviews settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetAnimationDefaults = () => {
    setGoogleSettings((prev) => ({
      ...prev,
      endlessScrollEnabled: true,
      autoplayEnabled: true,
      direction: "right",
      desktopSpeed: 36,
      tabletSpeed: 28,
      mobileSpeed: 20,
      pauseOnHover: true,
      pauseOnFocus: true,
      pauseOnInteraction: true,
      resumeDelay: 1500,
      dragEnabled: true,
      edgeFadeEnabled: true,
      edgeFadeWidth: 60,
      edgeFadeColor: "#FFFFFF",
    }));
  };

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      (r.author_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.text || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === "featured") return !!r.featured;
    if (filterType === "visible") return r.visible !== false;
    if (filterType === "hidden") return r.visible === false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Homepage Section Visibility Switch ── */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
          googleSettings.enabled !== false
            ? isLight
              ? "bg-amber-50/70 border-amber-200/80 shadow-xs"
              : "bg-amber-950/20 border-amber-500/30 shadow-xs shadow-amber-500/5"
            : isLight
            ? "bg-slate-100 border-slate-200 opacity-80"
            : "bg-white/[0.03] border-white/[0.08] opacity-75"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Star className={`w-4 h-4 ${googleSettings.enabled !== false ? "text-amber-500 fill-amber-500" : isLight ? "text-slate-400" : "text-slate-500"}`} />
            <span className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
              Homepage Google Reviews Section
            </span>
          </div>
          <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            {googleSettings.enabled !== false
              ? `VISIBLE ON HOMEPAGE • Displays customer ratings & reviews marquee on 1place.lk`
              : "HIDDEN • Google Reviews section is currently hidden from the homepage"}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={googleSettings.enabled !== false}
              onChange={async (e) => {
                const nextVal = e.target.checked;
                setGoogleSettings((prev) => ({ ...prev, enabled: nextVal }));
                try {
                  await setDoc(doc(db, "settings", "google_reviews"), { ...googleSettings, enabled: nextVal }, { merge: true });
                  onSaveSettings({ ...googleSettings, enabled: nextVal });
                } catch (err) {
                  console.error("Error updating reviews visibility:", err);
                }
              }}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
              isLight ? "bg-slate-300 peer-checked:bg-amber-500" : "bg-slate-800 peer-checked:bg-amber-500"
            } peer-checked:after:translate-x-full peer-checked:after:border-white shadow-inner`} />
          </label>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <h1 className={`text-xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Google Reviews Management
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Curate customer reviews, ratings, and configure marquee scrolling behavior with zero API costs.
          </p>
        </div>

        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-[0.99] shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Manual Review
        </button>
      </div>

      {/* ── Overall Google Rating & Scroll Settings ── */}
      <form
        onSubmit={handleSaveGoogleSettings}
        className={`border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}
      >
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${
          isLight ? "border-slate-200" : "border-white/[0.08]"
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className={`font-semibold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
              Ratings &amp; Motion Controls
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex p-1 rounded-xl border ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.04] border-white/[0.08]"
            }`}>
              <button
                type="button"
                onClick={() => setSettingsSubTab("general")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  settingsSubTab === "general"
                    ? isLight
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "bg-[#2563EB] text-white shadow-xs"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Branding &amp; URLs
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("animation")}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  settingsSubTab === "animation"
                    ? isLight
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "bg-[#2563EB] text-white shadow-xs"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Marquee Rails
              </button>
            </div>
          </div>
        </div>

        {/* SUBTAB 1: GENERAL BRANDING */}
        {settingsSubTab === "general" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Overall Rating (e.g. 4.9)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={googleSettings.overall_rating}
                onChange={(e) => setGoogleSettings({ ...googleSettings, overall_rating: Number(e.target.value) })}
                className={`w-full border rounded-xl px-3.5 py-2 text-xs font-semibold outline-none transition-colors ${
                  isLight
                    ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 focus:border-blue-600 focus:bg-white"
                    : "bg-[#0B111A] border-white/[0.08] text-white focus:border-blue-500"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Total Reviews Count
              </label>
              <input
                type="number"
                value={googleSettings.total_reviews_count}
                onChange={(e) => setGoogleSettings({ ...googleSettings, total_reviews_count: Number(e.target.value) })}
                className={`w-full border rounded-xl px-3.5 py-2 text-xs font-semibold outline-none transition-colors ${
                  isLight
                    ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 focus:border-blue-600 focus:bg-white"
                    : "bg-[#0B111A] border-white/[0.08] text-white focus:border-blue-500"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                &ldquo;Write a Review&rdquo; URL
              </label>
              <input
                type="url"
                placeholder="https://g.page/r/..."
                value={googleSettings.write_review_url}
                onChange={(e) => setGoogleSettings({ ...googleSettings, write_review_url: e.target.value })}
                className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono outline-none transition-colors ${
                  isLight
                    ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 focus:border-blue-600 focus:bg-white"
                    : "bg-[#0B111A] border-white/[0.08] text-white focus:border-blue-500"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                &ldquo;View All Reviews&rdquo; URL
              </label>
              <input
                type="url"
                placeholder="https://maps.google.com/..."
                value={googleSettings.view_all_reviews_url}
                onChange={(e) => setGoogleSettings({ ...googleSettings, view_all_reviews_url: e.target.value })}
                className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono outline-none transition-colors ${
                  isLight
                    ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 focus:border-blue-600 focus:bg-white"
                    : "bg-[#0B111A] border-white/[0.08] text-white focus:border-blue-500"
                }`}
              />
            </div>
          </div>
        )}

        {/* SUBTAB 2: SCROLL ANIMATION */}
        {settingsSubTab === "animation" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: Movement & Speed */}
              <div className={`p-4 rounded-xl border space-y-4 ${
                isLight ? "bg-slate-50/70 border-slate-200" : "bg-white/[0.02] border-white/[0.06]"
              }`}>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  Scroll Direction &amp; Speed
                </span>

                {/* Direction Switcher */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium flex items-center gap-1.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                    Review Rail Scroll Direction
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setGoogleSettings((prev) => ({ ...prev, direction: "auto-opposite" }))}
                      className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition-all border ${
                        googleSettings.direction === "auto-opposite"
                          ? "bg-[#2563EB] text-white border-blue-600 shadow-xs"
                          : isLight
                          ? "bg-white text-slate-700 hover:text-slate-900 border-slate-200"
                          : "bg-white/[0.04] text-slate-300 hover:text-white border-white/[0.08]"
                      }`}
                    >
                      ⚡ Auto-Opposite
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleSettings((prev) => ({ ...prev, direction: "right" }))}
                      className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition-all border ${
                        googleSettings.direction === "right"
                          ? "bg-[#2563EB] text-white border-blue-600 shadow-xs"
                          : isLight
                          ? "bg-white text-slate-700 hover:text-slate-900 border-slate-200"
                          : "bg-white/[0.04] text-slate-300 hover:text-white border-white/[0.08]"
                      }`}
                    >
                      Left to Right
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleSettings((prev) => ({ ...prev, direction: "left" }))}
                      className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition-all border ${
                        googleSettings.direction === "left"
                          ? "bg-[#2563EB] text-white border-blue-600 shadow-xs"
                          : isLight
                          ? "bg-white text-slate-700 hover:text-slate-900 border-slate-200"
                          : "bg-white/[0.04] text-slate-300 hover:text-white border-white/[0.08]"
                      }`}
                    >
                      Right to Left
                    </button>
                  </div>
                </div>

                {/* Speeds */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium flex items-center gap-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      <Monitor className="w-3 h-3 text-blue-500" /> Desktop Speed
                    </span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{googleSettings.desktopSpeed ?? 36} px/s</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={googleSettings.desktopSpeed ?? 36}
                    onChange={(e) => setGoogleSettings((prev) => ({ ...prev, desktopSpeed: Number(e.target.value) }))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium flex items-center gap-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      <Smartphone className="w-3 h-3 text-amber-500" /> Mobile Speed
                    </span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{googleSettings.mobileSpeed ?? 20} px/s</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={60}
                    value={googleSettings.mobileSpeed ?? 20}
                    onChange={(e) => setGoogleSettings((prev) => ({ ...prev, mobileSpeed: Number(e.target.value) }))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right Column: Interactive Pausing & Fade */}
              <div className={`p-4 rounded-xl border space-y-4 ${
                isLight ? "bg-slate-50/70 border-slate-200" : "bg-white/[0.02] border-white/[0.06]"
              }`}>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hand className="w-3.5 h-3.5" />
                  Interaction &amp; Edge Fade
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer ${
                    isLight ? "bg-white border-slate-200 text-slate-800" : "bg-white/[0.04] border-white/[0.08] text-slate-200"
                  }`}>
                    <input
                      type="checkbox"
                      checked={googleSettings.pauseOnHover !== false}
                      onChange={(e) => setGoogleSettings((prev) => ({ ...prev, pauseOnHover: e.target.checked }))}
                      className="accent-blue-600 rounded"
                    />
                    Pause on Hover
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer ${
                    isLight ? "bg-white border-slate-200 text-slate-800" : "bg-white/[0.04] border-white/[0.08] text-slate-200"
                  }`}>
                    <input
                      type="checkbox"
                      checked={googleSettings.dragEnabled !== false}
                      onChange={(e) => setGoogleSettings((prev) => ({ ...prev, dragEnabled: e.target.checked }))}
                      className="accent-blue-600 rounded"
                    />
                    Manual Drag &amp; Swipe
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>Resume Delay</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{googleSettings.resumeDelay ?? 1500} ms</span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={4000}
                    step={100}
                    value={googleSettings.resumeDelay ?? 1500}
                    onChange={(e) => setGoogleSettings((prev) => ({ ...prev, resumeDelay: Number(e.target.value) }))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleResetAnimationDefaults}
                    className={`flex items-center gap-1 text-[11px] transition-colors ${
                      isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Animation Defaults
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`flex items-center justify-between pt-3 border-t ${
          isLight ? "border-slate-200" : "border-white/[0.08]"
        }`}>
          {settingsSuccess ? (
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Google Review settings saved!
            </span>
          ) : (
            <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Real-time sync on storefront and reviews page.
            </span>
          )}

          <button
            type="submit"
            disabled={savingSettings}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-[0.99] disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {savingSettings ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      {/* ── Controls: Search & Filter ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reviews by name or text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-xl pl-10 pr-4 py-2 text-xs outline-none transition-colors ${
              isLight
                ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 focus:border-blue-600 focus:bg-white"
                : "bg-[#0B111A] border-white/[0.08] text-white focus:border-blue-500"
            }`}
          />
        </div>

        {/* Filter Pills */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border w-full sm:w-auto overflow-x-auto ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          {(["all", "featured", "visible", "hidden"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                filterType === type
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {type} ({
                type === "all"
                  ? reviews.length
                  : type === "featured"
                  ? reviews.filter((r) => r.featured).length
                  : type === "visible"
                  ? reviews.filter((r) => r.visible !== false).length
                  : reviews.filter((r) => r.visible === false).length
              })
            </button>
          ))}
        </div>
      </div>

      {/* ── Reviews Cards Grid ── */}
      {filteredReviews.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border space-y-3 ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <p className={`text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            No Google reviews found matching your filter criteria.
          </p>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-semibold hover:bg-[#1D4ED8] transition-all"
          >
            + Add First Review
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredReviews.map((review, index) => (
            <div
              key={review.id}
              className={`group relative rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                isLight
                  ? review.visible !== false
                    ? "bg-white border-[#E2E8F0] shadow-xs hover:border-slate-300"
                    : "bg-slate-50 border-slate-200 opacity-60"
                  : review.visible !== false
                  ? "bg-[#0E141D] border-white/[0.08] hover:border-white/[0.15]"
                  : "bg-[#0E141D]/60 border-red-500/20 opacity-60"
              }`}
            >
              {/* Top Row: Author & Rating */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs ${
                      isLight ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white/[0.08] border-white/[0.08] text-white"
                    }`}>
                      {review.author_photo ? (
                        <img src={review.author_photo} alt={review.author_name} className="w-full h-full object-cover" />
                      ) : (
                        review.author_name?.charAt(0)?.toUpperCase() || "G"
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className={`font-semibold text-sm truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                          {review.author_name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">#{index + 1}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{review.review_date || "Verified Customer"}</p>
                    </div>
                  </div>

                  {/* Reorder Buttons */}
                  <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 shrink-0 ${
                    isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.04] border-white/[0.08]"
                  }`}>
                    <button
                      onClick={() => onReorder(review.id, "up")}
                      disabled={index === 0}
                      className={`p-1 disabled:opacity-20 transition-colors ${
                        isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"
                      }`}
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onReorder(review.id, "down")}
                      disabled={index === filteredReviews.length - 1}
                      className={`p-1 disabled:opacity-20 transition-colors ${
                        isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"
                      }`}
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < (review.rating || 5)
                          ? "fill-amber-400 text-amber-400"
                          : isLight
                          ? "fill-transparent text-slate-200"
                          : "fill-transparent text-white/[0.08]"
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-amber-500 ml-1">{review.rating || 5}.0</span>
                </div>

                {/* Review Text */}
                <p className={`text-xs leading-relaxed italic line-clamp-4 ${
                  isLight ? "text-slate-700" : "text-slate-300"
                }`}>
                  &ldquo;{review.text}&rdquo;
                </p>
              </div>

              {/* Bottom: Badges & Controls */}
              <div className={`pt-3 border-t space-y-3 ${
                isLight ? "border-slate-100" : "border-white/[0.08]"
              }`}>
                {/* Google Review Link indicator */}
                {review.google_url ? (
                  <a
                    href={review.google_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-mono truncate max-w-full"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{review.google_url}</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No specific Google link (uses main page)</span>
                )}

                {/* Controls Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* Featured Toggle */}
                    <button
                      onClick={() => onToggleFeatured(review.id, !review.featured)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border ${
                        review.featured
                          ? isLight
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : isLight
                          ? "bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-200"
                          : "bg-white/[0.04] text-slate-400 hover:text-white border-white/[0.08]"
                      }`}
                      title="Toggle Featured"
                    >
                      <Sparkles className="w-3 h-3" />
                      {review.featured ? "Featured" : "Feature"}
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => onToggleVisibility(review.id, review.visible !== false)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border ${
                        review.visible !== false
                          ? isLight
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : isLight
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      }`}
                      title="Toggle Visibility"
                    >
                      {review.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {review.visible !== false ? "Visible" : "Hidden"}
                    </button>
                  </div>

                  {/* Edit & Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(review)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isLight
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : "bg-white/[0.06] hover:bg-white/[0.12] text-white"
                      }`}
                      title="Edit Review"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(review.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Delete Review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

