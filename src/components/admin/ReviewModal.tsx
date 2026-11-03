"use client";

import { useState, useEffect } from "react";
import { X, Upload, Loader2, Link, Star, Eye, EyeOff, CircleCheck as Sparkles } from "lucide-react";
import { Review } from "@/lib/types";
import { db } from "@/lib/firebase";
import { addDoc, updateDoc, doc, collection } from "firebase/firestore";
import { uploadImageWithFallback } from "@/lib/upload-utils";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: Review | null;
}

export default function ReviewModal({ isOpen, onClose, onSave, initialData }: ReviewModalProps) {
  const [formData, setFormData] = useState<Partial<Review>>({
    author_name: "",
    author_photo: "",
    rating: 5,
    text: "",
    review_date: new Date().toISOString().split("T")[0],
    google_url: "",
    visible: true,
    featured: false,
    sort_order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        google_url: initialData.google_url || "",
        featured: !!initialData.featured,
        visible: initialData.visible !== false,
        sort_order: initialData.sort_order || 0,
      });
      setImagePreview(initialData.author_photo || "");
    } else {
      setFormData({
        author_name: "",
        author_photo: "",
        rating: 5,
        text: "",
        review_date: new Date().toISOString().split("T")[0],
        google_url: "",
        visible: true,
        featured: false,
        sort_order: 0,
      });
      setImagePreview("");
    }
    setImageFile(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setFormData((prev) => ({ ...prev, author_photo: "" }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.author_name || !formData.text) {
      alert("Please provide author name and review text.");
      return;
    }

    setIsLoading(true);

    try {
      let finalPhotoUrl = formData.author_photo || "";

      if (imageFile) {
        finalPhotoUrl = await uploadImageWithFallback(imageFile, "reviews");
      }

      const reviewData: Omit<Review, "id"> = {
        author_name: formData.author_name.trim(),
        author_photo: finalPhotoUrl,
        rating: Number(formData.rating) || 5,
        text: formData.text.trim(),
        review_date: formData.review_date || new Date().toISOString().split("T")[0],
        visible: formData.visible !== false,
        google_url: formData.google_url ? formData.google_url.trim() : "",
        featured: !!formData.featured,
        sort_order: Number(formData.sort_order) || 0,
      };

      if (initialData && initialData.id) {
        await updateDoc(doc(db, "reviews", initialData.id), reviewData as any);
      } else {
        await addDoc(collection(db, "reviews"), reviewData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving review:", error);
      alert("Failed to save review. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-white/10 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <h2 className="text-xl font-bold text-white">
              {initialData ? "Edit Google Review" : "Add Manual Google Review"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Author Name */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
              Reviewer Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Santhosh Kumar"
              value={formData.author_name || ""}
              onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Profile Photo Upload or URL */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
              Reviewer Profile Photo (Optional)
            </label>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Reviewer preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-white/50 text-lg">
                    {formData.author_name ? formData.author_name.charAt(0).toUpperCase() : "G"}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  id="reviewerPhotoUpload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="reviewerPhotoUpload"
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Photo
                </label>
              </div>
            </div>

            <div className="relative">
              <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="url"
                placeholder="Or paste image URL: https://lh3.googleusercontent.com/..."
                value={formData.author_photo || ""}
                onChange={(e) => {
                  setFormData({ ...formData, author_photo: e.target.value });
                  if (!imageFile) setImagePreview(e.target.value);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
          </div>

          {/* Star Rating & Review Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Star Rating (1 - 5) *
              </label>
              <div className="flex items-center gap-1.5 p-2 bg-white/5 border border-white/10 rounded-xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (formData.rating || 5)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-transparent text-white/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Review Date
              </label>
              <input
                type="text"
                placeholder="e.g. 2026-08-10 or 2 weeks ago"
                value={formData.review_date || ""}
                onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
              Review Content Text *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Paste exact review text from Google..."
              value={formData.text || ""}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Original Google Review URL */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
              Original Google Review URL (Optional)
            </label>
            <p className="text-[11px] text-white/40 mb-2">
              When clicked by customers, it opens this specific Google review link in a new tab.
            </p>
            <input
              type="url"
              placeholder="https://g.co/kgs/... or https://maps.app.goo.gl/..."
              value={formData.google_url || ""}
              onChange={(e) => setFormData({ ...formData, google_url: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
            />
          </div>

          {/* Toggles & Sort Order */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Featured Review
                </span>
                <p className="text-[11px] text-white/40">Highlight this review prominently in home carousel</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  formData.featured
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-white/5 text-white/40 border border-white/10"
                }`}
              >
                {formData.featured ? "Featured ★" : "Standard"}
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {formData.visible !== false ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />} Visibility Status
                </span>
                <p className="text-[11px] text-white/40">Show or hide this review on website pages</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, visible: formData.visible === false })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  formData.visible !== false
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {formData.visible !== false ? "Visible" : "Hidden"}
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs font-bold text-white">Display Sort Order</span>
              <input
                type="number"
                value={formData.sort_order || 0}
                onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                className="w-20 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono text-center outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-slate-900 pt-4 pb-2 border-t border-white/10 flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Review"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
