import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalHomeOffers, saveLocalHomeOffers } from "@/lib/home-offers-store";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { HOME_OFFER_DEFAULTS, HomeOfferSettings } from "@/lib/home-offers";

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

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), ms)),
  ]);
}

// GET /api/admin/home-offers
export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    let settings: HomeOfferSettings = getLocalHomeOffers();

    try {
      const db = getAdminDb();
      const snap = await withTimeout(db.collection("settings").doc("home_offers").get(), 1500);
      if (snap.exists) {
        settings = { ...settings, ...(snap.data() as HomeOfferSettings) };
      }
    } catch {
      // Offline / Quota exceeded fallback to local
    }

    return NextResponse.json({ success: true, settings }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API HomeOffers GET] Error:", err);
    return NextResponse.json({ success: true, settings: getLocalHomeOffers() }, { headers: NO_CACHE_HEADERS });
  }
}

// POST /api/admin/home-offers (Save Today's Deal banner)
export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const body = await req.json();
    const rawSettings = body.settings || body;

    const payload: HomeOfferSettings = {
      ...HOME_OFFER_DEFAULTS,
      ...rawSettings,
      updatedAt: new Date().toISOString(),
    };

    // 1. ALWAYS save to local persistent store immediately
    const saved = saveLocalHomeOffers(payload);

    // 2. Best-effort sync to Firestore with timeout guard
    try {
      const db = getAdminDb();
      const clean = sanitize(payload);
      await Promise.allSettled([
        withTimeout(db.collection("settings").doc("home_offers").set(clean, { merge: true }), 2000),
        withTimeout(db.collection("settings").doc("today_deal").set(clean, { merge: true }), 2000),
      ]);
    } catch (dbErr) {
      console.warn("[Admin API HomeOffers POST] Firestore sync warning (local copy preserved):", dbErr);
    }

    // 3. Revalidate homepage
    try {
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true, settings: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Admin API HomeOffers POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

