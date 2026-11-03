import { Category } from "./types";
import { isBrandName, cleanCatalogString, STANDARD_CATEGORIES, CATEGORY_ALIASES, resolveCanonicalCategory } from "./catalog-utils";
import { Firestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

/**
 * 3. NORMALIZE CATEGORY NAMES
 * Creates a safe, deterministic normalization:
 * - Strips emojis and decorative Unicode symbols
 * - Normalizes Unicode characters (NFKD)
 * - Trims leading and trailing whitespace
 * - Collapses consecutive whitespace into a single space
 * - Converts to lowercase
 * 
 * Example:
 * "Phone Cases", "phone cases", " Phone Cases ", "PHONE CASES", "Phone   Cases"
 * all normalize to "phone cases".
 */
export function normalizeCategoryName(name?: string | null): string {
  if (!name) return "";
  return cleanCatalogString(String(name))
    .normalize("NFKD")
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu, "")
    .replace(/[📁🏷️📱🔌🎧🔋🛡️📷⌨️🖱️💻⌚🔊🤳💡📶📐🛠️✨⭐🚀❌⚠️]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * 4. USE A UNIQUE SLUG / KEY
 * Generates a deterministic URL-safe unique slug from a category name.
 * 
 * Example:
 * "Phone Cases" -> "phone-cases"
 * "Power Banks" -> "power-banks"
 * "Mobile Accessories" -> "mobile-accessories"
 * "Earbuds & TWS" -> "earbuds-and-tws"
 */
export function generateCategorySlug(name?: string | null): string {
  const norm = normalizeCategoryName(name);
  if (!norm) return "category";

  return norm
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Deterministic Firestore Document ID for categories:
 * categories/{categoryDocId} -> "cat-{categorySlug}"
 */
export function getCategoryDocId(slugOrName: string): string {
  const cleanSlug = generateCategorySlug(slugOrName);
  return cleanSlug.startsWith("cat-") ? cleanSlug : `cat-${cleanSlug}`;
}

/**
 * Clean Human-Readable Category Display Name Formatter:
 * Ensures Title Case while respecting acronyms (TWS, OTG, USB, LED, IPAD, TAB)
 */
export function formatCategoryTitle(rawName?: string | null): string {
  if (!rawName) return "Category";
  const clean = cleanCatalogString(rawName).trim().replace(/\s+/g, " ");
  if (!clean) return "Category";

  // Check against known standard categories first
  const matchedStandard = STANDARD_CATEGORIES.find(
    (sc) => sc.toLowerCase() === clean.toLowerCase()
  );
  if (matchedStandard) return matchedStandard;

  const words = clean.split(" ");
  const formatted = words.map((w) => {
    const wLower = w.toLowerCase();
    if (["otg", "tws", "usb", "led", "anc", "hifi"].includes(wLower)) return w.toUpperCase();
    if (wLower === "&" || wLower === "and") return "&";
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return formatted.join(" ");
}

/**
 * Checks if a candidate category name or slug conflicts with existing categories
 */
export function isCategoryDuplicate(
  candidateName: string,
  candidateSlug: string | undefined,
  existingCategories: Category[],
  currentCategoryId?: string
): { isDuplicate: boolean; matchedCategory?: Category; reason?: string } {
  const normName = normalizeCategoryName(candidateName);
  const targetSlug = candidateSlug ? generateCategorySlug(candidateSlug) : generateCategorySlug(normName);

  if (!normName) {
    return { isDuplicate: false };
  }

  for (const cat of existingCategories) {
    // Skip comparing against self when editing
    if (currentCategoryId && cat.id === currentCategoryId) {
      continue;
    }

    // Skip deleted categories
    if ((cat as any).isDeleted === true || cat.status === "deleted") {
      continue;
    }

    const existingNormName = normalizeCategoryName(cat.name);
    const existingSlug = generateCategorySlug(cat.slug || cat.name);

    if (existingNormName === normName) {
      return {
        isDuplicate: true,
        matchedCategory: cat,
        reason: `Category with name "${cat.name}" already exists.`,
      };
    }

    if (existingSlug === targetSlug) {
      return {
        isDuplicate: true,
        matchedCategory: cat,
        reason: `Category with slug "/${cat.slug}" already exists (${cat.name}).`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Server/Database level duplicate verification to prevent race conditions
 */
export async function checkCategoryExistsInDb(
  db: Firestore,
  candidateName: string,
  candidateSlug?: string,
  currentCategoryId?: string
): Promise<{ exists: boolean; existingDoc?: Category; reason?: string }> {
  const normName = normalizeCategoryName(candidateName);
  const slug = candidateSlug ? generateCategorySlug(candidateSlug) : generateCategorySlug(normName);
  const docId = getCategoryDocId(slug);

  // 1. Check direct doc ID
  if (docId !== currentCategoryId) {
    const snap = await getDoc(doc(db, "categories", docId));
    if (snap.exists()) {
      const data = snap.data() as Category;
      if ((data as any).isDeleted !== true && data.status !== "deleted") {
        return {
          exists: true,
          existingDoc: { ...data, id: snap.id },
          reason: `Category document "${docId}" already exists.`,
        };
      }
    }
  }

  // 2. Check slug equality query
  try {
    const qSlug = query(collection(db, "categories"), where("slug", "==", slug));
    const snapSlug = await getDocs(qSlug);
    for (const d of snapSlug.docs) {
      if (d.id !== currentCategoryId) {
        const data = d.data() as Category;
        if ((data as any).isDeleted !== true && data.status !== "deleted") {
          return {
            exists: true,
            existingDoc: { ...data, id: d.id },
            reason: `Category with slug "/${slug}" already exists.`,
          };
        }
      }
    }
  } catch (err) {
    console.warn("Category slug query check error:", err);
  }

  return { exists: false };
}

/**
 * 10. DEFENSIVE CATEGORY DEDUPLICATION FOR UI
 * Groups category list by normalized slug, filters out brands and deleted categories,
 * and returns exactly one canonical category per unique category.
 */
export function deduplicateCategories(categories: Category[]): Category[] {
  const map = new Map<string, Category>();

  (categories || []).forEach((cat) => {
    if (!cat) return;
    if ((cat as any).isDeleted === true || cat.status === "deleted") return;

    const rawName = cat.name || "";
    const clean = cleanCatalogString(rawName).trim();
    if (!clean) return;

    // Filter out brand documents that might have leaked into categories
    if (isBrandName(clean)) return;

    const normName = normalizeCategoryName(clean);
    const canonical = resolveCanonicalCategory(cat.slug) || resolveCanonicalCategory(clean) || resolveCanonicalCategory(cat.id);
    const slug = canonical ? canonical.canonicalSlug : generateCategorySlug(cat.slug || normName);
    const name = canonical ? canonical.canonicalName : formatCategoryTitle(cat.name);
    const id = canonical ? canonical.canonicalId : (cat.id || getCategoryDocId(slug));
    const key = slug;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...cat,
        id,
        name,
        slug,
      });
    } else {
      // Merge best metadata: keep whichever has richer image, icon, sort order
      const hasImage = Boolean(cat.image_url && cat.image_url.trim());
      const existingHasImage = Boolean(existing.image_url && existing.image_url.trim());

      const chosen = {
        ...existing,
        image_url: existingHasImage ? existing.image_url : (hasImage ? cat.image_url : ""),
        icon: existing.icon || cat.icon || "📱",
        description: existing.description || cat.description || "",
        sort_order: Math.min(existing.sort_order ?? 999, cat.sort_order ?? 999),
        show_on_homepage: existing.show_on_homepage !== false || cat.show_on_homepage !== false,
      };
      map.set(key, chosen);
    }
  });

  return Array.from(map.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}
