"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Upload,
  Loader2,
  Search,
  Check,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Category } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { uploadImageWithFallback } from "@/lib/upload-utils";
import CategoryIcon, {
  CATEGORY_ICON_REGISTRY,
  POPULAR_CATEGORY_ICONS,
  resolveFallbackCategoryIcon,
} from "@/components/ui/CategoryIcon";
import { generateCategorySlug, getCategoryDocId } from "@/lib/category-utils";
import { clearDataCache } from "@/lib/data-cache";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: Category | null;
  existingCategories?: Category[];
  allCategories?: Category[];
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingCategories,
  allCategories,
}: CategoryModalProps) {
  const categoriesPool = existingCategories || allCategories || [];
  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);

  // Icon Management State
  const [iconMode, setIconMode] = useState<"library" | "upload">("library");
  const [selectedLibraryIcon, setSelectedLibraryIcon] = useState<string>("LayoutGrid");
  const [iconSearchQuery, setIconSearchQuery] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Validation & Submission State
  const [slugModified, setSlugModified] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset or Populate Form when modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setSlug(initialData.slug || "");
      setDescription(initialData.description || "");
      setIsActive(initialData.isActive !== undefined ? initialData.isActive : initialData.status !== "inactive");
      setSortOrder(initialData.sortOrder !== undefined ? initialData.sortOrder : (initialData.sort_order ?? 0));

      const hasUploadedImg = Boolean(initialData.iconUrl || initialData.image_url);
      const isUploadMode = initialData.iconType === "upload" || (!initialData.iconType && hasUploadedImg);

      if (isUploadMode && hasUploadedImg) {
        setIconMode("upload");
        setUploadedUrl(initialData.iconUrl || initialData.image_url || "");
        setSelectedLibraryIcon(initialData.iconName || resolveFallbackCategoryIcon(initialData.name, initialData.slug));
      } else {
        setIconMode("library");
        setSelectedLibraryIcon(initialData.iconName || initialData.icon || resolveFallbackCategoryIcon(initialData.name, initialData.slug));
        setUploadedUrl(initialData.iconUrl || initialData.image_url || "");
      }
      setSlugModified(true);
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setIsActive(true);
      const nextOrder = categoriesPool.length > 0
        ? Math.max(...categoriesPool.map((c) => c.sortOrder ?? c.sort_order ?? 0)) + 1
        : 1;
      setSortOrder(nextOrder);
      setIconMode("library");
      setSelectedLibraryIcon("Tv");
      setUploadedUrl("");
      setSlugModified(false);
    }
    setUploadError("");
    setFormError("");
    setIsSaving(false);
    setIconSearchQuery("");
  }, [initialData, isOpen, categoriesPool]);

  // Auto-generate slug when name changes (unless user manually customized slug)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugModified || !slug) {
      const autoSlug = generateCategorySlug(val);
      setSlug(autoSlug);
      // Auto-suggest an intelligent library icon if in library mode
      if (iconMode === "library" && !initialData) {
        setSelectedLibraryIcon(resolveFallbackCategoryIcon(val, autoSlug));
      }
    }
  };

  const handleSlugChange = (val: string) => {
    setSlug(generateCategorySlug(val));
    setSlugModified(true);
  };

  // Filtered Lucide Icons for Searchable Icon Picker
  const filteredLibraryIcons = useMemo(() => {
    const q = iconSearchQuery.toLowerCase().trim();
    if (!q) {
      return POPULAR_CATEGORY_ICONS;
    }
    return POPULAR_CATEGORY_ICONS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
    );
  }, [iconSearchQuery]);

  // Handle Custom Icon Upload (PNG, WebP, JPEG, max 2MB)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/png", "image/webp", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid format. Please select a PNG, WebP, JPEG, or SVG file.");
      return;
    }

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File size exceeds 2MB limit. Please upload an optimized icon.");
      return;
    }

    try {
      setIsUploading(true);
      const uploaded = await uploadImageWithFallback(file, "category-icons");
      if (uploaded) {
        setUploadedUrl(uploaded);
        setIconMode("upload");
      } else {
        setUploadError("Failed to upload image. Please try again.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("Network error uploading icon. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Category name is required.");
      return;
    }

    const trimmedSlug = (slug || generateCategorySlug(trimmedName)).trim();
    if (!trimmedSlug) {
      setFormError("A valid slug is required.");
      return;
    }

    // Check slug uniqueness
    const duplicate = categoriesPool.find(
      (c) =>
        c.id !== initialData?.id &&
        (c.slug?.toLowerCase() === trimmedSlug.toLowerCase() ||
          c.name.toLowerCase() === trimmedName.toLowerCase())
    );
    if (duplicate) {
      setFormError(`A category with this slug or name already exists: "${duplicate.name}" (/${duplicate.slug}).`);
      return;
    }

    try {
      setIsSaving(true);
      const categoryId = initialData?.id || getCategoryDocId(trimmedSlug);

      const categoryData: Category = {
        id: categoryId,
        name: trimmedName,
        slug: trimmedSlug,
        description: description.trim(),
        iconType: iconMode,
        iconName: selectedLibraryIcon,
        iconUrl: iconMode === "upload" ? uploadedUrl : "",
        image_url: iconMode === "upload" ? uploadedUrl : "",
        isActive,
        status: isActive ? "active" : "inactive",
        sortOrder: Number(sortOrder) || 0,
        sort_order: Number(sortOrder) || 0,
        updatedAt: new Date().toISOString(),
        createdAt: initialData?.createdAt || new Date().toISOString(),
        show_on_homepage: isActive,
        show_in_selector: isActive,
        group: "product_categories",
      };

      await setDoc(doc(db, "categories", categoryId), categoryData, { merge: true });

      // Invalidate cache
      clearDataCache("categories");

      onSave();
      onClose();
    } catch (err: any) {
      console.error("Error saving category:", err);
      setFormError(err.message || "Failed to save category. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={isSaving ? undefined : onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0E141D] border border-neutral-200 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-2xl text-neutral-900 dark:text-neutral-100 z-10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-white/[0.08] sticky top-0 bg-white dark:bg-[#0E141D] z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#68122F]/10 dark:bg-[#68122F]/25 text-[#68122F] flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 id="category-modal-title" className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                {initialData ? "Edit Category" : "Add New Category"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Configure category details, icon, order, and storefront visibility.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 scrollbar-thin">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Category Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Category Name <span className="text-[#68122F]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Electronics, Fashion"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 text-sm text-neutral-900 dark:text-white outline-none focus:border-[#68122F] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Slug (URL Identifier) <span className="text-[#68122F]">*</span>
              </label>
              <div className="flex items-center px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 focus-within:border-[#68122F] transition-colors">
                <span className="text-xs text-neutral-400 font-mono select-none">/category/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="electronics"
                  className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-white outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. Optional Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of products found in this category..."
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 text-xs text-neutral-900 dark:text-white outline-none focus:border-[#68122F] transition-colors resize-none"
            />
          </div>

          {/* 3. ICON SELECTION & MANAGEMENT */}
          <div className="p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.02] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                  Category Icon Management
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Select a stable library icon or upload your custom icon.
                </p>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex items-center bg-neutral-200/80 dark:bg-white/10 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIconMode("library")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    iconMode === "library"
                      ? "bg-white dark:bg-[#0E141D] text-[#68122F] dark:text-white shadow-xs font-bold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-black"
                  }`}
                >
                  Icon Library
                </button>
                <button
                  type="button"
                  onClick={() => setIconMode("upload")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    iconMode === "upload"
                      ? "bg-white dark:bg-[#0E141D] text-[#68122F] dark:text-white shadow-xs font-bold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-black"
                  }`}
                >
                  Upload Custom
                </button>
              </div>
            </div>

            {/* Mode A: Icon Library Picker */}
            {iconMode === "library" && (
              <div className="space-y-3">
                {/* Search Bar for Icons */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0E141D] text-xs">
                  <Search className="w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={iconSearchQuery}
                    onChange={(e) => setIconSearchQuery(e.target.value)}
                    placeholder="Search icons (e.g. phone, tv, laptop, fashion, games)..."
                    className="flex-1 bg-transparent text-neutral-800 dark:text-white outline-none"
                  />
                  {iconSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setIconSearchQuery("")}
                      className="text-neutral-400 hover:text-black text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Icons Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 border border-neutral-100 dark:border-white/5 rounded-xl scrollbar-thin bg-white dark:bg-[#0E141D]">
                  {filteredLibraryIcons.map((preset) => {
                    const isSelected = selectedLibraryIcon === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setSelectedLibraryIcon(preset.name)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center ${
                          isSelected
                            ? "bg-[#68122F] text-white border-[#68122F] shadow-xs"
                            : "bg-neutral-50 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-white/10 hover:border-[#68122F]"
                        }`}
                        title={preset.label}
                      >
                        <CategoryIcon
                          iconType="library"
                          iconName={preset.name}
                          className={`w-5 h-5 mb-1 ${isSelected ? "text-white" : "text-neutral-700 dark:text-neutral-200"}`}
                        />
                        <span className="text-[10px] leading-tight truncate w-full font-medium">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode B: Custom Icon Upload */}
            {iconMode === "upload" && (
              <div className="space-y-3">
                {uploadError && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{uploadError}</p>
                )}

                {uploadedUrl ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0E141D]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border border-neutral-200 dark:border-white/10 p-1 flex items-center justify-center bg-white overflow-hidden">
                        <img
                          src={uploadedUrl}
                          alt="Custom icon preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Custom Upload Active</p>
                        <p className="text-[10px] text-neutral-500 truncate max-w-[220px]">{uploadedUrl}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedUrl("");
                          setIconMode("library");
                        }}
                        className="p-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Remove custom icon and use library icon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 dark:border-white/15 hover:border-[#68122F] rounded-2xl p-5 text-center cursor-pointer transition-colors bg-white dark:bg-[#0E141D]"
                  >
                    <Upload className="w-7 h-7 mx-auto text-neutral-400 mb-2" />
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Click to upload custom category icon
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Supports PNG, WebP, JPEG or SVG (Square recommended, max 2MB)
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/webp,image/jpeg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {isUploading && (
                  <div className="flex items-center gap-2 text-xs text-[#68122F] font-semibold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading and compressing icon...</span>
                  </div>
                )}
              </div>
            )}

            {/* LIVE PREVIEW: Matching Storefront Circular Strip Reference */}
            <div className="pt-2 border-t border-neutral-200/80 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2 block">
                Live Storefront Preview
              </span>
              <div className="flex items-center gap-6 justify-center p-3 rounded-xl bg-white dark:bg-[#0E141D] border border-neutral-100 dark:border-white/5">
                {/* 1. Inactive / Default Preview */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-[#F3F4F6] text-neutral-800 flex items-center justify-center mb-1.5 shadow-2xs border border-transparent">
                    <CategoryIcon
                      iconType={iconMode}
                      iconName={selectedLibraryIcon}
                      iconUrl={uploadedUrl}
                      className="w-6 h-6 stroke-[1.8]"
                    />
                  </div>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 max-w-[80px] truncate">
                    {name || "Category"}
                  </span>
                  <span className="text-[10px] text-neutral-400">Default</span>
                </div>

                {/* 2. Active / Burgundy Highlight Preview */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-[#68122F] text-white flex items-center justify-center mb-1.5 shadow-md shadow-[#68122F]/20 border border-[#68122F]">
                    <CategoryIcon
                      iconType={iconMode}
                      iconName={selectedLibraryIcon}
                      iconUrl={uploadedUrl}
                      className="w-6 h-6 stroke-[1.8] text-white"
                    />
                  </div>
                  <span className="text-xs font-bold text-[#68122F] dark:text-[#A83256] max-w-[80px] truncate">
                    {name || "Category"}
                  </span>
                  <span className="text-[10px] text-[#68122F] font-semibold">Active State</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Display Order & Active/Inactive Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Display Order
              </label>
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 text-sm text-neutral-900 dark:text-white outline-none focus:border-[#68122F] transition-colors"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Lower numbers appear first on the category strip and navigation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Storefront Visibility
                </span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isActive ? "bg-[#68122F]" : "bg-neutral-300 dark:bg-white/20"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      isActive ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 leading-tight">
                {isActive
                  ? "Active: Visible in header, mobile drawer, and home strip."
                  : "Inactive: Hidden from storefront navigation. Assigned products are NOT deleted."}
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-neutral-100 dark:border-white/[0.08] flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#0E141D] z-20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-6 py-2.5 rounded-xl bg-[#68122F] text-white text-xs font-bold hover:bg-[#520d24] transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Category...</span>
                </>
              ) : (
                <span>{initialData ? "Save Changes" : "Create Category"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
