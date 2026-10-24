import HeroSection from "@/components/home/hero-section";
import CircularCategories from "@/components/home/circular-categories";
import StoreBenefitsBar from "@/components/home/store-benefits-bar";
import AnnouncementTicker from "@/components/home/announcement-ticker";
import NewArrivalsSection from "@/components/home/new-arrivals-section";
import GallerySection from "@/components/home/gallery-section";
import CampaignPlacement from "@/components/ui/CampaignPlacement";
import HomeScrollReset from "@/components/home/HomeScrollReset";
import ShopAllProductsSection from "@/components/home/shop-all-products-section";
import CategoryWiseSections from "@/components/home/category-wise-sections";

import VisualProductShowcase from "@/components/home/visual-product-showcase";
import {
  getCategories,
  getBrands,
  getProducts,
  getReviews,
  getGalleryImages,
  getUiSettings,
  getGoogleReviewsSettings,
  getShowcaseSettings,
  getFeaturedCollections,
  getNewArrivalsSettings,
  getGalleryAnimationSettings,
  getTodayDealSettings,
} from "@/lib/firestore-client";
import { siteSettings } from "@/lib/data";
import { GalleryImage } from "@/lib/types";
import { Metadata } from "next";

export const revalidate = 60; // Revalidate cache every 60s for high performance

export const metadata: Metadata = {
  title: "1place.lk | Sri Lanka's Curated Tech, Smartphones & Lifestyle Store",
  description: "1place.lk is Sri Lanka's premier destination for authentic technology, flagship smartphones, laptops, and premium accessories. Official warranty, secure PayHere payment & express islandwide delivery.",
  alternates: {
    canonical: "https://www.1place.lk",
  },
  openGraph: {
    title: "1place.lk | Sri Lanka's Curated Tech & Lifestyle Store",
    description: "1place.lk is Sri Lanka's premier destination for authentic technology, flagship smartphones, laptops, and premium accessories.",
    url: "https://www.1place.lk",
    siteName: "1place.lk",
    locale: "en_LK",
    type: "website",
    images: [{ url: "/logo.svg", width: 1200, height: 630, alt: "1place.lk Sri Lanka" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "1place.lk | Curated Technology & Electronics Store",
    description: "Authentic smartphones, premium audio, laptops, and tech accessories with islandwide express delivery.",
  },
};

export default async function HomePage() {
  const [
    categories,
    brands,
    products,
    reviews,
    galleryImages,
    uiSettings,
    googleReviewsSettings,
    showcaseSettings,
    featuredCollectionsSettings,
    newArrivalsSettings,
    galleryAnimationSettings,
    todayDealSettings,
  ] = await Promise.all([
    getCategories().catch(() => []),
    getBrands().catch(() => []),
    getProducts().catch(() => []),
    getReviews().catch(() => []),
    getGalleryImages().catch(() => []),
    getUiSettings().catch(() => null),
    getGoogleReviewsSettings().catch(() => null),
    getShowcaseSettings().catch(() => null),
    getFeaturedCollections().catch(() => null),
    getNewArrivalsSettings().catch(() => null),
    getGalleryAnimationSettings().catch(() => null),
    getTodayDealSettings().catch(() => null),
  ]);

  return (
    <>
      <HomeScrollReset />

      {/* 1. Full-Width Hero Banner (Matching Reference Layout) */}
      <HeroSection />

      {/* Visual Showcase: Below Hero Banner */}
      <VisualProductShowcase settings={showcaseSettings} placement="below_hero" />

      {/* 2. Circular Category Navigation Strip (Overlaid 50% on bottom of Hero Banner) */}
      <CircularCategories categories={categories} />

      {/* Visual Showcase: Below Shop by Category */}
      <VisualProductShowcase settings={showcaseSettings} placement="below_category" />

      {/* 3. Complete Shop All Products Catalogue (Visual Showcase Banners interleaved at specified Product Lines) */}
      <ShopAllProductsSection
        initialProducts={products}
        categories={categories}
        todayDealSettings={todayDealSettings}
        showcaseSettings={showcaseSettings}
      />

      {/* 4. Category-Wise Sections (Auto-hides empty categories, 6-col responsive) */}
      <CategoryWiseSections initialProducts={products} categories={categories} />

      {/* 5. New Arrivals Collection (If Enabled) */}
      {newArrivalsSettings?.enabled === true && (
        <>
          <NewArrivalsSection initialProducts={products} initialSettings={newArrivalsSettings} />
          <VisualProductShowcase settings={showcaseSettings} placement="below_new_arrivals" />
        </>
      )}

      {/* Store Gallery (Life at 1PLACE.LK) */}
      {(galleryAnimationSettings?.enabled ?? true) && (
        <>
          <GallerySection
            images={galleryImages as GalleryImage[]}
            animationSettings={galleryAnimationSettings || undefined}
            uiSettings={uiSettings || undefined}
          />

          {/* Showcase position: Below Life at 1PLACE.LK */}
          <VisualProductShowcase settings={showcaseSettings} placement="below_gallery" />
        </>
      )}

      {/* Campaign Placement */}
      <CampaignPlacement placement="homepage_after_categories" />

      {/* 6. Customer Trust & Shopping Benefits Bar */}
      <StoreBenefitsBar />

      {/* Visual Showcase: Above Location / Footer */}
      <VisualProductShowcase settings={showcaseSettings} placement="above_location" />

      {/* 7. Scrolling Announcement Bar (Sits directly above Footer) */}
      <AnnouncementTicker />
    </>
  );
}
