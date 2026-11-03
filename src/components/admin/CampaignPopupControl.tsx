"use client";

import React, { useState, useEffect } from "react";
import { CircleCheck as Sparkles, Save, Check, Image as ImageIcon, Eye, Clock, Layers, Calendar, Tag, X, ArrowRight } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CampaignPopupSettings } from "@/components/ui/CampaignPopup";

export default function CampaignPopupControl() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [settings, setSettings] = useState<CampaignPopupSettings>({
    enabled: false,
    pageTargeting: "all",
    frequency: "once_per_session",
    delaySeconds: 2,
    imageUrl: "https://images.unsplash.com/photo-1616469829941-c7200edec809?q=80&w=1000&auto=format&fit=crop",
    badgeText: "LIMITED OFFER",
    headline: "GET LKR 1,500 OFF",
    highlightText: "YOUR FIRST ORDER!",
    description: "Exclusive discount on authentic smartphones & accessories.",
    couponCode: "",
    discountText: "LKR 1,500 OFF",
    buttonText: "Claim Discount Now",
    buttonUrl: "/products",
    colorTheme: "luxury_dark",
  });

  // Load existing Firestore settings
  useEffect(() => {
    async function loadPopupSettings() {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "settings", "campaign_popup"));
        if (snap.exists()) {
          setSettings({ ...settings, ...snap.data() });
        }
      } catch (err) {
        console.error("Error loading campaign popup settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPopupSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "campaign_popup"), settings, { merge: true });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error("Save error:", e);
      alert("Failed to save popup campaign settings");
    } finally {
      setSaving(false);
    }
  };

  const isLight = settings.colorTheme === "clean_white";

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-400/20 text-purple-300 text-[10px] font-black uppercase tracking-wider mb-2 border border-purple-400/30">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>ENTRY CAMPAIGN POPUP</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Promotional Campaign Popup Banner Manager
          </h3>
          <p className="text-xs text-white/60 mt-1">
            Display a high-converting promotional popup modal when users visit your website!
          </p>
        </div>

        {/* Enable / Disable Switch */}
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 shrink-0">
          <span className="text-xs font-bold text-white/80 pl-2">
            {settings.enabled ? "⚡ Popup Active" : "Popup Off"}
          </span>
          <button
            type="button"
            onClick={async () => {
              const nextState = !settings.enabled;
              const updated = { ...settings, enabled: nextState };
              setSettings(updated);
              try {
                await setDoc(doc(db, "settings", "campaign_popup"), updated, { merge: true });
              } catch (e) {
                console.error("Error toggling popup status:", e);
              }
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
              settings.enabled ? "bg-purple-500" : "bg-white/20"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-black transition-transform ${
                settings.enabled ? "translate-x-6 bg-black" : "translate-x-0 bg-white"
              }`}
            />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-white/50">Loading popup settings...</div>
      ) : (
        <div className="space-y-6">
          {/* Rules & Targeting Bar */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" /> Display Targeting & Trigger Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">Page Targeting</label>
                <select
                  value={settings.pageTargeting || "all"}
                  onChange={(e) => setSettings({ ...settings, pageTargeting: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none font-bold"
                >
                  <option value="all">All Pages</option>
                  <option value="homepage">Homepage Only</option>
                  <option value="products">Product Pages Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">Display Frequency</label>
                <select
                  value={settings.frequency || "once_per_session"}
                  onChange={(e) => setSettings({ ...settings, frequency: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none font-bold"
                >
                  <option value="once_per_session">Once Per Session (Recommended)</option>
                  <option value="once_per_day">Once Per 24 Hours</option>
                  <option value="every_visit">Every Page Visit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">Entrance Delay (Seconds)</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={settings.delaySeconds ?? 2}
                  onChange={(e) => setSettings({ ...settings, delaySeconds: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none font-bold"
                />
              </div>
            </div>
          </div>

          {/* Form Content Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Campaign Headline</label>
              <input
                type="text"
                value={settings.headline || ""}
                onChange={(e) => setSettings({ ...settings, headline: e.target.value })}
                placeholder="e.g. GET LKR 1,500 OFF"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Highlighted Title Accent</label>
              <input
                type="text"
                value={settings.highlightText || ""}
                onChange={(e) => setSettings({ ...settings, highlightText: e.target.value })}
                placeholder="e.g. YOUR FIRST ORDER!"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Short Description</label>
            <textarea
              rows={2}
              value={settings.description || ""}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              placeholder="Use coupon code 1PLACE10 at checkout..."
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Offer Badge Text</label>
              <input
                type="text"
                value={settings.badgeText || ""}
                onChange={(e) => setSettings({ ...settings, badgeText: e.target.value.toUpperCase() })}
                placeholder="e.g. LIMITED OFFER"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Coupon Code (1-Click Copy)</label>
              <input
                type="text"
                value={settings.couponCode || ""}
                onChange={(e) => setSettings({ ...settings, couponCode: e.target.value.toUpperCase() })}
                placeholder="e.g. 1PLACE10"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Discount Tag</label>
              <input
                type="text"
                value={settings.discountText || ""}
                onChange={(e) => setSettings({ ...settings, discountText: e.target.value })}
                placeholder="e.g. LKR 1,500 OFF"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Popup Banner Graphic Image URL</label>
            <input
              type="text"
              value={settings.imageUrl || ""}
              onChange={(e) => setSettings({ ...settings, imageUrl: e.target.value })}
              placeholder="https://... direct image URL"
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Button Text</label>
              <input
                type="text"
                value={settings.buttonText || ""}
                onChange={(e) => setSettings({ ...settings, buttonText: e.target.value })}
                placeholder="Claim Discount Now"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Button Link</label>
              <input
                type="text"
                value={settings.buttonUrl || ""}
                onChange={(e) => setSettings({ ...settings, buttonUrl: e.target.value })}
                placeholder="/products"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Theme Color</label>
              <select
                value={settings.colorTheme || "luxury_dark"}
                onChange={(e) => setSettings({ ...settings, colorTheme: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none font-medium"
              >
                <option value="luxury_dark">👑 Luxury Dark</option>
                <option value="gold_glow">✨ Gold Glow</option>
                <option value="deep_purple">🍇 Deep Purple</option>
                <option value="clean_white">⚪ Clean White</option>
              </select>
            </div>
          </div>

          {/* Date Range Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Campaign Start Date (Optional)</label>
              <input
                type="datetime-local"
                value={settings.startDate || ""}
                onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Campaign End Date (Optional)</label>
              <input
                type="datetime-local"
                value={settings.endDate || ""}
                onChange={(e) => setSettings({ ...settings, endDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Preview Live Popup Modal</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 w-full py-3 px-6 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved Live to Website!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Popup Campaign Settings"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Admin Test Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`relative w-full max-w-lg md:max-w-xl border rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-7 ${
            settings.colorTheme === "clean_white"
              ? "bg-white text-black border-neutral-200"
              : settings.colorTheme === "gold_glow"
              ? "bg-gradient-to-b from-zinc-950 via-zinc-900 to-amber-950/60 border-amber-500/40 text-white"
              : settings.colorTheme === "deep_purple"
              ? "bg-gradient-to-b from-zinc-950 via-slate-950 to-purple-950/70 border-purple-500/40 text-white"
              : "bg-zinc-950 border-white/15 text-white"
          }`}>
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/20 hover:bg-black transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {settings.imageUrl && (
              <div className="w-full aspect-[16/9] sm:aspect-[2/1] max-h-[260px] rounded-2xl overflow-hidden mb-4 bg-black border border-white/10 relative">
                <img src={settings.imageUrl} alt="Preview" className="w-full h-full object-cover object-top" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${isLight ? "bg-black text-white" : "bg-amber-400 text-black"}`}>
                {settings.badgeText || "PROMO"}
              </span>
              {settings.discountText && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase">
                  {settings.discountText}
                </span>
              )}
            </div>

            <h3 className="text-xl font-extrabold leading-snug">
              {settings.headline} <span className={isLight ? "text-amber-600" : "text-amber-400"}>{settings.highlightText}</span>
            </h3>

            <p className="text-xs opacity-75 mt-2 leading-relaxed">{settings.description}</p>

            {settings.couponCode && (
              <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/20 text-xs font-mono font-bold text-amber-400 text-center">
                COUPON CODE: {settings.couponCode}
              </div>
            )}

            <button
              onClick={() => setShowPreviewModal(false)}
              className={`w-full mt-4 py-3 rounded-xl font-black text-xs cursor-pointer ${isLight ? "bg-black text-white hover:bg-neutral-800" : "bg-white text-black hover:bg-amber-400"}`}
            >
              {settings.buttonText || "Shop Now"} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
