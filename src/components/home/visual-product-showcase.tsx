"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VisualShowcaseSettings, VisualShowcaseSlide, ShowcasePlacement } from "@/lib/types";
import { DEFAULT_SHOWCASE_SETTINGS } from "@/lib/data";
import { normalizeImageUrl } from "@/lib/utils";

interface VisualProductShowcaseProps {
  settings?: VisualShowcaseSettings | null;
  placement?: ShowcasePlacement | string;
  singleSlide?: VisualShowcaseSlide;
  slides?: VisualShowcaseSlide[];
  className?: string;
}

export default function VisualProductShowcase({ settings, placement, singleSlide, slides, className }: VisualProductShowcaseProps) {
  const showcase = settings || DEFAULT_SHOWCASE_SETTINGS;
  const prefersReducedMotion = useReducedMotion();

  // Filter only active/enabled slides for THIS placement position (or direct slides / single slide)
  const activeSlides: VisualShowcaseSlide[] = singleSlide
    ? singleSlide.enabled !== false
      ? [singleSlide]
      : []
    : slides && slides.length > 0
    ? slides.filter((s) => s.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0))
    : (
        showcase.slides && showcase.slides.length > 0
          ? showcase.slides.filter((s) => {
              if (s.enabled === false) return false;
              if (placement) {
                const slidePlacement = s.placement || showcase.placement || "below_category";
                return slidePlacement === placement;
              }
              return true;
            })
          : (DEFAULT_SHOWCASE_SETTINGS.slides || []).filter((s) => {
              if (s.enabled === false) return false;
              if (placement) {
                const slidePlacement = s.placement || DEFAULT_SHOWCASE_SETTINGS.placement || "below_category";
                return slidePlacement === placement;
              }
              return true;
            })
      ).sort((a, b) => (a.order || 0) - (b.order || 0));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const totalSlides = activeSlides.length;
  const autoSlide = showcase.auto_slide ?? true;
  const slideInterval = showcase.slide_interval ?? 6000;

  // Next / Prev Handlers
  const handleNext = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Auto-slide timer with pause on hover
  useEffect(() => {
    if (!autoSlide || totalSlides <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, slideInterval);

    return () => clearInterval(timer);
  }, [autoSlide, totalSlides, isPaused, slideInterval, handleNext]);

  // Touch Swipe Handlers for Mobile
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  // Keyboard arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
  };

  if (showcase.enabled === false || totalSlides === 0) {
    return null;
  }

  const currentSlide = activeSlides[currentIndex] || activeSlides[0];
  const targetProductUrl = currentSlide.primary_cta_url || "/products";

  // Background computation
  const isImageBg = currentSlide.bg_type === "image" && Boolean(currentSlide.bg_image);
  const bgImageUrl = normalizeImageUrl(currentSlide.bg_image || "");
  const bgImageMobileUrl = normalizeImageUrl(currentSlide.bg_image_mobile || bgImageUrl);
  const desktopImg = normalizeImageUrl(currentSlide.desktop_image || "");
  const mobileImg = normalizeImageUrl(currentSlide.mobile_image || desktopImg);
  const overlayOpacity = (currentSlide.bg_overlay_opacity ?? (isImageBg ? 20 : 0)) / 100;
  const overlayColor = currentSlide.bg_overlay_color || "#000000";

  const backgroundStyle: React.CSSProperties = isImageBg
    ? { backgroundColor: "#0A0A0A" }
    : currentSlide.bg_type === "color" && currentSlide.bg_color
    ? { backgroundColor: currentSlide.bg_color }
    : {
        background: `linear-gradient(180deg, ${
          currentSlide.bg_gradient_from || "#F2F6FA"
        } 0%, ${currentSlide.bg_gradient_to || "#FFFFFF"} 100%)`,
      };

  // Text elements check
  const hasEyebrow = Boolean(currentSlide.eyebrow && currentSlide.eyebrow.trim().length > 0);
  const hasTitle = Boolean(currentSlide.title && currentSlide.title.trim().length > 0);
  const hasSubtitle = Boolean(currentSlide.subtitle && currentSlide.subtitle.trim().length > 0);
  const hasPrimaryCta = Boolean(currentSlide.primary_cta_text && currentSlide.primary_cta_text.trim().length > 0);
  const hasSecondaryCta = Boolean(
    currentSlide.show_secondary_cta !== false &&
    currentSlide.secondary_cta_text &&
    currentSlide.secondary_cta_text.trim().length > 0
  );
  const hasButtons = hasPrimaryCta || hasSecondaryCta;
  const hasHeaderContent = hasEyebrow || hasTitle || hasSubtitle || hasButtons;

  const hasForegroundImage = Boolean(
    currentSlide.desktop_image && currentSlide.desktop_image.trim().length > 0
  );

  const isFloatingAnimationEnabled =
    !prefersReducedMotion &&
    currentSlide.enable_animation !== false &&
    showcase.enable_animation !== false;

  // Alignment classes
  const textAlign = currentSlide.text_align || "center";
  const alignClass =
    textAlign === "left"
      ? "text-left items-start"
      : textAlign === "right"
      ? "text-right items-end"
      : "text-center items-center";

  const buttonsJustifyClass =
    textAlign === "left"
      ? "justify-start"
      : textAlign === "right"
      ? "justify-end"
      : "justify-center";

  const contentPos = currentSlide.content_position || "center";
  const desktopJustifyClass = hasForegroundImage
    ? "justify-between"
    : contentPos === "top"
    ? "justify-start pt-12 md:pt-16 pb-8"
    : contentPos === "bottom"
    ? "justify-end pb-12 md:pb-16 pt-8"
    : "justify-center py-12 md:py-20";

  return (
    <>
      {/* ── Mobile Layout (< 768px): Full-Width Edge-to-Edge Showcase Banner ── */}
      <section
        className="md:hidden relative w-full max-w-full overflow-hidden select-none border-0 m-0 p-0 rounded-none shadow-none"
        style={backgroundStyle}
        aria-label={showcase.section_title || "Featured Visual Showcase"}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Full Background Image if bg_type === 'image' */}
        {isImageBg && (
          <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <img
              src={bgImageMobileUrl}
              alt={currentSlide.title || "Showcase Banner"}
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
            {overlayOpacity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
              />
            )}
          </div>
        )}

        {/* ── Slide Frame / Container ── */}
        {(() => {
          const mobileRatio = currentSlide.banner_size_ratio_mobile || (currentSlide as any).bannerSizeRatioMobile || currentSlide.banner_size_ratio || "default";
          return (
            <div
              className={`relative w-full ${
                mobileRatio === "1080x1080"
                  ? "aspect-square min-h-[380px] justify-center"
                  : mobileRatio === "860x270"
                  ? "aspect-[860/270] min-h-[180px] justify-center"
                  : mobileRatio === "1920x850"
                  ? "aspect-[1920/850] min-h-[220px] justify-center"
                  : mobileRatio === "1080x1440"
                  ? "aspect-[1080/1440] min-h-[440px] justify-center"
                  : mobileRatio === "1024x387" || mobileRatio === "widescreen"
                  ? "aspect-[1024/387] min-h-[200px] justify-center"
                  : hasForegroundImage
                  ? "min-h-[420px] justify-between"
                  : "min-h-[300px] justify-center"
              } border-0 rounded-none shadow-none flex flex-col items-center pt-6 px-4 pb-4 z-10`}
            >
          {/* Top Content Block: Badge -> Heading -> Subtitle -> Action CTAs */}
          <div className={`relative z-10 w-full flex flex-col max-w-md mx-auto space-y-2 ${alignClass}`}>
            {/* 1. Eyebrow / Campaign Badge */}
            {hasEyebrow ? (
              <div className="flex items-center gap-1.5 select-none">
                <span
                  className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs"
                  style={{
                    backgroundColor: currentSlide.eyebrow_bg || "#000000",
                    color: currentSlide.eyebrow_color || "#FFFFFF",
                  }}
                >
                  {currentSlide.eyebrow}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 select-none">
                <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-neutral-900 text-white shadow-2xs">
                  New
                </span>
              </div>
            )}

            {/* 2. Main Heading (Centered or aligned) */}
            {hasTitle && (
              <h2
                className="text-2xl sm:text-3xl font-black tracking-tight leading-tight transition-colors drop-shadow-xs"
                style={{ color: currentSlide.heading_color || (isImageBg ? "#FFFFFF" : "#1D1D1F") }}
              >
                {currentSlide.title}
              </h2>
            )}

            {/* 3. Subtitle */}
            {hasSubtitle && (
              <p
                className="text-xs sm:text-sm font-normal max-w-xs leading-relaxed"
                style={{ color: currentSlide.subtitle_color || (isImageBg ? "#E5E5E5" : "#6E6E73") }}
              >
                {currentSlide.subtitle}
              </p>
            )}

            {/* 4. Action CTA Buttons */}
            {hasButtons && (
              <div className={`flex flex-wrap items-center gap-2.5 pt-1 z-20 ${buttonsJustifyClass}`}>
                {hasPrimaryCta && (
                  <Link
                    href={currentSlide.primary_cta_url || "/products"}
                    className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-neutral-900 hover:bg-black text-white transition-all active:scale-95 shadow-sm"
                  >
                    {currentSlide.primary_cta_text}
                  </Link>
                )}

                {hasSecondaryCta && (
                  <Link
                    href={currentSlide.secondary_cta_url || "/products"}
                    className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium border border-current/30 hover:border-current transition-all active:scale-95 backdrop-blur-xs bg-white/10"
                    style={{
                      color: currentSlide.heading_color || (isImageBg ? "#FFFFFF" : "#1D1D1F"),
                    }}
                  >
                    {currentSlide.secondary_cta_text}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Lower Product Visual: Only rendered if foreground product image exists */}
          {hasForegroundImage && (
            <div className="relative w-full flex-1 flex items-end justify-center overflow-visible min-h-[260px] sm:min-h-[300px] pt-4 pb-2 mt-auto">
              <Link
                href={targetProductUrl}
                aria-label={`View ${currentSlide.title || "featured product"}`}
                className="w-full flex items-end justify-center"
              >
                <img
                  src={mobileImg || desktopImg || "/placeholder-phone.webp"}
                  alt={currentSlide.title || "Featured Visual"}
                  loading="lazy"
                  className="max-h-[290px] sm:max-h-[340px] w-auto max-w-[96%] object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.15)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-phone.webp";
                  }}
                />
              </Link>
            </div>
          )}

            {/* Mobile Pagination Indicator Dots (if > 1 slide) */}
            {totalSlides > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-3 pb-1 z-20">
                {activeSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all rounded-full ${
                      idx === currentIndex
                        ? isImageBg ? "w-4 h-1.5 bg-white" : "w-4 h-1.5 bg-neutral-900"
                        : isImageBg ? "w-1.5 h-1.5 bg-white/40" : "w-1.5 h-1.5 bg-neutral-400/60"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </section>

      {/* ── Desktop Layout (>= 768px) ── */}
      <section
        aria-label={showcase.section_title || "Featured Visual Showcase"}
        className="hidden md:block relative w-full overflow-hidden select-none transition-colors duration-500"
        style={backgroundStyle}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Full Background Image if bg_type === 'image' */}
        {isImageBg && (
          <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <picture className="w-full h-full block">
              {currentSlide.bg_image_mobile && (
                <source media="(max-width: 768px)" srcSet={currentSlide.bg_image_mobile} />
              )}
              <img
                src={bgImageUrl}
                alt={currentSlide.image_alt || currentSlide.title || "Showcase Background"}
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </picture>
            {overlayOpacity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
              />
            )}
          </div>
        )}

        <div
          style={
            (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "1080x1080"
              ? { aspectRatio: "1 / 1", minHeight: "480px" }
              : (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "860x270"
              ? { aspectRatio: "860 / 270", minHeight: "260px" }
              : (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "1920x850"
              ? { aspectRatio: "1920 / 850", minHeight: "380px" }
              : (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "1080x1440"
              ? { aspectRatio: "1080 / 1440", minHeight: "560px" }
              : (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "1024x387" || (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "widescreen"
              ? { aspectRatio: "1024 / 387", minHeight: "360px" }
              : undefined
          }
          className={`relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col ${desktopJustifyClass} items-center ${
            (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "1080x1080"
              ? "aspect-square py-12 justify-center"
              : (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "860x270"
              ? "aspect-[860/270] py-6 justify-center"
              : (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "1920x850"
              ? "aspect-[1920/850] py-10 justify-center"
              : (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "1080x1440"
              ? "aspect-[1080/1440] py-16 justify-center"
              : (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "1024x387" || (currentSlide.banner_size_ratio || (currentSlide as any).bannerSizeRatio) === "widescreen"
              ? "aspect-[1024/387] py-8 justify-center"
              : hasForegroundImage
              ? "min-h-[480px] sm:min-h-[560px] md:min-h-[620px] lg:min-h-[680px] xl:min-h-[720px] pt-6 sm:pt-8 md:pt-10 pb-0"
              : "min-h-[440px] sm:min-h-[500px] md:min-h-[560px] lg:min-h-[620px]"
          } z-10`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id || `showcase-slide-${currentIndex}`}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full flex-1 flex flex-col ${desktopJustifyClass} items-center`}
            >
              {/* ── Top / Overlay Typography & Call-To-Action Block ── */}
              {hasHeaderContent && (
                <div className={`flex flex-col ${alignClass} max-w-3xl mx-auto z-10 space-y-2 sm:space-y-3 mb-1 sm:mb-2 w-full`}>
                  {/* Eyebrow Badge if set */}
                  {hasEyebrow && (
                    <div className="flex items-center gap-1.5 select-none mb-1">
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm"
                        style={{
                          backgroundColor: currentSlide.eyebrow_bg || "#000000",
                          color: currentSlide.eyebrow_color || "#FFFFFF",
                        }}
                      >
                        {currentSlide.eyebrow}
                      </span>
                    </div>
                  )}

                  {/* Product Heading (Clickable to Product) */}
                  {hasTitle && (
                    <Link href={targetProductUrl} className="group/title focus:outline-none">
                      <h2
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight transition-colors duration-300 group-hover/title:opacity-90 cursor-pointer drop-shadow-xs"
                        style={{ color: currentSlide.heading_color || (isImageBg ? "#FFFFFF" : "#1D1D1F") }}
                      >
                        {currentSlide.title}
                      </h2>
                    </Link>
                  )}

                  {/* Subtitle / Tagline */}
                  {hasSubtitle && (
                    <p
                      className="text-sm sm:text-base md:text-lg lg:text-xl font-normal max-w-xl leading-relaxed transition-colors duration-300"
                      style={{ color: currentSlide.subtitle_color || (isImageBg ? "#E5E5E5" : "#6E6E73") }}
                    >
                      {currentSlide.subtitle}
                    </p>
                  )}

                  {/* Action Buttons */}
                  {hasButtons && (
                    <div className={`flex flex-wrap items-center gap-3 pt-1 z-20 ${buttonsJustifyClass}`}>
                      {/* Primary CTA */}
                      {hasPrimaryCta && (
                        <Link
                          href={currentSlide.primary_cta_url || "/products"}
                          className="inline-flex items-center justify-center min-h-[38px] sm:min-h-[42px] px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium bg-neutral-900 hover:bg-black text-white transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md cursor-pointer"
                        >
                          {currentSlide.primary_cta_text}
                        </Link>
                      )}

                      {/* Secondary CTA */}
                      {hasSecondaryCta && (
                        <Link
                          href={currentSlide.secondary_cta_url || "/products"}
                          className="inline-flex items-center justify-center min-h-[38px] sm:min-h-[42px] px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium border border-current/30 hover:border-current transition-all duration-200 active:scale-95 backdrop-blur-xs bg-white/10 cursor-pointer"
                          style={{
                            color: currentSlide.heading_color || (isImageBg ? "#FFFFFF" : "#1D1D1F"),
                          }}
                        >
                          {currentSlide.secondary_cta_text}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Foreground Product Image (Rendered only if provided) ── */}
              {hasForegroundImage && (
                <div
                  className="relative w-full flex-1 flex items-end justify-center mt-1 sm:mt-2 pb-0 overflow-visible"
                >
                  <Link
                    href={targetProductUrl}
                    aria-label={`View ${currentSlide.title || "featured product"}`}
                    className="relative flex items-end justify-center w-full cursor-pointer focus:outline-none"
                  >
                    <motion.div
                      animate={isFloatingAnimationEnabled ? { y: [0, -6, 0] } : { y: 0 }}
                      transition={
                        isFloatingAnimationEnabled
                          ? {
                              duration: 5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                          : { duration: 0 }
                      }
                      className="relative flex items-end justify-center w-full max-w-5xl"
                    >
                      <picture className="w-full h-full flex items-end justify-center">
                        {mobileImg && (
                          <source media="(max-width: 640px)" srcSet={mobileImg} />
                        )}
                        <img
                          src={desktopImg || "/placeholder-phone.webp"}
                          alt={currentSlide.image_alt || currentSlide.title || "Featured Product Showcase"}
                          loading="lazy"
                          decoding="async"
                          className={`w-auto h-auto max-w-[98%] sm:max-w-[96%] md:max-w-[94%] ${
                            hasHeaderContent
                              ? "max-h-[360px] sm:max-h-[440px] md:max-h-[520px] lg:max-h-[580px] xl:max-h-[620px]"
                              : "max-h-[420px] sm:max-h-[500px] md:max-h-[580px] lg:max-h-[640px] xl:max-h-[680px]"
                          } object-contain object-bottom block drop-shadow-[0_20px_35px_rgba(0,0,0,0.15)] transition-transform duration-500 ease-out hover:scale-[1.01]`}
                        />
                      </picture>

                      {/* Ultra-soft ambient floor reflection / shadow */}
                      <div
                        className="absolute -bottom-1 w-4/5 max-w-2xl h-5 bg-neutral-900/5 rounded-full blur-lg pointer-events-none -z-10"
                        aria-hidden="true"
                      />
                    </motion.div>
                  </Link>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Navigation Controls & Pagination Dots (if > 1 slide) ── */}
          {totalSlides > 1 && (
            <div className="w-full flex items-center justify-between z-20 py-3 pointer-events-auto">
              {/* Prev Arrow */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous showcase slide"
                className={`p-2 rounded-full backdrop-blur-xs transition-all active:scale-90 ${
                  isImageBg
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-black/5 hover:bg-black/10 text-neutral-700 hover:text-neutral-900"
                }`}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Pagination Dots */}
              <div className="flex items-center gap-2">
                {activeSlides.map((slide, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={slide.id || idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      aria-label={`Go to slide ${idx + 1}: ${slide.title || "Showcase"}`}
                      className={`transition-all duration-300 rounded-full ${
                        isActive
                          ? isImageBg ? "w-7 h-2 bg-white" : "w-7 h-2 bg-neutral-900"
                          : isImageBg ? "w-2 h-2 bg-white/40 hover:bg-white/70" : "w-2 h-2 bg-neutral-400/50 hover:bg-neutral-600"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Next Arrow */}
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next showcase slide"
                className={`p-2 rounded-full backdrop-blur-xs transition-all active:scale-90 ${
                  isImageBg
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-black/5 hover:bg-black/10 text-neutral-700 hover:text-neutral-900"
                }`}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
