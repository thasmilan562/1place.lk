import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalHeroSlides } from "@/lib/hero-store";
import { DEFAULT_HERO_SLIDES } from "@/lib/data";
import { HeroSlide } from "@/lib/types";
import { normalizeImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let slides: HeroSlide[] = [];

    // 1. Try local JSON store first for ultra-fast local response
    try {
      const localSlides = getLocalHeroSlides();
      if (Array.isArray(localSlides) && localSlides.length > 0) {
        slides = localSlides;
      }
    } catch (e) {
      console.warn("[Public Hero API] Local store read error:", e);
    }

    // 2. Also check Firestore if available
    try {
      const db = getAdminDb();
      const snap = await db.collection("hero_slides").get();
      if (!snap.empty) {
        const firestoreSlides = snap.docs.map((d) => ({ ...(d.data() as HeroSlide), id: d.id }));
        if (firestoreSlides.length > 0) {
          slides = firestoreSlides;
        }
      }
    } catch {
      // Admin DB unavailable or offline - fallback to localSlides
    }

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
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
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

