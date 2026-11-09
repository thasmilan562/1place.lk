"use client";

import React, { useState, useEffect } from "react";
import { CircleCheck as Sparkles, Save, Check, Image as ImageIcon, Eye, RefreshCw, Smartphone, Monitor, Upload, Trash2, Calendar, Link as LinkIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import { Product, Category } from "@/lib/types";
import { getCategories } from "@/lib/firestore-client";
import { uploadImageWithFallback } from "@/lib/upload-utils";

export interface NewArrivalsPromotionalBannerData {
  enabled: boolean;
  title: string;
  desktop_banner_url: string;
  mobile_banner_url: string;
  destination_type: "product" | "category" | "external" | "none";
  destination_id?: string;
  destination_url?: string;
  start_date?: string;
  expiry_date?: string;

  // Legacy fallback fields for backward compatibility
  customImage?: string;
  buttonUrl?: string;
}

interface FeaturedGridBannerControlProps {
  products: Product[];
}

export default function FeaturedGridBannerControl({ products }: FeaturedGridBannerControlProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");

  const [bannerData, setBannerData] = useState<NewArrivalsPromotionalBannerData>({
    enabled: true,
    title: "New Arrivals Special Promotional Offer",
    desktop_banner_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1200&auto=format&fit=crop",
    mobile_banner_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=800&auto=format&fit=crop",
    destination_type: "product",
    destination_id: "",
    destination_url: "",
    start_date: "",
    expiry_date: "",
  });

  // Load Categories & Firestore banner settings
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const catRes = await getCategories();
        if (catRes) setCategories(catRes);

        const snap = await getDoc(doc(db, "settings", "featured_grid_banner"));
        if (snap.exists()) {
          const data = snap.data();
          setBannerData({
            enabled: data.enabled !== false,
            title: data.title || "New Arrivals Promotional Banner",
            desktop_banner_url: data.desktop_banner_url || data.customImage || "",
            mobile_banner_url: data.mobile_banner_url || data.desktop_banner_url || data.customImage || "",
            destination_type: data.destination_type || (data.buttonUrl ? "external" : "none"),
            destination_id: data.destination_id || data.productId || "",
            destination_url: data.destination_url || data.buttonUrl || "",
            start_date: data.start_date || "",
            expiry_date: data.expiry_date || "",
          });
        }
      } catch (err) {
        console.error("Error loading banner settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1048576) {
        setFileError("Desktop image exceeds 1MB max file size. Please select a compressed image.");
        return;
      }
      setDesktopFile(file);
      setBannerData((prev) => ({
        ...prev,
        desktop_banner_url: URL.createObjectURL(file),
      }));
    }
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1048576) {
        setFileError("Mobile image exceeds 1MB max file size. Please select a compressed image.");
        return;
      }
      setMobileFile(file);
      setBannerData((prev) => ({
        ...prev,
        mobile_banner_url: URL.createObjectURL(file),
      }));
    }
  };

  const handleSelectProductDestination = (prodId: string) => {
    const selectedProd = products.find((p) => p.id === prodId);
    setBannerData((prev) => ({
      ...prev,
      destination_type: "product",
      destination_id: prodId,
      destination_url: selectedProd ? `/products/${selectedProd.slug || selectedProd.id}` : "",
      title: prev.title || (selectedProd ? selectedProd.name : "Featured Product"),
    }));
  };

  const handleSelectCategoryDestination = (catSlug: string) => {
    const selectedCat = categories.find((c) => c.slug === catSlug || c.id === catSlug);
    setBannerData((prev) => ({
      ...prev,
      destination_type: "category",
      destination_id: catSlug,
      destination_url: `/categories/${catSlug}`,
      title: prev.title || (selectedCat ? `${selectedCat.name} Collection` : "Featured Category"),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFileError("");
    try {
      let finalDesktopUrl = bannerData.desktop_banner_url;
      let finalMobileUrl = bannerData.mobile_banner_url;

      if (desktopFile) {
        finalDesktopUrl = await uploadImageWithFallback(desktopFile, "new_arrivals_banners");
      }

      if (mobileFile) {
        finalMobileUrl = await uploadImageWithFallback(mobileFile, "new_arrivals_banners");
      }

      const payloadToSave: NewArrivalsPromotionalBannerData = {
        ...bannerData,
        desktop_banner_url: finalDesktopUrl,
        mobile_banner_url: finalMobileUrl || finalDesktopUrl,
        // Legacy fallbacks for backward compatibility
        customImage: finalDesktopUrl,
        buttonUrl: bannerData.destination_url || "",
      };

      await setDoc(doc(db, "settings", "featured_grid_banner"), payloadToSave, { merge: true });
      setBannerData(payloadToSave);
      setDesktopFile(null);
      setMobileFile(null);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error("Save error:", e);
      alert("Failed to save promotional banner settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!confirm("Are you sure you want to disable and clear the New Arrivals promotional banner?")) return;
    const cleared: NewArrivalsPromotionalBannerData = {
      enabled: false,
      title: "",
      desktop_banner_url: "",
      mobile_banner_url: "",
      destination_type: "none",
      destination_id: "",
      destination_url: "",
      start_date: "",
      expiry_date: "",
    };
    setBannerData(cleared);
    setDesktopFile(null);
    setMobileFile(null);
    try {
      await setDoc(doc(db, "settings", "featured_grid_banner"), cleared, { merge: true });
      alert("Banner removed successfully.");
    } catch (e) {
      console.error("Error removing banner:", e);
    }
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider mb-2 border border-blue-500/30">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>NEW ARRIVALS PROMOTIONAL BANNER</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            New Arrivals Promotional Banner Manager
          </h3>
          <p className="text-xs text-white/60 mt-1">
            Upload custom designed promotional banner images for Desktop &amp; Mobile screens. Completely replaces internal text, buttons &amp; cards!
          </p>
        </div>

        {/* Enable / Disable Switch */}
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 shrink-0">
          <span className="text-xs font-bold text-white/80 pl-2">
            {bannerData.enabled ? "⚡ Banner Active" : "Banner Disabled"}
          </span>
          <button
            type="button"
            onClick={() => setBannerData((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
              bannerData.enabled ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                bannerData.enabled ? "translate-x-6 bg-slate-950" : "translate-x-0 bg-white"
              }`}
            />
          </button>
        </div>
      </div>

      {fileError && (
        <div className="p-3.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-white/50">Loading banner settings...</div>
      ) : (
        <div className="space-y-6">
          {/* Banner Title / Accessibility Alt Text */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Banner Title / Accessibility Alt Text *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. New iPhone 16 Pro Max Launch Deal - 15% OFF"
              value={bannerData.title || ""}
              onChange={(e) => setBannerData({ ...bannerData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-semibold outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-white/40 mt-1">Used for screen readers, image alt tags, and SEO.</p>
          </div>

          {/* Desktop & Mobile Banner Uploaders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Desktop Banner Box */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400" /> Desktop Banner Image (1200×600px)
                </h4>
                <span className="text-[10px] text-white/40 font-mono">Max 1MB</span>
              </div>

              {/* Preview */}
              <div className="aspect-[2/1] w-full rounded-xl bg-black/50 border border-white/10 overflow-hidden relative flex items-center justify-center">
                {bannerData.desktop_banner_url ? (
                  <img
                    src={bannerData.desktop_banner_url}
                    alt="Desktop Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 text-white/30 space-y-1">
                    <ImageIcon className="w-8 h-8 mx-auto" />
                    <p className="text-xs">No Desktop Banner Uploaded</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="desktopBannerUpload"
                    accept="image/*"
                    onChange={handleDesktopFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="desktopBannerUpload"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Desktop Image
                  </label>
                  {bannerData.desktop_banner_url && (
                    <button
                      type="button"
                      onClick={() => {
                        setDesktopFile(null);
                        setBannerData((prev) => ({ ...prev, desktop_banner_url: "" }));
                      }}
                      className="px-3 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-xl text-xs font-bold transition-colors"
                      title="Clear Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  placeholder="Or paste direct Desktop Image URL (https://...)"
                  value={bannerData.desktop_banner_url || ""}
                  onChange={(e) => {
                    setDesktopFile(null);
                    setBannerData({ ...bannerData, desktop_banner_url: e.target.value });
                  }}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-[11px] text-white font-mono outline-none"
                />
              </div>
            </div>

            {/* Mobile Banner Box */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" /> Mobile Banner Image (1080×1080px)
                </h4>
                <span className="text-[10px] text-white/40 font-mono">Max 1MB</span>
              </div>

              {/* Preview */}
              <div className="aspect-[4/3] sm:aspect-square w-full max-h-48 mx-auto rounded-xl bg-black/50 border border-white/10 overflow-hidden relative flex items-center justify-center">
                {bannerData.mobile_banner_url ? (
                  <img
                    src={bannerData.mobile_banner_url}
                    alt="Mobile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 text-white/30 space-y-1">
                    <ImageIcon className="w-8 h-8 mx-auto" />
                    <p className="text-xs">No Mobile Banner (Desktop Banner will be used)</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="mobileBannerUpload"
                    accept="image/*"
                    onChange={handleMobileFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="mobileBannerUpload"
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Mobile Image
                  </label>
                  {bannerData.mobile_banner_url && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileFile(null);
                        setBannerData((prev) => ({ ...prev, mobile_banner_url: "" }));
                      }}
                      className="px-3 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-xl text-xs font-bold transition-colors"
                      title="Clear Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  placeholder="Or paste direct Mobile Image URL (https://...)"
                  value={bannerData.mobile_banner_url || ""}
                  onChange={(e) => {
                    setMobileFile(null);
                    setBannerData({ ...bannerData, mobile_banner_url: e.target.value });
                  }}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-[11px] text-white font-mono outline-none"
                />
              </div>
            </div>

          </div>

          {/* Click Destination Configuration */}
          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-emerald-400" /> Click Destination Settings
            </h4>

            {/* Destination Type Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: "product", label: "📦 Product Page" },
                { type: "category", label: "🏷️ Category Page" },
                { type: "external", label: "🌐 External URL" },
                { type: "none", label: "🚫 No Link" },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setBannerData((prev) => ({ ...prev, destination_type: item.type as any }))}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    bannerData.destination_type === item.type
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md"
                      : "bg-black/30 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Target Value Inputs depending on destination_type */}
            {bannerData.destination_type === "product" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white/70">Select Target Product</label>
                <select
                  value={bannerData.destination_id || ""}
                  onChange={(e) => handleSelectProductDestination(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-emerald-400 font-medium"
                >
                  <option value="">-- Choose Product from Catalog --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category_name || "Product"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {bannerData.destination_type === "category" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white/70">Select Target Category</label>
                <select
                  value={bannerData.destination_id || ""}
                  onChange={(e) => handleSelectCategoryDestination(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-emerald-400 font-medium"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id || c.slug} value={c.slug}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {bannerData.destination_type === "external" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white/70">External Web URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/special-landing-page"
                  value={bannerData.destination_url || ""}
                  onChange={(e) => setBannerData({ ...bannerData, destination_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono outline-none focus:border-emerald-400"
                />
                <p className="text-[11px] text-white/40">Will open safely in a new tab with target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot;.</p>
              </div>
            )}

            {bannerData.destination_type !== "none" && bannerData.destination_url && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-mono truncate">
                Resolved Link: {bannerData.destination_url}
              </div>
            )}
          </div>

          {/* Schedule / Validity Dates */}
          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Schedule &amp; Expiry Dates (Optional)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Start Date</label>
                <input
                  type="date"
                  value={bannerData.start_date || ""}
                  onChange={(e) => setBannerData({ ...bannerData, start_date: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={bannerData.expiry_date || ""}
                  onChange={(e) => setBannerData({ ...bannerData, expiry_date: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-white/40">Leave empty for continuous display without expiration.</p>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleRemoveBanner}
              className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs rounded-xl border border-red-500/30 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear &amp; Remove Banner
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>Saving Banner...</>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Banner Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Promotional Banner
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
