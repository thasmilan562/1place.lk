import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalProducts } from "@/lib/products-store";
import { Product } from "@/lib/types";

// GET /api/products
export async function GET() {
  try {
    const localList = getLocalProducts();
    let firestoreList: Product[] = [];

    try {
      const db = getAdminDb();
      const snap = await db.collection("products").get();
      firestoreList = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
    } catch (e) {
      console.warn("[Public API Products] Firestore read warning:", e);
    }

    const map = new Map<string, Product>();
    localList.forEach((p) => {
      if (p.id) map.set(p.id, p);
    });
    firestoreList.forEach((p) => {
      if (p.id) map.set(p.id, p);
    });

    const products = Array.from(map.values());
    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    console.error("[Public API Products] GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

