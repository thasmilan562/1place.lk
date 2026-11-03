"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, normalizeImageUrl } from "@/lib/utils";
import { setSelectedCheckoutItems } from "@/lib/checkout-store";
import { useDialogFocus } from "@/lib/use-dialog-focus";

export default function PremiumCartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { cart, itemCount, total, updateQuantity, removeFromCart, canCheckout } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const dialogRef = useDialogFocus(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.cartDrawerOpen = "true";
    window.dispatchEvent(new CustomEvent("open-cart-drawer"));
    return () => { document.body.style.overflow = previous; delete document.body.dataset.cartDrawerOpen; };
  }, [isOpen]);

  if (!isOpen) return null;
  const checkout = () => {
    if (!canCheckout) return;
    // Replace stale selections from an earlier Buy Now before entering checkout.
    setSelectedCheckoutItems(cart);
    onClose();
    router.push(user ? "/checkout" : "/login?redirect=%2Fcheckout");
  };

  return (
    <div className="premium-cart-overlay">
      <div className="premium-cart-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="shopping-bag-title" tabIndex={-1} className="premium-cart" data-lenis-prevent>
        <header className="premium-cart__header">
          <div><p className="premium-eyebrow">YOUR GOOD FINDS</p><h2 id="shopping-bag-title">Shopping bag <span>{itemCount}</span></h2></div>
          <button type="button" onClick={onClose} aria-label="Close shopping bag"><X size={21} /></button>
        </header>
        {cart.length === 0 ? <div className="premium-cart__empty">
          <ShoppingBag size={42} strokeWidth={1.2} /><h3>A little room for something good.</h3>
          <p>Your bag is empty. Find your next favourite in our collection.</p>
          <Link href="/products" className="premium-button" onClick={onClose}>Explore the collection <ArrowRight size={16} /></Link>
        </div> : <>
          <div className="premium-cart__items">
            {cart.map((item) => <article className="premium-cart__item" key={[item.productId, item.variantId, item.color, item.storage, item.isFreeGift].join("-")}>
              <div className="premium-cart__image"><Image src={normalizeImageUrl(item.image) || "/placeholder-phone.webp"} alt={item.name} fill sizes="88px" unoptimized style={{ objectFit: "contain", padding: 8 }} /></div>
              <div className="premium-cart__detail"><h3>{item.name}</h3>
                <p>{[item.color, item.storage, item.ram].filter(Boolean).join(" / ")}</p>
                <strong>{item.isFreeGift ? "Complimentary gift" : formatPrice(item.price)}</strong>
                <div className="premium-cart__item-actions">
                  {!item.isFreeGift && <div className="premium-cart__quantity" aria-label={`Quantity for ${item.name}`}>
                    <button type="button" aria-label={`Decrease ${item.name} quantity`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId, item.color, item.storage, item.isFreeGift)}><Minus size={13} /></button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button type="button" aria-label={`Increase ${item.name} quantity`} disabled={typeof item.maxStock === "number" && item.quantity >= item.maxStock} onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId, item.color, item.storage, item.isFreeGift)}><Plus size={13} /></button>
                  </div>}
                  <button type="button" className="premium-cart__remove" aria-label={`Remove ${item.name} from bag`} onClick={() => removeFromCart(item.productId, item.variantId, item.color, item.storage, item.isFreeGift)}><Trash2 size={15} /></button>
                </div>
              </div>
            </article>)}
          </div>
          <div className="premium-cart__summary"><div><span>Subtotal</span><strong>{formatPrice(total)}</strong></div>
            <p>Delivery and available payment options are confirmed at checkout.</p>
            {!canCheckout && <p role="status">Add a regular priced product to check out with your gift.</p>}
            <button type="button" className="premium-button" disabled={!canCheckout} onClick={checkout}>Continue to checkout <ArrowRight size={17} /></button>
            <Link href="/cart" onClick={onClose} className="premium-cart__view">View and edit bag</Link>
          </div>
        </>}
      </div>
    </div>
  );
}
