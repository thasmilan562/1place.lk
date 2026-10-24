"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ArrowRight } from "lucide-react";
import { OfferBanner } from "@/lib/types";
import { getOfferBanners } from "@/lib/firestore-client";

export default function AnnouncementBar() {
  const pathname = usePathname();
  const [banner, setBanner] = useState<OfferBanner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function loadAnnouncement() {
      try {
        const banners = await getOfferBanners("announcement_bar");
        const now = Date.now();
        const active = banners.filter((b) => {
          if (b.status && b.status !== "active") return false;
          if (b.startAt && new Date(b.startAt).getTime() > now) return false;
          if (!b.noExpiry && b.endAt && new Date(b.endAt).getTime() <= now) return false;
          if (b.countdownEnabled && b.countdownEndAt && new Date(b.countdownEndAt).getTime() <= now) return false;
          return true;
        });
        if (active.length > 0) {
          setBanner(active[0]);
        } else {
          setBanner(null);
        }
      } catch (err) {
        console.error("Failed to load announcement bar:", err);
      }
    }
    loadAnnouncement();
  }, []);

  if (!banner || dismissed || pathname.startsWith("/admin") || pathname.startsWith("/login")) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black py-2 px-4 relative z-[60] text-xs font-semibold">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 text-center flex items-center justify-center gap-2 truncate">
          <span>
            {banner.headline} {banner.highlightText && <strong className="underline">{banner.highlightText}</strong>}
          </span>
          {banner.primaryCtaText && (
            <Link
              href={banner.primaryCtaUrl || "/products"}
              className="inline-flex items-center gap-1 text-black font-bold hover:opacity-80 underline ml-2 shrink-0"
            >
              {banner.primaryCtaText} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-black/10 text-black/70 hover:text-black transition-colors shrink-0"
          aria-label="Dismiss announcement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
