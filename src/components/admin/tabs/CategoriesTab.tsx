"use client";

import React, { useState, useMemo } from "react";
import { Category, Product } from "@/lib/types";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Package,
  Layers,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { useAdminTheme } from "@/app/admin/dashboard/layout";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { clearDataCache } from "@/lib/data-cache";

interface CategoriesTabProps {
  categories: Category[];
  products?: Product[];
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onRefresh?: () => void;
}

export default function CategoriesTab({
  categories = [],
  products = [],
  onAdd,
  onEdit,
  onRefresh,
}: CategoriesTabProps) {
  const { isLight } = useAdminTheme();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Notifications State
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Safe Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [reassignCategoryId, setReassignCategoryId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compute product counts per category
  const productCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const cId = p.category_id || p.categoryId;
      const cName = (p.category_name || p.categoryName || "").toLowerCase().trim();
      const cSlug = (p.category_slug || "").toLowerCase().trim();

      categories.forEach((cat) => {
        const catId = cat.id;
        const catSlug = (cat.slug || "").toLowerCase().trim();
        const catName = (cat.name || "").toLowerCase().trim();

        if (
          (cId && cId === catId) ||
          (cSlug && cSlug === catSlug) ||
          (cName && (cName === catName || cName === catSlug))
        ) {
          map[catId] = (map[catId] || 0) + 1;
        }
      });
    });
    return map;
  }, [categories, products]);

  // Filtered & Sorted Categories List
  const displayedCategories = useMemo(() => {
    return categories
      .filter((c) => {
        if (!c || (c as any).isDeleted === true || c.status === "deleted") return false;

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.slug && c.slug.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        const isActive = c.isActive !== undefined ? c.isActive : c.status !== "inactive";
        if (statusFilter === "active") return isActive;
        if (statusFilter === "inactive") return !isActive;

        return true;
      })
      .sort((a, b) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0));
  }, [categories, searchQuery, statusFilter]);

  // Toggle Category Active/Inactive Status
  const handleToggleActive = async (cat: Category) => {
    const currentActive = cat.isActive !== undefined ? cat.isActive : cat.status !== "inactive";
    const nextActive = !currentActive;

    try {
      await setDoc(
        doc(db, "categories", cat.id),
        {
          isActive: nextActive,
          status: nextActive ? "active" : "inactive",
          show_on_homepage: nextActive,
          show_in_selector: nextActive,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      clearDataCache("categories");
      showToast(
        nextActive
          ? `"${cat.name}" is now active and visible on the storefront.`
          : `"${cat.name}" is now inactive and hidden from storefront navigation.`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Error toggling category status:", err);
      showToast("Failed to update category status.", "error");
    }
  };

  // Reorder Up / Down
  const handleReorder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= displayedCategories.length) return;

    const currentCat = displayedCategories[index];
    const targetCat = displayedCategories[targetIndex];

    const currentOrder = currentCat.sortOrder ?? currentCat.sort_order ?? index;
    const targetOrder = targetCat.sortOrder ?? targetCat.sort_order ?? targetIndex;

    try {
      await setDoc(
        doc(db, "categories", currentCat.id),
        { sortOrder: targetOrder, sort_order: targetOrder, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      await setDoc(
        doc(db, "categories", targetCat.id),
        { sortOrder: currentOrder, sort_order: currentOrder, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      clearDataCache("categories");
      showToast("Display order updated.");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Error reordering categories:", err);
      showToast("Failed to reorder categories.", "error");
    }
  };

  // Safe Deletion with Product Reassignment or Deactivation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const linkedCount = productCountMap[deleteTarget.id] || 0;

    if (linkedCount > 0 && !reassignCategoryId) {
      showToast("Please choose a category to reassign products to, or deactivate instead.", "error");
      return;
    }

    try {
      setIsDeleting(true);

      // 1. Reassign products if needed
      if (linkedCount > 0 && reassignCategoryId) {
        const targetCatObj = categories.find((c) => c.id === reassignCategoryId);
        const assignedProducts = products.filter(
          (p) =>
            p.category_id === deleteTarget.id ||
            p.category_id === deleteTarget.slug ||
            p.category_name?.toLowerCase() === deleteTarget.name.toLowerCase()
        );

        for (const p of assignedProducts) {
          await updateDoc(doc(db, "products", p.id), {
            category_id: reassignCategoryId,
            category_name: targetCatObj?.name || "",
            category_slug: targetCatObj?.slug || "",
          });
        }
      }

      // 2. Soft-delete or remove category document
      await deleteDoc(doc(db, "categories", deleteTarget.id));
      clearDataCache("categories");
      clearDataCache("products");

      showToast(`Category "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      setReassignCategoryId("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Error deleting category:", err);
      showToast(err.message || "Failed to delete category.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all ${
            toastMessage.type === "success"
              ? "bg-[#68122F] text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & Add Category CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
              Categories
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#68122F]/10 dark:bg-[#68122F]/30 text-[#68122F] dark:text-[#E892A8] text-xs font-black">
              {displayedCategories.length}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage category icons, display order, visibility, and product associations.
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="px-4 py-2.5 rounded-xl bg-[#68122F] text-white text-xs font-bold hover:bg-[#520d24] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name or slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0E141D] text-xs text-neutral-900 dark:text-white outline-none focus:border-[#68122F] transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-white/5 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === "all"
                ? "bg-white dark:bg-[#0E141D] text-[#68122F] dark:text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-black"
            }`}
          >
            All ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === "active"
                ? "bg-white dark:bg-[#0E141D] text-emerald-700 dark:text-emerald-400 shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-black"
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === "inactive"
                ? "bg-white dark:bg-[#0E141D] text-neutral-800 dark:text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-black"
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Category List Cards */}
      {displayedCategories.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-white/15 bg-white dark:bg-[#0E141D]">
          <FolderOpen className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            No categories found
          </h3>
          <p className="text-xs text-neutral-500 mt-1 mb-4">
            {searchQuery
              ? `No categories match "${searchQuery}".`
              : "Get started by adding your first category."}
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="px-4 py-2 rounded-xl bg-[#68122F] text-white text-xs font-bold hover:bg-[#520d24] transition-colors"
          >
            Add Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedCategories.map((cat, idx) => {
            const productCount = productCountMap[cat.id] || 0;
            const isActive = cat.isActive !== undefined ? cat.isActive : cat.status !== "inactive";

            return (
              <div
                key={cat.id}
                className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isLight
                    ? "bg-white border-neutral-200 shadow-xs hover:shadow-md"
                    : "bg-[#0E141D] border-white/10 hover:border-white/20"
                } ${!isActive ? "opacity-75" : ""}`}
              >
                <div>
                  {/* Top Row: Order Badge & Visibility Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                      Order #{cat.sortOrder ?? cat.sort_order ?? idx}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(cat)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                        isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-neutral-100 dark:bg-white/5 text-neutral-500 border-neutral-200 dark:border-white/10"
                      }`}
                      title={isActive ? "Click to deactivate" : "Click to activate"}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-neutral-400"}`} />
                      <span>{isActive ? "Active" : "Inactive"}</span>
                    </button>
                  </div>

                  {/* Icon & Category Name */}
                  <div className="flex items-center gap-3.5 mb-2.5">
                    {/* Circular Icon Preview matching storefront */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                        isActive
                          ? "bg-[#68122F] text-white border-[#68122F] shadow-xs"
                          : "bg-[#F3F4F6] text-neutral-700 border-neutral-200"
                      }`}
                    >
                      <CategoryIcon
                        category={cat}
                        className={`w-6 h-6 stroke-[1.8] ${isActive ? "text-white" : "text-neutral-700"}`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                        {cat.name}
                      </h3>
                      <p className="text-xs font-mono text-neutral-500 truncate">
                        /category/{cat.slug}
                      </p>
                    </div>
                  </div>

                  {/* Description if present */}
                  {cat.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-3">
                      {cat.description}
                    </p>
                  )}

                  {/* Metadata: Product Count */}
                  <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-white/5">
                    <Package className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {productCount} {productCount === 1 ? "Product" : "Products"} assigned
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Reorder & Actions */}
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/10 flex items-center justify-between gap-2">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleReorder(idx, "up")}
                      className="p-1.5 rounded-lg border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === displayedCategories.length - 1}
                      onClick={() => handleReorder(idx, "down")}
                      className="p-1.5 rounded-lg border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(cat)}
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(cat);
                        setReassignCategoryId("");
                      }}
                      className="p-1.5 rounded-lg border border-neutral-200 dark:border-white/10 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SAFE DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#0E141D] border border-neutral-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Delete Category &quot;{deleteTarget.name}&quot;?
                </h3>
                <p className="text-xs text-neutral-500">
                  /{deleteTarget.slug}
                </p>
              </div>
            </div>

            {/* Check Assigned Products */}
            {(productCountMap[deleteTarget.id] || 0) > 0 ? (
              <div className="space-y-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs">
                <p className="font-bold text-amber-800 dark:text-amber-300">
                  ⚠️ {productCountMap[deleteTarget.id]} products are currently assigned to this category!
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
                  To prevent orphaned products, you must reassign these products to another category before deleting, or deactivate this category instead.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                    Reassign products to:
                  </label>
                  <select
                    value={reassignCategoryId}
                    onChange={(e) => setReassignCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-[#141E2B] text-neutral-800 dark:text-neutral-100 font-semibold outline-none text-xs"
                  >
                    <option value="">-- Select a replacement category --</option>
                    {categories
                      .filter((c) => c.id !== deleteTarget.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (/{c.slug})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                This category has <strong>0 products assigned</strong>. It can be deleted directly.
              </p>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-white/10 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10"
              >
                Cancel
              </button>

              {(productCountMap[deleteTarget.id] || 0) > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleToggleActive(deleteTarget);
                    setDeleteTarget(null);
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-white/20 text-xs font-bold text-neutral-800 dark:text-white hover:bg-neutral-100 dark:hover:bg-white/10"
                >
                  Deactivate Instead
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={
                  isDeleting ||
                  ((productCountMap[deleteTarget.id] || 0) > 0 && !reassignCategoryId)
                }
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
