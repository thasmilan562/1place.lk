"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CircleCheck as Sparkles,
  Save,
  CheckCircle2,
  Sliders,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  Tag,
  HelpCircle,
} from "lucide-react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, NewArrivalsSettings } from "@/lib/types";
import { DEFAULT_NEW_ARRIVALS_SETTINGS } from "@/lib/data";
import { formatPrice } from "@/lib/utils";

interface NewArrivalsControlProps {
  products: Product[];
}

export default function NewArrivalsControl({ products }: NewArrivalsControlProps) {
  const [settings, setSettings] = useState<NewArrivalsSettings>(DEFAULT_NEW_ARRIVALS_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Search & Filter within catalog for adding products
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Load settings from Firestore doc `settings/new_arrivals`
  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, "settings", "new_arrivals");
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        setLoading(false);
        if (snap.exists()) {
          const data = snap.data() as NewArrivalsSettings;
          setSettings({
            ...DEFAULT_NEW_ARRIVALS_SETTINGS,
            ...data,
            custom_product_ids: Array.isArray(data.custom_product_ids)
              ? data.custom_product_ids
              : [],
          });
        }
      },
      (err) => {
        console.warn("Error reading new_arrivals settings:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute list of selected Product objects in exact custom order
  const selectedProducts = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return (settings.custom_product_ids || [])
      .map((id) => map.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [products, settings.custom_product_ids]);

  // Categories list for filter dropdown
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category_name) set.add(p.category_name);
    });
    return Array.from(set);
  }, [products]);

  // Filter available products to add
  const availableProductsToAdd = useMemo(() => {
    const selectedSet = new Set(settings.custom_product_ids || []);
    return products.filter((p) => {
      const isSelected = selectedSet.has(p.id);
      const matchesSearch =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryFilter === "all" ||
        (p.category_name &&
          p.category_name.toLowerCase() === selectedCategoryFilter.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [products, settings.custom_product_ids, searchQuery, selectedCategoryFilter]);

  // Handlers
  const handleAddProduct = (prodId: string) => {
    if ((settings.custom_product_ids || []).includes(prodId)) return;
    setSettings((prev) => ({
      ...prev,
      custom_product_ids: [...(prev.custom_product_ids || []), prodId],
    }));
  };

  const handleRemoveProduct = (prodId: string) => {
    setSettings((prev) => ({
      ...prev,
      custom_product_ids: (prev.custom_product_ids || []).filter((id) => id !== prodId),
    }));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const list = [...(settings.custom_product_ids || [])];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    setSettings((prev) => ({ ...prev, custom_product_ids: list }));
  };

  const handleMoveDown = (index: number) => {
    const list = [...(settings.custom_product_ids || [])];
    if (index >= list.length - 1) return;
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
    setSettings((prev) => ({ ...prev, custom_product_ids: list }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "new_arrivals"), settings, { merge: true });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error("Failed to save new arrivals settings:", e);
      alert("Failed to save New Arrivals settings");
    } finally {
      setSaving(false);
    }
  };

  const displayCountPills = [4, 6, 8, 10, 12, 16, 20];

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1 border border-amber-500/30">
              <span>HOMEPAGE CURATION</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              New Arrivals Homepage Product Manager
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              Custom select exactly which products appear on the homepage New Arrivals section &amp; control total display count.
            </p>
          </div>
        </div>

        {/* Section Toggle & Expand */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <div className="flex items-center gap-2 bg-white/5 p-1.5 px-3 rounded-xl border border-white/10">
            <span className="text-xs font-bold text-white/80">
              {settings.enabled !== false ? "Section Visible" : "Section Hidden"}
            </span>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, enabled: prev.enabled === false }))}
              className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${settings.enabled !== false ? "bg-emerald-500" : "bg-white/20"
                }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${settings.enabled !== false ? "translate-x-5" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* ── 1. Selection Mode & Display Count Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Mode Selector Card */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                Product Selection Mode
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Custom Curated */}
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, mode: "custom" }))}
                  className={`p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${settings.mode === "custom"
                      ? "bg-blue-500/20 border-blue-400 text-white shadow-lg"
                      : "bg-black/30 border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black">🎯 Custom Selection</span>
                    {settings.mode === "custom" && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Manually pick and order exact products you want to showcase.
                  </p>
                </button>

                {/* Automatic Latest */}
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, mode: "automatic" }))}
                  className={`p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${settings.mode === "automatic"
                      ? "bg-emerald-500/20 border-emerald-400 text-white shadow-lg"
                      : "bg-black/30 border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black">⚡ Automatic Mode</span>
                    {settings.mode === "automatic" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Auto-fetches latest products and items marked as &apos;New Arrival&apos;.
                  </p>
                </button>
              </div>
            </div>

            {/* Display Count (Limit) Card */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Homepage Display Count (Limit)
                </label>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {settings.display_count || 8} Products
                </span>
              </div>

              <p className="text-[11px] text-white/50">
                Choose how many products to display in the New Arrivals grid on the homepage:
              </p>

              {/* Quick Pills */}
              <div className="flex items-center flex-wrap gap-2 pt-1">
                {displayCountPills.map((count) => {
                  const isActive = (settings.display_count || 8) === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, display_count: count }))}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${isActive
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/20 scale-105"
                          : "bg-black/40 border border-white/10 text-white/70 hover:text-white hover:border-white/30"
                        }`}
                    >
                      {count}
                    </button>
                  );
                })}

                {/* Custom Number Input */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[11px] text-white/40 font-mono">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={settings.display_count || 8}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) {
                        setSettings((prev) => ({ ...prev, display_count: val }));
                      }
                    }}
                    className="w-16 px-2.5 py-1.5 bg-black/60 border border-white/15 rounded-lg text-xs text-white font-mono text-center outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* ── 2. Custom Product Selection Manager (Active when mode === 'custom') ── */}
          {settings.mode === "custom" && (
            <div className="space-y-5 border-t border-white/10 pt-5">

              {/* Active Selected Products List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-400" />
                      Selected Homepage Products ({selectedProducts.length})
                    </h4>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      Drag or use Move Up/Down arrows to adjust display order.
                    </p>
                  </div>

                  {selectedProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, custom_product_ids: [] }))}
                      className="text-[11px] text-red-400 hover:text-red-300 hover:underline font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {selectedProducts.length === 0 ? (
                  <div className="p-8 text-center bg-black/30 border border-dashed border-white/10 rounded-2xl space-y-2">
                    <Package className="w-8 h-8 mx-auto text-white/20" />
                    <p className="text-xs text-white/60 font-semibold">
                      No custom products selected yet.
                    </p>
                    <p className="text-[11px] text-white/40 max-w-sm mx-auto">
                      Search and click &quot;Add Product&quot; from the catalog below to add products to your New Arrivals section.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedProducts.map((product, idx) => {
                      const isOverLimit = idx >= (settings.display_count || 8);
                      const mainImage = product.images?.[0] || "/placeholder-phone.webp";

                      return (
                        <div
                          key={product.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center gap-3 relative group ${isOverLimit
                              ? "bg-black/30 border-white/5 opacity-60"
                              : "bg-zinc-800/80 border-white/15 hover:border-white/30 shadow-md"
                            }`}
                        >
                          {/* Order Badge */}
                          <div
                            className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${isOverLimit
                                ? "bg-white/10 text-white/40"
                                : "bg-emerald-500 text-black shadow-xs"
                              }`}
                          >
                            #{idx + 1}
                          </div>

                          {/* Image */}
                          <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={mainImage}
                              alt={product.name}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder-phone.webp";
                              }}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 pr-1">
                            <h5 className="text-xs font-bold text-white truncate leading-snug">
                              {product.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-emerald-400 font-bold">
                                {formatPrice(product.price)}
                              </span>
                              <span className="text-[9px] text-white/40 uppercase truncate">
                                {product.category_name || "General"}
                              </span>
                            </div>
                            {isOverLimit && (
                              <span className="text-[9px] text-amber-400/80 block mt-0.5">
                                (Beyond current limit of {settings.display_count})
                              </span>
                            )}
                          </div>

                          {/* Reorder & Remove Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveUp(idx)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-white/70 hover:text-white transition-colors cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === selectedProducts.length - 1}
                              onClick={() => handleMoveDown(idx)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-white/70 hover:text-white transition-colors cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(product.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors ml-0.5 cursor-pointer"
                              title="Remove from list"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Catalog Search & Add Box */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-400" />
                    Browse Catalog to Add Products
                  </h4>
                  <span className="text-[11px] text-white/40">
                    {availableProductsToAdd.length} products available
                  </span>
                </div>

                {/* Search & Category Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search catalog by name, brand..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 outline-none focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Available Products Scroll Grid */}
                <div className="max-h-64 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                  {availableProductsToAdd.length === 0 ? (
                    <div className="py-6 text-center text-xs text-white/40">
                      No matching products found.
                    </div>
                  ) : (
                    availableProductsToAdd.slice(0, 30).map((product) => {
                      const isSelected = (settings.custom_product_ids || []).includes(product.id);
                      const mainImage = product.images?.[0] || "/placeholder-phone.webp";

                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-white/15 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-black/50 border border-white/10 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                              <img
                                src={mainImage}
                                alt={product.name}
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder-phone.webp";
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{product.name}</p>
                              <p className="text-[10px] text-white/50 font-mono">
                                {formatPrice(product.price)}{" "}
                                {product.category_name && (
                                  <span className="text-white/30">• {product.category_name}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              isSelected
                                ? handleRemoveProduct(product.id)
                                : handleAddProduct(product.id)
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${isSelected
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-xs active:scale-95"
                              }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ── Action Footer ── */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setSettings(DEFAULT_NEW_ARRIVALS_SETTINGS)}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs rounded-xl border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>Saving Settings...</>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-800" /> Settings Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save New Arrivals Settings
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
