"use client";

import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Check, Upload, CircleCheck as Sparkles, Sliders, Layers, Monitor, Smartphone, Calendar, Link as LinkIcon } from "lucide-react";
import { HeroSlide } from "@/lib/types";
import { uploadImageWithFallback } from "@/lib/upload-utils";

interface HeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slide: Partial<HeroSlide>) => Promise<void>;
  slide: HeroSlide | null;
}

const presets = [
  { url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=2200&auto=format&fit=crop", label: "iPhone & Flagships Showcase" },
  { url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2200&auto=format&fit=crop", label: "Smartwatches & Wearables" },
  { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2200&auto=format&fit=crop", label: "Premium Audio & ANC Headphones" },
  { url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=2200&auto=format&fit=crop", label: "Accessories & Everyday Tech" },
];

function toHexColor(val: string | undefined, fallback = "#FFFFFF"): string {
  if (!val) return fallback;
  const trimmed = val.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function formatCase(text: string, casing?: "as_typed" | "uppercase" | "title_case") {
  if (casing === "uppercase") return text.toUpperCase();
  if (casing === "title_case") return text.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
  return text;
}

export default function HeroModal({ isOpen, onClose, onSave, slide }: HeroModalProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [mobileImageUrl, setMobileImageUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [campaignLabel, setCampaignLabel] = useState("NEW ARRIVAL");
  const [badgeTextColor, setBadgeTextColor] = useState("#805166");
  const [heading, setHeading] = useState("");
  const [description, setDescription] = useState("");
  const [promoText, setPromoText] = useState("");
  const [primaryButtonText, setPrimaryButtonText] = useState("Shop Now");
  const [primaryButtonUrl, setPrimaryButtonUrl] = useState("/products");
  const [showSecondaryButton, setShowSecondaryButton] = useState(false);
  const [secondaryButtonText, setSecondaryButtonText] = useState("View Product");
  const [secondaryButtonUrl, setSecondaryButtonUrl] = useState("");
  const [secondaryButtonTextColor, setSecondaryButtonTextColor] = useState("#FFFFFF");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [active, setActive] = useState(true);

  const [showBadge, setShowBadge] = useState(true);
  const [headingLine1, setHeadingLine1] = useState("");
  const [headingLine2, setHeadingLine2] = useState("");
  const [showHeadingLine1, setShowHeadingLine1] = useState(true);
  const [showHeadingLine2, setShowHeadingLine2] = useState(true);
  const [headingLine1Color, setHeadingLine1Color] = useState("#FFFFFF");
  const [headingLine2Color, setHeadingLine2Color] = useState("#FFFFFF");
  const [headingLine1Casing, setHeadingLine1Casing] = useState<"as_typed" | "uppercase" | "title_case">("as_typed");
  const [headingLine2Casing, setHeadingLine2Casing] = useState<"as_typed" | "uppercase" | "title_case">("as_typed");
  const [showDescription, setShowDescription] = useState(true);
  const [showPrimaryButton, setShowPrimaryButton] = useState(true);
  const [descriptionColor, setDescriptionColor] = useState("#D1D5DB");
  const [buttonTextColor, setButtonTextColor] = useState("#000000");
  const [buttonBgColor, setButtonBgColor] = useState("#FFFFFF");
  const [overlayColor, setOverlayColor] = useState("#000000");
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0);
  const [bannerBgColor, setBannerBgColor] = useState("#F0EEEB");
  const [imageFitMode, setImageFitMode] = useState<"cover" | "contain">("cover");
  const [desktopImagePosition, setDesktopImagePosition] = useState("center");
  const [mobileImagePosition, setMobileImagePosition] = useState("center");

  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [contentHorizontalPosition, setContentHorizontalPosition] = useState<"left" | "center" | "right">("left");
  const [contentVerticalPosition, setContentVerticalPosition] = useState<"top" | "center" | "bottom">("center");
  const [contentMaxWidth, setContentMaxWidth] = useState<"500px" | "520px" | "570px" | "620px" | "680px" | "700px" | "720px" | "760px" | "820px" | "full">("760px");
  const [desktopHeadingSize, setDesktopHeadingSize] = useState("clamp(48px, 3.25vw, 62px)");
  const [tabletHeadingSize, setTabletHeadingSize] = useState("50px");
  const [mobileHeadingSize, setMobileHeadingSize] = useState("38px");
  const [fontFamily, setFontFamily] = useState("Manrope");
  const [fontWeight, setFontWeight] = useState("800");
  const [lineHeight, setLineHeight] = useState("1.04");
  const [letterSpacing, setLetterSpacing] = useState("-0.045em");

  // Mobile Visibility Controls
  const [hideContentOnMobile, setHideContentOnMobile] = useState(false);
  const [hideTextOnMobile, setHideTextOnMobile] = useState(false);
  const [hideButtonsOnMobile, setHideButtonsOnMobile] = useState(false);

  // Full-Width Banner & Image Fit Controls
  const [descriptionSize, setDescriptionSize] = useState("16px");
  const [buttonSize, setButtonSize] = useState<"small" | "medium" | "large">("medium");
  const [autoplayDuration, setAutoplayDuration] = useState<number>(5.5);

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string>("");
  const [mobilePreview, setMobilePreview] = useState<string>("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slide) {
      setImageUrl(slide.desktop_image_url || slide.image_url || "");
      setMobileImageUrl(slide.mobile_image_url || "");
      setDesktopPreview(slide.desktop_image_url || slide.image_url || "");
      setMobilePreview(slide.mobile_image_url || "");
      setAlt(slide.alt || "");
      setCampaignLabel(slide.campaign_label !== undefined ? slide.campaign_label : "NEW ARRIVAL");
      setBadgeTextColor(slide.badge_text_color || "#805166");
      setHeading(slide.heading || slide.alt || "");
      setHeadingLine1(slide.heading_line_1 !== undefined ? slide.heading_line_1 : (slide.heading || "Latest Smartphones."));
      setHeadingLine2(slide.heading_line_2 !== undefined ? slide.heading_line_2 : "");
      setShowHeadingLine1(slide.show_heading_line_1 ?? true);
      setShowHeadingLine2(slide.show_heading_line_2 ?? true);
      setHeadingLine1Color(slide.heading_line_1_color || slide.headingLine1Color || slide.heading_color || "#FFFFFF");
      setHeadingLine2Color(slide.heading_line_2_color || slide.headingLine2Color || slide.heading_color || "#FFFFFF");
      setHeadingLine1Casing(slide.heading_line_1_casing || "as_typed");
      setHeadingLine2Casing(slide.heading_line_2_casing || "as_typed");
      setDescription(slide.description || "");
      setPromoText(slide.promo_text || "");
      setPrimaryButtonText(slide.primary_button_text !== undefined ? slide.primary_button_text : "Shop Now");
      setPrimaryButtonUrl(slide.primary_button_url || "/products");
      setShowBadge(slide.show_badge ?? true);
      setShowDescription(slide.show_description ?? true);
      setShowPrimaryButton(slide.show_primary_button ?? true);
      setShowSecondaryButton(slide.show_secondary_button ?? false);
      setSecondaryButtonText(slide.secondary_button_text || "View Product");
      setSecondaryButtonUrl(slide.secondary_button_url || "");
      setSecondaryButtonTextColor(slide.secondary_button_text_color || "#FFFFFF");
      setStartDate(slide.start_date || "");
      setExpiryDate(slide.expiry_date || "");
      setSortOrder(slide.sort_order ?? 1);
      setActive(slide.active ?? true);

      // Mobile Visibility Settings
      setHideContentOnMobile(slide.hide_content_on_mobile ?? false);
      setHideTextOnMobile(slide.hide_text_on_mobile ?? false);
      setHideButtonsOnMobile(slide.hide_buttons_on_mobile ?? false);

      setDescriptionSize(slide.description_size || "16px");
      setButtonSize(slide.button_size || "medium");
      setAutoplayDuration(slide.autoplay_duration ?? 5.5);

      // Custom Styling
      setDescriptionColor(slide.description_color || "#D1D5DB");
      setButtonTextColor(slide.button_text_color || "#000000");
      setButtonBgColor(slide.button_bg_color || "#FFFFFF");
      setOverlayColor(slide.overlay_color || "#000000");
      setOverlayOpacity(slide.overlay_opacity ?? 0);
      setBannerBgColor(slide.banner_bg_color || slide.bg_color || "#F0EEEB");
      setImageFitMode(slide.image_fit_mode === "contain" ? "contain" : "cover");
      setDesktopImagePosition(slide.desktop_image_position || "center");
      setMobileImagePosition(slide.mobile_image_position || "center");

      setTextAlign(slide.text_align || "left");
      setContentHorizontalPosition(slide.content_horizontal_position || "left");
      setContentVerticalPosition(slide.content_vertical_position || "center");
      setContentMaxWidth(slide.content_max_width || "760px");
      setDesktopHeadingSize(slide.desktop_heading_size || "clamp(48px, 3.25vw, 62px)");
      setTabletHeadingSize(slide.tablet_heading_size || "50px");
      setMobileHeadingSize(slide.mobile_heading_size || "38px");
      setFontFamily(slide.font_family || "Manrope");
      setFontWeight(slide.font_weight || "800");
      setLineHeight(slide.line_height || "1.04");
      setLetterSpacing(slide.letter_spacing || "-0.045em");
    } else {
      setImageUrl("");
      setMobileImageUrl("");
      setDesktopPreview("");
      setMobilePreview("");
      setAlt("");
      setCampaignLabel("NEW ARRIVAL");
      setBadgeTextColor("#805166");
      setHeading("Latest Smartphones. Ultimate Performance.");
      setHeadingLine1("Latest Smartphones.");
      setHeadingLine2("Ultimate Performance.");
      setShowHeadingLine1(true);
      setShowHeadingLine2(true);
      setHeadingLine1Color("#FFFFFF");
      setHeadingLine2Color("#FFFFFF");
      setHeadingLine1Casing("as_typed");
      setHeadingLine2Casing("as_typed");
      setDescription("");
      setPromoText("");
      setPrimaryButtonText("Shop Now");
      setPrimaryButtonUrl("/products");
      setShowBadge(true);
      setShowDescription(true);
      setShowPrimaryButton(true);
      setShowSecondaryButton(false);
      setSecondaryButtonText("View Product");
      setSecondaryButtonUrl("");
      setSecondaryButtonTextColor("#FFFFFF");
      setStartDate("");
      setExpiryDate("");
      setSortOrder(1);
      setActive(true);

      // Mobile Visibility Settings (Default: false / visible)
      setHideContentOnMobile(false);
      setHideTextOnMobile(false);
      setHideButtonsOnMobile(false);

      // Full-Width Banner & Image Fit Controls Defaults
      setDescriptionSize("16px");
      setButtonSize("medium");
      setAutoplayDuration(5.5);

      // Default Custom Styling
      setDescriptionColor("#D1D5DB");
      setButtonTextColor("#000000");
      setButtonBgColor("#FFFFFF");
      setOverlayColor("#000000");
      setOverlayOpacity(0);
      setBannerBgColor("#F0EEEB");
      setImageFitMode("cover");
      setDesktopImagePosition("center");
      setMobileImagePosition("center");

      setTextAlign("left");
      setContentHorizontalPosition("left");
      setContentVerticalPosition("center");
      setContentMaxWidth("760px");
      setDesktopHeadingSize("clamp(48px, 3.25vw, 62px)");
      setTabletHeadingSize("50px");
      setMobileHeadingSize("38px");
      setFontFamily("Manrope");
      setFontWeight("800");
      setLineHeight("1.04");
      setLetterSpacing("-0.045em");
    }
    setDesktopFile(null);
    setMobileFile(null);
  }, [slide, isOpen]);

  if (!isOpen) return null;

  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDesktopFile(file);
      const url = URL.createObjectURL(file);
      setDesktopPreview(url);
    }
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMobileFile(file);
      const url = URL.createObjectURL(file);
      setMobilePreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalDesktopUrl = imageUrl.trim();
      let finalMobileUrl = mobileImageUrl.trim();

      if (desktopFile) {
        finalDesktopUrl = await uploadImageWithFallback(desktopFile, "hero_slides");
      }
      if (mobileFile) {
        finalMobileUrl = await uploadImageWithFallback(mobileFile, "hero_slides");
      }

      const mainImg = finalDesktopUrl || desktopPreview || "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=2200&auto=format&fit=crop";

      const computedHeading = (headingLine1.trim() || headingLine2.trim())
        ? [headingLine1.trim(), headingLine2.trim()].filter(Boolean).join(" ")
        : heading.trim();

      await onSave({
        id: slide?.id,
        image_url: mainImg,
        desktop_image_url: mainImg,
        mobile_image_url: finalMobileUrl || mainImg,
        alt: alt.trim() || computedHeading || "1PLACE.LK Hero Banner",
        campaign_label: campaignLabel.trim(),
        badge_text_color: badgeTextColor,
        heading: computedHeading,
        heading_line_1: headingLine1.trim(),
        heading_line_2: headingLine2.trim(),
        show_heading_line_1: showHeadingLine1,
        show_heading_line_2: showHeadingLine2,
        heading_color: headingLine1Color,
        heading_line_1_color: headingLine1Color,
        headingLine1Color: headingLine1Color,
        heading_line_2_color: headingLine2Color,
        headingLine2Color: headingLine2Color,
        heading_line_1_casing: headingLine1Casing,
        heading_line_2_casing: headingLine2Casing,
        description: description.trim(),
        promo_text: promoText.trim(),
        primary_button_text: primaryButtonText.trim() || "Shop Now",
        primary_button_url: primaryButtonUrl.trim() || "/products",
        show_badge: showBadge,
        show_description: showDescription,
        show_primary_button: showPrimaryButton,
        show_secondary_button: showSecondaryButton,
        secondary_button_text: secondaryButtonText.trim() || "View Product",
        secondary_button_url: secondaryButtonUrl.trim(),
        secondary_button_text_color: secondaryButtonTextColor,
        start_date: startDate,
        expiry_date: expiryDate,
        sort_order: Number(sortOrder) || 1,
        active,

        // Mobile Specific Visibility Options
        hide_content_on_mobile: hideContentOnMobile,
        hide_text_on_mobile: hideTextOnMobile,
        hide_buttons_on_mobile: hideButtonsOnMobile,

        // Custom Styling
        description_color: descriptionColor,
        button_text_color: buttonTextColor,
        button_bg_color: buttonBgColor,
        overlay_color: overlayColor,
        overlay_opacity: Number.isFinite(Number(overlayOpacity)) ? Number(overlayOpacity) : 0,
        banner_bg_color: bannerBgColor,
        bg_color: bannerBgColor,
        image_fit_mode: imageFitMode,
        desktop_image_position: desktopImagePosition,
        mobile_image_position: mobileImagePosition,
        text_align: textAlign,
        content_horizontal_position: contentHorizontalPosition,
        content_vertical_position: contentVerticalPosition,
        content_max_width: contentMaxWidth,
        desktop_heading_size: desktopHeadingSize,
        tablet_heading_size: tabletHeadingSize,
        mobile_heading_size: mobileHeadingSize,
        font_family: fontFamily,
        font_weight: fontWeight,
        line_height: lineHeight,
        letter_spacing: letterSpacing,
        banner_layout: "full_image",

        // Full-Width Banner & Image Fit Controls
        description_size: descriptionSize,
        button_size: buttonSize,
        autoplay_duration: Number(autoplayDuration) || 5.5,
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save hero banner: ${err?.message || "Please check your network."}`);
    } finally {
      setSaving(false);
    }
  };

  const currentPreviewImage = previewDevice === "mobile"
    ? (mobilePreview || desktopPreview || imageUrl || "/hero-slide-1.png")
    : (desktopPreview || imageUrl || "/hero-slide-1.png");

  const previewHiddenText = previewDevice === "mobile" && (hideContentOnMobile || hideTextOnMobile);
  const previewHiddenButtons = previewDevice === "mobile" && (hideContentOnMobile || hideButtonsOnMobile);
  const formattedPreviewLine1 = formatCase(headingLine1 || heading || "Banner Heading", headingLine1Casing);
  const formattedPreviewLine2 = formatCase(headingLine2 || "", headingLine2Casing);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {slide ? "Edit Hero Banner" : "Create Hero Banner"}
              </h3>
              <p className="text-xs text-white/50">Manage homepage hero slide details & campaigns</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

          {/* Live Device Preview Switch */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                Live Banner Preview
              </label>
              <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${previewDevice === "desktop" ? "bg-white text-black shadow-sm" : "text-white/60 hover:text-white"
                    }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${previewDevice === "mobile" ? "bg-white text-black shadow-sm" : "text-white/60 hover:text-white"
                    }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
              </div>
            </div>

            {/* Live Banner Box */}
            <div
              className={`relative w-full rounded-2xl overflow-hidden border border-white/20 shadow-xl transition-all ${previewDevice === "mobile" ? "aspect-video w-full" : "aspect-[2200/675]"
                }`}
              style={{ background: bannerBgColor || "#f0eeeb" }}
            >
              {/* Background / Product Image */}
              <img
                src={currentPreviewImage}
                alt="Banner preview"
                className="absolute inset-0 w-full h-full transition-all"
                style={{
                  objectFit: imageFitMode === "contain" ? "contain" : "cover",
                  objectPosition: previewDevice === "mobile" ? mobileImagePosition : desktopImagePosition,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/hero-slide-1.png";
                }}
              />

              {/* Overlay with custom opacity */}
              <div
                className="absolute inset-0 z-10 transition-colors pointer-events-none"
                style={{
                  backgroundColor: overlayColor,
                  opacity: overlayOpacity / 100,
                }}
              />

              {/* Text Layer */}
              <div
                className="absolute inset-0 z-20 p-5 sm:p-7 flex flex-col pointer-events-none"
                style={{
                  justifyContent: contentVerticalPosition === "top" ? "flex-start" : contentVerticalPosition === "bottom" ? "flex-end" : "center",
                  alignItems: contentHorizontalPosition === "left" ? "flex-start" : contentHorizontalPosition === "right" ? "flex-end" : "center",
                  textAlign,
                }}
              >
                {!previewHiddenText && (
                  <div className="space-y-1.5" style={{ width: "min(100%, " + (contentMaxWidth === "full" ? "100%" : contentMaxWidth) + ")" }}>
                    {campaignLabel && showBadge && (
                      <span
                        className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md"
                        style={{ color: badgeTextColor || "#805166", backgroundColor: "transparent" }}
                      >
                        {campaignLabel}
                      </span>
                    )}
                    <h4
                      className="font-black leading-tight tracking-tight drop-shadow-md"
                      style={{ color: headingLine1Color, fontSize: previewDevice === "mobile" ? mobileHeadingSize : desktopHeadingSize, lineHeight, letterSpacing, fontFamily, fontWeight }}
                    >
                      {showHeadingLine1 && (
                        <span className="block" style={{ color: headingLine1Color }}>
                          {formattedPreviewLine1}
                        </span>
                      )}
                      {showHeadingLine2 && formattedPreviewLine2 && (
                        <span className="block" style={{ color: headingLine2Color }}>
                          {formattedPreviewLine2}
                        </span>
                      )}
                    </h4>
                    {description && showDescription && (
                      <p
                        className="line-clamp-2 font-medium"
                        style={{
                          color: descriptionColor,
                          fontSize: descriptionSize,
                        }}
                      >
                        {description}
                      </p>
                    )}
                    {promoText && (
                      <span className="text-xs font-bold text-yellow-400 block drop-shadow-xs">
                        Starting at {promoText.replace(/^Starting\s+at\s+/i, "")}
                      </span>
                    )}
                  </div>
                )}

                {!previewHiddenButtons && (
                  <div className="flex items-center gap-2 pt-2 w-full" style={{ justifyContent: contentHorizontalPosition === "left" ? "flex-start" : contentHorizontalPosition === "right" ? "flex-end" : "center" }}>
                    {showPrimaryButton && (
                      <span
                        className="font-bold rounded-md shadow-sm"
                        style={{ color: buttonTextColor, backgroundColor: buttonBgColor, fontSize: buttonSize === "small" ? "11px" : buttonSize === "large" ? "16px" : "13px", padding: buttonSize === "small" ? "6px 14px" : buttonSize === "large" ? "12px 28px" : "8px 20px" }}
                      >
                        {primaryButtonText || "Shop Now"}
                      </span>
                    )}
                    {showSecondaryButton && (
                      <span
                        className="border border-white/30 font-bold rounded-full bg-black/30 backdrop-blur-md"
                        style={{ color: secondaryButtonTextColor || "#FFFFFF", fontSize: buttonSize === "small" ? "10px" : buttonSize === "large" ? "15px" : "12px", padding: buttonSize === "small" ? "5px 12px" : buttonSize === "large" ? "11px 24px" : "7px 18px" }}
                      >
                        {secondaryButtonText || "View"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              FULL-WIDTH BANNER & IMAGE CONTROLS (Requirements 1, 2, 3, 4)
          ════════════════════════════════════════════════════════════════════ */}
          <div className="p-4 bg-gradient-to-br from-[#64152F]/25 via-slate-900 to-black/40 border border-[#64152F]/50 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-400" /> Full-Width Banner &amp; Image Display Controls
              </h4>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
                100% Viewport Width
              </span>
            </div>

            <div className="pt-3 border-t border-white/10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
              <p className="text-xs font-bold text-white">Responsive image fit</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/60">Desktop fills the full-width hero. Mobile uses a zoomed 16:9 crop; adjust the mobile focal position below.</p>
            </div>

            {/* Autoplay Duration, Image Fit & Description Font Size */}
            <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1">
                  Autoplay Duration (Slide Rotation Timer)
                </label>
                <select
                  value={String(autoplayDuration)}
                  onChange={(e) => setAutoplayDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-none"
                >
                  <option value="3">3 Seconds (Fast)</option>
                  <option value="4">4 Seconds (Brisk)</option>
                  <option value="5.5">5.5 Seconds (Default Balanced)</option>
                  <option value="7">7 Seconds (Relaxed)</option>
                  <option value="10">10 Seconds (Slow Showcase)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1">
                  Image Fit Mode
                </label>
                <select
                  value={imageFitMode}
                  onChange={(e) => setImageFitMode(e.target.value as "cover" | "contain")}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-none"
                >
                  <option value="cover">Cover (Full Frame Bleed)</option>
                  <option value="contain">Contain (Show Full Artwork)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1">
                  Description Font Size
                </label>
                <select
                  value={descriptionSize}
                  onChange={(e) => setDescriptionSize(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-none"
                >
                  <option value="14px">14px (Compact)</option>
                  <option value="16px">16px (Standard Default)</option>
                  <option value="18px">18px (Large &amp; Clear)</option>
                  <option value="20px">20px (Lead Prominent)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/80 mb-1">
                  Hero Button Size
                </label>
                <select
                  value={buttonSize}
                  onChange={(e) => setButtonSize(e.target.value as "small" | "medium" | "large")}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-none"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium (Default)</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preset Images */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Quick Banner Image Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => {
                    setDesktopFile(null);
                    setImageUrl(p.url);
                    setDesktopPreview(p.url);
                  }}
                  className={`p-2 rounded-xl border text-left text-xs transition-all ${imageUrl === p.url ? "border-emerald-400 bg-emerald-500/10 text-emerald-300 font-bold" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                >
                  <p className="truncate font-medium">{p.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Text Colors & Overlay Controls */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Custom Colors & Overlay Controls
            </h4>

            {/* Colors Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Eyebrow / Badge Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(badgeTextColor, "#805166")}
                    onChange={(e) => setBadgeTextColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={badgeTextColor}
                    onChange={(e) => setBadgeTextColor(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Description Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(descriptionColor, "#D1D5DB")}
                    onChange={(e) => setDescriptionColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={descriptionColor}
                    onChange={(e) => setDescriptionColor(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Button Text</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(buttonTextColor, "#000000")}
                    onChange={(e) => setButtonTextColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={buttonTextColor}
                    onChange={(e) => setButtonTextColor(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Button Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(buttonBgColor, "#FFFFFF")}
                    onChange={(e) => setButtonBgColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={buttonBgColor}
                    onChange={(e) => setButtonBgColor(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Banner Canvas Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(bannerBgColor, "#F0EEEB")}
                    onChange={(e) => setBannerBgColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={bannerBgColor}
                    onChange={(e) => setBannerBgColor(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Overlay Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHexColor(overlayColor, "#000000")}
                    onChange={(e) => setOverlayColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={overlayColor}
                    onChange={(e) => setOverlayColor(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-white/70 mb-1">
                  Overlay Opacity ({overlayOpacity}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer mt-2"
                />
              </div>
            </div>

            {/* Image Focal Positioning Controls */}
            <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Desktop Image Focal Position</label>
                <select
                  value={desktopImagePosition}
                  onChange={(e) => setDesktopImagePosition(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="center">Center (Default)</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Mobile Image Focal Position</label>
                <select
                  value={mobileImagePosition}
                  onChange={(e) => setMobileImagePosition(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="center">Center (Default)</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            {/* Content Layout & Alignment Controls */}
            <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Text Align</label>
                <select
                  value={textAlign}
                  onChange={(e) => setTextAlign(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="left">Left (Default)</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Content Horiz Position</label>
                <select
                  value={contentHorizontalPosition}
                  onChange={(e) => setContentHorizontalPosition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="left">Left (Default)</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Content Vert Position</label>
                <select
                  value={contentVerticalPosition}
                  onChange={(e) => setContentVerticalPosition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="center">Center (Default)</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Content Max Width</label>
                <select
                  value={contentMaxWidth}
                  onChange={(e) => setContentMaxWidth(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="500px">500px (Compact)</option>
                  <option value="620px">620px (Apple Style)</option>
                  <option value="720px">720px (Wide)</option>
                  <option value="760px">760px (Default Wide)</option>
                  <option value="full">Full Width</option>
                </select>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              ADMIN-CONFIGURED BANNER IMAGE (Requirement 2)
          ════════════════════════════════════════════════════════════════════ */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-white/90 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                Admin-Uploaded Banner Image (External URL or Direct Upload)
              </label>
              <span className="text-[10px] text-sky-300 font-mono font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                Live Sync
              </span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              Paste an external image URL (e.g. from Cloudinary, Imgur, AWS S3, or Firebase) or upload directly from your device. The hero banner updates automatically in real-time when saved.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Desktop Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white/80">
                    Desktop Banner Image URL *
                  </label>
                  {(imageUrl || desktopPreview || desktopFile) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDesktopFile(null);
                        setImageUrl("");
                        setDesktopPreview("");
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove image
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="desktopUpload"
                    accept="image/*"
                    onChange={handleDesktopFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="desktopUpload"
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" /> Upload
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setDesktopPreview(e.target.value);
                      setDesktopFile(null);
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Mobile Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white/80">
                    Mobile Banner Image URL (Optional)
                  </label>
                  {(mobileImageUrl || mobilePreview || mobileFile) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileFile(null);
                        setMobileImageUrl("");
                        setMobilePreview("");
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove image
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="mobileUpload"
                    accept="image/*"
                    onChange={handleMobileFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="mobileUpload"
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" /> Upload
                  </label>
                  <input
                    type="text"
                    value={mobileImageUrl}
                    onChange={(e) => {
                      setMobileImageUrl(e.target.value);
                      setMobilePreview(e.target.value);
                      setMobileFile(null);
                    }}
                    placeholder="https://... (Leave blank to use Desktop image)"
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              HERO CONTENT MANAGER SECTION
          ════════════════════════════════════════════════════════════════════ */}
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Hero Content & Typography Manager
            </h4>

            {/* Eyebrow / Badge Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-white/80 mb-1">Eyebrow / Badge Text</label>
                <input
                  type="text"
                  value={campaignLabel}
                  onChange={(e) => setCampaignLabel(e.target.value)}
                  placeholder="e.g. YOUR TRUSTED TECH STORE IN SRI LANKA"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs font-bold text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBadge}
                    onChange={(e) => setShowBadge(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  Show Eyebrow / Badge
                </label>
              </div>
            </div>

            {/* Heading Lines Section with Independent Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              {/* Heading Line 1 Control Box */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                    Heading Line 1
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-white/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHeadingLine1}
                      onChange={(e) => setShowHeadingLine1(e.target.checked)}
                      className="w-3.5 h-3.5 accent-emerald-500 rounded"
                    />
                    Enable Line 1
                  </label>
                </div>
                <input
                  type="text"
                  value={headingLine1}
                  onChange={(e) => setHeadingLine1(e.target.value)}
                  placeholder="e.g. Latest Smartphones."
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">Line 1 Text Case</label>
                  <select
                    value={headingLine1Casing}
                    onChange={(e) => setHeadingLine1Casing(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="as_typed">As Typed (Default)</option>
                    <option value="uppercase">Uppercase (UPPERCASE)</option>
                    <option value="title_case">Title Case (Title Case)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">Line 1 Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={toHexColor(headingLine1Color, "#FFFFFF")}
                      onChange={(e) => setHeadingLine1Color(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={headingLine1Color}
                      onChange={(e) => setHeadingLine1Color(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Heading Line 2 Control Box */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                    Heading Line 2
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-white/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHeadingLine2}
                      onChange={(e) => setShowHeadingLine2(e.target.checked)}
                      className="w-3.5 h-3.5 accent-emerald-500 rounded"
                    />
                    Enable Line 2
                  </label>
                </div>
                <input
                  type="text"
                  value={headingLine2}
                  onChange={(e) => setHeadingLine2(e.target.value)}
                  placeholder="e.g. Ultimate Performance."
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">Line 2 Text Case</label>
                  <select
                    value={headingLine2Casing}
                    onChange={(e) => setHeadingLine2Casing(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="as_typed">As Typed (Default)</option>
                    <option value="uppercase">Uppercase (UPPERCASE)</option>
                    <option value="title_case">Title Case (Title Case)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">Line 2 Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={toHexColor(headingLine2Color, "#FFFFFF")}
                      onChange={(e) => setHeadingLine2Color(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={headingLine2Color}
                      onChange={(e) => setHeadingLine2Color(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fallback Single Line Heading */}
            <div>
              <label className="block text-[11px] font-medium text-white/50 mb-1">Single Full Heading (Used if Line 1 & Line 2 are empty)</label>
              <input
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="e.g. Premium Mobile Experience."
                className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Description Row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white/80">Description Text</label>
                <label className="flex items-center gap-2 text-xs font-bold text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDescription}
                    onChange={(e) => setShowDescription(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  Show Description
                </label>
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short supporting description (max 520px width recommended)."
                className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            {/* Responsive Typography Sizes */}
            <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Desktop Heading Size</label>
                <input
                  type="text"
                  value={desktopHeadingSize}
                  onChange={(e) => setDesktopHeadingSize(e.target.value)}
                  placeholder="clamp(48px, 4.2vw, 72px)"
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Tablet Heading Size</label>
                <input
                  type="text"
                  value={tabletHeadingSize}
                  onChange={(e) => setTabletHeadingSize(e.target.value)}
                  placeholder="54px"
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Mobile Heading Size</label>
                <input
                  type="text"
                  value={mobileHeadingSize}
                  onChange={(e) => setMobileHeadingSize(e.target.value)}
                  placeholder="40px"
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="Manrope">Manrope (Default)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Inter">Inter</option>
                </select>
              </div>
            </div>

            {/* Font Weight, Line Height & Letter Spacing */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Font Weight</label>
                <select
                  value={fontWeight}
                  onChange={(e) => setFontWeight(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="800">800 (Extra Bold)</option>
                  <option value="700">700 (Bold)</option>
                  <option value="600">600 (Semi Bold)</option>
                  <option value="900">900 (Black)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Line Height</label>
                <input
                  type="text"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(e.target.value)}
                  placeholder="1.02"
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-white/70 mb-1">Letter Spacing</label>
                <input
                  type="text"
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(e.target.value)}
                  placeholder="-0.04em"
                  className="w-full px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* CTA Buttons Config */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" /> CTA Button Configuration
            </h4>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80">Show Primary CTA Button</span>
              <input
                type="checkbox"
                checked={showPrimaryButton}
                onChange={(e) => setShowPrimaryButton(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {showPrimaryButton && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Primary Button Label</label>
                  <input
                    type="text"
                    value={primaryButtonText}
                    onChange={(e) => setPrimaryButtonText(e.target.value)}
                    placeholder="Shop Now"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Primary Destination URL</label>
                  <input
                    type="text"
                    value={primaryButtonUrl}
                    onChange={(e) => setPrimaryButtonUrl(e.target.value)}
                    placeholder="/products"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white/80">Enable Secondary CTA Button</span>
                <input
                  type="checkbox"
                  checked={showSecondaryButton}
                  onChange={(e) => setShowSecondaryButton(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {showSecondaryButton && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1">Secondary Button Label</label>
                    <input
                      type="text"
                      value={secondaryButtonText}
                      onChange={(e) => setSecondaryButtonText(e.target.value)}
                      placeholder="View Product"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1">Secondary Destination URL</label>
                    <input
                      type="text"
                      value={secondaryButtonUrl}
                      onChange={(e) => setSecondaryButtonUrl(e.target.value)}
                      placeholder="/products/iphone-16-pro-max"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1">Secondary Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={toHexColor(secondaryButtonTextColor, "#FFFFFF")}
                        onChange={(e) => setSecondaryButtonTextColor(e.target.value)}
                        className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={secondaryButtonTextColor}
                        onChange={(e) => setSecondaryButtonTextColor(e.target.value)}
                        className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 📱 Mobile UI Display Controls Section */}
          <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-2xl space-y-3.5">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-300">
                  Mobile UI Display Controls (மொபைல் திரை விருப்பங்கள்)
                </h4>
                <p className="text-[11px] text-white/50">
                  Control text and button visibility on mobile devices for this hero banner
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* 1. Hide All Text & Buttons on Mobile (Clean Banner Mode) */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3 hover:border-purple-500/40 transition-colors">
                <input
                  type="checkbox"
                  id="hideContentOnMobile"
                  checked={hideContentOnMobile}
                  onChange={(e) => {
                    setHideContentOnMobile(e.target.checked);
                    if (e.target.checked) {
                      setHideTextOnMobile(true);
                      setHideButtonsOnMobile(true);
                    }
                  }}
                  className="w-4 h-4 accent-purple-500 rounded mt-0.5 cursor-pointer shrink-0"
                />
                <label htmlFor="hideContentOnMobile" className="cursor-pointer select-none">
                  <span className="block text-xs font-bold text-white">Hide All on Mobile</span>
                  <span className="block text-[10px] text-white/60 leading-snug mt-0.5">
                    Show clean full image banner without text, badge, or buttons on mobile
                  </span>
                </label>
              </div>

              {/* 2. Hide Text / Heading Only on Mobile */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3 hover:border-purple-500/40 transition-colors">
                <input
                  type="checkbox"
                  id="hideTextOnMobile"
                  checked={hideTextOnMobile}
                  onChange={(e) => setHideTextOnMobile(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded mt-0.5 cursor-pointer shrink-0"
                />
                <label htmlFor="hideTextOnMobile" className="cursor-pointer select-none">
                  <span className="block text-xs font-bold text-white">Hide Text on Mobile</span>
                  <span className="block text-[10px] text-white/60 leading-snug mt-0.5">
                    Hide title heading, badge, and description on mobile screens
                  </span>
                </label>
              </div>

              {/* 3. Hide CTA Buttons Only on Mobile */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3 hover:border-purple-500/40 transition-colors">
                <input
                  type="checkbox"
                  id="hideButtonsOnMobile"
                  checked={hideButtonsOnMobile}
                  onChange={(e) => setHideButtonsOnMobile(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded mt-0.5 cursor-pointer shrink-0"
                />
                <label htmlFor="hideButtonsOnMobile" className="cursor-pointer select-none">
                  <span className="block text-xs font-bold text-white">Hide Buttons on Mobile</span>
                  <span className="block text-[10px] text-white/60 leading-snug mt-0.5">
                    Hide CTA action buttons on mobile screens
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Dates & Sorting */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Start Date (Optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-red-400" /> Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1">Sort Order #</label>
              <input
                type="number"
                min="1"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold"
              />
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <p className="text-xs font-bold text-white">Active Banner</p>
              <p className="text-[11px] text-white/40">Enable to display this hero banner slide on the homepage slider</p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 sticky bottom-0 bg-slate-900 py-2 z-10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              {saving ? "Saving Banner..." : slide ? "Update Banner" : "Publish Banner"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

