"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/lib/wishlist-context";
import { useAuth } from "@/lib/auth-context";
import UserAvatar from "@/components/ui/UserAvatar";

export default function MobileNav() {
  const pathname = usePathname();
  const { wishlist } = useWishlist();
  const { user, profile, gender } = useAuth();

  // Hide bottom nav on admin and checkout pages
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout")
  ) {
    return null;
  }

  const isHome = pathname === "/";
  const isCategories = pathname.startsWith("/categories") || pathname.startsWith("/category/");
  const isWishlist = pathname.startsWith("/wishlist");
  const isAccount =
    pathname.startsWith("/account") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/orders");

  return (
    <nav
      data-mobile-bottom-nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden bg-white/95 backdrop-blur-md border-t border-[#E8E8E8] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-bottom select-none font-sans"
    >
      <div className="grid grid-cols-4 items-center h-15 px-2 max-w-md mx-auto">
        {/* 1. Home */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-[11px] transition-all relative py-1.5 min-h-[48px]",
            isHome ? "text-[#68122F] font-bold" : "text-[#666666] hover:text-[#111111] font-medium"
          )}
        >
          <Home
            className={cn(
              "w-5 h-5 transition-transform",
              isHome ? "text-[#68122F] stroke-[2.4]" : "text-[#666666] stroke-[1.8]"
            )}
          />
          <span>Home</span>
        </Link>

        {/* 2. Categories */}
        <Link
          href="/categories"
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-[11px] transition-all relative py-1.5 min-h-[48px]",
            isCategories ? "text-[#68122F] font-bold" : "text-[#666666] hover:text-[#111111] font-medium"
          )}
        >
          <LayoutGrid
            className={cn(
              "w-5 h-5 transition-transform",
              isCategories ? "text-[#68122F] stroke-[2.4]" : "text-[#666666] stroke-[1.8]"
            )}
          />
          <span>Categories</span>
        </Link>

        {/* 3. Wishlist */}
        <Link
          href="/wishlist"
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-[11px] transition-all relative py-1.5 min-h-[48px]",
            isWishlist ? "text-[#68122F] font-bold" : "text-[#666666] hover:text-[#111111] font-medium"
          )}
        >
          <div className="relative">
            <Heart
              className={cn(
                "w-5 h-5 transition-transform",
                isWishlist ? "text-[#68122F] stroke-[2.4]" : "text-[#666666] stroke-[1.8]"
              )}
            />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#68122F] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight shadow-2xs">
                {wishlist.length > 99 ? "99+" : wishlist.length}
              </span>
            )}
          </div>
          <span>Wishlist</span>
        </Link>

        {/* 4. Account */}
        {user ? (
          <Link
            href="/orders"
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px] transition-all relative py-1.5 min-h-[48px]",
              isAccount ? "text-[#68122F] font-bold" : "text-[#666666] hover:text-[#111111] font-medium"
            )}
          >
            <UserAvatar
              gender={gender || profile?.gender || "male"}
              name={user.displayName || "User"}
              photoURL={user.photoURL}
              size="xs"
              className={isAccount ? "ring-2 ring-[#68122F]" : ""}
            />
            <span>Account</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-auth-modal"));
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px] transition-all relative py-1.5 min-h-[48px] cursor-pointer",
              isAccount ? "text-[#68122F] font-bold" : "text-[#666666] hover:text-[#111111] font-medium"
            )}
            aria-label="Account / Sign In"
          >
            <User
              className={cn(
                "w-5 h-5 transition-transform",
                isAccount ? "text-[#68122F] stroke-[2.4]" : "text-[#666666] stroke-[1.8]"
              )}
            />
            <span>Account</span>
          </button>
        )}
      </div>
    </nav>
  );
}
