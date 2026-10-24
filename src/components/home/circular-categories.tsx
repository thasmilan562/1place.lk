"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Laptop,
  Smartphone,
  Tv,
  Shirt,
  Heart,
  Home,
  Gamepad2,
  Headphones,
  Watch,
  Baby,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  LayoutGrid,
} from "lucide-react";
import { Category } from "@/lib/types";
import { normalizeImageUrl } from "@/lib/utils";

interface CircularCategoriesProps {
  categories?: Category[];
}

interface DisplayCategory {
  id: string;
  name: string;
  slug: string;
  image?: string;
  iconName: string;
  href: string;
  isFeatured?: boolean;
}

const CORE_CATEGORIES: DisplayCategory[] = [
  {
    id: "cat-mobiles",
    name: "Mobiles & Tablets",
    slug: "mobiles-tablets",
    iconName: "Smartphone",
    href: "/category/mobiles-tablets",
    isFeatured: true, // Burgundy accent highlight
  },
  {
    id: "cat-computers",
    name: "Laptops & Computers",
    slug: "computers",
    iconName: "Laptop",
    href: "/category/computers",
  },
  {
    id: "cat-electronics",
    name: "Electronics",
    slug: "electronics",
    iconName: "Tv",
    href: "/category/electronics",
  },
  {
    id: "cat-fashion",
    name: "Fashion",
    slug: "fashion",
    iconName: "Shirt",
    href: "/category/fashion",
  },
  {
    id: "cat-beauty",
    name: "Beauty & Skincare",
    slug: "beauty-skincare",
    iconName: "Heart",
    href: "/category/beauty-skincare",
  },
  {
    id: "cat-home",
    name: "Home & Living",
    slug: "home-living",
    iconName: "Home",
    href: "/category/home-living",
  },
  {
    id: "cat-toys",
    name: "Toys & Kids",
    slug: "toys-kids",
    iconName: "Baby",
    href: "/category/toys-kids",
  },
  {
    id: "cat-sports",
    name: "Sports & Fitness",
    slug: "sports-fitness",
    iconName: "Dumbbell",
    href: "/category/sports-fitness",
  },
  {
    id: "cat-accessories",
    name: "Accessories",
    slug: "accessories",
    iconName: "Watch",
    href: "/category/accessories",
  },
  {
    id: "cat-gaming",
    name: "Gaming",
    slug: "gaming",
    iconName: "Gamepad2",
    href: "/category/gaming",
  },
  {
    id: "cat-headphones",
    name: "Audio & Headphones",
    slug: "headphones",
    iconName: "Headphones",
    href: "/category/headphones",
  },
];

function resolveCategoryIcon(name: string, slug?: string): string {
  const text = `${name || ""} ${slug || ""}`.toLowerCase();
  if (text.includes("laptop") || text.includes("computer") || text.includes("pc") || text.includes("mac")) return "Laptop";
  if (text.includes("phone") || text.includes("mobile") || text.includes("tablet") || text.includes("ipad")) return "Smartphone";
  if (text.includes("tv") || text.includes("electronic") || text.includes("appliance")) return "Tv";
  if (text.includes("game") || text.includes("gaming") || text.includes("console")) return "Gamepad2";
  if (text.includes("headphone") || text.includes("audio") || text.includes("earbud") || text.includes("speaker") || text.includes("sound")) return "Headphones";
  if (text.includes("fashion") || text.includes("cloth") || text.includes("wear") || text.includes("shirt") || text.includes("apparel")) return "Shirt";
  if (text.includes("beauty") || text.includes("skin") || text.includes("cosmetic") || text.includes("perfume")) return "Heart";
  if (text.includes("home") || text.includes("living") || text.includes("kitchen") || text.includes("furniture")) return "Home";
  if (text.includes("sport") || text.includes("fitness") || text.includes("gym") || text.includes("workout")) return "Dumbbell";
  if (text.includes("toy") || text.includes("kid") || text.includes("baby") || text.includes("children")) return "Baby";
  if (text.includes("accessori") || text.includes("watch") || text.includes("cable") || text.includes("case") || text.includes("power")) return "Watch";
  return "LayoutGrid";
}

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "Laptop":
      return <Laptop className={className} />;
    case "Smartphone":
      return <Smartphone className={className} />;
    case "Tv":
      return <Tv className={className} />;
    case "Gamepad2":
      return <Gamepad2 className={className} />;
    case "Headphones":
      return <Headphones className={className} />;
    case "Shirt":
      return <Shirt className={className} />;
    case "Heart":
      return <Heart className={className} />;
    case "Home":
      return <Home className={className} />;
    case "Watch":
      return <Watch className={className} />;
    case "Baby":
      return <Baby className={className} />;
    case "Dumbbell":
      return <Dumbbell className={className} />;
    default:
      return <LayoutGrid className={className} />;
  }
}

function CategoryItem({ item }: { item: DisplayCategory }) {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = Boolean(item.image) && !imageError;
  const isFilled = item.isFeatured;

  return (
    <Link
      href={item.href}
      className="group flex flex-col items-center text-center shrink-0 w-20 sm:w-24 lg:w-28 snap-start focus:outline-none"
    >
      {/* Circular Avatar Container with dynamic image / icon support */}
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 relative mb-2.5 shadow-2xs group-hover:scale-110 active:scale-95 overflow-hidden border ${
          hasValidImage
            ? "border-neutral-200 bg-white"
            : isFilled
            ? "bg-[#64152F] text-white border-[#64152F] shadow-md shadow-[#64152F]/25"
            : "bg-[#F3F4F6] text-neutral-700 border-transparent group-hover:bg-[#64152F] group-hover:text-white"
        }`}
      >
        {hasValidImage ? (
          <Image
            src={item.image!}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 56px, 64px"
            className="object-cover p-1 rounded-full transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <CategoryIcon
            name={item.iconName}
            className="w-6 h-6 stroke-[1.8] transition-colors"
          />
        )}
      </div>

      {/* Category Label */}
      <span className="text-xs sm:text-[13px] font-semibold text-[#111111] group-hover:text-[#64152F] transition-colors leading-tight line-clamp-2 px-1">
        {item.name}
      </span>
    </Link>
  );
}

export default function CircularCategories({ categories = [] }: CircularCategoriesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic deduplication: Merge Firestore active categories with Core Categories without duplicates
  const displayList = React.useMemo(() => {
    const seen = new Set<string>();
    const list: DisplayCategory[] = [];

    const normalizeKey = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

    // 1. Process real Firestore categories
    const activeDbCats = categories.filter((c) => !c.status || c.status === "active");
    activeDbCats.forEach((c) => {
      if (!c.name) return;
      const key = normalizeKey(c.slug || c.name);
      if (seen.has(key)) return;
      seen.add(key);

      const rawImg = c.image_url || (c as any).imageUrl || (c as any).image;
      list.push({
        id: c.id || `cat-${key}`,
        name: c.name,
        slug: c.slug || key,
        image: rawImg ? normalizeImageUrl(rawImg) : undefined,
        iconName: resolveCategoryIcon(c.name, c.slug),
        href: `/category/${c.slug || key}`,
        isFeatured: key.includes("mobile") || key.includes("phone"),
      });
    });

    // 2. Add any core required categories that aren't yet in Firestore
    CORE_CATEGORIES.forEach((core) => {
      const key = normalizeKey(core.slug);
      if (!seen.has(key)) {
        seen.add(key);
        list.push(core);
      }
    });

    return list;
  }, [categories]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 320;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section
      aria-label="Shop by Category"
      className="w-full relative z-30 -mt-12 sm:-mt-16 lg:-mt-20 px-4 sm:px-6 lg:px-8 select-none font-sans"
    >
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl sm:shadow-2xl border border-[#E8E8E8] py-4 sm:py-6 px-3 sm:px-8 relative">
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll categories left"
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-[#E8E8E8] text-neutral-800 shadow-md items-center justify-center hover:bg-[#F7F7F7] hover:border-neutral-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Categories Horizontal Track */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-3 sm:gap-6 lg:gap-8 overflow-x-auto scrollbar-none scroll-smooth px-1 py-1 snap-x snap-mandatory"
          >
            {displayList.map((item) => (
              <CategoryItem key={item.id} item={item} />
            ))}

            {/* View All Categories Action Item */}
            <Link
              href="/categories"
              className="group flex flex-col items-center text-center shrink-0 w-20 sm:w-24 lg:w-28 snap-start focus:outline-none"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 relative mb-2.5 bg-neutral-100 text-[#64152F] group-hover:bg-[#64152F] group-hover:text-white shadow-2xs group-hover:scale-110 active:scale-95 border border-[#E8E8E8]">
                <ArrowRight className="w-5 h-5 stroke-[2.2] transition-transform group-hover:translate-x-0.5" />
              </div>
              <span className="text-xs sm:text-[13px] font-semibold text-[#64152F] group-hover:underline transition-colors leading-tight line-clamp-2 px-1">
                View All
              </span>
            </Link>
          </div>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll categories right"
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-[#E8E8E8] text-neutral-800 shadow-md items-center justify-center hover:bg-[#F7F7F7] hover:border-neutral-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </section>
  );
}

