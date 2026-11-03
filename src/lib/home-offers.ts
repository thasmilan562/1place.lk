export interface HomeOfferSettings {
  enabled: boolean; dealTitle: string; dealImage: string; dealLink: string;
  ctaTitle: string; ctaText: string; ctaImage: string; ctaLink: string; endsAt: string;
  dealBadge?: string; dealDescription?: string; dealBackgroundColor?: string;
}
export const HOME_OFFER_DEFAULTS: HomeOfferSettings = {
  enabled: true, dealTitle: "Today's Deal", dealImage: "", dealLink: "/products",
  ctaTitle: "Your next favourite. Awaits.", ctaText: "Discover the collection", ctaImage: "", ctaLink: "/products", endsAt: "",
  dealBadge: "LIMITED TIME DEAL", dealDescription: "Limited-time savings on selected favourites.", dealBackgroundColor: "#118a22",
};
export function offerEndTime(value: string) { return value ? Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}+05:30`) : NaN; }
export function safeOfferLink(value: string) { return value.startsWith("/") && !value.startsWith("//") ? value : "/products"; }
