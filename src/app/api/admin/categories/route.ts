import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth-server";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized access to administrator API." }, { status: 401 });
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

// GET /api/admin/categories
export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const db = getAdminDb();
    const snap = await db.collection("categories").get();
    const categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, categories });
  } catch (err: any) {
    console.error("[Admin API Categories] GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST / PUT /api/admin/categories (Create or update category)
export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const body = await req.json();
    if (!body || !body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    }

    const catSlug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const categoryId = body.id || `cat-${catSlug}`;
    const cleaned = sanitize(body);

    const categoryData = {
      ...cleaned,
      id: categoryId,
      slug: catSlug,
      updatedAt: new Date().toISOString(),
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const db = getAdminDb();
    await db.collection("categories").doc(categoryId).set(categoryData, { merge: true });

    return NextResponse.json({ success: true, id: categoryId, category: categoryData });
  } catch (err: any) {
    console.error("[Admin API Categories] POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/categories
export async function DELETE(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection("categories").doc(id).delete();

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error("[Admin API Categories] DELETE error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

