/**
 * Centralized Business Information Source of Truth for 1place.lk
 * Authoritative values for Sri Lanka's Premier Online Store
 */

export const BUSINESS_INFO = {
  name: "1place.lk",
  legalName: "1PLACE (Pvt) Ltd",
  brandName: "1PLACE",
  tagline: "Your Premier Online Destination",
  description:
    "Sri Lanka's Premier Online Store for 100% Genuine Smartphones, Electronics, Premium Audio, Computing & Lifestyle Accessories with Islandwide Express Delivery.",

  // Contact Phone Numbers
  phonePrimary: "076 242 6798",
  phonePrimaryIntl: "+94762426798",
  phoneMobile: "076 242 6798",
  phoneMobileIntl: "+94762426798",
  phoneHotline: "076 242 6798",
  phoneHotlineIntl: "+94762426798",
  whatsappNumber: "94762426798",
  whatsappDisplay: "+94 76 242 6798",

  // Email Addresses
  email: "1place.lk@gmail.com",
  ordersEmail: "orders@1place.lk",
  contactEmail: "1place.lk@gmail.com",

  // Official Domains
  domain: "1place.lk",
  websiteUrl: "https://www.1place.lk",

  // Physical Location & Logistics
  address: "Level 12, West Tower, World Trade Center, Echelon Square, Colombo 00100, Sri Lanka",
  addressLocality: "Colombo 01",
  addressRegion: "Western Province",
  postalCode: "00100",
  addressCountry: "LK",
  geo: {
    latitude: 6.9333,
    longitude: 79.8433,
  },

  // Business Hours
  hours: {
    weekdays: "9:00 AM - 7:00 PM",
    saturday: "9:30 AM - 6:00 PM",
    sunday: "10:00 AM - 4:00 PM",
    opensWeekdays: "09:00",
    closesWeekdays: "19:00",
    opensSunday: "10:00",
    closesSunday: "16:00",
    displaySummary: "Mon - Fri: 9:00 AM - 7:00 PM | Sat: 9:30 AM - 6:00 PM",
  },

  // Social Links
  social: {
    facebook: "https://www.facebook.com/1place.lk",
    instagram: "https://www.instagram.com/1place.lk",
    tiktok: "https://www.tiktok.com/@1place.lk",
    twitter: "https://x.com/1placelk",
  },

  // Google Maps / Store Presence
  maps: {
    link: "https://maps.google.com/?q=Colombo+Sri+Lanka",
    embed: "https://maps.google.com/maps?q=Colombo+Sri+Lanka&t=&z=14&ie=UTF8&iwloc=&output=embed",
  },

  // Aliases for compatibility
  website: "https://www.1place.lk",
  whatsapp: {
    number: "94762426798",
    display: "+94 76 242 6798",
    url: "https://wa.me/94762426798",
  },
  whatsappUrl: "https://wa.me/94762426798",
  city: "Colombo",
  googleMapsUrl: "https://maps.google.com/?q=Colombo+Sri+Lanka",
  emailPrimary: "1place.lk@gmail.com",
} as const;

export type BusinessInfo = typeof BUSINESS_INFO;
