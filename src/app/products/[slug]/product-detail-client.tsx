"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Award,
  Truck,
  ChevronRight,
  ChevronDown,
  Check,
  ShoppingBag,
  Heart,
  Star,
  Minus,
  Plus,
  ArrowRight,
  ArrowLeft,
  Banknote,
  CreditCard,
  MessageCircle,
  CircleCheck as Sparkles,
  Calendar,
  Store,
} from "lucide-react";
import { formatPrice, isPhoneProduct } from "@/lib/utils";
import { BUSINESS_INFO } from "@/lib/business-info";
import ProductGallery from "./product-gallery";
import CompatibleAccessories from "@/components/products/CompatibleAccessories";
import SameBrandProducts from "@/components/products/SameBrandProducts";
import PreOrderModal from "@/components/products/PreOrderModal";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useAuth } from "@/lib/auth-context";
import { getColorCSS, isLightColor } from "@/lib/color-utils";
import { usePurchaseGuard } from "@/lib/use-purchase-guard";
import { Product, ProductColor, ProductVariantCombo, WarrantyOption } from "@/lib/types";
import { detectProductBrand } from "@/components/products/ShopFilterSidebar";
import { isPhoneSegment, isLaptopTabletSegment } from "@/lib/catalog-utils";

interface NormalizedVariant {
  id: string;
  color: string;
  colorObj: ProductColor;
  storage: string;
  ram?: string;
  sim_type?: string;
  price: number;
  old_price?: number | null;
  stock: number;
  sku: string;
  image?: string;
  gallery: string[];
  warranty?: string;
  status: "active" | "inactive";
}

export default function ProductDetailClient({
  product,
  allProducts = [],
}: {
  product: Product;
  allProducts?: Product[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { handleAuthenticatedPurchase } = usePurchaseGuard();

  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  // Pre-Order Modal State for out-of-stock devices
  const [isPreOrderOpen, setIsPreOrderOpen] = useState(false);

  // Check if product belongs to Mobile or Laptop category
  const isMobileOrLaptop = useMemo(() => {
    const cat = (product.category_name || product.categoryName || product.category_slug || product.categorySlug || product.category_id || "").toLowerCase();
    const name = (product.name || "").toLowerCase();
    const type = product.productType;
    return (
      type === "phone" ||
      cat.includes("phone") ||
      cat.includes("mobile") ||
      cat.includes("smartphone") ||
      cat.includes("laptop") ||
      cat.includes("macbook") ||
      cat.includes("ipad") ||
      cat.includes("tablet") ||
      name.includes("iphone") ||
      name.includes("galaxy") ||
      name.includes("macbook") ||
      name.includes("pixel") ||
      name.includes("xiaomi") ||
      name.includes("redmi") ||
      Boolean(product.hasStorageVariants)
    );
  }, [product]);

  // Comprehensive check for pre-order / pre-booking support
  const isPreOrderAvailable = useMemo(() => {
    return Boolean(
      (product as any).is_preorder ||
      (product as any).pre_order ||
      (product as any).pre_booking ||
      product.stock_status === "pre_order" ||
      isMobileOrLaptop
    );
  }, [product, isMobileOrLaptop]);

  // 1. Color Variants
  const colorVariants: ProductColor[] = useMemo(() => {
    if (product.hasColorVariants === false) return [];
    const isInvalidColorName = (name: string): boolean => {
      if (!name || typeof name !== "string") return true;
      const clean = name.trim().toLowerCase();
      if (!clean) return true;
      return (
        clean === "standard" ||
        clean === "default" ||
        clean === "standard black" ||
        clean === "option 1" ||
        clean === "none" ||
        clean === "n/a" ||
        clean === "na" ||
        clean === "null" ||
        clean === "undefined" ||
        clean === "no color" ||
        clean === "single"
      );
    };

    if (product.color_variants && product.color_variants.length > 0) {
      return product.color_variants
        .filter((cv: any) => !isInvalidColorName(cv?.name || cv?.color || ""))
        .map((cv, i) => {
          const name = (cv.name || (cv as any).color || `Color ${i + 1}`).trim();
          const hex = cv.hex && cv.hex.startsWith("#") ? cv.hex : getColorCSS(name);
          return {
            ...cv,
            id: cv.id || `c-${i}`,
            name,
            hex,
            images: cv.images && cv.images.length > 0 ? cv.images : product.images || [],
          };
        });
    }
    if (product.colors && product.colors.length > 0) {
      return product.colors
        .filter((c: any) => !isInvalidColorName(typeof c === "string" ? c : (c as any)?.name || ""))
        .map((c, i) => {
          const name = (typeof c === "string" ? c : (c as any)?.name || `Color ${i + 1}`).trim();
          const hex = typeof c === "string" ? getColorCSS(c) : ((c as any)?.hex || getColorCSS(name));
          return {
            id: `c-${i}`,
            name,
            hex,
            images: product.images || [],
          };
        });
    }
    return [];
  }, [product]);

  // Helper: Safely resolve stock from combo or base product
  const resolveStock = (rawStock: any): number => {
    if ((product.stock_status as string) === "out_of_stock") return 0;
    if (rawStock !== undefined && rawStock !== null && rawStock !== "") {
      const parsed = Number(rawStock);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    const pStock = product.stock_count ?? product.stock_quantity ?? ((product.stock_status as string) === "out_of_stock" ? 0 : 10);
    return Math.max(0, Number(pStock) || 0);
  };

  // 2. Normalized Product Variants (Single Source of Truth)
  const normalizedVariants: NormalizedVariant[] = useMemo(() => {
    const list: NormalizedVariant[] = [];

    if (colorVariants.length === 0) {
      if (product.variant_combos && product.variant_combos.length > 0) {
        product.variant_combos.forEach((combo, idx) => {
          const validPrice = (combo.price && Number(combo.price) > 0) ? Number(combo.price) : (product.price || 0);
          const validOldPrice = (combo.old_price && Number(combo.old_price) > 0) ? Number(combo.old_price) : (product.old_price || null);
          const rawStock = combo.stock_quantity ?? (combo as any).available_stock ?? (combo as any).stock;
          const comboStock = (combo.status === "inactive" || (combo as any).status === "out_of_stock") ? 0 : resolveStock(rawStock);

          list.push({
            id: combo.id || `v-${idx}`,
            color: "",
            colorObj: { id: "c-0", name: "", hex: "", images: product.images || [] },
            storage: combo.storage || combo.ram || "Standard",
            ram: combo.ram,
            sim_type: combo.sim_type,
            price: validPrice,
            old_price: validOldPrice,
            stock: comboStock,
            sku: combo.sku || product.code || product.slug,
            image: combo.image_ref || product.images?.[0],
            gallery: product.images || [],
            warranty: combo.warranty,
            status: combo.status || "active",
          });
        });
      } else if (product.storage_options && product.storage_options.length > 0) {
        product.storage_options.forEach((st) => {
          list.push({
            id: `v-${st}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            color: "",
            colorObj: { id: "c-0", name: "", hex: "", images: product.images || [] },
            storage: st,
            price: (product.storage_prices && product.storage_prices[st]) || product.price,
            old_price: product.old_price,
            stock: resolveStock(product.stock_count ?? product.stock_quantity),
            sku: product.code ? `${product.code}-${st}` : `${product.slug}-${st.toLowerCase()}`,
            image: product.images?.[0],
            gallery: product.images || [],
            status: "active",
          });
        });
      } else {
        list.push({
          id: `v-default`,
          color: "",
          colorObj: { id: "c-0", name: "", hex: "", images: product.images || [] },
          storage: "Standard",
          price: product.price || 0,
          old_price: product.old_price || null,
          stock: resolveStock(product.stock_count ?? product.stock_quantity),
          sku: product.code || product.slug,
          image: product.images?.[0],
          gallery: product.images || [],
          status: "active",
        });
      }
      return list;
    }

    if (product.variant_combos && product.variant_combos.length > 0) {
      product.variant_combos.forEach((combo, idx) => {
        const matchedColor = colorVariants.find(
          (c) => c.name === combo.color_name || c.id === combo.color_id
        );

        const validPrice = (combo.price && Number(combo.price) > 0) ? Number(combo.price) : (product.price || 0);
        const validOldPrice = (combo.old_price && Number(combo.old_price) > 0) ? Number(combo.old_price) : (product.old_price || null);
        const rawStock = combo.stock_quantity ?? (combo as any).available_stock ?? (combo as any).stock;
        const comboStock = (combo.status === "inactive" || (combo as any).status === "out_of_stock") ? 0 : resolveStock(rawStock);

        if (matchedColor) {
          list.push({
            id: combo.id || `v-${idx}`,
            color: matchedColor.name,
            colorObj: matchedColor,
            storage: combo.storage || combo.ram || "Standard",
            ram: combo.ram,
            sim_type: combo.sim_type,
            price: validPrice,
            old_price: validOldPrice,
            stock: comboStock,
            sku: combo.sku || product.code || product.slug,
            image: combo.image_ref || matchedColor.cover_image || matchedColor.images?.[0] || product.images?.[0],
            gallery: matchedColor.images?.length > 0 ? matchedColor.images : (product.images || []),
            warranty: combo.warranty,
            status: combo.status || "active",
          });
        } else {
          // If combo does not specify color, map to all colors
          colorVariants.forEach((c) => {
            list.push({
              id: `${combo.id || idx}-${c.name}`.toLowerCase(),
              color: c.name,
              colorObj: c,
              storage: combo.storage || combo.ram || "Standard",
              ram: combo.ram,
              sim_type: combo.sim_type,
              price: validPrice,
              old_price: validOldPrice,
              stock: comboStock,
              sku: combo.sku || product.code || product.slug,
              image: combo.image_ref || c.cover_image || c.images?.[0] || product.images?.[0],
              gallery: c.images?.length > 0 ? c.images : (product.images || []),
              warranty: combo.warranty,
              status: combo.status || "active",
            });
          });
        }
      });
    } else if (product.storage_options && product.storage_options.length > 0) {
      colorVariants.forEach((c) => {
        product.storage_options.forEach((st) => {
          list.push({
            id: `v-${c.name}-${st}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            color: c.name,
            colorObj: c,
            storage: st,
            price: (product.storage_prices && product.storage_prices[st]) || product.price,
            old_price: product.old_price,
            stock: resolveStock(product.stock_count ?? product.stock_quantity),
            sku: product.code ? `${product.code}-${st}` : `${product.slug}-${c.name.toLowerCase()}-${st.toLowerCase()}`,
            image: c.cover_image || c.images?.[0] || product.images?.[0],
            gallery: c.images?.length > 0 ? c.images : (product.images || []),
            status: "active",
          });
        });
      });
    } else {
      colorVariants.forEach((c) => {
        list.push({
          id: `v-${c.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          color: c.name,
          colorObj: c,
          storage: "Standard",
          price: product.price,
          old_price: product.old_price,
          stock: resolveStock(product.stock_count ?? product.stock_quantity),
          sku: product.code || product.slug,
          image: c.cover_image || c.images?.[0] || product.images?.[0],
          gallery: c.images?.length > 0 ? c.images : (product.images || []),
          status: "active",
        });
      });
    }

    return list;
  }, [product, colorVariants]);

  // ── Master Image Aggregator: collects base product images + ALL color variant images + ALL combo images ──
  const allMasterImages = useMemo(() => {
    const list: string[] = [];

    // 1. Base product images
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (img && typeof img === "string" && !list.includes(img)) list.push(img);
      });
    }

    // 2. Color variants images & cover_image
    if (product.color_variants && Array.isArray(product.color_variants)) {
      product.color_variants.forEach((cv) => {
        if (cv.cover_image && !list.includes(cv.cover_image)) list.push(cv.cover_image);
        if (cv.images && Array.isArray(cv.images)) {
          cv.images.forEach((img) => {
            if (img && !list.includes(img)) list.push(img);
          });
        }
      });
    }

    // 3. Variant combos images
    if (product.variant_combos && Array.isArray(product.variant_combos)) {
      product.variant_combos.forEach((cb) => {
        if (cb.image_ref && !list.includes(cb.image_ref)) list.push(cb.image_ref);
      });
    }

    return list.length > 0
      ? list
      : ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop"];
  }, [product]);

  // Detected Brand Name (e.g. "Apple", "Samsung", "Xiaomi", "Google", etc.)
  const detectedBrand = useMemo(() => {
    const b = detectProductBrand(product);
    return b && b !== "Other" ? b : (product.brand_name || product.brand || "");
  }, [product]);

  // User Chosen Color State & Gallery Selected Index
  const [hasUserChosenColor, setHasUserChosenColor] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number>(0);

  const handleSelectColor = (colorName: string) => {
    if (hasUserChosenColor && selectedColor.toLowerCase() === colorName.toLowerCase()) {
      // Toggle back to default view
      setHasUserChosenColor(false);
      setSelectedColor("");
    } else {
      setSelectedColor(colorName);
      setHasUserChosenColor(true);

      // Find the corresponding image for this color and jump to it in the gallery!
      const targetColor = colorVariants.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
      const targetImg = targetColor?.cover_image || targetColor?.images?.[0];
      if (targetImg) {
        const foundIdx = allMasterImages.indexOf(targetImg);
        if (foundIdx >= 0) {
          setSelectedGalleryIndex(foundIdx);
        }
      }
    }
  };

  const handleResetToAllPhotos = () => {
    setHasUserChosenColor(false);
    setSelectedColor("");
    setSelectedGalleryIndex(0);
  };

  const handleGalleryThumbnailSelect = (index: number) => {
    setSelectedGalleryIndex(index);
    const selectedImg = allMasterImages[index];
    if (selectedImg && colorVariants.length > 0) {
      const matchedColor = colorVariants.find((cv) =>
        cv.cover_image === selectedImg || (cv.images && cv.images.includes(selectedImg))
      );
      if (matchedColor) {
        setSelectedColor(matchedColor.name);
        setHasUserChosenColor(true);
      }
    }
  };

  // Active Color Object (only active if user chose a color)
  const selectedColorObj = useMemo(() => {
    if (!hasUserChosenColor || !selectedColor || colorVariants.length === 0) return null;
    return (
      colorVariants.find((c) => c.name.toLowerCase() === selectedColor.toLowerCase()) ||
      null
    );
  }, [colorVariants, selectedColor, hasUserChosenColor]);

  // Available variants for current selected color ONLY (or all if no color chosen)
  const availableVariantsForColor = useMemo(() => {
    if (!hasUserChosenColor || !selectedColor || colorVariants.length === 0) {
      return normalizedVariants.filter((v) => v.status !== "inactive");
    }
    return normalizedVariants.filter(
      (v) => v.color.toLowerCase() === selectedColor.toLowerCase() && v.status !== "inactive"
    );
  }, [normalizedVariants, selectedColor, colorVariants, hasUserChosenColor]);

  // Selected Variant Option (Tracked by unique Variant ID)
  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    const firstInStock = availableVariantsForColor.find((v) => v.stock > 0);
    return firstInStock?.id || availableVariantsForColor[0]?.id || "";
  });

  // Dropdown Open State & Focus Management
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // 3. RESET INVALID VARIANT WHEN COLOR CHANGES
  useEffect(() => {
    if (!selectedColor || availableVariantsForColor.length === 0) {
      setSelectedVariantId("");
      return;
    }

    const variantStillValid = availableVariantsForColor.some(
      (v) => v.id === selectedVariantId
    );

    if (!variantStillValid) {
      const firstInStock = availableVariantsForColor.find((v) => v.stock > 0);
      const targetId = firstInStock?.id || availableVariantsForColor[0]?.id || "";
      setSelectedVariantId(targetId);
    }

    // Always close storage dropdown when changing color
    setIsStorageOpen(false);
    setFocusedIndex(-1);
  }, [selectedColor, availableVariantsForColor]);

  // RESET DROPDOWN STATE ON ROUTE/PRODUCT CHANGE
  useEffect(() => {
    setIsStorageOpen(false);
    setFocusedIndex(-1);
  }, [product.id, product.slug]);

  // OUTSIDE CLICK & ESCAPE KEY DISMISSAL
  useEffect(() => {
    if (!isStorageOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target as Node)
      ) {
        setIsStorageOpen(false);
        setFocusedIndex(-1);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsStorageOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isStorageOpen]);

  // DERIVE SELECTED VARIANT (Single Source of Truth)
  const selectedVariant = useMemo(() => {
    if (availableVariantsForColor.length === 0) return null;
    const exactMatch = availableVariantsForColor.find(
      (v) => v.id === selectedVariantId
    );
    if (exactMatch) return exactMatch;
    return availableVariantsForColor.find((v) => v.stock > 0) || availableVariantsForColor[0] || null;
  }, [availableVariantsForColor, selectedVariantId]);

  // Quantity & Tab States
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "warranty">("description");
  const [added, setAdded] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  // Warranty Options (Only valid user-added warranties)
  const availableWarranties = useMemo(() => {
    if (product.warranty_options && product.warranty_options.length > 0) {
      return product.warranty_options.filter(
        (w) =>
          w.status !== "inactive" &&
          w.title &&
          w.title.trim() !== "" &&
          w.title.toLowerCase() !== "none" &&
          w.title.toLowerCase() !== "no warranty"
      );
    }
    return [];
  }, [product]);

  const hasShopWarranty = Boolean(
    availableWarranties.length === 0 &&
    product.warranty &&
    product.warranty.trim() !== "" &&
    product.warranty.toLowerCase() !== "none" &&
    product.warranty.toLowerCase() !== "no warranty"
  );

  const hasBrandWarranty = Boolean(
    availableWarranties.length === 0 &&
    product.brand_warranty &&
    product.brand_warranty.trim() !== "" &&
    product.brand_warranty.toLowerCase() !== "none" &&
    product.brand_warranty.toLowerCase() !== "no warranty"
  );

  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyOption | null>(
    availableWarranties.find((w) => w.is_default) || availableWarranties[0] || null
  );

  // Dynamic Pricing, Stock, SKU & Out-of-Stock Computation
  const warrantyPrice = selectedWarranty ? selectedWarranty.additional_price : 0;
  const currentVariantPrice = (selectedVariant ? selectedVariant.price : product.price) + warrantyPrice;
  const isPriced = typeof currentVariantPrice === "number" && currentVariantPrice > 0;
  const currentVariantOldPrice = selectedVariant?.old_price ?? product.old_price;

  const currentSku = selectedVariant?.sku || product.code || product.slug;
  const currentStock = useMemo(() => {
    if (product.stock_status === "out_of_stock") return 0;
    if (normalizedVariants.length > 0) {
      if (hasUserChosenColor && selectedColor) {
        if (availableVariantsForColor.length === 0) {
          return 0; // The chosen color is not available in inventory
        }
        return selectedVariant ? selectedVariant.stock : 0;
      }
      return selectedVariant ? selectedVariant.stock : 0;
    }
    const rawPStock = product.stock_count ?? product.stock_quantity;
    return rawPStock !== undefined && rawPStock !== null ? resolveStock(rawPStock) : 0;
  }, [product, normalizedVariants, hasUserChosenColor, selectedColor, availableVariantsForColor, selectedVariant]);

  const isVariantOutOfStock = currentStock <= 0 || product.stock_status === "out_of_stock" || (hasUserChosenColor && Boolean(selectedColor) && availableVariantsForColor.length === 0 && normalizedVariants.length > 0);

  const discountPercent =
    Boolean(currentVariantOldPrice) &&
    typeof currentVariantOldPrice === "number" &&
    typeof currentVariantPrice === "number" &&
    currentVariantOldPrice > currentVariantPrice &&
    Math.round(((currentVariantOldPrice - currentVariantPrice) / currentVariantOldPrice) * 100) > 0
      ? Math.round(((currentVariantOldPrice - currentVariantPrice) / currentVariantOldPrice) * 100)
      : 0;

  // Auto-open pre-order modal if ?book=true is in URL
  useEffect(() => {
    if (searchParams && searchParams.get("book") === "true" && isVariantOutOfStock && isPreOrderAvailable) {
      setIsPreOrderOpen(true);
    }
  }, [searchParams, isVariantOutOfStock, isPreOrderAvailable]);

  // Auto-clamp quantity if variant stock decreases below chosen quantity
  useEffect(() => {
    if (currentStock > 0 && quantity > currentStock) {
      setQuantity(currentStock);
    }
  }, [currentStock, quantity]);

  const handleQuantityChange = (delta: number) => {
    if (isVariantOutOfStock || currentStock <= 0) {
      setQuantity(1);
      return;
    }
    setQuantity((prev) => {
      const maxAllowed = Math.max(1, currentStock);
      const nextVal = prev + delta;
      return Math.max(1, Math.min(maxAllowed, nextVal));
    });
  };

  const currentActiveImage = allMasterImages[selectedGalleryIndex] || product.images?.[0] || "";

  const handleAddToCart = () => {
    if (!isPriced || isVariantOutOfStock || !selectedVariant || currentStock <= 0) return;

    const finalColor = selectedVariant?.color || (hasUserChosenColor ? selectedColor : (colorVariants[0]?.name || ""));
    const finalQty = Math.min(currentStock, Math.max(1, quantity));

    handleAuthenticatedPurchase({
      action: "add-to-cart",
      product: {
        ...product,
        price: currentVariantPrice,
      },
      variantId: selectedVariant.id,
      color: finalColor,
      storage: selectedVariant.storage,
      ram: selectedVariant.ram,
      quantity: finalQty,
      maxStock: currentStock,
      image: currentActiveImage,
      warrantyTitle: selectedWarranty?.title || product.warranty,
      warrantyPrice: selectedWarranty?.additional_price || 0,
      onSuccess: () => {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        // Automatically open the Shopping Bag drawer on add to bag
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("open-cart-drawer"));
        }
      },
    });
  };

  const handleBuyNow = () => {
    if (!isPriced || isVariantOutOfStock || !selectedVariant || currentStock <= 0) return;

    const finalColor = selectedVariant?.color || (hasUserChosenColor ? selectedColor : (colorVariants[0]?.name || ""));
    const finalQty = Math.min(currentStock, Math.max(1, quantity));

    handleAuthenticatedPurchase({
      action: "buy-now",
      product: {
        ...product,
        price: currentVariantPrice,
      },
      variantId: selectedVariant.id,
      color: finalColor,
      storage: selectedVariant.storage,
      ram: selectedVariant.ram,
      quantity: finalQty,
      maxStock: currentStock,
      image: currentActiveImage,
      warrantyTitle: selectedWarranty?.title || product.warranty,
      warrantyPrice: selectedWarranty?.additional_price || 0,
    });
  };

  // Keyboard navigation inside storage dropdown options
  const handleOptionKeyDown = (
    e: React.KeyboardEvent,
    index: number,
    variantId: string,
    isDisabled: boolean
  ) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (index + 1) % availableVariantsForColor.length;
      setFocusedIndex(nextIdx);
      optionsRef.current[nextIdx]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = (index - 1 + availableVariantsForColor.length) % availableVariantsForColor.length;
      setFocusedIndex(prevIdx);
      optionsRef.current[prevIdx]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isDisabled) {
        setSelectedVariantId(variantId);
        setIsStorageOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Tab") {
      setIsStorageOpen(false);
      setFocusedIndex(-1);
    }
  };

  const selectedStorageVariant = selectedVariant || availableVariantsForColor[0];

  const handleBack = () => {
    if (typeof window !== "undefined") {
      // If user came from within the site, native back pops the stack cleanly
      if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
        router.back();
        return;
      }

      // If user opened directly or refreshed, use last browse location without adding duplicate history
      const lastBrowse = sessionStorage.getItem("last_browse_page");
      if (lastBrowse && !lastBrowse.includes(product.slug)) {
        router.replace(lastBrowse);
        return;
      }
    }
    
    // Fallback: If this is an Apple / Samsung / etc product, return directly to its department brand page
    if (product.brand_slug || product.brand_name || product.brand) {
      const brandSlug = product.brand_slug || product.brandSlug || (product.brand_name || product.brand || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const dept = isPhoneSegment(product) ? "phones" : isLaptopTabletSegment(product) ? "laptops-tablets" : "accessories";
      router.replace(`/shop-by-brand/${dept}/${brandSlug}`);
      return;
    }

    router.replace("/products");
  };

  return (
    <div className="premium-product-detail bg-white min-h-screen text-black pb-32 sm:pb-36 w-full max-w-full overflow-x-hidden">
      {/* ── 1. Top Breadcrumbs with Functional Back Button ── */}
      <div className="hidden border-b border-[#EAEAEA] bg-white sm:block">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 sm:py-3.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition-all shrink-0 cursor-pointer mr-1 active:scale-95 shadow-2xs"
              title="Go back to previous page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <Link href="/" className="hover:text-black transition-colors shrink-0">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <Link
              href={`/category/${product.category_slug || product.categorySlug || product.category_id || "smartphones"}`}
              className="hover:text-black transition-colors shrink-0"
            >
              {product.category_name || product.categoryName || "Category"}
            </Link>
            {(product.brand_name || product.brandName || product.brand) && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <Link
                  href={`/shop-by-brand/${isPhoneSegment(product) ? "phones" : isLaptopTabletSegment(product) ? "laptops-tablets" : "accessories"}/${product.brand_slug || product.brandSlug || (product.brand_name || product.brand || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className="hover:text-black transition-colors shrink-0 font-semibold"
                >
                  {product.brand_name || product.brandName || product.brand}
                </Link>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-black font-semibold truncate max-w-[200px] sm:max-w-none">{product.name}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Main Product Section ── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-3 sm:pt-10">
        
        {/* ── Mobile Product Title Header (Shown only on screens < 1024px above Gallery) ── */}
        <div className="lg:hidden mb-4">
          {/* Mobile Product Title (Styled heading, avoids duplicate H1) */}
          <p className="text-xl sm:text-2xl font-extrabold text-black tracking-tight mb-2 leading-tight">
            {product.name}
          </p>

          <div className="flex items-center flex-wrap gap-3 text-xs">
            {product.rating ? (
              <div className="flex items-center gap-1 text-black font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>{product.rating}</span>
                {Boolean(product.review_count || product.reviews_count) && (
                  <span className="text-neutral-400 font-normal">
                    ({product.review_count || product.reviews_count} reviews)
                  </span>
                )}
              </div>
            ) : null}

            <div className="flex items-center gap-1.5 font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isVariantOutOfStock
                    ? isMobileOrLaptop
                      ? "bg-amber-500 animate-pulse"
                      : "bg-red-500"
                    : "bg-emerald-500"
                }`}
              />
              <span
                className={`text-[11px] ${
                  isVariantOutOfStock
                    ? isMobileOrLaptop
                      ? "text-amber-700 font-bold"
                      : "text-red-600 font-bold"
                    : "text-emerald-700 font-bold"
                }`}
              >
                {isVariantOutOfStock
                  ? isMobileOrLaptop
                    ? "Out of Stock — Pre-Booking Available"
                    : "Out of Stock"
                  : "In Stock & Ready to Ship"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-start w-full min-w-0 max-w-full">
          
          {/* Left Column: Image Gallery (Shows ALL uploaded photos & syncs with color selection) */}
          <div className="premium-product-gallery lg:col-span-6 w-full min-w-0 max-w-full">
            <ProductGallery
              images={allMasterImages}
              name={product.name}
              discount={discountPercent}
              video_url={product.video_url}
              selectedIndex={selectedGalleryIndex}
              onSelectIndex={handleGalleryThumbnailSelect}
            />
          </div>

          {/* Right Column: Information & Linked Variant Controls */}
          <div className="lg:col-span-6 w-full min-w-0 max-w-full flex flex-col justify-between">
            <div className="w-full min-w-0 max-w-full">
              {/* Desktop Category, Brand Link & SKU */}
              <div className="hidden lg:flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-[11px] font-bold text-gray-700 uppercase tracking-widest">
                    {product.category_name || "Smartphones"}
                  </span>
                  {detectedBrand && detectedBrand !== "Other" && (
                    <Link
                      href={`/products?brand=${encodeURIComponent(detectedBrand)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black hover:bg-neutral-800 text-white text-[11px] font-bold transition-all shadow-xs shrink-0 group cursor-pointer"
                      title={`See all ${detectedBrand} products`}
                    >
                      <span>See all {detectedBrand} products</span>
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Desktop Title */}
              <h1 className="hidden lg:block text-3xl lg:text-4xl font-extrabold text-black tracking-tight mb-3 leading-snug break-words">
                {product.name}
              </h1>

              {/* Desktop Rating & Stock Status */}
              <div className="hidden lg:flex items-center flex-wrap gap-4 mb-5 pb-5 border-b border-[#EAEAEA]">
                {product.rating ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-black">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      <Star className="w-4 h-4 fill-amber-400" />
                    </div>
                    <span className="font-bold">{product.rating}</span>
                    {Boolean(product.review_count || product.reviews_count) && (
                      <span className="text-gray-400 font-normal">
                        ({product.review_count || product.reviews_count} verified reviews)
                      </span>
                    )}
                  </div>
                ) : null}

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isVariantOutOfStock
                        ? isPreOrderAvailable
                          ? "bg-amber-500 animate-pulse"
                          : "bg-red-500"
                        : "bg-emerald-500"
                    }`}
                  />
                  <span className={isVariantOutOfStock ? (isPreOrderAvailable ? "text-amber-700 font-bold" : "text-red-600 font-bold") : "text-emerald-700 font-bold"}>
                    {isVariantOutOfStock
                      ? isPreOrderAvailable
                        ? "Out of Stock — Available for Pre-Booking"
                        : "Out of Stock"
                      : (!isPriced ? "In Catalog · Pricing Pending Confirmation" : "In Stock & Ready to Ship")}
                  </span>
                </div>
              </div>

              {/* Price Display (Fully responsive flex-wrap) */}
              <div className="flex items-baseline flex-wrap gap-2.5 sm:gap-3 mb-4 sm:mb-6 w-full min-w-0 max-w-full">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black text-black tracking-tight shrink-0">
                  {isPriced ? formatPrice(currentVariantPrice) : "Price Coming Soon"}
                </span>
                {currentVariantOldPrice && currentVariantOldPrice > currentVariantPrice && (
                  <span className="text-base sm:text-lg text-gray-400 line-through font-medium shrink-0">
                    {formatPrice(currentVariantOldPrice)}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-[11px] sm:text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 sm:py-1 rounded-md shrink-0">
                    SAVE {discountPercent}%
                  </span>
                )}
              </div>

              {/* Product Description (Full natural text wrap, no horizontal cutoff) */}
              {product.description && (
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6 w-full max-w-full min-w-0 break-words [overflow-wrap:anywhere]">
                  {product.description}
                </p>
              )}

              {/* ── Warranty Badges (Only shown if admin configured warranty) ── */}
              {(availableWarranties.length > 0 || hasShopWarranty || hasBrandWarranty) && (
                <div className="space-y-2 mb-6 w-full min-w-0 max-w-full">
                  {availableWarranties.length > 0 ? (
                    availableWarranties.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm font-bold text-black bg-[#FAFAFA] border border-[#EAEAEA] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl w-full min-w-0 max-w-full"
                      >
                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 break-words">
                          <span className="block leading-snug">Warranty: <strong className="font-extrabold text-black">{w.title}</strong></span>
                          {w.coverage_details && (
                            <span className="block text-[11px] text-gray-500 font-normal mt-0.5 leading-snug">{w.coverage_details}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {hasShopWarranty && (
                        <div className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm font-bold text-black bg-[#FAFAFA] border border-[#EAEAEA] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl w-full min-w-0 max-w-full">
                          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1 break-words">
                            <span className="block leading-snug">Warranty: <strong className="font-extrabold text-black">{product.warranty}</strong></span>
                            <span className="block text-[11px] text-gray-500 font-normal mt-0.5 leading-snug">Hardware defect warranty from 1PLACE.LK flagship store.</span>
                          </div>
                        </div>
                      )}

                      {hasBrandWarranty && (
                        <div className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm font-bold text-black bg-[#FAFAFA] border border-[#EAEAEA] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl w-full min-w-0 max-w-full">
                          <Award className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1 break-words">
                            <span className="block leading-snug">Brand Warranty: <strong className="font-extrabold text-black">{product.brand_warranty}</strong></span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── 1. COLOUR SELECTOR (Responsive heading & swatches) ── */}
              {colorVariants.length > 0 && (
                <div className="mb-6 w-full min-w-0 max-w-full">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 w-full min-w-0 max-w-full">
                    <label className="text-xs font-bold text-black uppercase tracking-wider min-w-0 break-words">
                      Colour:{" "}
                      <span className="font-semibold text-neutral-800">
                        {hasUserChosenColor ? selectedColor : "Overview (Select a color to preview)"}
                      </span>
                    </label>

                    {hasUserChosenColor && (
                      <button
                        type="button"
                        onClick={handleResetToAllPhotos}
                        className="text-[11px] font-bold text-neutral-500 hover:text-black underline cursor-pointer shrink-0"
                      >
                        View All Photos
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5 sm:gap-3 w-full min-w-0 max-w-full">
                    {colorVariants.map((c) => {
                      const isSelected = hasUserChosenColor && selectedColor.toLowerCase() === c.name.toLowerCase();
                      const hexColor = c.hex && c.hex.startsWith("#") ? c.hex : getColorCSS(c.name);
                      const light = isLightColor(hexColor);

                      const colorVariantsList = normalizedVariants.filter(
                        (v) => v.color.toLowerCase() === c.name.toLowerCase() && v.status !== "inactive"
                      );
                      const colorTotalStock = colorVariantsList.length > 0
                        ? colorVariantsList.reduce((sum, v) => sum + v.stock, 0)
                        : (product.stock_status === "out_of_stock" ? 0 : 10);
                      const isColorOutOfStock = colorTotalStock <= 0;

                      return (
                        <button
                          key={c.id || c.name}
                          type="button"
                          onClick={() => handleSelectColor(c.name)}
                          aria-label={c.name}
                          title={`${c.name}${isColorOutOfStock ? " (Out of Stock)" : ""}${isSelected ? " (Selected - click again to reset)" : ""}`}
                          className={`w-9 h-9 rounded-full relative flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? "ring-2 ring-black ring-offset-2 scale-110 shadow-sm"
                              : isColorOutOfStock
                              ? "border border-neutral-300 opacity-60 hover:opacity-100"
                              : "border border-neutral-300 hover:scale-105 hover:border-neutral-400"
                          }`}
                          style={{ backgroundColor: hexColor }}
                        >
                          {isSelected && (
                            <Check className={`w-3.5 h-3.5 ${light ? "text-black stroke-[3]" : "text-white stroke-[3]"}`} />
                          )}
                          {isColorOutOfStock && !isSelected && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" title="Out of stock" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── 2. DYNAMIC STORAGE DROPDOWN (ONLY SHOWN FOR PHONES / LAPTOPS WITH REAL STORAGE VARIANTS) ── */}
              {isMobileOrLaptop &&
                availableVariantsForColor.length > 0 &&
                availableVariantsForColor.some(
                  (v) =>
                    v.storage &&
                    v.storage.trim() !== "" &&
                    v.storage.trim() !== "Standard" &&
                    v.storage.trim() !== "N/A"
                ) && (
                  <div className="mb-6 relative" ref={dropdownContainerRef}>
                    <label
                      id="storage-label"
                      className="block text-xs font-bold text-black uppercase tracking-wider mb-2.5"
                    >
                      Select Memory / Storage Variant:
                    </label>
                    <div className="relative">
                      <button
                        ref={triggerRef}
                        type="button"
                        id="storage-dropdown-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={isStorageOpen}
                        aria-labelledby="storage-label storage-dropdown-trigger"
                        aria-controls="storage-listbox"
                        onClick={() => setIsStorageOpen((prev) => !prev)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setIsStorageOpen(true);
                            const idx = availableVariantsForColor.findIndex((v) => v.id === selectedVariant?.id);
                            const initialIdx = idx >= 0 ? idx : 0;
                            setFocusedIndex(initialIdx);
                            setTimeout(() => optionsRef.current[initialIdx]?.focus(), 50);
                          }
                        }}
                        className="w-full px-4 py-3.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl text-xs sm:text-sm font-bold text-black flex items-center justify-between outline-none focus:border-black transition-all cursor-pointer shadow-xs"
                      >
                        <span className="truncate">
                          {selectedStorageVariant
                            ? `${selectedStorageVariant.ram ? `${selectedStorageVariant.ram} + ` : ""}${selectedStorageVariant.storage}${selectedStorageVariant.sim_type ? ` • ${selectedStorageVariant.sim_type}` : ""} — ${
                                typeof selectedStorageVariant.price === "number" && selectedStorageVariant.price > 0
                                  ? formatPrice(selectedStorageVariant.price + warrantyPrice)
                                  : "Price Coming Soon"
                              }`
                            : "Select Option"}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-black shrink-0 transition-transform duration-200 ${
                            isStorageOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Dropdown Popover */}
                      {isStorageOpen && (
                        <ul
                          id="storage-listbox"
                          role="listbox"
                          aria-labelledby="storage-label"
                          tabIndex={-1}
                          className="absolute z-30 left-0 right-0 mt-2 bg-white border border-[#EAEAEA] rounded-2xl shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-150"
                        >
                          {availableVariantsForColor.map((variant, index) => {
                            const isSelected = variant.id === selectedVariant?.id;
                            const isComboOutOfStock = variant.stock <= 0 || variant.status === "inactive";
                            const simLabel = variant.sim_type ? ` • ${variant.sim_type}` : "";
                            const label = variant.ram
                              ? `${variant.ram} + ${variant.storage}${simLabel}`
                              : `${variant.storage}${simLabel}`;

                            return (
                              <li key={variant.id || index} role="presentation">
                                <button
                                  ref={(el) => {
                                    optionsRef.current[index] = el;
                                  }}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  aria-disabled={isComboOutOfStock}
                                  tabIndex={focusedIndex === index ? 0 : -1}
                                  disabled={isComboOutOfStock}
                                  onClick={() => {
                                    if (isComboOutOfStock) return;
                                    setSelectedVariantId(variant.id);
                                    setIsStorageOpen(false);
                                    setFocusedIndex(-1);
                                    triggerRef.current?.focus();
                                  }}
                                  onKeyDown={(e) =>
                                    handleOptionKeyDown(e, index, variant.id, isComboOutOfStock)
                                  }
                                  className={`w-full px-4 py-3 text-left text-xs sm:text-sm font-bold flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? "bg-black text-white"
                                      : isComboOutOfStock
                                      ? "text-gray-300 bg-gray-50/50 cursor-not-allowed"
                                      : "text-black hover:bg-gray-100"
                                  }`}
                                >
                                  <span>
                                    {label} — {
                                      typeof variant.price === "number" && variant.price > 0
                                        ? formatPrice(variant.price + warrantyPrice)
                                        : "Price Coming Soon"
                                    }
                                  </span>
                                  {isComboOutOfStock ? (
                                    <span className="text-[11px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                      Out of stock
                                    </span>
                                  ) : isSelected ? (
                                    <Check className="w-4 h-4 text-white shrink-0" />
                                  ) : null}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

              {/* Quantity Selector & Stock Indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <label className="block text-xs font-bold text-black uppercase tracking-wider">
                    Quantity
                  </label>
                  {currentStock > 0 && currentStock <= 5 && (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      ⚠️ Only {currentStock} unit{currentStock > 1 ? "s" : ""} left in stock!
                    </span>
                  )}
                </div>
                <div className="inline-flex items-center border border-[#EAEAEA] rounded-full p-1 bg-white">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || isVariantOutOfStock || currentStock <= 0}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-100 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center text-xs font-bold text-black">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={isVariantOutOfStock || currentStock <= 0 || quantity >= currentStock}
                    title={quantity >= currentStock ? `Maximum available stock is ${currentStock}` : "Increase quantity"}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-100 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {currentStock > 0 && quantity >= currentStock && (
                  <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
                    You have reached the maximum available units ({currentStock}) in stock.
                  </p>
                )}
              </div>

              {/* ── Primary Action Buttons (Add to Bag, Buy Now, Wishlist) ── */}
              <div className="hidden lg:flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3 mb-8 w-full min-w-0 max-w-full">
                {/* 1. Add to Bag */}
                <button
                  type="button"
                  disabled={!isPriced || isVariantOutOfStock}
                  onClick={handleAddToCart}
                  className={`flex-1 py-3.5 sm:py-4 px-4 sm:px-6 rounded-full font-bold text-xs sm:text-sm border-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    isVariantOutOfStock
                      ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                      : added
                      ? "bg-emerald-600 border-emerald-600 text-white cursor-pointer"
                      : "bg-white text-black border-black hover:bg-gray-50 cursor-pointer"
                  }`}
                  title={isVariantOutOfStock ? "Out of stock - Cannot add to bag" : "Add to shopping bag"}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Bag!</span>
                    </>
                  ) : isVariantOutOfStock ? (
                    <>
                      <ShoppingBag className="w-4 h-4 opacity-40" />
                      <span>Out of Stock</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>{!isPriced ? "Price Coming Soon" : "Add to Bag"}</span>
                    </>
                  )}
                </button>

                {/* 2. Buy Now or Pre-Order Button */}
                {isVariantOutOfStock && isPreOrderAvailable ? (
                  <button
                    type="button"
                    onClick={() => setIsPreOrderOpen(true)}
                    className="flex-1 py-3.5 sm:py-4 px-4 sm:px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Pre-Order / Book Device</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!isPriced || isVariantOutOfStock || buyingNow}
                    onClick={handleBuyNow}
                    className={`flex-1 py-3.5 sm:py-4 px-4 sm:px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      isVariantOutOfStock
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-black text-white hover:bg-gray-800 shadow-md cursor-pointer"
                    }`}
                  >
                    {buyingNow ? (
                      <span>Proceeding...</span>
                    ) : (
                      <>
                        <span>Buy Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}

                {/* 3. Wishlist Button */}
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={`py-3.5 sm:py-4 px-4 sm:px-5 rounded-full border-2 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0 font-bold text-xs ${
                    isWishlisted
                      ? "bg-red-50 border-red-300 text-red-600"
                      : "bg-white border-[#EAEAEA] text-neutral-700 hover:border-black hover:text-black"
                  }`}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  title={isWishlisted ? "In Wishlist" : "Add to Wishlist"}
                >
                  <Heart
                    className={`w-4 h-4 transition-transform ${
                      isWishlisted ? "fill-red-600 text-red-600 scale-110" : "text-neutral-600"
                    }`}
                  />
                  <span>{isWishlisted ? "Saved" : "Wishlist"}</span>
                </button>
              </div>

              {/* ── Trust Badges ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-3.5 sm:p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl text-xs text-gray-700 w-full min-w-0 max-w-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                  <span className="font-bold truncate">{product.warranty || "Genuine Warranty"}</span>
                </div>
                <div className="flex items-center gap-2.5 min-w-0 text-emerald-800">
                  <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold truncate">Free Store Pickup</span>
                </div>
                {product.allow_cod !== false ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Banknote className="w-4 h-4 text-black shrink-0" />
                    <span className="truncate">Cash on Delivery</span>
                  </div>
                ) : product.allow_card !== false ? (
                  <div className="flex items-center gap-2.5 text-blue-700 min-w-0">
                    <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold truncate">Card / Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-emerald-700 min-w-0">
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold truncate">WhatsApp Order</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Truck className="w-4 h-4 text-black shrink-0" />
                  <span className="truncate">{product.delivery_info || "Express Delivery"}</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ── 2. Content Tabs Below ── */}
        <div className="mt-16 sm:mt-20 border-t border-[#EAEAEA] pt-10 w-full min-w-0 max-w-full">
          <div className="flex items-center gap-6 border-b border-[#EAEAEA] overflow-x-auto no-scrollbar mb-8 w-full max-w-full">
            <button
              onClick={() => setActiveTab("description")}
              className={`pb-4 text-xs sm:text-sm font-bold transition-all relative shrink-0 ${
                activeTab === "description" ? "text-black" : "text-gray-400 hover:text-black"
              }`}
            >
              Description
              {activeTab === "description" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("specifications")}
              className={`pb-4 text-xs sm:text-sm font-bold transition-all relative shrink-0 ${
                activeTab === "specifications" ? "text-black" : "text-gray-400 hover:text-black"
              }`}
            >
              Specifications
              {activeTab === "specifications" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("warranty")}
              className={`pb-4 text-xs sm:text-sm font-bold transition-all relative shrink-0 ${
                activeTab === "warranty" ? "text-black" : "text-gray-400 hover:text-black"
              }`}
            >
              Warranty & Delivery
              {activeTab === "warranty" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          </div>

          <div className="max-w-4xl w-full min-w-0">
            {activeTab === "description" && (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-4 break-words [overflow-wrap:anywhere] w-full min-w-0">
                <p>{product.description}</p>
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="border border-[#EAEAEA] rounded-2xl overflow-hidden overflow-x-auto w-full min-w-0">
                <table className="w-full text-xs sm:text-sm text-left">
                  <tbody>
                    {product.specifications && Object.keys(product.specifications).length > 0 ? (
                      Object.entries(product.specifications).map(([key, val], idx) => (
                        <tr
                          key={key}
                          className={idx % 2 === 0 ? "bg-[#FAFAFA]" : "bg-white"}
                        >
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5 font-bold text-black border-r border-[#EAEAEA] w-1/3 break-words">
                            {key}
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-gray-700 break-words">{val}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-5 py-4 text-gray-400">
                          General product specifications included with manufacturer packaging.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "warranty" && (
              <div className="space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl p-4 sm:p-6 w-full min-w-0 break-words">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-black shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-black mb-1">Warranty Details</h4>
                    <p>{product.warranty || "1 Year Company Warranty against manufacturer defects."}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-[#EAEAEA]">
                  <Store className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-black">Free In-Store Pickup (Colombo Flagship Showroom)</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Ready Same Day
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2.5">
                      Available for all online orders. Choose <strong>Store Pickup</strong> during checkout to collect your items directly from our flagship showroom with zero delivery charges.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs text-neutral-600 bg-white p-3 rounded-xl border border-[#EAEAEA]">
                      <div>
                        <span className="font-bold text-neutral-900 block">Showroom Address:</span>
                        <span>{BUSINESS_INFO.address}</span>
                      </div>
                      <div>
                        <span className="font-bold text-neutral-900 block">Opening Hours:</span>
                        <span>{BUSINESS_INFO.hours.displaySummary}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-[#EAEAEA]">
                  <Truck className="w-5 h-5 text-black shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-black mb-1">Island-Wide Courier Delivery</h4>
                    <p>{product.delivery_info || "Express island-wide door-to-door delivery across Sri Lanka within 1-3 business days. Cash on delivery available."}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Compatible Accessories Section ── */}
        <CompatibleAccessories currentProduct={product} allProducts={allProducts} />

        {/* ── 5. Same Brand Recommendations ("More from Brand") ── */}
        {allProducts.length > 8 && <SameBrandProducts currentProduct={product} allProducts={allProducts} />}
      </div>

      {/* ── 6. Mobile Sticky Bottom Purchase Bar (Screens < 1024px) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-3.5 sm:px-5 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-2 safe-bottom select-none">
        <div className="flex flex-col min-w-0 pr-1 shrink-0">
          <span className="text-[9px] sm:text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Price</span>
          <span className="text-xs sm:text-sm font-black text-black leading-tight">
            {formatPrice(currentVariantPrice)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isVariantOutOfStock && isPreOrderAvailable ? (
            <button
              type="button"
              onClick={() => setIsPreOrderOpen(true)}
              className="min-h-[42px] px-4 sm:px-5 py-2 rounded-full bg-[#25D366] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Pre-Order</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!isPriced || isVariantOutOfStock}
                onClick={handleAddToCart}
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isVariantOutOfStock
                    ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                    : added
                    ? "bg-emerald-600 text-white"
                    : "bg-[#64152F] text-white hover:bg-[#350713] shadow-md"
                }`}
              >
                {added ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                <span>{added ? "Added" : "Add to Cart"}</span>
              </button>

              <button
                type="button"
                disabled={!isPriced || isVariantOutOfStock || buyingNow}
                onClick={handleBuyNow}
                className="min-h-[44px] px-4 sm:px-5 py-2 rounded-full bg-[#111111] text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 active:scale-95 transition-all cursor-pointer hover:bg-neutral-800 shrink-0"
              >
                <span>{buyingNow ? "..." : "Buy Now"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Device Pre-Booking Modal ── */}
      <PreOrderModal
        isOpen={isPreOrderOpen}
        onClose={() => setIsPreOrderOpen(false)}
        product={product}
        selectedColor={hasUserChosenColor ? selectedColor : (colorVariants[0]?.name || "")}
        selectedStorage={selectedVariant?.storage || undefined}
        selectedRam={selectedVariant?.ram}
        currentPrice={currentVariantPrice}
        currentSku={currentSku}
        productImage={currentActiveImage}
      />
    </div>
  );
}
