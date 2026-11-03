"use client";

import React, { useEffect } from "react";
import { Bell, ShoppingBag, ArrowRight, X, CircleCheck as Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export interface LiveOrderNotification {
  id: string;
  customerName: string;
  total: number;
  itemsCount?: number;
}

interface RealtimeOrderAlertProps {
  order: LiveOrderNotification | null;
  onClose: () => void;
  onViewOrder: (id: string) => void;
  isLight?: boolean;
}

export default function RealtimeOrderAlert({
  order,
  onClose,
  onViewOrder,
  isLight = false,
}: RealtimeOrderAlertProps) {
  useEffect(() => {
    if (!order) return;
    const timer = setTimeout(() => {
      onClose();
    }, 12000);
    return () => clearTimeout(timer);
  }, [order, onClose]);

  if (!order) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div
        className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all ${
          isLight
            ? "bg-white/95 border-[#12B76A]/40 text-[#111827] shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
            : "bg-[#0D1722]/95 border-emerald-500/40 text-[#F8FAFC] shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        }`}
      >
        {/* Subtle accent gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        <div className="flex items-start gap-3">
          {/* Animated pulsing bell icon */}
          <div className="relative shrink-0 mt-0.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              New Order Received!
            </div>
            <p className="text-sm font-extrabold mt-0.5 truncate tracking-tight">
              Order #{order.id}
            </p>
            <p className={`text-xs mt-0.5 truncate ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              {order.customerName} •{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatPrice(order.total)}
              </span>
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onViewOrder(order.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <span>View Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-3 right-3 p-1 rounded-lg transition-colors cursor-pointer ${
              isLight ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-slate-500 hover:text-white hover:bg-white/10"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
