import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalOfferBanners, saveLocalOfferBanner, deleteLocalOfferBanner } from "@/lib/banners-store";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { OfferBanner } from "@/lib/types";

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

function sanitize(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitize(item));
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = sanitize(val);
    }
  }
  return cleaned;
}

// GET /api/admin/banners
export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    let banners: OfferBanner[] = [];
    try {
      const db = getAdminDb();
      const snap = await db.collection("offer_banners").get();
      if (!snap.empty) {
        banners = snap.docs.map((d) => ({ ...(d.data() as OfferBanner), id: d.id }));
      }
    } catch (e) {
      console.warn("[Admin API Banners] Firestore read warning:", e);
    }

    if (!banners || banners.length === 0) {
      banners = getLocalOfferBanners();
    }

    return NextResponse.json({ success: true, banners }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Banners GET] Error:", err);
    return NextResponse.json({ success: true, banners: getLocalOfferBanners() }, { headers: NO_CACHE_HEADERS });
  }
}

// POST /api/admin/banners
export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const body = await req.json();
    const bannerData: Partial<OfferBanner> = body.banner || body;

    const bannerId = bannerData.id || `banner-${Date.now()}`;
    const payload: OfferBanner = {
      ...bannerData,
      id: bannerId,
      status: bannerData.status || "active",
      placement: bannerData.placement || "homepage_hero",
    } as OfferBanner;

    saveLocalOfferBanner(payload);

    try {
      const db = getAdminDb();
      await db.collection("offer_banners").doc(bannerId).set(sanitize(payload), { merge: true });
    } catch (dbErr) {
      console.warn("[Admin API Banners POST] Firestore write warning:", dbErr);
    }

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({ success: true, banner: payload }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Banners POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save offer banner" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// PUT /api/admin/banners
export async function PUT(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const body = await req.json();
    const { id, status, ...rest } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Banner id is required" }, { status: 400 });
    }

    const updates: Partial<OfferBanner> = { id, ...(status !== undefined ? { status } : {}), ...rest };
    const saved = saveLocalOfferBanner(updates);

    try {
      const db = getAdminDb();
      await db.collection("offer_banners").doc(id).set(sanitize(updates), { merge: true });
    } catch (dbErr) {
      console.warn("[Admin API Banners PUT] Firestore update warning:", dbErr);
    }

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({ success: true, banner: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Banners PUT] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update offer banner" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE /api/admin/banners?id=...
export async function DELETE(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Banner id is required" }, { status: 400 });
    }

    deleteLocalOfferBanner(id);

    try {
      const db = getAdminDb();
      await db.collection("offer_banners").doc(id).delete();
    } catch (dbErr) {
      console.warn("[Admin API Banners DELETE] Firestore delete warning:", dbErr);
    }

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({ success: true, message: "Banner deleted successfully" }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Banners DELETE] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete banner" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
