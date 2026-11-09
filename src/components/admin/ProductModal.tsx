"use client";

import React, { useState, useEffect } from "react";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import {
  X,
  Upload,
  Loader2,
  Plus,
  Trash2,
  Tag,
  HardDrive,
  Palette,
  ShieldCheck,
  Cpu,
  Save,
  Eye,
  Check,
  CircleCheck as Sparkles,
  Search,
  Layers,
  DollarSign,
  AlertCircle,
  Clock,
  ArrowRight,
  Globe,
  Truck,
  CreditCard,
  Sliders,
  CheckCircle2,
  Image as ImageIcon,
  Heart,
  RotateCcw,
} from "lucide-react";
import { Product, Category, ProductColor, ProductVariantCombo, WarrantyOption, InventoryLog, ProductImageSettings } from "@/lib/types";
import { db } from "@/lib/firebase";
import { addDoc, updateDoc, doc, collection, setDoc } from "firebase/firestore";
import { getBrands, getCategories, clearDataCache } from "@/lib/firestore-client";
import { PRESET_COLORS, getColorCSS, normalizeColor } from "@/lib/color-utils";
import { formatLKR } from "@/lib/order-utils";
import { KNOWN_BRAND_NAMES } from "@/lib/migration-audit";
import { generateProductSlug } from "@/lib/utils";
import { deduplicateCategories, generateCategorySlug, getCategoryDocId, formatCategoryTitle } from "@/lib/category-utils";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  categories: Category[];
  initialData?: Product | null;
}

const DEFAULT_SPEC_KEYS = ["Display", "Processor", "RAM", "Storage", "Battery", "Camera", "OS", "Network", "Sensors", "Weight"];
const PRESET_RAM = ["4GB", "6GB", "8GB", "12GB", "16GB"];
const PRESET_STORAGE = ["64GB", "128GB", "256GB", "512GB", "1TB"];

const PRESET_WARRANTIES = [
  "One Year ABANS Warranty",
  "18 Month Limited Warranty",
  "One Month Limited Warranty",
  "One Year Limited Warranty",
  "Two Year Limited Warranty",
  "Three Month Limited Warranty",
  "Three Year Limited Warranty",
  "Six Month Limited Warranty",
  "ANKER 18 MONTHS WARRANTY",
  "BASEUS 15 MONTH OFFICIAL WARRANTY",
  "Two Year Brownse Warranty",
  "One Year Limited Warranty. Warranty Doesn't Cover For Logic Board Error",
  "One Year GNEXT Warranty",
  "2 Time Screen Replacement Within 1 Year",
  "Two Year GNEXT Warranty. With Shield Pro",
  "18 MONTH TECHSAS WARRANTY",
  "One Year Limited Warranty. (Six Month for Battery & Charger)",
  "Two Year JKOA Warranty, Two Year Two Time Screen replacement with Break Free Offer",
  "One Year JKOA Warranty, One Year One Time Screen replacement with Break Free Offer",
  "Seven Days Checking Warranty Only!",
  "One Year Apple Care Warranty",
  "One Month Checking Warranty. Six Month Software & Service Warranty. Warranty Doesn't Cover For Display",
  "One Month Checking Warranty. Six Month Software & Service Warranty",
  "One Year SINGER Warranty",
  "One Year SOFTLOGIC Warranty, With 1 Year One-Time Break Free Offer",
  "One Year SOFTLOGIC Warranty",
  "Two Year SOFTLOGIC Warranty, With 2 Year One-Time Break Free Offer",
  "One Year TDRA Warranty",
];

const DEFAULT_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Anker",
  "Baseus",
  "Redmi",
  "Oppo",
  "Vivo",
  "Realme",
  "Google",
  "Honor",
  "OnePlus",
  "JBL",
  "Sony",
  "Bose",
  "Huawei",
  "Joyroom",
  "Hoco",
  "REMAX",
  "Ugreen",
  "LDNIO",
  "Marshall",
  "Sennheiser",
  "Kingston",
  "SanDisk",
];

const DEFAULT_PRODUCT_CATEGORIES: Category[] = [
  { id: "cat-smartphones", name: "Smartphones", slug: "smartphones", icon: "📱", image_url: "", sort_order: 1, group: "product_categories" },
  { id: "cat-laptops", name: "Laptops & MacBooks", slug: "laptops", icon: "💻", image_url: "", sort_order: 2, group: "product_categories" },
  { id: "cat-watches", name: "Smart Watches", slug: "smart-watches", icon: "⌚", image_url: "", sort_order: 3, group: "product_categories" },
  { id: "cat-earbuds", name: "Earbuds & TWS", slug: "earbuds", icon: "🎧", image_url: "", sort_order: 4, group: "product_categories" },
  { id: "cat-headphones", name: "Headphones", slug: "headphones", icon: "🎧", image_url: "", sort_order: 5, group: "product_categories" },
  { id: "cat-adapter", name: "Chargers & Adapters", slug: "chargers-adapters", icon: "🔌", image_url: "", sort_order: 6, group: "product_categories" },
  { id: "cat-cables", name: "Charging Cables", slug: "charging-cables", icon: "🔌", image_url: "", sort_order: 7, group: "product_categories" },
  { id: "cat-powerbanks", name: "Power Banks", slug: "power-banks", icon: "🔋", image_url: "", sort_order: 8, group: "product_categories" },
  { id: "cat-cases", name: "Phone Cases", slug: "phone-cases", icon: "📱", image_url: "", sort_order: 9, group: "product_categories" },
  { id: "cat-screen-protectors", name: "Screen Protectors", slug: "screen-protectors", icon: "🛡️", image_url: "", sort_order: 10, group: "product_categories" },
  { id: "cat-accessories", name: "Mobile Accessories", slug: "mobile-accessories", icon: "🎧", image_url: "", sort_order: 11, group: "product_categories" },
  { id: "cat-tablets", name: "Tablets", slug: "tablets", icon: "📱", image_url: "", sort_order: 12, group: "product_categories" },
  { id: "cat-speakers", name: "Speakers", slug: "speakers", icon: "🔊", image_url: "", sort_order: 13, group: "product_categories" },
];

function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = sanitizeForFirestore(val);
    }
  }
  return cleaned;
}

export default function ProductModal({
  isOpen,
  onClose,
  onSave,
  categories,
  initialData,
}: ProductModalProps) {
  // Active Tab Index (1: Basic, 2: Media & Colours, 3: Variants & Stock, 4: Specifications, 5: Warranty, 6: Payments, 7: SEO)
  const [activeTab, setActiveTab] = useState<number>(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const requestClose = () => {
    if (isSubmitting) return;
    if (hasUnsavedChanges && !window.confirm("Discard your unsaved product changes?")) return;
    onClose();
  };
  const editorRef = useDialogFocus(isOpen, requestClose);
  useEffect(() => { if (activeTab > 3) setShowAdvanced(true); }, [activeTab]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  // Form Fields State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState("Samsung");
  const [categoryId, setCategoryId] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [status, setStatus] = useState<"active" | "draft">("active");

  // Feature Flags
  const [productType, setProductType] = useState<"phone" | "laptop" | "accessory">("phone");
  const [hasColorVariants, setHasColorVariants] = useState<boolean>(true);
  const [hasStorageVariants, setHasStorageVariants] = useState<boolean>(true);

  // Custom Category & Brand Toggle States
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [extraCategories, setExtraCategories] = useState<Category[]>([]);
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [customBrandName, setCustomBrandName] = useState("");
  const [extraBrands, setExtraBrands] = useState<string[]>([]);

  // Pricing & Legacy Stock
  const [basePrice, setBasePrice] = useState<number>(0);
  const [baseOldPrice, setBaseOldPrice] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [baseStock, setBaseStock] = useState<number>(10);

  // Payment Options
  const [allowCod, setAllowCod] = useState(true);
  const [allowCard, setAllowCard] = useState(true);
  const [allowWhatsapp, setAllowWhatsapp] = useState(true);
  const [deliveryInfo, setDeliveryInfo] = useState("1-3 Business Days Islandwide Courier Delivery");

  // SEO Fields
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // General Product Image Gallery (For non-color accessories or product-level images)
  const [generalImages, setGeneralImages] = useState<string[]>([]);
  const [imageSettings, setImageSettings] = useState<ProductImageSettings>({
    fit: "contain",
    scale: 100,
    positionX: 0,
    positionY: 0,
  });

  // Color Variants & Specific Galleries
  const [colorVariants, setColorVariants] = useState<ProductColor[]>([]);
  const [activeColorTab, setActiveColorTab] = useState<string>("");
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");

  // Storage Options
  const [availableStorage, setAvailableStorage] = useState<string[]>(["128GB", "256GB"]);
  const [customStorageInput, setCustomStorageInput] = useState("");

  // Unified Full-Page Matrix of Variant Combinations
  const [variantCombos, setVariantCombos] = useState<ProductVariantCombo[]>([]);

  // Multi-Plan Warranty Management
  const [warrantyOptions, setWarrantyOptions] = useState<WarrantyOption[]>([]);
  const [selectedPresetWarranty, setSelectedPresetWarranty] = useState("");

  // Technical Specifications (Key-Value Rows)
  const [specRows, setSpecRows] = useState<{ key: string; value: string }[]>([]);

  // Helper: Detect Product Type from Category or Product Name
  const detectProductType = (catNameOrId: string = "", prodName: string = ""): "phone" | "laptop" | "accessory" => {
    const lower = `${catNameOrId} ${prodName}`.toLowerCase();
    if (
      lower.includes("laptop") ||
      lower.includes("macbook") ||
      lower.includes("tablet") ||
      lower.includes("ipad") ||
      lower.includes("notebook") ||
      lower.includes("thinkpad") ||
      lower.includes("zenbook") ||
      lower.includes("galaxy tab") ||
      lower.includes("xiaomi pad")
    ) {
      return "laptop";
    }
    if (
      lower.includes("smartphones") ||
      lower.includes("feature phone") ||
      lower.includes("phone") ||
      lower.includes("iphone") ||
      lower.includes("mobile") ||
      lower.includes("handset")
    ) {
      return "phone";
    }
    return "accessory";
  };

  // Load live Firestore categories and brands whenever modal is opened
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(1);
    setShowAdvanced(false);
    setEditorError("");

    let isMounted = true;
    async function loadLiveTaxonomies() {
      try {
        const [liveCats, liveBrands] = await Promise.all([
          getCategories(),
          getBrands(),
        ]);

        if (isMounted) {
          if (liveCats && liveCats.length > 0) {
            setExtraCategories((prev) => {
              const map = new Map<string, Category>();
              prev.forEach((c) => map.set(c.id, c));
              liveCats.forEach((c) => map.set(c.id, c));
              return Array.from(map.values());
            });
          }
          if (liveBrands && liveBrands.length > 0) {
            const brandNames = liveBrands.map((b) => b.name).filter(Boolean);
            setExtraBrands((prev) => Array.from(new Set([...prev, ...brandNames])));
          }
        }
      } catch (e) {
        console.warn("Could not load live categories/brands in ProductModal:", e);
      }
    }

    loadLiveTaxonomies();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Merged Categories List (Clean deduplicated list of categories excluding Brand names)
  const mergedCategories = React.useMemo(() => {
    const all = [
      ...DEFAULT_PRODUCT_CATEGORIES,
      ...categories,
      ...extraCategories,
    ].filter((c) => {
      const cName = (c.name || '').toLowerCase();
      const cSlug = (c.slug || '').toLowerCase();
      return !KNOWN_BRAND_NAMES.some((b) => b.toLowerCase() === cName || b.toLowerCase() === cSlug);
    });
    return deduplicateCategories(all);
  }, [categories, extraCategories]);

  // Dynamic Brand Options (Clean List of Brands + Extra Created Brands)
  const brandOptions = React.useMemo(() => {
    return Array.from(new Set([...DEFAULT_BRANDS, ...extraBrands]));
  }, [extraBrands]);

  // Handler: Apply & Auto-Save Custom Category into the dropdown slot immediately
  const handleApplyCustomCategory = async (nameToAdd?: string) => {
    const raw = (nameToAdd || customCategoryName).trim();
    if (!raw) return;
    const catSlug = generateCategorySlug(raw);
    const newCatId = getCategoryDocId(catSlug);
    const formattedName = formatCategoryTitle(raw);

    const existingMatch = mergedCategories.find(
      (c) => generateCategorySlug(c.name || c.slug) === catSlug || c.id === newCatId
    );

    if (existingMatch) {
      setCategoryId(existingMatch.id);
      setIsCustomCategory(false);
      setCustomCategoryName('');
      return;
    }

    const newCatObj: Category = {
      id: newCatId,
      name: formattedName,
      slug: catSlug,
      icon: '📱',
      image_url: '',
      sort_order: 99,
      status: 'active',
      show_on_homepage: true,
      show_in_selector: true,
      group: 'product_categories',
    };

    setExtraCategories((prev) => [...prev.filter((c) => c.id !== newCatId), newCatObj]);
    setCategoryId(newCatId);
    const detected = detectProductType(formattedName, name);
    setProductType(detected);
    if (detected === 'laptop' || detected === 'phone') {
      setHasColorVariants(true);
      setHasStorageVariants(true);
    } else {
      setHasColorVariants(false);
      const isStorageDevice = /storage|pen drive|flash drive|sd card|hard disk|ssd|memory card/i.test(formattedName);
      setHasStorageVariants(isStorageDevice);
    }
    setIsCustomCategory(false);
    setCustomCategoryName('');
    setHasUnsavedChanges(true);

    try {
      await setDoc(doc(db, 'categories', newCatId), newCatObj, { merge: true });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refresh-categories'));
      }
    } catch (err) {
      console.warn('Failed to auto-save custom category to Firestore:', err);
    }
  };

  // Handler: Apply & Auto-Save Custom Brand into the dropdown slot immediately
  const handleApplyCustomBrand = async (brandToAdd?: string) => {
    const trimmed = (brandToAdd || customBrandName).trim();
    if (!trimmed) return;
    const bSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newBrandId = `brand-${bSlug}`;
    const newBrandObj = {
      id: newBrandId,
      name: trimmed,
      slug: bSlug,
      logo_url: "",
      sort_order: 99,
      status: "active",
      show_on_homepage: true,
    };

    setExtraBrands((prev) => Array.from(new Set([...prev, trimmed])));
    setBrand(trimmed);
    setIsCustomBrand(false);
    setCustomBrandName("");
    setHasUnsavedChanges(true);

    try {
      await setDoc(doc(db, "brands", newBrandId), newBrandObj, { merge: true });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-brands"));
      }
    } catch (err) {
      console.warn("Failed to auto-save custom brand to Firestore:", err);
    }
  };

  // Initialize form when opening/editing
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setName(initialData.name || "");
      setCode(initialData.code || "");
      setSlug(initialData.slug || "");
      // Initialize edit category data flexibly matching mergedCategories
      const rawCatId = initialData?.category_id || (initialData as any)?.categoryId || "";
      const rawCatName = (initialData?.category_name || (initialData as any)?.categoryName || "").replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu, "").trim();

      const matchedCategory = mergedCategories.find(
        (c) =>
          c.id === rawCatId ||
          c.name.toLowerCase() === rawCatName.toLowerCase() ||
          c.slug.toLowerCase() === rawCatName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      );

      const resolvedCatId = matchedCategory ? matchedCategory.id : (rawCatId || mergedCategories[0]?.id || "");
      setCategoryId(resolvedCatId);

      // Initialize Brand
      const rawBrand = (initialData.brand || initialData.brand_name || "").trim();
      const matchedBrand = brandOptions.find((b) => b.toLowerCase() === rawBrand.toLowerCase());
      if (matchedBrand) {
        setBrand(matchedBrand);
        setIsCustomBrand(false);
      } else if (rawBrand) {
        setExtraBrands((prev) => Array.from(new Set([...prev, rawBrand])));
        setBrand(rawBrand);
        setIsCustomBrand(false);
      } else {
        setBrand("Apple");
      }

      setShortDesc((initialData as any).short_description || (initialData as any).shortDesc || "");
      setDescription(initialData.description || "");
      setDeliveryInfo(initialData.delivery_info || "1-3 Business Days Islandwide Courier Delivery");
      setFeatured(Boolean(initialData.featured));
      setIsNewArrival(Boolean(initialData.is_new_arrival));
      setStatus(initialData.status === "draft" ? "draft" : "active");

      // Prices & Base Stock
      const primaryP = Number(initialData.price) || 0;
      setBasePrice(primaryP);
      const primaryOldP = initialData.old_price ? Number(initialData.old_price) : null;
      setBaseOldPrice(primaryOldP);

      if (primaryOldP && primaryOldP > primaryP) {
        setDiscountPercent(Math.round(((primaryOldP - primaryP) / primaryOldP) * 100));
      } else {
        setDiscountPercent(0);
      }

      setBaseStock(
        initialData.stock_quantity ??
        initialData.stock_count ??
        (initialData as any).stock ??
        (initialData.stock_status === "out_of_stock" ? 0 : 10)
      );

      // Payment Options
      setAllowCod(initialData.allow_cod !== false);
      setAllowCard(initialData.allow_card !== false);
      setAllowWhatsapp(initialData.allow_whatsapp !== false);

      // SEO
      setMetaTitle(initialData.meta_title || initialData.metaTitle || "");
      setMetaDescription(initialData.meta_description || initialData.metaDescription || "");

      // General Images
      const gImgs = (initialData.images && initialData.images.length > 0)
        ? initialData.images
        : (initialData.image_url || initialData.image || initialData.cover_image)
        ? [initialData.image_url || initialData.image || initialData.cover_image || ""]
        : [];
      setGeneralImages(gImgs.length > 0 ? gImgs : ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800"]);

      setImageSettings(
        initialData.imageSettings ||
        initialData.productImageSettings || {
          fit: "contain",
          scale: 100,
          positionX: 0,
          positionY: 0,
        }
      );

      // Feature Flags detection
      const catNameOrId = initialData.category_name || initialData.category_id || "";
      const detectedType: "phone" | "laptop" | "accessory" = initialData.productType
        ? initialData.productType
        : detectProductType(catNameOrId, initialData.name || "");

      setProductType(detectedType);

      const detectedHasColor = typeof initialData.hasColorVariants === "boolean"
        ? initialData.hasColorVariants
        : Boolean(
            (initialData.color_variants && initialData.color_variants.length > 0 && initialData.color_variants.some(c => c.name && c.name.trim() !== "" && c.name !== "Standard" && c.name !== "Standard Black")) ||
            (initialData.colors && initialData.colors.length > 0 && initialData.colors.some(c => c && c.trim() !== "" && c !== "Standard" && c !== "Standard Black"))
          );

      setHasColorVariants(detectedHasColor);

      const detectedHasStorage = typeof initialData.hasStorageVariants === "boolean"
        ? initialData.hasStorageVariants
        : Boolean(
            initialData.variant_combos &&
            initialData.variant_combos.length > 0 &&
            initialData.variant_combos.some(v => Boolean((v.storage && v.storage.trim() !== "") || (v.ram && v.ram.trim() !== "")))
          );

      setHasStorageVariants(detectedHasStorage);

      // Spec Rows (Only populate if saved on product; otherwise empty array)
      const rawSpecs = initialData.specifications;
      const rows = Array.isArray(rawSpecs)
        ? rawSpecs.map((s: any) => ({ key: String(s?.key || s?.name || ""), value: String(s?.value || "") }))
        : typeof rawSpecs === "object" && rawSpecs !== null
        ? Object.entries(rawSpecs).map(([key, value]) => ({ key, value: String(value) }))
        : [];
      setSpecRows(rows);

      // Colours
      if (detectedHasColor) {
        if (initialData.color_variants && initialData.color_variants.length > 0) {
          setColorVariants(initialData.color_variants);
        } else if (initialData.colors && initialData.colors.length > 0) {
          setColorVariants(
            initialData.colors.map((c, i) => ({
              id: `col-${i}`,
              name: c,
              hex: getColorCSS(c),
              images: [],
              is_default: i === 0,
              active: true,
            }))
          );
        } else {
          setColorVariants([]);
        }
      } else {
        setColorVariants([]);
      }

      // Variant Combos
      if (initialData.variant_combos && initialData.variant_combos.length > 0) {
        setVariantCombos(initialData.variant_combos);
      } else {
        setVariantCombos([]);
      }

      // Warranty Options (Only populate if explicitly defined in product)
      if (initialData.warranty_options && initialData.warranty_options.length > 0) {
        setWarrantyOptions(initialData.warranty_options.filter((w) => w.title && w.title.trim() !== "" && w.title.toLowerCase() !== "none" && w.title.toLowerCase() !== "no warranty"));
      } else if (initialData.warranty && initialData.warranty.trim() !== "" && initialData.warranty.toLowerCase() !== "none" && initialData.warranty.toLowerCase() !== "no warranty") {
        setWarrantyOptions([
          {
            id: "w-1",
            title: initialData.warranty.trim(),
            type: "Shop Warranty",
            duration_value: 1,
            duration_unit: "months",
            additional_price: 0,
            coverage_details: "Hardware defect warranty from 1place.lk official support.",
            status: "active",
            is_default: true,
          },
          ...(initialData.brand_warranty && initialData.brand_warranty.trim() !== "" && initialData.brand_warranty.toLowerCase() !== "none"
            ? [
                {
                  id: "w-2",
                  title: initialData.brand_warranty.trim(),
                  type: "Manufacturer Warranty" as const,
                  duration_value: 1,
                  duration_unit: "years" as const,
                  additional_price: 0,
                  coverage_details: "Official manufacturer warranty from authorized service center.",
                  status: "active" as const,
                },
              ]
            : []),
        ]);
      } else {
        setWarrantyOptions([]);
      }
    } else {
      // Reset New Product
      setName("");
      setCode(`1P-${Date.now().toString(36).toUpperCase()}`);
      setSlug("");
      const defaultCatId = "";
      const defaultCatName = "";
      const detected = detectProductType(defaultCatName);

      setProductType(detected);
      setHasColorVariants(false);
      setHasStorageVariants(detected === "laptop" || detected === "phone");

      setCategoryId(defaultCatId);
      setBrand("");
      setDescription("");
      setShortDesc("");
      setFeatured(false);
      setStatus("active");
      setBasePrice(0);
      setBaseOldPrice(null);
      setBaseStock(0);
      setAllowCod(true);
      setAllowCard(true);
      setAllowWhatsapp(true);
      setMetaTitle("");
      setMetaDescription("");
      setGeneralImages(["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800"]);
      setImageSettings({
        fit: "contain",
        scale: 100,
        positionX: 0,
        positionY: 0,
      });

      // Spec Rows (Blank by default; only added when admin adds rows)
      setSpecRows([]);

      if (detected === "phone") {
        setColorVariants([
          {
            id: "col-1",
            name: "Awesome Black",
            hex: "#000000",
            images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800"],
            is_default: true,
            active: true,
          },
          {
            id: "col-2",
            name: "Awesome White",
            hex: "#FFFFFF",
            images: ["https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=800"],
            is_default: false,
            active: true,
          },
        ]);

        setVariantCombos([
          {
            id: "v-1",
            color_name: "Awesome Black",
            ram: "8GB",
            storage: "128GB",
            sku: "SM-8-128-BLK",
            price: 165000,
            old_price: 175000,
            stock_quantity: 10,
            reserved_stock: 0,
            available_stock: 10,
            low_stock_threshold: 3,
            status: "active",
          },
        ]);
      } else if (detected === "laptop") {
        setColorVariants([
          {
            id: "col-1",
            name: "Space Gray",
            hex: "#535150",
            images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800"],
            is_default: true,
            active: true,
          },
          {
            id: "col-2",
            name: "Silver",
            hex: "#E3E4E5",
            images: ["https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800"],
            is_default: false,
            active: true,
          },
        ]);

        setVariantCombos([
          {
            id: "v-1",
            color_name: "Space Gray",
            ram: "16GB RAM",
            storage: "512GB SSD",
            sku: "SM-16-512-GRY",
            price: 345000,
            old_price: 375000,
            stock_quantity: 5,
            reserved_stock: 0,
            available_stock: 5,
            low_stock_threshold: 2,
            status: "active",
          },
        ]);
      } else {
        // Accessory default
        setColorVariants([
          {
            id: "col-1",
            name: "Black",
            hex: "#000000",
            images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=800"],
            is_default: true,
            active: true,
          },
        ]);
        setVariantCombos([]);
      }

      // Default to empty warranty options (No warranty shown unless admin explicitly adds a plan)
      setGeneralImages([]);
      setColorVariants([]);
      setVariantCombos([]);
      setAvailableStorage([]);
      setWarrantyOptions([]);
    }

    setHasUnsavedChanges(false);
  }, [isOpen, initialData, categories]);

  if (!isOpen) return null;

  // Auto Generate Slug from Name
  const handleNameChange = (val: string) => {
    setName(val);
    setHasUnsavedChanges(true);
    if (!initialData) {
      setSlug(generateProductSlug(val));
    }
  };

  // Add Custom Colour
  const handleAddColour = () => {
    if (!newColorName.trim()) return;
    const name = newColorName.trim();
    const resolvedHex = (newColorHex && newColorHex !== "#000000") ? newColorHex : getColorCSS(name);
    const newCol: ProductColor = {
      id: `col-${Date.now()}`,
      name,
      hex: resolvedHex.startsWith("#") ? resolvedHex : "#2C2C2E",
      images: [],
      active: true,
      is_default: colorVariants.length === 0,
    };
    setColorVariants([...colorVariants, newCol]);
    setNewColorName("");
    setHasUnsavedChanges(true);
  };

  // Add Single Manual Variant Row
  const handleAddManualVariant = () => {
    const defaultCol = colorVariants[0]?.name || (hasColorVariants ? "Standard Black" : "Option 1");
    const defaultHex = colorVariants[0]?.hex || "#000000";
    const defaultColId = colorVariants[0]?.id || "col-1";
    const defaultStorage = hasStorageVariants ? (productType === "laptop" ? "512GB SSD" : productType === "phone" ? "128GB" : "128GB") : "";
    const defaultRam = hasStorageVariants ? (productType === "laptop" ? "16GB RAM" : productType === "phone" ? "8GB" : "") : "";
    const defaultPrice = basePrice || (productType === "laptop" ? 250000 : productType === "phone" ? 150000 : 8000);

    const newVariant: ProductVariantCombo = {
      id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      color_id: defaultColId,
      color_name: defaultCol,
      color_hex: defaultHex,
      ram: defaultRam,
      storage: defaultStorage,
      sim_type: productType === "phone" ? "Physical SIM + eSIM" : "Standard",
      sku: code ? `${code}-${defaultCol.slice(0, 3).toUpperCase()}${defaultStorage ? `-${defaultStorage.replace(/[^a-zA-Z0-9]/g, "")}` : ""}` : `SM-${Date.now()}`,
      price: defaultPrice,
      old_price: baseOldPrice || null,
      stock_quantity: 10,
      reserved_stock: 0,
      available_stock: 10,
      low_stock_threshold: 3,
      status: "active",
      warranty: warrantyOptions[0]?.title || "1 Month Shop Warranty",
      image_ref: colorVariants[0]?.images?.[0] || generalImages[0] || "",
    };
    setVariantCombos([...variantCombos, newVariant]);
    setHasUnsavedChanges(true);
  };

  // Auto Generate Variant Combinations Matrix
  const handleGenerateCombinations = () => {
    const activeColors = colorVariants.filter((c) => c.active !== false);

    if (hasColorVariants && activeColors.length === 0) {
      alert("Please add at least one color in Tab 2 (Media & Colours) before auto-generating color variants.");
      return;
    }

    let storagePresets: string[] = [];
    let defaultRam = "";

    if (hasStorageVariants) {
      if (availableStorage && availableStorage.length > 0) {
        storagePresets = availableStorage;
        defaultRam = productType === "laptop" ? "16GB RAM" : productType === "phone" ? "8GB" : "";
      } else if (productType === "laptop") {
        storagePresets = ["256GB SSD", "512GB SSD", "1TB SSD"];
        defaultRam = "16GB RAM";
      } else if (productType === "phone") {
        storagePresets = ["128GB", "256GB", "512GB"];
        defaultRam = "8GB";
      } else {
        storagePresets = ["64GB", "128GB", "256GB", "512GB"];
        defaultRam = "";
      }
    } else {
      storagePresets = [""];
    }

    const newCombos: ProductVariantCombo[] = [];
    const defaultPrice = basePrice || (productType === "laptop" ? 250000 : productType === "phone" ? 150000 : 8000);

    if (hasColorVariants) {
      activeColors.forEach((col) => {
        storagePresets.forEach((st) => {
          const skuStr = `${brand.slice(0, 3).toUpperCase()}-${col.name.slice(0, 3).toUpperCase()}${st ? `-${st.replace(/[^a-zA-Z0-9]/g, "")}` : ""}`;
          newCombos.push({
            id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            color_id: col.id,
            color_name: col.name,
            color_hex: col.hex || getColorCSS(col.name),
            ram: defaultRam,
            storage: st,
            sim_type: productType === "phone" ? "Physical SIM + eSIM" : "Standard",
            sku: skuStr,
            price: defaultPrice,
            old_price: baseOldPrice,
            stock_quantity: 10,
            reserved_stock: 0,
            available_stock: 10,
            low_stock_threshold: 3,
            status: "active",
            image_ref: col.images?.[0] || col.cover_image || generalImages[0] || "",
            warranty: warrantyOptions[0]?.title || "1 Month Shop Warranty",
          });
        });
      });
    } else if (hasStorageVariants) {
      storagePresets.forEach((st) => {
        const skuStr = `${brand.slice(0, 3).toUpperCase()}-${st.replace(/[^a-zA-Z0-9]/g, "")}`;
        newCombos.push({
          id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          color_name: "Standard",
          color_hex: "#000000",
          ram: defaultRam,
          storage: st,
          sim_type: productType === "phone" ? "Standard" : "",
          sku: skuStr,
          price: defaultPrice,
          old_price: baseOldPrice,
          stock_quantity: 10,
          reserved_stock: 0,
          available_stock: 10,
          low_stock_threshold: 3,
          status: "active",
          image_ref: generalImages[0] || "",
          warranty: warrantyOptions[0]?.title || "1 Month Shop Warranty",
        });
      });
    }

    if (newCombos.length > 0) {
      setVariantCombos(newCombos);
      setHasUnsavedChanges(true);
      alert(`Successfully generated ${newCombos.length} variant combinations!`);
    } else {
      alert("No variants could be generated. Make sure Color or Storage options are enabled.");
    }
  };

  // Save Product Handler
  const handleSaveProduct = async (publishStatus: "active" | "draft" = "active") => {
    if (isSubmitting) return;
    setEditorError("");
    if (publishStatus === "active" && !brand.trim() && !customBrandName.trim()) {
      setEditorError("Choose a brand, or add your store name as the brand.");
      setActiveTab(1);
      return;
    }
    if (!name.trim()) {
      setEditorError("Add a product name to continue.");
      setActiveTab(1);
      return;
    }

    try {
      setIsSubmitting(true);

      const finalCategoryObj = mergedCategories.find((c) => c.id === categoryId);
      const rawCatName = isCustomCategory
        ? customCategoryName.trim()
        : (finalCategoryObj?.name || "Smartphones");

      // Strip emoji prefix from category name for database consistency
      const finalCategoryName = rawCatName.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu, "").trim() || "Smartphones";
      const finalCategorySlug = generateCategorySlug(finalCategoryName);
      const finalCategoryId = isCustomCategory
        ? getCategoryDocId(finalCategorySlug)
        : (finalCategoryObj?.id || getCategoryDocId(finalCategorySlug));

      const finalBrand = isCustomBrand ? customBrandName.trim() : (brand.trim() || "Apple");
      const finalBrandSlug = finalBrand.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      // Save Custom Category or Brand to Firestore Catalog Collections if new
      if (isCustomCategory && customCategoryName.trim()) {
        try {
          const catSlug = customCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          await setDoc(doc(db, "categories", `cat-${catSlug}`), {
            id: `cat-${catSlug}`,
            name: customCategoryName.trim(),
            slug: catSlug,
            icon: "📱",
            image_url: "",
            sort_order: 99,
            status: "active",
            show_on_homepage: true,
            show_in_selector: true,
            group: "product_categories",
          }, { merge: true });
        } catch (err) {
          console.warn("Failed to save custom category to catalog:", err);
        }
      }

      if (isCustomBrand && customBrandName.trim()) {
        try {
          const bSlug = customBrandName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          await setDoc(doc(db, "brands", `brand-${bSlug}`), {
            id: `brand-${bSlug}`,
            name: customBrandName.trim(),
            slug: bSlug,
            logo_url: "",
            sort_order: 99,
            status: "active",
            show_on_homepage: true,
          }, { merge: true });
        } catch (err) {
          console.warn("Failed to save custom brand to catalog:", err);
        }
      }

      const hasAnyVariants = (hasColorVariants || hasStorageVariants) && variantCombos.length > 0;
      // Compute Total Stock from active variants or direct baseStock
      const totalVariantStock = hasAnyVariants
        ? variantCombos.reduce((s, v) => s + (Number(v.stock_quantity) || 0), 0)
        : baseStock;
      const isOutOfStock = totalVariantStock === 0;

      // Clean general images
      const cleanGeneral = generalImages.map((u) => u.trim()).filter(Boolean);

      // Clean color variant images
      const cleanedColorVariants = hasColorVariants
        ? colorVariants.map((c) => ({
            ...c,
            images: (c.images || []).map((u) => u.trim()).filter(Boolean),
          }))
        : [];

      // Combine general product images and color-specific images
      const allImages: string[] = [...cleanGeneral];
      if (hasColorVariants) {
        cleanedColorVariants.forEach((c) => {
          if (c.images && c.images.length > 0) allImages.push(...c.images);
        });
      }
      const finalImages = Array.from(new Set(allImages.map((u) => u.trim()).filter(Boolean)));

      // First active price
      let primaryPrice = (hasAnyVariants && variantCombos[0]?.price) ? Number(variantCombos[0].price) : (basePrice || 0);
      let primaryOldPrice = (hasAnyVariants && variantCombos[0]?.old_price) ? Number(variantCombos[0].old_price) : (baseOldPrice || null);

      // CRITICAL: If no discount is active (old_price <= price), clear old_price so original price is displayed cleanly without any discount badge!
      if (primaryOldPrice !== null && primaryOldPrice <= primaryPrice) {
        primaryOldPrice = null;
      }

      // ── SMART VALIDATION & FALLBACKS ──
      if (finalImages.length === 0) {
        finalImages.push("https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600");
      }

      // Enrich every variant combo with full variant metadata (color_hex, image_ref, warranty, storage, stock, sku, price)
      const enrichedVariantCombos: ProductVariantCombo[] = !hasAnyVariants
        ? []
        : variantCombos.map((v) => {
            const matchedColor = cleanedColorVariants.find((c) => c.name === v.color_name || c.id === v.color_id);
            const colorHex = v.color_hex || matchedColor?.hex || (v.color_name ? getColorCSS(v.color_name) : "#000000");
            const colorImage = matchedColor?.images?.[0] || matchedColor?.cover_image || finalImages[0] || "";
            const vPrice = Number(v.price) || primaryPrice;
            let rawVOld = v.old_price !== undefined && v.old_price !== null ? Number(v.old_price) : primaryOldPrice;
            if (rawVOld !== null && rawVOld <= vPrice) {
              rawVOld = null;
            }
            return {
              ...v,
              id: v.id || `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              color_id: v.color_id || matchedColor?.id,
              color_name: v.color_name || matchedColor?.name || (hasColorVariants ? "Standard" : ""),
              color_hex: colorHex,
              storage: v.storage || "",
              ram: v.ram || "",
              sim_type: v.sim_type || "",
              price: vPrice,
              old_price: rawVOld,
              stock_quantity: Number(v.stock_quantity) || 0,
              available_stock: Math.max(0, (Number(v.stock_quantity) || 0) - (v.reserved_stock || 0)),
              sku: v.sku || code || slug,
              image_ref: v.image_ref && finalImages.includes(v.image_ref) ? v.image_ref : colorImage,
              warranty: v.warranty || warrantyOptions[0]?.title || "",
            };
          });

      const productPayload: Partial<Product> = {
        name: name.trim(),
        slug: slug.trim() ? generateProductSlug(slug) : generateProductSlug(name),
        code: code.trim(),
        
        productType: productType,
        hasColorVariants: hasColorVariants,
        hasStorageVariants: hasStorageVariants,

        category_id: finalCategoryId,
        category_name: finalCategoryName,
        category_slug: finalCategorySlug,
        categoryId: finalCategoryId,
        categoryName: finalCategoryName,
        categorySlug: finalCategorySlug,

        brand: finalBrand,
        brand_id: `brand-${finalBrandSlug}`,
        brand_name: finalBrand,
        brand_slug: finalBrandSlug,
        brandId: `brand-${finalBrandSlug}`,
        brandName: finalBrand,
        brandSlug: finalBrandSlug,

        status: publishStatus,
        price: primaryPrice,
        old_price: primaryOldPrice,
        description: description.trim(),
        delivery_info: deliveryInfo.trim(),
        stock_status: isOutOfStock ? "out_of_stock" : totalVariantStock <= 5 ? "low_stock" : "in_stock",
        stock_count: totalVariantStock,
        stock_quantity: totalVariantStock,
        featured,
        is_new_arrival: isNewArrival,
        images: finalImages,
        image_url: finalImages[0] || "",
        image: finalImages[0] || "",
        cover_image: finalImages[0] || "",
        primary_image: finalImages[0] || "",
        imageSettings: imageSettings,
        productImageSettings: imageSettings,
        colors: cleanedColorVariants.map((c) => c.name),
        color_variants: cleanedColorVariants,
        variant_combos: enrichedVariantCombos,
        warranty_options: warrantyOptions,
        warranty: warrantyOptions[0]?.title || "",
        brand_warranty: warrantyOptions.find((w) => w.type === "Manufacturer Warranty")?.title || "",
        specifications: specRows.reduce((acc, r) => {
          if (r.key.trim() && r.value.trim()) acc[r.key.trim()] = r.value.trim();
          return acc;
        }, {} as Record<string, string>),
        allow_cod: allowCod,
        allow_card: allowCard,
        allow_whatsapp: allowWhatsapp,
        meta_title: metaTitle.trim(),
        metaTitle: metaTitle.trim(),
        meta_description: metaDescription.trim(),
        metaDescription: metaDescription.trim(),
        compatible_brands: [finalBrand],
        created_at: initialData?.created_at || new Date().toISOString(),
      };

      const cleanedPayload = sanitizeForFirestore(productPayload);

      const endpoint = "/api/admin/products";
      const method = initialData?.id ? "PUT" : "POST";
      const payloadToSend = initialData?.id
        ? { id: initialData.id, ...cleanedPayload }
        : cleanedPayload;

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payloadToSend,
          isCustomCategory,
          customCategoryName,
          isCustomBrand,
          customBrandName,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to save product via admin API");
      }

      clearDataCache("products");
      clearDataCache("products:all");

      setHasUnsavedChanges(false);
      onSave();
      onClose();
    } catch (e) {
      console.error("Error saving product:", e);
      setEditorError("Could not save this product. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="product-editor-overlay">
      <div className="product-editor-backdrop" aria-hidden="true" onClick={requestClose} />
      <div ref={editorRef} role="dialog" aria-modal="true" aria-labelledby="product-editor-title" tabIndex={-1} data-product-editor data-advanced={showAdvanced ? "true" : "false"} className="product-editor bg-white text-gray-900 overflow-hidden flex flex-col">
      {/* ── TOP STICKY EDITOR BAR ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-xs shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={requestClose}
            aria-label="Close product editor"
            className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
            title="Close Editor"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 id="product-editor-title" className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              {initialData && initialData.id ? `Edit product: ${name || initialData.name || "Product"}` : "Add a product"}
              {hasUnsavedChanges && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Unsaved Changes
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Start with the basics. Add photos, then publish when ready.
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleSaveProduct("draft")}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all border border-gray-200"
          >
            Save draft
          </button>
          <button
            onClick={() => handleSaveProduct("active")}
            disabled={isSubmitting}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {Boolean(initialData && initialData.id) ? "Save changes" : "Publish product"}
          </button>
        </div>
      </div>

      {/* ── TAB NAVIGATION HEADER ── */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 overflow-x-auto shrink-0 select-none">
        <div className="product-editor-tabs flex items-center gap-1">
          {[
            { id: 1, label: "Basics", icon: Tag },
            { id: 2, label: "Photos", icon: Palette },
            {
              id: 3,
              label: "Variants",
              icon: Sliders,
            },
            { id: 4, label: "Specifications", icon: Cpu },
            { id: 5, label: "Warranty", icon: ShieldCheck },
            { id: 6, label: "Delivery & payment", icon: Truck },
            { id: 7, label: "Search & publishing", icon: Globe },
          ].filter((tab) => tab.id < 3 || (tab.id === 3 && (hasColorVariants || hasStorageVariants || activeTab === 3)) || (tab.id > 3 && showAdvanced) || tab.id === activeTab).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                aria-pressed={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
          <button type="button" className="product-editor-more" aria-expanded={showAdvanced} onClick={() => { if (showAdvanced && activeTab > 3) setActiveTab(1); setShowAdvanced(!showAdvanced); }}>{showAdvanced ? "Less" : "More options"}</button>
        </div>
      </div>

      {/* ── TAB BODY CONTENT AREA (SCROLLABLE) ── */}
      <div className="product-editor-body flex-1 overflow-y-auto p-6 bg-gray-50/40" data-lenis-prevent>
        <div className="max-w-5xl mx-auto space-y-6">
          {editorError && <p role="alert" className="product-editor-error">{editorError}</p>}

          {/* ════════════════════════════════════════════════════════════════
              TAB 1: BASIC INFORMATION
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 1 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in">
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Samsung Galaxy S24 Ultra 5G"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div data-product-extra>
                  <label className="block font-bold text-gray-700 mb-1">Product code / SKU</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. 1P-S24U"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div data-product-extra>
                  <label className="block font-bold text-gray-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="samsung-galaxy-s24-ultra-5g"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Category Selector with Custom Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700 flex items-center gap-1.5">
                      <span>Category *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(!isCustomCategory);
                        if (!isCustomCategory) {
                          setCustomCategoryName("");
                        }
                      }}
                      className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {isCustomCategory ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {isCustomCategory ? "Back to List" : "+ Add Custom Category"}
                    </button>
                  </div>

                  {isCustomCategory ? (
                    <div className="flex gap-2 animate-in fade-in-0 duration-150">
                      <input
                        type="text"
                        autoFocus
                        value={customCategoryName}
                        onChange={(e) => {
                          setCustomCategoryName(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyCustomCategory();
                          }
                        }}
                        placeholder="Type new category (e.g. Smart Glasses, Drones, Camera)"
                        className="flex-1 px-3.5 py-2.5 bg-blue-50/40 border-2 border-blue-400 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCustomCategory()}
                        disabled={!customCategoryName.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Save &amp; Select
                      </button>
                    </div>
                  ) : (
                    <select
                      value={categoryId}
                      onChange={(e) => {
                        const newCatId = e.target.value;
                        if (newCatId === "__custom_add__") {
                          setIsCustomCategory(true);
                          setCustomCategoryName("");
                          return;
                        }
                        setCategoryId(newCatId);
                        const catObj = mergedCategories.find((c) => c.id === newCatId);
                        const catName = catObj?.name || newCatId;
                        const detected = detectProductType(catName, name);
                        setProductType(detected);
                        if (detected === "laptop" || detected === "phone") {
                          setHasColorVariants(true);
                          setHasStorageVariants(true);
                        } else {
                          setHasColorVariants(false);
                          const isStorageDevice = /storage|pen drive|flash drive|sd card|hard disk|ssd|memory card/i.test(catName);
                          setHasStorageVariants(isStorageDevice);
                        }
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Choose a category</option>
                      {mergedCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__custom_add__" className="text-blue-600 font-bold bg-blue-50">
                        ✨ + Create / Add New Custom Category...
                      </option>
                    </select>
                  )}
                </div>

                {/* Brand Name Selector with Custom Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700 flex items-center gap-1.5">
                      <span>Brand Name *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomBrand(!isCustomBrand);
                        if (!isCustomBrand) {
                          setCustomBrandName("");
                        }
                      }}
                      className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {isCustomBrand ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {isCustomBrand ? "Back to List" : "+ Add Custom Brand"}
                    </button>
                  </div>

                  {isCustomBrand ? (
                    <div className="flex gap-2 animate-in fade-in-0 duration-150">
                      <input
                        type="text"
                        autoFocus
                        value={customBrandName}
                        onChange={(e) => {
                          setCustomBrandName(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyCustomBrand();
                          }
                        }}
                        placeholder="Type new brand (e.g. Bose, Marshall, Nothing, GoPro)"
                        className="flex-1 px-3.5 py-2.5 bg-blue-50/40 border-2 border-blue-400 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCustomBrand()}
                        disabled={!customBrandName.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Save &amp; Select
                      </button>
                    </div>
                  ) : (
                    <select
                      value={brand}
                      onChange={(e) => {
                        const newBrand = e.target.value;
                        if (newBrand === "__custom_add__") {
                          setIsCustomBrand(true);
                          setCustomBrandName("");
                          return;
                        }
                        setBrand(newBrand);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Choose a brand</option>
                      {brandOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value="__custom_add__" className="text-blue-600 font-bold bg-blue-50">
                        ✨ + Create / Add New Custom Brand...
                      </option>
                    </select>
                  )}
                </div>

                {/* ── Product Type & Variant Feature Flags Block ── */}
                <details className="product-variant-options md:col-span-2 border rounded-2xl p-4 space-y-3.5">
                  <summary>Colours, sizes & variants <span>Optional</span></summary>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs text-gray-900 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-blue-600" />
                        Product Type &amp; Variant Configurations
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Select device type and configure whether this product requires color options or storage / capacity variants.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 text-xs">
                    {/* 1. Product Type Setting (Phone / Laptop / Tab / Accessory) */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1.5">1. Product Type</label>
                      <div className="grid grid-cols-3 p-1 bg-white border border-gray-200 rounded-xl w-full gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProductType("phone");
                            setHasColorVariants(true);
                            setHasStorageVariants(true);
                            setHasUnsavedChanges(true);
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer ${
                            productType === "phone"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          }`}
                        >
                          📱 Phone
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProductType("laptop");
                            setHasColorVariants(true);
                            setHasStorageVariants(true);
                            setHasUnsavedChanges(true);
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer ${
                            productType === "laptop"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          }`}
                        >
                          💻 Laptop / Tab
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProductType("accessory");
                            setHasColorVariants(true);
                            setHasStorageVariants(false);
                            setHasUnsavedChanges(true);
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer ${
                            productType === "accessory"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          }`}
                        >
                          🎧 Accessory
                        </button>
                      </div>
                    </div>

                    {/* 2. Color Options Setting (Universal for Phone, Laptop & Accessory) */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1.5">
                        2. Multiple Color Options?
                      </label>
                      <div className="inline-flex p-1 bg-white border border-gray-200 rounded-xl w-full">
                        <button
                          type="button"
                          onClick={() => {
                            if (hasColorVariants && colorVariants.length > 0) {
                              if (
                                !confirm(
                                  "Are you sure you want to disable color options? Existing color variants will be cleared."
                                )
                              ) {
                                return;
                              }
                            }
                            setHasColorVariants(false);
                            setColorVariants([]);
                            setHasUnsavedChanges(true);
                          }}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            !hasColorVariants
                              ? "bg-slate-800 text-white shadow-xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHasColorVariants(true);
                            if (colorVariants.length === 0) {
                              setColorVariants([
                                {
                                  id: `col-1`,
                                  name: "Black",
                                  hex: "#000000",
                                  images: [],
                                  active: true,
                                  is_default: true,
                                },
                                {
                                  id: `col-2`,
                                  name: "White",
                                  hex: "#FFFFFF",
                                  images: [],
                                  active: true,
                                  is_default: false,
                                },
                              ]);
                            }
                            setHasUnsavedChanges(true);
                          }}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            hasColorVariants
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Yes
                        </button>
                      </div>
                    </div>

                    {/* 3. Storage Options Setting (Universal for Phone, Laptop / Tab & Accessory) */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1.5 truncate">
                        {productType === "laptop"
                          ? "3. RAM & SSD Storage Options?"
                          : productType === "phone"
                          ? "3. Storage & RAM Options?"
                          : "3. Storage / Capacity Options?"}
                      </label>
                      <div className="inline-flex p-1 bg-white border border-gray-200 rounded-xl w-full">
                        <button
                          type="button"
                          onClick={() => {
                            if (hasStorageVariants && variantCombos.some((v) => Boolean(v.storage || v.ram))) {
                              if (
                                !confirm(
                                  "Are you sure you want to disable storage/capacity options? Variant rows will be updated."
                                )
                              ) {
                                return;
                              }
                            }
                            setHasStorageVariants(false);
                            setHasUnsavedChanges(true);
                          }}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            !hasStorageVariants
                              ? "bg-slate-800 text-white shadow-xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHasStorageVariants(true);
                            if (availableStorage.length === 0) {
                              if (productType === "laptop") {
                                setAvailableStorage(["256GB SSD", "512GB SSD", "1TB SSD"]);
                              } else if (productType === "phone") {
                                setAvailableStorage(["128GB", "256GB", "512GB"]);
                              } else {
                                setAvailableStorage(["64GB", "128GB", "256GB"]);
                              }
                            }
                            setHasUnsavedChanges(true);
                          }}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            hasStorageVariants
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Yes
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Color Presets & Quick Add (Shown when Color Options are Enabled) */}
                  {hasColorVariants && (
                    <div className="mt-3 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2.5 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-emerald-600" />
                          Select or Add Product Color Options ({colorVariants.length} Active Colors):
                        </label>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          Click color presets to toggle
                        </span>
                      </div>

                      {/* Popular Color Preset Buttons with Live Swatches */}
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { name: "Black", hex: "#000000" },
                          { name: "White", hex: "#FFFFFF" },
                          { name: "Natural Titanium", hex: "#9A958E" },
                          { name: "Desert Titanium", hex: "#C5B097" },
                          { name: "Silver", hex: "#E3E4E5" },
                          { name: "Space Gray", hex: "#535150" },
                          { name: "Midnight", hex: "#1E232A" },
                          { name: "Starlight", hex: "#E8E5DD" },
                          { name: "Gold", hex: "#F5E1A4" },
                          { name: "Blue", hex: "#206095" },
                          { name: "Deep Purple", hex: "#4B384C" },
                          { name: "Green", hex: "#385E48" },
                          { name: "Pink", hex: "#E8A598" },
                        ].map((cPreset) => {
                          const isSelected = colorVariants.some(
                            (c) => c.name.toLowerCase() === cPreset.name.toLowerCase()
                          );
                          return (
                            <button
                              key={cPreset.name}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setColorVariants(
                                    colorVariants.filter(
                                      (c) => c.name.toLowerCase() !== cPreset.name.toLowerCase()
                                    )
                                  );
                                } else {
                                  setColorVariants([
                                    ...colorVariants,
                                    {
                                      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                                      name: cPreset.name,
                                      hex: cPreset.hex,
                                      images: [],
                                      active: true,
                                      is_default: colorVariants.length === 0,
                                    },
                                  ]);
                                }
                                setHasUnsavedChanges(true);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-700 text-white shadow-xs"
                                  : "bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 inline-block"
                                style={{ backgroundColor: cPreset.hex }}
                              />
                              <span>{isSelected ? `✓ ${cPreset.name}` : `+ ${cPreset.name}`}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick Custom Color Add Row */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newColorName}
                          onChange={(e) => setNewColorName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newColorName.trim()) {
                              e.preventDefault();
                              handleAddColour();
                            }
                          }}
                          placeholder="Type custom color name (e.g. Phantom Violet) and click Add..."
                          className="flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium"
                        />
                        <input
                          type="color"
                          value={newColorHex}
                          onChange={(e) => setNewColorHex(e.target.value)}
                          className="w-8 h-8 p-0.5 bg-white border border-emerald-200 rounded-xl cursor-pointer shrink-0"
                          title="Choose Color Hex"
                        />
                        <button
                          type="button"
                          onClick={handleAddColour}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs shrink-0"
                        >
                          + Add Color
                        </button>
                      </div>

                      {colorVariants.length > 0 && (
                        <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-800 font-bold border-t border-emerald-200/60">
                          <span>Active Colors: {colorVariants.map((c) => c.name).join(", ")}</span>
                          <button
                            type="button"
                            onClick={() => setActiveTab(2)}
                            className="text-emerald-800 hover:text-emerald-950 underline font-extrabold cursor-pointer"
                          >
                            📸 Upload Photos for each Color in Tab 2 &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dynamic Storage & Capacity Preset Chips (Shown when Storage Variants are Enabled) */}
                  {hasStorageVariants && (
                    <div className="mt-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2.5 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="font-bold text-blue-900 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-blue-600" />
                          {productType === "laptop"
                            ? "Select Laptop / Tab Storage & SSD Options:"
                            : productType === "phone"
                            ? "Select Phone Storage Options:"
                            : "Select Accessory Storage / Capacity Options:"}
                        </label>
                        <span className="text-[11px] text-blue-700 font-medium">
                          Click chips to toggle or add custom
                        </span>
                      </div>

                      {/* Quick Presets Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {(productType === "laptop"
                          ? ["128GB SSD", "256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD", "8GB RAM", "16GB RAM", "32GB RAM"]
                          : productType === "phone"
                          ? ["64GB", "128GB", "256GB", "512GB", "1TB"]
                          : ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "10000mAh", "20000mAh", "Standard"]
                        ).map((preset) => {
                          const isSelected = availableStorage.includes(preset);
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setAvailableStorage(availableStorage.filter((s) => s !== preset));
                                } else {
                                  setAvailableStorage([...availableStorage, preset]);
                                }
                                setHasUnsavedChanges(true);
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-white border border-blue-200 text-blue-800 hover:bg-blue-100"
                              }`}
                            >
                              {isSelected ? `✓ ${preset}` : `+ ${preset}`}
                            </button>
                          );
                        })}
                      </div>

                      {/* Add Custom Storage / Capacity Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={customStorageInput}
                          onChange={(e) => setCustomStorageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && customStorageInput.trim()) {
                              e.preventDefault();
                              if (!availableStorage.includes(customStorageInput.trim())) {
                                setAvailableStorage([...availableStorage, customStorageInput.trim()]);
                              }
                              setCustomStorageInput("");
                              setHasUnsavedChanges(true);
                            }
                          }}
                          placeholder={
                            productType === "laptop"
                              ? "Type custom (e.g. 512GB NVMe / 32GB RAM) and press Add..."
                              : productType === "phone"
                              ? "Type custom (e.g. 256GB / 12GB) and press Add..."
                              : "Type custom (e.g. 30000mAh / 64GB) and press Add..."
                          }
                          className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customStorageInput.trim()) {
                              if (!availableStorage.includes(customStorageInput.trim())) {
                                setAvailableStorage([...availableStorage, customStorageInput.trim()]);
                              }
                              setCustomStorageInput("");
                              setHasUnsavedChanges(true);
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs shrink-0"
                        >
                          + Add
                        </button>
                      </div>

                      {availableStorage.length > 0 && (
                        <div className="flex items-center justify-between pt-1 text-[11px] text-blue-800 font-bold border-t border-blue-200/60">
                          <span>Active Storage Options: {availableStorage.join(", ")}</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleGenerateCombinations();
                              setActiveTab(3);
                            }}
                            className="text-blue-700 hover:text-blue-900 underline font-extrabold cursor-pointer"
                          >
                            ⚡ Auto-Generate Variants in Tab 3 &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </details>

                {/* Old / Regular Price */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Old price (LKR) · optional</label>
                  <input
                    type="number"
                    min={0}
                    value={baseOldPrice || ""}
                    onChange={(e) => {
                      const oldVal = Number(e.target.value) || null;
                      setBaseOldPrice(oldVal);
                      if (oldVal && basePrice && oldVal > basePrice) {
                        setDiscountPercent(Math.round(((oldVal - basePrice) / oldVal) * 100));
                      } else {
                        setDiscountPercent(0);
                      }
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. 185000"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-700 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Offer / Selling Price */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Selling price (LKR) <span className="text-gray-400 font-normal">Required to publish</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={basePrice || ""}
                    onChange={(e) => {
                      const newSellingPrice = Number(e.target.value);
                      setBasePrice(newSellingPrice);
                      if (baseOldPrice && baseOldPrice > newSellingPrice) {
                        setDiscountPercent(Math.round(((baseOldPrice - newSellingPrice) / baseOldPrice) * 100));
                      } else {
                        setDiscountPercent(0);
                      }
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. 165000"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-black text-blue-600 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Offer Percentage (%) */}
                <div data-product-extra>
                  <label className="block font-bold text-gray-700 mb-1">Offer Discount (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={discountPercent || ""}
                      onChange={(e) => {
                        const pct = Math.min(99, Math.max(0, Number(e.target.value)));
                        setDiscountPercent(pct);
                        if (baseOldPrice && pct > 0) {
                          const calculatedPrice = Math.round(baseOldPrice * (1 - pct / 100));
                          setBasePrice(calculatedPrice);
                        }
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="e.g. 15"
                      className="w-full px-3.5 py-2.5 pr-14 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-black text-red-600 outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-xs text-red-600">% OFF</span>
                  </div>
                </div>

                {/* Stock Quantity (Primary for accessories / fallback) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">Available stock *</label>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        baseStock === 0
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : baseStock <= 5
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {baseStock === 0 ? "Out of Stock" : baseStock <= 5 ? "Low Stock" : "In Stock"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={baseStock}
                      onChange={(e) => {
                        setBaseStock(Math.max(0, parseInt(e.target.value) || 0));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="e.g. 15"
                      className="w-full px-3.5 py-2.5 pr-16 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">units</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 text-xs">Full Product Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter complete product features and overview..."
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Featured Product Toggle */}
                <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
                  featured
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-900"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100/70"
                }`}>
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => {
                      setFeatured(e.target.checked);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-black flex items-center gap-1.5 text-gray-900">
                      ⭐ Featured Product
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      Display on Homepage Featured Flagships, Best Sellers &amp; quick filters.
                    </p>
                  </div>
                </label>

                {/* New Arrival Toggle */}
                <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
                  isNewArrival
                    ? "bg-blue-500/10 border-blue-500/40 text-blue-900"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100/70"
                }`}>
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => {
                      setIsNewArrival(e.target.checked);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-black flex items-center gap-1.5 text-gray-900">
                      🚀 New Arrival Product
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      Display in Homepage &ldquo;New Arrivals&rdquo; section and show &ldquo;NEW&rdquo; badge.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 2: MEDIA & COLOUR-SPECIFIC GALLERIES
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 2 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">
                  Product Media & Image Galleries
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Upload multiple product images for general view, as well as color-specific gallery thumbnails.
                </p>
              </div>

              {/* ── General Product Gallery Images (Multi-Slot Upload & Auto-Split Paste) ── */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-600" />
                      General Product Gallery Images ({generalImages.filter((u) => u && u.trim()).length} Active Images)
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Upload or enter 2, 3, 4 or more image URLs for this product. You can paste comma-separated or newline-separated URLs into any slot!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setGeneralImages([...generalImages, ""]);
                      setHasUnsavedChanges(true);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Image Slot
                  </button>
                </div>

                {/* Individual Image Input Slots */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {(generalImages.length > 0 ? generalImages : [""]).map((imgUrl, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
                      {/* Thumbnail Preview */}
                      <div className="w-12 h-12 shrink-0 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center p-0.5 relative">
                        {imgUrl && imgUrl.trim() ? (
                          <img src={imgUrl.trim()} alt={`Image ${i + 1}`} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-300" />
                        )}
                      </div>

                      {/* URL Input */}
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-extrabold text-gray-500 mb-0.5 uppercase tracking-wider">
                          Product Image {i + 1}
                        </label>
                        <input
                          type="text"
                          value={imgUrl}
                          onChange={(e) => {
                            const raw = e.target.value;
                            // Support auto-split if pasting comma, semicolon, or newline separated URLs
                            if (raw.includes(",") || raw.includes("\n") || raw.includes(";")) {
                              const parts = raw.split(/[\n,;]+/).map((u) => u.trim()).filter(Boolean);
                              const updated = [...generalImages];
                              updated.splice(i, 1, ...parts);
                              setGeneralImages(updated);
                            } else {
                              const updated = [...generalImages];
                              updated[i] = raw;
                              setGeneralImages(updated);
                            }
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="Paste image URL (e.g. https://i.postimg.cc/...)"
                          className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const removedUrl = (generalImages[i] || "").trim();
                          const updated = generalImages.filter((_, idx) => idx !== i);
                          setGeneralImages(updated.length > 0 ? updated : [""]);
                          if (removedUrl) {
                            setColorVariants((prev) =>
                              prev.map((col) => ({
                                ...col,
                                images: (col.images || []).filter((u) => u.trim() !== removedUrl),
                              }))
                            );
                            setVariantCombos((prev) =>
                              prev.map((v) => ({
                                ...v,
                                image_ref: v.image_ref === removedUrl ? "" : v.image_ref,
                              }))
                            );
                          }
                          setHasUnsavedChanges(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove image slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Bulk Paste / Edit Toggle */}
                <details className="text-xs group pt-1">
                  <summary className="font-bold text-gray-600 cursor-pointer hover:text-blue-600 select-none">
                    ⚡ Bulk Paste / Raw URL Editor (Comma or Newline Separated)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={3}
                      value={generalImages.join("\n")}
                      onChange={(e) => {
                        const urls = e.target.value.split(/[\n,;]+/).map((u) => u.trim());
                        setGeneralImages(urls);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Paste multiple URLs (One per line or separated by commas)"
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl font-mono text-[11px] outline-none focus:border-blue-500"
                    />
                  </div>
                </details>
              </div>

              {/* ── Product Card Image Frame & Fitting Controls (Per-Product Zoom & Alignment) ── */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Product Card Image Frame &amp; Fitting Controls
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Fine-tune how the primary product image fits inside the 1:1 square card frame across the website.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setImageSettings({
                        fit: "contain",
                        scale: 100,
                        positionX: 0,
                        positionY: 0,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Image Position</span>
                  </button>
                </div>

                {/* Admin Tip / Excessive Whitespace Warning */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Image Fitting Tip:</span> This image contains excessive empty space or large white margins (e.g. DJI Osmo, Gimbals, small accessories). Use <strong>Image Zoom</strong> (e.g. 120% &ndash; 160%) or upload a tightly cropped product image so the product occupies 75%&ndash;85% of the frame naturally.
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
                  {/* Controls Column */}
                  <div className="lg:col-span-7 space-y-4 text-xs">
                    {/* 1. Image Fit */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1.5">1. Image Fit Mode</label>
                      <div className="inline-flex p-1 bg-white border border-gray-200 rounded-xl w-full">
                        {(["contain", "cover", "custom"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              setImageSettings((prev) => ({ ...prev, fit: mode }));
                              setHasUnsavedChanges(true);
                            }}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                              (imageSettings.fit || "contain") === mode
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Image Zoom */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-gray-700">2. Product Image Zoom</label>
                        <span className="font-mono font-bold text-blue-600 text-xs">
                          {imageSettings.scale || 100}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={80}
                        max={200}
                        step={2}
                        value={imageSettings.scale || 100}
                        onChange={(e) => {
                          setImageSettings((prev) => ({ ...prev, scale: Number(e.target.value) }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 font-mono">
                        <span>80% (Zoom Out)</span>
                        <span>100% (Default)</span>
                        <span>200% (Zoom In)</span>
                      </div>
                    </div>

                    {/* 3. Horizontal Position (X) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-gray-700">3. Horizontal Position (X)</label>
                        <span className="font-mono font-bold text-blue-600 text-xs">
                          {imageSettings.positionX || 0}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        step={1}
                        value={imageSettings.positionX || 0}
                        onChange={(e) => {
                          setImageSettings((prev) => ({ ...prev, positionX: Number(e.target.value) }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 font-mono">
                        <span>-50% (Left)</span>
                        <span>0% (Center)</span>
                        <span>+50% (Right)</span>
                      </div>
                    </div>

                    {/* 4. Vertical Position (Y) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-gray-700">4. Vertical Position (Y)</label>
                        <span className="font-mono font-bold text-blue-600 text-xs">
                          {imageSettings.positionY || 0}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        step={1}
                        value={imageSettings.positionY || 0}
                        onChange={(e) => {
                          setImageSettings((prev) => ({ ...prev, positionY: Number(e.target.value) }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 font-mono">
                        <span>-50% (Up)</span>
                        <span>0% (Center)</span>
                        <span>+50% (Down)</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Card Column */}
                  <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-gray-700 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-600" /> Live Product Card Preview
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">1:1 Square Frame</span>
                    </div>

                    {/* Live Card Simulation */}
                    <div className="w-full max-w-[220px] mx-auto bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
                      {/* Image Container with 1:1 Aspect Ratio and #F7F7F7 Background */}
                      <div className="product-image-container relative aspect-square bg-[#F7F7F7] flex items-center justify-center overflow-hidden rounded-t-2xl">
                        {/* Bottom-Left Offer Badge */}
                        <div className="product-offer-badge absolute bottom-0 left-0 z-10">
                          {discountPercent > 0 ? (
                            <span className="bg-black text-white text-[9px] font-black px-2 py-0.5 rounded-tr-md uppercase tracking-wider shadow-2xs inline-block">
                              -{discountPercent}% OFF
                            </span>
                          ) : (
                            <span className="bg-neutral-900 text-white text-[9px] font-black px-2 py-0.5 rounded-tr-md uppercase tracking-wider shadow-2xs inline-block">
                              New
                            </span>
                          )}
                        </div>

                        {/* Top-Right Wishlist Heart */}
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 border border-neutral-200/80 flex items-center justify-center text-neutral-400 shadow-2xs">
                          <Heart className="w-3 h-3" />
                        </div>

                        {/* Live Product Image with Transform Origin Center */}
                        <div className="w-full h-full flex items-center justify-center overflow-hidden p-2">
                          <img
                            src={
                              generalImages[0] ||
                              colorVariants[0]?.images?.[0] ||
                              "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800"
                            }
                            alt="Preview"
                            style={{
                              objectPosition: `${50 + (imageSettings.positionX || 0)}% ${50 + (imageSettings.positionY || 0)}%`,
                              transform: `scale(${(imageSettings.scale || 100) / 100})`,
                              transformOrigin: "center center",
                            }}
                            className={`w-full h-full ${
                              imageSettings.fit === "cover" ? "object-cover" : "object-contain"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-3 bg-white">
                        <span className="text-[9px] font-extrabold uppercase text-neutral-400 block mb-0.5">
                          {mergedCategories.find((c) => c.id === categoryId)?.name || customCategoryName || "SMARTPHONES"}
                        </span>
                        <h5 className="font-bold text-xs text-neutral-900 line-clamp-1 mb-1">
                          {name || "Product Name"}
                        </h5>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="font-extrabold text-xs text-neutral-900">
                            {formatLKR(basePrice || 150000)}
                          </span>
                          {baseOldPrice && baseOldPrice > basePrice && (
                            <span className="text-[10px] text-neutral-400 line-through">
                              {formatLKR(baseOldPrice)}
                            </span>
                          )}
                        </div>
                        <div className="w-full py-1.5 bg-black text-white text-[10px] font-bold rounded-lg text-center">
                          Add to Bag
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {!hasColorVariants ? (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-center text-xs space-y-3">
                  <Palette className="w-8 h-8 text-amber-500 mx-auto" />
                  <div>
                    <h4 className="font-extrabold text-amber-900 text-sm">Color Options Disabled</h4>
                    <p className="text-amber-700 text-xs mt-1 max-w-md mx-auto">
                      Color options are turned OFF for this product. You can save this product without any color variants.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHasColorVariants(true);
                      setHasUnsavedChanges(true);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Enable Color Options
                  </button>
                </div>
              ) : (
                <>
                  {/* Add New Colour Form */}
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Colour Name</label>
                      <input
                        type="text"
                        value={newColorName}
                        onChange={(e) => setNewColorName(e.target.value)}
                        placeholder="e.g. Titanium Natural"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Hex Color</label>
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="w-12 h-9 p-1 bg-white border border-gray-200 rounded-xl cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddColour}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Colour
                    </button>
                  </div>

                  {/* Colours List */}
                  <div className="space-y-4">
                    {colorVariants.map((col, cIdx) => (
                      <div key={col.id} className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full border border-gray-300 shadow-xs" style={{ backgroundColor: col.hex }} />
                            <span className="font-extrabold text-sm text-gray-900">{col.name}</span>
                            {col.is_default && <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Default</span>}
                          </div>

                          <button
                            onClick={() => setColorVariants(colorVariants.filter((c) => c.id !== col.id))}
                            className="text-xs text-red-600 hover:underline font-bold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>

                        {/* Dedicated Gallery Image URLs for this Colour */}
                        <div className="space-y-2 text-xs">
                          <label className="block font-bold text-gray-700">Dedicated Gallery Image URLs (One URL per line)</label>
                          <textarea
                            rows={3}
                            value={(col.images || []).join("\n")}
                            onChange={(e) => {
                              const urls = e.target.value.split("\n").map((u) => u.trim()).filter(Boolean);
                              const updated = [...colorVariants];
                              updated[cIdx].images = urls;
                              setColorVariants(updated);
                            }}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl font-mono text-[11px] outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Previews with Quick Remove Button */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {(col.images || []).map((img, i) => (
                            <div key={i} className="relative group/thumb w-14 h-14 bg-white border border-gray-200 rounded-xl overflow-hidden p-1">
                              <img src={img} alt="" className="w-full h-full object-contain" />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...colorVariants];
                                  updated[cIdx].images = (col.images || []).filter((_, idx) => idx !== i);
                                  setColorVariants(updated);
                                  setHasUnsavedChanges(true);
                                }}
                                className="absolute top-0.5 right-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 opacity-80 group-hover/thumb:opacity-100 transition-opacity shadow-xs hover:scale-110 cursor-pointer"
                                title="Delete this image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 3: VARIANTS & STOCK MATRIX TABLE
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 3 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-gray-900">Variant Combinations & Inventory Matrix</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage SKU, Colour, RAM, Storage, Price and exact Stock per variant</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddManualVariant}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Add Variant Row
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateCombinations}
                    className="px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-blue-600" /> Auto Generate
                  </button>
                  {variantCombos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Clear all variant combinations? Base price and stock will be used instead.")) {
                          setVariantCombos([]);
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold text-xs rounded-xl flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear All
                    </button>
                  )}
                </div>
              </div>

              {!hasColorVariants && !hasStorageVariants ? (
                /* ── Dedicated Accessory / Single-Product Stock Manager ── */
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <Sliders className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                          Accessory / Single-Product Stock Manager
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              baseStock === 0
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : baseStock <= 5
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {baseStock === 0 ? "Out of Stock" : baseStock <= 5 ? "Low Stock Alert" : "In Stock"}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Since this accessory does not have storage variants, manage its inventory units directly here.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Stock Counter - Direct Manual Input */}
                    <div className="md:col-span-7 bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Current Available Units in Stock *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">Type manual stock quantity</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          value={baseStock}
                          onChange={(e) => {
                            setBaseStock(Math.max(0, parseInt(e.target.value) || 0));
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="e.g. 10"
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl font-mono text-2xl font-black text-emerald-400 outline-none focus:border-blue-500 transition-colors"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Units
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Type the exact number of units directly. Enter <code className="text-amber-300 font-bold">0</code> to mark product as Out of Stock.
                      </p>
                    </div>

                    {/* Summary Info */}
                    <div className="md:col-span-5 bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-3">
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Storefront Inventory Status
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Offer Selling Price:</span>
                          <span className="font-mono font-bold text-white">LKR {basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Stock Level:</span>
                          <span
                            className={`font-bold ${
                              baseStock === 0
                                ? "text-red-400"
                                : baseStock <= 5
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {baseStock === 0
                              ? "Out of Stock (Pre-order / Call to Order)"
                              : baseStock <= 5
                              ? `Low Stock (${baseStock} remaining)`
                              : `In Stock (${baseStock} units)`}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Storefront Add to Cart:</span>
                          <span className="font-bold text-white">
                            {baseStock > 0 ? "Enabled" : "Disabled (Out of Stock)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : variantCombos.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-xs space-y-3">
                  <Sliders className="w-8 h-8 text-gray-300 mx-auto" />
                  <div>
                    <p className="font-extrabold text-gray-800 text-sm">No Variants Added Yet</p>
                    <p className="text-gray-500 text-xs mt-1">
                      You can add manual variant rows (e.g. Colour, Size/Length) or automatically generate combinations from your active colors.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleAddManualVariant}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Add Manual Variant Row
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateCombinations}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-4 h-4" /> Auto Generate Combinations
                    </button>
                  </div>
                </div>
              ) : (
                /* Combinations Table */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[750px] text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        {hasColorVariants && <th className="px-3 py-3">Colour / Option</th>}
                        {!hasColorVariants && <th className="px-3 py-3">Variant Option</th>}
                        {hasStorageVariants && <th className="px-3 py-3">{productType === "laptop" ? "RAM" : "RAM / Specs"}</th>}
                        {hasStorageVariants && <th className="px-3 py-3">{productType === "laptop" ? "SSD Storage" : productType === "phone" ? "Storage" : "Capacity"}</th>}
                        {hasStorageVariants && productType === "phone" && <th className="px-3 py-3">SIM / Region</th>}
                        <th className="px-3 py-3">SKU</th>
                        <th className="px-3 py-3">Offer Price (LKR)</th>
                        <th className="px-3 py-3">Old Price (LKR)</th>
                        <th className="px-3 py-3">Discount</th>
                        <th className="px-3 py-3 font-bold text-emerald-600">Stock Quantity</th>
                        <th className="px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {variantCombos.map((v, vIdx) => {
                        const vOldPrice = v.old_price || 0;
                        const vDiscountPct = vOldPrice > v.price ? Math.round(((vOldPrice - v.price) / vOldPrice) * 100) : 0;

                        return (
                          <tr key={v.id} className="hover:bg-gray-50/80 font-medium">
                            {hasColorVariants ? (
                              <td className="px-3 py-3 font-bold text-gray-900">
                                {colorVariants.length > 0 ? (
                                  <select
                                    value={v.color_name || colorVariants[0]?.name || ""}
                                    onChange={(e) => {
                                      const newColName = e.target.value;
                                      const matchedCol = colorVariants.find((c) => c.name === newColName);
                                      const updated = [...variantCombos];
                                      updated[vIdx].color_name = newColName;
                                      if (matchedCol) {
                                        updated[vIdx].color_id = matchedCol.id;
                                        updated[vIdx].color_hex = matchedCol.hex;
                                        updated[vIdx].image_ref = matchedCol.images?.[0] || matchedCol.cover_image || "";
                                      }
                                      setVariantCombos(updated);
                                      setHasUnsavedChanges(true);
                                    }}
                                    className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                                  >
                                    {colorVariants.map((c) => (
                                      <option key={c.id || c.name} value={c.name}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={v.color_name || ""}
                                    onChange={(e) => {
                                      const updated = [...variantCombos];
                                      updated[vIdx].color_name = e.target.value;
                                      setVariantCombos(updated);
                                      setHasUnsavedChanges(true);
                                    }}
                                    placeholder="Option name"
                                    className="w-28 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                                  />
                                )}
                              </td>
                            ) : (
                              <td className="px-3 py-3 font-bold text-gray-900">
                                <input
                                  type="text"
                                  value={v.color_name || ""}
                                  onChange={(e) => {
                                    const updated = [...variantCombos];
                                    updated[vIdx].color_name = e.target.value;
                                    setVariantCombos(updated);
                                    setHasUnsavedChanges(true);
                                  }}
                                  placeholder={productType === "laptop" ? "e.g. 14-inch" : productType === "phone" ? "e.g. Global Version" : "e.g. 1 Meter / 20W"}
                                  className="w-28 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                                />
                              </td>
                            )}

                            {hasStorageVariants && (
                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  value={v.ram || ""}
                                  onChange={(e) => {
                                    const updated = [...variantCombos];
                                    updated[vIdx].ram = e.target.value;
                                    setVariantCombos(updated);
                                  }}
                                  placeholder={productType === "laptop" ? "16GB" : "8GB"}
                                  className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                                />
                              </td>
                            )}

                            {hasStorageVariants && (
                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  value={v.storage || ""}
                                  onChange={(e) => {
                                    const updated = [...variantCombos];
                                    updated[vIdx].storage = e.target.value;
                                    setVariantCombos(updated);
                                  }}
                                  placeholder={productType === "laptop" ? "512GB SSD" : productType === "phone" ? "128GB" : "128GB"}
                                  className="w-24 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                                />
                              </td>
                            )}

                            {hasStorageVariants && productType === "phone" && (
                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  placeholder="Physical + eSIM"
                                  value={v.sim_type || ""}
                                  onChange={(e) => {
                                    const updated = [...variantCombos];
                                    updated[vIdx].sim_type = e.target.value;
                                    setVariantCombos(updated);
                                  }}
                                  className="w-32 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                                />
                              </td>
                            )}

                            <td className="px-3 py-3 font-mono">
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) => {
                                  const updated = [...variantCombos];
                                  updated[vIdx].sku = e.target.value;
                                  setVariantCombos(updated);
                                }}
                                className="w-28 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                              />
                            </td>
                            {/* Offer Price */}
                            <td className="px-3 py-3 font-mono">
                              <input
                                type="number"
                                value={v.price}
                                onChange={(e) => {
                                  const updated = [...variantCombos];
                                  updated[vIdx].price = Number(e.target.value);
                                  setVariantCombos(updated);
                                }}
                                className="w-24 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-black text-blue-600"
                              />
                            </td>
                            {/* Old Price */}
                            <td className="px-3 py-3 font-mono">
                              <input
                                type="number"
                                value={v.old_price || ""}
                                placeholder="Optional"
                                onChange={(e) => {
                                  const updated = [...variantCombos];
                                  updated[vIdx].old_price = Number(e.target.value) || null;
                                  setVariantCombos(updated);
                                }}
                                className="w-24 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-400 line-through"
                              />
                            </td>
                            {/* Discount % Badge */}
                            <td className="px-3 py-3 font-mono">
                              {vDiscountPct > 0 ? (
                                <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 font-black text-[10px] rounded-md">
                                  {vDiscountPct}% OFF
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[10px]">—</span>
                              )}
                            </td>
                            {/* Stock Quantity */}
                            <td className="px-3 py-3 font-mono">
                              <input
                                type="number"
                                min={0}
                                value={v.stock_quantity}
                                onChange={(e) => {
                                  const updated = [...variantCombos];
                                  const cnt = Number(e.target.value);
                                  updated[vIdx].stock_quantity = cnt;
                                  updated[vIdx].available_stock = Math.max(0, cnt - (updated[vIdx].reserved_stock || 0));
                                  setVariantCombos(updated);
                                }}
                                className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                              />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setVariantCombos(variantCombos.filter((item) => item.id !== v.id));
                                  setHasUnsavedChanges(true);
                                }}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto transition-colors cursor-pointer"
                                title="Delete variant row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 4: SPECIFICATIONS
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 4 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in">
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">Technical Specifications</h3>

              {/* Preset Shortcuts */}
              <div className="flex flex-wrap gap-2 text-xs">
                {DEFAULT_SPEC_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (!specRows.find((r) => r.key === key)) {
                        setSpecRows([...specRows, { key, value: "" }]);
                      }
                    }}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg"
                  >
                    + {key}
                  </button>
                ))}
              </div>

              {specRows.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                  <Cpu className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-bold text-gray-700">No specifications added yet</p>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                    Click any quick preset above (e.g. + Display, + Processor, + RAM) or click &quot;+ Add Specification Row&quot; to add technical specs.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {specRows.map((row, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Spec Key (e.g. Display)"
                        value={row.key}
                        onChange={(e) => {
                          const updated = [...specRows];
                          updated[idx].key = e.target.value;
                          setSpecRows(updated);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-36 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Spec Value (e.g. 6.7 inch AMOLED)"
                        value={row.value}
                        onChange={(e) => {
                          const updated = [...specRows];
                          updated[idx].value = e.target.value;
                          setSpecRows(updated);
                          setHasUnsavedChanges(true);
                        }}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSpecRows(specRows.filter((_, i) => i !== idx));
                          setHasUnsavedChanges(true);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSpecRows([...specRows, { key: "", value: "" }]);
                  setHasUnsavedChanges(true);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Specification Row
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 5: UNIFIED WARRANTY SYSTEM
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 5 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-gray-900">Warranty System</h3>
                  <p className="text-xs text-gray-500 mt-1">Configure multiple warranty plans for customers to select on the product page.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newW: WarrantyOption = {
                      id: `w-${Date.now()}`,
                      title: "New Warranty Plan",
                      type: "Shop Warranty",
                      duration_value: 6,
                      duration_unit: "months",
                      additional_price: 0,
                      coverage_details: "Hardware defect warranty from 1PLACE.LK.",
                      status: "active",
                      is_default: warrantyOptions.length === 0,
                    };
                    setWarrantyOptions([...warrantyOptions, newW]);
                    setHasUnsavedChanges(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Warranty Plan
                </button>
              </div>

              {/* Preset Quick Add Dropdown Bar */}
              <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-100 rounded-2xl p-4 space-y-2.5">
                <label className="block font-extrabold text-xs text-gray-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Quick Select Warranty Preset (30+ Official Sri Lankan Warranties):
                </label>
                <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
                  <select
                    value={selectedPresetWarranty}
                    onChange={(e) => setSelectedPresetWarranty(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 shadow-xs"
                  >
                    <option value="">-- Choose Official Warranty Preset --</option>
                    {PRESET_WARRANTIES.map((wTitle, idx) => (
                      <option key={idx} value={wTitle}>
                        {wTitle}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedPresetWarranty) return;
                      const newW: WarrantyOption = {
                        id: `w-${Date.now()}`,
                        title: selectedPresetWarranty,
                        type: selectedPresetWarranty.toLowerCase().includes("shop") || selectedPresetWarranty.toLowerCase().includes("checking")
                          ? "Shop Warranty"
                          : "Manufacturer Warranty",
                        duration_value: 1,
                        duration_unit: selectedPresetWarranty.toLowerCase().includes("month")
                          ? "months"
                          : "years",
                        additional_price: 0,
                        coverage_details: selectedPresetWarranty,
                        status: "active",
                        is_default: warrantyOptions.length === 0,
                      };
                      setWarrantyOptions([...warrantyOptions, newW]);
                      setSelectedPresetWarranty("");
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!selectedPresetWarranty}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Add Selected Warranty
                  </button>
                </div>
              </div>

              {/* Warranty Plans List */}
              <div className="space-y-4">
                {warrantyOptions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 border border-dashed border-gray-300 rounded-2xl">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-gray-600 text-xs">No warranty plans added yet.</p>
                    <p className="text-[11px] text-gray-400">Choose a preset from the dropdown above or click "+ Add Warranty Plan".</p>
                  </div>
                ) : (
                  warrantyOptions.map((w, wIdx) => (
                    <div key={w.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          <span className="font-extrabold text-gray-900">Warranty Plan #{wIdx + 1}</span>
                          {w.is_default && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Default Selection
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setWarrantyOptions(warrantyOptions.filter((item) => item.id !== w.id));
                            setHasUnsavedChanges(true);
                          }}
                          className="text-xs text-red-600 hover:underline font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
                        {/* Warranty Title - 2 Cols */}
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="block font-bold text-gray-700">Warranty Title *</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={PRESET_WARRANTIES.includes(w.title) ? w.title : "custom"}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val !== "custom") {
                                  const updated = [...warrantyOptions];
                                  updated[wIdx].title = val;
                                  setWarrantyOptions(updated);
                                  setHasUnsavedChanges(true);
                                }
                              }}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 shadow-xs"
                            >
                              <option value="custom">✍️ Type Custom Warranty Title</option>
                              {PRESET_WARRANTIES.map((pW, pIdx) => (
                                <option key={pIdx} value={pW}>
                                  {pW}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={w.title}
                              onChange={(e) => {
                                const updated = [...warrantyOptions];
                                updated[wIdx].title = e.target.value;
                                setWarrantyOptions(updated);
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="e.g. 1 Year ABANS Warranty"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 shadow-xs"
                            />
                          </div>
                        </div>

                        {/* Additional Charge - 1 Col */}
                        <div>
                          <label className="block font-bold text-gray-700 mb-1.5">Additional Charge (LKR)</label>
                          <input
                            type="number"
                            min={0}
                            value={w.additional_price}
                            onChange={(e) => {
                              const updated = [...warrantyOptions];
                              updated[wIdx].additional_price = Number(e.target.value);
                              setWarrantyOptions(updated);
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="0 (Free)"
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-blue-600 font-mono outline-none focus:border-blue-500 shadow-xs"
                          />
                        </div>
                      </div>

                      {/* Coverage Details & Default Checkbox */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end pt-1">
                        <div className="md:col-span-2">
                          <label className="block font-bold text-gray-700 mb-1">Coverage Details / Notes</label>
                          <input
                            type="text"
                            value={w.coverage_details || ""}
                            onChange={(e) => {
                              const updated = [...warrantyOptions];
                              updated[wIdx].coverage_details = e.target.value;
                              setWarrantyOptions(updated);
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="e.g. Hardware defect warranty covered by 1PLACE.LK flagship store."
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 outline-none focus:border-blue-500 shadow-xs"
                          />
                        </div>

                        <div className="flex items-center h-10">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={w.is_default || false}
                              onChange={(e) => {
                                const updated = warrantyOptions.map((item, i) => ({
                                  ...item,
                                  is_default: i === wIdx ? e.target.checked : false,
                                }));
                                setWarrantyOptions(updated);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="font-bold text-gray-900 text-xs">Set as Default Selection</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 6: PAYMENTS & DELIVERY
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 6 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in">
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">Payment Options & Delivery</h3>

              <div className="space-y-3 text-xs">
                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCod}
                    onChange={(e) => setAllowCod(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-gray-900">Allow Cash on Delivery (COD)</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCard}
                    onChange={(e) => setAllowCard(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-gray-900">Allow Card Payment (PayHere Online)</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowWhatsapp}
                    onChange={(e) => setAllowWhatsapp(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-gray-900">Allow Direct WhatsApp Ordering</span>
                </label>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 7: SEO & PUBLISHING
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 7 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in">
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">SEO & Publishing Settings</h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Custom SEO Title Tag</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => {
                      setMetaTitle(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder={name || "1PLACE.LK - Premium Electronics"}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900 outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Leaves default product name if empty, or type custom text to override.</p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Meta Description</label>
                  <textarea
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => {
                      setMetaDescription(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder={shortDesc || "Short SEO snippet for Google search..."}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 outline-none focus:border-blue-500 resize-none text-xs"
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>
    </div>
  );
}
