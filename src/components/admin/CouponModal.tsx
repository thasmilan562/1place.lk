"use client";

import React, { useState, useEffect } from "react";
import { X, CircleCheck as Sparkles, Tag, Percent, DollarSign, Truck, Calendar, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Coupon, CouponDiscountType } from "@/lib/types";
import { db } from "@/lib/admin-firebase";
import { doc, setDoc, addDoc, collection } from "firebase/firestore";

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
  onSaved: () => void;
}

export default function CouponModal({
  isOpen,
  onClose,
  coupon,
  onSaved,
}: CouponModalProps) {
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: "",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: 0,
    minSpend: 0,
    maxDiscount: 0,
    status: "active",
    targetAudience: "all",
    startAt: "",
    endAt: "",
    noExpiry: true,
    usageLimit: 0,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (coupon) {
      setFormData({
        ...coupon,
        code: coupon.code || "",
        title: coupon.title || "",
        description: coupon.description || "",
        discountType: coupon.discountType || "percentage",
        discountValue: coupon.discountValue ?? 0,
        minSpend: coupon.minSpend ?? 0,
        maxDiscount: coupon.maxDiscount ?? 0,
        status: coupon.status || "active",
        targetAudience: coupon.targetAudience || "all",
        startAt: coupon.startAt ? coupon.startAt.slice(0, 10) : "",
        endAt: coupon.endAt ? coupon.endAt.slice(0, 10) : "",
        noExpiry: coupon.noExpiry ?? (!coupon.endAt),
        usageLimit: coupon.usageLimit ?? 0,
      });
    } else {
      setFormData({
        code: "",
        title: "",
        description: "",
        discountType: "percentage",
        discountValue: 0,
        minSpend: 0,
        maxDiscount: 0,
        status: "active",
        targetAudience: "all",
        startAt: new Date().toISOString().slice(0, 10),
        endAt: "",
        noExpiry: true,
        usageLimit: 0,
      });
    }
    setError(null);
  }, [coupon, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = (formData.code || "").trim().toUpperCase();
    if (!cleanCode) {
      setError("Please provide a promo code (e.g. 1PLACE10)");
      return;
    }

    if (formData.discountType !== "free_shipping" && (Number(formData.discountValue) || 0) <= 0) {
      setError("Please provide a discount value greater than 0");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: Partial<Coupon> = {
        code: cleanCode,
        title: formData.title?.trim() || `${cleanCode} Promo`,
        description: formData.description?.trim() || "",
        discountType: formData.discountType as CouponDiscountType,
        discountValue: Number(formData.discountValue) || 0,
        minSpend: Number(formData.minSpend) || 0,
        maxDiscount: Number(formData.maxDiscount) || 0,
        status: formData.status || "active",
        targetAudience: formData.targetAudience || "all",
        startAt: formData.startAt || new Date().toISOString(),
        endAt: formData.noExpiry ? "" : (formData.endAt || ""),
        noExpiry: !!formData.noExpiry,
        usageLimit: Number(formData.usageLimit) || 0,
        updatedAt: new Date().toISOString(),
      };

      if (coupon?.id) {
        await setDoc(doc(db, "coupons", coupon.id), payload, { merge: true });
      } else {
        await addDoc(collection(db, "coupons"), {
          ...payload,
          usageCount: 0,
          createdAt: new Date().toISOString(),
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error saving coupon:", err);
      setError(err?.message || "Failed to save promo code. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0F172A] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              {coupon ? "Edit Promo Code" : "Create New Promo Code"}
            </h2>
            <p className="text-xs text-white/50">
              Configure discounts, minimum spend, expiry, and activation status
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Promo Code & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Promo Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 1PLACE10"
                value={formData.code || ""}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, "") })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono font-bold text-sm tracking-wider focus:outline-none focus:border-blue-500 transition-colors uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Promotion Title
              </label>
              <input
                type="text"
                placeholder="e.g. 10% Welcome Discount"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Discount Type Selector */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
              Discount Type *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, discountType: "percentage" })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  formData.discountType === "percentage"
                    ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <Percent className="w-4 h-4" />
                <span>Percentage (%)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, discountType: "fixed" })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  formData.discountType === "fixed"
                    ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Fixed (LKR)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, discountType: "free_shipping" })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  formData.discountType === "free_shipping"
                    ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Free Shipping</span>
              </button>
            </div>
          </div>

          {/* Discount Value & Min Spend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formData.discountType !== "free_shipping" && (
              <div>
                <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                  {formData.discountType === "percentage" ? "Discount Percentage (%) *" : "Discount Amount (Rs.) *"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={formData.discountType === "percentage" ? 100 : 100000}
                    value={formData.discountValue === 0 ? "" : formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-bold">
                    {formData.discountType === "percentage" ? "%" : "LKR"}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Minimum Order Spend (Rs.)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0 (No minimum)"
                  value={formData.minSpend || ""}
                  onChange={(e) => setFormData({ ...formData, minSpend: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-bold">LKR</span>
              </div>
            </div>
          </div>

          {/* Target Audience & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Target Audience
              </label>
              <select
                value={formData.targetAudience || "all"}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1E293B] border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Visitors & Guests</option>
                <option value="logged_in">Registered Members Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Initial Status
              </label>
              <select
                value={formData.status || "active"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1E293B] border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="active">Active (Available)</option>
                <option value="disabled">Disabled (Inactive)</option>
              </select>
            </div>
          </div>

          {/* Expiry Settings */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Expiration Date</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.noExpiry ?? true}
                  onChange={(e) => setFormData({ ...formData, noExpiry: e.target.checked })}
                  className="w-4 h-4 rounded bg-white/10 border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-white/70 font-semibold">Never Expires</span>
              </label>
            </div>

            {!formData.noExpiry && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startAt || ""}
                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">End / Expiry Date</label>
                  <input
                    type="date"
                    value={formData.endAt || ""}
                    onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description / Terms */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Short Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Valid on all smartphone and accessory purchases"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{coupon ? "Update Promo Code" : "Create Promo Code"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
