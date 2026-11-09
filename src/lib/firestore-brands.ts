import { db } from "./firebase";
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc, query, where } from "firebase/firestore";
import { Brand, Department, DepartmentBrandPageConfig, DepartmentBrandCategoryTab, Product } from "./types";
import { DEFAULT_BRANDS, BRAND_DEFAULT_CAMPAIGN_BANNERS } from "./data";
import { cachedFetch, clearDataCache, CACHE_TTL } from "./data-cache";
import { normalizeImageUrl } from "./utils";

// ── Initial Primary Departments ──
export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: "dept-phones", name: "Phones", slug: "phones", enabled: true, order: 1, description: "Smartphones, feature phones, and mobile devices" },
  { id: "dept-laptops-tablets", name: "Laptop & Tab", slug: "laptops-tablets", enabled: true, order: 2, description: "Laptops, MacBooks, tablets, and iPads" },
  { id: "dept-accessories", name: "Accessories", slug: "accessories", enabled: true, order: 3, description: "Audio, chargers, cables, smart watches, power banks, and protection" },
];

// Helper to determine initial department assignments for default brands
export function getDefaultBrandDepartments(slug: string, productGroup?: string): string[] {
  const s = slug.toLowerCase();
  if (s === "apple") return ["phones", "laptops-tablets", "accessories"];
  if (s === "samsung") return ["phones", "laptops-tablets", "accessories"];
  if (s === "xiaomi" || s === "xiomi" || s === "redmi") return ["phones", "accessories"];
  if (s === "oneplus" || s === "1+") return ["phones", "accessories"];
  if (s === "cmf" || s === "cmf-by-nothing") return ["phones", "accessories"];
  if (s === "google" || s === "google-pixel") return ["phones", "accessories"];
  if (s === "honor" || s === "oppo" || s === "vivo" || s === "realme" || s === "nokia" || s === "hmd" || s === "greentel") return ["phones", "accessories"];
  if (s === "macbook" || s === "asus" || s === "msi" || s === "dell" || s === "lenovo") return ["laptops-tablets"];
  if (["jbl", "sharge", "marshall", "sony", "fitbit", "anker", "bose", "haylou", "soundcore", "ugreen", "baseus", "basesus", "dji", "wiwu", "lenyes", "lenyce", "oraimo", "hoco", "joyroom", "aspor", "porodo", "brodo", "bugani", "green-lion", "greenlion", "hollyland", "plokama", "yesido"].includes(s)) {
    return ["accessories"];
  }
  if (productGroup === "laptops") return ["laptops-tablets"];
  if (productGroup === "accessories" || productGroup === "audio" || productGroup === "other") return ["accessories"];
  return ["phones"];
}

// ── 1. Departments Firestore API ──
export async function getDepartmentsFromDb(): Promise<Department[]> {
  return cachedFetch("departments:all", async () => {
    const deptMap = new Map<string, Department>();
    DEFAULT_DEPARTMENTS.forEach((d) => deptMap.set(d.slug, d));

    try {
      const snap = await getDocs(collection(db, "departments"));
      snap.docs.forEach((d) => {
        const data = d.data() as Department;
        const slug = data.slug || d.id;
        deptMap.set(slug, { ...data, id: d.id, slug });
      });
    } catch (err) {
      console.warn("Error fetching departments from Firestore, using defaults:", err);
    }

    return Array.from(deptMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, CACHE_TTL.BRANDS);
}

export async function saveDepartmentToDb(dept: Partial<Department>): Promise<void> {
  const { db } = await import("./admin-firebase");
  const slug = (dept.slug || dept.name || "department").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const id = dept.id || `dept-${slug}`;
  const docRef = doc(db, "departments", id);
  await setDoc(
    docRef,
    {
      ...dept,
      id,
      slug,
      enabled: dept.enabled !== false,
      order: dept.order || 1,
    },
    { merge: true }
  );
  clearDataCache("departments");
  clearDataCache("brands");
}

// ── 2. Brands Firestore API ──
export async function getBrandsFromDb(): Promise<Brand[]> {
  return cachedFetch("brands:all", async () => {
    const brandMap = new Map<string, Brand>();

    try {
      const snapshot = await getDocs(collection(db, "brands"));
      
      if (!snapshot.empty) {
        // 1. Load exclusively from Firestore when docs exist
        snapshot.docs.forEach((d) => {
          const data = d.data() as Brand;
          if (
            data.isDeleted === true ||
            (data as any).status === "deleted" ||
            !data.name ||
            data.name === "undefined"
          ) {
            return;
          }

          const id = d.id || data.id || `brand-${(data.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          const slug = data.slug || (data.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const nameLower = (data.name || "").toLowerCase().trim();
          const normKey = nameLower || slug.toLowerCase();

          // Check if matching preset exists for logo fallback
          const defaultBrand = DEFAULT_BRANDS.find(
            (b) => b.id === id || b.slug.toLowerCase() === slug.toLowerCase() || b.name.toLowerCase().trim() === nameLower
          );

          const assigned_departments =
            data.assigned_departments && data.assigned_departments.length > 0
              ? data.assigned_departments
              : getDefaultBrandDepartments(slug, data.product_group);

          const rawLogo =
            data.logo_url ||
            (data as any).logo ||
            (data as any).image_url ||
            (data as any).imageUrl ||
            (data as any).icon_url ||
            (data as any).iconUrl ||
            (data as any).image ||
            defaultBrand?.logo_url ||
            "";

          const orderNum = Number(data.sort_order ?? data.order ?? defaultBrand?.sort_order ?? 999);

          // Deduplicate: Keep latest/most complete doc per normalized brand name
          brandMap.set(normKey, {
            ...defaultBrand,
            ...data,
            id,
            slug,
            logo_url: normalizeImageUrl(rawLogo),
            order: orderNum,
            sort_order: orderNum,
            assigned_departments,
            enabled: data.enabled !== false && data.status !== "inactive",
            show_on_homepage: data.show_on_homepage !== false,
          });
        });
      } else {
        // 2. Fallback to default presets only if database is completely empty
        DEFAULT_BRANDS.forEach((b) => {
          const assigned_departments = getDefaultBrandDepartments(b.slug, b.product_group);
          brandMap.set(b.name.toLowerCase().trim(), {
            ...b,
            assigned_departments,
            enabled: b.status !== "inactive",
          });
        });
      }
    } catch (err) {
      console.warn("Error fetching brands from Firestore, using defaults:", err);
      DEFAULT_BRANDS.forEach((b) => {
        const assigned_departments = getDefaultBrandDepartments(b.slug, b.product_group);
        brandMap.set(b.name.toLowerCase().trim(), {
          ...b,
          assigned_departments,
          enabled: b.status !== "inactive",
        });
      });
    }

    const result = Array.from(brandMap.values()).filter(
      (b) => (b as any).isDeleted !== true && b.status !== "deleted"
    );
    return result.sort((a, b) => Number(a.sort_order ?? a.order ?? 999) - Number(b.sort_order ?? b.order ?? 999));
  }, CACHE_TTL.BRANDS);
}

export async function saveBrandToDb(brand: Partial<Brand>): Promise<void> {
  const { db } = await import("./admin-firebase");
  const slug = (brand.slug || brand.name || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const id = brand.id || `brand-${slug}`;
  const docRef = doc(db, "brands", id);
  const assigned_departments =
    brand.assigned_departments && brand.assigned_departments.length > 0
      ? brand.assigned_departments
      : getDefaultBrandDepartments(slug, brand.product_group);

  const orderNum = Number(brand.sort_order ?? brand.order ?? 999);

  const cleanData: Record<string, any> = {
    id,
    name: brand.name?.trim() || "",
    slug,
    logo_url: brand.logo_url || "",
    icon_url: brand.icon_url || "",
    description: brand.description || "",
    assigned_departments,
    enabled: brand.enabled !== false && brand.status !== "inactive",
    status: brand.enabled !== false && brand.status !== "inactive" ? "active" : "inactive",
    show_on_homepage: brand.show_on_homepage !== false,
    featured: Boolean(brand.featured),
    order: orderNum,
    sort_order: orderNum,
    department_order: brand.department_order || brand.department_orders || {},
    seo_title: brand.seo_title || "",
    seo_description: brand.seo_description || "",
    isDeleted: false,
    updated_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, cleanData, { merge: true });
  clearDataCache("brands");
}

export async function deleteBrandFromDb(id: string, brandInfo?: Partial<Brand>): Promise<void> {
  const { db } = await import("./admin-firebase");
  try {
    // Write tombstone in Firestore so brand will NEVER resurrect on reload
    await setDoc(
      doc(db, "brands", id),
      {
        id,
        name: brandInfo?.name || "",
        slug: brandInfo?.slug || (brandInfo?.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || id,
        isDeleted: true,
        status: "deleted",
        enabled: false,
        show_on_homepage: false,
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    clearDataCache("brands");
  } catch (e) {
    console.warn("Error deleting brand from Firestore:", e);
    throw e;
  }
}

// ── 3. Department Brand Page Configs ──
export function generateDefaultDepartmentPageConfig(
  departmentSlug: string,
  brand: Brand
): DepartmentBrandPageConfig {
  const brandName = brand.name || brand.slug.toUpperCase();
  const deptName =
    departmentSlug === "phones"
      ? "Phones"
      : departmentSlug === "laptops-tablets"
      ? "Laptop & Tab"
      : departmentSlug === "accessories"
      ? "Accessories"
      : "Collection";

  // Contextual default headlines
  let productSectionHeading = `${brandName} ${deptName}`;
  let productSectionDescription = `Explore genuine ${brandName} ${deptName.toLowerCase()} models available at 1PLACE.LK.`;
  
  const bSlug = (brand.slug || "").toLowerCase();
  const defaultBannerUrl =
    BRAND_DEFAULT_CAMPAIGN_BANNERS[bSlug]?.[departmentSlug] ||
    BRAND_DEFAULT_CAMPAIGN_BANNERS[bSlug]?.default ||
    BRAND_DEFAULT_CAMPAIGN_BANNERS[bSlug]?.accessories ||
    BRAND_DEFAULT_CAMPAIGN_BANNERS[bSlug]?.phones ||
    "";

  // Category navigation tabs
  const categoryTabs: DepartmentBrandCategoryTab[] = [
    { id: "tab-all", enabled: true, label: `All ${deptName}`, slug: "all", order: 1 },
  ];

  return {
    id: `${departmentSlug}_${brand.slug}`,
    brandId: brand.id,
    brandSlug: brand.slug,
    departmentId: `dept-${departmentSlug}`,
    departmentSlug,
    enabled: true,
    status: "published",

    // Banner-Only Hero
    bannerEnabled: true,
    desktopBannerUrl: normalizeImageUrl(defaultBannerUrl),
    tabletBannerUrl: normalizeImageUrl(defaultBannerUrl),
    mobileBannerUrl: normalizeImageUrl(defaultBannerUrl),
    bannerAlt: `${brandName} ${deptName} Promotional Banner`,
    desktopFocalPosition: "center",
    tabletFocalPosition: "center",
    mobileFocalPosition: "center",
    linkEnabled: false,
    useDefaultBrandBanner: false,

    // Page Content Section
    productSectionHeading,
    productSectionDescription,

    categoryTabs,
    hideEmptyTabs: true,
    relatedSectionEnabled: true,
    relatedSectionHeading: `${brandName} Accessories`,
    relatedDisplayMode: "grid",
    noIndex: false,
  };
}

export async function getDepartmentBrandPageConfig(
  departmentSlug: string,
  brandSlug: string
): Promise<DepartmentBrandPageConfig | null> {
  const docId = `${departmentSlug.toLowerCase()}_${brandSlug.toLowerCase()}`;
  try {
    const docRef = doc(db, "department_brand_pages", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as DepartmentBrandPageConfig;
    }
  } catch (err) {
    console.warn(`Error reading department_brand_pages doc ${docId}:`, err);
  }

  // Fallback to generated default
  const brands = await getBrandsFromDb();
  const brand = brands.find((b) => b.slug.toLowerCase() === brandSlug.toLowerCase());
  if (brand) {
    return generateDefaultDepartmentPageConfig(departmentSlug, brand);
  }
  return null;
}

export async function saveDepartmentBrandPageConfig(
  config: DepartmentBrandPageConfig
): Promise<void> {
  const { db } = await import("./admin-firebase");
  const docId = `${(config.departmentSlug || "phones").toLowerCase()}_${(config.brandSlug || "brand").toLowerCase()}`;
  const docRef = doc(db, "department_brand_pages", docId);
  const cleanConfig = JSON.parse(JSON.stringify(config || {}));
  cleanConfig.id = docId;
  cleanConfig.updatedAt = new Date().toISOString();
  await setDoc(docRef, cleanConfig, { merge: true });
}

// ── 4. Brand Products & Audit Helpers ──
export interface BrandAuditItem {
  brand: Brand;
  assignedDepartments: string[];
  productCount: number;
  hasPhones: boolean;
  hasLaptops: boolean;
  hasAccessories: boolean;
  missingBannerDepartments: string[];
  status: "published" | "draft" | "incomplete";
}

export function auditBrand(
  brand: Brand,
  products: Product[],
  pageConfigs: Map<string, DepartmentBrandPageConfig>
): BrandAuditItem {
  const brandProducts = products.filter((p) => {
    const bSlug = (p.brand_slug || p.brandSlug || p.brand || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const bName = (p.brand_name || p.brandName || p.brand || "").toLowerCase();
    const target = brand.slug.toLowerCase();
    return bSlug === target || bName === target;
  });

  const assigned = brand.assigned_departments || getDefaultBrandDepartments(brand.slug, brand.product_group);
  const missingBanners: string[] = [];

  assigned.forEach((dSlug) => {
    const config = pageConfigs.get(`${dSlug}_${brand.slug}`);
    if (!config || (!config.desktopBannerUrl && !config.useDefaultBanner)) {
      missingBanners.push(dSlug);
    }
  });

  return {
    brand,
    assignedDepartments: assigned,
    productCount: brandProducts.length,
    hasPhones: assigned.includes("phones"),
    hasLaptops: assigned.includes("laptops-tablets"),
    hasAccessories: assigned.includes("accessories"),
    missingBannerDepartments: missingBanners,
    status: brand.status === "active" ? "published" : "draft",
  };
}
