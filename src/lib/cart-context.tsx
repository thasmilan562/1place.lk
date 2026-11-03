"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { SpinReward } from "@/lib/types";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  maxStock?: number;
  color?: string;
  storage?: string;
  ram?: string;
  variantId?: string;
  sku?: string;
  category?: string;
  warrantyTitle?: string;
  warrantyPrice?: number;
  allow_cod?: boolean;
  allow_card?: boolean;
  allow_whatsapp?: boolean;
  isFreeGift?: boolean;
  rewardId?: string;
  promotionalBadge?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, variantId?: string, color?: string, storage?: string, isFreeGift?: boolean) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string, color?: string, storage?: string, isFreeGift?: boolean) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  total: number;
  // Free promotional gift & shipping reward support
  addFreeGiftToCart: (gift: { productId: string; name: string; image: string; originalPrice?: number }, rewardId: string) => void;
  hasFreeGift: boolean;
  freeGiftItem: CartItem | null;
  hasQualifyingPaidItems: boolean;
  canCheckout: boolean;
  shippingReward: SpinReward | null;
  setShippingReward: (reward: SpinReward | null) => void;
}

const CartContext = createContext<CartContextType | null>(null);

const GUEST_CART_KEY = "oneplace_guest_cart";
const SHIPPING_REWARD_KEY = "oneplace_shipping_reward";

function isMatchingItem(
  a: CartItem,
  productId: string,
  variantId?: string,
  color?: string,
  storage?: string,
  isFreeGift?: boolean
): boolean {
  if (a.productId !== productId) return false;
  if (Boolean(a.isFreeGift) !== Boolean(isFreeGift)) return false;
  if (variantId !== undefined && a.variantId !== variantId) return false;
  if (color !== undefined && a.color !== color) return false;
  if (storage !== undefined && a.storage !== storage) return false;
  return true;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const isInitialized = useRef(false);

  // Load cart on mount or user state change
  useEffect(() => {
    isInitialized.current = false;

    const loadCart = async () => {
      // 1. Read guest cart from localStorage
      let localCart: CartItem[] = [];
      try {
        const stored = localStorage.getItem(GUEST_CART_KEY);
        if (stored) {
          localCart = JSON.parse(stored);
        }
      } catch (e) {
        console.warn("Could not read local guest cart:", e);
      }

      if (user) {
        // Authenticated user: read Firestore cart and merge with local guest cart
        try {
          const cartDocRef = doc(db, "carts", user.uid);
          const snap = await getDoc(cartDocRef);
          let remoteCart: CartItem[] = [];

          if (snap.exists() && Array.isArray(snap.data().items)) {
            remoteCart = snap.data().items;
          }

          if (localCart.length > 0) {
            // Merge local items into remote cart
            const merged = [...remoteCart];
            for (const localItem of localCart) {
              const existingIdx = merged.findIndex((r) =>
                isMatchingItem(r, localItem.productId, localItem.variantId, localItem.color, localItem.storage)
              );
              if (existingIdx > -1) {
                merged[existingIdx].quantity += localItem.quantity;
              } else {
                merged.push(localItem);
              }
            }
            setCart(merged);
            // Sync merged cart to Firestore and clear guest storage
            await setDoc(cartDocRef, { items: merged, updatedAt: new Date().toISOString() }, { merge: true });
            localStorage.removeItem(GUEST_CART_KEY);
          } else {
            setCart(remoteCart);
          }
        } catch (dbErr) {
          console.warn("Could not sync remote cart, fallback to local:", dbErr);
          setCart(localCart);
        }
      } else {
        // Guest user: use local cart
        setCart(localCart);
      }

      isInitialized.current = true;
    };

    loadCart();
  }, [user?.uid]);

  // Persist cart changes
  useEffect(() => {
    if (!isInitialized.current) return;

    if (user) {
      // Save to Firestore for logged-in user
      const cartDocRef = doc(db, "carts", user.uid);
      const cleanItems = JSON.parse(JSON.stringify(cart));
      setDoc(cartDocRef, { items: cleanItems, updatedAt: new Date().toISOString() }, { merge: true }).catch(
        (err) => console.warn("Firestore cart auto-save error:", err)
      );
    } else {
      // Save to localStorage for guest
      try {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
      } catch (err) {
        console.warn("LocalStorage cart save error:", err);
      }
    }
  }, [cart, user]);

  const [shippingReward, setShippingRewardState] = useState<SpinReward | null>(null);

  // Load saved shipping reward on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SHIPPING_REWARD_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && new Date(parsed.expiresAt).getTime() > Date.now()) {
          setShippingRewardState(parsed);
        } else {
          localStorage.removeItem(SHIPPING_REWARD_KEY);
        }
      }
    } catch {}
  }, []);

  const setShippingReward = useCallback((reward: SpinReward | null) => {
    setShippingRewardState(reward);
    try {
      if (reward) {
        localStorage.setItem(SHIPPING_REWARD_KEY, JSON.stringify(reward));
      } else {
        localStorage.removeItem(SHIPPING_REWARD_KEY);
      }
    } catch {}
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    // Zero / unpriced item guard (only verified promotional free gifts are allowed with price 0)
    if (!item.isFreeGift && (typeof item.price !== "number" || item.price <= 0 || isNaN(item.price))) {
      console.warn("Rejected unpriced product from being added to cart:", item);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) =>
        isMatchingItem(i, item.productId, item.variantId, item.color, item.storage, item.isFreeGift)
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        if (existing.isFreeGift) {
          // Free gifts remain quantity 1
          return updated;
        }
        const newQty = existing.quantity + (item.quantity || 1);
        const finalQty = existing.maxStock ? Math.min(newQty, existing.maxStock) : newQty;
        updated[existingIdx] = { ...existing, quantity: finalQty };
        return updated;
      }

      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  }, []);

  const addFreeGiftToCart = useCallback((gift: { productId: string; name: string; image: string; originalPrice?: number }, rewardId: string) => {
    setCart((prev) => {
      const withoutGifts = prev.filter((i) => !i.isFreeGift);
      const freeGiftItem: CartItem = {
        productId: gift.productId,
        name: gift.name,
        price: 0,
        originalPrice: gift.originalPrice || 2500,
        image: gift.image,
        quantity: 1,
        maxStock: 1,
        isFreeGift: true,
        rewardId,
        promotionalBadge: "FREE GIFT",
      };
      return [...withoutGifts, freeGiftItem];
    });
  }, []);

  const removeFromCart = useCallback(
    (productId: string, variantId?: string, color?: string, storage?: string, isFreeGift?: boolean) => {
      setCart((prev) =>
        prev.filter((i) => !isMatchingItem(i, productId, variantId, color, storage, isFreeGift))
      );
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number, variantId?: string, color?: string, storage?: string, isFreeGift?: boolean) => {
      if (quantity <= 0) {
        removeFromCart(productId, variantId, color, storage, isFreeGift);
        return;
      }

      setCart((prev) =>
        prev.map((i) => {
          if (!isMatchingItem(i, productId, variantId, color, storage, isFreeGift)) return i;
          if (i.isFreeGift) {
            return { ...i, quantity: 1 };
          }
          const finalQty = i.maxStock ? Math.min(quantity, i.maxStock) : quantity;
          return { ...i, quantity: finalQty };
        })
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem(GUEST_CART_KEY);
    } catch {}
  }, []);

  const itemCount = useMemo(
    () => cart.reduce((total, item) => total + (item.quantity || 1), 0),
    [cart]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0),
    [cart]
  );

  const total = subtotal;

  const hasFreeGift = useMemo(() => cart.some((i) => i.isFreeGift === true), [cart]);
  const freeGiftItem = useMemo(() => cart.find((i) => i.isFreeGift === true) || null, [cart]);
  const hasQualifyingPaidItems = useMemo(
    () => cart.some((i) => !i.isFreeGift && Number(i.price) > 0),
    [cart]
  );
  const canCheckout = useMemo(() => {
    if (cart.length === 0) return false;
    if (cart.some((i) => i.isFreeGift)) {
      return cart.some((i) => !i.isFreeGift && Number(i.price) > 0);
    }
    return true;
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        total,
        addFreeGiftToCart,
        hasFreeGift,
        freeGiftItem,
        hasQualifyingPaidItems,
        canCheckout,
        shippingReward,
        setShippingReward,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

const fallbackCartContext: CartContextType = {
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  itemCount: 0,
  subtotal: 0,
  total: 0,
  addFreeGiftToCart: () => {},
  hasFreeGift: false,
  freeGiftItem: null,
  hasQualifyingPaidItems: false,
  canCheckout: false,
  shippingReward: null,
  setShippingReward: () => {},
};

export function useCart() {
  const ctx = useContext(CartContext);
  return ctx || fallbackCartContext;
}
