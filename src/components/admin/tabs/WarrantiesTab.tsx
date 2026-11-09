"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { WarrantyOption } from "@/lib/types";
import {
  Shield,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  Clock,
  Tag,
  Calendar,
  X,
  RotateCcw,
  MoreVertical,
  LayoutGrid,
  List,
  Check,
  CircleCheck as Sparkles,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";
import { db } from "@/lib/admin-firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { DEFAULT_WARRANTY_PRESETS } from "@/lib/warranties-data";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

export default function WarrantiesTab() {
  const { isLight } = useAdminTheme();

  const [warranties, setWarranties] = useState<WarrantyOption[]>(DEFAULT_WARRANTY_PRESETS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDuration, setSelectedDuration] = useState<string>("all");
  const [selectedPrice, setSelectedPrice] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name_asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Active dropdown action menu id for cards
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<WarrantyOption | null>(null);

  // Modal Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WarrantyOption["type"]>("Shop Warranty");
  const [durationValue, setDurationValue] = useState<number>(1);
  const [durationUnit, setDurationUnit] = useState<"months" | "years" | "lifetime" | "unlimited">("months");
  const [additionalPrice, setAdditionalPrice] = useState<number>(0);
  const [isDefault, setIsDefault] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingDefaults, setIsSyncingDefaults] = useState(false);

  // Close card menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    }
    if (activeMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuId]);

  // Load from Firestore
  useEffect(() => {
    async function fetchWarranties() {
      try {
        const snap = await getDocs(collection(db, "warranties"));
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as WarrantyOption));
          // Merge defaults with custom added warranties from firestore
          const mergedMap = new Map<string, WarrantyOption>();
          DEFAULT_WARRANTY_PRESETS.forEach((w) => mergedMap.set(w.title.toLowerCase(), w));
          list.forEach((w) => mergedMap.set(w.title.toLowerCase(), w));
          setWarranties(Array.from(mergedMap.values()));
        } else {
          setWarranties(DEFAULT_WARRANTY_PRESETS);
        }
      } catch (e) {
        console.warn("Using default warranties fallback:", e);
        setWarranties(DEFAULT_WARRANTY_PRESETS);
      }
    }
    fetchWarranties();
  }, []);

  const openAddModal = () => {
    setEditingWarranty(null);
    setTitle("");
    setType("Shop Warranty");
    setDurationValue(1);
    setDurationUnit("months");
    setAdditionalPrice(0);
    setIsDefault(false);
    setStatus("active");
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const openEditModal = (w: WarrantyOption) => {
    setEditingWarranty(w);
    setTitle(w.title);
    setType(w.type);
    setDurationValue(Number(w.duration_value) || 1);
    setDurationUnit((w.duration_unit as any) || "months");
    setAdditionalPrice(w.additional_price || 0);
    setIsDefault(!!w.is_default);
    setStatus(w.status || "active");
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter a warranty title.");
      return;
    }

    setIsSaving(true);
    try {
      const id = editingWarranty?.id || `w-${Date.now()}`;
      const payload: WarrantyOption = {
        id,
        title: title.trim(),
        type,
        duration_value: Number(durationValue) || 1,
        duration_unit: durationUnit,
        additional_price: Number(additionalPrice) || 0,
        coverage_details: editingWarranty?.coverage_details || "",
        is_default: isDefault,
        status,
        sort_order: editingWarranty?.sort_order || warranties.length + 1,
      };

      await setDoc(doc(db, "warranties", id), payload, { merge: true });

      // If marked default, toggle others
      if (isDefault) {
        setWarranties((prev) =>
          prev.map((item) =>
            item.id === id ? payload : { ...item, is_default: false }
          )
        );
      } else {
        setWarranties((prev) => {
          const filtered = prev.filter((item) => item.id !== id);
          return [...filtered, payload];
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Save warranty error:", err);
      alert("Failed to save warranty.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this warranty preset?")) return;
    try {
      await deleteDoc(doc(db, "warranties", id));
      setWarranties((prev) => prev.filter((item) => item.id !== id));
      setActiveMenuId(null);
    } catch (e) {
      console.error("Delete warranty error:", e);
      alert("Failed to delete warranty.");
    }
  };

  const handleToggleDefault = async (w: WarrantyOption) => {
    try {
      const newDefault = !w.is_default;
      const updated = { ...w, is_default: newDefault };
      await setDoc(doc(db, "warranties", w.id), updated, { merge: true });
      setWarranties((prev) =>
        prev.map((item) =>
          item.id === w.id
            ? updated
            : newDefault
            ? { ...item, is_default: false }
            : item
        )
      );
      setActiveMenuId(null);
    } catch (e) {
      console.error("Toggle default error:", e);
      alert("Failed to update default state.");
    }
  };

  const handleSyncDefaults = async () => {
    setIsSyncingDefaults(true);
    try {
      for (const w of DEFAULT_WARRANTY_PRESETS) {
        await setDoc(doc(db, "warranties", w.id), w, { merge: true });
      }
      setWarranties(DEFAULT_WARRANTY_PRESETS);
      alert("All 28 official Sri Lankan warranties synchronized to database!");
    } catch (e) {
      console.error("Sync error:", e);
      alert("Failed to sync presets to database.");
    } finally {
      setIsSyncingDefaults(false);
    }
  };

  // Convert duration to numeric months for sorting & filtering
  const getDurationMonths = (w: WarrantyOption) => {
    if (w.duration_unit === "lifetime" || w.duration_unit === "unlimited") return 9999;
    if (w.duration_unit === "years") return (Number(w.duration_value) || 0) * 12;
    return Number(w.duration_value) || 0;
  };

  // Filter & Sort
  const filteredWarranties = useMemo(() => {
    let result = [...warranties];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.type.toLowerCase().includes(q)
      );
    }

    // Type Filter
    if (selectedType !== "all") {
      result = result.filter((w) => w.type === selectedType);
    }

    // Duration Filter
    if (selectedDuration !== "all") {
      result = result.filter((w) => {
        const m = getDurationMonths(w);
        if (selectedDuration === "1m") return m === 1;
        if (selectedDuration === "3m") return m === 3;
        if (selectedDuration === "6m") return m === 6;
        if (selectedDuration === "1y") return m >= 12 && m <= 18;
        if (selectedDuration === "2y+") return m >= 24 && m < 9999;
        if (selectedDuration === "lifetime") return w.duration_unit === "lifetime" || w.duration_unit === "unlimited";
        return true;
      });
    }

    // Price Filter
    if (selectedPrice !== "all") {
      if (selectedPrice === "free") {
        result = result.filter((w) => !w.additional_price || w.additional_price === 0);
      } else if (selectedPrice === "paid") {
        result = result.filter((w) => w.additional_price && w.additional_price > 0);
      }
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name_asc") return a.title.localeCompare(b.title);
      if (sortBy === "name_desc") return b.title.localeCompare(a.title);
      if (sortBy === "duration_asc") return getDurationMonths(a) - getDurationMonths(b);
      if (sortBy === "duration_desc") return getDurationMonths(b) - getDurationMonths(a);
      if (sortBy === "price_asc") return (a.additional_price || 0) - (b.additional_price || 0);
      if (sortBy === "price_desc") return (b.additional_price || 0) - (a.additional_price || 0);
      return 0;
    });

    return result;
  }, [warranties, searchQuery, selectedType, selectedDuration, selectedPrice, sortBy]);

  // Format Duration display
  const formatDuration = (w: WarrantyOption) => {
    if (w.duration_unit === "lifetime") return "Lifetime";
    if (w.duration_unit === "unlimited") return "Unlimited";
    const v = w.duration_value;
    if (w.duration_unit === "years") {
      return Number(v) === 1 ? "1 year" : `${v} years`;
    }
    if (w.duration_unit === "months") {
      return Number(v) === 1 ? "1 month" : `${v} months`;
    }
    return `${v} ${w.duration_unit}`;
  };

  // Format Price display
  const formatPrice = (price?: number) => {
    if (!price || price === 0) return "Free";
    return `LKR ${Number(price).toLocaleString()}`;
  };

  return (
    <div
      className={`space-y-5 animate-fadeIn ${
        isLight ? "text-slate-900" : "text-[#F8FAFC]"
      }`}
    >
      {/* ──────────────────────────────────────────────────────────
          HEADER
          ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isLight
                ? "bg-blue-50 text-blue-600 border border-blue-100 shadow-sm"
                : "bg-blue-600/10 text-blue-500 border border-blue-500/20"
            }`}
          >
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1
              className={`text-2xl font-bold tracking-tight ${
                isLight ? "text-slate-900" : "text-[#F8FAFC]"
              }`}
            >
              Warranty Plans
            </h1>
            <p
              className={`text-[13px] font-normal mt-0.5 ${
                isLight ? "text-slate-500" : "text-[#94A3B8]"
              }`}
            >
              Manage manufacturer and shop warranty presets. These appear automatically in the Product Editor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleSyncDefaults}
            disabled={isSyncingDefaults}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border disabled:opacity-50 ${
              isLight
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
                : "bg-[#121A25] hover:bg-[#1A2535] text-[#F8FAFC] border-white/[0.08]"
            }`}
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${
                isSyncingDefaults ? "animate-spin" : isLight ? "text-slate-500" : "text-slate-400"
              }`}
            />
            <span>
              {isSyncingDefaults ? "Syncing Presets..." : "Sync 28 Official Presets"}
            </span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Warranty Plan</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          SEARCH / FILTER BAR
          ────────────────────────────────────────────────────────── */}
      <div
        className={`rounded-2xl p-2.5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-[#0E141D] border-white/[0.08]"
        }`}
      >
        {/* Left: Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isLight ? "text-slate-400" : "text-[#94A3B8]"
            }`}
          />
          <input
            type="text"
            placeholder="Search warranty plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-transparent pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none transition-colors ${
              isLight
                ? "text-slate-900 placeholder-slate-400 focus:bg-slate-50"
                : "text-[#F8FAFC] placeholder-slate-500 focus:bg-white/[0.03]"
            }`}
          />
        </div>

        {/* Right: Filters, Sorting & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border focus:outline-none transition-colors cursor-pointer ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-700"
                : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC]"
            }`}
          >
            <option value="all" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              All Types
            </option>
            <option value="Shop Warranty" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Shop Warranty
            </option>
            <option value="Manufacturer Warranty" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Manufacturer Warranty
            </option>
            <option value="Extended Warranty" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Extended Warranty
            </option>
            <option value="No Warranty" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              No Warranty
            </option>
          </select>

          {/* Duration Filter */}
          <select
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border focus:outline-none transition-colors cursor-pointer ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-700"
                : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC]"
            }`}
          >
            <option value="all" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              All Durations
            </option>
            <option value="1m" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              1 Month
            </option>
            <option value="3m" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              3 Months
            </option>
            <option value="6m" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              6 Months
            </option>
            <option value="1y" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              12–18 Months
            </option>
            <option value="2y+" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              2+ Years
            </option>
            <option value="lifetime" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Lifetime
            </option>
          </select>

          {/* Price Filter */}
          <select
            value={selectedPrice}
            onChange={(e) => setSelectedPrice(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border focus:outline-none transition-colors cursor-pointer ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-700"
                : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC]"
            }`}
          >
            <option value="all" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              All Prices
            </option>
            <option value="free" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Free
            </option>
            <option value="paid" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Paid
            </option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border focus:outline-none transition-colors cursor-pointer ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-700"
                : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC]"
            }`}
          >
            <option value="name_asc" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Sort: Name (A–Z)
            </option>
            <option value="name_desc" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Sort: Name (Z–A)
            </option>
            <option value="duration_asc" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Sort: Duration (Shortest)
            </option>
            <option value="duration_desc" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Sort: Duration (Longest)
            </option>
            <option value="price_asc" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Sort: Price (Lowest)
            </option>
            <option value="price_desc" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
              Sort: Price (Highest)
            </option>
          </select>

          {/* Grid / List View Toggle */}
          <div
            className={`flex items-center p-0.5 rounded-xl border ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-600"
                : "bg-[#121A25] border-white/[0.08] text-[#94A3B8]"
            }`}
          >
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? isLight
                    ? "bg-white text-blue-600 shadow-sm"
                    : "bg-[#2563EB] text-white"
                  : "hover:text-white"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list"
                  ? isLight
                    ? "bg-white text-blue-600 shadow-sm"
                    : "bg-[#2563EB] text-white"
                  : "hover:text-white"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Count */}
      <div className="flex items-center justify-between text-xs px-1">
        <span
          className={`font-medium ${
            isLight ? "text-slate-500" : "text-[#94A3B8]"
          }`}
        >
          {filteredWarranties.length} warranty plans
        </span>
      </div>

      {/* ──────────────────────────────────────────────────────────
          WARRANTIES GRID / LIST
          ────────────────────────────────────────────────────────── */}
      {filteredWarranties.length === 0 ? (
        <div
          className={`text-center py-16 rounded-2xl border ${
            isLight
              ? "bg-white border-slate-200 text-slate-500"
              : "bg-[#0E141D] border-white/[0.08] text-slate-400"
          }`}
        >
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold">No warranty plans found</h3>
          <p className="text-xs mt-1 max-w-sm mx-auto opacity-70">
            No warranty plans match your current search or filter criteria. Try resetting your filters or create a new plan.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedType("all");
              setSelectedDuration("all");
              setSelectedPrice("all");
            }}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ── 3-Column Desktop / 2-Column Tablet / 1-Column Mobile ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarranties.map((w) => {
            const isMfg = w.type === "Manufacturer Warranty";
            const isMenuOpen = activeMenuId === w.id;

            return (
              <div
                key={w.id}
                className={`relative rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 hover:shadow-lg ${
                  isLight
                    ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                    : "bg-[#0E141D] border-white/[0.08] hover:border-white/[0.16]"
                }`}
              >
                <div>
                  {/* Top Row: Badges & Menu */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Badge: Manufacturer vs Shop Warranty */}
                    {isMfg ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight ${
                          isLight
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : "bg-[#1D4ED8] text-white shadow-sm"
                        }`}
                      >
                        <Shield className="w-3 h-3 shrink-0" />
                        <span>Manufacturer Warranty</span>
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-tight border ${
                          isLight
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-white/[0.06] text-slate-300 border-white/10"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3 shrink-0" />
                        <span>{w.type || "Shop Warranty"}</span>
                      </span>
                    )}

                    {/* Right side: Default Selection & Menu button */}
                    <div className="flex items-center gap-1.5">
                      {w.is_default && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            isLight
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-emerald-500/10 text-[#10B981] border-emerald-500/40"
                          }`}
                        >
                          Default Selection
                        </span>
                      )}

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : w.id);
                          }}
                          className={`p-1 rounded-lg transition-colors ${
                            isLight
                              ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5"
                          }`}
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className={`absolute right-0 top-full mt-1.5 w-48 rounded-xl border shadow-2xl py-1.5 z-30 animate-fadeIn ${
                              isLight
                                ? "bg-white border-slate-200 text-slate-800"
                                : "bg-[#121A25] border-white/[0.12] text-[#F8FAFC]"
                            }`}
                          >
                            <button
                              onClick={() => handleToggleDefault(w)}
                              className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 transition-colors ${
                                isLight
                                  ? "hover:bg-slate-50 text-slate-700"
                                  : "hover:bg-white/5 text-slate-300 hover:text-white"
                              }`}
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 ${
                                  w.is_default ? "text-emerald-500" : "text-slate-400"
                                }`}
                              />
                              <span>
                                {w.is_default
                                  ? "Remove Default"
                                  : "Set as Default Selection"}
                              </span>
                            </button>

                            <button
                              onClick={() => openEditModal(w)}
                              className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 transition-colors ${
                                isLight
                                  ? "hover:bg-slate-50 text-slate-700"
                                  : "hover:bg-white/5 text-slate-300 hover:text-white"
                              }`}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Edit Warranty</span>
                            </button>

                            <div
                              className={`my-1 border-t ${
                                isLight ? "border-slate-100" : "border-white/5"
                              }`}
                            />

                            <button
                              onClick={() => handleDelete(w.id)}
                              className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Plan</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main Title: 15-16px semibold */}
                  <h3
                    className={`text-[15px] font-semibold tracking-tight mt-3.5 leading-snug line-clamp-2 ${
                      isLight ? "text-slate-900" : "text-[#F8FAFC]"
                    }`}
                  >
                    {w.title}
                  </h3>

                  {/* Metadata Row: Duration & Price */}
                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        isLight ? "text-slate-600" : "text-[#94A3B8]"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span>{formatDuration(w)}</span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 font-medium ${
                        !w.additional_price || w.additional_price === 0
                          ? isLight
                            ? "text-emerald-600"
                            : "text-[#10B981]"
                          : isLight
                          ? "text-blue-600"
                          : "text-blue-400"
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span>{formatPrice(w.additional_price)}</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Right aligned Edit & Delete buttons */}
                <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-inherit">
                  <button
                    onClick={() => openEditModal(w)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isLight
                        ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-[#141E2B] hover:bg-[#1C2A3C] text-slate-300 hover:text-white border-white/[0.08]"
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(w.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                    title="Delete plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Compact List View ── */
        <div
          className={`rounded-2xl border overflow-hidden shadow-sm ${
            isLight
              ? "bg-white border-slate-200"
              : "bg-[#0E141D] border-white/[0.08]"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b font-semibold uppercase text-[10px] tracking-wider ${
                  isLight
                    ? "bg-slate-50 text-slate-500 border-slate-200"
                    : "bg-[#121A25] text-slate-400 border-white/[0.08]"
                }`}
              >
                <tr>
                  <th className="px-5 py-3.5">Plan Title</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5">Default</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isLight ? "divide-slate-100" : "divide-white/[0.05]"
                }`}
              >
                {filteredWarranties.map((w) => (
                  <tr
                    key={w.id}
                    className={`transition-colors ${
                      isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-5 py-3 font-semibold text-sm">
                      {w.title}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                          w.type === "Manufacturer Warranty"
                            ? isLight
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : "bg-[#1D4ED8] text-white"
                            : isLight
                            ? "bg-slate-100 text-slate-700"
                            : "bg-white/[0.06] text-slate-300"
                        }`}
                      >
                        {w.type}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        isLight ? "text-slate-600" : "text-[#94A3B8]"
                      }`}
                    >
                      {formatDuration(w)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatPrice(w.additional_price)}
                    </td>
                    <td className="px-4 py-3">
                      {w.is_default ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            isLight
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                          }`}
                        >
                          Default
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(w)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            isLight
                              ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                              : "bg-[#141E2B] hover:bg-[#1C2A3C] text-slate-300 hover:text-white border-white/[0.08]"
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          ADD / EDIT WARRANTY MODAL
          ────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`relative w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 border transition-all ${
              isLight
                ? "bg-white border-slate-200 text-slate-900"
                : "bg-[#0E141D] border-white/[0.12] text-[#F8FAFC]"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isLight ? "border-slate-100" : "border-white/[0.08]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isLight
                      ? "bg-blue-50 text-blue-600"
                      : "bg-blue-600/10 text-blue-500"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold tracking-tight">
                  {editingWarranty ? "Edit Warranty Plan" : "Add Warranty Plan"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${
                  isLight
                    ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Title */}
              <div className="space-y-1.5">
                <label
                  className={`font-semibold ${
                    isLight ? "text-slate-700" : "text-[#94A3B8]"
                  }`}
                >
                  Warranty Plan Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. One Year Official Apple Care"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none transition-colors ${
                    isLight
                      ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                      : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC] placeholder-slate-500 focus:border-blue-500"
                  }`}
                />
              </div>

              {/* Type & Additional Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    className={`font-semibold ${
                      isLight ? "text-slate-700" : "text-[#94A3B8]"
                    }`}
                  >
                    Warranty Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition-colors ${
                      isLight
                        ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500"
                        : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC] focus:border-blue-500"
                    }`}
                  >
                    <option value="Shop Warranty" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
                      Shop Warranty
                    </option>
                    <option value="Manufacturer Warranty" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
                      Manufacturer Warranty
                    </option>
                    <option value="Extended Warranty" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
                      Extended Warranty
                    </option>
                    <option value="No Warranty" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
                      No Warranty
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    className={`font-semibold ${
                      isLight ? "text-slate-700" : "text-[#94A3B8]"
                    }`}
                  >
                    Additional Price (LKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={additionalPrice}
                    onChange={(e) => setAdditionalPrice(Number(e.target.value))}
                    placeholder="0 (Free)"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none transition-colors ${
                      isLight
                        ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                        : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC] placeholder-slate-500 focus:border-blue-500"
                    }`}
                  />
                </div>
              </div>

              {/* Duration Value & Unit */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  isLight
                    ? "bg-slate-50 border-slate-200"
                    : "bg-white/[0.02] border-white/[0.06]"
                }`}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      className={`font-semibold flex items-center gap-1.5 ${
                        isLight ? "text-slate-700" : "text-[#94A3B8]"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>Duration Value</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={durationValue}
                      onChange={(e) => setDurationValue(Number(e.target.value))}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition-colors ${
                        isLight
                          ? "bg-white border-slate-200 text-slate-900 focus:border-blue-500"
                          : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC] focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className={`font-semibold ${
                        isLight ? "text-slate-700" : "text-[#94A3B8]"
                      }`}
                    >
                      Duration Unit
                    </label>
                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value as any)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition-colors ${
                        isLight
                          ? "bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                          : "bg-[#121A25] border-white/[0.08] text-[#F8FAFC] focus:border-blue-500"
                      }`}
                    >
                      <option value="months" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
                        Months
                      </option>
                      <option value="years" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
                        Years
                      </option>
                      <option value="lifetime" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
                        Lifetime
                      </option>
                      <option value="unlimited" className={isLight ? "bg-white" : "bg-[#0E141D]"}>
                        Unlimited
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Toggles: Default Selection & Active Status */}
              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white/10 border-white/20 cursor-pointer"
                  />
                  <span
                    className={`font-medium ${
                      isLight ? "text-slate-700" : "text-slate-200"
                    }`}
                  >
                    Default Selection
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={status === "active"}
                    onChange={(e) =>
                      setStatus(e.target.checked ? "active" : "inactive")
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white/10 border-white/20 cursor-pointer"
                  />
                  <span
                    className={`font-medium ${
                      isLight ? "text-slate-700" : "text-slate-200"
                    }`}
                  >
                    Active Status
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div
                className={`flex items-center justify-end gap-2.5 pt-4 border-t ${
                  isLight ? "border-slate-100" : "border-white/[0.08]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Save Warranty"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
