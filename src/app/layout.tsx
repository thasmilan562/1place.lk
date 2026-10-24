import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Manrope } from "next/font/google";
import "./globals.css";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/components/ui/ToastProvider";
import SearchOverlay from "@/components/ui/SearchOverlay";
import { WishlistProvider } from "@/lib/wishlist-context";
import AnnouncementBar from "@/components/ui/AnnouncementBar";
import CampaignPopup from "@/components/ui/CampaignPopup";
import SpinWinModal from "@/components/promotions/SpinWinModal";
import SmoothScrollProvider from "@/components/providers/SmoothScrollProvider";
import DisableNumberScroll from "@/components/providers/DisableNumberScroll";
import AppLoadingScreen from "@/components/ui/AppLoadingScreen";
import BrowseHistoryTracker from "@/components/navigation/BrowseHistoryTracker";
import Script from "next/script";
import { BUSINESS_INFO } from "@/lib/business-info";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS_INFO.websiteUrl),
  title: {
    default: "1place.lk — Sri Lanka's Premier Online Store | Electronics & Lifestyle",
    template: "%s | 1place.lk",
  },
  description:
    "Buy 100% genuine smartphones, Apple, Samsung, Xiaomi, audio gear, smart accessories, and lifestyle technology with official warranty and fast islandwide express delivery across Sri Lanka at 1place.lk.",
  keywords: [
    "1place.lk",
    "oneplace sri lanka",
    "online shopping Sri Lanka",
    "buy smartphones Sri Lanka",
    "mobile phones Sri Lanka",
    "iPhone Sri Lanka price",
    "Samsung Galaxy Sri Lanka",
    "electronics store Colombo",
    "earbuds Sri Lanka",
    "charging accessories Sri Lanka",
    "smart watches Sri Lanka",
    "laptops Sri Lanka",
    "islandwide delivery Sri Lanka",
    "cash on delivery electronics Sri Lanka",
  ],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  alternates: {
    canonical: BUSINESS_INFO.websiteUrl,
  },
  openGraph: {
    title: "1place.lk — Sri Lanka's Premier Online Store",
    description:
      "100% Genuine Smartphones, Computing, Premium Audio & Lifestyle Accessories with islandwide express delivery and official warranty.",
    url: BUSINESS_INFO.websiteUrl,
    siteName: "1place.lk",
    locale: "en_LK",
    type: "website",
    images: [
      {
        url: `${BUSINESS_INFO.websiteUrl}/logo.svg`,
        width: 1200,
        height: 630,
        alt: "1place.lk — Premier Online Store Sri Lanka",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "1place.lk — Sri Lanka's Premier Online Store",
    description: "Genuine Smartphones, Electronics & Accessories with islandwide delivery.",
    images: [`${BUSINESS_INFO.websiteUrl}/logo.svg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BUSINESS_INFO.websiteUrl}/#organization`,
  name: BUSINESS_INFO.name,
  legalName: BUSINESS_INFO.legalName,
  url: BUSINESS_INFO.websiteUrl,
  logo: `${BUSINESS_INFO.websiteUrl}/logo.svg`,
  image: `${BUSINESS_INFO.websiteUrl}/logo.svg`,
  description: BUSINESS_INFO.description,
  telephone: BUSINESS_INFO.phonePrimaryIntl,
  email: BUSINESS_INFO.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS_INFO.address,
    addressLocality: BUSINESS_INFO.addressLocality,
    addressRegion: BUSINESS_INFO.addressRegion,
    postalCode: BUSINESS_INFO.postalCode,
    addressCountry: BUSINESS_INFO.addressCountry,
  },
  sameAs: [
    BUSINESS_INFO.social.instagram,
    BUSINESS_INFO.social.facebook,
    BUSINESS_INFO.social.tiktok,
    BUSINESS_INFO.social.twitter,
  ],
};

const onlineStoreJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": `${BUSINESS_INFO.websiteUrl}/#onlinestore`,
  name: BUSINESS_INFO.name,
  image: `${BUSINESS_INFO.websiteUrl}/logo.svg`,
  url: BUSINESS_INFO.websiteUrl,
  telephone: BUSINESS_INFO.phonePrimaryIntl,
  priceRange: "LKR 1,000 - LKR 1,500,000",
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS_INFO.address,
    addressLocality: BUSINESS_INFO.addressLocality,
    addressRegion: BUSINESS_INFO.addressRegion,
    postalCode: BUSINESS_INFO.postalCode,
    addressCountry: BUSINESS_INFO.addressCountry,
  },
  paymentAccepted: "Cash on Delivery, Credit Card, Debit Card, Online Payment",
  currenciesAccepted: "LKR",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BUSINESS_INFO.websiteUrl}/#website`,
  url: BUSINESS_INFO.websiteUrl,
  name: "1place.lk",
  description: "Sri Lanka's Premier Online Store",
  publisher: {
    "@id": `${BUSINESS_INFO.websiteUrl}/#organization`,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BUSINESS_INFO.websiteUrl}/products?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${outfit.variable} ${manrope.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(onlineStoreJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#F7F7F7] text-[#111111] selection:bg-[#64152F] selection:text-white">
        <DisableNumberScroll />
        <Script src="https://www.payhere.lk/lib/payhere.js" strategy="afterInteractive" />
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ToastProvider>
                <AppLoadingScreen />
                <SmoothScrollProvider>
                  {/* Screen reader live region for accessibility */}
                  <div id="cart-live-announce" className="sr-only" aria-live="polite" aria-atomic="true" />
                  <AnnouncementBar />
                  <Header />
                  <main className="flex-1 pb-16 lg:pb-0" style={{ paddingTop: "var(--navbar-height)", marginTop: 0 }}>
                    {children}
                  </main>
                  <Footer />
                  <MobileNav />
                  <SearchOverlay />
                  <CampaignPopup />
                  <SpinWinModal />
                  <BrowseHistoryTracker />
                </SmoothScrollProvider>
              </ToastProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
