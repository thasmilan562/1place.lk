"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Video, Upload, Eye, Calendar, CircleCheck as Sparkles, Copy, Check, Tag, Clock, Smartphone, Monitor } from "lucide-react";
import { OfferBanner, BannerPlacement, BannerStatus } from "@/lib/types";

interface OfferBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (banner: Partial<OfferBanner>) => Promise<void>;
  initialData?: OfferBanner | null;
}

const PLACEMENTS: { id: BannerPlacement; label: string }[] = [
  { id: "homepage_hero", label: "Homepage Hero Slider" },
  { id: "homepage_below_header", label: "Homepage Below Header" },
  { id: "homepage_after_categories", label: "Homepage After Categories" },
  { id: "homepage_above_bestsellers", label: "Homepage Above Best Sellers" },
  { id: "homepage_above_new_arrivals", label: "Homepage Above New Arrivals" },
  { id: "homepage_before_testimonials", label: "Homepage Before Testimonials" },
  { id: "shop_top", label: "Shop Page Top" },
  { id: "category_top", label: "Category Page Top" },
  { id: "product_page", label: "Product Page Section" },
  { id: "cart_page", label: "Cart Page Section" },
  { id: "checkout_notice", label: "Checkout Notice Area" },
  { id: "announcement_bar", label: "Global Announcement Bar" },
  { id: "popup_campaign", label: "Promotional Popup Campaign" },
];

export default function OfferBannerModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: OfferBannerModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "media" | "placement" | "design" | "schedule">("info");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<OfferBanner>>({
    internalName: "",
    headline: "",
    highlightText: "",
    description: "",
    badgeText: "LIMITED OFFER",
    couponCode: "",
    termsText: "",
    primaryCtaText: "Shop Offer",
    primaryCtaUrl: "/products",
    linkType: "internal",
    openInNewTab: false,
    desktopImage: "",
    mobileImage: "",
    videoUrl: "",
    altText: "",
    overlayOpacity: 40,
    textAlign: "left",
    contentPosition: "center_left",
    stylePreset: "premium_dark",
    placement: "homepage_after_categories",
    status: "active",
    publishImmediately: true,
    noExpiry: true,
    targetDevice: "all",
    targetAudience: "all",
    countdownEnabled: false,
    countdownLabel: "Ends in:",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        internalName: "",
        headline: "",
        highlightText: "",
        description: "",
        badgeText: "LIMITED OFFER",
        couponCode: "",
        termsText: "",
        primaryCtaText: "Shop Offer",
        primaryCtaUrl: "/products",
        linkType: "internal",
        openInNewTab: false,
        desktopImage: "",
        mobileImage: "",
        videoUrl: "",
        altText: "",
        overlayOpacity: 40,
        textAlign: "left",
        contentPosition: "center_left",
        stylePreset: "premium_dark",
        placement: "homepage_after_categories",
        status: "active",
        publishImmediately: true,
        noExpiry: true,
        targetDevice: "all",
        targetAudience: "all",
        countdownEnabled: false,
        countdownLabel: "Ends in:",
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.internalName || (formData.contentMode !== "image_only" && !formData.headline)) {
      alert("Please provide an internal campaign name.");
      return;
    }
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save offer banner.");
    } finally {
      setLoading(false);
    }
  };

  const compressAndSetImage = (file: File, field: "desktopImage" | "mobileImage") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        setFormData((prev) => ({ ...prev, [field]: compressed }));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {initialData ? "Edit Offer Banner" : "Create Offer Banner"}
              </h2>
              <p className="text-xs text-white/50">Manage marketing banners, schedules, and placements</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                    previewDevice === "desktop" ? "bg-white text-black font-semibold" : "text-white/60 hover:text-white"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                    previewDevice === "mobile" ? "bg-white text-black font-semibold" : "text-white/60 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form Tabs */}
          <div className="flex border-b border-white/10 bg-zinc-900/30 overflow-x-auto">
            {[
              { id: "info", label: "Basic Info & CTA" },
              { id: "media", label: "Images & Media" },
              { id: "placement", label: "Placement & Audience" },
              { id: "design", label: "Design & Presets" },
              { id: "schedule", label: "Schedule & Countdown" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-amber-400 text-amber-400 bg-amber-400/5"
                    : "border-transparent text-white/50 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body with Form & Live Preview side-by-side */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Input Controls */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5 custom-scrollbar">
              {activeTab === "info" && (
                <div className="space-y-4">
                  {/* Banner Content Mode Selection */}
                  <div>
                    <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                      Banner Content Mode *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, contentMode: "image_only" })}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          formData.contentMode === "image_only" || (!formData.contentMode && !formData.headline)
                            ? "border-amber-400 bg-amber-400/10 text-white font-bold"
                            : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        <p className="font-bold">1. Image Only</p>
                        <p className="text-[10px] text-white/50 mt-0.5">No text overlays. Best for pre-made artwork</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, contentMode: "overlay" })}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          formData.contentMode === "overlay"
                            ? "border-amber-400 bg-amber-400/10 text-white font-bold"
                            : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        <p className="font-bold">2. Overlay Content</p>
                        <p className="text-[10px] text-white/50 mt-0.5">Heading & CTA over background image</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, contentMode: "split" })}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          formData.contentMode === "split"
                            ? "border-amber-400 bg-amber-400/10 text-white font-bold"
                            : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        <p className="font-bold">3. Split Content</p>
                        <p className="text-[10px] text-white/50 mt-0.5">Text on left, product image on right</p>
                      </button>
                    </div>
                  </div>

                  {/* Image Fit & Clickable Toggles */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/80">Make Entire Banner Clickable</span>
                      <input
                        type="checkbox"
                        checked={formData.entireBannerClickable !== false}
                        onChange={(e) => setFormData({ ...formData, entireBannerClickable: e.target.checked })}
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/80">Image Fit Mode</span>
                      <select
                        value={formData.imageFit || "cover"}
                        onChange={(e) => setFormData({ ...formData, imageFit: e.target.value as "cover" | "contain" })}
                        className="bg-zinc-800 text-white text-xs px-2 py-1 rounded-lg border border-white/10 outline-none"
                      >
                        <option value="cover">Cover (Crop to fill)</option>
                        <option value="contain">Contain (No crop)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Internal Campaign Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Fitbit Smartwatch Campaign 2026"
                      value={formData.internalName || ""}
                      onChange={(e) => setFormData({ ...formData, internalName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Headline *</label>
                      <input
                        type="text"
                        placeholder="e.g. Unbeatable Deals on"
                        value={formData.headline || ""}
                        onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Highlighted Text</label>
                      <input
                        type="text"
                        placeholder="e.g. Flagship Smartphones"
                        value={formData.highlightText || ""}
                        onChange={(e) => setFormData({ ...formData, highlightText: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Get up to 20% off on authentic iPhones with islandwide delivery."
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Offer Badge</label>
                      <input
                        type="text"
                        placeholder="e.g. SPECIAL OFFER"
                        value={formData.badgeText || ""}
                        onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Coupon Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 1PLACE10"
                        value={formData.couponCode || ""}
                        onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50 uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Link Type</label>
                      <select
                        value={formData.linkType || "internal"}
                        onChange={(e) => setFormData({ ...formData, linkType: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                      >
                        <option value="internal">Internal Page</option>
                        <option value="product">Product Page</option>
                        <option value="category">Category Page</option>
                        <option value="whatsapp">WhatsApp Order</option>
                        <option value="custom">Custom URL</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Button Text</label>
                      <input
                        type="text"
                        placeholder="e.g. Shop Now"
                        value={formData.primaryCtaText || ""}
                        onChange={(e) => setFormData({ ...formData, primaryCtaText: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Destination URL</label>
                      <input
                        type="text"
                        placeholder="e.g. /products?category=iphone"
                        value={formData.primaryCtaUrl || ""}
                        onChange={(e) => setFormData({ ...formData, primaryCtaUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50"
                      />
                      {/* Quick Link Selector Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] text-white/40 self-center mr-1">Quick Links:</span>
                        {[
                          { label: "Products", url: "/products" },
                          { label: "Categories", url: "/categories" },
                          { label: "Gallery", url: "/gallery" },
                          { label: "Reviews", url: "/reviews" },
                          { label: "Contact", url: "/contact" },
                        ].map((chip) => (
                          <button
                            key={chip.url}
                            type="button"
                            onClick={() => setFormData({ ...formData, primaryCtaUrl: chip.url })}
                            className="px-2 py-0.5 rounded bg-white/10 hover:bg-amber-400 hover:text-black text-[10px] text-white/80 transition-colors"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "media" && (
                <div className="space-y-4">
                  {/* ── BANNER SIZE / ASPECT RATIO SELECTOR (DESKTOP & MOBILE INDEPENDENT) ── */}
                  <div className="p-4 bg-zinc-900 border border-white/10 rounded-2xl space-y-4">
                    {/* 1. Desktop Ratio */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Monitor className="w-4 h-4" /> 🖥️ Desktop Banner Size &amp; Ratio
                        </label>
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold">
                          {formData.bannerSizeRatio || "default"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { id: "default", label: "Default", badge: "Auto Fit", desc: "Standard Responsive Fit" },
                          { id: "1080x1080", label: "1080 × 1080", badge: "1:1 Square", desc: "Square Social Format" },
                          { id: "860x270", label: "860 × 270", badge: "~3.2:1 Wide", desc: "Compact Deal Strip" },
                          { id: "1920x850", label: "1920 × 850", badge: "~2.3:1 Wide", desc: "Cinematic Panoramic" },
                          { id: "1080x1440", label: "1080 × 1440", badge: "3:4 Portrait", desc: "Tall Poster / Story" },
                        ].map((preset) => {
                          const isSelected = (formData.bannerSizeRatio || "default") === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, bannerSizeRatio: preset.id as any, banner_size_ratio: preset.id as any })}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                                isSelected
                                  ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400"
                                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-[11px]">{preset.label}</span>
                              </div>
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-fit ${isSelected ? "bg-amber-400 text-black" : "bg-white/10 text-white/50"}`}>
                                {preset.badge}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Mobile Ratio */}
                    <div className="space-y-2 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4" /> 📱 Mobile Banner Size &amp; Ratio (Independent)
                        </label>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                          {formData.bannerSizeRatioMobile || "default"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { id: "default", label: "Auto (Match Desktop)", badge: "Auto", desc: "Responsive Flow" },
                          { id: "1080x1080", label: "1080 × 1080", badge: "1:1 Square", desc: "Mobile Square" },
                          { id: "860x270", label: "860 × 270", badge: "~3.2:1 Wide", desc: "Slim Mobile Strip" },
                          { id: "1920x850", label: "1920 × 850", badge: "~2.3:1 Wide", desc: "Wide Banner" },
                          { id: "1080x1440", label: "1080 × 1440", badge: "3:4 Story", desc: "Full Mobile Poster" },
                        ].map((preset) => {
                          const isSelected = (formData.bannerSizeRatioMobile || "default") === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, bannerSizeRatioMobile: preset.id as any, banner_size_ratio_mobile: preset.id as any })}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                                isSelected
                                  ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500"
                                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-[11px]">{preset.label}</span>
                              </div>
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-fit ${isSelected ? "bg-emerald-500 text-white" : "bg-white/10 text-white/50"}`}>
                                {preset.badge}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Background Video Section */}
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Video className="w-4 h-4 text-amber-400" /> Background Video (MP4 / WebM)
                      </label>
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold">New Feature</span>
                    </div>
                    <input
                      type="url"
                      placeholder="https://... direct MP4/WebM video URL"
                      value={formData.videoUrl || ""}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-amber-400/30 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <p className="text-[11px] text-amber-200/70">
                      If set, this plays as a video background for full-width offer banners on the store!
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { url: "https://assets.mixkit.co/videos/preview/mixkit-circuit-board-microchip-technological-process-42284-large.mp4", label: "⚡ Circuit Tech Motion" },
                        { url: "https://assets.mixkit.co/videos/preview/mixkit-glowing-lines-in-a-dark-space-41559-large.mp4", label: "✨ Neon Particles Flow" },
                      ].map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setFormData({ ...formData, videoUrl: preset.url })}
                          className={`text-[11px] font-semibold p-2 rounded-xl border text-left truncate transition-all ${
                            formData.videoUrl === preset.url
                              ? "border-amber-400 bg-amber-400/20 text-amber-300 font-bold"
                              : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-white/70">Primary Slide Image (Image 1) *</label>
                      <label className="cursor-pointer text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold">
                        <ImageIcon className="w-3.5 h-3.5" /> Upload File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) compressAndSetImage(file, "desktopImage");
                          }}
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="https://... or paste image URL (1920x760 recommended)"
                      value={formData.desktopImage || ""}
                      onChange={(e) => setFormData({ ...formData, desktopImage: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50"
                    />
                  </div>

                  {/* ── Multi-Slide Image Gallery (Image 2, Image 3, Image 4) ── */}
                  <div className="p-4 bg-zinc-900 border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                        📸 Additional Slide Images (Image 2, Image 3, Image 4)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentExtra = formData.additionalImages || [];
                          setFormData({ ...formData, additionalImages: [...currentExtra, ""] });
                        }}
                        className="px-2.5 py-1 bg-amber-400 text-black text-[11px] font-bold rounded-lg hover:bg-amber-300 transition-colors"
                      >
                        + Add Slide Image
                      </button>
                    </div>
                    <p className="text-[11px] text-white/50">
                      Add 2, 3 or more slide image URLs. The website offer banner will automatically slide through all images!
                    </p>

                    <div className="space-y-2">
                      {(formData.additionalImages || []).map((imgUrl, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white/40 w-12 shrink-0">Slide {idx + 2}</span>
                          <input
                            type="text"
                            placeholder="Paste image URL (e.g. https://...)"
                            value={imgUrl}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const updated = [...(formData.additionalImages || [])];
                              if (raw.includes(",") || raw.includes("\n") || raw.includes(";")) {
                                const parts = raw.split(/[\n,;]+/).map((u) => u.trim()).filter(Boolean);
                                updated.splice(idx, 1, ...parts);
                              } else {
                                updated[idx] = raw;
                              }
                              setFormData({ ...formData, additionalImages: updated });
                            }}
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formData.additionalImages || []).filter((_, i) => i !== idx);
                              setFormData({ ...formData, additionalImages: updated });
                            }}
                            className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-white/70">Mobile Image (Optional)</label>
                      <label className="cursor-pointer text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold">
                        <ImageIcon className="w-3.5 h-3.5" /> Upload File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) compressAndSetImage(file, "mobileImage");
                          }}
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="https://... or paste mobile image URL (1080x1350 recommended)"
                      value={formData.mobileImage || ""}
                      onChange={(e) => setFormData({ ...formData, mobileImage: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Image Fit</label>
                      <select
                        value={formData.imageFit || "cover"}
                        onChange={(e) => setFormData({ ...formData, imageFit: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                      >
                        <option value="cover">Cover (Fill Entire Frame)</option>
                        <option value="contain">Contain (Fit Entire Image)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Image Position</label>
                      <select
                        value={formData.imagePosition || "center"}
                        onChange={(e) => setFormData({ ...formData, imagePosition: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                      >
                        <option value="center">Center</option>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Desktop Height (px)</label>
                      <input
                        type="number"
                        placeholder="Default auto / 440"
                        value={formData.bannerHeightDesktop || ""}
                        onChange={(e) => setFormData({ ...formData, bannerHeightDesktop: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Section Spacing (px)</label>
                      <input
                        type="number"
                        placeholder="Default 64"
                        value={formData.sectionSpacing || ""}
                        onChange={(e) => setFormData({ ...formData, sectionSpacing: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Alt Text</label>
                    <input
                      type="text"
                      placeholder="Image description for accessibility"
                      value={formData.altText || ""}
                      onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>

                  {/* ── Text Animation & Announcement Ticker Options ── */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Text Animations & Announcement Ticker
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">Text Animation Style</label>
                        <select
                          value={formData.textAnimationMode || "glow"}
                          onChange={(e) => setFormData({ ...formData, textAnimationMode: e.target.value as any })}
                          className="w-full px-3.5 py-2.5 bg-zinc-900 border border-amber-400/30 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                        >
                          <option value="glow">✨ Gold Glow & Pulse</option>
                          <option value="pulse">⚡ Pulse Highlight</option>
                          <option value="bounce">💥 Gentle Spring Bounce</option>
                          <option value="marquee">🚀 Scrolling Marquee</option>
                          <option value="none">Standard Static Text</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">Show Top Announcement Bar</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, showAnnouncementTicker: !formData.showAnnouncementTicker })}
                          className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                            formData.showAnnouncementTicker
                              ? "bg-amber-400 border-amber-400 text-black shadow-md"
                              : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                          }`}
                        >
                          {formData.showAnnouncementTicker ? "⚡ Announcement Bar: ENABLED" : "Disabled"}
                        </button>
                      </div>
                    </div>

                    {formData.showAnnouncementTicker && (
                      <div>
                        <label className="block text-xs font-medium text-white/80 mb-1">Top Ticker Bar Text</label>
                        <input
                          type="text"
                          placeholder="e.g. 🔥 SPECIAL OFFER: Islandwide Delivery + Free Warranty on all Orders!"
                          value={formData.announcementText || ""}
                          onChange={(e) => setFormData({ ...formData, announcementText: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-zinc-900 border border-amber-400/30 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "placement" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Placement Slot *</label>
                    <select
                      value={formData.placement || "homepage_after_categories"}
                      onChange={(e) => setFormData({ ...formData, placement: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                    >
                      {PLACEMENTS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Target Device</label>
                      <select
                        value={formData.targetDevice || "all"}
                        onChange={(e) => setFormData({ ...formData, targetDevice: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                      >
                        <option value="all">All Devices</option>
                        <option value="desktop">Desktop Only</option>
                        <option value="mobile">Mobile Only</option>
                        <option value="tablet">Tablet Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Campaign Status</label>
                      <select
                        value={formData.status || "active"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="paused">Paused</option>
                        <option value="expired">Expired</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "design" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Style Preset</label>
                    <select
                      value={formData.stylePreset || "premium_dark"}
                      onChange={(e) => setFormData({ ...formData, stylePreset: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                    >
                      <option value="premium_dark">Premium Dark (Black Glass & Gold/White)</option>
                      <option value="clean_light">Clean Light (White Glass & Dark Text)</option>
                      <option value="flash_sale">Flash Sale (Bold Red/Amber Glow)</option>
                      <option value="new_arrival">New Arrival (Sleek Cyan/White)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Text Alignment</label>
                      <select
                        value={formData.textAlign || "left"}
                        onChange={(e) => setFormData({ ...formData, textAlign: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">Content Position</label>
                      <select
                        value={formData.contentPosition || "center_left"}
                        onChange={(e) => setFormData({ ...formData, contentPosition: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                      >
                        <option value="center_left">Center Left</option>
                        <option value="center">Center</option>
                        <option value="center_right">Center Right</option>
                        <option value="bottom_left">Bottom Left</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "schedule" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="countdownEnabled"
                      checked={formData.countdownEnabled || false}
                      onChange={(e) => setFormData({ ...formData, countdownEnabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-400"
                    />
                    <label htmlFor="countdownEnabled" className="text-xs font-medium text-white">
                      Enable Countdown Timer
                    </label>
                  </div>

                  {formData.countdownEnabled && (
                    <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div>
                        <label className="block text-xs font-medium text-white/70 mb-1">Countdown End Date & Time</label>
                        <input
                          type="datetime-local"
                          value={formData.countdownEndAt || ""}
                          onChange={(e) => setFormData({ ...formData, countdownEndAt: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/70 mb-1">Countdown Label</label>
                        <input
                          type="text"
                          placeholder="Offer ends in:"
                          value={formData.countdownLabel || ""}
                          onChange={(e) => setFormData({ ...formData, countdownLabel: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Interactive Preview Box */}
            <div className="w-full md:w-[380px] bg-zinc-900 p-5 border-t md:border-t-0 md:border-l border-white/10 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Preview ({previewDevice})
              </h3>

              <div
                className={`relative rounded-2xl overflow-hidden border border-white/15 bg-black ${
                  previewDevice === "mobile" ? "aspect-[9/12] max-w-[260px] mx-auto" : "aspect-[16/9] w-full"
                }`}
              >
                {/* Background video / image / overlay */}
                {formData.videoUrl ? (
                  <video
                    src={formData.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : formData.desktopImage ? (
                  <img
                    src={previewDevice === "mobile" && formData.mobileImage ? formData.mobileImage : formData.desktopImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white/30 text-xs">
                    No media uploaded
                  </div>
                )}
                <div
                  className="absolute inset-0 bg-black"
                  style={{ opacity: (formData.overlayOpacity || 40) / 100 }}
                />

                {/* Banner Content */}
                <div className="absolute inset-0 p-4 flex flex-col justify-center text-left text-white">
                  {formData.badgeText && (
                    <span className="self-start px-2 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-extrabold uppercase mb-2">
                      {formData.badgeText}
                    </span>
                  )}
                  <h4 className="text-sm sm:text-base font-bold leading-tight">
                    {formData.headline || "Headline Here"} <span className="text-amber-400">{formData.highlightText}</span>
                  </h4>
                  {formData.description && (
                    <p className="text-[10px] text-white/70 mt-1 line-clamp-2">{formData.description}</p>
                  )}
                  {formData.couponCode && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 border border-white/20 text-[10px] font-mono">
                      <Tag className="w-2.5 h-2.5 text-amber-400" /> CODE: {formData.couponCode}
                    </div>
                  )}
                  {formData.primaryCtaText && (
                    <div className="mt-3">
                      <span className="inline-block px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold">
                        {formData.primaryCtaText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>

          {/* Footer Submit Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-zinc-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-colors shadow-lg disabled:opacity-50"
            >
              {loading ? "Saving..." : initialData ? "Update Banner" : "Create & Save"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
