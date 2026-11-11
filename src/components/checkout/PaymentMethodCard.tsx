"use client";

import React from "react";
import { Lock, Banknote, ShieldCheck, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export type PaymentMethod = "card" | "cod";

interface PaymentMethodCardProps {
  selected: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  cardFee?: number;
  isCodAllowed?: boolean;
  isCardAllowed?: boolean;
  deliveryOption?: "standard" | "pickup";
}

export default function PaymentMethodCard({
  selected,
  onChange,
  cardFee = 0,
  isCodAllowed = true,
  isCardAllowed = true,
  deliveryOption = "standard",
}: PaymentMethodCardProps) {
  const isPickup = deliveryOption === "pickup";
  const canUseCash = isPickup || isCodAllowed;
  return (
    <div className="space-y-3">
      {/* ── OPTION 1: Credit / Debit Card ── */}
      <div
        onClick={() => {
          if (isCardAllowed) onChange("card");
        }}
        className={`relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 select-none ${
          !isCardAllowed
            ? "opacity-50 cursor-not-allowed bg-neutral-50 border-neutral-200"
            : selected === "card"
            ? "border-black bg-neutral-50/60 shadow-xs ring-1 ring-black cursor-pointer"
            : "border-neutral-200/90 bg-white hover:border-neutral-400 cursor-pointer"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {/* Custom Radio Circle */}
            <div
              className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center border transition-all shrink-0 ${
                selected === "card"
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 bg-white"
              }`}
            >
              {selected === "card" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>

            {/* Label & Description */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-neutral-950">
                  Credit / Debit Card
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                  <Lock className="w-3 h-3 text-neutral-600" />
                  Instant &amp; Secure
                </span>
              </div>

              <p className="text-xs text-neutral-500 font-medium">
                Pay securely using your preferred card.
              </p>

              {/* Sub-text: Securely processed by PayHere */}
              <div className="pt-2 flex items-center gap-2 text-[11px] text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Securely processed by PayHere (2% gateway charge)</span>
              </div>
            </div>
          </div>

          {/* Genuine Official Card Logos & PayHere Fee info */}
          <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
            <div className="flex items-center gap-1.5">
              {/* Visa Logo */}
              <div className="h-6 w-9 sm:h-7 sm:w-11 bg-white border border-neutral-200/80 rounded-md flex items-center justify-center p-1 shadow-2xs">
                <svg className="h-3 sm:h-3.5 w-auto" viewBox="0 0 48 16" fill="none">
                  <path
                    d="M18.88 1.15L12.39 15.65H8.38L5.13 3.52C4.94 2.76 4.75 2.48 4.14 2.15C3.12 1.6 1.48 1.1 0 0.77L0.09 0.35H6.96C7.85 0.35 8.64 0.94 8.84 1.95L10.53 10.97L14.71 0.35H18.88V1.15ZM35.48 10.66C35.5 6.64 29.93 6.42 29.96 4.62C29.98 4.07 30.51 3.49 31.67 3.34C32.24 3.26 33.84 3.2 35.53 3.98L36.19 0.91C35.29 0.58 34.13 0.28 32.67 0.28C28.69 0.28 25.88 2.39 25.86 5.43C25.83 7.67 27.86 8.92 29.39 9.67C30.96 10.44 31.49 10.93 31.48 11.62C31.47 12.67 30.22 13.13 29.07 13.15C27.04 13.18 25.86 12.61 24.92 12.18L24.24 15.35C25.17 15.78 26.89 16.14 28.68 16.17C32.88 16.17 35.46 14.1 35.48 10.66ZM46.06 15.65H49.69L46.42 0.35H43.08C42.33 0.35 41.7 0.78 41.42 1.45L35.38 15.65H39.6L40.44 13.33H45.59L46.06 15.65ZM41.59 10.19L43.71 4.37L44.93 10.19H41.59ZM24.64 0.35L21.36 15.65H17.34L20.62 0.35H24.64Z"
                    fill="#1A1F71"
                  />
                </svg>
              </div>

              {/* MasterCard Logo */}
              <div className="h-6 w-9 sm:h-7 sm:w-11 bg-white border border-neutral-200/80 rounded-md flex items-center justify-center p-1 shadow-2xs">
                <svg className="h-4 sm:h-4.5 w-auto" viewBox="0 0 32 20" fill="none">
                  <circle cx="10" cy="10" r="10" fill="#EB001B" />
                  <circle cx="22" cy="10" r="10" fill="#F79E1B" />
                  <path
                    d="M16 3.12A10 10 0 0 1 19.88 10 10 10 0 0 1 16 16.88 10 10 0 0 1 12.12 10 10 10 0 0 1 16 3.12Z"
                    fill="#FF5F00"
                  />
                </svg>
              </div>

              {/* American Express Logo */}
              <div className="h-6 w-9 sm:h-7 sm:w-11 bg-[#006FCF] border border-neutral-200/80 rounded-md flex items-center justify-center p-0.5 shadow-2xs">
                <span className="text-[7px] sm:text-[8px] font-black text-white tracking-tighter leading-none font-sans">
                  AMEX
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-neutral-500 block">
                PayHere Fee: <span className="font-bold text-neutral-900">+2%</span>
              </span>
              {cardFee > 0 && selected === "card" && (
                <span className="text-[10px] text-neutral-600 font-medium block">
                  (+{formatPrice(cardFee)})
                </span>
              )}
            </div>
          </div>
        </div>

        {!isCardAllowed && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Card payment is not available for one or more items in your cart.</span>
          </div>
        )}
      </div>

      {/* ── OPTION 2: Cash on Delivery (COD) / Pay at Showroom ── */}
      <div
        onClick={() => {
          if (canUseCash) onChange("cod");
        }}
        className={`relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 select-none ${
          !canUseCash
            ? "opacity-50 cursor-not-allowed bg-neutral-50 border-neutral-200"
            : selected === "cod"
            ? "border-black bg-neutral-50/60 shadow-xs ring-1 ring-black cursor-pointer"
            : "border-neutral-200/90 bg-white hover:border-neutral-400 cursor-pointer"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {/* Custom Radio Circle */}
            <div
              className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center border transition-all shrink-0 ${
                selected === "cod"
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 bg-white"
              }`}
            >
              {selected === "cod" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>

            {/* Label & Description */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-neutral-800" />
                <span className="text-sm sm:text-base font-bold text-neutral-950">
                  {isPickup ? "Pay at Showroom (Cash / Card on Pickup)" : "Cash on Delivery"}
                </span>
                {isPickup && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Zero Extra Fee
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                {isPickup
                  ? "Pay in cash or card when you collect your order in-person at our Colombo flagship showroom."
                  : "Pay in cash when your order is delivered to your doorstep."}
              </p>
            </div>
          </div>

        </div>

        {!isPickup && !isCodAllowed && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Cash on Delivery is not available for one or more items in your cart.</span>
          </div>
        )}
      </div>
    </div>
  );
}
