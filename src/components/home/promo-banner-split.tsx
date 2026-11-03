"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CircleCheck as Sparkles } from "lucide-react";

export default function PromoBannerSplit() {
  return (
    <section
      aria-label="Promotional Specials"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 select-none font-sans"
    >
      {/* ── Desktop & Tablet Split (Reference 2) ── */}
      <div className="hidden sm:grid sm:grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-stretch">
        {/* Left Wide Card (Takes 2 Columns on Desktop) */}
        <Link
          href="/products?category=earbuds"
          className="md:col-span-2 group relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-[#F7F7F7] border border-[#E8E8E8] flex items-center justify-between hover:border-[#64152F] hover:shadow-lg transition-all duration-300 min-h-[220px]"
        >
          <div className="relative z-10 max-w-[58%]">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#64152F] block mb-1">
              GET REWARDED
            </span>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#111111] leading-tight mb-1">
              Super Cheap Price
            </h3>
            <p className="text-xs sm:text-sm text-[#666666] font-medium mb-4">
              Earn 20% Back in Rewards on Premium Audio & Tech
            </p>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111111] group-hover:bg-[#64152F] text-white font-bold text-xs shadow-md transition-colors">
              <span>Shop Now</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="relative w-[180px] lg:w-[220px] h-[160px] lg:h-[180px] shrink-0">
            <Image
              src="https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=600&auto=format&fit=crop"
              alt="Premium Speakers"
              fill
              sizes="220px"
              className="object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>

        {/* Right Stacked Column (2 Stacked Promo Cards) */}
        <div className="flex flex-col gap-4 justify-between">
          {/* Card 1: Power Banks & Chargers */}
          <Link
            href="/products?category=power-banks"
            className="group relative overflow-hidden rounded-2xl p-5 bg-[#F7F7F7] border border-[#E8E8E8] flex items-center justify-between hover:border-[#64152F] hover:shadow-md transition-all flex-1 min-h-[105px]"
          >
            <div className="max-w-[62%]">
              <h4 className="text-xs sm:text-sm font-bold text-[#111111] leading-tight mb-1">
                Charger Power Bank 10000mAh
              </h4>
              <span className="text-[11px] text-[#666666] font-medium block">
                Starting at <strong className="text-[#64152F]">LKR 4,990</strong>
              </span>
            </div>
            <div className="relative w-16 h-16 shrink-0">
              <Image
                src="https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?q=80&w=300&auto=format&fit=crop"
                alt="Power Banks"
                fill
                sizes="100px"
                className="object-contain group-hover:scale-110 transition-transform duration-300"
              />
            </div>
          </Link>

          {/* Card 2: Accessories & Gaming */}
          <Link
            href="/products?category=charging-cables"
            className="group relative overflow-hidden rounded-2xl p-5 bg-[#F7F7F7] border border-[#E8E8E8] flex items-center justify-between hover:border-[#64152F] hover:shadow-md transition-all flex-1 min-h-[105px]"
          >
            <div className="max-w-[62%]">
              <h4 className="text-xs sm:text-sm font-bold text-[#111111] leading-tight mb-1">
                Fast Charging Cables & Hubs
              </h4>
              <span className="text-[11px] text-[#666666] font-medium block">
                Discount <strong className="text-[#64152F]">30% Off</strong>
              </span>
            </div>
            <div className="relative w-16 h-16 shrink-0">
              <Image
                src="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=300&auto=format&fit=crop"
                alt="Accessories"
                fill
                sizes="100px"
                className="object-contain group-hover:scale-110 transition-transform duration-300"
              />
            </div>
          </Link>
        </div>
      </div>

      {/* ── Mobile Special Offer Banner (Reference 1) ── */}
      <div className="sm:hidden">
        <Link
          href="/products?sort=best_sellers"
          className="group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-[#22050D] via-[#4A0E21] to-[#64152F] text-white flex items-center justify-between shadow-md active:scale-[0.98] transition-all"
        >
          <div className="relative z-10 max-w-[65%]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFB5C5] block mb-1">
              SPECIAL OFFER
            </span>
            <h3 className="text-lg font-black text-white leading-tight mb-1">
              Up to 30% Off
            </h3>
            <p className="text-[11px] text-white/80 font-medium mb-3">
              On selected essentials & devices
            </p>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black font-bold text-[11px] shadow-sm">
              <span>Grab Now</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Right Circular Discount Badge & Product Image */}
          <div className="relative flex flex-col items-center justify-center shrink-0">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-center shadow-lg">
              <span className="text-sm font-black text-white leading-none">30%</span>
              <span className="text-[9px] font-bold text-[#FFB5C5] leading-none uppercase">OFF</span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
