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

  // 1. Fetch promotion settings on mount
  useEffect(() => {
    fetch("/api/spin-and-win/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings);

          // Check if modal should auto-open
          if (data.settings.enabled && data.settings.popupEnabled) {
            try {
              const dismissedAt = localStorage.getItem(DISMISSED_STORAGE_KEY);
              const oneDayMs = 24 * 60 * 60 * 1000;
              if (!dismissedAt || Date.now() - Number(dismissedAt) > oneDayMs) {
                // Auto show after a gentle 1.5s delay
                const timer = setTimeout(() => {
                  setIsOpen(true);
                }, 1500);
                return () => clearTimeout(timer);
              }
            } catch (e) {
              setIsOpen(true);
            }
          }
        }
      })
      .catch((err) => console.warn("Failed to load spin settings:", err));
  }, []);

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
      setWinningSegment(segment);
      setWonReward(reward);
      setWonGiftProduct(giftProduct);

      // Calculate deceleration landing angle
      const segments = settings.segments || DEFAULT_SPIN_SETTINGS.segments;
      const numSegments = segments.length || 6;
      const sliceAngle = 360 / numSegments;

      // Pointer is at the top (90 deg counter-clockwise in SVG coordinates, or top 0)
      const targetSliceCenter = winningSegmentIndex * sliceAngle + sliceAngle / 2;
      const landingOffset = 360 - targetSliceCenter;
      const dramaticSpins = 360 * 6; // 6 full turns
      const nextRotation = wheelRotation + dramaticSpins + ((landingOffset - (wheelRotation % 360) + 360) % 360);

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

    // Automatically integrate reward into cart!
    if (wonReward) {
      if (wonReward.rewardType === "gift" && wonGiftProduct) {
        addFreeGiftToCart(
          {
            productId: wonGiftProduct.id,
            name: wonGiftProduct.name,
            image: wonGiftProduct.image,
            originalPrice: wonGiftProduct.originalPrice,
          },
          wonReward.id
        );
      } else if (wonReward.rewardType === "free_shipping") {
        setShippingReward(wonReward);
      }
    }
  };

  if (!settings.enabled || pathname?.startsWith("/admin")) return null;

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
              className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-[860px] max-h-[92vh] overflow-y-auto rounded-[28px] sm:rounded-[36px] bg-gradient-to-b from-[#1C050D] via-[#111111] to-[#0A0A0A] border border-[#64152F]/70 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-white z-10 scrollbar-thin"
              style={{
                boxShadow: "0 0 50px rgba(100, 21, 47, 0.35), 0 20px 40px rgba(0,0,0,0.9)",
              }}
            >
              {/* Confetti Explosion on confirmed win */}
              {modalState === "won" && <ConfettiExplosion />}

              {/* Close Button */}
              <button
                onClick={handleClose}
                aria-label="Close promotion popup"
                className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md border border-white/10"
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
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-[#64152F] to-[#8A1C3E] border border-[#FFE875]/40 text-[#FFE875] text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-md">
                      <span>{settings.badgeText || "FIRST ORDER SPECIAL"}</span>
                    </div>
                  </div>

                  {/* ── STATE A: WELCOME & SPINNING ── */}
                  {(modalState === "welcome" || modalState === "spinning") && (
                    <>
                      <div>
                        <h2
                          id="promo-heading"
                          className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-[1.15] bg-gradient-to-r from-white via-white to-white/75 bg-clip-text text-transparent"
                        >
                          {settings.heading || "YOUR FIRST ORDER DESERVES A GIFT!"}
                        </h2>
                        <p className="text-white/70 text-xs sm:text-sm mt-2 sm:mt-3 leading-relaxed max-w-md mx-auto lg:mx-0">
                          {settings.description ||
                            "Place your first order and unlock your chance to WIN A FREE GIFT! Every spin is guaranteed to reward you."}
                        </p>
                      </div>

                      {/* Reward Teasers Grid */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
                        <div className="p-2 sm:p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center flex flex-col items-center">
                          <span className="text-xl sm:text-2xl mb-1">🎁</span>
                          <span className="text-[10px] sm:text-[11px] font-bold text-white/90 leading-tight">
                            Free Gift Box
                          </span>
                        </div>
                        <div className="p-2 sm:p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center flex flex-col items-center">
                          <span className="text-xl sm:text-2xl mb-1">🚚</span>
                          <span className="text-[10px] sm:text-[11px] font-bold text-white/90 leading-tight">
                            Free Delivery
                          </span>
                        </div>
                        <div className="p-2 sm:p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center flex flex-col items-center">
                          <span className="text-xl sm:text-2xl mb-1">🎧</span>
                          <span className="text-[10px] sm:text-[11px] font-bold text-white/90 leading-tight">
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
                          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#D90429] via-[#EF233C] to-[#D90429] text-white font-black text-sm sm:text-base tracking-wide uppercase transition-all shadow-[0_8px_25px_rgba(217,4,41,0.45)] hover:shadow-[0_10px_35px_rgba(217,4,41,0.6)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border border-[#FF8597]/40 relative overflow-hidden group"
                        >
                          {spinningLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Validating Eligibility...</span>
                            </>
                          ) : isWheelSpinning ? (
                            <>
                              <Gift className="w-5 h-5 animate-bounce text-[#FFE875]" />
                              <span>Spinning For Your Gift...</span>
                            </>
                          ) : (
                            <>
                              <Gift className="w-5 h-5 text-[#FFE875]" />
                              <span>SPIN NOW &amp; WIN FREE GIFT</span>
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
                          className="w-full py-3 px-5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white/90 font-bold text-xs sm:text-sm tracking-wide uppercase transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                        >
                          <span>SHOP NOW &amp; UNLOCK YOUR SPIN</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <div className="flex items-center justify-center lg:justify-start gap-3 text-[11px] text-white/40">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% Genuine Tech
                          </span>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setShowTerms(!showTerms)}
                            className="underline hover:text-white/70 transition-colors cursor-pointer"
                          >
                            Terms &amp; Conditions
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── STATE D: WINNING RESULT ── */}
                  {modalState === "won" && wonReward && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <span className="text-amber-400 text-xs sm:text-sm font-extrabold tracking-widest uppercase">
                          🎉 CONGRATULATIONS!
                        </span>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white mt-1">
                          {wonReward.rewardType === "gift"
                            ? `YOU WON A ${wonReward.productName || wonReward.segmentLabel}!`
                            : wonReward.rewardType === "free_shipping"
                            ? "YOU WON FREE ISLANDWIDE SHIPPING!"
                            : `YOU WON ${wonReward.segmentLabel}!`}
                        </h2>
                      </div>

                      {/* Automatic Cart Success Card */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#64152F]/40 to-[#111111]/80 border border-[#FFE875]/40 shadow-xl flex items-center gap-4 text-left">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/40 border border-[#FFE875]/30 p-2 shrink-0 flex items-center justify-center overflow-hidden relative">
                          <img
                            src={wonReward.productImage || "/assets/promo/gift-box.png"}
                            alt={wonReward.productName || "Reward"}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder-phone.webp";
                            }}
                          />
                          <span className="absolute top-1 left-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded">
                            FREE
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase mb-1">
                            ✓ Automatically Added to Bag
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-white truncate">
                            {wonReward.productName || wonReward.segmentLabel}
                          </h4>
                          <p className="text-xs font-black text-emerald-400 mt-0.5">
                            Price: LKR 0 (Promotional Gift)
                          </p>
                        </div>
                      </div>

                      {/* Important Redemption Notice */}
                      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] sm:text-xs text-white/70 text-left flex items-start gap-2.5">
                        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p>
                          <strong className="text-white">Redemption Policy:</strong> Simply add any regular smartphone, audio, or tech item to your bag to checkout with your free gift.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          onClick={() => {
                            handleClose();
                            if (typeof window !== "undefined") {
                              window.dispatchEvent(new CustomEvent("open-cart-drawer"));
                            }
                          }}
                          className="py-3.5 px-4 rounded-xl bg-white text-black font-extrabold text-xs sm:text-sm hover:bg-neutral-200 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>View My Cart</span>
                        </button>
                        <button
                          onClick={() => {
                            handleClose();
                            router.push("/products");
                          }}
                          className="py-3.5 px-4 rounded-xl bg-[#64152F] hover:bg-[#8A1C3E] text-white font-extrabold text-xs sm:text-sm border border-[#FFE875]/40 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Shop Products</span>
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
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto lg:mx-0">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                          First Order Offer Notice
                        </h3>
                        <p className="text-xs sm:text-sm text-white/70 mt-1 leading-relaxed">
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
                          className="w-full py-3.5 px-6 rounded-2xl bg-white text-black font-extrabold text-sm hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer"
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
                      className="mt-3 p-3.5 rounded-2xl bg-black/60 border border-white/10 text-[11px] text-white/60 text-left max-h-[140px] overflow-y-auto whitespace-pre-line scrollbar-thin"
                    >
                      <p className="font-bold text-white text-xs mb-1">Terms &amp; Conditions</p>
                      {settings.termsAndConditions || DEFAULT_SPIN_SETTINGS.termsAndConditions}
                    </motion.div>
                  )}
                </div>

                {/* ══ RIGHT COLUMN: INTERACTIVE PRIZE WHEEL ══ */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-2 sm:py-4">
                  <div className="transform scale-95 sm:scale-100 transition-transform">
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
                  <p className="text-[10px] text-white/40 text-center mt-3 tracking-wider uppercase font-semibold">
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

      {/* Floating Burgundy Gift Launcher Button (matching UI reference) */}
      {!isOpen && (
        <button
          id="spin-win-floating-trigger"
          onClick={() => {
            setModalState("welcome");
            setIsOpen(true);
          }}
          aria-label="Spin & Win Free Gifts"
          className="hidden md:flex fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#68122F] hover:bg-[#520d23] text-white items-center justify-center shadow-[0_8px_25px_rgba(104,18,47,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#68122F] focus:ring-offset-2"
        >
          <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </button>
      )}
    </>
  );
}
