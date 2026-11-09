import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalProducts, saveLocalProduct, deleteLocalProduct } from "@/lib/products-store";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { clearDataCache } from "@/lib/data-cache";
import { Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized access to administrator API." }, { status: 401 });
}

function persistenceUnavailable() {
  return NextResponse.json({ success: false, error: "Firebase Admin database connection is unavailable. Configure FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON in production; no changes were saved." }, { status: 503 });
}

function sanitize(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = sanitize(val);
    }
  }
  return cleaned;
}

// GET /api/admin/products
export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    let products: Product[];

    try {
      const db = getAdminDb();
      if (id) {
        const docSnap = await db.collection("products").doc(id).get();
        products = docSnap.exists ? [{ ...(docSnap.data() as Product), id: docSnap.id }] : [];
      } else {
        const snap = await db.collection("products").get();
        products = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
      }
    } catch (dbErr) {
      console.warn("[Admin API Products] Firestore read warning:", dbErr);
      if (process.env.NODE_ENV === "production") return persistenceUnavailable();
      const localList = getLocalProducts();
      products = id ? localList.filter((p) => p.id === id) : localList;
    }

    if (id) {
      const found = products.find((p) => p.id === id);
      if (!found) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, product: found }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, products }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Products] GET error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch products" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST /api/admin/products (Create new product)
export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const body = await req.json();
    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Product name is required" }, { status: 400 });
    }

    const cleaned = sanitize(body);
    const productId = cleaned.id && cleaned.id.trim() 
      ? cleaned.id.trim() 
      : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const finalProduct: Product = {
      ...cleaned,
      id: productId,
      created_at: cleaned.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to Firestore via Admin SDK
    let db: ReturnType<typeof getAdminDb> | null = null;
    try {
      db = getAdminDb();
      await db.collection("products").doc(productId).set(sanitize(finalProduct), { merge: true });
    } catch (fsErr) {
      console.warn("[Admin API Products] Firestore write warning:", fsErr);
      if (process.env.NODE_ENV === "production") return persistenceUnavailable();
    }

    // 2. ALWAYS save to local fallback store for guaranteed persistence
    saveLocalProduct(finalProduct);

    // Optional custom catalog metadata must not turn a successfully saved product into a false failure.
    try {
      if (db && body.isCustomCategory && typeof body.customCategoryName === "string" && body.customCategoryName.trim()) {
        const catSlug = body.customCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await db.collection("categories").doc(`cat-${catSlug}`).set({
          id: `cat-${catSlug}`,
          name: body.customCategoryName.trim(),
          slug: catSlug,
          icon: "📱",
          image_url: "",
          sort_order: 99,
          status: "active",
          show_on_homepage: true,
          show_in_selector: true,
          group: "product_categories",
        }, { merge: true });
      }
      if (db && body.isCustomBrand && typeof body.customBrandName === "string" && body.customBrandName.trim()) {
        const bSlug = body.customBrandName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await db.collection("brands").doc(`brand-${bSlug}`).set({
          id: `brand-${bSlug}`,
          name: body.customBrandName.trim(),
          slug: bSlug,
          logo_url: "",
          sort_order: 99,
          status: "active",
          show_on_homepage: true,
        }, { merge: true });
      }
    } catch (metadataErr) {
      console.warn("[Admin API Products] Product saved, but optional category/brand metadata failed:", metadataErr);
    }

    // Invalidate cache and trigger path revalidation
    clearDataCache("products");
    try {
      revalidatePath("/products");
      revalidatePath("/admin/dashboard");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true, id: productId, product: finalProduct }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Products] POST error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to create product" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// PUT /api/admin/products (Update existing product)
export async function PUT(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const body = await req.json();
    if (!body || !body.id) {
      return NextResponse.json({ success: false, error: "Product id is required for updates" }, { status: 400 });
    }

    const productId = body.id;
    const cleaned = sanitize(body);
    const finalProduct: Product = {
      ...cleaned,
      id: productId,
      updatedAt: new Date().toISOString(),
    };

    // 1. Update in Firestore via Admin SDK
    try {
      const db = getAdminDb();
      await db.collection("products").doc(productId).set(sanitize(finalProduct), { merge: true });
    } catch (fsErr) {
      console.warn("[Admin API Products] Firestore update warning:", fsErr);
      if (process.env.NODE_ENV === "production") return persistenceUnavailable();
    }

    // 2. ALWAYS save to local fallback store
    saveLocalProduct(finalProduct);

    // Invalidate cache and trigger path revalidation
    clearDataCache("products");
    try {
      revalidatePath("/products");
      revalidatePath("/admin/dashboard");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true, id: productId, product: finalProduct }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Products] PUT error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to update product" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// PATCH /api/admin/products (Quick stock or status update)
export async function PATCH(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const body = await req.json();
    if (!body || !body.id) {
      return NextResponse.json({ success: false, error: "Product id is required" }, { status: 400 });
    }

    const productId = body.id;
    const cleaned = sanitize(body);

    try {
      const db = getAdminDb();
      await db.collection("products").doc(productId).set(cleaned, { merge: true });
    } catch (fsErr) {
      console.warn("[Admin API Products] Firestore patch warning:", fsErr);
      if (process.env.NODE_ENV === "production") return persistenceUnavailable();
      const existing = getLocalProducts().find((p) => p.id === productId);
      if (!existing) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      if (!saveLocalProduct({ ...existing, ...cleaned })) return persistenceUnavailable();
    }

    return NextResponse.json({ success: true, id: productId });
  } catch (err: any) {
    console.error("[Admin API Products] PATCH error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to patch product" }, { status: 500 });
  }
}

// DELETE /api/admin/products
export async function DELETE(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || body?.slug;
      } catch {
        // query param only
      }
    }

    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Product id is required for deletion" }, { status: 400 });
    }

    const cleanId = id.trim();

    // 1. Delete from Firestore via Admin SDK
    try {
      const db = getAdminDb();
      await db.collection("products").doc(cleanId).delete();

      // In case doc ID is different from slug or id property
      const slugQuery = await db.collection("products").where("slug", "==", cleanId).get();
      for (const d of slugQuery.docs) {
        await d.ref.delete();
      }
      const idQuery = await db.collection("products").where("id", "==", cleanId).get();
      for (const d of idQuery.docs) {
        await d.ref.delete();
      }
    } catch (fsErr) {
      console.warn("[Admin API Products] Firestore delete warning:", fsErr);
      if (process.env.NODE_ENV === "production") return persistenceUnavailable();
    }

    // Keep the development fallback in sync so a later Firestore outage cannot
    // make this deleted product reappear. Production reads are Firestore-only.
    const localDeleted = deleteLocalProduct(cleanId);
    if (process.env.NODE_ENV !== "production" && !localDeleted) return persistenceUnavailable();

    // Invalidate caches and trigger Next.js path revalidation
    clearDataCache("products");
    try {
      revalidatePath("/products");
      revalidatePath("/admin/dashboard");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true, id: cleanId }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Products] DELETE error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete product" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
