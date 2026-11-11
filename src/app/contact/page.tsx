import { Metadata } from "next";
import { getSiteSettings } from "@/lib/firestore-client";
import { siteSettings as defaultSettings } from "@/lib/data";
import { BUSINESS_INFO } from "@/lib/business-info";
import ContactClient from "@/components/contact/ContactClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact Us & Flagship Showroom in Colombo | 1place.lk Sri Lanka",
  description:
    "Contact 1place.lk customer hotline, WhatsApp support, and flagship showroom in Colombo, Sri Lanka for authentic gadgets, warranty inquiries, and nationwide delivery.",
  alternates: {
    canonical: "https://www.1place.lk/contact",
  },
  openGraph: {
    title: "Contact Us & Flagship Showroom | 1place.lk Colombo",
    description:
      "Visit 1place.lk in Colombo or contact our customer support team for gadget inquiries, orders, and verified warranty repairs.",
    url: "https://www.1place.lk/contact",
    type: "website",
    siteName: "1place.lk",
    locale: "en_LK",
    images: [{ url: "https://www.1place.lk/logo.svg", alt: "1place.lk Sri Lanka Store Contact" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact 1place.lk Colombo Flagship",
    description: "Official store location, customer hotline, WhatsApp contact, and opening hours for 1place.lk Sri Lanka.",
  },
};

export default async function ContactPage() {
  const storedSettings = (await getSiteSettings().catch(() => defaultSettings)) || defaultSettings;
  const settings = {
    ...storedSettings,
    phone: BUSINESS_INFO.phonePrimary,
    whatsapp: BUSINESS_INFO.whatsappNumber,
    email: BUSINESS_INFO.email,
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    "@id": "https://www.1place.lk/#localbusiness",
    "name": settings.store_name || BUSINESS_INFO.brandName,
    "image": "https://www.1place.lk/logo.svg",
    "url": "https://www.1place.lk/contact",
    "telephone": settings.phone || BUSINESS_INFO.phonePrimaryIntl,
    "email": settings.email || BUSINESS_INFO.email,
    "priceRange": "LKR",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": settings.address || BUSINESS_INFO.address,
      "addressLocality": BUSINESS_INFO.addressLocality,
      "addressRegion": BUSINESS_INFO.addressRegion,
      "postalCode": BUSINESS_INFO.postalCode,
      "addressCountry": BUSINESS_INFO.addressCountry,
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": BUSINESS_INFO.geo.latitude,
      "longitude": BUSINESS_INFO.geo.longitude,
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": BUSINESS_INFO.hours.opensWeekdays,
        "closes": BUSINESS_INFO.hours.closesWeekdays,
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Sunday",
        "opens": BUSINESS_INFO.hours.opensSunday,
        "closes": BUSINESS_INFO.hours.closesSunday,
      },
    ],
    "hasMap": settings.google_maps_link || BUSINESS_INFO.maps.link,
  };

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.1place.lk",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Contact Us",
        "item": "https://www.1place.lk/contact",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <ContactClient initialSettings={settings} />
    </>
  );
}
