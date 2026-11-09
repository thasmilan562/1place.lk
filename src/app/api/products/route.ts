import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalProducts } from "@/lib/products-store";
import { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/products
export async function GET() {
  try {
    try {
      const db = getAdminDb();
      const snap = await db.collection("products").get();
      const products = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
      return NextResponse.json({ success: true, products });
    } catch (e) {
      console.warn("[Public API Products] Firestore read warning:", e);
      // A local JSON copy is only a development fallback. In production it can
      // contain deleted/stale products and must never override the database.
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ success: false, error: "Product catalog is temporarily unavailable." }, { status: 503 });
      }

      return NextResponse.json({ success: true, products: getLocalProducts() });
    }
  } catch (err: any) {
    console.error("[Public API Products] GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

