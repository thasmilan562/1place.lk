"use client";

import React, { useState } from "react";
import { OfferBanner, BannerStatus, BannerPlacement, Product } from "@/lib/types";
import { CircleCheck as Sparkles, Plus, Search, Edit, Trash2, Copy, Eye, Tag, Calendar, Monitor, Smartphone, Layers, CheckCircle2, PauseCircle, Clock, Archive } from "lucide-react";
import FeaturedGridBannerControl from "@/components/admin/FeaturedGridBannerControl";
import CampaignPopupControl from "@/components/admin/CampaignPopupControl";
import NewArrivalsControl from "@/components/admin/NewArrivalsControl";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

interface BannersTabProps {
  banners: OfferBanner[];
  products?: Product[];
  onAdd: () => void;
  onEdit: (banner: OfferBanner) => void;
  onDelete: (id: string) => void;
  onDuplicate: (banner: OfferBanner) => void;
  onToggleStatus: (id: string, newStatus: BannerStatus) => void;
}

export default function BannersTab({
  banners,
  products = [],
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
}: BannersTabProps) {
  const { isLight } = useAdminTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlacement, setSelectedPlacement] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filteredBanners = banners.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      b.internalName?.toLowerCase().includes(q) ||
      b.headline?.toLowerCase().includes(q) ||
      (b.couponCode && b.couponCode.toLowerCase().includes(q));

    const matchesPlacement = selectedPlacement === "all" || b.placement === selectedPlacement;
    const matchesStatus = selectedStatus === "all" || b.status === selectedStatus;

    return matchesSearch && matchesPlacement && matchesStatus;
  });

  const getStatusBadge = (status: BannerStatus) => {
    switch (status) {
      case "active":
        return <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active</span>;
      case "scheduled":
        return <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled</span>;
      case "paused":
        return <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1"><PauseCircle className="w-3 h-3" /> Paused</span>;
      case "draft":
        return <span className="px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[10px] font-bold">Draft</span>;
      case "expired":
        return <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">Expired</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[10px] font-bold"><Archive className="w-3 h-3" /> Archived</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* ── New Arrivals Section & Homepage Products Manager (Show/Hide Toggle & Curation) ── */}
      <NewArrivalsControl products={products} />

      {/* ── Featured Grid Banner Manager (New Arrivals 2-Column Card) ── */}
      <FeaturedGridBannerControl products={products} />

      {/* ── Promotional Entry Popup Banner Manager ── */}
      <CampaignPopupControl />

      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className={`text-xl font-bold flex items-center gap-2 ${isLight ? "text-[#0F172A]" : "text-white"}`}>
            <Sparkles className="w-5 h-5 text-amber-500" /> Offer Banner Manager
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
            Manage all marketing banners, hero sliders, announcement bars, and popups
          </p>
        </div>

        <button
          onClick={onAdd}
          className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Offer Banner
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`} />
          <input
            type="text"
            placeholder="Search by title, coupon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs outline-none transition-all ${
              isLight ? "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500" : "bg-[#0E141D] border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500"
            }`}
          />
        </div>

        <select
          value={selectedPlacement}
          onChange={(e) => setSelectedPlacement(e.target.value)}
          className={`px-3.5 py-2 border rounded-xl text-xs outline-none cursor-pointer transition-all ${
            isLight ? "bg-white border-slate-200 text-slate-900 focus:border-blue-500" : "bg-[#0E141D] border-white/[0.08] text-white focus:border-blue-500"
          }`}
        >
          <option value="all">All Placements</option>
          <option value="homepage_hero">Homepage Hero Slider</option>
          <option value="shop_top">Shop / Products Page Top</option>
          <option value="homepage_after_categories">Homepage After Categories</option>
          <option value="homepage_above_bestsellers">Homepage Above Best Sellers</option>
          <option value="announcement_bar">Global Announcement Bar</option>
          <option value="popup_campaign">Promotional Popup</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className={`px-3.5 py-2 border rounded-xl text-xs outline-none cursor-pointer transition-all ${
            isLight ? "bg-white border-slate-200 text-slate-900 focus:border-blue-500" : "bg-[#0E141D] border-white/[0.08] text-white focus:border-blue-500"
          }`}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="paused">Paused</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Banner Cards Grid */}
      {filteredBanners.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isLight ? "bg-white border-slate-200 text-slate-500" : "bg-[#0E141D] border-white/[0.08] text-slate-400"
        }`}>
          <p className="text-sm">No offer banners found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBanners.map((banner) => (
            <div
              key={banner.id}
              className={`rounded-2xl border overflow-hidden transition-all flex flex-col group ${
                isLight ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs" : "bg-[#0E141D] border-white/[0.08] hover:border-white/20"
              }`}
            >
              {/* Media Preview Box */}
              <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden">
                {banner.desktopImage ? (
                  <img
                    src={banner.desktopImage}
                    alt={banner.internalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                    No image
                  </div>
                )}
                <div className="absolute top-3 left-3">{getStatusBadge(banner.status)}</div>
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] text-white/80 font-mono">
                  {banner.placement}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className={`text-sm font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>{banner.internalName}</h4>
                  <p className="text-xs text-blue-600 font-medium mt-0.5 truncate">{banner.headline}</p>
                  {banner.couponCode && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-[10px] font-mono text-blue-600 border border-blue-500/20">
                      <Tag className="w-3 h-3 text-blue-600" /> {banner.couponCode}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className={`pt-3 border-t flex items-center justify-between ${isLight ? "border-slate-100" : "border-white/10"}`}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(banner)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDuplicate(banner)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onToggleStatus(banner.id, banner.status === "active" ? "paused" : "active")}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                      title={banner.status === "active" ? "Pause" : "Activate"}
                    >
                      {banner.status === "active" ? <PauseCircle className="w-3.5 h-3.5 text-amber-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  </div>

                  <button
                    onClick={() => onDelete(banner.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
