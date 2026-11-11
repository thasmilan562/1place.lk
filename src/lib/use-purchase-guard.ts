"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart, CartItem } from "@/lib/cart-context";
import { setPendingPurchaseIntent, sanitizeReturnUrl } from "@/lib/auth-intent";
import { setSelectedCheckoutItems } from "@/lib/checkout-store";
import { Product } from "@/lib/types";

export interface PurchaseGuardActionOptions {
  action: "add-to-cart" | "buy-now";
  product: Product | { id: string; name: string; price: number; [key: string]: any };
  color?: string;
  storage?: string;
  ram?: string;
  variantId?: string;
  quantity?: number;
  maxStock?: number;
  image?: string;
  warrantyTitle?: string;
  warrantyPrice?: number;
  returnUrl?: string;
  onSuccess?: () => void;
}

export function getAvailableStock(
  product: PurchaseGuardActionOptions["product"],
  options: PurchaseGuardActionOptions
): number | undefined {
  const combos = Array.isArray((product as any).variant_combos) ? (product as any).variant_combos : [];
  if (combos.length > 0) {
    const combo = combos.find((entry: any) =>
      (options.variantId && entry.id === options.variantId) ||
      ((!options.variantId || !entry.id) &&
        (!options.color || entry.color_name?.toLowerCase() === options.color.toLowerCase()) &&
        (!options.storage || entry.storage === options.storage))
    );
    if (!combo) return 0;
    const qty = Number(combo.available_stock ?? combo.stock_quantity);
    return Number.isFinite(qty) ? Math.max(0, qty) : 0;
  }

  const qty = Number((product as any).stock_quantity ?? (product as any).stock_count);
  return Number.isFinite(qty) ? Math.max(0, qty) : 0;
}

export function usePurchaseGuard() {
  const { user, loading } = useAuth();
  const { addToCart } = useCart();
  const router = useRouter();

  const handleAuthenticatedPurchase = useCallback(
    (options: PurchaseGuardActionOptions) => {
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/products";
      const returnUrl = sanitizeReturnUrl(options.returnUrl || currentPath, "/products");

      // 1. Guest Check: If not logged in, save pending intent and redirect to login
      if (!user) {
        setPendingPurchaseIntent({
          action: options.action,
          productId: options.product.id,
          variantId: options.variantId,
          color: options.color || options.product.colors?.[0],
          storage: options.storage || options.product.storage_options?.[0],
          ram: options.ram,
          quantity: options.quantity || 1,
          returnUrl,
        });

        const safeRedirectParam = encodeURIComponent(returnUrl);
        router.push(`/login?redirect=${safeRedirectParam}&intent=${options.action}`);
        return false;
      }

      // 2. Authenticated User: Execute action immediately
      const item: CartItem = {
        productId: options.product.id,
        name: options.product.name,
        price: options.product.price,
        image: options.image || options.product.images?.[0] || "/placeholder-phone.webp",
        quantity: options.quantity || 1,
        maxStock: Math.min(options.maxStock ?? Number.POSITIVE_INFINITY, getAvailableStock(options.product, options) ?? 0),
        color: options.color || options.product.colors?.[0],
        storage: options.storage || options.product.storage_options?.[0],
        ram: options.ram,
        variantId: options.variantId,
        warrantyTitle: options.warrantyTitle,
        warrantyPrice: options.warrantyPrice,
        allow_cod: options.product.allow_cod !== false,
        allow_card: options.product.allow_card !== false,
        allow_whatsapp: options.product.allow_whatsapp !== false,
      };

      if ((item.maxStock ?? 0) <= 0 || item.quantity > (item.maxStock ?? 0)) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart-stock-limit", {
            detail: { name: item.name, available: item.maxStock },
          }));
        }
        return false;
      }

      if (options.action === "buy-now") {
        setSelectedCheckoutItems([item]);
        router.push("/checkout");
      } else {
        addToCart(item);
        if (options.onSuccess) {
          options.onSuccess();
        }
      }

      return true;
    },
    [user, addToCart, router]
  );

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    handleAuthenticatedPurchase,
  };
}
