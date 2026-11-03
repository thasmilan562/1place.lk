"use client";

import React, { useState } from "react";
import {
  Tag,
  Plus,
  Search,
  Percent,
  DollarSign,
  Truck,
  Trash2,
  Edit3,
  Copy,
  Check,
  Power,
  CircleCheck as Sparkles,
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck,
  ArrowUpDown,
} from "lucide-react";
import { Coupon } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

interface CouponsTabProps {
  coupons: Coupon[];
  onAdd: () => void;
  onEdit: (coupon: Coupon) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: "active" | "disabled") => void;
  onDuplicate: (coupon: Coupon) => void;
}

export default function CouponsTab({
  coupons,
  onAdd,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
}: CouponsTabProps) {
  const { isLight } = useAdminTheme();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "disabled">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch =
      (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
      (c.title && c.title.toLowerCase().includes(search.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = coupons.filter((c) => c.status === "active").length;
  const disabledCount = coupons.filter((c) => c.status === "disabled").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2.5 ${isLight ? "text-[#0F172A]" : "text-white"}`}>
            <Tag className="w-6 h-6 text-blue-600" />
            <span>Promo Codes & Coupons</span>
          </h1>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
            Create, manage, enable, or disable discount codes for customer checkout
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Promo Code</span>
        </button>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs ${
          isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div>
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`}>
              Total Promo Codes
            </span>
            <span className={`text-2xl font-bold font-mono mt-1 block ${isLight ? "text-slate-900" : "text-white"}`}>{coupons.length}</span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLight ? "bg-slate-100 text-slate-700" : "bg-white/5 text-slate-300"}`}>
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs ${
          isLight ? "bg-white border-emerald-200" : "bg-[#0E141D] border-emerald-500/20"
        }`}>
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Active & Live
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs ${
          isLight ? "bg-white border-red-200" : "bg-[#0E141D] border-red-500/20"
        }`}>
          <div>
            <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block">
              Disabled (Inactive)
            </span>
            <span className="text-2xl font-bold font-mono text-red-500 mt-1 block">{disabledCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <Power className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border ${
        isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        <div className="relative w-full sm:w-80">
          <Search className={`w-4 h-4 absolute left-3.5 top-3 ${isLight ? "text-slate-400" : "text-[#94A3B8]"}`} />
          <input
            type="text"
            placeholder="Search by code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs outline-none border transition-all ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500" : "bg-white/5 border-white/10 text-white placeholder-slate-400 focus:border-blue-500"
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(["all", "active", "disabled"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterStatus === st
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : isLight
                  ? "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  : "bg-white/5 text-[#94A3B8] hover:text-white hover:bg-white/10"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Promo Codes Table / List */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        {filteredCoupons.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Tag className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Promo Codes Found</h3>
            <p className="text-xs text-white/50 max-w-sm mx-auto mb-4">
              {search
                ? "No promo codes matched your search query."
                : "Create your first promo code to offer exclusive discounts to your shoppers."}
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Promo Code</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                isLight ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-white/5 text-[#94A3B8] border-white/10"
              }`}>
                <tr>
                  <th className="py-3.5 px-4">Promo Code</th>
                  <th className="py-3.5 px-4">Discount</th>
                  <th className="py-3.5 px-4">Min Spend</th>
                  <th className="py-3.5 px-4">Audience</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4 text-center">Status / Toggle</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${isLight ? "divide-slate-100" : "divide-white/5"}`}>
                {filteredCoupons.map((coupon) => {
                  const isActive = coupon.status === "active";

                  return (
                    <tr key={coupon.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Code & Title */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-black text-xs tracking-wider">
                            <span>{coupon.code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(coupon.code)}
                              title="Copy code"
                              className="text-white/40 hover:text-blue-300 transition-colors"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                        {coupon.title && (
                          <span className="text-[11px] text-white/50 block mt-1 line-clamp-1">
                            {coupon.title}
                          </span>
                        )}
                      </td>

                      {/* Discount Amount */}
                      <td className="py-4 px-4 font-bold text-white">
                        {coupon.discountType === "percentage" && (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Percent className="w-3.5 h-3.5" />
                            <span>{coupon.discountValue}% OFF</span>
                          </span>
                        )}
                        {coupon.discountType === "fixed" && (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <span>Rs. {Number(coupon.discountValue).toLocaleString()} OFF</span>
                          </span>
                        )}
                        {coupon.discountType === "free_shipping" && (
                          <span className="inline-flex items-center gap-1 text-blue-400">
                            <Truck className="w-3.5 h-3.5" />
                            <span>Free Shipping</span>
                          </span>
                        )}
                      </td>

                      {/* Min Spend */}
                      <td className="py-4 px-4 text-white/70">
                        {coupon.minSpend && coupon.minSpend > 0 ? (
                          <span>Rs. {Number(coupon.minSpend).toLocaleString()}</span>
                        ) : (
                          <span className="text-white/40">No Min Spend</span>
                        )}
                      </td>

                      {/* Target Audience */}
                      <td className="py-4 px-4">
                        {coupon.targetAudience === "logged_in" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">
                            Members Only
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 text-white/70 text-[10px] font-bold border border-white/10">
                            Everyone
                          </span>
                        )}
                      </td>

                      {/* Validity / Expiry */}
                      <td className="py-4 px-4 text-[11px]">
                        {coupon.noExpiry ? (
                          <span className="text-emerald-400/90 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Never Expires
                          </span>
                        ) : coupon.endAt ? (
                          <span className="text-white/60 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Ends: {coupon.endAt}
                          </span>
                        ) : (
                          <span className="text-white/40">Active</span>
                        )}
                      </td>

                      {/* Status & Instant Toggle Switch */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(coupon.id, coupon.status)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                              : "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
                          }`}
                          title={`Click to ${isActive ? "Disable" : "Enable"}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                            }`}
                          />
                          <span>{isActive ? "Active (Enabled)" : "Disabled"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(coupon)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDuplicate(coupon)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDelete(coupon.id)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
