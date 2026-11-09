import HeroSection from "@/components/home/premium-hero";
import CircularCategories from "@/components/home/circular-categories";
import HomeOfferBanners from "@/components/home/HomeOfferBanners";
import NewArrivalsSection from "@/components/home/new-arrivals-section";
import GallerySection from "@/components/home/gallery-section";
import CampaignPlacement from "@/components/ui/CampaignPlacement";
import HomeScrollReset from "@/components/home/HomeScrollReset";
import ShopAllProductsSection from "@/components/home/shop-all-products-section";

import VisualProductShowcase from "@/components/home/visual-product-showcase";
import {
  getCategories,
  getBrands,
  getProducts,
  getReviews,
  getGalleryImages,
  getHeroSlides,
  getUiSettings,
  getGoogleReviewsSettings,
  getShowcaseSettings,
  getFeaturedCollections,
  getNewArrivalsSettings,
  getGalleryAnimationSettings,
  getTodayDealSettings,
} from "@/lib/firestore-client";
import { siteSettings } from "@/lib/data";
import { getLocalHomeOffers } from "@/lib/home-offers-store";
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
    heroSlides,
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
    getHeroSlides().catch(() => []),
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
      <HeroSection initialSlides={heroSlides} />

      {/* Visual Showcase: Below Hero Banner */}
      <VisualProductShowcase settings={showcaseSettings} placement="below_hero" />

      {/* 2. Circular Category Navigation Strip */}
      <CircularCategories categories={categories} products={products} />
      <HomeOfferBanners products={products} fallbackEndsAt={todayDealSettings?.endsAt || ""} initialSettings={getLocalHomeOffers()} />

      {/* Visual Showcase: Below Categories */}
      <VisualProductShowcase settings={showcaseSettings} placement="below_category" />

      {/* 3. Complete Shop All Products Catalogue (Visual Showcase Banners interleaved at specified Product Lines) */}
      <ShopAllProductsSection
        initialProducts={products}
        categories={categories}
        todayDealSettings={todayDealSettings}
        showcaseSettings={showcaseSettings}
      />

      {/* 5. New Arrivals Collection (If Enabled) */}
      {newArrivalsSettings?.enabled === true && products.length > 8 && (
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

      {/* Compact, admin-managed banner replacing the shopping benefits strip */}
      <VisualProductShowcase settings={showcaseSettings} placement="benefits_banner_slot" className="home-benefits-ad-slot" />

      {/* Visual Showcase: Above Location / Footer */}
      <VisualProductShowcase settings={showcaseSettings} placement="above_location" />

      {/* 7. Scrolling Announcement Bar (Sits directly above Footer) */}
    </>
  );
}
