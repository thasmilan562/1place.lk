"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Zap, ShieldCheck } from "lucide-react";

const STATUS_MESSAGES = [
  "Initializing 1PLACE.LK...",
  "Loading Genuine Devices & Accessories...",
  "Syncing Exclusive Offers...",
  "Welcome to 1PLACE.LK"
];

export default function AppLoadingScreen() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  // Don't show public splash for admin pages to keep backend fast
  const isAdmin = useMemo(() => pathname?.startsWith("/admin"), [pathname]);

  useEffect(() => {
    if (isAdmin) {
      setIsVisible(false);
      return;
    }

    // Lock body scroll while splash is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Smooth incremental progress counter
    const startTime = Date.now();
    const minDuration = 1000; // 1s smooth splash feel
    const maxDuration = 1800; // Safety cap

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const calculatedProgress = Math.min(100, Math.round((elapsed / minDuration) * 100));

      setProgress((prev) => {
        const next = Math.max(prev, calculatedProgress);
        if (next < 30) setStatusIndex(0);
        else if (next < 65) setStatusIndex(1);
        else if (next < 90) setStatusIndex(2);
        else setStatusIndex(3);
        return next;
      });

      // Complete once duration elapsed and window ready
      if (elapsed >= minDuration) {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setIsVisible(false);
          document.body.style.overflow = originalOverflow;
        }, 300);
      }
    }, 30);

    // Ultimate fallback safeguard
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setIsVisible(false);
      document.body.style.overflow = originalOverflow;
    }, maxDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      document.body.style.overflow = originalOverflow;
    };
  }, [isAdmin]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="app-loading-screen"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.03,
            filter: "blur(6px)",
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-white text-[#090909] select-none overflow-hidden touch-none font-outfit"
          style={{ willChange: "opacity, transform, filter" }}
        >
          {/* ── Ambient Background Glow Effects (Clean Light Mode) ── */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Top Soft Aura */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.35, 0.6, 0.35],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full bg-gradient-to-b from-neutral-100 via-neutral-200/50 to-transparent blur-[80px]"
            />
            {/* Center Subtle Glow */}
            <motion.div
              animate={{
                scale: [0.95, 1.1, 0.95],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full bg-neutral-100 blur-[60px]"
            />
            {/* Subtle Dot Grid Background */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, #000000 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>

          {/* ── Center Content Container ── */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-sm w-full mx-auto">
            {/* 1. Glowing Logo Container */}
            <div className="relative mb-7 flex items-center justify-center">
              {/* Outer Pulsing Rings */}
              <motion.div
                animate={{
                  scale: [1, 1.18, 1],
                  opacity: [0.35, 0.7, 0.35],
                  rotate: [0, 180, 360],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-dashed border-neutral-300"
              />
              <motion.div
                animate={{
                  scale: [1.1, 0.96, 1.1],
                  opacity: [0.2, 0.5, 0.2],
                  rotate: [360, 180, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-neutral-200"
              />

              {/* Logo Card with Clean White Background & Soft Shadow */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-22 h-22 sm:w-26 sm:h-26 rounded-3xl bg-white border border-neutral-200/80 p-3.5 flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.08)] overflow-hidden"
              >
                <img
                  src="/icon.svg"
                  alt="1PLACE.LK"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                />
              </motion.div>
            </div>

            {/* 2. Brand Titles & Badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-center mb-6"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-[0.2em] text-[#090909] uppercase drop-shadow-xs flex items-center justify-center gap-1.5">
                <span>1PLACE.LK</span>
              </h1>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <span className="h-px w-3 bg-neutral-300" />
                <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
                  COLOMBO • SRI LANKA
                </p>
                <span className="h-px w-3 bg-neutral-300" />
              </div>
            </motion.div>

            {/* 3. Progress Bar & Percent Indicator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="w-full max-w-[240px] flex flex-col items-center gap-2.5"
            >
              {/* Progress Track */}
              <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/80 p-[1px] relative shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-neutral-700 to-black relative"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.1 }}
                >
                  {/* Leading Head */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-black shadow-[0_0_6px_rgba(0,0,0,0.35)]" />
                </motion.div>
              </div>

              {/* Status and Percentage Label */}
              <div className="w-full flex items-center justify-between text-[11px] text-neutral-500 font-mono pt-0.5">
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-2.5 h-2.5 rounded-full border border-neutral-400 border-t-black"
                  />
                  <span className="text-[10px] font-medium tracking-wider text-neutral-600 font-sans truncate max-w-[170px]">
                    {STATUS_MESSAGES[statusIndex]}
                  </span>
                </div>
                <span className="font-bold text-[#090909] tracking-wider">{progress}%</span>
              </div>
            </motion.div>

            {/* 4. Trust Badges Micro-Pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex items-center justify-center gap-2.5 mt-8 text-[10px] text-neutral-600 font-medium"
            >
              <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-200/90 px-2.5 py-1 rounded-full shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-black" />
                <span>100% Genuine</span>
              </div>
              <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-200/90 px-2.5 py-1 rounded-full shadow-2xs">
                <Zap className="w-3 h-3 text-black" />
                <span>Fast Delivery</span>
              </div>
            </motion.div>
          </div>

          {/* ── Bottom Secure Watermark ── */}
          <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
            <p className="text-[9px] tracking-[0.3em] text-neutral-400 uppercase font-semibold">
              1PLACE.LK (PVT) LTD
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
