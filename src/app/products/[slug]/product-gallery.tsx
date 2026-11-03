"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { normalizeImageUrl } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  name: string;
  discount?: number;
  video_url?: string;
  selectedIndex?: number;
  onSelectIndex?: (idx: number) => void;
}

export default function ProductGallery({
  images,
  name,
  discount = 0,
  video_url,
  selectedIndex = 0,
  onSelectIndex,
}: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(selectedIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Sync activeIdx when selectedIndex changes from color swatch selection
  useEffect(() => {
    if (typeof selectedIndex === "number" && selectedIndex >= 0) {
      setActiveIdx(selectedIndex);
      setShowVideo(false);
    }
  }, [selectedIndex]);

  const rawImages = images && images.length > 0
    ? images
    : ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop"];
  const displayImages = rawImages.map((u) => normalizeImageUrl(u));

  const handleNext = () => {
    const nextIdx = (activeIdx + 1) % displayImages.length;
    setActiveIdx(nextIdx);
    onSelectIndex?.(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (activeIdx - 1 + displayImages.length) % displayImages.length;
    setActiveIdx(prevIdx);
    onSelectIndex?.(prevIdx);
  };

  const handleThumbnailClick = (i: number) => {
    setActiveIdx(i);
    setShowVideo(false);
    onSelectIndex?.(i);
  };

  const safeActiveIdx = activeIdx < displayImages.length ? activeIdx : 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ── Main Media Display Container (Square 1:1 shape on mobile and desktop) ── */}
      <div className="relative w-full aspect-square max-h-[340px] sm:max-h-[520px] rounded-none overflow-hidden bg-white border border-[#EAEAEA] flex items-center justify-center group shadow-xs p-1 sm:p-3">
        {/* Bottom-Left Discount Badge */}
        {discount > 0 && (
          <div className="absolute bottom-0 left-0 z-10">
            <span className="bg-red-600 text-white text-[10px] sm:text-[11px] font-black px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-tr-xl sm:rounded-tr-2xl uppercase tracking-wider shadow-sm inline-block">
              -{discount}% OFF
            </span>
          </div>
        )}

        {/* Fullscreen Zoom Trigger */}
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/90 backdrop-blur-sm border border-[#EAEAEA] flex items-center justify-center text-black opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm hover:scale-105 cursor-pointer"
          aria-label="Enlarge image"
        >
          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />
        </button>

        {/* Video Mode or Image Mode */}
        {showVideo && video_url ? (
          <div className="w-full h-full flex items-center justify-center bg-black rounded-xl overflow-hidden">
            <iframe
              src={video_url.includes("youtube.com") || video_url.includes("youtu.be")
                ? video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")
                : video_url}
              title={`${name} Video`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={displayImages[safeActiveIdx]}
              alt={`${name} - Image ${safeActiveIdx + 1}`}
              className="w-full h-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.05] cursor-pointer select-none"
              onClick={() => setIsFullscreen(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder-phone.webp";
              }}
            />
          </div>
        )}
      </div>

      {/* ── Thumbnail Row (Contained Horizontal Rail showing ALL uploaded photos) ── */}
      <div className="flex items-center gap-2 sm:gap-3 w-full max-w-full overflow-x-auto py-1 no-scrollbar scroll-smooth">
        {displayImages.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleThumbnailClick(i)}
            className={`relative shrink-0 w-13 h-13 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 overflow-hidden border-2 cursor-pointer transition-all ${
              i === safeActiveIdx && !showVideo
                ? "border-black ring-2 ring-black shadow-xs scale-102"
                : "border-neutral-200 hover:border-neutral-400"
            } bg-white flex items-center justify-center`}
            aria-label={`View ${name} image ${i + 1}`}
          >
            <img
              src={img}
              alt={`${name} thumbnail ${i + 1}`}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder-phone.webp";
              }}
            />
          </button>
        ))}

        {/* Optional Video Thumbnail */}
        {video_url && (
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 cursor-pointer transition-all bg-black flex flex-col items-center justify-center text-white ${
              showVideo ? "border-black ring-2 ring-black" : "border-neutral-200 hover:border-black"
            }`}
          >
            <Play className="w-5 h-5 text-white mb-0.5 fill-white" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Video</span>
          </button>
        )}
      </div>

      {/* ── Fullscreen Image Modal ── */}
      <AnimatePresence>
        {isFullscreen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl w-full h-[80vh] flex flex-col items-center justify-center"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-20"
                aria-label="Close fullscreen"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Main Fullscreen Image */}
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={displayImages[safeActiveIdx]}
                  alt={`${name} Fullscreen`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-phone.webp";
                  }}
                />
              </div>

              {/* Nav Arrows */}
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-20"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-20"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Counter */}
              <div className="absolute bottom-4 text-xs font-semibold text-white/70 bg-black/50 px-3 py-1 rounded-full">
                {safeActiveIdx + 1} / {displayImages.length}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
