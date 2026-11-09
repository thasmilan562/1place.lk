"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { TodayDealSettings } from "@/lib/types";
import { DEFAULT_TODAY_DEAL_SETTINGS } from "@/lib/data";
import { getTodayDealSettings } from "@/lib/firestore-client";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { normalizeImageUrl } from "@/lib/utils";

interface TodayDealSectionProps {
  settings?: TodayDealSettings | null;
  className?: string;
  isLivePreview?: boolean;
  previewDevice?: "desktop" | "tablet" | "mobile";
}

// Format 2-digit number
function padZero(num: number): string {
  return num < 10 ? `0${Math.max(0, num)}` : `${Math.max(0, num)}`;
}

/**
 * Safely parse a date string or timestamp ensuring Sri Lanka Time (UTC+05:30)
 * if no timezone offset is explicitly provided.
 */
function parseSriLankaTimestamp(dateStr?: string | number | null): number {
  if (!dateStr) return 0;
  if (typeof dateStr === "number") return dateStr;
  const str = String(dateStr).trim();
  if (!str) return 0;

  // If ISO 8601 string already includes explicit timezone offset or Z
  if (/Z|[+-]\d{2}:?\d{2}$/.test(str)) {
    const t = new Date(str).getTime();
    return isNaN(t) ? 0 : t;
  }

  // If string lacks timezone, assume Sri Lanka timezone (Asia/Colombo, UTC+05:30)
  const normalized = str.replace(" ", "T");
  const withTz = `${normalized}+05:30`;
  const t = new Date(withTz).getTime();
  if (!isNaN(t)) return t;

  const fallback = new Date(str).getTime();
  return isNaN(fallback) ? 0 : fallback;
}

export default function TodayDealSection({
  settings,
  className = "",
  isLivePreview = false,
  previewDevice = "desktop",
}: TodayDealSectionProps) {
  const [liveSettings, setLiveSettings] = useState<TodayDealSettings>(() => ({
    ...DEFAULT_TODAY_DEAL_SETTINGS,
    ...(settings || {}),
  }));

  // Sync prop changes
  useEffect(() => {
    if (settings) {
      setLiveSettings((prev) => ({ ...prev, ...settings }));
    }
  }, [settings]);

  // Only fetch from Firestore client-side if settings prop was not already provided by server
  useEffect(() => {
    if (!isLivePreview && !settings) {
      getTodayDealSettings()
        .then((fresh) => {
          if (fresh) setLiveSettings(fresh);
        })
        .catch(() => {});
    }
  }, [isLivePreview, settings]);

  const deal = liveSettings;

  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const [imgError, setImgError] = useState(false);

  // Reset imgError whenever image sources or previewDevice change
  useEffect(() => {
    setImgError(false);
  }, [deal.desktopImageUrl, deal.mobileImageUrl, deal.squareImageUrl, deal.bannerMode, previewDevice]);

  // Live 1-second interval ticker for real-time automatic auto-hide
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute countdown time and status
  const { isLive, isScheduled, isExpired, days, hours, minutes, seconds } = useMemo(() => {
    const startTime = parseSriLankaTimestamp(deal.startsAt);
    let endTime = parseSriLankaTimestamp(deal.endsAt);

    let scheduled = false;
    let expired = false;

    if (startTime && now < startTime) {
      scheduled = true;
    } else if (endTime && now >= endTime) {
      expired = true;
    }

    // If countdown timer reached 0 or endsAt has elapsed
    const diff = Math.max(0, endTime ? endTime - now : 0);
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    return {
      isLive: !scheduled && !expired,
      isScheduled: scheduled,
      isExpired: expired,
      days: d,
      hours: deal.showDays ? h : d * 24 + h,
      minutes: m,
      seconds: s,
    };
  }, [deal.startsAt, deal.endsAt, deal.showDays, now]);

  // 1. If explicitly disabled and not in live preview mode, hide completely
  if (deal.enabled === false && !isLivePreview) {
    return null;
  }

  // 2. If scheduled for future and not in live preview mode, hide completely
  if (isScheduled && !isLivePreview) {
    return null;
  }

  // 3. Automatic Auto-Hide when time ends (timer reaches 0 or endsAt passed)
  if (isExpired && !isLivePreview) {
    // If admin explicitly selected replacement-cta or deal-ended or keep-banner, honor it; otherwise hide by default
    if (deal.expiryAction === "deal-ended" || deal.expiryAction === "replacement-cta" || deal.expiryAction === "keep-banner") {
      // Keep visible with configured behavior
    } else {
      // Default & automatic action: Hide completely (zero whitespace)
      return null;
    }
  }

  // Explicit hide action
  if (isExpired && !isLivePreview && (deal.expiryAction === "hide" || !deal.expiryAction)) {
    return null;
  }

  // Active CTA link and label
  const activeCtaLabel =
    isExpired && deal.expiryAction === "replacement-cta" && deal.replacementCtaLabel
      ? deal.replacementCtaLabel
      : deal.ctaLabel || "Shop Today's Deals";

  const activeCtaUrl =
    isExpired && deal.expiryAction === "replacement-cta" && deal.replacementCtaUrl
      ? deal.replacementCtaUrl
      : deal.ctaUrl || "/products";

  const isExternalCta = (activeCtaUrl || "").startsWith("http");

  // Image Source Resolution:
  // - In "full_image" mode (default): Desktop MUST use desktopImageUrl first!
  // - In "custom_bg_with_square_image" mode: Use squareImageUrl first.
  const fallbackPoster = "/images/today-deal-poster.png";
  const rawDesktop =
    deal.bannerMode === "custom_bg_with_square_image"
      ? (deal.squareImageUrl?.trim() || deal.desktopImageUrl?.trim() || fallbackPoster)
      : (deal.desktopImageUrl?.trim() || deal.squareImageUrl?.trim() || fallbackPoster);
  const desktopImg = normalizeImageUrl(rawDesktop);

  const rawMobile = deal.mobileImageUrl?.trim() || rawDesktop;
  const mobileImg = normalizeImageUrl(rawMobile);

  // Active image for live preview device switching in admin canvas
  const previewImg = previewDevice === "mobile" ? mobileImg : desktopImg;

  // Focal position classes
  const desktopFocalClass =
    deal.desktopFocalPosition === "left"
      ? "object-left"
      : deal.desktopFocalPosition === "right"
      ? "object-right"
      : "object-center";

  const mobileFocalClass =
    deal.mobileFocalPosition === "left"
      ? "object-left"
      : deal.mobileFocalPosition === "right"
      ? "object-right"
      : "object-center";

  const activeFocalClass =
    isLivePreview && previewDevice === "mobile" ? mobileFocalClass : desktopFocalClass;

  const imgScale = (deal.imageScale ?? 100) / 100;

  // Background Banner Behind Both Cards (Storefront photo by default as in screenshot)
  const bgBannerUrl = deal.backgroundBannerUrl?.trim() || "/Street Mobile (980 x 360 px) (1240 x 472 px).png";
  const hasBgBanner = deal.backgroundBannerEnabled !== false;
  const bgOverlayOpacity = typeof deal.backgroundBannerOverlayOpacity === "number" ? deal.backgroundBannerOverlayOpacity / 100 : 0.45;

  // Colors & Typography strictly following the screenshot aesthetic
  const isOldDarkDefault =
    (deal.boxBackgroundColor === "#090909" || !deal.boxBackgroundColor) &&
    (deal.headingColor === "#FFFFFF" || !deal.headingColor);

  const cardBgColor = isOldDarkDefault ? "#FFFFFF" : (deal.boxBackgroundColor || "#FFFFFF");
  const headingTextColor = isOldDarkDefault ? "#F1592A" : (deal.headingColor || "#F1592A");
  const descTextColor = isOldDarkDefault ? "#F1592A" : (deal.descriptionColor || "#F1592A");
  const eyebrowTagColor = isOldDarkDefault ? "#262626" : (deal.eyebrowColor || "#262626");
  const ctaBtnBg = isOldDarkDefault ? "#F1592A" : (deal.ctaBackgroundColor || "#F1592A");
  const ctaBtnText = deal.ctaTextColor || "#FFFFFF";
  const timerBg = isOldDarkDefault ? "#F1592A" : (deal.countdownBackgroundColor === "transparent" ? "#F1592A" : (deal.countdownBackgroundColor || "#F1592A"));
  const timerText = isOldDarkDefault ? "#FFFFFF" : (deal.countdownTextColor === "#090909" ? "#FFFFFF" : (deal.countdownTextColor || "#FFFFFF"));

  // Fit and padding resolution
  const cardPaddingClass =
    deal.cardPadding === "compact"
      ? "p-3 sm:p-6"
      : deal.cardPadding === "normal"
      ? "p-5 sm:p-10"
      : deal.cardPadding === "spacious"
      ? "p-6 sm:p-14"
      : "p-0"; // default edge to edge fill

  const imageFitClass =
    deal.imageFit === "contain"
      ? "w-full h-full object-contain"
      : deal.imageFit === "fill"
      ? "w-full h-full object-fill"
      : "w-full h-full object-cover"; // default cover for 100% full frame fill

  // Layout & Alignment
  const isBoxOnRight = deal.boxPosition === "right";
  const contentAlignClass =
    deal.contentAlignment === "center"
      ? "text-center items-center"
      : deal.contentAlignment === "right"
      ? "text-right items-end"
      : "text-left items-start";

  const content = (
    <section
      id="todays-deal-section"
      aria-label="Today's Deal Promotional Showcase"
      className={`w-full py-8 sm:py-12 lg:py-14 select-none relative overflow-hidden ${isLivePreview ? "" : "hidden md:block"} ${className}`}
    >
      {/* ── 100% Sharp 90-Degree Square Background Banner Behind Both Cards ── */}
      {hasBgBanner && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden rounded-none"
          style={{ borderRadius: 0 }}
        >
          <img
            src={normalizeImageUrl(bgBannerUrl)}
            alt="Today's Deal Background Banner"
            className="w-full h-full object-cover object-center rounded-none"
          />
          <div
            className="absolute inset-0 w-full h-full rounded-none"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${bgOverlayOpacity})`,
              borderRadius: 0,
            }}
          />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-stretch">
          
          {/* ── Left Card: 100% Sharp 90-Degree Square Corners (0px Radius) ── */}
          <div
            style={{
              backgroundColor: cardBgColor,
              borderRadius: 0,
            }}
            className={`border border-neutral-200/90 shadow-sm p-6 sm:p-10 lg:p-12 flex flex-col justify-between transition-all duration-300 rounded-none w-full min-h-[480px] sm:min-h-[520px] md:min-h-[560px] lg:min-h-[580px] h-full ${
              isBoxOnRight ? "md:order-2" : "md:order-1"
            }`}
          >
            <div className={`flex flex-col ${contentAlignClass}`}>
              {/* 1. Sharp Square Indicator + TODAY'S DEAL Eyebrow */}
              <div className="flex items-center gap-2 mb-3.5 sm:mb-5">
                <span
                  style={{ backgroundColor: eyebrowTagColor }}
                  className="w-2 h-2 rounded-none shrink-0"
                />
                <span
                  style={{ color: eyebrowTagColor }}
                  className="font-black text-[11px] sm:text-xs tracking-[0.14em] uppercase font-mono"
                >
                  {deal.eyebrow || "TODAY 'S DEAL"}
                </span>
              </div>

              {/* 2. Headline: Today Only. Better Prices. */}
              <h2
                style={{ color: headingTextColor }}
                className="text-2xl sm:text-3xl lg:text-[42px] font-black tracking-tight leading-[1.08] mb-3"
              >
                {deal.heading ? (
                  deal.heading.includes(".") ? (
                    <>
                      {deal.heading.split(".")[0]}.
                      <br />
                      {deal.heading.split(".").slice(1).join(".").trim()}
                    </>
                  ) : (
                    deal.heading
                  )
                ) : (
                  <>
                    Today Only.
                    <br />
                    Better Prices.
                  </>
                )}
              </h2>

              {/* 3. Subtitle */}
              <p
                style={{ color: descTextColor }}
                className="text-xs sm:text-sm lg:text-[15px] font-medium leading-relaxed mb-6 sm:mb-8 max-w-sm"
              >
                {deal.description || "Limited-time savings on selected devices & accessories."}
              </p>

              {/* 4. CTA Button (100% Sharp Square Rectangular, 0px Radius) */}
              {deal.ctaEnabled !== false && activeCtaLabel && (
                <div className="w-full sm:w-auto">
                  {isExternalCta ? (
                    <a
                      href={activeCtaUrl}
                      target={deal.openInNewTab ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: ctaBtnBg,
                        color: ctaBtnText,
                        borderRadius: 0,
                      }}
                      className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 shadow-xs hover:brightness-105 active:scale-98 rounded-none w-full sm:w-auto cursor-pointer"
                    >
                      <span>{activeCtaLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link
                      href={activeCtaUrl}
                      target={deal.openInNewTab ? "_blank" : undefined}
                      style={{
                        backgroundColor: ctaBtnBg,
                        color: ctaBtnText,
                        borderRadius: 0,
                      }}
                      className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 shadow-xs hover:brightness-105 active:scale-98 rounded-none w-full sm:w-auto cursor-pointer"
                    >
                      <span>{activeCtaLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* 5. Bottom Section: Divider & Offer Status with LIVE TICKING CLOCK */}
            <div className={`pt-6 sm:pt-8 flex flex-col ${contentAlignClass} w-full`}>
              <div className="w-full h-[1px] bg-neutral-200/80 mb-4 sm:mb-5" />

              <div className={`flex flex-col ${contentAlignClass} w-full`}>
                <span className="text-[10px] sm:text-[11px] font-extrabold tracking-widest text-neutral-400 uppercase font-mono mb-2 block">
                  OFFER STATUS
                </span>

                {isExpired && deal.expiryAction === "deal-ended" ? (
                  <div
                    style={{
                      borderColor: ctaBtnBg,
                      color: "#FFFFFF",
                      backgroundColor: ctaBtnBg,
                      borderRadius: 0,
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-none border text-xs font-bold tracking-wider uppercase w-full sm:w-auto justify-center sm:justify-start"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>DEAL ENDED</span>
                  </div>
                ) : (
                  <div
                    suppressHydrationWarning
                    style={{
                      borderColor: timerBg || ctaBtnBg,
                      color: timerText || "#FFFFFF",
                      backgroundColor: timerBg || ctaBtnBg,
                      borderRadius: 0,
                    }}
                    className="inline-flex items-center justify-between gap-4 px-4 py-2.5 rounded-none border text-xs font-bold font-mono tracking-wide w-full sm:w-auto shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 uppercase font-bold text-[11px]">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>DEAL ENDS IN</span>
                    </div>
                    <span className="font-extrabold text-xs tracking-wider">
                      {`${deal.showDays && days > 0 ? `${padZero(days)}d : ` : ""}${padZero(hours)}h : ${padZero(minutes)}m : ${padZero(seconds)}s`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Card: 100% Sharp 90-Degree Square Poster (0px Radius, Identical Equal Height) ── */}
          <div
            style={{
              backgroundColor: deal.bannerBgColor || cardBgColor,
              borderRadius: 0,
            }}
            className={`border border-neutral-200/90 shadow-sm ${cardPaddingClass} flex items-center justify-center relative overflow-hidden group transition-all duration-300 w-full rounded-none min-h-[480px] sm:min-h-[520px] md:min-h-[560px] lg:min-h-[580px] h-full ${
              isBoxOnRight ? "md:order-1" : "md:order-2"
            }`}
          >
            <Link
              href={activeCtaUrl}
              target={deal.openInNewTab ? "_blank" : undefined}
              className="w-full h-full flex items-center justify-center cursor-pointer overflow-hidden relative rounded-none"
              aria-label={deal.heading || "Today's Deal Product"}
            >
              {isLivePreview ? (
                /* Live Preview Mode: Directly render previewImg honoring the preview device switcher */
                <img
                  src={!imgError ? previewImg : fallbackPoster}
                  alt={deal.imageAlt || deal.heading || "Today's Deal Product Mockup"}
                  style={{
                    transform: imgScale !== 1 ? `scale(${imgScale})` : undefined,
                    borderRadius: 0,
                  }}
                  className={`${imageFitClass} ${activeFocalClass} transition-transform duration-500 ease-out group-hover:scale-105 rounded-none w-full h-full object-cover`}
                  onError={() => setImgError(true)}
                />
              ) : (
                /* Public Production Mode: Responsive picture element with desktop and mobile fallback */
                <picture className="w-full h-full flex items-center justify-center rounded-none">
                  {mobileImg && (
                    <source
                      media="(max-width: 640px)"
                      srcSet={mobileImg}
                    />
                  )}
                  <img
                    src={!imgError ? desktopImg : fallbackPoster}
                    alt={deal.imageAlt || deal.heading || "Today's Deal Product Mockup"}
                    style={{
                      transform: imgScale !== 1 ? `scale(${imgScale})` : undefined,
                      borderRadius: 0,
                    }}
                    className={`${imageFitClass} ${desktopFocalClass} transition-transform duration-500 ease-out group-hover:scale-105 rounded-none w-full h-full object-cover`}
                    onError={() => setImgError(true)}
                  />
                </picture>
              )}
            </Link>
          </div>

        </div>
      </div>
    </section>
  );

  if (isLivePreview) {
    return content;
  }

  return (
    <ScrollReveal className="w-full" enable3d={true}>
      {content}
    </ScrollReveal>
  );
}
