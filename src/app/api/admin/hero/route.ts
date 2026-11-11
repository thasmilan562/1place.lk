import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { collection, getDocs } from "firebase/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { db as clientDb } from "@/lib/firebase";
import { getLocalHeroSlides, saveLocalHeroSlide, deleteLocalHeroSlide, mergeHeroSlides } from "@/lib/hero-store";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { clearDataCache } from "@/lib/data-cache";
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

// Timeout helper: prevents any remote Firestore gRPC call from stalling the response
function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), ms)),
  ]);
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=2200&auto=format&fit=crop";

async function fetchRemoteHeroSlides(): Promise<HeroSlide[]> {
  try {
    const db = getAdminDb();
    const snap = await withTimeout(db.collection("hero_slides").get(), 1800);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ ...(d.data() as HeroSlide), id: d.id }));
    }
  } catch {
    try {
      const snap = await withTimeout(getDocs(collection(clientDb, "hero_slides")), 1800);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ ...(d.data() as HeroSlide), id: d.id }));
      }
    } catch {
      // Fallback to local slides
    }
  }
  return [];
}

// GET /api/admin/hero
export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const localSlides = getLocalHeroSlides();
    const remoteSlides = await fetchRemoteHeroSlides();
    const slides = remoteSlides.length > 0 ? mergeHeroSlides(localSlides, remoteSlides) : localSlides;
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
      image_url: slideData.image_url || slideData.desktop_image_url || DEFAULT_IMAGE,
      desktop_image_url: slideData.desktop_image_url || slideData.image_url || DEFAULT_IMAGE,
      mobile_image_url: slideData.mobile_image_url || slideData.desktop_image_url || slideData.image_url || DEFAULT_IMAGE,
      active: slideData.active !== false,
      sort_order: typeof slideData.sort_order === "number" ? slideData.sort_order : 1,
      updated_at: new Date().toISOString(),
    } as HeroSlide;

    // 1. ALWAYS save to local/memory store immediately (authoritative truth)
    const saved = saveLocalHeroSlide(payload) || payload;
    clearDataCache("hero_slides");

    // 2. Best-effort async sync to Firestore with 2s timeout
    try {
      const db = getAdminDb();
      await withTimeout(db.collection("hero_slides").doc(slideId).set(sanitize(saved), { merge: true }), 2000);
    } catch (dbErr) {
      console.warn("[Admin API Hero POST] Firestore sync warning (local copy preserved):", dbErr);
    }

    try {
      revalidatePath("/");
      revalidatePath("/admin/dashboard");
    } catch {}

    return NextResponse.json({ success: true, slide: saved }, { headers: NO_CACHE_HEADERS });
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

    const updates: Partial<HeroSlide> = { id, ...(active !== undefined ? { active } : {}), ...rest, updated_at: new Date().toISOString() };
    const saved = saveLocalHeroSlide(updates);
    clearDataCache("hero_slides");

    try {
      const db = getAdminDb();
      await withTimeout(db.collection("hero_slides").doc(id).set(sanitize(saved), { merge: true }), 2000);
    } catch (dbErr) {
      console.warn("[Admin API Hero PUT] Firestore update warning (local copy updated):", dbErr);
    }

    try {
      revalidatePath("/");
      revalidatePath("/admin/dashboard");
    } catch {}

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

    // 1. Delete from local/memory store immediately
    deleteLocalHeroSlide(id);
    clearDataCache("hero_slides");

    // 2. Best-effort delete from Firestore with 2s timeout
    try {
      const db = getAdminDb();
      await withTimeout(db.collection("hero_slides").doc(id).delete(), 2000);
    } catch (dbErr) {
      console.warn("[Admin API Hero DELETE] Firestore delete warning:", dbErr);
    }

    try {
      revalidatePath("/");
      revalidatePath("/admin/dashboard");
    } catch {}

    return NextResponse.json({ success: true, message: "Hero slide deleted successfully" }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API Hero DELETE] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete hero slide" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
