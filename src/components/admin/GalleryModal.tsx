"use client";

import { useState, useEffect } from "react";
import { X, Upload, Loader2, Link, Eye, EyeOff, Video, CircleCheck as Sparkles, AlertCircle } from "lucide-react";
import { GalleryImage } from "@/lib/types";
import { db } from "@/lib/firebase";
import { addDoc, updateDoc, doc, collection } from "firebase/firestore";
import { uploadImageWithFallback } from "@/lib/upload-utils";

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: GalleryImage | null;
}

const PLATFORM_OPTIONS = [
  { value: "none", label: "None (Lightbox Image View)", icon: "🖼️" },
  { value: "instagram", label: "Instagram Post / Reel", icon: "📸" },
  { value: "tiktok", label: "TikTok Video", icon: "🎵" },
  { value: "facebook", label: "Facebook Post / Video", icon: "📘" },
  { value: "youtube", label: "YouTube Video / Short", icon: "▶️" },
  { value: "other", label: "Other Social Link", icon: "🔗" },
];

function validateUrl(url?: string): boolean {
  if (!url || typeof url !== "string" || !url.trim()) return true; // empty is allowed
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function GalleryModal({ isOpen, onClose, onSave, initialData }: GalleryModalProps) {
  const [formData, setFormData] = useState<Partial<GalleryImage>>({
    title: "",
    image_url: "",
    video_url: "",
    caption: "",
    category: "shop",
    sort_order: 0,
    platform: "none",
    post_url: "",
    visible: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [urlError, setUrlError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        title: initialData.title || "",
        video_url: initialData.video_url || "",
        platform: initialData.platform || "none",
        post_url: initialData.post_url || "",
        visible: initialData.visible !== false,
        sort_order: initialData.sort_order || 0,
      });
      setImagePreview(initialData.image_url || "");
      setVideoPreview(initialData.video_url || "");
    } else {
      setFormData({
        title: "",
        image_url: "",
        video_url: "",
        caption: "",
        category: "shop",
        sort_order: 0,
        platform: "none",
        post_url: "",
        visible: true,
      });
      setImagePreview("");
      setVideoPreview("");
    }
    setImageFile(null);
    setVideoFile(null);
    setUrlError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setFormData((prev) => ({ ...prev, image_url: "" }));
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setFormData((prev) => ({ ...prev, video_url: "" }));
    }
  };

  const handlePostUrlChange = (url: string) => {
    setFormData((prev) => {
      let detectedPlatform = prev.platform || "none";
      if (url.includes("instagram.com")) detectedPlatform = "instagram";
      else if (url.includes("tiktok.com")) detectedPlatform = "tiktok";
      else if (url.includes("facebook.com") || url.includes("fb.watch")) detectedPlatform = "facebook";
      else if (url.includes("youtube.com") || url.includes("youtu.be")) detectedPlatform = "youtube";
      else if (url.trim().length > 0 && detectedPlatform === "none") detectedPlatform = "other";

      return {
        ...prev,
        post_url: url,
        platform: detectedPlatform,
      };
    });

    if (url.trim() && !validateUrl(url)) {
      setUrlError("Please enter a valid URL starting with http:// or https://");
    } else {
      setUrlError("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.post_url && !validateUrl(formData.post_url)) {
      alert("Please fix the invalid social media post URL before saving.");
      return;
    }

    setIsLoading(true);

    try {
      let finalImageUrl = formData.image_url || "";
      let finalVideoUrl = formData.video_url || "";

      if (imageFile) {
        finalImageUrl = await uploadImageWithFallback(imageFile, "gallery");
      }

      if (videoFile) {
        finalVideoUrl = await uploadImageWithFallback(videoFile, "gallery_videos");
      }

      if (!finalImageUrl && !finalVideoUrl) {
        alert("Please upload an image/video or enter an image URL.");
        setIsLoading(false);
        return;
      }

      const galleryData: Omit<GalleryImage, "id"> = {
        title: formData.title ? formData.title.trim() : "",
        image_url: finalImageUrl,
        video_url: finalVideoUrl,
        caption: formData.caption ? formData.caption.trim() : "",
        category: (formData.category as any) || "shop",
        sort_order: Number(formData.sort_order) || 0,
        platform: (formData.platform as any) || "none",
        post_url: formData.post_url ? formData.post_url.trim() : "",
        visible: formData.visible !== false,
      };

      if (initialData && initialData.id) {
        await updateDoc(doc(db, "gallery", initialData.id), galleryData as any);
      } else {
        await addDoc(collection(db, "gallery"), galleryData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving gallery item:", error);
      alert("Failed to save gallery item. Please check network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header */}
        <div className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-white/10 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white">
              {initialData ? "Edit Gallery Item" : "Add Gallery Item"}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">Link gallery photos & videos directly to original social media posts</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
              Item Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. iPhone 16 Pro Max Unboxing Reel"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Image Upload or URL */}
          <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" /> Main Display Image *
            </h3>

            <div className="flex items-center gap-6">
              <div className="w-28 h-28 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-white/20" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  id="galleryImageUpload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="galleryImageUpload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image File
                </label>
                <p className="text-[11px] text-white/40">PNG, JPG, WebP supported</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">Or Direct Image URL</label>
              <div className="relative">
                <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.image_url || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, image_url: e.target.value });
                    if (!imageFile) setImagePreview(e.target.value);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Social Media Linking Section */}
          <div className="space-y-4 p-4 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-slate-900 border border-purple-500/30 rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> Social Media Link Integration
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold border border-purple-500/30">
                CLICKABLE SOCIAL POST
              </span>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Target Platform
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLATFORM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, platform: opt.value as any })}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      formData.platform === opt.value
                        ? "bg-purple-600/30 border-purple-400 text-white shadow-lg"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <span className="text-xs font-semibold truncate">{opt.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Original Post URL */}
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
                Original Social Media Post URL
              </label>
              <div className="relative">
                <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type="url"
                  placeholder="e.g. https://www.instagram.com/p/C3..."
                  value={formData.post_url || ""}
                  onChange={(e) => handlePostUrlChange(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                />
              </div>
              {urlError && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {urlError}
                </p>
              )}
              <p className="text-[11px] text-white/40 mt-1.5">
                When provided, clicking this gallery card will open this post in a new tab using target=&quot;_blank&quot;.
              </p>
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
              Caption / Description
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Genuine iPhone 16 Pro Max delivered to happy customer!"
              value={formData.caption || ""}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Category & Sort Order & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category || "shop"}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-none"
              >
                <option value="shop">Shop</option>
                <option value="repairs">Repairs</option>
                <option value="customers">Customers</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order || 0}
                onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Visibility
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, visible: formData.visible === false })}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  formData.visible !== false
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {formData.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {formData.visible !== false ? "Visible" : "Hidden"}
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="sticky bottom-0 bg-slate-900 pt-4 pb-2 border-t border-white/10 flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Gallery Item"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImageIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
