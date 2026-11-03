"use client";

import React from "react";
import Link from "next/link";
import {
  Smartphone,
  Tablet,
  Watch,
  Headphones,
  Speaker,
  Zap,
  BatteryCharging,
  Laptop,
  Shield,
  ShoppingBag,
  CircleCheck as Sparkles,
  Tag,
  Flame,
} from "lucide-react";
import { Category, Brand } from "@/lib/types";

interface MobileChannelGridProps {
  categories: Category[];
  brands?: Brand[];
}

function getCategoryIcon(name: string) {
  const n = (name || "").toLowerCase();
  if (n.includes("phone") || n.includes("mobile") || n.includes("smartphone")) return <Smartphone className="w-5 h-5" />;
  if (n.includes("tablet") || n.includes("ipad")) return <Tablet className="w-5 h-5" />;
  if (n.includes("watch")) return <Watch className="w-5 h-5" />;
  if (n.includes("earbud") || n.includes("tws") || n.includes("airpod") || n.includes("headphone")) return <Headphones className="w-5 h-5" />;
  if (n.includes("speaker") || n.includes("soundbar")) return <Speaker className="w-5 h-5" />;
  if (n.includes("charger") || n.includes("adapter") || n.includes("cable")) return <Zap className="w-5 h-5" />;
  if (n.includes("power") || n.includes("battery")) return <BatteryCharging className="w-5 h-5" />;
  if (n.includes("laptop") || n.includes("macbook")) return <Laptop className="w-5 h-5" />;
  if (n.includes("case") || n.includes("cover") || n.includes("protector") || n.includes("display")) return <Shield className="w-5 h-5" />;
  return <ShoppingBag className="w-5 h-5" />;
}

export default function MobileChannelGrid({ categories = [] }: MobileChannelGridProps) {
  // Filter active valid categories only
  const validCategories = (categories || [])
    .filter((c) => c && c.name && (c.status === "active" || !c.status))
    .slice(0, 10);

  if (validCategories.length === 0) return null;

  return (
    <section className="md:hidden w-full bg-white border-b border-neutral-100 py-3.5 px-3">
      {/* 2-Row Horizontal Scrollable Tile Matrix */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1 -mx-3 px-3">
        {validCategories.map((cat) => {
          const cleanName = cat.name
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu, "")
            .trim();
          const href = `/products?category=${encodeURIComponent(cleanName)}`;

          return (
            <Link
              key={cat.id || cat.slug || cleanName}
              href={href}
              className="flex flex-col items-center gap-1.5 min-w-[70px] max-w-[76px] shrink-0 text-center active:scale-95 transition-transform"
            >
              <div className="w-13 h-13 rounded-2xl bg-[#090D14] border border-white/10 text-white flex items-center justify-center shadow-xs">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cleanName}
                    className="w-7 h-7 object-contain rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  getCategoryIcon(cleanName)
                )}
              </div>
              <span className="text-[11px] font-bold text-neutral-800 line-clamp-1 leading-tight tracking-tight">
                {cleanName}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
