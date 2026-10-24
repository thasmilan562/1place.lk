"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function LargeCampaignBanner() {
  return (
    <section
      aria-label="New Collection Campaign"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 select-none font-sans"
    >
      <div className="relative overflow-hidden rounded-3xl bg-[#F0ECE9] border border-[#E0D8D3] p-6 sm:p-10 lg:p-14 flex flex-col md:flex-row items-center justify-between shadow-sm">
        {/* Left Text Content */}
        <div className="relative z-10 max-w-lg mb-6 md:mb-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#D5CCC6] text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#64152F] mb-3 shadow-2xs">
            <span>NEW COLLECTION</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#111111] tracking-tight leading-[1.08] mb-2 sm:mb-3">
            Up to <span className="text-[#64152F]">30% Off</span> Instant Discount
          </h2>

          <p className="text-xs sm:text-sm text-[#666666] leading-relaxed max-w-md mb-6 font-medium">
            Explore authentic tech, flagship smartphones, laptops and lifestyle collections with official warranty and express islandwide doorstep courier.
          </p>

          <Link
            href="/products?featured=true"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-full bg-[#111111] hover:bg-[#64152F] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>Shop Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Right Product Composition Image */}
        <div className="relative w-full md:w-[48%] h-[200px] sm:h-[280px] lg:h-[340px] shrink-0">
          <Image
            src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1000&auto=format&fit=crop"
            alt="New Collection Showcase"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain md:object-right group-hover:scale-102 transition-transform duration-500"
          />
        </div>
      </div>
    </section>
  );
}
