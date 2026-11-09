"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FolderTree,
  Save,
  Check,
  Smartphone,
  Monitor,
  Tablet,
  Eye,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  CircleCheck as Sparkles,
  RotateCcw,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Tag,
  Link2,
  CheckCircle2,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import {
  MegaMenuSettings,
  MegaMenuColumn,
  MegaMenuItem,
  MegaMenuDestinationType,
  MegaMenuSourceMode,
  Category,
  Brand,
  Product,
} from "@/lib/types";
import { DEFAULT_MEGA_MENU_SETTINGS } from "@/lib/data";
import MegaMenu from "@/components/layout/MegaMenu";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

interface MegaMenuTabProps {
  initialSettings?: MegaMenuSettings | null;
  categories?: Category[];
  brands?: Brand[];
  products?: Product[];
  onRefresh?: () => void;
}

export default function MegaMenuTab({
  initialSettings,
  categories = [],
  brands = [],
  products = [],
  onRefresh,
}: MegaMenuTabProps) {
  const { isLight } = useAdminTheme();
  const [settings, setSettings] = useState<MegaMenuSettings>(() => {
    return {
      ...DEFAULT_MEGA_MENU_SETTINGS,
      ...(initialSettings || {}),
      columns:
        initialSettings?.columns && initialSettings.columns.length > 0
          ? initialSettings.columns
          : DEFAULT_MEGA_MENU_SETTINGS.columns,
    };
  });

  const [activeSubTab, setActiveSubTab] = useState<"columns" | "appearance" | "audit">("columns");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [expandedColumnId, setExpandedColumnId] = useState<string | null>("col-categories");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState<"saved" | "published" | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync initialSettings if updated from outside
  useEffect(() => {
    if (initialSettings) {
      setSettings((prev) => ({
        ...prev,
        ...initialSettings,
        columns:
          initialSettings.columns && initialSettings.columns.length > 0
            ? initialSettings.columns
            : prev.columns,
      }));
    }
  }, [initialSettings]);

  // Track edits
  const updateSettings = (updater: (prev: MegaMenuSettings) => MegaMenuSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      setHasUnsavedChanges(true);
      return next;
    });
  };

  // Duplicate Category Quality Audit
  const duplicateCategoryWarnings = useMemo(() => {
    const nameMap = new Map<string, Category[]>();
    categories.forEach((cat) => {
      const key = cat.name.trim().toLowerCase();
      const list = nameMap.get(key) || [];
      list.push(cat);
      nameMap.set(key, list);
    });

    const duplicates: { name: string; items: Category[] }[] = [];
    nameMap.forEach((items, name) => {
      if (items.length > 1) {
        duplicates.push({ name, items });
      }
    });
    return duplicates;
  }, [categories]);

  // Column Actions
  const handleAddColumn = () => {
    const newColId = `col-${Date.now()}`;
    const newCol: MegaMenuColumn = {
      id: newColId,
      enabled: true,
      heading: "NEW SECTION",
      headingColor: "#71717A",
      headingSize: "sm",
      sourceMode: "manual",
      sortBy: "manual",
      maximumItems: 10,
      hideEmptyItems: false,
      width: 4,
      order: (settings.columns?.length || 0) + 1,
      items: [
        {
          id: `item-${Date.now()}`,
          enabled: true,
          label: "New Link",
          destinationType: "custom",
          href: "/products",
          bold: false,
          order: 1,
        },
      ],
    };

    updateSettings((prev) => ({
      ...prev,
      columns: [...(prev.columns || []), newCol],
    }));
    setExpandedColumnId(newColId);
  };

  const handleDuplicateColumn = (col: MegaMenuColumn) => {
    const newColId = `col-${Date.now()}`;
    const duplicated: MegaMenuColumn = {
      ...col,
      id: newColId,
      heading: `${col.heading} (Copy)`,
      order: (settings.columns?.length || 0) + 1,
      items: (col.items || []).map((item) => ({
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      })),
    };

    updateSettings((prev) => ({
      ...prev,
      columns: [...(prev.columns || []), duplicated],
    }));
    setExpandedColumnId(newColId);
  };

  const handleDeleteColumn = (colId: string) => {
    if (confirm("Are you sure you want to delete this column?")) {
      updateSettings((prev) => ({
        ...prev,
        columns: prev.columns.filter((c) => c.id !== colId),
      }));
    }
  };

  const handleMoveColumn = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.columns.length) return;

    updateSettings((prev) => {
      const cols = [...prev.columns];
      const temp = cols[index];
      cols[index] = cols[targetIndex];
      cols[targetIndex] = temp;
      return {
        ...prev,
        columns: cols.map((c, i) => ({ ...c, order: i + 1 })),
      };
    });
  };

  // Item Actions inside a Column
  const handleAddItem = (colId: string) => {
    const newItemId = `item-${Date.now()}`;
    const newItem: MegaMenuItem = {
      id: newItemId,
      enabled: true,
      label: "New Menu Item",
      destinationType: "custom",
      href: "/products",
      bold: false,
      order: 999,
    };

    updateSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => {
        if (col.id === colId) {
          const items = [...(col.items || []), newItem].map((it, idx) => ({
            ...it,
            order: idx + 1,
          }));
          return { ...col, items };
        }
        return col;
      }),
    }));
    setExpandedItemId(newItemId);
  };

  const handleDuplicateItem = (colId: string, item: MegaMenuItem) => {
    const newItemId = `item-${Date.now()}`;
    const duplicated: MegaMenuItem = {
      ...item,
      id: newItemId,
      label: `${item.label} (Copy)`,
    };

    updateSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => {
        if (col.id === colId) {
          const items = [...(col.items || []), duplicated].map((it, idx) => ({
            ...it,
            order: idx + 1,
          }));
          return { ...col, items };
        }
        return col;
      }),
    }));
    setExpandedItemId(newItemId);
  };

  const handleDeleteItem = (colId: string, itemId: string) => {
    updateSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            items: col.items.filter((it) => it.id !== itemId),
          };
        }
        return col;
      }),
    }));
  };

  const handleMoveItem = (colId: string, index: number, direction: "up" | "down") => {
    const col = settings.columns.find((c) => c.id === colId);
    if (!col || !col.items) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= col.items.length) return;

    updateSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => {
        if (c.id === colId) {
          const items = [...c.items];
          const temp = items[index];
          items[index] = items[targetIndex];
          items[targetIndex] = temp;
          return {
            ...c,
            items: items.map((it, i) => ({ ...it, order: i + 1 })),
          };
        }
        return c;
      }),
    }));
  };

  // Destination Type Change Helper (Auto-generates clean URLs)
  const handleItemDestinationChange = (
    colId: string,
    itemId: string,
    destType: MegaMenuDestinationType,
    destId: string,
    labelOverride?: string
  ) => {
    let generatedHref = "/products";

    if (destType === "category") {
      const cat = categories.find((c) => c.id === destId || c.slug === destId);
      if (cat) {
        generatedHref = cat.destination_url || `/products?category=${cat.slug || cat.id}`;
      }
    } else if (destType === "brand") {
      const brand = brands.find((b) => b.id === destId || b.slug === destId || b.name === destId);
      if (brand) {
        generatedHref = `/products?brand=${encodeURIComponent(brand.slug || brand.name)}`;
      }
    } else if (destType === "collection") {
      if (destId === "new-arrivals") generatedHref = "/products?sort=newest";
      else if (destId === "best-sellers") generatedHref = "/products?sort=featured";
      else if (destId === "offers") generatedHref = "/products?discount=true";
      else if (destId === "flagships") generatedHref = "/products?featured=true";
      else generatedHref = `/products?collection=${destId}`;
    } else if (destType === "page") {
      generatedHref = destId;
    }

    updateSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            items: col.items.map((it) => {
              if (it.id === itemId) {
                return {
                  ...it,
                  destinationType: destType,
                  destinationId: destId,
                  href: generatedHref,
                  label: labelOverride !== undefined ? labelOverride : it.label,
                };
              }
              return it;
            }),
          };
        }
        return col;
      }),
    }));
  };

  // Save Draft (saves draft payload to Firestore)
  const handleSaveDraft = async () => {
    setSaving(true);
    setSavedStatus(null);
    try {
      const payload: MegaMenuSettings = {
        ...settings,
        status: "draft",
        updatedAt: new Date().toISOString(),
        updatedBy: "Admin",
      };
      await setDoc(doc(db, "settings", "mega_menu"), payload, { merge: true });
      setHasUnsavedChanges(false);
      setSavedStatus("saved");
      setTimeout(() => setSavedStatus(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Save draft failed:", err);
      alert("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  // Publish Live (saves published configuration to Firestore)
  const handlePublishLive = async () => {
    setSaving(true);
    setSavedStatus(null);
    try {
      const payload: MegaMenuSettings = {
        ...settings,
        status: "published",
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        updatedBy: "Admin",
      };
      // Primary location
      await setDoc(doc(db, "settings", "mega_menu"), payload, { merge: true });
      // Secondary siteSettings location
      await setDoc(doc(db, "siteSettings", "categoryMegaMenu"), payload, { merge: true });

      setHasUnsavedChanges(false);
      setSavedStatus("published");
      setTimeout(() => setSavedStatus(null), 4000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Publish failed:", err);
      alert("Failed to publish category mega menu.");
    } finally {
      setSaving(false);
    }
  };

  // Restore 1PLACE.LK Defaults
  const handleResetDefaults = () => {
    if (confirm("Reset Category Mega Menu to 1PLACE.LK official 3-column defaults?")) {
      setSettings(DEFAULT_MEGA_MENU_SETTINGS);
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className="space-y-8 pb-20 font-sans">
      
      {/* ── TOP HEADER & PUBLISH ACTIONS ── */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl p-6`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl ${isLight ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-blue-500/10 text-blue-400 border-blue-500/20"} flex items-center justify-center border shrink-0`}>
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                Category Mega Menu
              </h1>
              <span
                className={`px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                  settings.status === "published" && !hasUnsavedChanges
                    ? isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : isLight ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}
              >
                ● {hasUnsavedChanges ? "Unsaved Changes" : settings.status || "Published"}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Control the desktop 3-column &ldquo;Shop by Category&rdquo; navigation and mobile accordion drawer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className={`px-3.5 py-2 font-medium text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
              isLight
                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Defaults
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className={`px-4 py-2 font-semibold text-xs rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                : "bg-white/10 hover:bg-white/20 text-white border-white/15"
            }`}
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>

          <button
            type="button"
            onClick={handlePublishLive}
            disabled={saving}
            className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : savedStatus === "published" ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" /> Published Live!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Publish Live
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── DUPLICATE CATEGORY WARNING BANNER (If Any) ── */}
      {duplicateCategoryWarnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-amber-200/90">
            <span className="font-bold block text-white mb-0.5">
              Category Quality Warning: Duplicate Category Names Detected in Database
            </span>
            <p className="text-[11px] opacity-80 mb-2">
              The storefront mega menu automatically normalizes casing (e.g. &ldquo;Gimbal&rdquo; and &ldquo;gimbal&rdquo;), but you may want to review and clean them:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {duplicateCategoryWarnings.map((dup, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md font-mono text-[10px]"
                >
                  {dup.name} ({dup.items.length} records)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE INTERACTIVE PREVIEW ── */}
      <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl p-6 space-y-4`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
              <Eye className={`w-4 h-4 ${isLight ? "text-blue-600" : "text-blue-400"}`} /> Live Storefront Preview
            </h3>
            <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Exact 1:1 replica of the desktop dropdown and mobile accordion drawer.
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
              <Smartphone className="w-3.5 h-3.5" /> Mobile Drawer
            </button>
          </div>
        </div>

        {/* Device Frame */}
        <div className={`rounded-xl p-4 sm:p-6 flex items-center justify-center overflow-x-auto min-h-[340px] border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#020617] border-white/5"}`}>
          <div
            className="transition-all duration-300 w-full"
            style={{
              maxWidth: previewDevice === "mobile" ? "360px" : previewDevice === "tablet" ? "768px" : "100%",
            }}
          >
            {previewDevice === "mobile" ? (
              <div className="bg-black border border-white/10 rounded-2xl p-4 text-white space-y-3 font-sans">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-extrabold text-white/50 uppercase">
                  <span>Mobile Drawer Menu</span>
                  <span>1PLACE.LK</span>
                </div>
                {settings.columns?.map((col, idx) => (
                  <div key={col.id || idx} className="border border-white/10 rounded-xl p-3 bg-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{col.heading}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <div className="space-y-1 pl-2 pt-1 border-t border-white/5">
                      {col.items?.slice(0, 5).map((it, i) => (
                        <div key={it.id || i} className="text-xs text-white/70 py-1 flex items-center justify-between">
                          <span className={it.bold ? "font-bold text-white" : ""}>{it.label}</span>
                          {it.badgeEnabled && (
                            <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.2 rounded-full">
                              {it.badgeLabel}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden shadow-2xl border border-neutral-200">
                <MegaMenu
                  isOpen={true}
                  onClose={() => {}}
                  categories={categories}
                  initialSettings={settings}
                  isPreview={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONFIGURATION SUB-TABS ── */}
      <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl p-6 space-y-6`}>
        <div className={`flex items-center justify-between gap-4 border-b pb-4 flex-wrap ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab("columns")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "columns"
                  ? isLight ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-white/15 text-white border border-white/20"
                  : isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-white/50 hover:text-white"
              }`}
            >
              📑 Menu Columns &amp; Links ({settings.columns?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("appearance")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "appearance"
                  ? isLight ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-white/15 text-white border border-white/20"
                  : isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-white/50 hover:text-white"
              }`}
            >
              🎨 Colors, Padding &amp; Spacing
            </button>
          </div>

          {activeSubTab === "columns" && (
            <button
              type="button"
              onClick={handleAddColumn}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isLight ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/30"
              }`}
            >
              <Plus className="w-4 h-4" /> Add Column
            </button>
          )}
        </div>

        {/* ── TAB 1: COLUMNS & ITEMS BUILDER ── */}
        {activeSubTab === "columns" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {settings.columns?.map((col, colIdx) => {
              const isExpanded = expandedColumnId === col.id;

              return (
                <div
                  key={col.id || colIdx}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all"
                >
                  {/* Column Header Bar */}
                  <div
                    onClick={() => setExpandedColumnId(isExpanded ? null : col.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.03] transition-colors select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-white/10 text-white font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                        {colIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-extrabold text-white block truncate">
                          {col.heading || "Untitled Column"}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/50">
                          <span className="uppercase font-bold text-red-400">{col.sourceMode} mode</span>
                          <span>•</span>
                          <span>{col.items?.length || 0} manual items</span>
                          <span>•</span>
                          <span>Max {col.maximumItems || 12} items</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        onClick={() => handleMoveColumn(colIdx, "up")}
                        disabled={colIdx === 0}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 disabled:opacity-30 cursor-pointer"
                        title="Move Left/Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveColumn(colIdx, "down")}
                        disabled={colIdx === settings.columns.length - 1}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 disabled:opacity-30 cursor-pointer"
                        title="Move Right/Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateColumn(col)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 cursor-pointer"
                        title="Duplicate Column"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer"
                        title="Delete Column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <ChevronDown
                        className={`w-4 h-4 text-white/50 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Expanded Column Configuration Body */}
                  {isExpanded && (
                    <div className="p-5 border-t border-white/10 bg-black/20 space-y-6 text-xs">
                      
                      {/* Column Attributes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                            Column Heading Text
                          </label>
                          <input
                            type="text"
                            value={col.heading}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateSettings((prev) => ({
                                ...prev,
                                columns: prev.columns.map((c) => (c.id === col.id ? { ...c, heading: val } : c)),
                              }));
                            }}
                            className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-red-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                            Data Source Mode
                          </label>
                          <select
                            value={col.sourceMode || "manual"}
                            onChange={(e) => {
                              const mode = e.target.value as MegaMenuSourceMode;
                              updateSettings((prev) => ({
                                ...prev,
                                columns: prev.columns.map((c) => (c.id === col.id ? { ...c, sourceMode: mode } : c)),
                              }));
                            }}
                            className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white outline-none focus:border-red-500 font-bold"
                          >
                            <option value="mixed" className="bg-[#0F172A]">Mixed (DB Categories + Custom)</option>
                            <option value="dynamic" className="bg-[#0F172A]">Dynamic (Auto from DB)</option>
                            <option value="manual" className="bg-[#0F172A]">Manual (Custom Items Only)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                            Dynamic Source
                          </label>
                          <select
                            value={col.dynamicSource || "categories"}
                            onChange={(e) => {
                              const src = e.target.value as any;
                              updateSettings((prev) => ({
                                ...prev,
                                columns: prev.columns.map((c) => (c.id === col.id ? { ...c, dynamicSource: src } : c)),
                              }));
                            }}
                            className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white outline-none focus:border-red-500 font-bold"
                          >
                            <option value="categories" className="bg-[#0F172A]">Categories</option>
                            <option value="subcategories" className="bg-[#0F172A]">Subcategories</option>
                            <option value="brands" className="bg-[#0F172A]">Brands</option>
                            <option value="collections" className="bg-[#0F172A]">Collections</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-white/60 font-bold uppercase tracking-wider mb-1.5">
                            Maximum Visible Items
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="25"
                            value={col.maximumItems || 12}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateSettings((prev) => ({
                                ...prev,
                                columns: prev.columns.map((c) => (c.id === col.id ? { ...c, maximumItems: val } : c)),
                              }));
                            }}
                            className="w-full bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-white outline-none focus:border-red-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Items List Builder */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-red-400" /> Column Items ({col.items?.length || 0})
                          </h5>
                          <button
                            type="button"
                            onClick={() => handleAddItem(col.id)}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add Item
                          </button>
                        </div>

                        <div className="space-y-2">
                          {col.items?.map((item, itemIdx) => {
                            const isItemOpen = expandedItemId === item.id;

                            return (
                              <div
                                key={item.id || itemIdx}
                                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                              >
                                <div
                                  onClick={() => setExpandedItemId(isItemOpen ? null : item.id)}
                                  className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-5 h-5 rounded-md bg-white/10 text-white font-mono text-[10px] flex items-center justify-center shrink-0">
                                      {itemIdx + 1}
                                    </span>
                                    <span className={`text-xs text-white truncate ${item.bold ? "font-bold" : "font-normal"}`}>
                                      {item.label || "Untitled Link"}
                                    </span>
                                    <span className="text-[10px] text-white/40 font-mono truncate">
                                      {item.href}
                                    </span>
                                    {item.badgeEnabled && item.badgeLabel && (
                                      <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[9px] font-black uppercase">
                                        {item.badgeLabel}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveItem(col.id, itemIdx, "up")}
                                      disabled={itemIdx === 0}
                                      className="p-1 bg-white/5 hover:bg-white/10 rounded text-white/70 disabled:opacity-30"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveItem(col.id, itemIdx, "down")}
                                      disabled={itemIdx === col.items.length - 1}
                                      className="p-1 bg-white/5 hover:bg-white/10 rounded text-white/70 disabled:opacity-30"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateItem(col.id, item)}
                                      className="p-1 bg-white/5 hover:bg-white/10 rounded text-white/70"
                                      title="Duplicate"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(col.id, item.id)}
                                      className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-white/50 transition-transform ${
                                        isItemOpen ? "rotate-180" : ""
                                      }`}
                                    />
                                  </div>
                                </div>

                                {/* Expanded Item Editor */}
                                {isItemOpen && (
                                  <div className="p-4 border-t border-white/10 bg-black/40 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      
                                      {/* Item Label */}
                                      <div>
                                        <label className="block text-white/60 font-bold mb-1">Item Label</label>
                                        <input
                                          type="text"
                                          value={item.label}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            updateSettings((prev) => ({
                                              ...prev,
                                              columns: prev.columns.map((c) =>
                                                c.id === col.id
                                                  ? {
                                                      ...c,
                                                      items: c.items.map((it) => (it.id === item.id ? { ...it, label: val } : it)),
                                                    }
                                                  : c
                                              ),
                                            }));
                                          }}
                                          className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white font-semibold"
                                        />
                                      </div>

                                      {/* Destination Type */}
                                      <div>
                                        <label className="block text-white/60 font-bold mb-1">Destination Type</label>
                                        <select
                                          value={item.destinationType || "custom"}
                                          onChange={(e) => {
                                            const dtype = e.target.value as MegaMenuDestinationType;
                                            handleItemDestinationChange(col.id, item.id, dtype, "");
                                          }}
                                          className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white font-bold"
                                        >
                                          <option value="category" className="bg-[#0F172A]">Category</option>
                                          <option value="brand" className="bg-[#0F172A]">Brand</option>
                                          <option value="collection" className="bg-[#0F172A]">Collection / Shortcut</option>
                                          <option value="page" className="bg-[#0F172A]">Internal Page</option>
                                          <option value="custom" className="bg-[#0F172A]">Custom URL</option>
                                        </select>
                                      </div>

                                      {/* Searchable Target Selector */}
                                      <div>
                                        <label className="block text-white/60 font-bold mb-1">Target Selector</label>
                                        {item.destinationType === "category" ? (
                                          <select
                                            value={item.destinationId || ""}
                                            onChange={(e) => {
                                              const selectedCat = categories.find((c) => c.id === e.target.value);
                                              handleItemDestinationChange(
                                                col.id,
                                                item.id,
                                                "category",
                                                e.target.value,
                                                selectedCat?.name
                                              );
                                            }}
                                            className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white"
                                          >
                                            <option value="" className="bg-[#0F172A]">-- Choose Category --</option>
                                            {categories.map((cat) => (
                                              <option key={cat.id} value={cat.id} className="bg-[#0F172A]">
                                                {cat.name}
                                              </option>
                                            ))}
                                          </select>
                                        ) : item.destinationType === "brand" ? (
                                          <select
                                            value={item.destinationId || ""}
                                            onChange={(e) => {
                                              const selectedBrand = brands.find((b) => b.slug === e.target.value || b.name === e.target.value);
                                              handleItemDestinationChange(
                                                col.id,
                                                item.id,
                                                "brand",
                                                e.target.value,
                                                selectedBrand?.name
                                              );
                                            }}
                                            className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white"
                                          >
                                            <option value="" className="bg-[#0F172A]">-- Choose Brand --</option>
                                            {brands.map((b) => (
                                              <option key={b.id || b.slug} value={b.slug || b.name} className="bg-[#0F172A]">
                                                {b.name}
                                              </option>
                                            ))}
                                          </select>
                                        ) : item.destinationType === "collection" ? (
                                          <select
                                            value={item.destinationId || ""}
                                            onChange={(e) => {
                                              handleItemDestinationChange(col.id, item.id, "collection", e.target.value);
                                            }}
                                            className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white"
                                          >
                                            <option value="" className="bg-[#0F172A]">-- Choose Collection --</option>
                                            <option value="new-arrivals" className="bg-[#0F172A]">New Arrivals (/products?sort=newest)</option>
                                            <option value="best-sellers" className="bg-[#0F172A]">Best Sellers (/products?sort=featured)</option>
                                            <option value="offers" className="bg-[#0F172A]">Latest Offers &amp; Deals (/products?discount=true)</option>
                                            <option value="flagships" className="bg-[#0F172A]">Featured Flagships (/products?featured=true)</option>
                                          </select>
                                        ) : item.destinationType === "page" ? (
                                          <select
                                            value={item.destinationId || item.href}
                                            onChange={(e) => {
                                              handleItemDestinationChange(col.id, item.id, "page", e.target.value);
                                            }}
                                            className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white"
                                          >
                                            <option value="/products" className="bg-[#0F172A]">All Products (/products)</option>
                                            <option value="/contact" className="bg-[#0F172A]">Contact &amp; Store Location (/contact)</option>
                                            <option value="/return-policy" className="bg-[#0F172A]">Store Warranty &amp; Return (/return-policy)</option>
                                            <option value="/terms-and-conditions" className="bg-[#0F172A]">Terms &amp; Conditions</option>
                                          </select>
                                        ) : (
                                          <input
                                            type="text"
                                            value={item.href}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              updateSettings((prev) => ({
                                                ...prev,
                                                columns: prev.columns.map((c) =>
                                                  c.id === col.id
                                                    ? {
                                                        ...c,
                                                        items: c.items.map((it) => (it.id === item.id ? { ...it, href: val } : it)),
                                                      }
                                                    : c
                                                ),
                                              }));
                                            }}
                                            placeholder="/products?custom=true"
                                            className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white font-mono"
                                          />
                                        )}
                                      </div>

                                      {/* Toggles: Bold & Featured */}
                                      <div className="flex items-center gap-4 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={item.bold ?? false}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              updateSettings((prev) => ({
                                                ...prev,
                                                columns: prev.columns.map((c) =>
                                                  c.id === col.id
                                                    ? {
                                                        ...c,
                                                        items: c.items.map((it) => (it.id === item.id ? { ...it, bold: checked } : it)),
                                                      }
                                                    : c
                                                ),
                                              }));
                                            }}
                                            className="rounded accent-red-600"
                                          />
                                          <span className="text-white/80 font-bold">Bold Text</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={item.badgeEnabled ?? false}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              updateSettings((prev) => ({
                                                ...prev,
                                                columns: prev.columns.map((c) =>
                                                  c.id === col.id
                                                    ? {
                                                        ...c,
                                                        items: c.items.map((it) =>
                                                          it.id === item.id
                                                            ? {
                                                                ...it,
                                                                badgeEnabled: checked,
                                                                badgeLabel: it.badgeLabel || "NEW",
                                                              }
                                                            : it
                                                        ),
                                                      }
                                                    : c
                                                ),
                                              }));
                                            }}
                                            className="rounded accent-red-600"
                                          />
                                          <span className="text-white/80 font-bold">Badge Tag</span>
                                        </label>
                                      </div>

                                      {/* Optional Badge Label */}
                                      {item.badgeEnabled && (
                                        <div>
                                          <label className="block text-white/60 font-bold mb-1">Badge Text</label>
                                          <input
                                            type="text"
                                            value={item.badgeLabel || ""}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              updateSettings((prev) => ({
                                                ...prev,
                                                columns: prev.columns.map((c) =>
                                                  c.id === col.id
                                                    ? {
                                                        ...c,
                                                        items: c.items.map((it) => (it.id === item.id ? { ...it, badgeLabel: val } : it)),
                                                      }
                                                    : c
                                                ),
                                              }));
                                            }}
                                            placeholder="NEW, HOT, SALE"
                                            className="w-full bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white font-bold"
                                          />
                                        </div>
                                      )}

                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB 2: APPEARANCE & LAYOUT ── */}
        {activeSubTab === "appearance" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200 text-xs">
            
            {/* Color Matrix */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <h4 className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Mega Menu Color Scheme
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                
                {/* Background */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Dropdown Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.backgroundColor || "#FFFFFF"}
                      onChange={(e) => updateSettings((p) => ({ ...p, backgroundColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.backgroundColor || "#FFFFFF"}
                      onChange={(e) => updateSettings((p) => ({ ...p, backgroundColor: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Section Heading Color */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Section Headings</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.headingColor || "#71717A"}
                      onChange={(e) => updateSettings((p) => ({ ...p, headingColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.headingColor || "#71717A"}
                      onChange={(e) => updateSettings((p) => ({ ...p, headingColor: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Primary Text Color */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Primary Large Text</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primaryTextColor || "#090909"}
                      onChange={(e) => updateSettings((p) => ({ ...p, primaryTextColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.primaryTextColor || "#090909"}
                      onChange={(e) => updateSettings((p) => ({ ...p, primaryTextColor: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Hover Text Color */}
                <div>
                  <label className="block text-white/60 font-bold mb-1">Hover Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.hoverTextColor || "#ED0712"}
                      onChange={(e) => updateSettings((p) => ({ ...p, hoverTextColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.hoverTextColor || "#ED0712"}
                      onChange={(e) => updateSettings((p) => ({ ...p, hoverTextColor: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Layout Dimensions & Spacings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Interaction Mode */}
              <div>
                <label className="block text-white/60 font-bold uppercase tracking-wider mb-2">
                  Menu Opening Interaction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateSettings((p) => ({ ...p, interaction: "click" }))}
                    className={`py-2 rounded-xl font-bold uppercase text-[11px] transition-all ${
                      settings.interaction !== "hover" ? "bg-red-600 text-white" : "bg-white/5 text-white/50"
                    }`}
                  >
                    Click (Stable)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings((p) => ({ ...p, interaction: "hover" }))}
                    className={`py-2 rounded-xl font-bold uppercase text-[11px] transition-all ${
                      settings.interaction === "hover" ? "bg-red-600 text-white" : "bg-white/5 text-white/50"
                    }`}
                  >
                    Hover
                  </button>
                </div>
              </div>

              {/* Column Gap Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-white/60 font-bold">
                  <span>Column Gap</span>
                  <span className="text-white">{settings.columnGap ?? 48}px</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="72"
                  value={settings.columnGap ?? 48}
                  onChange={(e) => updateSettings((p) => ({ ...p, columnGap: Number(e.target.value) }))}
                  className="w-full accent-red-600"
                />
              </div>

              {/* Max Height Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-white/60 font-bold">
                  <span>Max Dropdown Height</span>
                  <span className="text-white">{settings.maxHeight ?? 600}px</span>
                </div>
                <input
                  type="range"
                  min="360"
                  max="800"
                  value={settings.maxHeight ?? 600}
                  onChange={(e) => updateSettings((p) => ({ ...p, maxHeight: Number(e.target.value) }))}
                  className="w-full accent-red-600"
                />
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
