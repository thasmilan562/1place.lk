"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag, ArrowRight, Check } from "lucide-react";
import { getCampaignPopupSettings } from "@/lib/firestore-client";
import { useToast } from "@/components/ui/ToastProvider";
import { normalizeImageUrl } from "@/lib/utils";

export interface CampaignPopupSettings {
  enabled: boolean;
  pageTargeting: "all" | "homepage" | "products";
  frequency: "once_per_session" | "once_per_day" | "every_visit";
  delaySeconds: number;
  imageUrl?: string;
  badgeText?: string;
  headline?: string;
  highlightText?: string;
  description?: string;
  couponCode?: string;
  discountText?: string;
  buttonText?: string;
  buttonUrl?: string;
  colorTheme?: "luxury_dark" | "gold_glow" | "clean_white" | "deep_purple";
  startDate?: string;
  endDate?: string;
}

const DEFAULT_POPUP: CampaignPopupSettings = {
  enabled: false,
  pageTargeting: "all",
  frequency: "once_per_session",
  delaySeconds: 7,
  imageUrl: "https://images.unsplash.com/photo-1616469829941-c7200edec809?q=80&w=1000&auto=format&fit=crop",
  badgeText: "SPECIAL PROMO",
  headline: "GET LKR 1,500 OFF",
  highlightText: "YOUR FIRST ORDER!",
  description: "Exclusive discount on genuine smartphones & accessories.",
  couponCode: "",
  discountText: "LKR 1,500 OFF",
  buttonText: "Claim Discount Now",
  buttonUrl: "/products",
  colorTheme: "luxury_dark",
};

export default function CampaignPopup() {
  const [popup, setPopup] = useState<CampaignPopupSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  const { showToast } = useToast();

  // Load cached settings
  useEffect(() => {
    getCampaignPopupSettings().then((res) => {
      setPopup(res || DEFAULT_POPUP);
    }).catch(() => {
      setPopup(DEFAULT_POPUP);
    });
  }, []);

  // Evaluate trigger conditions when popup settings load or pathname changes
  useEffect(() => {
    if (!popup || !popup.enabled) {
      setIsOpen(false);
      return;
    }

    // 0. Exclude admin and login pages
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/login")) {
      setIsOpen(false);
      return;
    }

    // 1. Page Targeting Check
    if (popup.pageTargeting === "homepage" && pathname !== "/") {
      setIsOpen(false);
      return;
    }
    if (popup.pageTargeting === "products" && !pathname.startsWith("/products")) {
      setIsOpen(false);
      return;
    }

    // 2. Date Range Schedule Check
    const now = new Date().getTime();
    if (popup.startDate && new Date(popup.startDate).getTime() > now) {
      setIsOpen(false);
      return;
    }
    if (popup.endDate && new Date(popup.endDate).getTime() < now) {
      setIsOpen(false);
      return;
    }

    // 3. Frequency Control Check
    const storageKey = `sm_popup_dismissed_${popup.headline || "default"}`;
    if (popup.frequency === "once_per_session") {
      if (sessionStorage.getItem(storageKey)) return;
    } else if (popup.frequency === "once_per_day") {
      const lastDismissed = localStorage.getItem(storageKey);
      if (lastDismissed && now - Number(lastDismissed) < 86400000) return;
    }

    // 4. Trigger delay timer
    const delayMs = (popup.delaySeconds || 2) * 1000;
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [popup, pathname]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (!popup) return;
    const storageKey = `sm_popup_dismissed_${popup.headline || "default"}`;
    if (popup.frequency === "once_per_session") {
      sessionStorage.setItem(storageKey, "true");
    } else if (popup.frequency === "once_per_day") {
      localStorage.setItem(storageKey, String(new Date().getTime()));
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast(`Coupon code '${code}' copied!`, "success");
    setTimeout(() => setCopied(false), 3000);
  };

  if (!popup || !popup.enabled || !isOpen) return null;

  const themeStyles = {
    luxury_dark: "bg-neutral-950/95 border-white/20 text-white backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)]",
    gold_glow: "bg-gradient-to-b from-neutral-950 via-zinc-950 to-amber-950/80 border-amber-500/40 text-white backdrop-blur-2xl shadow-[0_10px_40px_rgba(245,158,11,0.2)]",
    clean_white: "bg-white/95 border-neutral-200 text-black shadow-2xl backdrop-blur-xl",
    deep_purple: "bg-gradient-to-b from-neutral-950 via-slate-950 to-purple-950/80 border-purple-500/40 text-white backdrop-blur-2xl shadow-[0_10px_40px_rgba(168,85,247,0.2)]",
  };

  const isLight = popup.colorTheme === "clean_white";

  return (
    <AnimatePresence>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-hidden select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        {/* Perfectly Proportioned Responsive Modal for Mobile & Desktop */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className={`relative w-full max-w-[360px] sm:max-w-lg md:max-w-xl lg:max-w-2xl border rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-6 md:p-7 font-outfit max-h-[92vh] flex flex-col shadow-2xl ${
            themeStyles[popup.colorTheme || "luxury_dark"]
          }`}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close popup"
            className="absolute top-3 right-3 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-md"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Banner Graphic Image Container - Responsive 16:9 / 2:1 aspect ratio with object-top so headers & faces are never cropped */}
          {popup.imageUrl && (
            <div className="w-full aspect-[16/9] sm:aspect-[2/1] max-h-[220px] sm:max-h-[280px] md:max-h-[320px] rounded-xl sm:rounded-2xl overflow-hidden mb-3.5 sm:mb-4 bg-neutral-900 border border-white/10 relative shrink-0 shadow-md">
              <img
                src={normalizeImageUrl(popup.imageUrl)}
                alt={popup.headline || "Promotional Campaign"}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>
          )}

          {/* Content Area */}
          <div className="flex flex-col flex-1 overflow-y-auto pr-0.5">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {popup.badgeText && (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                    isLight ? "bg-black text-white" : "bg-amber-400 text-black"
                  }`}
                >
                  {popup.badgeText}
                </span>
              )}

              {popup.discountText && (
                <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-xs">
                  {popup.discountText}
                </span>
              )}
            </div>

            {/* Headline */}
            <h3 className={`text-base sm:text-lg md:text-xl font-black tracking-tight leading-snug ${isLight ? "text-black" : "text-white"}`}>
              {popup.headline}{" "}
              {popup.highlightText && (
                <span className={isLight ? "text-amber-600" : "text-amber-400"}>
                  {popup.highlightText}
                </span>
              )}
            </h3>

            {/* Description */}
            {popup.description && (
              <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${isLight ? "text-neutral-600" : "text-neutral-300"}`}>
                {popup.description}
              </p>
            )}

            {/* Coupon Code 1-Click Copy Box */}
            {popup.couponCode && (
              <div className="mt-3.5">
                <button
                  type="button"
                  onClick={() => handleCopyCoupon(popup.couponCode!)}
                  className={`w-full flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer ${
                    isLight
                      ? "bg-neutral-100 border-neutral-300 text-black hover:bg-neutral-200"
                      : "bg-white/10 border-white/20 text-amber-300 hover:bg-white/15"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px] text-neutral-400 font-sans uppercase font-semibold">Code:</span>
                    <span className="font-black uppercase tracking-wider text-white truncate text-xs sm:text-sm">{popup.couponCode}</span>
                  </div>
                  {copied ? (
                    <span className="text-emerald-400 text-xs font-sans font-bold flex items-center gap-1 shrink-0 ml-1.5">
                      <Check className="w-3.5 h-3.5" /> Copied
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs text-white/60 font-sans shrink-0 ml-1.5 hover:text-white">Tap to copy</span>
                  )}
                </button>
              </div>
            )}

            {/* CTA Button */}
            {popup.buttonText && (
              <div className="mt-3.5">
                <Link
                  href={popup.buttonUrl || "/products"}
                  onClick={handleClose}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg active:scale-95 cursor-pointer ${
                    isLight
                      ? "bg-black text-white hover:bg-neutral-800"
                      : "bg-white text-black hover:bg-amber-400 hover:text-black"
                  }`}
                >
                  <span>{popup.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
