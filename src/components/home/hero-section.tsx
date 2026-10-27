"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Truck, Lock } from "lucide-react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getHeroSlides } from "@/lib/firestore-client";
import { DEFAULT_HERO_SLIDES } from "@/lib/data";
import { HeroSlide } from "@/lib/types";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { normalizeImageUrl } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const AUTOPLAY_DURATION = 5500; // 5.5s per slide default

export default function HeroSection() {
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const heroContentRef = useRef<HTMLDivElement | null>(null);
  const { motionSettings, isReducedMotion } = useSmoothScroll();

  // Touch Swipe Gesture State
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Apple-inspired scroll-linked hero parallax and scale
  useEffect(() => {
    if (isReducedMotion || motionSettings.enableHeroParallax === false) return;
    const heroEl = heroRef.current;
    const bgEl = heroBgRef.current;
    const contentEl = heroContentRef.current;
    if (!heroEl) return;

    const isMobile = window.innerWidth < 768;
    const maxTranslateY = isMobile ? -15 : -30;

    const ctx = gsap.context(() => {
      if (bgEl) {
        gsap.fromTo(
          bgEl,
          { scale: 1.03 },
          {
            scale: 1.0,
            ease: "none",
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "bottom top",
              scrub: 0.5,
            },
          }
        );
      }

      if (contentEl) {
        gsap.to(contentEl, {
          y: maxTranslateY,
          opacity: 0.88,
          ease: "none",
          scrollTrigger: {
            trigger: heroEl,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, [isReducedMotion, motionSettings.enableHeroParallax]);

  // Load hero slides with real-time onSnapshot listener for instant updates
  useEffect(() => {
    let isMounted = true;

    // 1. Initial cached/server fetch for instant hydration
    getHeroSlides()
      .then((res) => {
        if (isMounted && res && res.length > 0) {
          setSlides(res);
        }
      })
      .catch(() => {
        // Fallback already in place
      });

    // 2. Real-time Firestore subscription: updates automatically when administrator changes image URL or settings
    try {
      const q = query(collection(db, "hero_slides"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          if (!snapshot.empty) {
            const rawDocs = snapshot.docs.map((d) => {
              const data = d.data() as HeroSlide;
              return {
                ...data,
                id: d.id,
                image_url: normalizeImageUrl(data.image_url),
                desktop_image_url: normalizeImageUrl(data.desktop_image_url),
                mobile_image_url: normalizeImageUrl(data.mobile_image_url),
              };
            });

            const activeSlides = rawDocs
              .filter((s) => s.active !== false)
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

            if (activeSlides.length > 0) {
              setSlides(activeSlides);
            }
          }
        },
        (err) => {
          console.warn("Real-time hero_slides listener warning:", err);
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (e) {
      console.warn("Real-time hero listener setup error:", e);
      return () => {
        isMounted = false;
      };
    }
  }, []);

  const currentSlide = slides[currentIndex] || slides[0];

  // Dynamic Autoplay Duration per slide
  const slideDuration = currentSlide?.autoplay_duration
    ? (currentSlide.autoplay_duration < 100
        ? currentSlide.autoplay_duration * 1000
        : currentSlide.autoplay_duration)
    : AUTOPLAY_DURATION;

  // Continuous auto-swipe rotation
  useEffect(() => {
    if (slides.length <= 1 || isReducedMotion) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, slideDuration);
    return () => clearInterval(timer);
  }, [slides.length, currentIndex, isReducedMotion, slideDuration]);

  if (!currentSlide) {
    return null;
  }

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const desktopBg = normalizeImageUrl(currentSlide.desktop_image_url || currentSlide.image_url);
  const mobileBg  = normalizeImageUrl(currentSlide.mobile_image_url || currentSlide.image_url || currentSlide.desktop_image_url);

  // Background styling helper
  const getBannerBackground = () => {
    if (currentSlide.banner_bg_color && currentSlide.banner_bg_color.trim()) {
      return currentSlide.banner_bg_color.trim();
    }
    if (currentSlide.bg_color && currentSlide.bg_color.trim()) {
      return currentSlide.bg_color.trim();
    }
    return "linear-gradient(135deg, #4A0E22 0%, #64152F 50%, #2B0612 100%)";
  };

  const bannerBg = getBannerBackground();

  // Desktop and Mobile Heights
  const desktopBannerHeight = currentSlide.desktop_banner_height && currentSlide.desktop_banner_height !== "auto"
    ? currentSlide.desktop_banner_height
    : "620px";

  const mobileBannerHeight = currentSlide.mobile_banner_height && currentSlide.mobile_banner_height !== "auto"
    ? currentSlide.mobile_banner_height
    : "480px";

  // Image Fit Mode: User explicitly requested full hero section cover:
  // "hero imagela naan upload pannirukka image hero section fulla cover pannanum text ellam antha baerkku meala overly aaki irukanum"
  // Default to 'cover' so uploaded artwork covers the entire hero section edge-to-edge!
  const imageFitMode = currentSlide.image_fit_mode === "contain" ? "contain" : "cover";

  // Content alignment and positioning
  const horizontalPosition = currentSlide.content_horizontal_position || "left";
  const verticalPosition = currentSlide.content_vertical_position || "center";
  const contentMaxWidth = currentSlide.content_max_width && currentSlide.content_max_width !== "full"
    ? currentSlide.content_max_width
    : "720px";

  const overlayOpacity = typeof currentSlide.overlay_opacity === "number"
    ? Math.min(currentSlide.overlay_opacity / 100, 0.6)
    : 0.35;

  // Heading Line 1 & Line 2 Extraction
  const rawLine1 = currentSlide.heading_line_1 !== undefined && currentSlide.heading_line_1 !== ""
    ? currentSlide.heading_line_1
    : (currentSlide.heading && !currentSlide.heading_line_2
        ? (currentSlide.heading.includes(". ") ? currentSlide.heading.split(". ")[0] + "." : currentSlide.heading)
        : "Latest Smartphones.");

  const rawLine2 = currentSlide.show_heading_line_2 === false || currentSlide.heading_line_2 === ""
    ? ""
    : (currentSlide.heading_line_2 !== undefined
        ? currentSlide.heading_line_2
        : (currentSlide.heading && !currentSlide.heading_line_1 && currentSlide.heading.includes(". ")
            ? currentSlide.heading.split(". ").slice(1).join(". ")
            : ""));

  // Text Case formatting helper
  const formatCasing = (text: string, casing?: "as_typed" | "uppercase" | "title_case") => {
    if (!text) return "";
    if (casing === "uppercase") return text.toUpperCase();
    if (casing === "title_case") {
      return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }
    return text;
  };

  const line1Text = formatCasing(rawLine1, currentSlide.heading_line_1_casing);
  const line2Text = formatCasing(rawLine2, currentSlide.heading_line_2_casing);

  const showLine1 = currentSlide.show_heading_line_1 !== false && Boolean(line1Text);
  const showLine2 = currentSlide.show_heading_line_2 !== false && Boolean(line2Text);

  const line1Color = currentSlide.heading_line_1_color || currentSlide.headingLine1Color || currentSlide.heading_color || "#FFFFFF";
  const line2Color = currentSlide.heading_line_2_color || currentSlide.headingLine2Color || currentSlide.heading_color || "#FFFFFF";

  const hideAllMobile = currentSlide.hide_content_on_mobile === true;
  const hideTextMobile = hideAllMobile || currentSlide.hide_text_on_mobile === true;
  const hideButtonsMobile = hideAllMobile || currentSlide.hide_buttons_on_mobile === true;

  const getDescriptionStyle = () => {
    const customSize = currentSlide.description_size;
    if (customSize && (customSize.includes("px") || customSize.includes("rem") || customSize.includes("em"))) {
      return { fontSize: customSize };
    }
    return {};
  };

  return (
    <>
      {/* ── Mobile Hero Banner (Full-Bleed Cover Image with Text Overlay) ── */}
      <section
        className="md:hidden w-full max-w-full overflow-hidden select-none border-0 m-0 p-0 rounded-none shadow-none text-white relative flex flex-col justify-between"
        aria-label="Mobile Featured Hero Showcase"
        style={{
          background: bannerBg,
          minHeight: mobileBannerHeight,
          fontFamily: "var(--font-manrope), Manrope, Inter, Arial, sans-serif",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Full-Cover Background Image Layer */}
        <div className="absolute inset-0 z-0 w-full h-full overflow-hidden pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={`mobile-bg-${currentSlide.id || currentIndex}`}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0 w-full h-full"
            >
              <Image
                src={mobileBg || desktopBg || "https://images.unsplash.com/photo-1606318801954-d4684609a6be?q=80&w=800"}
                alt={currentSlide.alt || line1Text || "Featured Hero"}
                fill
                priority
                sizes="100vw"
                className="select-none"
                style={{
                  objectFit: imageFitMode,
                  objectPosition: currentSlide.mobile_image_position || "center",
                }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Elegant Dark Gradient Scrim for crisp text contrast */}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-black/30 pointer-events-none" />

          {/* Admin Custom Ambient Overlay */}
          {currentSlide.overlay_color && (
            <div
              className="absolute inset-0 z-10 transition-all duration-500 pointer-events-none"
              style={{
                backgroundColor: currentSlide.overlay_color,
                opacity: overlayOpacity,
              }}
            />
          )}
        </div>

        {/* Overlaid Content Layer */}
        <div className="relative z-20 w-full px-5 pt-8 pb-20 flex flex-col justify-end min-h-[440px] h-full">
          {hideAllMobile || (hideTextMobile && hideButtonsMobile) ? (
            /* Clean Full-Image Banner on Mobile (Clickable) */
            <Link
              href={currentSlide.primary_button_url || "/products"}
              className="relative w-full flex-1 block"
              aria-label="View Product"
            />
          ) : (
            /* Full-Cover Mobile Text Overlay */
            <AnimatePresence mode="wait">
              <motion.div
                key={`mobile-content-${currentSlide.id || currentIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex flex-col"
              >
                {!hideTextMobile && (
                  <div className="w-full flex flex-col items-start mb-2">
                    {/* Eyebrow Label */}
                    {currentSlide.show_badge !== false && currentSlide.campaign_label && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 shadow-xs shrink-0 backdrop-blur-md"
                        style={{
                          backgroundColor: currentSlide.badge_bg_color || "rgba(255, 255, 255, 0.2)",
                          color: currentSlide.badge_text_color || "#FFFFFF",
                        }}
                      >
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{currentSlide.campaign_label}</span>
                      </span>
                    )}

                    {/* Heading */}
                    <h1
                      className="font-black leading-[1.12] tracking-tight mb-1 drop-shadow-lg"
                      style={{
                        fontSize: currentSlide.mobile_heading_size || "clamp(22px, 6vw, 30px)",
                      }}
                    >
                      {showLine1 && <span style={{ color: line1Color }}>{line1Text}</span>}
                      {showLine1 && showLine2 && <br />}
                      {showLine2 && <span style={{ color: line2Color }}>{line2Text}</span>}
                    </h1>

                    {/* Starting Price / Promo */}
                    {currentSlide.promo_text && (
                      <div className="flex items-baseline gap-1.5 my-1">
                        <span className="text-white/80 text-xs font-medium">Starting at</span>
                        <span className="text-yellow-400 font-black text-lg tracking-tight drop-shadow-md">
                          {currentSlide.promo_text.replace(/^Starting\s+at\s+/i, "")}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {currentSlide.show_description !== false && currentSlide.description && (
                      <p
                        className="text-neutral-200 text-xs leading-relaxed line-clamp-2 max-w-[95%] font-medium mt-0.5 drop-shadow-md"
                        style={{
                          color: currentSlide.description_color || "rgba(255, 255, 255, 0.9)",
                          ...getDescriptionStyle(),
                        }}
                      >
                        {currentSlide.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom Action Row: Accessible CTA Buttons */}
                {!hideButtonsMobile && currentSlide.show_primary_button !== false && (
                  <div className="flex items-center gap-2 mt-2">
                    <Link
                      href={currentSlide.primary_button_url || "/products"}
                      className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 min-h-[44px] font-bold text-xs rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      style={{
                        backgroundColor: currentSlide.button_bg_color || "#FFFFFF",
                        color: currentSlide.button_text_color || "#111111",
                      }}
                    >
                      <span>{currentSlide.primary_button_text || "Shop Now"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {currentSlide.show_secondary_button && currentSlide.secondary_button_url && (
                      <Link
                        href={currentSlide.secondary_button_url}
                        className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] font-bold text-xs rounded-full border border-white/30 text-white bg-black/30 backdrop-blur-md hover:bg-black/50 transition-all cursor-pointer"
                      >
                        <span>{currentSlide.secondary_button_text || "View"}</span>
                      </Link>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Slide Indicator Progress Dots (Mobile) */}
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {slides.map((_, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDirection(idx > currentIndex ? 1 : -1);
                      setCurrentIndex(idx);
                    }}
                    aria-label={`Slide ${idx + 1}`}
                    className="cursor-pointer transition-all duration-300"
                  >
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isActive ? "w-6 bg-white shadow-xs" : "w-2 bg-white/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Desktop Hero Section (Full-Bleed Cover Image with Text Overlay) ── */}
      <section
        ref={heroRef}
        className="hidden md:flex group relative w-full max-w-full overflow-hidden items-center justify-center text-white rounded-none border-none p-0 m-0 select-none"
        style={{
          background: bannerBg,
          minHeight: desktopBannerHeight,
          fontFamily: "var(--font-manrope), Manrope, Inter, Arial, sans-serif",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Full-Cover Background Image Layer with Parallax */}
        <div ref={heroBgRef} className="absolute inset-0 z-0 w-full h-full overflow-hidden pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={`desktop-bg-${currentSlide.id || currentIndex}`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1.0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 w-full h-full"
            >
              <Image
                src={desktopBg || "https://images.unsplash.com/photo-1606318801954-d4684609a6be?q=80&w=1920"}
                alt={currentSlide.alt || line1Text || "Featured Hero"}
                fill
                priority
                sizes="100vw"
                className="select-none"
                style={{
                  objectFit: imageFitMode,
                  objectPosition: currentSlide.desktop_image_position || "center",
                }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Directional scrim gradient ensuring text readability over any background image */}
          <div
            className={`absolute inset-0 z-10 pointer-events-none transition-all duration-500 ${
              horizontalPosition === "center"
                ? "bg-gradient-to-t from-black/85 via-black/40 to-black/20"
                : horizontalPosition === "right"
                ? "bg-gradient-to-l from-black/85 via-black/45 to-transparent"
                : "bg-gradient-to-r from-black/85 via-black/45 to-transparent"
            }`}
          />

          {/* Admin Custom Ambient Color Tint (if specified and not pure black) */}
          {currentSlide.overlay_color && currentSlide.overlay_color !== "#000000" && (
            <div
              className="absolute inset-0 z-10 transition-all duration-500 pointer-events-none"
              style={{
                backgroundColor: currentSlide.overlay_color,
                opacity: overlayOpacity,
              }}
            />
          )}
        </div>

        {/* ── Overlaid Hero Content (Layered Directly on Top of the Background Image) ── */}
        <div
          ref={heroContentRef}
          className={`relative z-20 max-w-[1440px] mx-auto px-8 lg:px-16 w-full pt-14 lg:pt-20 pb-28 lg:pb-36 flex flex-col ${
            verticalPosition === "top"
              ? "justify-start"
              : verticalPosition === "bottom"
              ? "justify-end"
              : "justify-center"
          } ${
            horizontalPosition === "center"
              ? "items-center"
              : horizontalPosition === "right"
              ? "items-end"
              : "items-start"
          }`}
          style={{ minHeight: desktopBannerHeight }}
        >
          <div
            className={`w-full flex flex-col ${
              horizontalPosition === "center"
                ? "items-center text-center"
                : horizontalPosition === "right"
                ? "items-end text-right"
                : "items-start text-left"
            }`}
            style={{ maxWidth: contentMaxWidth }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`desktop-content-${currentSlide.id || currentIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className={`flex flex-col w-full ${
                  horizontalPosition === "center"
                    ? "items-center text-center"
                    : horizontalPosition === "right"
                    ? "items-end text-right"
                    : "items-start text-left"
                }`}
              >
                {/* 1. Campaign Eyebrow Label */}
                {currentSlide.show_badge !== false && currentSlide.campaign_label && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-[0.14em] shadow-xs mb-4 backdrop-blur-md"
                    style={{
                      color: currentSlide.badge_text_color || "#FFFFFF",
                      backgroundColor: currentSlide.badge_bg_color || "rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{currentSlide.campaign_label}</span>
                  </motion.div>
                )}

                {/* 2. Main Dual-Line Heading */}
                <h1 className="hero-heading flex flex-col gap-1 mb-3 w-full">
                  {showLine1 && (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.48, delay: 0.06 }}
                      className="block leading-[1.06] tracking-[-0.035em] drop-shadow-xl font-extrabold"
                      style={{
                        color: line1Color,
                        fontSize: currentSlide.desktop_heading_size || currentSlide.heading_line_1_size || "clamp(36px, 3.8vw, 56px)",
                      }}
                    >
                      {line1Text}
                    </motion.span>
                  )}
                  {showLine2 && (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.48, delay: 0.12 }}
                      className="block leading-[1.06] tracking-[-0.035em] drop-shadow-xl font-extrabold"
                      style={{
                        color: line2Color,
                        fontSize: currentSlide.desktop_heading_size || currentSlide.heading_line_2_size || "clamp(36px, 3.8vw, 56px)",
                      }}
                    >
                      {line2Text}
                    </motion.span>
                  )}
                </h1>

                {/* 3. Promo Starting Price */}
                {currentSlide.promo_text && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.48, delay: 0.18 }}
                    className={`flex items-baseline gap-2.5 my-2 ${
                      horizontalPosition === "center" ? "justify-center" : horizontalPosition === "right" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-white/80 text-sm lg:text-base font-medium tracking-wide">
                      Starting at
                    </span>
                    <span className="text-amber-300 sm:text-yellow-400 font-black text-2xl lg:text-3xl xl:text-4xl tracking-tight drop-shadow-md">
                      {currentSlide.promo_text.replace(/^Starting\s+at\s+/i, "")}
                    </span>
                  </motion.div>
                )}

                {/* 4. Description */}
                {currentSlide.show_description !== false && currentSlide.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.48, delay: 0.22 }}
                    className="text-neutral-200 text-sm sm:text-base lg:text-lg leading-relaxed max-w-[580px] drop-shadow-md font-medium my-3"
                    style={{
                      color: currentSlide.description_color || "rgba(255, 255, 255, 0.88)",
                      ...getDescriptionStyle(),
                    }}
                  >
                    {currentSlide.description}
                  </motion.p>
                )}

                {/* 5. Clear Burgundy / White Shop Now CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.48, delay: 0.28 }}
                  className={`flex items-center gap-3 mt-4 ${
                    horizontalPosition === "center" ? "justify-center" : horizontalPosition === "right" ? "justify-end" : "justify-start"
                  }`}
                >
                  {currentSlide.show_primary_button !== false && currentSlide.primary_button_text && (
                    <Link
                      href={currentSlide.primary_button_url || "/products"}
                      className="group/btn h-[52px] px-8 rounded-full font-bold text-sm shadow-xl transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                      style={{
                        backgroundColor: currentSlide.button_bg_color || "#FFFFFF",
                        color: currentSlide.button_text_color || "#111111",
                      }}
                    >
                      <span>{currentSlide.primary_button_text}</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </Link>
                  )}

                  {currentSlide.show_secondary_button === true &&
                    currentSlide.secondary_button_text &&
                    currentSlide.secondary_button_url && (
                      <Link
                        href={currentSlide.secondary_button_url}
                        className="h-[52px] px-7 rounded-full font-bold text-sm border border-white/30 text-white bg-black/30 hover:bg-black/50 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>{currentSlide.secondary_button_text}</span>
                      </Link>
                    )}
                </motion.div>

                {/* 6. Minimal Trust Strip */}
                {currentSlide.show_trust_strip !== false && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.48, delay: 0.34 }}
                    className={`mt-6 flex items-center gap-4 text-xs font-medium text-white/80 ${
                      horizontalPosition === "center" ? "justify-center" : horizontalPosition === "right" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{currentSlide.trust_item_1 || "Genuine Products"}</span>
                    </div>
                    <span className="text-white/30">•</span>
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{currentSlide.trust_item_2 || "Islandwide Delivery"}</span>
                    </div>
                    <span className="text-white/30">•</span>
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{currentSlide.trust_item_3 || "Secure Payments"}</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── White Circular Navigation Arrows (< and >) ── */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white text-neutral-900 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Slide"
              className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white text-neutral-900 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.2]" />
            </button>
          </>
        )}

        {/* ── Slide Indicator Dots (Positioned with safe clearance above circular categories) ── */}
        {slides.length > 1 && (
          <div className="absolute bottom-16 lg:bottom-22 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {slides.map((_, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                  className="cursor-pointer transition-all duration-300"
                >
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      isActive ? "w-7 bg-white shadow-md" : "w-2.5 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
