"use client";

import React from "react";
import { Truck, ShieldCheck, RotateCcw, Headphones } from "lucide-react";

interface BenefitItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}

const benefits: BenefitItem[] = [
  {
    icon: Truck,
    title: "Free Delivery",
    subtitle: "for orders over LKR 5,000.",
  },
  {
    icon: ShieldCheck,
    title: "100% Authentic",
    subtitle: "Genuine products only.",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    subtitle: "Hassle-free shopping.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    subtitle: "We're always here.",
  },
];

export default function StoreBenefitsBar() {
  return (
    <section
      aria-label="Shopping Benefits"
      className="premium-benefits w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 select-none font-sans"
    >
      <div className="w-full bg-white border border-[#E8E8E8] rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-neutral-300 transition-colors duration-200">
        {/* Desktop: 4 Columns with Vertical Dividers */}
        <div className="hidden lg:grid lg:grid-cols-4 divide-x divide-neutral-200/90 items-center">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className={`flex items-center gap-4 group ${
                  i > 0 ? "pl-6 xl:pl-8" : ""
                } ${i < benefits.length - 1 ? "pr-6 xl:pr-8" : ""}`}
              >
                {/* Burgundy Icon in Soft Circular Background */}
                <div className="w-12 h-12 rounded-full bg-[#FAF5F6] border border-[#F3E8EB] flex items-center justify-center shrink-0 text-[#64152F] group-hover:scale-105 group-hover:bg-[#64152F] group-hover:text-white transition-all duration-300 shadow-2xs">
                  <Icon className="w-5 h-5 stroke-[1.9] transition-colors" />
                </div>
                {/* Typography */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-[14px] xl:text-[15px] font-bold text-[#111111] leading-tight group-hover:text-[#64152F] transition-colors truncate">
                    {b.title}
                  </h4>
                  <p className="text-xs xl:text-[13px] text-neutral-500 font-normal leading-snug mt-1 truncate">
                    {b.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tablet & Mobile: 2-Column Responsive Grid with Clean Spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 sm:gap-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={`mob-${b.title}`}
                className="flex items-center gap-3.5 p-2.5 sm:p-3 rounded-xl hover:bg-neutral-50/80 transition-colors"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FAF5F6] border border-[#F3E8EB] flex items-center justify-center shrink-0 text-[#64152F] shadow-2xs">
                  <Icon className="w-5 h-5 stroke-[1.9]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[13px] sm:text-[14px] font-bold text-[#111111] leading-tight">
                    {b.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-neutral-500 font-normal leading-snug mt-0.5">
                    {b.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
