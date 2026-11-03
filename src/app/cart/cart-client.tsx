"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Check,
  Heart,
} from "lucide-react";
import { useCart, CartItem } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/utils";
import { setSelectedCheckoutItems } from "@/lib/checkout-store";

export default function CartClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, hasFreeGift, hasQualifyingPaidItems } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();

  // Selected item IDs (by unique key: productId + variantId)
  const getItemKey = (item: CartItem) => `${item.productId}_${item.variantId || ""}_${item.color || ""}_${item.storage || ""}_${item.isFreeGift ? "gift" : "regular"}`;

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Initialize selected keys when cart loads
  useEffect(() => {
    if (cart.length > 0 && selectedKeys.length === 0) {
      setSelectedKeys(cart.map((i) => getItemKey(i)));
    }
  }, [cart]);

  const isAllSelected = cart.length > 0 && selectedKeys.length === cart.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(cart.map((i) => getItemKey(i)));
    }
  };

  const toggleSelectItem = (key: string) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter((k) => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  // Selected items & total calculation
  const selectedItems = useMemo(() => {
    return cart.filter((item) => selectedKeys.includes(getItemKey(item)));
  }, [cart, selectedKeys]);

  const selectedSubtotal = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [selectedItems]);

  const selectedHasOnlyFreeGift = useMemo(() => {
    if (selectedItems.length === 0) return false;
    return selectedItems.every((i) => i.isFreeGift);
  }, [selectedItems]);

  const handleProceedToCheckout = () => {
    if (selectedItems.length === 0) return;
    if (selectedHasOnlyFreeGift) {
      alert("A free gift cannot be ordered alone. Please select at least one regular product to complete checkout.");
      return;
    }
    if (!user) {
      router.push("/login?redirect=/checkout");
      return;
    }
    setSelectedCheckoutItems(selectedItems);
    router.push("/checkout");
  };

  return (
    <div className="bg-white min-h-screen pb-24 text-black">
      {/* ── Breadcrumbs ── */}
      <div className="border-b border-[#EAEAEA] bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium">
            <Link href="/" className="hover:text-black transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-black font-semibold">Shopping Bag</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-4 sm:pt-8">
        <div className="flex items-center justify-between gap-4 mb-4 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-neutral-950">
              Shopping Bag ({cart.length})
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium">
              Review your selected tech and proceed to checkout.
            </p>
          </div>
          {cart.length > 0 && (
            <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full shrink-0">
              {selectedItems.length} of {cart.length} Selected
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-16 sm:py-20 bg-[#FAFAFA] border border-[#EAEAEA] rounded-3xl max-w-xl mx-auto p-6 sm:p-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Your Shopping Bag is Empty</h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Explore our latest lineup of smartphones, laptops and genuine tech accessories.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition-all shadow-md text-xs sm:text-sm active:scale-95"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-start">
            
            {/* ── Left Column: Items List ── */}
            <div className="lg:col-span-8 space-y-3.5 sm:space-y-4">
              
              {/* Select All Row */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-black cursor-pointer"
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isAllSelected ? "bg-black border-black text-white" : "border-gray-300 bg-white"
                    }`}
                  >
                    {isAllSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span>Select All ({cart.length} Items)</span>
                </button>

                <span className="text-xs text-gray-500 font-semibold">
                  {selectedItems.length} selected
                </span>
              </div>

              {/* Free Gift Notification Banner */}
              {hasFreeGift && !hasQualifyingPaidItems && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 font-bold flex items-center justify-center shrink-0">
                    🎁
                  </div>
                  <div>
                    <p className="font-bold text-amber-950">Add an eligible regular product to claim your free gift!</p>
                    <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                      Promotional free gifts cannot be ordered as a standalone item. Add any regular smartphone or accessory to complete checkout.
                    </p>
                  </div>
                </div>
              )}

              {/* Product Cards */}
              <div className="space-y-3 sm:space-y-4">
                {cart.map((item) => {
                  const key = getItemKey(item);
                  const isSelected = selectedKeys.includes(key);
                  const isWishlisted = wishlist.includes(item.productId);

                  return (
                    <div
                      key={key}
                      className={`p-3.5 sm:p-5 rounded-2xl border transition-all ${
                        item.isFreeGift
                          ? "border-[#64152F] bg-rose-50/50 shadow-xs"
                          : isSelected
                          ? "border-neutral-900 bg-white shadow-xs"
                          : "border-neutral-200/80 bg-white/70 opacity-75"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleSelectItem(key)}
                          className="mt-1 sm:mt-2 shrink-0 cursor-pointer"
                          aria-label="Select item"
                        >
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isSelected ? "bg-black border-black text-white" : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>

                        {/* Product Image */}
                        <div className="w-18 h-18 sm:w-24 sm:h-24 rounded-xl bg-[#F7F7F7] border border-neutral-200/80 p-1.5 shrink-0 flex items-center justify-center overflow-hidden relative">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder-phone.webp";
                            }}
                          />
                          {item.isFreeGift && (
                            <div className="absolute top-1 left-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                              FREE
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          {item.isFreeGift && (
                            <span className="inline-block px-2 py-0.5 rounded bg-rose-600 text-white text-[9.5px] font-black tracking-wider uppercase mb-1">
                              🎁 Spin & Win Free Gift
                            </span>
                          )}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-bold text-xs sm:text-base text-neutral-950 truncate leading-snug">
                              {item.name}
                            </h3>
                            {item.isFreeGift ? (
                              <div className="flex items-baseline gap-1.5 shrink-0">
                                <span className="font-black text-xs sm:text-base text-emerald-600">
                                  FREE (LKR 0)
                                </span>
                                {item.originalPrice ? (
                                  <span className="line-through text-neutral-400 text-xs">
                                    {formatPrice(item.originalPrice)}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="font-black text-xs sm:text-base text-neutral-950 shrink-0">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            )}
                          </div>

                          {/* Variants & Warranty tags */}
                          <div className="flex flex-wrap gap-1.5 text-[10px] sm:text-[11px] text-neutral-600 mb-2.5 font-medium">
                            {item.color && (
                              <span className="bg-neutral-100 px-2 py-0.5 rounded-md text-neutral-800">
                                {item.color}
                              </span>
                            )}
                            {(item.ram || item.storage) && (
                              <span className="bg-neutral-100 px-2 py-0.5 rounded-md text-neutral-800">
                                {[item.ram, item.storage].filter(Boolean).join(" + ")}
                              </span>
                            )}
                            {item.warrantyTitle && (
                              <span className="bg-neutral-100 text-neutral-900 border border-neutral-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-neutral-900" />
                                {item.warrantyTitle}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons & Quantity Controls */}
                          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                            <div className="flex items-center gap-3">
                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.productId, item.variantId, item.color, item.storage, item.isFreeGift)}
                                className="text-[11px] sm:text-xs text-neutral-400 hover:text-neutral-900 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>

                              {/* Wishlist */}
                              {!item.isFreeGift && (
                                <button
                                  type="button"
                                  onClick={() => toggleWishlist(item.productId)}
                                  className={`text-[11px] sm:text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                                    isWishlisted ? "text-neutral-950 font-bold" : "text-neutral-400 hover:text-neutral-900"
                                  }`}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isWishlisted ? "fill-neutral-950 text-neutral-950" : ""}`} />
                                  <span>{isWishlisted ? "Saved" : "Save for later"}</span>
                                </button>
                              )}
                            </div>

                            {/* Quantity Controls */}
                            {item.isFreeGift ? (
                              <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                                Qty: 1 (Promotional)
                              </span>
                            ) : (
                              <div className="inline-flex items-center border border-neutral-200 rounded-full p-0.5 bg-neutral-50 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId, item.color, item.storage, item.isFreeGift)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-700 hover:text-black hover:bg-neutral-200 transition-colors cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center text-xs font-bold text-black">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId, item.color, item.storage, item.isFreeGift)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-700 hover:text-black hover:bg-neutral-200 transition-colors cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Right Column: Order Summary (Desktop Sticky) ── */}
            <div className="lg:col-span-4 sticky top-28">
              <div className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-3xl space-y-5">
                <h2 className="text-lg font-bold text-black pb-3 border-b border-[#EAEAEA]">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs sm:text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Selected Items ({selectedItems.length})</span>
                    <span className="font-bold text-black">{formatPrice(selectedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="text-neutral-900 font-semibold">Calculated at Checkout</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EAEAEA] flex items-baseline justify-between">
                  <span className="font-bold text-black text-sm sm:text-base">Subtotal</span>
                  <span className="font-black text-xl sm:text-2xl text-black">
                    {formatPrice(selectedSubtotal)}
                  </span>
                </div>

                {/* Primary CTA */}
                <button
                  type="button"
                  disabled={selectedItems.length === 0 || selectedHasOnlyFreeGift}
                  onClick={handleProceedToCheckout}
                  className={`w-full py-4 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                    selectedItems.length === 0 || selectedHasOnlyFreeGift
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-[#64152F] text-white hover:bg-[#350713]"
                  }`}
                >
                  {selectedHasOnlyFreeGift ? (
                    <span>Add Regular Item to Claim Free Gift</span>
                  ) : (
                    <span>Proceed to Checkout ({selectedItems.length} Items)</span>
                  )}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-gray-400 text-center">
                  🔒 Safe & Secure Checkout with 1PLACE.LK
                </p>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Mobile Sticky Bottom Checkout Bar (Screens < 1024px) ── */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3 safe-bottom">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              Subtotal ({selectedItems.length} items)
            </span>
            <span className="text-base font-black text-neutral-950 leading-tight truncate">
              {formatPrice(selectedSubtotal)}
            </span>
          </div>

          <button
            type="button"
            disabled={selectedItems.length === 0 || selectedHasOnlyFreeGift}
            onClick={handleProceedToCheckout}
            className={`px-6 py-3 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50 active:scale-95 transition-all shrink-0 cursor-pointer ${
              selectedHasOnlyFreeGift
                ? "bg-amber-600 text-white"
                : "bg-[#64152F] hover:bg-[#350713] text-white"
            }`}
          >
            <span>{selectedHasOnlyFreeGift ? "Add Regular Item" : "Proceed to Checkout"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
