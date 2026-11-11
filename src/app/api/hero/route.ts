import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { db as clientDb } from "@/lib/firebase";
import { getLocalHeroSlides, mergeHeroSlides } from "@/lib/hero-store";
import { DEFAULT_HERO_SLIDES } from "@/lib/data";
import { HeroSlide } from "@/lib/types";
import { normalizeImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function withTimeout<T>(promise: Promise<T>, ms = 1800): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), ms)),
  ]);
}

async function fetchRemoteHeroSlides(): Promise<HeroSlide[]> {
  try {
    const db = getAdminDb();
    const snap = await withTimeout(db.collection("hero_slides").get(), 1500);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ ...(d.data() as HeroSlide), id: d.id }));
    }
  } catch {
    try {
      const snap = await withTimeout(getDocs(collection(clientDb, "hero_slides")), 1500);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ ...(d.data() as HeroSlide), id: d.id }));
      }
    } catch {
      // Fallback to local slides
    }
  }
  return [];
}

export async function GET() {
  try {
    const localSlides = getLocalHeroSlides();
    const remoteSlides = await fetchRemoteHeroSlides();
    let slides: HeroSlide[] = remoteSlides.length > 0
      ? mergeHeroSlides(localSlides, remoteSlides)
      : localSlides;

    if (!slides || slides.length === 0) {
      slides = DEFAULT_HERO_SLIDES;
    }

    const now = Date.now();
    const active = slides
      .filter((s) => s.active !== false &&
        (!s.start_date || new Date(s.start_date).getTime() <= now) &&
        (!s.expiry_date || new Date(s.expiry_date).getTime() > now)
      )
      .map((s) => ({
        ...s,
        image_url: normalizeImageUrl(s.image_url),
        desktop_image_url: normalizeImageUrl(s.desktop_image_url || s.image_url),
        mobile_image_url: normalizeImageUrl(s.mobile_image_url || s.desktop_image_url || s.image_url),
      }))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return NextResponse.json(
      { success: true, slides: active.length > 0 ? active : DEFAULT_HERO_SLIDES },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[Public Hero API GET] Error:", err);
    return NextResponse.json(
      { success: true, slides: DEFAULT_HERO_SLIDES },
      { status: 200 }
    );
  }
}
