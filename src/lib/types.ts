export interface ProductImageSettings {
  fit?: "contain" | "cover" | "custom";
  scale?: number; // 80 - 200, default 100
  positionX?: number; // -50 - 50, default 0
  positionY?: number; // -50 - 50, default 0
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  category_name?: string;
  price: number;
  old_price: number | null;
  sale_price?: number | null;
  description: string;
  specifications: Record<string, string>;
  warranty: string;
  brand_warranty?: string;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "pre_order";
  stock_count?: number;
  colors: string[];
  storage_options: string[];
  storage_prices?: Record<string, number>;
  images: string[];
  image_url?: string;
  image?: string;
  cover_image?: string;
  primary_image?: string;
  thumbnail?: string;
  imageSettings?: ProductImageSettings;
  productImageSettings?: ProductImageSettings;
  featured: boolean;
  code?: string;
  allow_cod?: boolean;
  allow_card?: boolean;
  allow_whatsapp?: boolean;
  created_at: string;
  video_url?: string;
  delivery_info?: string;
  compatibility_tags?: string[];
  compatible_brands?: string[];
  compatible_models?: string[];
  related_categories?: string[];
  related_products?: string[];
  recommendation_mode?: "auto" | "manual" | "pinned";
  color_variants?: ProductColor[];
  variant_combos?: ProductVariantCombo[];
  warranty_options?: WarrantyOption[];
  productType?: "phone" | "laptop" | "accessory";
  hasColorVariants?: boolean;
  hasStorageVariants?: boolean;
  is_new_arrival?: boolean;
  category_slug?: string;
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
  brand_id?: string;
  brand_name?: string;
  brand_slug?: string;
  brandId?: string;
  brandName?: string;
  brandSlug?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  subcategory_slug?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  subcategorySlug?: string;
  installment_price?: string;
  brand?: string;
  sku?: string;
  stock_quantity?: number;
  has_variants?: boolean;
  tags?: string[];
  status?: "active" | "draft" | "inactive" | "deleted";
  isDeleted?: boolean;
  show_on_homepage?: boolean;
  rating?: number;
  review_count?: number;
  reviews_count?: number;
  meta_title?: string;
  metaTitle?: string;
  meta_description?: string;
  metaDescription?: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  order: number;
  description?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  icon_url?: string;
  logo_alt_text?: string;
  description?: string;
  assigned_departments?: string[]; // e.g. ["phones", "laptops-tablets", "accessories"]
  product_group?: "smartphones" | "laptops" | "accessories" | "audio" | "other";
  category?: string;
  link_destination?: string;
  monochrome?: boolean;
  sort_order?: number;
  order?: number;
  department_order?: Record<string, number>; // e.g. { "phones": 1, "laptops-tablets": 2, "accessories": 5 }
  department_orders?: Record<string, number>;
  mobile_sort_order?: number;
  status?: "active" | "inactive" | "deleted";
  isDeleted?: boolean;
  enabled?: boolean;
  show_on_homepage?: boolean;
  is_featured?: boolean;
  featured?: boolean;
  product_count?: number;
  logoScale?: number;
  seo_title?: string;
  seo_description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BrandDepartmentRelation {
  id: string;
  brandId: string;
  brandSlug: string;
  departmentId: string;
  departmentSlug: string;
  enabled: boolean;
  featured: boolean;
  order: number;
  hideWhenEmpty: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepartmentBrandCategoryTab {
  id: string;
  enabled: boolean;
  label: string;
  slug: string;
  categoryId?: string;
  subcategoryId?: string;
  order: number;
}

export interface ResponsiveBannerImage {
  imageUrl: string;
  focalPosition: string;
  actualWidth?: number;
  actualHeight?: number;
  actualRatio?: number;
  format?: string;
  fileSize?: number;
  validationStatus?: "perfect" | "acceptable" | "warning" | "error" | "untested";
  validationMessage?: string;
}

export interface DepartmentBrandPageConfig {
  id: string; // e.g. "phones_apple"
  brandId: string;
  brandSlug: string;
  departmentId: string;
  departmentSlug: string;

  enabled: boolean;
  status: "draft" | "scheduled" | "published" | "archived";

  // ── Banner-Only Hero (Single externally designed artwork) ──
  bannerEnabled?: boolean;
  desktop?: ResponsiveBannerImage;
  tablet?: ResponsiveBannerImage;
  mobile?: ResponsiveBannerImage;

  desktopBannerUrl?: string;
  tabletBannerUrl?: string;
  mobileBannerUrl?: string;
  bannerAlt?: string;
  decorative?: boolean;
  bannerSizeRatio?: "1080x1080" | "860x270" | "1920x850" | "1080x1440" | "default";
  banner_size_ratio?: string;
  bannerBackgroundColor?: string;
  bannerOverlayEnabled?: boolean;
  bannerBlurEnabled?: boolean;
  bannerBlurStrength?: "none" | "low" | "medium" | "high" | "ultra";
  bannerBlendMode?: "normal" | "multiply" | "screen" | "darken" | "overlay";
  bannerFitMode?: "contain" | "cover";
  bannerGlowEnabled?: boolean;
  bannerGlowColor?: string;
  bannerGlowStrength?: "soft" | "medium" | "vibrant" | "intense";

  desktopFocalPosition?: string;
  tabletFocalPosition?: string;
  mobileFocalPosition?: string;

  useDesktopForTablet?: boolean;
  useDesktopForMobile?: boolean;
  useTabletForMobile?: boolean;

  linkEnabled?: boolean;
  destinationType?: "category" | "subcategory" | "product" | "collection" | "page" | "custom";
  destinationId?: string;
  destinationUrl?: string;
  openInNewTab?: boolean;
  linkAriaLabel?: string;
  useDefaultBrandBanner?: boolean;

  // ── Page Content Section (Below Tabs) ──
  productSectionHeading?: string;
  productSectionDescription?: string;

  // ── Category Navigation Tabs ──
  categoryTabs?: DepartmentBrandCategoryTab[];
  defaultCategoryTabId?: string;
  hideEmptyTabs?: boolean;

  // ── Related Showcase ──
  relatedSectionEnabled?: boolean;
  relatedSectionHeading?: string;
  relatedCategoryIds?: string[];
  relatedProductIds?: string[];
  relatedDisplayMode?: "grid" | "rail";

  // ── SEO ──
  seoTitle?: string;
  seoDescription?: string;
  seoImageUrl?: string;
  noIndex?: boolean;

  // Legacy fields preserved for backward compatibility
  heading?: string;
  description?: string;
  eyebrow?: string;
  primaryCtaLabel?: string;
  primaryCtaUrl?: string;
  primaryCtaEnabled?: boolean;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  secondaryCtaEnabled?: boolean;
  useDefaultLogo?: boolean;
  logoOverrideUrl?: string;
  logoAlt?: string;
  useDefaultBanner?: boolean;
  borderRadius?: number;

  updatedAt?: string;
  updatedBy?: string;
  publishedAt?: string;
}

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  sort_order?: number;
  is_default?: boolean;
  active?: boolean;
  cover_image?: string;
  images: string[];
  video_url?: string;
  alt_text?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  gender?: "male" | "female" | "other";
  avatarUrl?: string;
  phone?: string;
  role?: "customer" | "admin" | "staff" | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariantCombo {
  id: string;
  color_id?: string;
  color_name?: string;
  color_hex?: string;
  ram?: string;
  storage?: string;
  sim_type?: string;
  sku: string;
  barcode?: string;
  price: number;
  old_price?: number | null;
  cost_price?: number;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold?: number;
  weight?: number;
  status: "active" | "inactive";
  image_ref?: string;
  warranty?: string;
}

export interface WarrantyOption {
  id: string;
  title: string;
  type: "No Warranty" | "Shop Warranty" | "Manufacturer Warranty" | "Extended Warranty" | "Lifetime Warranty" | "Unlimited Warranty";
  duration_value: number | string;
  duration_unit: "months" | "years" | "lifetime" | "unlimited";
  additional_price: number;
  coverage_details?: string;
  exclusions?: string;
  claim_instructions?: string;
  status: "active" | "inactive";
  is_default?: boolean;
  sort_order?: number;
}

export interface InventoryLog {
  id: string;
  variant_id: string;
  variant_name: string;
  previous_quantity: number;
  changed_quantity: number;
  new_quantity: number;
  reason: "add_stock" | "damaged" | "correct_count" | "customer_return" | "supplier_restock" | "order_fulfillment";
  admin_id?: string;
  timestamp: string;
  note?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  parent_category_id: string;
  parent_category_slug?: string;
  destination_url?: string;
  sort_order: number;
  status: "active" | "inactive" | "deleted";
  isDeleted?: boolean;
  description?: string;
  is_featured_in_menu?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  iconType?: "library" | "upload";
  iconName?: string;
  iconUrl?: string;
  iconStoragePath?: string;
  isActive?: boolean;
  image_url?: string;
  hover_icon_url?: string;
  icon_alt_text?: string;
  link_destination?: string;
  destination_url?: string;
  target_category_id?: string;
  sort_order: number;
  sortOrder?: number;
  mobile_sort_order?: number;
  description?: string;
  product_count?: number;
  group?: "phones" | "product_categories" | "accessories" | "other";
  status?: "active" | "inactive" | "deleted";
  isDeleted?: boolean;
  show_in_selector?: boolean;
  show_on_homepage?: boolean;
  show_in_menu?: boolean;
  is_featured_in_menu?: boolean;
  parent_id?: string;
  subcategories?: Subcategory[];
  createdAt?: string;
  updatedAt?: string;
}

export type MegaMenuDestinationType =
  | "category"
  | "subcategory"
  | "brand"
  | "product"
  | "collection"
  | "page"
  | "custom";

export type MegaMenuSourceMode = "dynamic" | "manual" | "mixed";

export interface MegaMenuItem {
  id: string;
  enabled: boolean;
  label: string;
  destinationType: MegaMenuDestinationType;
  destinationId?: string;
  href: string;
  openInNewTab?: boolean;
  featured?: boolean;
  bold?: boolean;
  textColor?: string;
  badgeEnabled?: boolean;
  badgeLabel?: string;
  badgeBackgroundColor?: string;
  iconUrl?: string;
  order: number;
}

export interface MegaMenuColumn {
  id: string;
  enabled: boolean;
  heading: string;
  headingColor?: string;
  headingSize?: "sm" | "base" | "lg";
  sourceMode: MegaMenuSourceMode;
  dynamicSource?: "categories" | "subcategories" | "brands" | "collections";
  sortBy?: "manual" | "name-asc" | "name-desc" | "newest" | "product-count" | "featured";
  maximumItems?: number;
  hideEmptyItems?: boolean;
  includedIds?: string[];
  excludedIds?: string[];
  width?: number;
  order: number;
  items: MegaMenuItem[];
}

export interface MegaMenuExploreLink {
  id: string;
  label: string;
  url: string;
  sort_order: number;
  is_highlighted?: boolean;
  status: "active" | "inactive";
}

export interface MegaMenuSettings {
  enabled: boolean;
  interaction?: "click" | "hover";
  hoverDelay?: number;
  columns: MegaMenuColumn[];

  // Appearance
  backgroundColor?: string;
  headingColor?: string;
  primaryTextColor?: string;
  secondaryTextColor?: string;
  hoverTextColor?: string;
  hoverBackgroundColor?: string;
  dividerColor?: string;

  // Layout
  widthMode?: "viewport" | "container" | "custom";
  customMaxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  columnGap?: number;
  rowGap?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  borderRadius?: number;
  borderColor?: string;
  shadowStrength?: number;

  // Backward compatibility legacy fields
  column1_heading?: string;
  column2_heading?: string;
  column3_heading?: string;
  selected_category_ids?: string[];
  selected_subcategory_ids?: string[];
  explore_links?: MegaMenuExploreLink[];

  // Draft / Publish workflow
  status?: "draft" | "published";
  updatedAt?: string;
  updatedBy?: string;
  publishedAt?: string;
  draftSettings?: Partial<MegaMenuSettings>;
}

export interface Review {
  id: string;
  author_name: string;
  author_photo?: string;
  rating: number;
  text: string;
  review_date: string;
  visible: boolean;
  google_url?: string;
  featured?: boolean;
  sort_order?: number;
}

export interface GoogleReviewsSettings {
  enabled?: boolean;
  overall_rating: number;
  total_reviews_count: number;
  write_review_url: string;
  view_all_reviews_url: string;

  // Animation configuration
  endlessScrollEnabled?: boolean;
  autoplayEnabled?: boolean;
  direction?: "left" | "right" | "auto-opposite"; // auto-opposite: always opposite to gallery
  desktopSpeed?: number;
  tabletSpeed?: number;
  mobileSpeed?: number;
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
  pauseOnInteraction?: boolean;
  resumeDelay?: number;
  dragEnabled?: boolean;
  edgeFadeEnabled?: boolean;
  edgeFadeWidth?: number;
  edgeFadeColor?: string;
}

export interface GalleryImage {
  id: string;
  image_url: string;
  video_url?: string;
  title?: string;
  caption: string;
  category: "shop" | "repairs" | "customers";
  sort_order: number;
  platform?: "instagram" | "tiktok" | "facebook" | "youtube" | "other" | "none";
  post_url?: string;
  visible?: boolean;
}

export interface GalleryAnimationSettings {
  enabled?: boolean;
  endlessScrollEnabled: boolean;
  autoplayEnabled: boolean;
  direction: "left" | "right";
  desktopSpeed: number; // px/s, e.g. 40
  tabletSpeed: number; // px/s, e.g. 32
  mobileSpeed: number; // px/s, e.g. 24
  pauseOnHover: boolean;
  pauseOnFocus: boolean;
  pauseOnInteraction: boolean;
  resumeDelay: number; // ms, e.g. 1500
  dragEnabled: boolean;
  mobileAutoplayEnabled: boolean;
  edgeFadeEnabled: boolean;
  edgeFadeWidth: number; // px, e.g. 60
  edgeFadeColor: string; // e.g. "#FAFAFA"
  updatedAt?: string;
  updatedBy?: string;
}

export interface Banner {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  sort_order: number;
  active: boolean;
}

export interface HeroSlide {
  id: string;
  image_url: string;
  desktop_image_url?: string;
  mobile_image_url?: string;
  alt?: string;
  sort_order: number;
  active: boolean;
  campaign_label?: string;
  heading?: string;
  description?: string;
  promo_text?: string;
  primary_button_text?: string;
  primary_button_url?: string;
  show_secondary_button?: boolean;
  secondary_button_text?: string;
  secondary_button_url?: string;
  start_date?: string;
  expiry_date?: string;

  heading_line_1?: string;
  heading_line_2?: string;
  show_heading_line_1?: boolean;
  show_heading_line_2?: boolean;
  heading_line_1_color?: string;
  headingLine1Color?: string;
  heading_line_2_color?: string;
  headingLine2Color?: string;
  heading_line_1_size?: string;
  heading_line_2_size?: string;
  heading_line_1_weight?: string;
  heading_line_2_weight?: string;
  heading_line_1_casing?: "as_typed" | "uppercase" | "title_case";
  heading_line_2_casing?: "as_typed" | "uppercase" | "title_case";
  show_badge?: boolean;
  show_description?: boolean;
  show_primary_button?: boolean;
  show_trust_strip?: boolean;
  trust_item_1?: string;
  trust_item_2?: string;
  trust_item_3?: string;

  // Mobile Specific Visibility Options
  hide_content_on_mobile?: boolean;
  hide_text_on_mobile?: boolean;
  hide_buttons_on_mobile?: boolean;

  // Custom Styling & Overlay Controls
  badge_text_color?: string;
  badge_bg_color?: string;
  heading_color?: string;
  description_color?: string;
  button_text_color?: string;
  button_bg_color?: string;
  secondary_button_text_color?: string;
  secondary_button_bg_color?: string;
  secondary_button_border_color?: string;
  overlay_color?: string;
  overlay_opacity?: number; // 0 to 100
  desktop_image_position?: string;
  mobile_image_position?: string;
  text_align?: "left" | "center" | "right";
  content_horizontal_position?: "left" | "center" | "right";
  content_vertical_position?: "top" | "center" | "bottom";
  content_max_width?: "500px" | "520px" | "570px" | "620px" | "680px" | "700px" | "720px" | "760px" | "820px" | "full";
  desktop_heading_size?: string;
  tablet_heading_size?: string;
  mobile_heading_size?: string;
  font_family?: string;
  font_weight?: string;
  line_height?: string;
  letter_spacing?: string;
  banner_size_ratio?: "1080x1080" | "860x270" | "1920x850" | "1080x1440" | "default";
  bannerSizeRatio?: "1080x1080" | "860x270" | "1920x850" | "1080x1440" | "default";

  // Full-width Admin Banner Controls
  banner_bg_color?: string;
  bg_color?: string;
  desktop_banner_height?: string;
  mobile_banner_height?: string;
  image_fit_mode?: "contain" | "cover";
  banner_layout?: "split" | "full_image" | "auto";
  description_size?: string;
  autoplay_duration?: number;
}

export interface ProductBanner {
  id: string;
  tag: string;
  title: string;
  title_highlight: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_link: string;
  gradient: string;
  accent_color: string;
  float_image: string;
  sort_order: number;
  active: boolean;
}

export type BannerStatus = "draft" | "scheduled" | "active" | "paused" | "expired" | "archived";
export type BannerPlacement = 
  | "homepage_hero"
  | "homepage_below_header"
  | "homepage_after_categories"
  | "homepage_above_bestsellers"
  | "homepage_above_new_arrivals"
  | "homepage_before_testimonials"
  | "shop_top"
  | "category_top"
  | "product_page"
  | "cart_page"
  | "checkout_notice"
  | "announcement_bar"
  | "popup_campaign";

export interface OfferBanner {
  id: string;
  internalName: string;
  headline: string;
  highlightText?: string;
  description?: string;
  promoLabel?: string;
  badgeText?: string;
  couponCode?: string;
  termsText?: string;
  
  primaryCtaText?: string;
  primaryCtaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  linkType?: "internal" | "product" | "category" | "brand" | "offer" | "custom" | "whatsapp";
  openInNewTab?: boolean;
  
  desktopImage?: string;
  tabletImage?: string;
  mobileImage?: string;
  videoUrl?: string;
  posterImage?: string;
  altText?: string;
  overlayOpacity?: number;
  
  textAlign?: "left" | "center" | "right";
  contentPosition?: "top_left" | "center_left" | "bottom_left" | "center" | "top_right" | "center_right" | "bottom_right";
  textColor?: string;
  stylePreset?: "premium_dark" | "clean_light" | "product_focus" | "flash_sale" | "festival_offer" | "minimal_promo" | "new_arrival";
  backgroundColor?: string;
  overlayColor?: string;
  
  placement: BannerPlacement;
  sort_order?: number;
  status: BannerStatus;
  
  startAt?: string;
  endAt?: string;
  publishImmediately?: boolean;
  noExpiry?: boolean;
  
  targetDevice?: "all" | "desktop" | "mobile" | "tablet";
  targetAudience?: "all" | "logged_in" | "guest";
  
  countdownEnabled?: boolean;
  countdownEndAt?: string;
  countdownLabel?: string;
  countdownExpiredMsg?: string;
  
  contentMode?: "image_only" | "overlay" | "split";
  imageFit?: "cover" | "contain";
  imagePosition?: "center" | "top" | "bottom" | "left" | "right";
  entireBannerClickable?: boolean;
  enableCta?: boolean;
  cornerRadius?: number;
  bannerHeightDesktop?: number;
  bannerSizeRatio?: "default" | "1080x1080" | "860x270" | "1920x850" | "1080x1440";
  banner_size_ratio?: "default" | "1080x1080" | "860x270" | "1920x850" | "1080x1440";
  bannerSizeRatioMobile?: "default" | "1080x1080" | "860x270" | "1920x850" | "1080x1440";
  banner_size_ratio_mobile?: "default" | "1080x1080" | "860x270" | "1920x850" | "1080x1440";
  sectionSpacing?: number;

  additionalImages?: string[];
  textAnimationMode?: "pulse" | "marquee" | "glow" | "bounce" | "fade" | "none";
  showAnnouncementTicker?: boolean;
  announcementText?: string;

  created_at?: string;
  updated_at?: string;
}


export interface Order {
  id: string;
  product_name: string;
  price: number;
  storage: string;
  color: string;
  customer_name: string;
  customer_phone: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
}

export interface SiteSettings {
  store_name: string;
  tagline?: string;
  phone: string;
  secondary_phone?: string;
  whatsapp: string;
  address: string;
  city?: string;
  email: string;
  google_maps_link: string;
  google_maps_embed: string;
  logo_url: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube?: string;
  business_hours: {
    weekdays: string;
    saturday: string;
    sunday: string;
    online_support?: string;
    holiday_note?: string;
  };
}

export interface UiSettings {
  snowEffectEnabled?: boolean;
  showFeaturedProducts?: boolean;
}

export interface NewArrivalsSettings {
  mode: "automatic" | "custom";
  display_count: number;
  custom_product_ids: string[];
  enabled?: boolean;
  section_title?: string;
  section_subtitle?: string;
}

export interface FooterLink {
  id: string;
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface FooterSettings {
  enabled: boolean;
  logo_url: string;
  logo_size?: "small" | "medium" | "large";
  description: string;
  shop_links: FooterLink[];
  help_links: FooterLink[];
  instagram_url: string;
  instagram_enabled: boolean;
  tiktok_url: string;
  tiktok_enabled: boolean;
  facebook_url: string;
  facebook_enabled: boolean;
  whatsapp_url?: string;
  whatsapp_enabled?: boolean;
  copyright_text: string;
  policy_links: FooterLink[];
  developer_credit_text: string;
  developer_credit_url: string;
}

export interface MotionSettings {
  enableSmoothScroll: boolean;
  enableSectionReveals: boolean;
  motionIntensity: "minimal" | "balanced" | "off" | "standard";
  enableHeroParallax: boolean;
}

export interface Service {
  icon: string;
  title: string;
  description: string;
}

export interface StoreFeature {
  icon: string;
  label: string;
}

// ==========================================
// ERP MODULES (Phase 1)
// ==========================================

export type RepairStatus = 
  | "Pending" 
  | "Checking" 
  | "Waiting Parts" 
  | "Repairing" 
  | "Quality Check" 
  | "Ready" 
  | "Delivered" 
  | "Cancelled";

export interface RepairJob {
  id: string;
  jobId: string; // Auto-generated e.g. REP-1001
  customerName: string;
  phone: string;
  deviceImei: string;
  brand: string;
  model: string;
  problem: string;
  technician: string;
  cost: number;
  advance: number;
  balance: number;
  warranty: string;
  estimatedDelivery: string;
  notes: string;
  status: RepairStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  productsSupplied: string[];
  outstandingBalance: number;
  rating: number;
  createdAt: string;
}

export interface CashFlowTransaction {
  id: string;
  type: "income" | "expense";
  category: "Salary" | "Rent" | "Electricity" | "Transport" | "Marketing" | "Sales" | "Repairs" | "Other";
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

// ==========================================
// ANNOUNCEMENT TICKER
// ==========================================

export interface TickerMessage {
  id: string;
  text: string;
  icon?: string; // lucide icon name
  active: boolean;
  sort_order: number;
}

export interface TickerSettings {
  enabled: boolean;
  messages: TickerMessage[];
  text_color: string;
  bg_color: string;
  speed: "slow" | "normal" | "fast";
  direction: "rtl" | "ltr";
  pause_on_hover: boolean;
  updated_at?: string;
}

// ==========================================
// VISUAL PRODUCT SHOWCASE (FEATURED FULL-WIDTH SHOWCASE)
// ==========================================

export interface VisualShowcaseSlide {
  id: string;
  enabled: boolean;
  eyebrow?: string;           // Optional badge/tag e.g. "NEW", "SPECIAL OFFER"
  eyebrow_bg?: string;        // Badge background color e.g. "#000000" or "#ED0712"
  eyebrow_color?: string;     // Badge text color e.g. "#FFFFFF"
  title?: string;             // Optional: e.g. "iPhone 17 Pro Max" (leave blank for clean image-only banner)
  subtitle?: string;          // Optional: e.g. "Power. Precision. Pro."
  desktop_image?: string;     // Transparent high-res PNG or WebP foreground image (optional when using full bg banner)
  mobile_image?: string;      // Optional mobile-specific foreground image
  image_alt?: string;
  bg_type?: "color" | "gradient" | "image";
  bg_color?: string;          // e.g. "#FFFFFF" or "#F5F5F7"
  bg_gradient_from?: string;  // e.g. "#F0F5FA"
  bg_gradient_to?: string;    // e.g. "#FFFFFF"
  bg_image?: string;          // Full background image URL for desktop
  bg_image_mobile?: string;   // Full background image URL for mobile (falls back to desktop)
  bg_overlay_opacity?: number;// 0 to 100 (% darkness/tint)
  bg_overlay_color?: string;  // e.g. "#000000" or "#FFFFFF"
  text_align?: "left" | "center" | "right";
  content_position?: "top" | "center" | "bottom";
  heading_color?: string;     // Default "#1D1D1F" or custom e.g. "#FFFFFF"
  subtitle_color?: string;    // Default "#6E6E73" or custom e.g. "#E5E5E5"
  primary_cta_text?: string;  // Optional: e.g. "Explore"
  primary_cta_url?: string;   // Optional: e.g. "/products/iphone-16-pro-max"
  secondary_cta_text?: string;// Optional: e.g. "Buy Now"
  secondary_cta_url?: string; // Optional: e.g. "/products/iphone-16-pro-max"
  show_secondary_cta?: boolean;
  order?: number;
  placement?: ShowcasePlacement; // Per-slide placement position on homepage
  product_line?: number;         // Custom line/row number in product catalogue (e.g. 2, 5, etc.)
  enable_animation?: boolean;    // Toggle floating image animation on/off
  banner_size_ratio?: "default" | "1080x1080" | "860x270" | "1920x850" | "1080x1440" | "1024x387" | "widescreen";
  banner_size_ratio_mobile?: "default" | "1080x1080" | "860x270" | "1920x850" | "1080x1440" | "1024x387" | "widescreen";
  product_id?: string;
  category_id?: string;
}

export interface ShowcaseTile {
  id: string;
  title: string;
  subtitle: string;
  bg_color: string;
  text_theme: "dark" | "light";
  image_url: string;
  image_alt?: string;
  primary_button_text: string;
  primary_button_url: string;
  show_secondary_button?: boolean;
  secondary_button_text?: string;
  secondary_button_url?: string;
  link_type?: "product" | "category" | "custom";
  product_id?: string;
  category_id?: string;
}

export type ShowcasePlacement =
  | "below_category"
  | "above_brand"
  | "below_brand"
  | "below_hero"
  | "below_new_arrivals"
  | "below_featured_phones"
  | "below_featured_accessories"
  | "above_why_choose"
  | "below_why_choose"
  | "below_gallery"
  | "below_reviews"
  | "above_location"
  // ── Product Catalogue Placements (Line/Row Based) ──
  | "below_product_line_1"
  | "below_product_line_2"
  | "below_product_line_3"
  | "below_product_line_4"
  | "below_product_line_5"
  | "below_product_line_6"
  | "below_product_line_8"
  | "below_product_line_10"
  | "custom_product_line";

export interface VisualShowcaseSettings {
  enabled: boolean;
  section_title?: string;
  auto_slide?: boolean;
  slide_interval?: number; // duration in ms, default 6000 (6s)
  placement?: ShowcasePlacement; // Position on homepage
  enable_animation?: boolean;    // Global toggle for floating image animation
  slides?: VisualShowcaseSlide[];
  tiles?: ShowcaseTile[]; // fallback for older 2x2 grid data
  updated_at?: string;
}

// ===== 1Place AI Shopping Assistant Types =====
export type AssistantLanguage = "en" | "ta" | "si";

export type AssistantMessageType =
  | "text"
  | "product_list"
  | "comparison"
  | "order_status"
  | "contact_info"
  | "human_handoff"
  | "quick_actions"
  | "repairs";

export interface AssistantAction {
  label: string;
  action: string;
  payload?: Record<string, unknown> | string | number | boolean | null;
  icon?: string;
}

export interface AssistantProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
  old_price?: number | null;
  image: string;
  storage?: string;
  color?: string;
  colors?: string[];
  storage_options?: string[];
  specifications?: Record<string, string>;
  keySpecs?: string[];
  brand_name?: string;
  warranty?: string;
  stock_status?: string;
  category_name?: string;
  installment_price?: string;
}

export interface AssistantMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  language?: AssistantLanguage;
  type?: AssistantMessageType;
  products?: AssistantProductSummary[];
  comparisonProducts?: AssistantProductSummary[];
  orderData?: {
    id: string;
    customerName: string;
    paymentStatus: string;
    orderStatus: string;
    deliveryOption?: string;
    estimatedDelivery?: string;
    finalTotal: number;
    items: {
      name: string;
      quantity: number;
      price: number;
      image?: string;
    }[];
  };
  actions?: AssistantAction[];
}

export interface AssistantFAQ {
  id: string;
  category: "products" | "repairs" | "orders" | "warranty" | "payment" | "store";
  question_en: string;
  answer_en: string;
  question_ta?: string;
  answer_ta?: string;
  question_si?: string;
  answer_si?: string;
  order?: number;
  created_at?: string;
}

export interface AssistantSettings {
  enabled: boolean;
  assistant_name: string;
  assistant_subtitle: string;
  avatar_url?: string;
  tooltip_text?: string;
  welcome_message_en?: string;
  welcome_message_ta?: string;
  welcome_message_si?: string;
  supported_languages?: AssistantLanguage[];
  business_hours?: string;
  offline_message?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  rate_limit_per_minute?: number;
  retention_days?: number;
  updated_at?: string;
}

export interface AssistantConversation {
  id: string;
  sessionId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  language: AssistantLanguage;
  messages: AssistantMessage[];
  status: "active" | "resolved" | "handed_off" | "blocked";
  notes?: string;
  rating?: number; // 1-5 satisfaction score
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════
// FEATURED COLLECTIONS (Homepage 2-Column Editorial Grid)
// ══════════════════════════════════════════════════════════════════════════
export interface FeaturedCollectionCard {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primary_cta_text?: string;
  primary_cta_url?: string;
  secondary_cta_text?: string;
  secondary_cta_url?: string;
  desktop_image_url: string;
  mobile_image_url?: string;
  image_alt?: string;
  image_layout?: "full_card" | "split";
  image_fit?: "contain" | "cover";
  focal_position?: "center" | "top" | "bottom" | "left" | "right" | "top left" | "top right" | "bottom left" | "bottom right" | "custom" | string;
  custom_focal_position?: string;
  theme?: "light" | "dark";
  bg_color?: string; // e.g. #F5F5F7, #000000, #FFFFFF
  text_color?: "auto" | "black" | "white" | "light" | "dark" | string;
  text_align?: "left" | "center" | "right";
  content_position?: "top" | "center" | "bottom";
  overlay_enabled?: boolean;
  overlay_strength?: number; // 0 to 25%
  link_type?: "product" | "category" | "brand" | "custom" | "none";
  link_destination?: string;
  card_link_url?: string;
  open_in_new_tab?: boolean;
  start_date?: string;
  expiry_date?: string;
  active: boolean;
  sort_order: number;
}

export interface FeaturedCollectionsSettings {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  cards: FeaturedCollectionCard[];
}

// ===== Today's Deal Promotional Banner Settings =====
export type TodayDealStatus = "draft" | "scheduled" | "live" | "expired";
export type TodayDealFocalPosition = "left" | "center" | "right";
export type TodayDealBoxPosition = "left" | "center" | "right";
export type TodayDealVerticalAlignment = "top" | "center" | "bottom";
export type TodayDealContentAlignment = "left" | "center" | "right";
export type TodayDealMobileLayout = "overlay" | "stacked";
export type TodayDealExpiryAction = "hide" | "deal-ended" | "replacement-cta" | "keep-banner";

export interface TodayDealSettings {
  enabled: boolean;
  status?: TodayDealStatus;

  eyebrow: string;
  heading: string;
  description: string;

  desktopImageUrl: string;
  mobileImageUrl?: string;
  imageAlt: string;
  desktopFocalPosition: TodayDealFocalPosition;
  mobileFocalPosition: TodayDealFocalPosition;

  bannerUrl?: string;
  ctaEnabled: boolean;
  ctaLabel: string;
  ctaUrl: string;
  openInNewTab?: boolean;
  boxPosition: TodayDealBoxPosition;
  verticalAlignment: TodayDealVerticalAlignment;
  contentAlignment: TodayDealContentAlignment;
  mobileLayout: TodayDealMobileLayout;

  boxBackgroundColor: string;
  boxBackgroundOpacity: number;
  headingColor: string;
  descriptionColor: string;
  eyebrowColor: string;
  accentColor: string;
  ctaBackgroundColor: string;
  ctaTextColor: string;
  countdownBackgroundColor: string;
  countdownTextColor: string;
  imageOverlayOpacity: number;
  boxWidth: number;
  boxPadding: number;
  borderRadius: number;
  bannerSizeRatio?: "default" | "1080x1080" | "860x270" | "1920x850" | "1080x1440";

  bannerMode?: "full_image" | "custom_bg_with_square_image";
  bannerBgType?: "solid" | "gradient";
  bannerBgColor?: string;
  bannerBgGradientFrom?: string;
  bannerBgGradientTo?: string;
  squareImageUrl?: string;
  squareImageAlt?: string;
  squareImagePosition?: "left" | "center" | "right";
  squareImageSize?: number;
  squareImageBorderRadius?: number;
  squareImageShadow?: boolean;

  countdownEnabled: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone: string;
  showDays: boolean;
  expiryAction: TodayDealExpiryAction;
  replacementCtaLabel?: string;
  replacementCtaUrl?: string;
  imageFit?: "cover" | "contain" | "fill";
  cardPadding?: "none" | "compact" | "normal" | "spacious";
  frameHeight?: number;
  frameBorderRadius?: number;
  imageScale?: number;
  backgroundBannerEnabled?: boolean;
  backgroundBannerUrl?: string;
  backgroundBannerOverlayOpacity?: number;
  backgroundBannerBorderRadius?: number;

  updatedAt?: string;
  updatedBy?: string;
}

export type CouponDiscountType = "percentage" | "fixed" | "free_shipping";

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number;
  status: "active" | "disabled";
  targetAudience?: "all" | "logged_in";
  startAt?: string;
  endAt?: string;
  noExpiry?: boolean;
  usageLimit?: number;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppCampaign {
  id?: string; // or campaignId
  campaignId?: string;
  name: string;
  productId: string;
  productName?: string;
  productImage?: string;
  recipientIds: string[];
  messageTemplate: string;
  trackingUrl: string;
  status: "draft" | "scheduled" | "active" | "completed" | "failed";
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  clickCount: number;
  createdAt?: string;
  scheduledAt?: string | null;
}

export type SpinRewardType = "gift" | "free_shipping" | "discount";

export interface SpinSegment {
  id: string;
  label: string;
  subLabel?: string;
  type: SpinRewardType;
  color: string;
  textColor: string;
  icon?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  discountPercent?: number;
  discountAmount?: number;
  probability: number;
  inventory: number;
  claimedCount?: number;
}

export interface SpinPromotionSettings {
  enabled: boolean;
  popupEnabled: boolean;
  heading: string;
  badgeText: string;
  description: string;
  minOrderAmount: number;
  maxSpinsPerCustomer: number;
  rewardExpiryDays: number;
  termsAndConditions: string;
  desktopBannerUrl?: string;
  mobileBannerUrl?: string;
  segments: SpinSegment[];
  updatedAt?: string;
}

export interface SpinReward {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  rewardType: SpinRewardType;
  segmentId: string;
  segmentLabel: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  discountPercent?: number;
  discountAmount?: number;
  status: "issued" | "redeemed" | "expired";
  issuedAt: string;
  expiresAt: string;
  redeemedAt?: string;
  orderId?: string;
}

