"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import type { CSSProperties } from "react";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import { HOME_OFFER_DEFAULTS, HomeOfferSettings, offerEndTime, safeOfferLink } from "@/lib/home-offers";

function formatPrice(amount?: number) {
  return typeof amount === "number" ? `LKR ${amount.toLocaleString("en-LK")}` : "";
}

export default function HomeOfferBanners({
  products,
  fallbackEndsAt = "",
  initialSettings,
}: {
  products: Product[];
  fallbackEndsAt?: string;
  initialSettings?: HomeOfferSettings | null;
}) {
  const [settings, setSettings] = useState<HomeOfferSettings>(initialSettings || HOME_OFFER_DEFAULTS);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // 1. Fetch from public API endpoint
    fetch("/api/home-offers")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings({ ...HOME_OFFER_DEFAULTS, ...data.settings });
        }
      })
      .catch(() => {});

    // 2. Real-time Firestore snapshot listener if available
    try {
      const unsub = onSnapshot(
        doc(db, "settings", "home_offers"),
        (snapshot) => {
          if (snapshot.exists()) setSettings({ ...HOME_OFFER_DEFAULTS, ...snapshot.data() } as HomeOfferSettings);
        },
        (err) => console.warn("Home offers snapshot listener error:", err)
      );
      return () => unsub();
    } catch {}
  }, []);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!settings.enabled) return null;
  const end = offerEndTime(settings.endsAt || fallbackEndsAt);
  const hasEnd = Number.isFinite(end);
  const expired = now !== null && hasEnd && now >= end;
  const remaining = now === null || !hasEnd ? 0 : Math.max(0, Math.floor((end - now) / 1000));
  const time = [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];
  const product = products.find((item) => item.old_price && item.old_price > item.price && item.stock_status !== "out_of_stock") || products[0];
  const image = settings.dealImage || product?.images?.[0] || product?.image_url;
  const productTitle = settings.dealTitle && !["Today's Deal", "Today’s Deal"].includes(settings.dealTitle)
    ? settings.dealTitle
    : product?.name || "Today's Deal";
  const discount = !settings.dealImage && product?.old_price && product.old_price > product.price
    ? Math.round((1 - product.price / product.old_price) * 100)
    : null;
  const dealLink = safeOfferLink(settings.dealLink);

  return (
    <section className="home-offers hidden md:block" aria-label="Today's deal">
      <article className={`home-offers__banner${expired ? " is-expired" : ""}`} style={{ "--deal-banner-color": settings.dealBackgroundColor || "#118a22" } as CSSProperties}>
        <div className="home-offers__panel" aria-hidden="true" />
        <div className="home-offers__copy home-offers__copy--left">
          <span className="home-offers__badge">{discount ? `${discount}% OFF` : settings.dealBadge || "TODAY'S DEAL"}</span>
          <h2>{productTitle}</h2>
          {product && !settings.dealImage && <div className="home-offers__price"><strong>{formatPrice(product.price)}</strong>{product.old_price && product.old_price > product.price && <del>{formatPrice(product.old_price)}</del>}</div>}
        </div>

        {image && <div className="home-offers__product-art"><img src={image} alt={settings.dealImage ? productTitle : product?.name || "Today's deal product"} /></div>}

        <div className="home-offers__copy home-offers__copy--right">
          <span className="home-offers__eyebrow">{expired ? "OFFER CLOSED" : settings.dealBadge || "TODAY'S DEAL"}</span>
          <h3>{expired ? "More good finds await." : settings.ctaTitle || "Good finds. Better prices."}</h3>
          <p>{settings.dealDescription || "Limited-time savings on selected favourites."}</p>

          {hasEnd && <div className="home-offers__timer" aria-live="off">
            <span className="home-offers__timer-label"><Clock size={13} />{expired ? "DEAL ENDED" : "DEAL ENDS IN"}</span>
            {!expired && <div className="home-offers__digits" aria-label={`${time[0]} days, ${time[1]} hours, ${time[2]} minutes, ${time[3]} seconds remaining`}>
              {time.map((value, index) => <div key={index}><strong>{now === null ? "–" : String(value).padStart(2, "0")}</strong><small>{["Days", "Hrs", "Mins", "Secs"][index]}</small></div>)}
            </div>}
          </div>}

          <Link className="home-offers__button" href={expired ? "/products" : dealLink} aria-label={expired ? "Browse all products" : "Shop today's deal"}>
            {expired ? "Browse Products" : settings.ctaText || "Shop Now"}<ArrowRight size={17} />
          </Link>
        </div>
      </article>
    </section>
  );
}
