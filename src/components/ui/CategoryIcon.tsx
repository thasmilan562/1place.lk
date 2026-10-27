"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Smartphone,
  Laptop,
  Tv,
  Monitor,
  Shirt,
  Armchair,
  Home,
  Heart,
  Sparkles,
  Gamepad2,
  Headphones,
  Watch,
  Baby,
  Dumbbell,
  Camera,
  Speaker,
  Package,
  Folder,
  Tag,
  ShoppingBag,
  Zap,
  Flame,
  Shield,
  Gift,
  Sun,
  Music,
  Battery,
  Cable,
  Printer,
  Coffee,
  Car,
  Wrench,
  Scissors,
  Footprints,
  Glasses,
  Layers,
  LayoutGrid,
  Globe,
  Palette,
  Utensils,
  BookOpen,
  Briefcase,
  Clock,
  Compass,
  Feather,
  Flag,
  Key,
  Lock,
  MapPin,
  Radio,
  Search,
  Star,
  Truck,
  Umbrella,
  Wifi,
  LucideIcon,
} from "lucide-react";
import { Category } from "@/lib/types";

// Stable identifier registry of existing Lucide icons
export const CATEGORY_ICON_REGISTRY: Record<string, LucideIcon> = {
  Tv,
  Monitor,
  Shirt,
  Armchair,
  Home,
  Laptop,
  Smartphone,
  Heart,
  Sparkles,
  Dumbbell,
  Gamepad2,
  Baby,
  Headphones,
  Speaker,
  Watch,
  Camera,
  Music,
  Battery,
  Cable,
  Printer,
  Car,
  Package,
  ShoppingBag,
  Tag,
  Gift,
  Zap,
  Flame,
  Shield,
  Sun,
  Coffee,
  Wrench,
  Scissors,
  Footprints,
  Glasses,
  Layers,
  LayoutGrid,
  Globe,
  Palette,
  Utensils,
  BookOpen,
  Briefcase,
  Clock,
  Compass,
  Feather,
  Flag,
  Key,
  Lock,
  MapPin,
  Radio,
  Search,
  Star,
  Truck,
  Umbrella,
  Wifi,
  Folder,
};

export interface IconPreset {
  name: string;
  label: string;
  keywords: string[];
}

export const POPULAR_CATEGORY_ICONS: IconPreset[] = [
  { name: "Tv", label: "Electronics & TV", keywords: ["tv", "electronics", "screen", "display"] },
  { name: "Shirt", label: "Fashion & Clothing", keywords: ["fashion", "clothing", "shirt", "apparel"] },
  { name: "Armchair", label: "Home & Living", keywords: ["home", "living", "sofa", "furniture", "couch"] },
  { name: "Laptop", label: "Computers & Laptops", keywords: ["computer", "laptop", "pc", "macbook"] },
  { name: "Smartphone", label: "Mobiles & Tablets", keywords: ["phone", "smartphone", "tablet", "mobile", "ipad"] },
  { name: "Heart", label: "Beauty & Skincare", keywords: ["beauty", "skincare", "cosmetics", "perfume", "health"] },
  { name: "Dumbbell", label: "Sports & Fitness", keywords: ["sports", "fitness", "gym", "workout"] },
  { name: "Gamepad2", label: "Toys & Games", keywords: ["toys", "games", "gaming", "console", "playstation"] },
  { name: "Headphones", label: "Audio & Headphones", keywords: ["audio", "headphones", "earbuds", "earphones", "sound"] },
  { name: "Speaker", label: "Speakers & Sound", keywords: ["speaker", "soundbar", "bluetooth", "audio"] },
  { name: "Watch", label: "Wearables & Smartwatches", keywords: ["watch", "smartwatch", "fitness band", "wearable"] },
  { name: "Camera", label: "Cameras & Photography", keywords: ["camera", "dslr", "lens", "photo"] },
  { name: "Cable", label: "Cables & Adapters", keywords: ["cable", "adapter", "wire", "charger"] },
  { name: "Battery", label: "Power & Battery", keywords: ["power", "battery", "powerbank", "charging"] },
  { name: "Printer", label: "Printers & Office", keywords: ["printer", "office", "scanner"] },
  { name: "Car", label: "Automotive & Car", keywords: ["car", "vehicle", "automotive", "model car"] },
  { name: "ShoppingBag", label: "Lifestyle & Retail", keywords: ["shopping", "retail", "bag", "store"] },
  { name: "Sparkles", label: "Offers & Trending", keywords: ["sparkles", "trending", "offers", "deals"] },
  { name: "Package", label: "Accessories & Others", keywords: ["accessories", "box", "package", "other"] },
  { name: "LayoutGrid", label: "All Categories", keywords: ["grid", "all", "general", "category"] },
];

export function resolveFallbackCategoryIcon(name?: string, slug?: string): string {
  const text = `${name || ""} ${slug || ""}`.toLowerCase();
  if (text.includes("tv") || text.includes("electronic") || text.includes("appliance")) return "Tv";
  if (text.includes("fashion") || text.includes("cloth") || text.includes("wear") || text.includes("shirt") || text.includes("apparel")) return "Shirt";
  if (text.includes("home") || text.includes("living") || text.includes("kitchen") || text.includes("furniture") || text.includes("sofa")) return "Armchair";
  if (text.includes("laptop") || text.includes("computer") || text.includes("pc") || text.includes("mac")) return "Laptop";
  if (text.includes("phone") || text.includes("mobile") || text.includes("tablet") || text.includes("ipad")) return "Smartphone";
  if (text.includes("beauty") || text.includes("skin") || text.includes("cosmetic") || text.includes("perfume")) return "Heart";
  if (text.includes("sport") || text.includes("fitness") || text.includes("gym") || text.includes("workout")) return "Dumbbell";
  if (text.includes("toy") || text.includes("game") || text.includes("gaming") || text.includes("console")) return "Gamepad2";
  if (text.includes("headphone") || text.includes("earbud") || text.includes("sound") || text.includes("audio")) return "Headphones";
  if (text.includes("speaker")) return "Speaker";
  if (text.includes("watch") || text.includes("band") || text.includes("wearable")) return "Watch";
  if (text.includes("camera")) return "Camera";
  if (text.includes("power") || text.includes("battery")) return "Battery";
  if (text.includes("cable") || text.includes("charger") || text.includes("adapter")) return "Cable";
  if (text.includes("car") || text.includes("auto")) return "Car";
  return "LayoutGrid";
}

interface CategoryIconProps {
  category?: Partial<Category>;
  iconType?: "library" | "upload";
  iconName?: string;
  iconUrl?: string;
  className?: string;
  fallbackName?: string;
  size?: number;
}

export default function CategoryIcon({
  category,
  iconType,
  iconName,
  iconUrl,
  className = "w-6 h-6",
  fallbackName,
  size,
}: CategoryIconProps) {
  const [imgError, setImgError] = useState(false);

  const effectiveType = iconType || category?.iconType || (category?.image_url ? "upload" : "library");
  const effectiveUrl = iconUrl || category?.iconUrl || category?.image_url;
  const effectiveName =
    iconName ||
    category?.iconName ||
    category?.icon ||
    fallbackName ||
    resolveFallbackCategoryIcon(category?.name, category?.slug);

  if (effectiveType === "upload" && effectiveUrl && !imgError) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
        <Image
          src={effectiveUrl}
          alt={category?.name || "Category icon"}
          fill
          sizes="64px"
          className="object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Library Icon
  const IconComponent = CATEGORY_ICON_REGISTRY[effectiveName] || CATEGORY_ICON_REGISTRY[resolveFallbackCategoryIcon(category?.name, category?.slug)] || LayoutGrid;

  return <IconComponent size={size} className={`shrink-0 ${className}`} />;
}
