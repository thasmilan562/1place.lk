"use client";

import React from "react";
import { HeroSlide } from "@/lib/types";
import { Plus, Edit, Trash2, CircleCheck as Sparkles, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

interface HeroTabProps {
  slides: HeroSlide[];
  onAdd: () => void;
  onEdit: (slide: HeroSlide) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (id: string, active: boolean) => void;
}

export default function HeroTab({ slides, onAdd, onEdit, onDelete, onToggleStatus }: HeroTabProps) {
  const { isLight } = useAdminTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className={`text-xl font-bold flex items-center gap-2 ${isLight ? "text-[#0F172A]" : "text-white"}`}>
            <Sparkles className="w-5 h-5 text-blue-600" /> Homepage Hero Slider Manager
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
            Add, upload, edit, and enable homepage hero banners. Desktop artwork works best at 2200 × 675.
          </p>
        </div>

        <button
          onClick={onAdd}
          className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Hero Slide Banner
        </button>
      </div>

      {/* Grid of Slides */}
      {slides.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isLight ? "bg-white border-slate-200 text-slate-500" : "bg-[#0E141D] border-white/[0.08] text-slate-400"
        }`}>
          <ImageIcon className="w-12 h-12 text-slate-400/40 mx-auto mb-3" />
          <p className="text-sm font-semibold">No custom hero slides added yet.</p>
          <p className="text-xs mt-1 opacity-70">Default storefront wallpapers are currently active on the homepage.</p>
          <button
            onClick={onAdd}
            className="mt-4 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            Upload First Hero Slide
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`rounded-2xl border overflow-hidden transition-all flex flex-col justify-between group shadow-xs ${
                isLight ? "bg-white border-slate-200 hover:border-slate-300" : "bg-[#0E141D] border-white/[0.08] hover:border-white/20"
              }`}
            >
              {/* Media Preview Box */}
              <div className="relative aspect-[2200/675] overflow-hidden" style={{ backgroundColor: "#f0eeeb" }}>
                <img
                  src={slide.image_url}
                  alt={slide.alt || "Hero slide preview"}
                  className="w-full h-full object-contain"
                  style={{ objectPosition: slide.desktop_image_position || "center" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {/* Active Toggle Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleStatus?.(slide.id, slide.active === false)}
                    className="cursor-pointer transition-transform active:scale-95"
                  >
                    {slide.active !== false ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white backdrop-blur-md text-[10px] font-bold flex items-center gap-1 shadow-md hover:bg-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-zinc-700 text-white/70 backdrop-blur-md text-[10px] font-bold flex items-center gap-1 hover:bg-zinc-600">
                        <XCircle className="w-3 h-3" /> Hidden
                      </span>
                    )}
                  </button>
                </div>

              </div>

              {/* Info Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className={`text-sm font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>{slide.heading || slide.alt || "Hero Banner Slide"}</h4>
                  <p className={`text-xs mt-1 truncate ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>{slide.description || slide.image_url}</p>
                  {(slide.hide_content_on_mobile || slide.hide_text_on_mobile || slide.hide_buttons_on_mobile) && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 text-[10px] font-bold border border-purple-500/20">
                        📱 {slide.hide_content_on_mobile ? "Clean Banner on Mobile" : slide.hide_text_on_mobile ? "Text Hidden on Mobile" : "Buttons Hidden on Mobile"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className={`pt-3 border-t flex items-center justify-between gap-2 ${isLight ? "border-slate-100" : "border-white/10"}`}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(slide)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 border-white/10 text-white"
                      }`}
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>

                  <button
                    onClick={() => onDelete(slide.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
