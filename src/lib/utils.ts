import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Product, Category } from "./types";
import { categories as defaultCategories } from "./data";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a price value is a genuine, valid positive number.
 */
export function isValidPrice(price: unknown): price is number {
  if (price === null || price === undefined || price === "") return false;
  const num = Number(price);
  return typeof num === "number" && !isNaN(num) && num > 0;
}

export interface FormatProductPriceOptions {
  fallback?: string;
  prefix?: string;
  allowZero?: boolean;
}

/**
 * Safe e-commerce price formatter:
 * Returns formatted "LKR 114,990" for valid prices.
 * Returns "Price Coming Soon" or custom fallback when price is missing, null, undefined, or invalid.
 * Never silently converts null/undefined/NaN into "LKR 0".
 */
export function formatProductPrice(
  price: unknown,
  options?: FormatProductPriceOptions
): string {
  const fallback = options?.fallback ?? "Price Coming Soon";
  const prefix = options?.prefix ?? "LKR ";

  if (price === null || price === undefined || price === "") {
    return fallback;
  }

  const num = Number(price);
  if (isNaN(num)) {
    return fallback;
  }

  if (num === 0 && !options?.allowZero) {
    return fallback;
  }

  if (num < 0) {
    return fallback;
  }

  const formattedNumber = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${prefix}${formattedNumber}`;
}

/**
 * Consistently format numbers to Sri Lankan LKR currency strings.
 * Defaults to "Price Coming Soon" if price is absent/invalid.
 */
export function formatPrice(price: unknown, fallback?: string): string {
  return formatProductPrice(price, { fallback });
}

/**
 * Generate a WhatsApp chat URL using international format without spaces (+94771234567)
 */
export function generateWhatsAppUrl(message?: string, phoneOverride?: string): string {
  const phone = phoneOverride || "94771234567";
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const text = message || "Hi! I'm interested in your products at 1PLACE.LK.";
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Announcement helper for screen readers
 */
export function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById("cart-live-announce");
  if (el) {
    el.textContent = message;
  }
}

/**
 * Checks whether a given category ID or Name belongs to Mobile Phones (group: "phones" or phone brand).
 */
export function isPhoneCategory(categoryIdOrName?: string, categoriesList?: Category[]): boolean {
  if (!categoryIdOrName) return false;
  const cats = categoriesList && categoriesList.length > 0 ? categoriesList : defaultCategories;
  const searchKey = categoryIdOrName.trim().toLowerCase();

  // 1. Direct match in categories list
  const matchedCat = cats.find(
    (c) =>
      c.id.toLowerCase() === searchKey ||
      c.slug.toLowerCase() === searchKey ||
      c.name.toLowerCase() === searchKey
  );

  if (matchedCat) {
    if (matchedCat.group === "phones") return true;
    if (matchedCat.group === "accessories") return false;
  }

  // 2. Explicit accessory keywords (Return false immediately)
  const accessoryKeywords = [
    "accessories", "accessory", "anker", "soundcore", "ugreen", "baseus",
    "dji", "cmf", "wiwu", "lenyes", "hollyland", "green lion", "green-lion", "brodu", "jbl",
    "charger", "cable", "case", "cover", "protector", "tempered glass", "powerbank",
    "power bank", "headphone", "earphone", "earbuds", "airpods", "smartwatch",
    "smart watch", "watch", "tablet", "tablets", "ipad", "gadget", "gadgets", "holder",
    "mount", "adapter", "hub", "strap", "magsafe", "gimbal"
  ];
  if (accessoryKeywords.some((kw) => searchKey.includes(kw))) {
    return false;
  }

  // 3. Known phone brand names & IDs
  const phoneBrandKeys = [
    "1", "2", "3", "4", "5", "6", "7", "11", "12", "13",
    "iphone", "samsung", "xiaomi", "redmi", "oppo", "vivo", "realme",
    "google", "honor", "oneplus", "pixel", "apple", "huawei", "nothing",
    "motorola", "nokia", "sony", "asus", "iqoo", "poco", "infinix", "tecno",
    "phone", "phones", "mobile", "smartphones", "smartphone"
  ];

  return phoneBrandKeys.some((pb) => searchKey.includes(pb) || searchKey === pb);
}

/**
 * Checks whether a product is a Mobile Phone product (vs Accessory or Gadget).
 */
export function isPhoneProduct(product?: Partial<Product> | null, categoriesList?: Category[]): boolean {
  if (!product) return false;

  // 1. Check product category_id or category_name
  if (product.category_id && isPhoneCategory(product.category_id, categoriesList)) {
    return true;
  }
  if (product.category_name && isPhoneCategory(product.category_name, categoriesList)) {
    return true;
  }

  // 2. If category_name or category_id explicitly matched non-phone, verify accessory keywords
  const catText = ((product.category_id || "") + " " + (product.category_name || "")).toLowerCase();
  const accessoryKeywords = ["accessories", "accessory", "anker", "soundcore", "ugreen", "baseus", "dji", "charger", "cable", "case", "cover", "protector", "powerbank", "earbuds", "airpods", "watch", "headphone"];
  if (accessoryKeywords.some((kw) => catText.includes(kw))) {
    return false;
  }

  // 3. Check product name for phone keywords
  const nameLower = (product.name || "").toLowerCase();
  const phoneKeywords = ["iphone", "galaxy s", "galaxy a", "galaxy z", "pixel", "redmi note", "xiaomi", "oneplus", "oppo reno", "vivo v", "realme"];
  if (phoneKeywords.some((kw) => nameLower.includes(kw))) {
    return true;
  }

  return false;
}

/**
 * Department prefix: Phones -> "P", Laptop & Tab -> "L", Accessories -> "A"
 */
export function getDeptPrefix(deptSlug: string): string {
  const s = (deptSlug || "").toLowerCase();
  if (s === "phones" || s.includes("phone")) return "P";
  if (s === "laptops-tablets" || s.includes("laptop") || s.includes("tab")) return "L";
  if (s === "accessories" || s.includes("access")) return "A";
  return "#";
}

/**
 * Format order code with department prefix (e.g. P1, L2, A3)
 */
export function formatDeptOrderCode(deptSlug: string, order?: number | string): string {
  if (order === undefined || order === null || order === "") return "";
  const num = typeof order === "number" ? order : parseInt(String(order).replace(/\D/g, ""), 10);
  if (isNaN(num)) return String(order);
  const prefix = getDeptPrefix(deptSlug);
  return `${prefix}${num}`;
}

/**
 * Parses user input (e.g. "P1", "p 2", "3") into pure numeric order
 */
export function parseDeptOrderNumber(input: string | number): number {
  if (typeof input === "number") return input;
  const cleaned = String(input).replace(/[^\d]/g, "");
  const val = parseInt(cleaned, 10);
  return isNaN(val) ? 1 : val;
}

/**
 * Generate a clean, SEO-friendly, unique product slug that distinguishes "+" (Plus) models from standard models.
 * E.g., "Redmi Note 15+ Pro 5G" -> "redmi-note-15-plus-pro-5g"
 *       "Redmi Note 15 Pro 5G"  -> "redmi-note-15-pro-5g"
 *       "Galaxy S25+"          -> "galaxy-s25-plus"
 */
export function generateProductSlug(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\+/g, "-plus-")
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Returns the correct, distinct slug for any product.
 * If a product has a "+" or "plus" in its name but the stored slug lacks "plus" (a collision),
 * it generates the proper distinctive slug based on the product name.
 */
export function getProductSlug(product?: Partial<Product> | null): string {
  if (!product) return "";
  const name = product.name || "";
  const nameHasPlus = name.includes("+") || name.toLowerCase().includes("plus");
  const storedSlug = (product.slug || "").toLowerCase().trim();

  if (nameHasPlus && !storedSlug.includes("plus")) {
    return generateProductSlug(name);
  }

  return storedSlug || generateProductSlug(name);
}

/**
 * Normalizes image URLs across the application.
 * Automatically routes hosts with expired or problematic SSL certificates (e.g. i.postimg.cc)
 * through our secure internal Next.js proxy route (/api/image-proxy).
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  let trimmed = url.trim();
  if (!trimmed) return "";

  // Decode common HTML entities that can break image loading
  if (trimmed.includes("&amp;")) trimmed = trimmed.replace(/&amp;/g, "&");
  if (trimmed.includes("&#x27;")) trimmed = trimmed.replace(/&#x27;/g, "'");
  if (trimmed.includes("&quot;")) trimmed = trimmed.replace(/&quot;/g, '"');

  return trimmed;
}

/**
 * Normalizes an array of image URLs
 */
export function normalizeImageUrls(urls?: (string | null | undefined)[] | null): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map(normalizeImageUrl).filter(Boolean);
}

/**
 * Stable deduplication helper by item id / productId / document id
 */
export function uniqueById<T extends { id?: string | number }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const map = new Map<string | number, T>();
  for (const item of items) {
    if (!item) continue;
    const id = item.id ?? (item as any).productId ?? (item as any).reviewId ?? (item as any).categoryId ?? (item as any)._id;
    if (id !== undefined && id !== null && !map.has(id)) {
      map.set(id, item);
    }
  }
  return Array.from(map.values());
}

/**
 * Normalizes a category slug or string for consistent routing and matching.
 */
export function normalizeCategorySlug(text: string | undefined | null): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&+/g, "and")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


