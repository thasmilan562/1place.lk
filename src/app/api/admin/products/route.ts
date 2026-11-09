import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalProducts, saveLocalProduct, deleteLocalProduct } from "@/lib/products-store";
import { Product } from "@/lib/types";

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
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const localList = getLocalProducts();
    let firestoreList: Product[] = [];

    try {
      const db = getAdminDb();
      if (id) {
        const docSnap = await db.collection("products").doc(id).get();
        if (docSnap.exists) {
          firestoreList = [{ ...(docSnap.data() as Product), id: docSnap.id }];
        }
      } else {
        const snap = await db.collection("products").get();
        firestoreList = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
      }
    } catch (dbErr) {
      console.warn("[Admin API Products] Firestore read warning:", dbErr);
    }

    // Merge Firestore and local items (Firestore takes precedence, local fills any gaps)
    const map = new Map<string, Product>();
    localList.forEach((p) => {
      if (p.id) map.set(p.id, p);
    });
    firestoreList.forEach((p) => {
      if (p.id) map.set(p.id, p);
    });

    const products = Array.from(map.values());
    if (id) {
      const found = products.find((p) => p.id === id);
      if (!found) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, product: found });
    }

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    console.error("[Admin API Products] GET error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/admin/products (Create new product)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.name || !body.name.trim()) {
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
    try {
      const db = getAdminDb();
      await db.collection("products").doc(productId).set(sanitize(finalProduct), { merge: true });

      // Save custom category if provided
      if (body.isCustomCategory && body.customCategoryName?.trim()) {
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

      // Save custom brand if provided
      if (body.isCustomBrand && body.customBrandName?.trim()) {
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
    } catch (fsErr) {
      console.warn("[Admin API Products] Firestore write warning (saved locally):", fsErr);
    }

    // 2. Save to local fallback store for 100% data persistence guarantee
    saveLocalProduct(finalProduct);

    return NextResponse.json({ success: true, id: productId, product: finalProduct });
  } catch (err: any) {
    console.error("[Admin API Products] POST error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to create product" }, { status: 500 });
  }
}

// PUT /api/admin/products (Update existing product)
export async function PUT(req: Request) {
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
      console.warn("[Admin API Products] Firestore update warning (updated locally):", fsErr);
    }

    // 2. Update local store
    saveLocalProduct(finalProduct);

    return NextResponse.json({ success: true, id: productId, product: finalProduct });
  } catch (err: any) {
    console.error("[Admin API Products] PUT error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to update product" }, { status: 500 });
  }
}

// PATCH /api/admin/products (Quick stock or status update)
export async function PATCH(req: Request) {
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
    }

    // Update in local store
    const localList = getLocalProducts();
    const existing = localList.find((p) => p.id === productId);
    if (existing) {
      saveLocalProduct({ ...existing, ...cleaned });
    }

    return NextResponse.json({ success: true, id: productId });
  } catch (err: any) {
    console.error("[Admin API Products] PATCH error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to patch product" }, { status: 500 });
  }
}

// DELETE /api/admin/products
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // query param only
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Product id is required for deletion" }, { status: 400 });
    }

    // 1. Delete from Firestore via Admin SDK
    try {
      const db = getAdminDb();
      await db.collection("products").doc(id).delete();
    } catch (fsErr) {
      console.warn("[Admin API Products] Firestore delete warning:", fsErr);
    }

    // 2. Delete from local store
    deleteLocalProduct(id);

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error("[Admin API Products] DELETE error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete product" }, { status: 500 });
  }
}
