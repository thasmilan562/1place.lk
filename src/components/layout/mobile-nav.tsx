"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import UserAvatar from "@/components/ui/UserAvatar";

export default function MobileNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, profile, gender } = useAuth();

  // Hide bottom nav on admin, checkout, and product detail pages
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    (pathname.startsWith("/products/") && pathname !== "/products")
  ) {
    return null;
  }

  const isHome = pathname === "/";
  const isCategories = pathname.startsWith("/categories") || pathname.startsWith("/category");
  const isDeals = pathname === "/deals" || pathname.includes("deals");
  const isCart = pathname.startsWith("/cart");
  const isAccount = pathname.startsWith("/account") || pathname.startsWith("/profile") || pathname.startsWith("/login") || pathname.startsWith("/orders");

  return (
    <nav
      data-mobile-bottom-nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden bg-white border-t border-[#E8E8E8] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-bottom select-none font-sans"
    >
      <div className="grid grid-cols-3 items-center h-14 px-2 max-w-sm mx-auto">
        {/* 1. Home */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-[10px] transition-all relative py-1 min-h-[44px]",
            isHome ? "text-[#64152F] font-bold" : "text-[#666666] hover:text-[#111111] font-medium"
          )}
        >
          <Home
            className={cn(
              "w-5 h-5 transition-transform",
              isHome ? "text-[#64152F] stroke-[2.2]" : "text-[#666666]"
            )}
          />
          <span>Home</span>
          {isHome && <span className="w-1 h-1 rounded-full bg-[#64152F] absolute bottom-1" />}
        </Link>

        {/* 2. Cart (with dynamic count badge & drawer trigger) */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-cart-drawer"));
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-[10px] transition-all relative py-1 min-h-[44px] cursor-pointer",
            isCart ? "text-[#64152F] font-bold" : "text-[#666666] hover:text-[#111111] font-medium"
          )}
          aria-label="Shopping Cart"
        >
          <div className="relative">
            <ShoppingBag
              className={cn(
                "w-5 h-5 transition-transform",
                isCart ? "text-[#64152F] stroke-[2.2]" : "text-[#666666]"
              )}
            />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#64152F] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full leading-tight shadow-2xs">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </div>
          <span>Cart</span>
          {isCart && <span className="w-1 h-1 rounded-full bg-[#64152F] absolute bottom-1" />}
        </button>

        {/* 3. Account */}
        {user ? (
          <Link
            href="/orders"
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[10px] transition-all relative py-1 min-h-[44px]",
              isAccount ? "text-[#64152F] font-bold" : "text-[#666666] hover:text-[#111111] font-medium"
            )}
          >
            <UserAvatar
              gender={gender || profile?.gender || "male"}
              name={user.displayName || "User"}
              photoURL={user.photoURL}
              size="xs"
              className={isAccount ? "ring-2 ring-[#64152F]" : ""}
            />
            <span>Account</span>
            {isAccount && <span className="w-1 h-1 rounded-full bg-[#64152F] absolute bottom-1" />}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-auth-modal"));
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[10px] transition-all relative py-1 min-h-[44px] cursor-pointer",
              isAccount ? "text-[#64152F] font-bold" : "text-[#666666] hover:text-[#111111] font-medium"
            )}
            aria-label="Account / Sign In"
          >
            <User
              className={cn(
                "w-5 h-5 transition-transform",
                isAccount ? "text-[#64152F] stroke-[2.2]" : "text-[#666666]"
              )}
            />
            <span>Account</span>
            {isAccount && <span className="w-1 h-1 rounded-full bg-[#64152F] absolute bottom-1" />}
          </button>
        )}
      </div>
    </nav>
  );
}
