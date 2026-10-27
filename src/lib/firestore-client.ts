import { db } from "./firebase";
import { collection, getDocs, doc, getDoc, query, where, limit } from "firebase/firestore";
import {
  Product,
  Category,
  Review,
  Banner,
  GalleryImage,
  HeroSlide,
  ProductBanner,
  UiSettings,
  OfferBanner,
  Brand,
  TickerSettings,
  GoogleReviewsSettings,
  VisualShowcaseSettings,
  FeaturedCollectionsSettings,
  FooterSettings,
  NewArrivalsSettings,
  MegaMenuSettings,
  TodayDealSettings,
  GalleryAnimationSettings,
  MotionSettings,
  SiteSettings,
} from "./types";
import {
  products as fallbackProducts,
  categories as fallbackCategories,
  reviews as fallbackReviews,
  fallbackOfferBanners,
  siteSettings,
  DEFAULT_BRANDS,
  DEFAULT_SHOWCASE_SETTINGS,
  DEFAULT_FEATURED_COLLECTIONS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_GALLERY_IMAGES,
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_NEW_ARRIVALS_SETTINGS,
  DEFAULT_MEGA_MENU_SETTINGS,
  DEFAULT_TODAY_DEAL_SETTINGS,
  DEFAULT_GALLERY_ANIMATION_SETTINGS,
  DEFAULT_MOTION_SETTINGS,
} from "./data";
import { KNOWN_BRAND_NAMES } from "./migration-audit";
import { deduplicateCategories } from "./category-utils";
import { generateProductSlug, normalizeImageUrl, normalizeImageUrls, uniqueById } from "./utils";
import { cachedFetch, getCachedData, setCachedData, clearDataCache, CACHE_TTL } from "./data-cache";

export { clearDataCache } from "./data-cache";

/**
 * Normalizes all image URLs inside a product object so expired SSL hosts (e.g. i.postimg.cc)
 * are served through our secure internal proxy route seamlessly.
 */
export function normalizeProduct<T extends Product | null | undefined>(product: T): T {
  if (!product) return product;

  const rawImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.image || product.image_url || product.cover_image ? [product.image || product.image_url || product.cover_image] : []);

  const images = normalizeImageUrls(rawImages);
  const image = normalizeImageUrl(product.image) || images[0] || "";
  const image_url = normalizeImageUrl(product.image_url) || images[0] || "";
  const cover_image = normalizeImageUrl(product.cover_image) || images[0] || "";

  const color_variants = Array.isArray(product.color_variants)
    ? product.color_variants.map((c) => ({
        ...c,
        cover_image: normalizeImageUrl(c.cover_image) || (c.images?.[0] ? normalizeImageUrl(c.images[0]) : ""),
        images: normalizeImageUrls(c.images),
      }))
    : product.color_variants;

  const variant_combos = Array.isArray(product.variant_combos)
    ? product.variant_combos.map((vc) => ({
        ...vc,
        image_ref: normalizeImageUrl(vc.image_ref),
      }))
    : product.variant_combos;

  return {
    ...product,
    images: images.length > 0 ? images : (image ? [image] : []),
    image,
    image_url,
    cover_image,
    color_variants,
    variant_combos,
  };
}

// ── 1. Product Banners ──
export async function getProductBanners(): Promise<ProductBanner[]> {
  return cachedFetch("product_banners:all", async () => {
    try {
      const q = query(collection(db, "product_banners"));
      const snapshot = await getDocs(q);
      const banners = snapshot.docs.map((d) => {
        const data = d.data() as ProductBanner;
        return {
          ...data,
          id: d.id,
          float_image: normalizeImageUrl(data.float_image),
        } as ProductBanner;
      });
      return banners.filter((b) => b.active !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    } catch (e) {
      console.warn("Offline/Error fetching product banners:", e);
      return [];
    }
  }, CACHE_TTL.BANNERS);
}

export function deduplicateProductsBySlug(products: Product[]): Product[] {
  const byId = uniqueById(products);
  const bySlug = new Map<string, Product>();

  for (const prod of byId) {
    const slug = (prod.slug || "").trim().toLowerCase();
    if (!slug) {
      bySlug.set(prod.id, prod);
      continue;
    }

    const existing = bySlug.get(slug);
    if (!existing) {
      bySlug.set(slug, prod);
    } else {
      // Prioritize active products over draft/inactive
      const isExistingActive = (existing as any).status !== "draft" && (existing as any).status !== "inactive";
      const isCurrentActive = (prod as any).status !== "draft" && (prod as any).status !== "inactive";
      if (!isExistingActive && isCurrentActive) {
        bySlug.set(slug, prod);
      }
    }
  }

  return Array.from(bySlug.values());
}

// ── 2. Products Catalog ──
export async function getProducts(): Promise<Product[]> {
  return cachedFetch("products:all", async () => {
    try {
      const q = query(collection(db, "products"));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((d) => normalizeProduct({ ...d.data(), id: d.id } as Product));
      const uniqueDocs = deduplicateProductsBySlug(docs);
      if (uniqueDocs.length > 0) return uniqueDocs;
    } catch (e) {
      console.warn("Offline/Error fetching products:", e);
    }
    return deduplicateProductsBySlug(fallbackProducts.map(normalizeProduct));
  }, CACHE_TTL.PRODUCTS);
}

// ── 3. Categories ──
export async function getCategories(includeInactive = false): Promise<Category[]> {
  const cacheKey = includeInactive ? "categories:all-admin" : "categories:public";
  return cachedFetch(cacheKey, async () => {
    try {
      const q = query(collection(db, "categories"));
      const snapshot = await getDocs(q);
      const rawDocs = snapshot.docs.map((d) => {
        const data = d.data() as Category;
        const id = d.id;
        const rawImageUrl = data.image_url || data.iconUrl || "";
        const image_url = normalizeImageUrl(rawImageUrl);
        const isActive = data.isActive !== undefined ? data.isActive : data.status !== "inactive";
        const sortOrder = data.sortOrder !== undefined ? data.sortOrder : (data.sort_order ?? 0);
        return {
          ...data,
          id,
          image_url,
          iconUrl: data.iconUrl || image_url,
          iconType: data.iconType || (rawImageUrl ? "upload" : "library"),
          iconName: data.iconName || data.icon,
          isActive,
          status: (isActive ? "active" : "inactive") as "active" | "inactive" | "deleted",
          sort_order: sortOrder,
          sortOrder,
        };
      });

      const validDocs = rawDocs.filter((c) => {
        if ((c as any).isDeleted === true || c.status === "deleted") return false;
        if (!includeInactive && c.isActive === false) return false;
        const cName = (c.name || "").toLowerCase();
        const cSlug = (c.slug || "").toLowerCase();
        return !KNOWN_BRAND_NAMES.some((b) => b.toLowerCase() === cName || b.toLowerCase() === cSlug);
      });

      if (validDocs.length > 0) {
        const deduped = deduplicateCategories(validDocs);
        return deduped.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      }
    } catch (e) {
      console.warn("Offline/Error fetching categories from Firestore:", e);
    }

    // Fallback only if offline or empty
    const cleanFallbacks = fallbackCategories
      .filter((c) => {
        if ((c as any).isDeleted === true || c.status === "deleted") return false;
        if (!includeInactive && c.status === "inactive") return false;
        return true;
      })
      .map((c) => ({
        ...c,
        image_url: normalizeImageUrl(c.image_url || ""),
        isActive: c.status !== "inactive",
      }));
    return deduplicateCategories(cleanFallbacks).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, CACHE_TTL.CATEGORIES);
}

// ── 4. Brands ──
import { getBrandsFromDb } from "./firestore-brands";

export async function getBrands(): Promise<Brand[]> {
  return await getBrandsFromDb();
}

// ── 5. Google Reviews Settings ──
export const DEFAULT_GOOGLE_REVIEWS_SETTINGS: GoogleReviewsSettings = {
  overall_rating: 4.9,
  total_reviews_count: 250,
  write_review_url: "https://www.google.com/maps/place//@8.7505237,80.5028315,17z/data=!3m1!4b1!4m3!3m2!1s0x3afc159b991b1da5:0xa03e8d7360fe634a!12e1?entry=ttu&g_ep=EgoyMDI2MDgxNy4wIKXMDSoASAFQAw%3D%3D",
  view_all_reviews_url: "https://www.google.com/maps/place//@8.7505237,80.5028315,17z/data=!3m1!4b1!4m3!3m2!1s0x3afc159b991b1da5:0xa03e8d7360fe634a!12e1?entry=ttu&g_ep=EgoyMDI2MDgxNy4wIKXMDSoASAFQAw%3D%3D",
  endlessScrollEnabled: true,
  autoplayEnabled: true,
  direction: "right",
  desktopSpeed: 36,
  tabletSpeed: 28,
  mobileSpeed: 20,
  pauseOnHover: true,
  pauseOnFocus: true,
  pauseOnInteraction: true,
  resumeDelay: 1500,
  dragEnabled: true,
  edgeFadeEnabled: true,
  edgeFadeWidth: 60,
  edgeFadeColor: "#FFFFFF",
};

export async function getGoogleReviewsSettings(): Promise<GoogleReviewsSettings> {
  return cachedFetch("settings:google_reviews", async () => {
    try {
      const docRef = doc(db, "settings", "google_reviews");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...DEFAULT_GOOGLE_REVIEWS_SETTINGS, ...docSnap.data() } as GoogleReviewsSettings;
      }
    } catch (e) {
      console.warn("Offline/Error fetching google reviews settings:", e);
    }
    return DEFAULT_GOOGLE_REVIEWS_SETTINGS;
  }, CACHE_TTL.SETTINGS);
}

// ── 6. Reviews ──
export async function getReviews(): Promise<Review[]> {
  return cachedFetch("reviews:all", async () => {
    try {
      const q = query(collection(db, "reviews"));
      const snapshot = await getDocs(q);
      const docs = uniqueById(snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Review)));
      if (docs.length > 0) {
        return docs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      }
    } catch (e) {
      console.warn("Offline/Error fetching reviews, returning fallbacks:", e);
    }
    return uniqueById(fallbackReviews);
  }, CACHE_TTL.REVIEWS);
}

// ── 7. Legacy Banners ──
export async function getBanners(): Promise<Banner[]> {
  return cachedFetch("banners:legacy", async () => {
    try {
      const q = query(collection(db, "banners"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Banner));
    } catch (e) {
      console.warn("Offline/Error fetching banners:", e);
      return [];
    }
  }, CACHE_TTL.BANNERS);
}

// ── 8. Offer Banners ──
export async function getOfferBanners(placement?: string): Promise<OfferBanner[]> {
  const allBanners = await cachedFetch("offer_banners:all", async () => {
    try {
      const q = query(collection(db, "offer_banners"));
      const snapshot = await getDocs(q);
      let docs = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          status: data.status || "active",
          placement: data.placement || "homepage_after_categories",
          contentMode: data.contentMode || "image_only",
          desktopImage: normalizeImageUrl(data.desktopImage),
          mobileImage: normalizeImageUrl(data.mobileImage),
        } as OfferBanner;
      });

      if (docs.length === 0) {
        docs = fallbackOfferBanners;
      }
      return docs;
    } catch (e) {
      console.warn("Offline/Error fetching offer banners, returning fallbacks:", e);
      return fallbackOfferBanners;
    }
  }, CACHE_TTL.BANNERS);

  const now = new Date();
  const activeBanners = allBanners
    .filter((b) => {
      const status = b.status || "active";
      if (status === "archived" || status === "draft" || status === "paused") return false;
      if (placement && b.placement !== placement) return false;

      // Schedule check
      if (b.startAt && new Date(b.startAt) > now) return false;
      if (!b.noExpiry && b.endAt && new Date(b.endAt) < now) return false;

      return true;
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (activeBanners.length === 0 && placement) {
    return fallbackOfferBanners.filter((b) => b.placement === placement && b.status === "active");
  }

  return activeBanners;
}

// ── 9. Hero Slides ──
export async function getHeroSlides(): Promise<HeroSlide[]> {
  return cachedFetch("hero_slides:all", async () => {
    try {
      const q = query(collection(db, "hero_slides"));
      const snapshot = await getDocs(q);
      const slides = snapshot.docs.map((d) => {
        const data = d.data() as HeroSlide;
        return {
          ...data,
          id: d.id,
          image_url: normalizeImageUrl(data.image_url),
          desktop_image_url: normalizeImageUrl(data.desktop_image_url),
          mobile_image_url: normalizeImageUrl(data.mobile_image_url),
        } as HeroSlide;
      });
      const activeSlides = slides.filter((s) => s.active !== false);
      if (activeSlides.length > 0) {
        return activeSlides.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      }
    } catch (e) {
      console.warn("Offline/Error fetching hero slides:", e);
    }
    return DEFAULT_HERO_SLIDES.map((s) => ({
      ...s,
      image_url: normalizeImageUrl(s.image_url),
      desktop_image_url: normalizeImageUrl(s.desktop_image_url),
      mobile_image_url: normalizeImageUrl(s.mobile_image_url),
    }));
  }, CACHE_TTL.BANNERS);
}

// ── 10. Gallery Images ──
export async function getGalleryImages(): Promise<any[]> {
  return cachedFetch("gallery:all", async () => {
    try {
      const q = query(collection(db, "gallery"));
      const snapshot = await getDocs(q);
      const images = uniqueById(snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          image_url: normalizeImageUrl(data.image_url || data.imageUrl || data.url),
        };
      }));
      if (images.length > 0) {
        return images;
      }
    } catch (e) {
      console.warn("Offline/Error fetching gallery images:", e);
    }
    return uniqueById(DEFAULT_GALLERY_IMAGES.map((g) => ({
      ...g,
      image_url: normalizeImageUrl(g.image_url),
    })));
  }, CACHE_TTL.GALLERY);
}

// ── 11. Optimized Product Lookup by Slug / ID ──
export async function getProductBySlug(rawSlug: string): Promise<Product | null> {
  if (!rawSlug) return null;
  const decoded = decodeURIComponent(rawSlug).trim();
  const lowerSlug = decoded.toLowerCase();
  
  // Normalization: Always map '+' to 'plus' so Plus/Pro+ variants are strictly preserved
  const plusConvertedSlug = lowerSlug
    .replace(/\+/g, "-plus-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const cacheKey = `product:slug:${lowerSlug}`;

  return cachedFetch(cacheKey, async () => {
    // 1. Fetch all products so we have the full catalog in memory
    const allProducts = await getProducts();
    if (allProducts && allProducts.length > 0) {
      const queryHasPlus = lowerSlug.includes("plus") || lowerSlug.includes("+");

      // Step A: If query has plus, look for product whose name or slug has plus
      if (queryHasPlus) {
        const plusMatch = allProducts.find((p) => {
          const pName = (p.name || "").toLowerCase();
          const pSlug = (p.slug || "").toLowerCase();
          const pNameSlug = generateProductSlug(p.name || "");
          const nameHasPlus = pName.includes("+") || pName.includes("plus");
          
          if (!nameHasPlus && !pSlug.includes("plus")) return false;

          return (
            pSlug === lowerSlug ||
            pSlug === plusConvertedSlug ||
            pNameSlug === lowerSlug ||
            pNameSlug === plusConvertedSlug ||
            pNameSlug.replace(/-5g$/, "") === lowerSlug.replace(/-5g$/, "") ||
            pNameSlug.replace(/-5g$/, "") === plusConvertedSlug.replace(/-5g$/, "")
          );
        });
        if (plusMatch) return plusMatch;
      }

      // Step B: Exact slug, ID, or SKU match
      const exactMatch = allProducts.find((p) => {
        const pSlug = (p.slug || "").toLowerCase();
        const pId = (p.id || "").toLowerCase();
        const pCode = (p.code || "").toLowerCase();
        const pName = (p.name || "").toLowerCase();
        const nameHasPlus = pName.includes("+") || pName.includes("plus");
        
        // Don't mistakenly match non-plus product if query asked for plus
        if (queryHasPlus && !nameHasPlus) return false;

        return pSlug === lowerSlug || pId === lowerSlug || pCode === lowerSlug;
      });
      if (exactMatch) return exactMatch;

      // Step C: Name generated slug match
      const nameMatch = allProducts.find((p) => {
        const pNameSlug = generateProductSlug(p.name || "");
        const pName = (p.name || "").toLowerCase();
        const nameHasPlus = pName.includes("+") || pName.includes("plus");

        if (queryHasPlus && !nameHasPlus) return false;

        return (
          pNameSlug === lowerSlug ||
          pNameSlug === plusConvertedSlug ||
          pNameSlug.replace(/-5g$/, "") === lowerSlug.replace(/-5g$/, "") ||
          pNameSlug.replace(/-5g$/, "") === plusConvertedSlug.replace(/-5g$/, "")
        );
      });
      if (nameMatch) return nameMatch;
    }

    try {
      // 2. Direct Firestore query with exact candidates
      const exactCandidates = Array.from(
        new Set([decoded, lowerSlug, plusConvertedSlug].filter(Boolean))
      ).slice(0, 5);

      const q = query(
        collection(db, "products"),
        where("slug", "in", exactCandidates),
        limit(5)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const queryHasPlus = lowerSlug.includes("plus") || lowerSlug.includes("+");
        const docs = snapshot.docs.map((d) => d.data() as Product);
        const bestDoc = docs.find((p) => {
          const nameHasPlus = (p.name || "").includes("+") || (p.name || "").toLowerCase().includes("plus");
          return queryHasPlus ? nameHasPlus : !nameHasPlus;
        }) || docs[0];

        return normalizeProduct(bestDoc);
      }

      // 3. Try Document ID lookup
      const docRef = doc(db, "products", decoded);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return normalizeProduct({ ...docSnap.data(), id: docSnap.id } as Product);
      }

      // 4. Try SKU / Product Code lookup
      const qCode = query(collection(db, "products"), where("code", "==", decoded), limit(1));
      const codeSnap = await getDocs(qCode);
      if (!codeSnap.empty) {
        return normalizeProduct(codeSnap.docs[0].data() as Product);
      }
    } catch (e) {
      console.warn("Offline/Error fetching product by slug:", e);
    }

    // 5. Fallback list lookup
    const queryHasPlus = lowerSlug.includes("plus") || lowerSlug.includes("+");
    const fallbackMatch = fallbackProducts.find((p) => {
      const pSlug = (p.slug || "").toLowerCase();
      const pName = (p.name || "").toLowerCase();
      const pNameSlug = generateProductSlug(p.name || "");
      const nameHasPlus = pName.includes("+") || pName.includes("plus");

      if (queryHasPlus && !nameHasPlus) return false;
      if (!queryHasPlus && nameHasPlus) return false;

      return (
        pSlug === lowerSlug ||
        pSlug === plusConvertedSlug ||
        pNameSlug === lowerSlug ||
        pNameSlug === plusConvertedSlug
      );
    });
    if (fallbackMatch) return normalizeProduct(fallbackMatch);

    return null;
  }, CACHE_TTL.PRODUCTS);
}

// ── 12. Related Products Helper (Zero full catalog scan) ──
export async function getRelatedProducts(
  categoryId: string,
  currentProductId: string,
  limitCount: number = 4
): Promise<Product[]> {
  const allProducts = await getProducts();
  if (allProducts && allProducts.length > 0) {
    const matching = allProducts.filter(
      (p) =>
        p.id !== currentProductId &&
        (p.category_id === categoryId ||
          p.category_slug === categoryId ||
          p.categorySlug === categoryId)
    );
    if (matching.length > 0) {
      return matching.slice(0, limitCount);
    }
    return allProducts.filter((p) => p.id !== currentProductId).slice(0, limitCount);
  }
  return [];
}

// ── 13. Category By Slug ──
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const allCats = await getCategories();
  const found = allCats.find((c) => c.slug === slug || c.id === slug);
  if (found) return found;

  try {
    const q = query(collection(db, "categories"), where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return snapshot.docs[0].data() as Category;
  } catch (e) {
    console.warn("Offline/Error fetching category by slug:", e);
  }
  return fallbackCategories.find((c) => c.slug === slug) || null;
}

export { siteSettings } from "./data";

// ── 14. UI Settings ──
export async function getUiSettings(): Promise<UiSettings> {
  return cachedFetch("settings:ui", async () => {
    try {
      const docRef = doc(db, "settings", "ui");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { showFeaturedProducts: true, ...docSnap.data() } as UiSettings;
      }
    } catch {
      // Fallback
    }
    return { showFeaturedProducts: true };
  }, CACHE_TTL.SETTINGS);
}

// ── 15. Ticker Settings ──
const DEFAULT_TICKER: TickerSettings = {
  enabled: true,
  messages: [
    { id: "t1", text: "Genuine Products with Warranty", icon: "ShieldCheck", active: true, sort_order: 0 },
    { id: "t2", text: "Islandwide Delivery Available", icon: "Truck", active: true, sort_order: 1 },
    { id: "t3", text: "Secure Online Payments", icon: "Lock", active: true, sort_order: 2 },
    { id: "t4", text: "Visit 1place.lk Flagship — Colombo", icon: "MapPin", active: true, sort_order: 3 },
    { id: "t5", text: "Latest Smartphones & Accessories", icon: "Smartphone", active: true, sort_order: 4 },
  ],
  text_color: "#FFFFFF",
  bg_color: "#000000",
  speed: "normal",
  direction: "rtl",
  pause_on_hover: true,
};

export async function getTickerSettings(): Promise<TickerSettings> {
  return cachedFetch("settings:ticker", async () => {
    try {
      const docRef = doc(db, "settings", "ticker");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...DEFAULT_TICKER, ...docSnap.data() } as TickerSettings;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_TICKER;
  }, CACHE_TTL.SETTINGS);
}

// ── 16. Showcase Settings ──
export async function getShowcaseSettings(): Promise<VisualShowcaseSettings> {
  return cachedFetch("settings:showcase", async () => {
    try {
      const docRef = doc(db, "settings", "visual_product_showcase");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as VisualShowcaseSettings;
        const rawSlides = data.slides && data.slides.length > 0 ? data.slides : DEFAULT_SHOWCASE_SETTINGS.slides;
        const normalizedSlides = (rawSlides || []).map((s) => ({
          ...s,
          desktop_image: normalizeImageUrl(s.desktop_image),
          mobile_image: normalizeImageUrl(s.mobile_image),
          bg_image: normalizeImageUrl(s.bg_image),
          bg_image_mobile: normalizeImageUrl(s.bg_image_mobile),
        }));
        return {
          ...DEFAULT_SHOWCASE_SETTINGS,
          ...data,
          slides: normalizedSlides,
        };
      }
    } catch (e) {
      console.warn("Offline/Error fetching visual showcase settings:", e);
    }
    return DEFAULT_SHOWCASE_SETTINGS;
  }, CACHE_TTL.SETTINGS);
}

// ── 17. Featured Collections Settings ──
export async function getFeaturedCollections(): Promise<FeaturedCollectionsSettings> {
  return cachedFetch("settings:featured_collections", async () => {
    try {
      const docRef = doc(db, "settings", "featured_collections");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as FeaturedCollectionsSettings;
        const rawCards = data.cards && data.cards.length > 0 ? data.cards : DEFAULT_FEATURED_COLLECTIONS.cards;
        const normalizedCards = (rawCards || []).map((c) => ({
          ...c,
          desktop_image_url: normalizeImageUrl(c.desktop_image_url),
          mobile_image_url: normalizeImageUrl(c.mobile_image_url),
        }));
        return {
          ...DEFAULT_FEATURED_COLLECTIONS,
          ...data,
          cards: normalizedCards,
        };
      }
    } catch (e) {
      console.warn("Offline/Error fetching featured collections:", e);
    }
    return DEFAULT_FEATURED_COLLECTIONS;
  }, CACHE_TTL.SETTINGS);
}

// ── 18. Footer Settings ──
export async function getFooterSettings(): Promise<FooterSettings> {
  return cachedFetch("settings:footer", async () => {
    try {
      const docRef = doc(db, "settings", "footer");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          ...DEFAULT_FOOTER_SETTINGS,
          ...docSnap.data(),
        } as FooterSettings;
      }
    } catch (e) {
      console.warn("Offline/Error fetching footer settings:", e);
    }
    return DEFAULT_FOOTER_SETTINGS;
  }, CACHE_TTL.SETTINGS);
}

// ── 19. New Arrivals Settings ──
export async function getNewArrivalsSettings(): Promise<NewArrivalsSettings> {
  return cachedFetch("settings:new_arrivals", async () => {
    try {
      const docRef = doc(db, "settings", "new_arrivals");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          ...DEFAULT_NEW_ARRIVALS_SETTINGS,
          ...docSnap.data(),
        } as NewArrivalsSettings;
      }
    } catch (e) {
      console.warn("Offline/Error fetching new arrivals settings:", e);
    }
    return DEFAULT_NEW_ARRIVALS_SETTINGS;
  }, CACHE_TTL.SETTINGS);
}

// ── 20. Mega Menu Settings ──
export async function getMegaMenuSettings(): Promise<MegaMenuSettings> {
  return cachedFetch("settings:mega_menu", async () => {
    try {
      const docRef = doc(db, "settings", "mega_menu");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as MegaMenuSettings;
        return {
          ...DEFAULT_MEGA_MENU_SETTINGS,
          ...data,
          columns: data.columns && data.columns.length > 0 ? data.columns : DEFAULT_MEGA_MENU_SETTINGS.columns,
        };
      }

      // Try alternate siteSettings/categoryMegaMenu location
      const altDocRef = doc(db, "siteSettings", "categoryMegaMenu");
      const altSnap = await getDoc(altDocRef);
      if (altSnap.exists()) {
        const data = altSnap.data() as MegaMenuSettings;
        return {
          ...DEFAULT_MEGA_MENU_SETTINGS,
          ...data,
          columns: data.columns && data.columns.length > 0 ? data.columns : DEFAULT_MEGA_MENU_SETTINGS.columns,
        };
      }
    } catch (e) {
      console.warn("Offline/Error fetching mega menu settings:", e);
    }
    return DEFAULT_MEGA_MENU_SETTINGS;
  }, CACHE_TTL.SETTINGS);
}

// ── 21. Today Deal Settings ──
export async function getTodayDealSettings(): Promise<TodayDealSettings> {
  return cachedFetch("settings:today_deal", async () => {
    try {
      const docRef = doc(db, "settings", "today_deal");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const dealData = docSnap.data();
        return {
          ...DEFAULT_TODAY_DEAL_SETTINGS,
          ...dealData,
          desktopImageUrl: normalizeImageUrl(dealData.desktopImageUrl),
          mobileImageUrl: normalizeImageUrl(dealData.mobileImageUrl),
          squareImageUrl: normalizeImageUrl(dealData.squareImageUrl),
          backgroundBannerUrl: normalizeImageUrl(dealData.backgroundBannerUrl),
        } as TodayDealSettings;
      }

      const altDocRef = doc(db, "siteSettings", "todayDeal");
      const altSnap = await getDoc(altDocRef);
      if (altSnap.exists()) {
        const altData = altSnap.data();
        return {
          ...DEFAULT_TODAY_DEAL_SETTINGS,
          ...altData,
          desktopImageUrl: normalizeImageUrl(altData.desktopImageUrl),
          mobileImageUrl: normalizeImageUrl(altData.mobileImageUrl),
          squareImageUrl: normalizeImageUrl(altData.squareImageUrl),
          backgroundBannerUrl: normalizeImageUrl(altData.backgroundBannerUrl),
        } as TodayDealSettings;
      }
    } catch (e) {
      console.warn("Offline/Error fetching Today's Deal settings:", e);
    }
    return DEFAULT_TODAY_DEAL_SETTINGS;
  }, CACHE_TTL.SETTINGS);
}

// ── 22. Gallery Animation Settings ──
export async function getGalleryAnimationSettings(): Promise<GalleryAnimationSettings> {
  return cachedFetch("settings:gallery_animation", async () => {
    try {
      const docRef = doc(db, "settings", "gallery_animation");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          ...DEFAULT_GALLERY_ANIMATION_SETTINGS,
          ...docSnap.data(),
        } as GalleryAnimationSettings;
      }

      const altDocRef = doc(db, "siteSettings", "galleryAnimation");
      const altSnap = await getDoc(altDocRef);
      if (altSnap.exists()) {
        return {
          ...DEFAULT_GALLERY_ANIMATION_SETTINGS,
          ...altSnap.data(),
        } as GalleryAnimationSettings;
      }
    } catch (e) {
      console.warn("Offline/Error fetching gallery animation settings:", e);
    }
    return DEFAULT_GALLERY_ANIMATION_SETTINGS;
  }, CACHE_TTL.SETTINGS);
}

// ── 23. Motion Settings ──
export async function getMotionSettings(): Promise<MotionSettings> {
  return cachedFetch("settings:motion", async () => {
    try {
      const docRef = doc(db, "settings", "motion");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...DEFAULT_MOTION_SETTINGS, ...snap.data() } as MotionSettings;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_MOTION_SETTINGS;
  }, CACHE_TTL.SETTINGS);
}

// ── 24. Auth Settings (Google Sign-in, Apple Sign-in Enabled etc.) ──
export interface AuthSettings {
  googleAuthEnabled: boolean;
  appleAuthEnabled: boolean;
}

export async function getAuthSettings(): Promise<AuthSettings> {
  return cachedFetch("settings:auth", async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "auth"));
      if (snap.exists()) {
        const data = snap.data();
        return {
          googleAuthEnabled: data?.googleAuthEnabled !== false,
          appleAuthEnabled: data?.appleAuthEnabled !== false,
        };
      }
    } catch {
      // Fallback
    }
    return { googleAuthEnabled: true, appleAuthEnabled: true };
  }, CACHE_TTL.SETTINGS);
}

// ── 25. Campaign Popup Settings ──
export interface CampaignPopupSettings {
  enabled: boolean;
  pageTargeting: "all" | "homepage" | "products";
  frequency: "once_per_session" | "once_per_day" | "every_visit";
  delaySeconds: number;
  imageUrl?: string;
  badgeText?: string;
  headline?: string;
  highlightText?: string;
  description?: string;
  couponCode?: string;
  discountText?: string;
  buttonText?: string;
  buttonUrl?: string;
  colorTheme?: "luxury_dark" | "gold_glow" | "clean_white" | "deep_purple";
  startDate?: string;
  endDate?: string;
}

export const DEFAULT_CAMPAIGN_POPUP: CampaignPopupSettings = {
  enabled: false,
  pageTargeting: "all",
  frequency: "once_per_session",
  delaySeconds: 7,
  imageUrl: "https://images.unsplash.com/photo-1616469829941-c7200edec809?q=80&w=1000&auto=format&fit=crop",
  badgeText: "SPECIAL PROMO",
  headline: "GET LKR 1,500 OFF",
  highlightText: "YOUR FIRST ORDER!",
  description: "Exclusive discount on genuine smartphones & accessories.",
  couponCode: "",
  discountText: "LKR 1,500 OFF",
  buttonText: "Claim Discount Now",
  buttonUrl: "/products",
  colorTheme: "luxury_dark",
};

export async function getCampaignPopupSettings(): Promise<CampaignPopupSettings> {
  return cachedFetch("settings:campaign_popup", async () => {
    try {
      const docRef = doc(db, "settings", "campaign_popup");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const popupData = snap.data();
        return {
          ...DEFAULT_CAMPAIGN_POPUP,
          ...popupData,
          imageUrl: normalizeImageUrl(popupData.imageUrl),
        } as CampaignPopupSettings;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CAMPAIGN_POPUP;
  }, CACHE_TTL.SETTINGS);
}

// ── 26. Site Settings ──
export async function getSiteSettings(): Promise<SiteSettings> {
  return cachedFetch("settings:site", async () => {
    try {
      const docRef = doc(db, "settings", "site");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...siteSettings, ...snap.data() } as SiteSettings;
      }
    } catch {
      // Fallback
    }
    return siteSettings as SiteSettings;
  }, CACHE_TTL.SETTINGS);
}

// ── 27. Featured Grid Banner Settings ──
export interface NewArrivalsPromotionalBannerData {
  enabled: boolean;
  title?: string;
  desktop_banner_url?: string;
  mobile_banner_url?: string;
  destination_type?: "product" | "category" | "external" | "none";
  destination_id?: string;
  destination_url?: string;
  start_date?: string;
  expiry_date?: string;
  image?: string;
  alt?: string;
  href?: string;
  aspectRatio?: string;
  placement?: string;
  customImage?: string;
  buttonUrl?: string;
}

export async function getFeaturedGridBannerSettings(): Promise<NewArrivalsPromotionalBannerData> {
  return cachedFetch("settings:featured_grid_banner", async () => {
    try {
      const bannerRef = doc(db, "settings", "featured_grid_banner");
      const snap = await getDoc(bannerRef);
      if (snap.exists()) {
        const bData = snap.data() as NewArrivalsPromotionalBannerData;
        return {
          ...bData,
          desktop_banner_url: normalizeImageUrl(bData.desktop_banner_url),
          mobile_banner_url: normalizeImageUrl(bData.mobile_banner_url),
          customImage: normalizeImageUrl(bData.customImage),
          image: normalizeImageUrl(bData.image),
        };
      }
    } catch {
      // Fallback
    }
    return { enabled: false };
  }, CACHE_TTL.SETTINGS);
}
