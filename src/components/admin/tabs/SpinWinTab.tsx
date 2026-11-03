"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Gift,
  Truck,
  CircleCheck as Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Layers,
  Calendar,
  Clock,
  Search,
  Filter,
  Eye,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { Product, SpinPromotionSettings, SpinSegment, SpinReward } from "@/lib/types";
import { DEFAULT_SPIN_SETTINGS } from "@/lib/spin-config";
import { useAdminTheme } from "@/app/admin/dashboard/layout";
import { formatPrice } from "@/lib/utils";

interface SpinWinTabProps {
  products: Product[];
}

export default function SpinWinTab({ products }: SpinWinTabProps) {
  const { isLight } = useAdminTheme();

  // Settings State
  const [settings, setSettings] = useState<SpinPromotionSettings>(DEFAULT_SPIN_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Rewards & Stats State
  const [rewards, setRewards] = useState<SpinReward[]>([]);
  const [stats, setStats] = useState({
    totalSpins: 0,
    rewardsIssued: 0,
    rewardsRedeemed: 0,
    unredeemed: 0,
    expired: 0,
  });
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardSearch, setRewardSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "redeemed" | "expired">("all");

  // Load settings & rewards on mount
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/spin-and-win/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.warn("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }

    try {
      setRewardsLoading(true);
      const res = await fetch("/api/spin-and-win/rewards");
      const data = await res.json();
      if (data.success) {
        setRewards(data.rewards || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.warn("Failed to load rewards:", e);
    } finally {
      setRewardsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Settings
  const handleSave = async (updatedSettings?: SpinPromotionSettings) => {
    const payload = updatedSettings || settings;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/spin-and-win/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || "Failed to save settings.");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Failed to save settings. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle master promo switch
  const handleTogglePromo = (enabled: boolean) => {
    const next = { ...settings, enabled };
    setSettings(next);
    handleSave(next);
  };

  // Toggle popup switch
  const handleTogglePopup = (popupEnabled: boolean) => {
    const next = { ...settings, popupEnabled };
    setSettings(next);
    handleSave(next);
  };

  // Segment property update
  const handleSegmentChange = (index: number, field: keyof SpinSegment, value: any) => {
    const updated = [...(settings.segments || [])];
    updated[index] = { ...updated[index], [field]: value };

    // If changing linked productId, auto-populate name and image from product collection
    if (field === "productId" && value) {
      const matched = products.find((p) => p.id === value);
      if (matched) {
        updated[index].productName = matched.name;
        updated[index].productImage =
          matched.image || matched.primary_image || (matched.images && matched.images[0]) || "";
      }
    }

    setSettings({ ...settings, segments: updated });
  };

  // Calculate sum of segment probabilities
  const totalProbability = useMemo(() => {
    return (settings.segments || []).reduce(
      (sum, s) => sum + (Number(s.probability) || 0),
      0
    );
  }, [settings.segments]);

  // Filter rewards list
  const filteredRewards = useMemo(() => {
    return rewards.filter((r) => {
      const matchesSearch =
        !rewardSearch ||
        r.id.toLowerCase().includes(rewardSearch.toLowerCase()) ||
        (r.customerName && r.customerName.toLowerCase().includes(rewardSearch.toLowerCase())) ||
        (r.customerPhone && r.customerPhone.includes(rewardSearch)) ||
        (r.productName && r.productName.toLowerCase().includes(rewardSearch.toLowerCase())) ||
        (r.segmentLabel && r.segmentLabel.toLowerCase().includes(rewardSearch.toLowerCase()));

      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rewards, rewardSearch, statusFilter]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#64152F] mb-3" />
        <p className={`text-sm ${isLight ? "text-slate-600" : "text-white/60"}`}>
          Loading Spin & Win Promotion settings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Top Header & Global Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#64152F] to-[#D90429] flex items-center justify-center text-white shadow-md">
              <Gift className="w-5 h-5 text-[#FFE875]" />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${isLight ? "text-[#0F172A]" : "text-white"}`}>
                Spin &amp; Win Promotion
              </h1>
              <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
                Configure first-order interactive prize wheel, gift products, inventory, and checkout redemption rules
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={rewardsLoading}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isLight
                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${rewardsLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-[#64152F] to-[#8A1C3E] hover:from-[#7A1939] hover:to-[#A3224B] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer border border-[#FFE875]/30 active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#FFE875]" />
                <span>Saving Settings...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Settings Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#FFE875]" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Metric KPI Cards (100% Real Analytics) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between shadow-xs ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`}>
            Total Spins
          </span>
          <p className={`text-2xl font-black mt-2 ${isLight ? "text-slate-900" : "text-white"}`}>
            {stats.totalSpins.toLocaleString()}
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between shadow-xs ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`}>
            Rewards Issued
          </span>
          <p className="text-2xl font-black mt-2 text-blue-500">
            {stats.rewardsIssued.toLocaleString()}
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between shadow-xs ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`}>
            Redeemed at Checkout
          </span>
          <p className="text-2xl font-black mt-2 text-emerald-500">
            {stats.rewardsRedeemed.toLocaleString()}
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between shadow-xs ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`}>
            Active Unredeemed
          </span>
          <p className="text-2xl font-black mt-2 text-amber-500">
            {stats.unredeemed.toLocaleString()}
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between shadow-xs ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`}>
            Expired
          </span>
          <p className={`text-2xl font-black mt-2 ${isLight ? "text-slate-400" : "text-white/40"}`}>
            {stats.expired.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Section 1: Promotion Switches & Rules ── */}
      <div
        className={`p-6 sm:p-7 rounded-[24px] border shadow-xs space-y-6 ${
          isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              Master Promotion Controls
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-medium">Changes apply immediately</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main On/Off Switch */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            settings.enabled
              ? "bg-emerald-500/10 border-emerald-500/30"
              : isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
          }`}>
            <div>
              <p className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                Entire Promotion Status
              </p>
              <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-white/60"}`}>
                {settings.enabled ? "Active: spins and rewards enabled" : "Halted: no new spins allowed"}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleTogglePromo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Popup Modal Independent Toggle */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            settings.popupEnabled
              ? "bg-blue-500/10 border-blue-500/30"
              : isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
          }`}>
            <div>
              <p className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                Welcome Popup Auto-Display
              </p>
              <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-white/60"}`}>
                {settings.popupEnabled ? "Auto-opens on homepage for new visitors" : "Only opens via floating button"}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.popupEnabled}
                onChange={(e) => handleTogglePopup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Copy & Policy Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white/70">
              Badge Text
            </label>
            <input
              type="text"
              value={settings.badgeText || ""}
              onChange={(e) => setSettings({ ...settings, badgeText: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                isLight ? "bg-slate-50 border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white/70">
              Main Popup Heading
            </label>
            <input
              type="text"
              value={settings.heading || ""}
              onChange={(e) => setSettings({ ...settings, heading: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                isLight ? "bg-slate-50 border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
              }`}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white/70">
              Promotional Description
            </label>
            <textarea
              rows={2}
              value={settings.description || ""}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                isLight ? "bg-slate-50 border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white/70">
              Reward Expiration (Days)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={settings.rewardExpiryDays || 7}
              onChange={(e) => setSettings({ ...settings, rewardExpiryDays: parseInt(e.target.value) || 7 })}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                isLight ? "bg-slate-50 border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white/70">
              Max Spins Per Customer
            </label>
            <input
              type="number"
              min={1}
              max={3}
              value={settings.maxSpinsPerCustomer || 1}
              onChange={(e) => setSettings({ ...settings, maxSpinsPerCustomer: parseInt(e.target.value) || 1 })}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                isLight ? "bg-slate-50 border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
              }`}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white/70">
              Terms &amp; Conditions Copy
            </label>
            <textarea
              rows={4}
              value={settings.termsAndConditions || ""}
              onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                isLight ? "bg-slate-50 border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
              }`}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Wheel Segments & Gift Products Configurator ── */}
      <div
        className={`p-6 sm:p-7 rounded-[24px] border shadow-xs space-y-6 ${
          isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
              <Layers className="w-5 h-5 text-[#64152F]" />
              <span>Prize Wheel Segments &amp; Gift Inventory</span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
              Select actual gift products from your store database, assign inventory limits, and tune winning probabilities
            </p>
          </div>

          {/* Probability Indicator Badge */}
          <div
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              totalProbability === 100
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            <span>Total Probability:</span>
            <span className="font-black text-sm">{totalProbability}%</span>
            {totalProbability !== 100 && (
              <span className="text-[10px] font-normal text-amber-300">(Should equal 100%)</span>
            )}
          </div>
        </div>

        {/* Segments Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(settings.segments || []).map((seg, idx) => (
            <div
              key={seg.id || idx}
              className={`p-4 rounded-2xl border space-y-3 transition-all relative ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"
              }`}
            >
              {/* Segment Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-xs font-black uppercase text-white/90">
                    Slot {idx + 1}: {seg.label}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white/70 uppercase">
                  {seg.type}
                </span>
              </div>

              {/* Label */}
              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                  Wheel Label
                </label>
                <input
                  type="text"
                  value={seg.label}
                  onChange={(e) => handleSegmentChange(idx, "label", e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none ${
                    isLight ? "bg-white border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
                  }`}
                />
              </div>

              {/* Color Swatch / Hex */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                    Slice Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={seg.color}
                      onChange={(e) => handleSegmentChange(idx, "color", e.target.value)}
                      className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={seg.color}
                      onChange={(e) => handleSegmentChange(idx, "color", e.target.value)}
                      className={`w-full px-2 py-1 rounded text-[11px] font-mono border ${
                        isLight ? "bg-white border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                    Reward Type
                  </label>
                  <select
                    value={seg.type}
                    onChange={(e) => handleSegmentChange(idx, "type", e.target.value)}
                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-semibold border outline-none ${
                      isLight ? "bg-white border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
                    }`}
                  >
                    <option value="gift">Physical Free Gift</option>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="discount">Order Discount</option>
                  </select>
                </div>
              </div>

              {/* Linked Product from Store Database (for physical gifts) */}
              {seg.type === "gift" && (
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                    Linked Store Product (Auto-Added to Cart at LKR 0)
                  </label>
                  <select
                    value={seg.productId || ""}
                    onChange={(e) => handleSegmentChange(idx, "productId", e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none truncate ${
                      isLight ? "bg-white border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
                    }`}
                  >
                    <option value="">-- Choose Store Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.price)})
                      </option>
                    ))}
                  </select>

                  {seg.productName && (
                    <p className="text-[10px] text-emerald-400 font-semibold mt-1 truncate">
                      ✓ {seg.productName}
                    </p>
                  )}
                </div>
              )}

              {/* Inventory & Probability */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                    Remaining Stock
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={seg.inventory ?? 0}
                    onChange={(e) => handleSegmentChange(idx, "inventory", parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                      seg.inventory <= 0 ? "border-red-500 text-red-400" : ""
                    } ${isLight ? "bg-white border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"}`}
                  />
                  {seg.inventory <= 0 && (
                    <span className="text-[9px] text-red-400 font-bold">Out of stock (Won&apos;t be awarded)</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                    Win Chance (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={seg.probability ?? 0}
                    onChange={(e) => handleSegmentChange(idx, "probability", parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                      isLight ? "bg-white border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Issued Rewards & Audit Trail ── */}
      <div
        className={`p-6 sm:p-7 rounded-[24px] border shadow-xs space-y-5 ${
          isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
              <Clock className="w-5 h-5 text-blue-500" />
              <span>Customer Rewards &amp; Redemption Log</span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
              Track issued gifts, check checkout redemptions, and inspect expiry records
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search phone, reward, ID..."
                value={rewardSearch}
                onChange={(e) => setRewardSearch(e.target.value)}
                className={`pl-9 pr-4 py-2 rounded-xl text-xs font-medium border outline-none ${
                  isLight ? "bg-white border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
                }`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                isLight ? "bg-white border-slate-300 text-black" : "bg-white/5 border-white/10 text-white"
              }`}
            >
              <option value="all">All Status</option>
              <option value="issued">Issued / Unredeemed</option>
              <option value="redeemed">Redeemed at Checkout</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Rewards Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-white/70"}`}>
                <th className="p-3.5 font-bold uppercase tracking-wider">Reward ID</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Customer</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Reward Won</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Status</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Issued Date</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Redeemed Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredRewards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">
                    No reward records match your current filter.
                  </td>
                </tr>
              ) : (
                filteredRewards.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isLight ? "text-slate-800" : "text-white/90"
                    }`}
                  >
                    <td className="p-3.5 font-mono text-[11px] text-white/60 select-all">
                      {r.id}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-xs">{r.customerName || "Customer"}</p>
                      <p className="text-[11px] text-white/50">{r.customerPhone || r.customerEmail || "Guest"}</p>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {r.productImage && (
                          <img
                            src={r.productImage}
                            alt=""
                            className="w-7 h-7 rounded-md object-cover border border-white/10 shrink-0"
                          />
                        )}
                        <div>
                          <p className="font-bold text-xs">{r.productName || r.segmentLabel}</p>
                          <span className="text-[10px] text-white/40 uppercase">{r.rewardType}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {r.status === "redeemed" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] uppercase">
                          ✓ Redeemed
                        </span>
                      ) : r.status === "expired" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-extrabold text-[10px] uppercase">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 font-extrabold text-[10px] uppercase">
                          ● Issued / Active
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-white/60 text-[11px]">
                      {new Date(r.issuedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      {r.orderId ? (
                        <span className="text-emerald-400 font-bold select-all">
                          {r.orderId}
                        </span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
