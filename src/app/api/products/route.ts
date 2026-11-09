import { NextResponse } from "next/server";
import { getProducts } from "@/lib/firestore-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET /api/products
export async function GET() {
  try {
    // Catalog reads are public in Firestore rules; they should not depend on a
    // server service account. Privileged admin writes remain server-only.
    const products = await getProducts();
    return NextResponse.json({ success: true, products }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[Public API Products] GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

