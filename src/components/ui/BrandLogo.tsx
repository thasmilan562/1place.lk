"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  /**
   * Layout & context variant
   * - header: Primary navigation bar (responsive sizing)
   * - footer: Dark footer container
   * - admin: Admin sidebar / header
   * - mobile: Mobile drawer & narrow viewports
   * - auth: Login & registration modals/pages
   * - icon: Square icon tile (for collapsed sidebars / avatars)
   * - default: Standard display
   */
  variant?: "header" | "footer" | "admin" | "mobile" | "auth" | "icon" | "default";
  className?: string;
  href?: string;
  priority?: boolean;
  onClick?: () => void;
  alt?: string;
}

/**
 * Authoritative Centralized ONEPLACE Brand Logo Component
 * Source of truth: /logo.png (Cropped 1024x168 derivative) & /logo.svg (Standalone vector)
 */
export default function BrandLogo({
  variant = "default",
  className,
  href,
  priority = false,
  onClick,
  alt = "ONEPLACE.LK",
}: BrandLogoProps) {
  // Variant-specific styling rules
  let imageClasses = "w-auto object-contain select-none transition-transform";
  let wrapperClasses = "inline-flex items-center shrink-0";

  switch (variant) {
    case "header":
      // Crisp horizontal logo in navigation bar
      imageClasses = cn(imageClasses, "h-7 sm:h-8 lg:h-9 max-w-[190px] sm:max-w-[210px] lg:max-w-[230px] opacity-70");
      break;

    case "footer":
      // Sizing and container for dark footer to preserve contrast
      wrapperClasses = cn(
        wrapperClasses,
        "p-1.5 sm:p-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 transition-colors shadow-xs"
      );
      imageClasses = cn(imageClasses, "h-7 sm:h-8 max-w-[170px] sm:max-w-[190px] brightness-0 invert");
      break;

    case "admin":
      // High-contrast sizing for admin sidebar & headers
      wrapperClasses = cn(wrapperClasses, "p-1 rounded-lg bg-white/[0.05] border border-white/10");
      imageClasses = cn(imageClasses, "h-6 sm:h-7 max-w-[150px] brightness-0 invert");
      break;

    case "mobile":
      // Fitted for narrow mobile drawers without overlapping controls
      imageClasses = cn(imageClasses, "h-7 sm:h-8 max-w-[160px] opacity-70");
      break;

    case "auth":
      // Sizing for login modal & pages
      imageClasses = cn(imageClasses, "h-8 sm:h-10 max-w-[200px]");
      break;

    case "icon":
      // Square brand icon variant
      imageClasses = cn(imageClasses, "w-8 h-8 rounded-lg");
      break;

    default:
      imageClasses = cn(imageClasses, "h-8 w-auto max-w-[200px]");
      break;
  }

  const logoElement = (
    <div className={cn(wrapperClasses, className)}>
      {variant === "icon" ? (
        <img
          src="/icon.svg"
          alt={alt}
          className={imageClasses}
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <img
          src="/logo.png"
          alt={alt}
          className={imageClasses}
          loading={priority ? "eager" : "lazy"}
          onError={(e) => {
            // Safe fallback to standalone embedded svg
            (e.target as HTMLImageElement).src = "/logo.svg";
          }}
        />
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex items-center shrink-0 focus:outline-hidden group"
        aria-label={`${alt} Homepage`}
      >
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}

export { BrandLogo };
