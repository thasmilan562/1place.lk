"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
} from "lucide-react";
import { DEFAULT_FOOTER_SETTINGS } from "@/lib/data";
import { FooterSettings } from "@/lib/types";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import BrandLogo from "@/components/ui/BrandLogo";
import { BUSINESS_INFO } from "@/lib/business-info";

/* ─── Social Media SVG Icons ─── */
function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.45 6.27 6.27 0 0 0 1.89-4.49V8.62a8.28 8.28 0 0 0 4.84 1.54V6.71a4.86 4.86 0 0 1-1-.02z" />
    </svg>
  );
}

export default function Footer() {
  const pathname = usePathname();
  if (["/admin", "/checkout", "/login"].some((path) => pathname.startsWith(path))) return null;
  return <MinimalFooter />;
}

function MinimalFooter() {
  const [settings, setSettings] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  useEffect(() => onSnapshot(doc(db, "settings", "footer"), (snapshot) => {
    setSettings(snapshot.exists() ? { ...DEFAULT_FOOTER_SETTINGS, ...snapshot.data() } as FooterSettings : DEFAULT_FOOTER_SETTINGS);
  }, () => {}), []);
  if (!settings.enabled) return null;
  const safeUrl = (url: string) => /^(https?:\/\/|mailto:|tel:|\/(?!\/))/.test(url) ? url : "";
  const shopLinks = [
    { label: "Shop all", href: "/products" },
    { label: "Categories", href: "/#categories-strip" },
    { label: "New arrivals", href: "/products?sort=newest" },
  ];
  const policies = settings.policy_links || DEFAULT_FOOTER_SETTINGS.policy_links;
  const socials = [
    { name: "Instagram", href: settings.instagram_url, enabled: settings.instagram_enabled, Icon: InstagramIcon },
    { name: "Facebook", href: settings.facebook_url, enabled: settings.facebook_enabled, Icon: FacebookIcon },
    { name: "TikTok", href: settings.tiktok_url, enabled: settings.tiktok_enabled, Icon: TikTokIcon },
  ].filter((item) => item.enabled && safeUrl(item.href));
  const description = settings.description && settings.description !== DEFAULT_FOOTER_SETTINGS.description
    ? settings.description : "Good finds. All in one place.";
  return (
    <footer className="store-footer" aria-label="Store information">
      <div className="store-footer__inner">
        <div className="store-footer__top">
          <div className="store-footer__brand">
            {settings.logo_url && settings.logo_url !== DEFAULT_FOOTER_SETTINGS.logo_url && safeUrl(settings.logo_url) ? <Link href="/" aria-label="ONEPLACE homepage"><img src={settings.logo_url} alt="ONEPLACE" style={{ width: 142, height: "auto" }} onError={(event) => { event.currentTarget.src = "/logo.png"; }} /></Link> : <BrandLogo href="/" />}
            <p>{description}</p>
            <div className="store-footer__socials" aria-label="Follow ONEPLACE">
              {socials.map(({ name, href, Icon }) => <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`ONEPLACE on ${name}`}><Icon className="w-4 h-4" /></a>)}
            </div>
          </div>
          <nav aria-label="Explore the store"><h2>Explore</h2>{shopLinks.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
          <nav aria-label="Customer support"><h2>Customer support</h2><a href={`tel:${BUSINESS_INFO.phonePrimaryIntl}`}>{BUSINESS_INFO.phonePrimary}</a><a href={`mailto:${BUSINESS_INFO.email}`}>{BUSINESS_INFO.email}</a></nav>
        </div>
        <div className="store-footer__bottom">
          <p>{settings.copyright_text || `© ${new Date().getFullYear()} 1place.lk. All rights reserved.`}</p>
          <nav aria-label="Policies">{policies.filter((item) => safeUrl(item.href)).map((item) => <Link key={item.id || item.href} href={item.href}>{item.label}</Link>)}</nav>
          <button type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}><ArrowUp size={15} /></button>
        </div>
      </div>
    </footer>
  );
}
