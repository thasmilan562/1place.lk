"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { X, Check, ShoppingBag, Heart, ShieldCheck, Truck, MessageCircle } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, announceToScreenReader, normalizeImageUrl } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { getColorCSS } from "@/lib/color-utils";
import { usePurchaseGuard } from "@/lib/use-purchase-guard";

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { handleAuthenticatedPurchase } = usePurchaseGuard();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedStorage, setSelectedStorage] = useState<string>("");
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [added, setAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize variant selections when product changes
  useEffect(() => {
    if (product) {
      setSelectedColor("");

      // Find available storage options
      if (product.variant_combos && product.variant_combos.length > 0) {
        const firstAvailableStorage = product.variant_combos.find((c) => (c.available_stock || c.stock_quantity) > 0)?.storage || product.variant_combos[0]?.storage;
        setSelectedStorage(firstAvailableStorage || product.storage_options?.[0] || "");
      } else {
        setSelectedStorage(product.storage_options?.[0] || "");
      }

      setActiveImageIndex(0);
      setAdded(false);
      setErrorMsg("");
    }
  }, [product]);

  // Handle ESC Key & Focus Trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

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

  const validColors: string[] = useMemo(() => {
    if (!product || product.hasColorVariants === false) return [];
    const set = new Set<string>();
    if (Array.isArray(product.colors)) {
      product.colors.forEach((c) => {
        const name = typeof c === "string" ? c : (c as any)?.name;
        if (name && !isInvalidColorName(name)) {
          set.add(name.trim());
        }
      });
    }
    if (Array.isArray(product.color_variants)) {
      product.color_variants.forEach((cv) => {
        const name = cv?.name || (cv as any)?.color;
        if (name && !isInvalidColorName(name)) {
          set.add(name.trim());
        }
      });
    }
    return Array.from(set);
  }, [product]);

  // Filter storage options available for selected color
  const availableStorageForColor = (() => {
    if (!product.variant_combos || product.variant_combos.length === 0) {
      return product.storage_options || [];
    }
    const colorCombos = product.variant_combos.filter(
      (c) => !selectedColor || c.color_name?.toLowerCase() === selectedColor.toLowerCase()
    );
    const storages = Array.from(new Set(colorCombos.map((c) => c.storage).filter(Boolean))) as string[];
    return storages.length > 0 ? storages : product.storage_options || [];
  })();

  // Current combo details for selected color & storage
  const currentCombo = product.variant_combos?.find(
    (c) =>
      (!selectedColor || c.color_name?.toLowerCase() === selectedColor.toLowerCase()) &&
      (!selectedStorage || c.storage === selectedStorage)
  );

  const currentPrice = currentCombo?.price ?? product.price;
  const currentOldPrice = currentCombo?.old_price ?? product.old_price;

  // Image list (switch image when color changes)
  const productImages = (() => {
    if (product.color_variants && selectedColor) {
      const matchedColor = product.color_variants.find((cv) => cv.name.toLowerCase() === selectedColor.toLowerCase());
      if (matchedColor && matchedColor.images && matchedColor.images.length > 0) {
        return matchedColor.images;
      }
    }
    return product.images && product.images.length > 0 ? product.images : ["/placeholder-phone.webp"];
  })();

  const mainDisplayImage = normalizeImageUrl(
    productImages[activeImageIndex] || productImages[0] || "/placeholder-phone.webp"
  );

  const isWishlisted = isInWishlist(product.id);
  const hasCombos = Boolean(product.variant_combos && product.variant_combos.length > 0);
  const isOutOfStock = hasCombos
    ? (!currentCombo || (Number(currentCombo.available_stock ?? currentCombo.stock_quantity ?? 0) <= 0))
    : (product.stock_status === "out_of_stock");

  const isMobileOrLaptop =
    product.productType === "phone" ||
    (product.category_name || "").toLowerCase().includes("phone") ||
    (product.category_name || "").toLowerCase().includes("mobile") ||
    (product.category_name || "").toLowerCase().includes("smartphone") ||
    (product.category_name || "").toLowerCase().includes("laptop") ||
    (product.category_name || "").toLowerCase().includes("macbook") ||
    (product.category_name || "").toLowerCase().includes("ipad") ||
    (product.category_name || "").toLowerCase().includes("tablet") ||
    (product.name || "").toLowerCase().includes("iphone") ||
    (product.name || "").toLowerCase().includes("galaxy") ||
    (product.name || "").toLowerCase().includes("macbook") ||
    Boolean(product.hasStorageVariants);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setActiveImageIndex(0);
    setErrorMsg("");

    // Auto update storage if previous storage is unavailable for new color
    if (product.variant_combos && product.variant_combos.length > 0) {
      const combosForColor = product.variant_combos.filter(
        (c) => c.color_name?.toLowerCase() === color.toLowerCase()
      );
      const validStorage = combosForColor.find((c) => c.storage === selectedStorage)
        ? selectedStorage
        : combosForColor[0]?.storage || product.storage_options?.[0] || "";
      setSelectedStorage(validStorage);
    }
  };

  const handleAddToCart = () => {
    if (validColors.length > 0 && !selectedColor) {
      setErrorMsg("Please select a color.");
      return;
    }
    if (product.storage_options && product.storage_options.length > 0 && !selectedStorage) {
      setErrorMsg("Please select a storage option.");
      return;
    }
    if (isOutOfStock) return;

    handleAuthenticatedPurchase({
      action: "add-to-cart",
      product: {
        ...product,
        price: currentPrice,
      },
      image: mainDisplayImage,
      quantity: 1,
      color: selectedColor,
      storage: selectedStorage,
      onSuccess: () => {
        setAdded(true);
        setErrorMsg("");
        announceToScreenReader(`${product.name} added to bag.`);
        setTimeout(() => {
          setAdded(false);
          onClose();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("open-cart-drawer"));
          }
        }, 1000);
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickview-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col md:flex-row max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-900 hover:text-white flex items-center justify-center text-neutral-600 transition-colors shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Product Gallery */}
        <div className="w-full md:w-1/2 bg-white p-6 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-neutral-100 shrink-0">
          
          {/* Main Image */}
          <div className="relative aspect-square w-full flex items-center justify-center p-2">
            <img
              src={mainDisplayImage}
              alt={product.name}
              className="max-h-full max-w-full object-contain transition-all duration-300"
            />

            {/* Bottom-Left SALE Badge */}
            {currentOldPrice && currentOldPrice > currentPrice && (
              <div className="absolute bottom-0 left-0 z-10">
                <span className="px-2.5 py-1 rounded-tr-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs inline-block">
                  SALE
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {productImages.length > 1 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto max-w-full pb-1">
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-14 rounded-xl border p-1 bg-white flex items-center justify-center shrink-0 transition-all ${
                    activeImageIndex === idx ? "border-black ring-2 ring-black/10" : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Right Side: Details & Variant Selection */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          
          <div>
            {/* Category / Brand */}
            {(product.category_name || product.brand_name) && (
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                {product.brand_name || product.category_name}
              </span>
            )}

            {/* Product Title */}
            <h2 id="quickview-title" className="text-xl sm:text-2xl font-black text-[#090909] tracking-tight leading-tight mb-3">
              {product.name}
            </h2>

            {/* Price Row */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl font-black text-[#090909]">
                {formatPrice(currentPrice)}
              </span>
              {currentOldPrice && currentOldPrice > currentPrice && (
                <span className="text-sm font-medium text-neutral-400 line-through">
                  {formatPrice(currentOldPrice)}
                </span>
              )}
            </div>

            {/* Out of Stock Notice */}
            {isOutOfStock && (
              <div className="mb-4">
                 <span className={`inline-block ${isMobileOrLaptop ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200"} text-xs font-bold px-2.5 py-1 rounded-full border`}>
                  {isMobileOrLaptop ? "📅 Out of Stock — Pre-Order Available" : "Out of Stock"}
                </span>
              </div>
            )}

            {/* Installment Plan Notice if applicable */}
            {product.installment_price && !isOutOfStock && (
              <div className="mb-4 p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-800 flex items-center gap-2">
                <span>{product.installment_price}</span>
              </div>
            )}

            <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed line-clamp-3 mb-6">
              {product.description}
            </p>

            {/* Variant Selector 1: Color */}
            {validColors.length > 0 && (
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                  Select Color: <span className="text-black font-extrabold">{selectedColor || "Select"}</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {validColors.map((color) => {
                    const isSelected = selectedColor === color;
                    const hexColor = getColorCSS(color);
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorChange(color)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? "border-black bg-black text-white shadow-xs"
                            : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-neutral-300 shadow-2xs inline-block shrink-0"
                          style={{ backgroundColor: hexColor }}
                        />
                        <span>{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variant Selector 2: Storage */}
            {availableStorageForColor.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                  Select Storage: <span className="text-black font-extrabold">{selectedStorage || "Select"}</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {availableStorageForColor.map((storage) => {
                    const isSelected = selectedStorage === storage;

                    // Check stock for this specific combo
                    const combo = product.variant_combos?.find(
                      (c) =>
                        (!selectedColor || c.color_name?.toLowerCase() === selectedColor.toLowerCase()) &&
                        c.storage === storage
                    );
                    const comboOutOfStock = combo ? combo.available_stock <= 0 && combo.stock_quantity <= 0 : false;

                    return (
                      <button
                        key={storage}
                        type="button"
                        disabled={comboOutOfStock}
                        onClick={() => {
                          setSelectedStorage(storage);
                          setErrorMsg("");
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          comboOutOfStock
                            ? "border-neutral-200 bg-neutral-100 text-neutral-400 line-through cursor-not-allowed"
                            : isSelected
                            ? "border-black bg-black text-white shadow-xs"
                            : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400"
                        }`}
                      >
                        {storage}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs font-bold text-red-600 mb-4 animate-bounce">
                ⚠️ {errorMsg}
              </p>
            )}

          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-neutral-100 mt-4 space-y-3">
            
            <div className="flex items-center gap-3">
              {isOutOfStock && isMobileOrLaptop ? (
                <Link
                  href={`/products/${product.slug}?book=true`}
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Pre-Order / Book Device</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`flex-1 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md ${
                    isOutOfStock
                      ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                      : added
                      ? "bg-emerald-600 text-white"
                      : "bg-black text-white hover:bg-neutral-800"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Bag</span>
                    </>
                  ) : isOutOfStock ? (
                    <span>Sold Out</span>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Bag</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label="Toggle Wishlist"
                className="w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-700 hover:border-black active:scale-95 transition-all"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-around pt-2 text-[11px] text-neutral-500 font-semibold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {product.warranty || "Genuine Warranty"}
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" /> Islandwide Delivery
              </span>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
