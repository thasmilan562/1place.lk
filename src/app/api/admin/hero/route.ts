import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalHeroSlides, saveLocalHeroSlide, deleteLocalHeroSlide } from "@/lib/hero-store";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { HeroSlide } from "@/lib/types";

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

// GET /api/admin/hero
export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    let slides: HeroSlide[] = [];
    try {
      const db = getAdminDb();
      const snap = await db.collection("hero_slides").get();
      if (!snap.empty) {
        slides = snap.docs.map((d) => ({ ...(d.data() as HeroSlide), id: d.id }));
      }
    } catch (e) {
      console.warn("[Admin API Hero] Firestore read warning:", e);
    }

    if (!slides || slides.length === 0) {
      slides = getLocalHeroSlides();
    }

    // Sort by sort_order
    slides.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return NextResponse.json({ success: true, slides }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Hero GET] Error:", err);
    return NextResponse.json({ success: true, slides: getLocalHeroSlides() }, { headers: NO_CACHE_HEADERS });
  }
}

// POST /api/admin/hero (Create or Update hero slide)
export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const body = await req.json();
    const slideData: Partial<HeroSlide> = body.slide || body;

    const slideId = slideData.id || `hero-${Date.now()}`;
    const payload: HeroSlide = {
      ...slideData,
      id: slideId,
      image_url: slideData.image_url || slideData.desktop_image_url || "/hero-slide-1.png",
      desktop_image_url: slideData.desktop_image_url || slideData.image_url || "/hero-slide-1.png",
      mobile_image_url: slideData.mobile_image_url || slideData.desktop_image_url || slideData.image_url || "/hero-slide-1.png",
      active: slideData.active !== false,
      sort_order: typeof slideData.sort_order === "number" ? slideData.sort_order : 1,
    } as HeroSlide;

    // 1. Save to local JSON store
    saveLocalHeroSlide(payload);

    // 2. Save to Firestore via Admin SDK
    try {
      const db = getAdminDb();
      await db.collection("hero_slides").doc(slideId).set(sanitize(payload), { merge: true });
    } catch (dbErr) {
      console.warn("[Admin API Hero POST] Firestore write warning (local copy preserved):", dbErr);
    }

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({ success: true, slide: payload }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Hero POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save hero slide" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// PUT /api/admin/hero (Toggle status or update fields)
export async function PUT(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const body = await req.json();
    const { id, active, ...rest } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Hero slide id is required" }, { status: 400 });
    }

    const updates: Partial<HeroSlide> = { id, ...(active !== undefined ? { active } : {}), ...rest };
    const saved = saveLocalHeroSlide(updates);

    try {
      const db = getAdminDb();
      await db.collection("hero_slides").doc(id).set(sanitize(updates), { merge: true });
    } catch (dbErr) {
      console.warn("[Admin API Hero PUT] Firestore update warning:", dbErr);
    }

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({ success: true, slide: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Hero PUT] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update hero slide" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE /api/admin/hero?id=...
export async function DELETE(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Hero slide id is required" }, { status: 400 });
    }

    // 1. Delete from local JSON store
    deleteLocalHeroSlide(id);

    // 2. Delete from Firestore via Admin SDK
    try {
      const db = getAdminDb();
      await db.collection("hero_slides").doc(id).delete();
    } catch (dbErr) {
      console.warn("[Admin API Hero DELETE] Firestore delete warning:", dbErr);
    }

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({ success: true, message: "Hero slide deleted successfully" }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Hero DELETE] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete hero slide" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

