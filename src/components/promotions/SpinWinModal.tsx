"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingBag,
  Gift,
  Truck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { SpinPromotionSettings, SpinSegment, SpinReward } from "@/lib/types";
import { DEFAULT_SPIN_SETTINGS } from "@/lib/spin-config";
import SpinWheel from "./SpinWheel";
import { BrandLogo } from "@/components/ui/BrandLogo";

const DISMISSED_STORAGE_KEY = "oneplace_spin_modal_dismissed_time";

// Lightweight canvas-free confetti effect
function ConfettiExplosion() {
  const pieces = useMemo(() => {
    const colors = ["#F59E0B", "#D90429", "#64152F", "#FFFFFF", "#10B981", "#3B82F6"];
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 360,
      y: (Math.random() - 0.7) * 380,
      rotate: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 6,
      delay: Math.random() * 0.15,
      shape: Math.random() > 0.5 ? "circle" : "rect",
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [1, 1, 0],
            scale: [0, 1.2, 0.8],
            x: p.x,
            y: p.y,
            rotate: p.rotate + 360,
          }}
          transition={{ duration: 1.8, ease: "easeOut", delay: p.delay }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.shape === "circle" ? p.size : p.size * 1.6,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}

export default function SpinWinModal() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { addFreeGiftToCart, setShippingReward, cart } = useCart();

  // Settings State
  const [settings, setSettings] = useState<SpinPromotionSettings>(DEFAULT_SPIN_SETTINGS);
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Modal Flow States: "welcome" | "spinning" | "won" | "ineligible"
  const [modalState, setModalState] = useState<"welcome" | "spinning" | "won" | "ineligible">("welcome");
  const [spinningLoading, setSpinningLoading] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);

  // Won Reward & Gift Product State
  const [wonReward, setWonReward] = useState<SpinReward | null>(null);
  const [wonGiftProduct, setWonGiftProduct] = useState<any>(null);
  const [winningSegment, setWinningSegment] = useState<SpinSegment | null>(null);
  const [ineligibleReason, setIneligibleReason] = useState<string>("");

  // Terms Modal Toggle
  const [showTerms, setShowTerms] = useState(false);

  const lastFocusedElement = useRef<HTMLElement | null>(null);

  // Suppress promotion modal on administrative, auth, and checkout routes
  const isBlockedRoute = useMemo(() => {
    return Boolean(
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/checkout") ||
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/register")
    );
  }, [pathname]);

  // Coordinate overlays: close spin modal if auth modal or cart opens
  useEffect(() => {
    const handleSuppress = () => {
      setIsOpen(false);
    };
    window.addEventListener("auth-modal-opened", handleSuppress);
    window.addEventListener("open-auth-modal", handleSuppress);
    window.addEventListener("open-cart-drawer", handleSuppress);
    window.addEventListener("open-categories-menu", handleSuppress);
    return () => {
      window.removeEventListener("auth-modal-opened", handleSuppress);
      window.removeEventListener("open-auth-modal", handleSuppress);
      window.removeEventListener("open-cart-drawer", handleSuppress);
      window.removeEventListener("open-categories-menu", handleSuppress);
    };
  }, []);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // 1. Fetch promotion settings on mount
  useEffect(() => {
    if (isBlockedRoute) {
      setIsOpen(false);
      return;
    }

    fetch("/api/spin-and-win/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings);

          // Check if modal should auto-open
          if (data.settings.enabled && data.settings.popupEnabled) {
            try {
              if (document.body.dataset.authModalOpen === "true") {
                return; // Auth modal is currently open, suppress promotion
              }
              const dismissedAt = localStorage.getItem(DISMISSED_STORAGE_KEY);
              const oneDayMs = 24 * 60 * 60 * 1000;
              if (!dismissedAt || Date.now() - Number(dismissedAt) > oneDayMs) {
                // Auto show after a gentle 2.5s delay
                const timer = setTimeout(() => {
                  if (document.body.dataset.authModalOpen !== "true") {
                    lastFocusedElement.current = document.activeElement as HTMLElement;
                    setIsOpen(true);
                  }
                }, 2500);
                return () => clearTimeout(timer);
              }
            } catch (e) {
              // Ignore storage errors
            }
          }
        }
      })
      .catch((err) => console.warn("Failed to load spin settings:", err));
  }, [isBlockedRoute]);

  // 2. Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setShowTerms(false);
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, Date.now().toString());
    } catch {}
    if (lastFocusedElement.current) {
      try {
        lastFocusedElement.current.focus();
      } catch {}
    }
  };

  // 3. Initiate Spin
  const handleSpinClick = async () => {
    if (isWheelSpinning || spinningLoading) return;

    setSpinningLoading(true);

    try {
      // Execute spin on server
      const res = await fetch("/api/spin-and-win/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "guest",
          customerName: user?.displayName || "New Customer",
          customerEmail: user?.email || "",
          customerPhone: user?.phoneNumber || "",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        // If user already spun or ineligible
        setIneligibleReason(data.error || "You are not eligible for a spin.");
        setModalState("ineligible");
        setSpinningLoading(false);
        return;
      }

      const { winningSegmentIndex, segment, reward, giftProduct } = data;

      // Calculate deceleration landing angle - STRICT REQUIREMENT: MUST ALWAYS land on 10% DISCOUNT
      const segments = settings.segments || DEFAULT_SPIN_SETTINGS.segments;
      const numSegments = segments.length || 6;
      const sliceAngle = 360 / numSegments;

      const discount10Index = segments.findIndex(
        (s) => s.id === "seg_discount" || s.discountPercent === 10 || s.label.includes("10%")
      );
      const finalWinningIndex = discount10Index >= 0 ? discount10Index : (winningSegmentIndex >= 0 ? winningSegmentIndex : (numSegments - 1));

      // Pointer is at the top (0° or -90° SVG center)
      const targetSliceCenter = finalWinningIndex * sliceAngle + sliceAngle / 2;
      const landingOffset = (360 - targetSliceCenter) % 360;
      const dramaticSpins = 360 * 6; // 6 full turns
      const nextRotation = wheelRotation + dramaticSpins + ((landingOffset - (wheelRotation % 360) + 360) % 360);

      // Force reward to 10% DISCOUNT
      const guaranteed10DiscountReward: SpinReward = {
        id: reward?.id || `RW-SPIN-${Date.now()}`,
        userId: user?.uid || "guest",
        customerName: user?.displayName || "First Order Customer",
        customerEmail: user?.email || "",
        customerPhone: user?.phoneNumber || "",
        rewardType: "discount",
        segmentId: segments[finalWinningIndex]?.id || "seg_discount",
        segmentLabel: "10% DISCOUNT",
        productName: "10% Off First Order Discount",
        productImage: "/assets/promo/gift-box.png",
        discountPercent: 10,
        couponCode: "1PLACE10",
        status: "issued",
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      setWinningSegment(segments[finalWinningIndex] || segment);
      setWonReward(guaranteed10DiscountReward);
      setWonGiftProduct(giftProduct);

      setModalState("spinning");
      setSpinningLoading(false);
      setIsWheelSpinning(true);
      setWheelRotation(nextRotation);
    } catch (err: any) {
      console.error("Spin error:", err);
      setSpinningLoading(false);
      alert("Network error processing spin. Please try again.");
    }
  };

  // 4. Deceleration transition end -> Win result
  const handleSpinEnd = () => {
    setIsWheelSpinning(false);
    setModalState("won");

    // Automatically integrate 10% discount coupon into checkout
    try {
      localStorage.setItem("sm_active_coupon", "1PLACE10");
      localStorage.setItem("oneplace_active_coupon", "1PLACE10");
      window.dispatchEvent(new CustomEvent("coupon-applied", { detail: { code: "1PLACE10", discountPercent: 10 } }));
    } catch {}
  };

  if (!settings.enabled || isBlockedRoute) return null;

  return (
    <>


      {/* ── Modal Backdrop & Dialog ── */}
      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-heading"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/35 backdrop-blur-sm transition-opacity"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-[860px] max-h-[92vh] overflow-y-auto rounded-[28px] sm:rounded-[36px] bg-[#FAFAFA] border border-[#E5E5E7] shadow-[0_24px_80px_rgba(0,0,0,0.2)] text-[#1D1D1F] z-10 scrollbar-thin"
              style={{
                boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
              }}
            >
              {/* Confetti Explosion on confirmed win */}
              {modalState === "won" && <ConfettiExplosion />}

              {/* Close Button */}
              <button
                onClick={handleClose}
                aria-label="Close promotion popup"
                className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-white hover:bg-[#F0F0F2] text-[#6E6E73] hover:text-[#1D1D1F] transition-all cursor-pointer border border-[#E5E5E7]"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* ── 2-Column Responsive Layout ── */}
              <div className="grid lg:grid-cols-12 items-center p-5 sm:p-8 lg:p-10 gap-6 lg:gap-8">
                
                {/* ══ LEFT COLUMN: COPY & JOURNEY STATES ══ */}
                <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left space-y-4 sm:space-y-5">
                  
                  {/* Brand & Badge Header */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                    <BrandLogo variant="auth" />
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#F2E9ED] border border-[#E7D8DF] text-[#68122F] text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                      <span>{settings.badgeText || "FIRST ORDER SPECIAL"}</span>
                    </div>
                  </div>

                  {/* ── STATE A: WELCOME & SPINNING ── */}
                  {(modalState === "welcome" || modalState === "spinning") && (
                    <>
                      <div>
                        <h2
                          id="promo-heading"
                          className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-[1.15] text-[#1D1D1F]"
                        >
                          {settings.heading || "YOUR FIRST ORDER DESERVES A GIFT!"}
                        </h2>
                        <p className="text-[#6E6E73] text-xs sm:text-sm mt-2 sm:mt-3 leading-relaxed max-w-md mx-auto lg:mx-0">
                          {settings.description ||
                            "Place your first order and unlock your chance to WIN A FREE GIFT! Every spin is guaranteed to reward you."}
                        </p>
                      </div>

                      {/* Reward Teasers Grid */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
                        <div className="p-2 sm:p-3 rounded-2xl bg-white border border-[#E5E5E7] text-center flex flex-col items-center">
                          <span className="text-xl sm:text-2xl mb-1">🎁</span>
                          <span className="text-[10px] sm:text-[11px] font-semibold text-[#424245] leading-tight">
                            Free Gift Box
                          </span>
                        </div>
                        <div className="p-2 sm:p-3 rounded-2xl bg-white border border-[#E5E5E7] text-center flex flex-col items-center">
                          <span className="text-xl sm:text-2xl mb-1">🚚</span>
                          <span className="text-[10px] sm:text-[11px] font-semibold text-[#424245] leading-tight">
                            Free Delivery
                          </span>
                        </div>
                        <div className="p-2 sm:p-3 rounded-2xl bg-white border border-[#E5E5E7] text-center flex flex-col items-center">
                          <span className="text-xl sm:text-2xl mb-1">🎧</span>
                          <span className="text-[10px] sm:text-[11px] font-semibold text-[#424245] leading-tight">
                            Accessories
                          </span>
                        </div>
                      </div>

                      {/* Primary CTA Buttons */}
                      <div className="pt-2 space-y-2.5">
                        <button
                          id="spin-now-btn"
                          onClick={handleSpinClick}
                          disabled={isWheelSpinning || spinningLoading}
                          className="w-full py-4 px-6 rounded-2xl bg-[#68122F] hover:bg-[#520D23] text-white font-semibold text-sm sm:text-base tracking-wide transition-all shadow-[0_6px_18px_rgba(104,18,47,0.18)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden group"
                        >
                          {spinningLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Validating Eligibility...</span>
                            </>
                          ) : isWheelSpinning ? (
                            <>
                              <RotateCw className="w-5 h-5 animate-spin text-[#FFE875]" />
                              <span>Spinning For 10% Discount...</span>
                            </>
                          ) : (
                            <>
                              <Gift className="w-5 h-5 text-[#FFE875]" />
                              <span>SPIN NOW &amp; WIN 10% DISCOUNT</span>
                            </>
                          )}
                          <motion.span
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] pointer-events-none"
                            animate={{ x: ["-200%", "200%"] }}
                            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                          />
                        </button>

                        <button
                          id="shop-now-btn"
                          onClick={() => {
                            handleClose();
                            router.push("/products");
                          }}
                          className="w-full py-3 px-5 rounded-2xl bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] font-semibold text-xs sm:text-sm tracking-wide transition-all border border-[#E5E5E7] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                        >
                          <span>SHOP NOW &amp; UNLOCK YOUR SPIN</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <div className="flex items-center justify-center lg:justify-start gap-3 text-[11px] text-[#86868B]">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Genuine Tech
                          </span>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setShowTerms(!showTerms)}
                            className="underline hover:text-[#1D1D1F] transition-colors cursor-pointer"
                          >
                            Terms &amp; Conditions
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── STATE D: WINNING RESULT (STRICT 10% DISCOUNT) ── */}
                  {modalState === "won" && wonReward && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <span className="text-[#68122F] text-xs sm:text-sm font-bold tracking-widest uppercase flex items-center justify-center lg:justify-start gap-1.5">
                          🎉 CONGRATULATIONS!
                        </span>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1D1D1F] mt-1">
                          YOU WON 10% OFF YOUR ORDER!
                        </h2>
                        <p className="text-xs sm:text-sm text-[#6E6E73] mt-1">
                          Your special 10% first-order discount has been unlocked.
                        </p>
                      </div>

                      {/* 10% Discount Coupon Card */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white to-[#FBF8F9] border-2 border-[#E7D8DF] shadow-md flex items-center gap-4 text-left">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#68122F] text-white p-2 shrink-0 flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                          <span className="text-xl sm:text-2xl font-black leading-none text-[#FFE875]">10%</span>
                          <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">OFF</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold uppercase mb-1">
                            ✓ Coupon Code Auto-Applied
                          </span>
                          <h4 className="text-base sm:text-lg font-black text-[#1D1D1F] tracking-tight">
                            PROMO CODE: <span className="font-mono text-[#68122F] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">1PLACE10</span>
                          </h4>
                          <p className="text-xs font-semibold text-emerald-700 mt-1">
                            10% off your entire order at checkout!
                          </p>
                        </div>
                      </div>

                      {/* Important Redemption Notice */}
                      <div className="p-3 rounded-xl bg-white border border-[#E5E5E7] text-[11px] sm:text-xs text-[#6E6E73] text-left flex items-start gap-2.5">
                        <HelpCircle className="w-4 h-4 text-[#68122F] shrink-0 mt-0.5" />
                        <p>
                          <strong className="text-[#1D1D1F]">Redemption:</strong> Coupon code <code className="font-bold text-[#68122F]">1PLACE10</code> has been saved to your session. It will be deducted automatically from your cart total!
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          onClick={() => {
                            handleClose();
                            router.push("/products");
                          }}
                          className="py-3.5 px-4 rounded-xl bg-[#68122F] hover:bg-[#520D23] text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>Shop Products (10% Off)</span>
                        </button>
                        <button
                          onClick={() => {
                            handleClose();
                            router.push("/checkout");
                          }}
                          className="py-3.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-[#1D1D1F] font-bold text-xs sm:text-sm border border-[#E5E5E7] transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Go to Checkout</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── STATE: INELIGIBLE / ALREADY CLAIMED ── */}
                  {modalState === "ineligible" && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#F2E9ED] border border-[#E7D8DF] flex items-center justify-center text-[#68122F] mx-auto lg:mx-0">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-semibold text-[#1D1D1F]">
                          First Order Offer Notice
                        </h3>
                        <p className="text-xs sm:text-sm text-[#6E6E73] mt-1 leading-relaxed">
                          {ineligibleReason ||
                            "This exclusive promotion is valid only for new customers placing their first qualifying order."}
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            handleClose();
                            router.push("/products");
                          }}
                          className="w-full py-3.5 px-6 rounded-2xl bg-[#68122F] text-white font-semibold text-sm hover:bg-[#520D23] transition-all active:scale-95 cursor-pointer"
                        >
                          Explore Best Deals
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Terms & Conditions Collapsible Box */}
                  {showTerms && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-3.5 rounded-2xl bg-white border border-[#E5E5E7] text-[11px] text-[#6E6E73] text-left max-h-[140px] overflow-y-auto whitespace-pre-line scrollbar-thin"
                    >
                      <p className="font-semibold text-[#1D1D1F] text-xs mb-1">Terms &amp; Conditions</p>
                      {settings.termsAndConditions || DEFAULT_SPIN_SETTINGS.termsAndConditions}
                    </motion.div>
                  )}
                </div>

                {/* ══ RIGHT COLUMN: INTERACTIVE PRIZE WHEEL ══ */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-2 sm:py-4">
                  <div className="flex items-center justify-center">
                    <SpinWheel
                      segments={settings.segments || DEFAULT_SPIN_SETTINGS.segments}
                      rotation={wheelRotation}
                      isSpinning={isWheelSpinning}
                      onSpinEnd={handleSpinEnd}
                      onWheelClick={handleSpinClick}
                      size={290}
                    />
                  </div>

                  {/* Subtle helper text beneath wheel on mobile */}
                  <p className="text-[10px] text-[#86868B] text-center mt-3 tracking-wider uppercase font-semibold">
                    {modalState === "spinning"
                      ? "Spinning... Good luck!"
                      : modalState === "won"
                      ? "Reward Confirmed!"
                      : "Tap Button to Spin"}
                  </p>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Spin & Win launcher */}
      {!isOpen && (
        <button
          id="spin-win-floating-trigger"
          onClick={() => {
            setModalState("welcome");
            setIsOpen(true);
          }}
          aria-label="Spin & Win Free Gifts"
          className="flex fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 z-40 h-12 w-12 md:w-auto gap-2 rounded-full border border-[#E5E5E7] bg-white/95 px-0 md:px-4 text-[#68122F] items-center justify-center shadow-[0_5px_20px_rgba(29,29,31,0.14)] hover:shadow-[0_8px_24px_rgba(29,29,31,0.18)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#68122F] focus:ring-offset-2"
        >
          <RotateCw className="w-4 h-4" />
          <span className="hidden md:inline text-xs font-semibold tracking-wide">Spin &amp; Win</span>
        </button>
      )}
    </>
  );
}
