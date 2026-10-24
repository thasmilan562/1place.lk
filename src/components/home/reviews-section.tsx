"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Star, CheckCircle2, Quote, ExternalLink, Edit3, ChevronLeft, ChevronRight } from "lucide-react";
import { Review, GoogleReviewsSettings } from "@/lib/types";
import { siteSettings } from "@/lib/data";
import { DEFAULT_GOOGLE_REVIEWS_SETTINGS, getGoogleReviewsSettings } from "@/lib/firestore-client";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { uniqueById } from "@/lib/utils";
import { BUSINESS_INFO } from "@/lib/business-info";

const DEFAULT_MAPS_URL = BUSINESS_INFO.maps.link;

const DEFAULT_REVIEWS: Review[] = [
  {
    id: "g-rev-1",
    author_name: "Kavinth Raj",
    author_photo: "",
    rating: 5,
    text: "Best electronics store in Sri Lanka! Bought my new iPhone here with original warranty and got an unbeatable price. The customer service and after-sales support are top notch.",
    review_date: "2026-02-10",
    visible: true,
    featured: true,
    google_url: DEFAULT_MAPS_URL,
  },
  {
    id: "g-rev-2",
    author_name: "Santhosh Kumar",
    author_photo: "",
    rating: 5,
    text: "Fixed my display glass within 45 minutes! Original display replacement with clean finish. Very transparent pricing and polite staff. Highly recommended for phone repairs.",
    review_date: "2026-01-28",
    visible: true,
    featured: true,
    google_url: DEFAULT_MAPS_URL,
  },
  {
    id: "g-rev-3",
    author_name: "Diluxan S.",
    author_photo: "",
    rating: 5,
    text: "Purchased Apple AirPods and a fast charger. Genuine products guaranteed. Smooth experience and quick response on WhatsApp inquiries.",
    review_date: "2026-01-15",
    visible: true,
    google_url: DEFAULT_MAPS_URL,
  },
  {
    id: "g-rev-4",
    author_name: "Niroshan T.",
    author_photo: "",
    rating: 5,
    text: "Excellent service and quick repair work. They replaced my phone battery in no time with genuine battery and warranty. 10/10 service in town!",
    review_date: "2025-12-20",
    visible: true,
    google_url: DEFAULT_MAPS_URL,
  },
  {
    id: "g-rev-5",
    author_name: "Prashanth M.",
    author_photo: "",
    rating: 5,
    text: "Great collection of accessories and smartphones. The staff guided me very well to select the best phone within my budget.",
    review_date: "2025-12-05",
    visible: true,
    google_url: DEFAULT_MAPS_URL,
  },
];

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

const validateUrl = (url?: string, fallbackUrl?: string) => {
  const fallback = fallbackUrl || siteSettings.google_maps_link || DEFAULT_MAPS_URL;
  if (!url || typeof url !== "string") return fallback;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {}
  return fallback;
};

/* ─── Refined Google Review Card ─── */
interface ReviewCardProps {
  review: Review;
  mainViewAllUrl: string;
  onLinkClick?: (e: React.MouseEvent) => void;
}

function ReviewCard({ review, mainViewAllUrl, onLinkClick }: ReviewCardProps) {
  const safeRating = Math.min(5, Math.max(1, review.rating || 5));
  const displayDate = review.review_date || "Verified Google Review";
  const cardTargetUrl = validateUrl(review.google_url, mainViewAllUrl);
  const authorInitial = (review.author_name || "G").charAt(0).toUpperCase();

  return (
    <a
      href={cardTargetUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onLinkClick}
      aria-label={`Read Google review by ${review.author_name}`}
      className="w-[80vw] sm:w-[380px] lg:w-[410px] max-w-[340px] sm:max-w-none shrink-0 min-h-[230px] sm:min-h-[280px] bg-neutral-50/90 hover:bg-white border border-neutral-200/90 hover:border-neutral-300 rounded-[14px] sm:rounded-[16px] p-5 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-[2px] sm:hover:-translate-y-[3px] flex flex-col justify-between group relative overflow-hidden cursor-pointer select-none"
    >
      {/* 1. Top Area: Star Rating & Badges */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 pointer-events-none">
          {/* Star Rating */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {[...Array(safeRating)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5">
            {review.featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                <span>Featured</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[9.5px] sm:text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Google Review</span>
            </span>
          </div>
        </div>

        {/* 2. Review Content */}
        <div className="relative mb-2 pointer-events-none">
          <Quote className="w-3.5 h-3.5 text-neutral-300/80 inline-block mr-1.5 -mt-1 rotate-180 select-none" />
          <span className="text-neutral-700 text-xs sm:text-[15px] leading-relaxed sm:leading-[1.65] font-normal line-clamp-3 sm:line-clamp-4">
            {review.text}
          </span>
        </div>
      </div>

      {/* 3. Flexible Spacer */}
      <div className="flex-1 min-h-2 pointer-events-none" />

      {/* 4. Reviewer Profile (Bottom Row) */}
      <div className="pt-3 sm:pt-4 border-t border-neutral-200/80 flex items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Avatar */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neutral-200 text-neutral-800 border border-neutral-300 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs font-bold text-xs">
            {review.author_photo ? (
              <img
                src={review.author_photo}
                alt={review.author_name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <span>{authorInitial}</span>
            )}
          </div>

          {/* Name & Date */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs sm:text-sm text-neutral-900 truncate group-hover:text-amber-600 transition-colors m-0">
                {review.author_name}
              </h4>
              <GoogleIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            </div>
            <p className="text-[10.5px] sm:text-xs text-neutral-400 m-0 mt-0.5">{displayDate}</p>
          </div>
        </div>

        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 group-hover:text-amber-600 transition-colors shrink-0" />
      </div>
    </a>
  );
}

/* ─── Main Reviews Section (Silky-Smooth GPU Touch Swipe & Counter-Autoplay Engine) ─── */
export default function ReviewsSection({
  reviews,
  settings,
  galleryDirection = "left",
}: {
  reviews: Review[];
  settings?: GoogleReviewsSettings;
  galleryDirection?: "left" | "right";
}) {
  const [liveSettings, setLiveSettings] = useState<GoogleReviewsSettings | undefined>(settings);

  useEffect(() => {
    if (settings) {
      setLiveSettings(settings);
    } else {
      getGoogleReviewsSettings().then((res) => {
        if (res) setLiveSettings(res);
      }).catch(() => {});
    }
  }, [settings]);

  const currentSettings: GoogleReviewsSettings = {
    ...DEFAULT_GOOGLE_REVIEWS_SETTINGS,
    ...(liveSettings || settings || {}),
  };

  const mainViewAllUrl = validateUrl(
    currentSettings.view_all_reviews_url,
    siteSettings.google_maps_link || DEFAULT_MAPS_URL
  );
  const mainWriteReviewUrl = validateUrl(
    currentSettings.write_review_url,
    siteSettings.google_maps_link || DEFAULT_MAPS_URL
  );
  const overallRating = currentSettings.overall_rating || 4.9;
  const totalReviewsCount = currentSettings.total_reviews_count || 285;

  // Opposite counter-scrolling direction
  const effectiveDirection: "left" | "right" = useMemo(() => {
    if (currentSettings.direction === "left") return "left";
    if (currentSettings.direction === "right") return "right";
    return galleryDirection === "right" ? "left" : "right";
  }, [currentSettings.direction, galleryDirection]);

  // Combine passed reviews with fallback reviews, strictly deduplicated by unique ID
  const displayReviews = useMemo(() => {
    const rawList = Array.isArray(reviews) && reviews.length > 0 ? reviews : DEFAULT_REVIEWS;
    const valid = rawList.filter((r) => r && r.visible !== false);
    const deduped = uniqueById(valid);
    if (deduped.length >= 3) return deduped;
    const seenIds = new Set(deduped.map((r) => r.id));
    const extraDefaults = DEFAULT_REVIEWS.filter((r) => !seenIds.has(r.id));
    return [...deduped, ...extraDefaults];
  }, [reviews]);

  // Real items for Sequence A - each actual review appears strictly once
  const baseItems = useMemo(() => {
    return displayReviews;
  }, [displayReviews]);

  // Reduced motion preference
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Animation Engine Refs
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const singleSeqRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<number>(0);
  const sequenceWidthRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stepAnimRef = useRef<number | null>(null);

  // State flags for interactive pausing
  const isHoveredRef = useRef(false);
  const isFocusedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isVisibleRef = useRef(true);
  const wasDraggingRef = useRef(false);

  // Touch & Drag Physics Tracking
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const dragMovedRef = useRef(0);
  const isHorizontalGestureRef = useRef<boolean | null>(null);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const pointerVelocityRef = useRef(0);

  // Measure sequence width dynamically
  const measureSequence = useCallback(() => {
    if (singleSeqRef.current) {
      const width = singleSeqRef.current.offsetWidth;
      if (width > 0) {
        sequenceWidthRef.current = width;
      }
    }
  }, []);

  useEffect(() => {
    measureSequence();
    const el = singleSeqRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => measureSequence());
    observer.observe(el);
    window.addEventListener("resize", measureSequence);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureSequence);
    };
  }, [measureSequence, baseItems]);

  // IntersectionObserver to pause RAF when section is offscreen
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          lastTimeRef.current = null;
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Tab visibility listener
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        isVisibleRef.current = false;
      } else {
        isVisibleRef.current = true;
        lastTimeRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Helper to wrap offset within [-sequenceWidth, 0]
  const normalizeOffset = useCallback((val: number) => {
    const seqWidth = sequenceWidthRef.current;
    if (seqWidth <= 0) return val;
    let n = val;
    while (n <= -seqWidth) n += seqWidth;
    while (n >= 0) n -= seqWidth;
    return n;
  }, []);

  // Main 60fps/120fps RequestAnimationFrame Loop
  useEffect(() => {
    const endlessEnabled = currentSettings.endlessScrollEnabled !== false;
    const autoplayEnabled = currentSettings.autoplayEnabled !== false;
    const enabled = endlessEnabled && autoplayEnabled && !isReducedMotion && baseItems.length > 1;

    if (!enabled) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const animate = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const seqWidth = sequenceWidthRef.current;

      const shouldPause =
        !isVisibleRef.current ||
        isDraggingRef.current ||
        (currentSettings.pauseOnHover !== false && isHoveredRef.current) ||
        (currentSettings.pauseOnFocus !== false && isFocusedRef.current) ||
        isPausedRef.current;

      if (!shouldPause && seqWidth > 0 && dt > 0 && dt < 0.25) {
        // Responsive speed
        let speed = currentSettings.desktopSpeed ? Math.min(currentSettings.desktopSpeed, 24) : 22;
        if (typeof window !== "undefined") {
          if (window.innerWidth < 768) {
            speed = currentSettings.mobileSpeed ? Math.min(currentSettings.mobileSpeed, 20) : 18;
          } else if (window.innerWidth < 1024) {
            speed = currentSettings.tabletSpeed ? Math.min(currentSettings.tabletSpeed, 22) : 20;
          }
        }

        // Direction: opposite movement
        const dirMult = effectiveDirection === "right" ? 1 : -1;
        offsetRef.current += speed * dt * dirMult;

        // Wrap around seamlessly
        if (offsetRef.current <= -seqWidth) {
          offsetRef.current += seqWidth;
        } else if (offsetRef.current >= 0) {
          offsetRef.current -= seqWidth;
        }

        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [currentSettings, effectiveDirection, isReducedMotion, baseItems]);

  // Smooth Animated Step (Prev / Next Buttons)
  const smoothStep = useCallback(
    (delta: number) => {
      if (stepAnimRef.current) cancelAnimationFrame(stepAnimRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);

      isPausedRef.current = true;
      lastTimeRef.current = null;

      const startOffset = offsetRef.current;
      const startTime = performance.now();
      const duration = 400; // ms

      const stepTick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease Out Cubic curve
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = startOffset + delta * ease;

        offsetRef.current = normalizeOffset(current);
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
        }

        if (progress < 1) {
          stepAnimRef.current = requestAnimationFrame(stepTick);
        } else {
          // Resume autoplay after 2.5 seconds
          if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
          resumeTimeoutRef.current = setTimeout(() => {
            isPausedRef.current = false;
            lastTimeRef.current = null;
          }, 2500);
        }
      };

      stepAnimRef.current = requestAnimationFrame(stepTick);
    },
    [normalizeOffset]
  );

  const handlePrev = useCallback(() => {
    const cardStep = typeof window !== "undefined" && window.innerWidth < 768 ? 320 : 400;
    smoothStep(cardStep);
  }, [smoothStep]);

  const handleNext = useCallback(() => {
    const cardStep = typeof window !== "undefined" && window.innerWidth < 768 ? 320 : 400;
    smoothStep(-cardStep);
  }, [smoothStep]);

  // ── Touch & Pointer Gestures for Fluid 1:1 Swiping ──
  const handlePointerDown = (e: React.PointerEvent) => {
    if (currentSettings.dragEnabled === false || isReducedMotion || baseItems.length <= 1) return;
    if (stepAnimRef.current) cancelAnimationFrame(stepAnimRef.current);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);

    isDraggingRef.current = true;
    isPausedRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    dragStartOffsetRef.current = offsetRef.current;
    dragMovedRef.current = 0;
    isHorizontalGestureRef.current = null;
    lastPointerXRef.current = e.clientX;
    lastPointerTimeRef.current = performance.now();
    pointerVelocityRef.current = 0;
    lastTimeRef.current = null;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartXRef.current;
    const dy = e.clientY - dragStartYRef.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Detect gesture direction on initial movement
    if (isHorizontalGestureRef.current === null) {
      if (absDx > 6 || absDy > 6) {
        if (absDy > absDx) {
          // Vertical scroll - release drag
          isHorizontalGestureRef.current = false;
          isDraggingRef.current = false;
          isPausedRef.current = false;
          return;
        } else {
          isHorizontalGestureRef.current = true;
        }
      }
    }

    if (isHorizontalGestureRef.current === false) return;

    dragMovedRef.current = absDx;

    // Track velocity
    const now = performance.now();
    const dt = now - lastPointerTimeRef.current;
    if (dt > 0) {
      pointerVelocityRef.current = (e.clientX - lastPointerXRef.current) / dt;
      lastPointerXRef.current = e.clientX;
      lastPointerTimeRef.current = now;
    }

    // Direct 1:1 hardware transform
    const newOffset = normalizeOffset(dragStartOffsetRef.current + dx);
    offsetRef.current = newOffset;

    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${newOffset}px, 0, 0)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    lastTimeRef.current = null;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Suppress card link clicks if user dragged
    if (dragMovedRef.current > 6) {
      wasDraggingRef.current = true;
      setTimeout(() => {
        wasDraggingRef.current = false;
      }, 200);
    }

    // Inertial fling momentum if flicked
    const velocity = pointerVelocityRef.current;
    if (Math.abs(velocity) > 0.35) {
      const flingDistance = velocity * 180;
      smoothStep(flingDistance);
    } else {
      // Resume autoplay after brief delay
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => {
        isPausedRef.current = false;
        lastTimeRef.current = null;
      }, currentSettings.resumeDelay || 1800);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if (wasDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const isContinuous =
    currentSettings.endlessScrollEnabled !== false && !isReducedMotion && baseItems.length > 1;

  return (
    <ScrollReveal
      as="section"
      id="reviews-section"
      stagger={0.06}
      yOffset={20}
      className="py-8 sm:py-14 lg:py-[72px] bg-white border-b border-neutral-200/80 relative overflow-hidden font-sans select-none"
    >
      {/* ── Centred Content Container (1240px max-width) ── */}
      <div className="max-w-[1240px] w-[calc(100%-32px)] sm:w-[calc(100%-48px)] mx-auto relative z-10">
        {/* ── Single Responsive Header with One Canonical H2 ── */}
        <div data-reveal-item className="flex flex-col items-center text-center max-w-3xl mx-auto mb-6 sm:mb-10">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full md:rounded-[6px] bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] sm:text-xs font-bold uppercase tracking-[0.09em] mb-2 sm:mb-3.5 select-none">
            <GoogleIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Google Reviews</span>
          </div>

          {/* Single Canonical H2 */}
          <h2
            className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-neutral-900 tracking-tight leading-tight mb-2 sm:mb-3.5 m-0 p-0"
          >
            Loved by Customers Across Sri Lanka
          </h2>

          {/* Rating Summary */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base font-semibold text-neutral-600 mb-4 sm:mb-5 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-amber-500 font-black text-base sm:text-xl leading-none">
                {overallRating.toFixed(1)}
              </span>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <span className="text-neutral-300">•</span>
            <span className="text-neutral-500 font-normal">
              Based on{" "}
              <strong className="text-neutral-900 font-semibold">{totalReviewsCount}+</strong>{" "}
              verified reviews
            </span>
          </div>

          {/* Action Links & Controls */}
          <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
            <a
              href={mainViewAllUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-full sm:rounded-lg bg-neutral-900 hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95"
            >
              <span>View All Reviews</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={mainWriteReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-full sm:rounded-lg bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 text-xs sm:text-sm font-semibold transition-all shadow-2xs active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-neutral-600" />
              <span>Write a Review</span>
            </a>

            <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
              <button
                type="button"
                onClick={handlePrev}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-100 flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                aria-label="Previous Review"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                aria-label="Next Review"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Moving Reviews Rail (Hardware Accelerated 60fps) ── */}
      <div
        ref={sectionRef}
        data-reveal-item
        className="relative w-full overflow-hidden select-none"
        style={{ touchAction: "pan-y" }}
        onMouseEnter={() => {
          isHoveredRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;
        }}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={() => {
          isFocusedRef.current = false;
        }}
      >
        {/* Edge Fade Gradients */}
        {currentSettings.edgeFadeEnabled !== false && (
          <>
            <div
              style={{
                width: `${currentSettings.edgeFadeWidth || 60}px`,
                background: `linear-gradient(to right, ${currentSettings.edgeFadeColor || "#FFFFFF"}, transparent)`,
              }}
              className="absolute left-0 top-0 bottom-0 z-20 pointer-events-none hidden sm:block"
            />
            <div
              style={{
                width: `${currentSettings.edgeFadeWidth || 60}px`,
                background: `linear-gradient(to left, ${currentSettings.edgeFadeColor || "#FFFFFF"}, transparent)`,
              }}
              className="absolute right-0 top-0 bottom-0 z-20 pointer-events-none hidden sm:block"
            />
          </>
        )}

        {isContinuous ? (
          /* Continuous Endless Moving Track with 1:1 Pointer & Touch Drag */
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="flex items-stretch gap-3.5 sm:gap-5 cursor-grab active:cursor-grabbing will-change-transform touch-pan-y pl-4 sm:pl-6"
            style={{ width: "max-content", touchAction: "pan-y" }}
          >
            {/* Sequence A */}
            <div ref={singleSeqRef} className="flex items-stretch gap-3.5 sm:gap-5 shrink-0">
              {baseItems.map((rev, idx) => (
                <ReviewCard
                  key={`seq-a-${rev.id || idx}-${idx}`}
                  review={rev}
                  mainViewAllUrl={mainViewAllUrl}
                  onLinkClick={handleLinkClick}
                />
              ))}
            </div>

            {/* Sequence B (Cloned for seamless infinite loop) */}
            <div className="flex items-stretch gap-3.5 sm:gap-5 shrink-0" aria-hidden="true">
              {baseItems.map((rev, idx) => (
                <ReviewCard
                  key={`seq-b-${rev.id || idx}-${idx}`}
                  review={rev}
                  mainViewAllUrl={mainViewAllUrl}
                  onLinkClick={handleLinkClick}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Fallback Static / Manual Scroll Rail */
          <div className="max-w-[1240px] w-[calc(100%-32px)] sm:w-[calc(100%-48px)] mx-auto">
            <div className="flex overflow-x-auto gap-3.5 sm:gap-5 pb-2 no-scrollbar scroll-smooth">
              {displayReviews.map((rev, idx) => (
                <ReviewCard
                  key={`static-${rev.id || idx}`}
                  review={rev}
                  mainViewAllUrl={mainViewAllUrl}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}
