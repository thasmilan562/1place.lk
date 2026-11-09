import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalHomeOffers } from "@/lib/home-offers-store";
import { HomeOfferSettings } from "@/lib/home-offers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
};

function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), ms)),
  ]);
}

export async function GET() {
  try {
    let settings: HomeOfferSettings = getLocalHomeOffers();

    try {
      const db = getAdminDb();
      const snap = await withTimeout(db.collection("settings").doc("home_offers").get(), 1200);
      if (snap.exists) {
        settings = { ...settings, ...(snap.data() as HomeOfferSettings) };
      }
    } catch {
      // Return local settings seamlessly
    }

    return NextResponse.json({ success: true, settings }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Public API HomeOffers GET] Error:", err);
    return NextResponse.json({ success: true, settings: getLocalHomeOffers() }, { headers: NO_CACHE_HEADERS });
  }
}

