"use client";

import { Check, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export type DeliveryMethod = "standard" | "pickup";

export default function DeliveryMethodCard({ deliveryFee }: { deliveryFee: number }) {
  return (
    <div
      role="radio"
      aria-checked="true"
      aria-label="Standard courier delivery"
      className="flex items-start gap-3.5 rounded-2xl border border-neutral-200 bg-[#f5f5f7] p-4 sm:p-5"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 ring-1 ring-neutral-200">
        <Truck className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold tracking-[-0.01em] text-neutral-950">Standard courier delivery</span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-neutral-900">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-neutral-500">
          Island-wide door-to-door delivery within 1–3 business days.
        </span>
      </span>
    </div>
  );
}
