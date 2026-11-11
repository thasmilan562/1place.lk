import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalHomeOffers } from "@/lib/home-offers-store";
import { HomeOfferSettings } from "@/lib/home-offers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), ms)),
  ]);
}

export async function GET() {
  try {
    let settings: any = getLocalHomeOffers();

    try {
      const db = getAdminDb();
      const [dealSnap, homeSnap] = await Promise.all([
        withTimeout(db.collection("settings").doc("today_deal").get(), 1200).catch(() => null),
        withTimeout(db.collection("settings").doc("home_offers").get(), 1200).catch(() => null),
      ]);
      const remoteData = dealSnap?.exists ? dealSnap.data() : homeSnap?.exists ? homeSnap.data() : null;
      if (remoteData) {
        const localTime = settings?.updatedAt ? new Date(settings.updatedAt).getTime() : 0;
        const remoteTime = remoteData.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;
        if (remoteTime >= localTime) {
          settings = { ...settings, ...remoteData };
        } else {
          settings = { ...remoteData, ...settings };
        }
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

