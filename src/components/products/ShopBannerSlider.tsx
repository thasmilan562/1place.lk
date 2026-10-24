"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Tag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { OfferBanner } from "@/lib/types";
import { normalizeImageUrl } from "@/lib/utils";

// Default fallback offer banners if none are added in admin yet
const DEFAULT_SHOP_BANNERS: OfferBanner[] = [
  {
    id: "default-shop-1",
    internalName: "Mega Sale 2026",
    headline: "PREMIUM SMARTPHONES & ACCESSORIES",
    highlightText: "UP TO 35% OFF",
    description: "Exclusive deals on Apple, Samsung, Xiaomi & Original Accessories in Sri Lanka.",
    badgeText: "HOT DEAL",
    primaryCtaText: "Explore Offers",
    primaryCtaUrl: "/products",
    desktopImage: "https://images.unsplash.com/photo-1616469829941-c7200edec809?q=80&w=1600&auto=format&fit=crop",
    mobileImage: "https://images.unsplash.com/photo-1616469829941-c7200edec809?q=80&w=800&auto=format&fit=crop",
    placement: "shop_top",
    status: "active",
  },
  {
    id: "default-shop-2",
    internalName: "Express Repair Promo",
    headline: "EXPRESS MOBILE REPAIR SERVICE",
    highlightText: "SAME-DAY REPAIR",
    description: "Screen replacement, battery upgrades & hardware fixes with genuine warranty.",
    badgeText: "QUICK SERVICE",
    primaryCtaText: "Book Repair",
    primaryCtaUrl: "/contact",
    desktopImage: "https://images.unsplash.com/photo-1597740985671-2a8a3b80502e?q=80&w=1600&auto=format&fit=crop",
    mobileImage: "https://images.unsplash.com/photo-1597740985671-2a8a3b80502e?q=80&w=800&auto=format&fit=crop",
    placement: "shop_top",
    status: "active",
  },
];

interface ShopBannerSliderProps {
  banners?: OfferBanner[];
}

export default function ShopBannerSlider({ banners = [] }: ShopBannerSliderProps) {
  const activeBanners = banners.length > 0 ? banners : DEFAULT_SHOP_BANNERS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto slide interval
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused]);

  if (activeBanners.length === 0) return null;

  const current = activeBanners[currentIndex];

  // Extract images queue for multi-slide per banner or across banners
  const slideImages = useMemo(() => {
    if (!current) return [];
    const imgs: string[] = [];
    if (current.desktopImage) imgs.push(normalizeImageUrl(current.desktopImage));
    if (current.mobileImage) {
      const normMob = normalizeImageUrl(current.mobileImage);
      if (normMob && !imgs.includes(normMob)) imgs.push(normMob);
    }
    if (current.additionalImages && current.additionalImages.length > 0) {
      current.additionalImages.forEach((img) => {
        const norm = normalizeImageUrl(img);
        if (norm && !imgs.includes(norm)) imgs.push(norm);
      });
    }
    return imgs.length > 0 ? imgs : ["https://images.unsplash.com/photo-1616469829941-c7200edec809?q=80&w=1600&auto=format&fit=crop"];
  }, [current]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Auto rotate sub-images if multiple images provided for current banner
  useEffect(() => {
    setActiveImageIndex(0);
  }, [currentIndex]);

  useEffect(() => {
    if (slideImages.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % slideImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slideImages.length, isPaused]);

  const currentImage = normalizeImageUrl(slideImages[activeImageIndex] || slideImages[0]);

  const handlePrev = () => {
    if (slideImages.length > 1 && activeImageIndex > 0) {
      setActiveImageIndex((prev) => prev - 1);
    } else {
      setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
    }
  };

  const handleNext = () => {
    if (slideImages.length > 1 && activeImageIndex < slideImages.length - 1) {
      setActiveImageIndex((prev) => prev + 1);
    } else {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }
  };

  const textAnim = current?.textAnimationMode || "glow";

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-2xl mb-8 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Animated Announcement Ticker Bar (Top Ticker) ── */}
      {(current.showAnnouncementTicker || current.announcementText) && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black px-4 py-1.5 text-xs font-black uppercase tracking-wider flex items-center justify-between overflow-hidden shadow-sm relative z-30">
          <div className="flex items-center gap-2 animate-pulse shrink-0">
            <span>SPECIAL ANNOUNCEMENT:</span>
          </div>
          <div className="truncate font-extrabold mx-4 flex-1 text-center">
            {current.announcementText || "🔥 Special Discount Offers & Express Island-wide Shipping!"}
          </div>
          <span className="text-[10px] bg-black/10 px-2 py-0.5 rounded font-mono hidden sm:inline-block">
            LIMITED TIME
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.id || currentIndex}-${activeImageIndex}`}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="relative min-h-[240px] sm:min-h-[300px] md:min-h-[340px] flex items-center"
        >
          {/* Background Video or Image */}
          <div className="absolute inset-0 z-0">
            {current.videoUrl ? (
              <video
                src={current.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <img
                src={currentImage}
                alt={current.headline || "Offer Banner"}
                className="w-full h-full object-cover object-center transition-all duration-700"
              />
            )}
            {/* Gradient Overlays for readable text */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-transparent z-10"
              style={{ opacity: current.overlayOpacity ?? 0.85 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
          </div>

          {/* Content overlay */}
          <div className="relative z-20 max-w-4xl px-6 sm:px-10 py-8 md:py-12">
            {/* Badge */}
            {(current.badgeText || current.promoLabel) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400 text-black text-[11px] font-black uppercase tracking-wider mb-3 shadow-lg animate-pulse"
              >
                <Tag className="w-3.5 h-3.5" />
                {current.badgeText || current.promoLabel}
              </motion.div>
            )}

            {/* Headline with Text Animations */}
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: textAnim === "bounce" ? "spring" : "tween" }}
              className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white mb-2 ${
                textAnim === "glow" ? "drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]" : ""
              }`}
            >
              {current.headline}
            </motion.h2>

            {/* Highlight text */}
            {current.highlightText && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-lg sm:text-xl md:text-2xl font-black text-amber-400 mb-2 ${
                  textAnim === "pulse" ? "animate-pulse" : textAnim === "glow" ? "drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" : ""
                }`}
              >
                {current.highlightText}
              </motion.div>
            )}

            {/* Description */}
            {current.description && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-xs sm:text-sm text-gray-300 max-w-lg mb-6 line-clamp-2"
              >
                {current.description}
              </motion.p>
            )}

            {/* CTA Button */}
            {current.primaryCtaText && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Link
                  href={current.primaryCtaUrl || "/products"}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold text-xs sm:text-sm hover:bg-amber-400 transition-all shadow-xl hover:scale-105 active:scale-95"
                >
                  {current.primaryCtaText}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}
          </div>

          {/* Navigation Arrows */}
          {(activeBanners.length > 1 || slideImages.length > 1) && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 z-30 p-2.5 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                title="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 z-30 p-2.5 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                title="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Multi-Image & Banner Slide Indicators */}
          <div className="absolute bottom-4 right-6 z-30 flex items-center gap-2">
            {slideImages.map((_: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImageIndex(i)}
                className={`transition-all rounded-full ${
                  i === activeImageIndex
                    ? "w-6 h-2 bg-amber-400 shadow-sm"
                    : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
                title={`Image ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
