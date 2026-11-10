"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_HERO_SLIDES } from "@/lib/data";
import { HeroSlide } from "@/lib/types";
import { normalizeImageUrl } from "@/lib/utils";
import type { CSSProperties } from "react";

function activeSlides(slides: HeroSlide[]) {
  const now = Date.now();
  return slides.filter((slide) => slide.active !== false &&
    (!slide.start_date || new Date(slide.start_date).getTime() <= now) &&
    (!slide.expiry_date || new Date(slide.expiry_date).getTime() > now))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function formatCase(text: string, casing?: string) {
  if (casing === "uppercase") return text.toUpperCase();
  if (casing === "title_case") return text.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
  return text;
}

export default function PremiumHero({ initialSlides }: { initialSlides?: HeroSlide[] } = {}) {
  const [slides, setSlides] = useState<HeroSlide[]>(() => {
    if (initialSlides && initialSlides.length > 0) {
      return activeSlides(initialSlides);
    }
    return activeSlides(DEFAULT_HERO_SLIDES);
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !(initialSlides && initialSlides.length > 0));
  const [index, setIndex] = useState(0);
  const [playing] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [imageErrors, setImageErrors] = useState({ key: "", desktop: false, mobile: false });
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch latest slides via API endpoint
    fetch(`/api/hero?_t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.slides)) return;
        const valid = activeSlides(data.slides);
        if (valid.length > 0) {
          setSlides(valid);
          setIsLoading(false);
        }
      })
      .catch(() => {});

    // 2. Real-time Firestore snapshot listener
    let unsubSnapshot: (() => void) | null = null;
    try {
      unsubSnapshot = onSnapshot(
        collection(db, "hero_slides"),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!isMounted) return;
          if (snapshot.metadata.fromCache && slides.length > 0) return;
          if (!snapshot.empty) {
            const firestoreSlides = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as HeroSlide);
            const valid = activeSlides(firestoreSlides);
            if (valid.length > 0) {
              setSlides(valid);
            }
          }
          setIsLoading(false);
        },
        () => {
          if (isMounted) setIsLoading(false);
        }
      );
    } catch {
      if (isMounted) setIsLoading(false);
    }

    return () => {
      isMounted = false;
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const safeIndex = slides.length ? index % slides.length : 0;
  const slide = slides[safeIndex];
  const desktopImage = slide ? normalizeImageUrl(slide.desktop_image_url || slide.image_url) : "";
  const mobileImage = slide ? normalizeImageUrl(slide.mobile_image_url || slide.image_url || slide.desktop_image_url) : "";
  const imageKey = `${slide?.id || ""}:${desktopImage}:${mobileImage}`;
  const desktopImageError = imageErrors.key === imageKey && imageErrors.desktop;
  const mobileImageError = imageErrors.key === imageKey && imageErrors.mobile;
  useEffect(() => {
    if (!playing || reducedMotion || slides.length < 2) return;
    const duration = slide?.autoplay_duration || 7;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((previous) => (previous + 1) % slides.length);
    }, Math.max(5000, duration < 100 ? duration * 1000 : duration));
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, slides.length, slide?.autoplay_duration]);

  if (isLoading) {
    return (
      <section className="premium-hero premium-hero--loading" role="status" aria-label="Loading hero banner">
        <div className="premium-hero__loader">
          <span className="premium-hero__loader-mark" aria-hidden="true" />
          <span>Loading your picks</span>
        </div>
      </section>
    );
  }
  if (!slide) return null;
  const move = (amount: number) => setIndex((safeIndex + amount + slides.length) % slides.length);
  const fullImage = true;
  const line1 = formatCase(slide.heading_line_1 || slide.heading || "Discover your next favourite.", slide.heading_line_1_casing);
  const line2 = formatCase(slide.heading_line_2 || "", slide.heading_line_2_casing);
  const hiddenText = slide.hide_content_on_mobile || slide.hide_text_on_mobile;
  const hiddenButtons = slide.hide_content_on_mobile || slide.hide_buttons_on_mobile;
  const horizontal = slide.content_horizontal_position || "left";
  const vertical = slide.content_vertical_position || "center";
  const positionStyle = {
    justifyContent: vertical === "top" ? "flex-start" : vertical === "bottom" ? "flex-end" : "center",
    alignItems: horizontal === "left" ? "flex-start" : horizontal === "right" ? "flex-end" : "center",
    textAlign: slide.text_align || horizontal,
    color: slide.heading_color || "#1d1d1f",
    "--hero-content-max-width": slide.content_max_width === "full" ? "100%" : slide.content_max_width || "620px",
    "--hero-heading-desktop-size": slide.desktop_heading_size || "clamp(38px, 4.6vw, 66px)",
    "--hero-heading-tablet-size": slide.tablet_heading_size || "43px",
    "--hero-heading-mobile-size": slide.mobile_heading_size || "clamp(32px, 9vw, 46px)",
    "--hero-font-family": slide.font_family || "var(--font-sans)",
    "--hero-font-weight": slide.font_weight || "600",
    "--hero-line-height": slide.line_height || "1.055",
    "--hero-letter-spacing": slide.letter_spacing || "-.055em",
    "--hero-button-font-size": slide.button_size === "small" ? "12px" : slide.button_size === "large" ? "17px" : "14px",
    "--hero-button-height": slide.button_size === "small" ? "40px" : slide.button_size === "large" ? "58px" : "50px",
    "--hero-button-padding": slide.button_size === "small" ? "0 18px" : slide.button_size === "large" ? "0 34px" : "0 26px",
  } as CSSProperties;
  const actionsStyle = {
    justifyContent: horizontal === "left" ? "flex-start" : horizontal === "right" ? "flex-end" : "center",
    width: "100%",
  } as CSSProperties;

  return (
    <section className={`premium-hero ${fullImage ? "premium-hero--full" : ""}`} aria-label="Featured collections" aria-roledescription="carousel"
      onTouchStart={(event) => { touchX.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        if (touchX.current !== null && Math.abs(touchX.current - event.changedTouches[0].clientX) > 50) move(touchX.current > event.changedTouches[0].clientX ? 1 : -1);
        touchX.current = null;
      }}>
      <div className="premium-hero__panel" style={fullImage ? { background: "#f0eeeb" } : undefined}>
        <div className="premium-hero__content" style={fullImage ? positionStyle : undefined} aria-live={playing ? "off" : "polite"}>
          <div className={hiddenText ? "premium-hide-mobile" : undefined} style={fullImage ? { width: "min(100%, var(--hero-content-max-width, 620px))" } : undefined}>
            {slide.show_badge !== false && <p className="premium-eyebrow">{slide.campaign_label || "THE ONEPLACE EDIT"}</p>}
            <h1>
              {slide.show_heading_line_1 !== false && <span style={slide.heading_line_1_color ? { color: slide.heading_line_1_color } : undefined}>{line1}</span>}
              {slide.show_heading_line_2 !== false && line2 && <span style={slide.heading_line_2_color ? { color: slide.heading_line_2_color } : undefined}>{line2}</span>}
            </h1>
            {slide.show_description !== false && slide.description && <p className="premium-hero__description" style={{ fontSize: slide.description_size || undefined, color: slide.description_color || undefined }}>{slide.description}</p>}
            {slide.promo_text && <p className="premium-hero__offer">{slide.promo_text}</p>}
          </div>
          <div className={`premium-hero__actions ${hiddenButtons ? "premium-hide-mobile" : ""}`} style={fullImage ? actionsStyle : undefined}>
            {slide.show_primary_button !== false && <Link href={slide.primary_button_url || "/products"} className="premium-button" style={fullImage ? { color: slide.button_text_color || undefined, backgroundColor: slide.button_bg_color || undefined } : undefined}>{slide.primary_button_text || "Shop the collection"}<ArrowRight size={17} /></Link>}
            {slide.show_secondary_button && (slide.secondary_button_url && slide.secondary_button_url !== "/categories" ? <Link href={slide.secondary_button_url} className="premium-text-link">{slide.secondary_button_text || "Explore categories"}<ChevronRight size={17} /></Link> : <button type="button" className="premium-text-link" onClick={() => window.dispatchEvent(new CustomEvent("open-categories-menu"))}>{slide.secondary_button_text || "Explore categories"}<ChevronRight size={17} /></button>)}
          </div>
          <div className="premium-hero__footnote"><span /> A world of good finds. All in one place.</div>
        </div>
        <div className="premium-hero__visual" style={{ backgroundColor: "#f0eeeb" }}>
          {desktopImage && !desktopImageError ? <Image key={`${slide.id}-desktop-${desktopImage}`} src={desktopImage} alt={slide.alt || line1} fill priority sizes="100vw" unoptimized onError={() => setImageErrors((current) => ({ key: imageKey, desktop: true, mobile: current.key === imageKey && current.mobile }))} className="premium-hero__desktop-image" style={{ objectFit: "cover", objectPosition: slide.desktop_image_position || "center" }} /> : <div className="premium-hero__image-fallback premium-hero__desktop-fallback">ONEPLACE<span>Find something you love.</span></div>}
          {mobileImage && !mobileImageError ? <Image key={`${slide.id}-mobile-${mobileImage}`} src={mobileImage} alt={slide.alt || line1} fill priority sizes="100vw" unoptimized onError={() => setImageErrors((current) => ({ key: imageKey, desktop: current.key === imageKey && current.desktop, mobile: true }))} className="premium-hero__mobile-image" style={{ objectFit: "cover", objectPosition: slide.mobile_image_position || "center" }} /> : <div className="premium-hero__image-fallback premium-hero__mobile-fallback">ONEPLACE<span>Find something you love.</span></div>}
          {fullImage && (slide.overlay_opacity ?? 0) > 0 && <div className="premium-hero__scrim" style={{ backgroundColor: slide.overlay_color || "#000", opacity: (slide.overlay_opacity ?? 0) / 100 }} />}
        </div>
      </div>
    </section>
  );
}
