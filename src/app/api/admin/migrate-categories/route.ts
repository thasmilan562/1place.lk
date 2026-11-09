import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { Product } from "@/lib/types";
import { auditProductClassification } from "@/lib/migration-audit";
import { DEFAULT_BRANDS } from "@/lib/data";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized access to administrator API." }, { status: 401 });
}

export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("products").get();
    const products = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Product));

    const auditResults = products.map((p) => auditProductClassification(p));

    return NextResponse.json({
      success: true,
      totalProducts: products.length,
      highConfidence: auditResults.filter((r) => r.confidence === "HIGH").length,
      requiresReview: auditResults.filter((r) => r.confidence === "REQUIRES_REVIEW").length,
      auditResults,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) return unauthorized();

  try {
    const db = getAdminDb();
    const body = await req.json().catch(() => ({}));
    const applyAction = body.action || "apply"; // "apply" or "seed_brands"

    // 1. Seed Brands collection if needed
    const brandSnap = await db.collection("brands").get();
    if (brandSnap.empty || applyAction === "seed_brands") {
      const brandBatch = db.batch();
      for (const brand of DEFAULT_BRANDS) {
        const ref = db.collection("brands").doc(brand.id);
        brandBatch.set(ref, brand, { merge: true });
      }
      await brandBatch.commit();
    }

    // 2. Audit & Migrate Products
    const snapshot = await db.collection("products").get();
    const products = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Product));

    if (products.length === 0) {
      return NextResponse.json({ success: true, message: "No products in database to migrate." });
    }

    let updatedCount = 0;
    let batch = db.batch();
    let pendingWrites = 0;

    for (const product of products) {
      const audit = auditProductClassification(product);

      const ref = db.collection("products").doc(product.id);
      batch.update(ref, {
        category_id: audit.suggestedCategoryId,
        category_name: audit.suggestedCategoryName,
        category_slug: audit.suggestedCategorySlug,
        categoryId: audit.suggestedCategoryId,
        categoryName: audit.suggestedCategoryName,
        categorySlug: audit.suggestedCategorySlug,
        
        brand: audit.suggestedBrandName,
        brand_id: audit.suggestedBrandId,
        brand_name: audit.suggestedBrandName,
        brand_slug: audit.suggestedBrandSlug,
        brandId: audit.suggestedBrandId,
        brandName: audit.suggestedBrandName,
        brandSlug: audit.suggestedBrandSlug,
        
        updated_at: new Date().toISOString(),
      });
      updatedCount++;
      pendingWrites++;
      if (pendingWrites === 450) {
        await batch.commit();
        batch = db.batch();
        pendingWrites = 0;
      }
    }

    if (pendingWrites > 0) await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${updatedCount} products into separate Category and Brand fields.`,
      updatedCount,
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
