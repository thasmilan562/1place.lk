import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401, headers });
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) return unauthorized();
  try {
    const snapshot = await getAdminDb().collection("settings").doc("overview").get();
    return NextResponse.json({ success: true, revenueResetAt: snapshot.data()?.revenueResetAt || null }, { headers });
  } catch (error) {
    console.error("[Admin Overview] Could not load revenue reset setting:", error);
    return NextResponse.json({ success: false, error: "Could not load overview settings." }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) return unauthorized();
  const revenueResetAt = new Date().toISOString();
  try {
    await getAdminDb().collection("settings").doc("overview").set({ revenueResetAt, updatedAt: revenueResetAt }, { merge: true });
    return NextResponse.json({ success: true, revenueResetAt }, { headers });
  } catch (error) {
    console.error("[Admin Overview] Could not reset order value:", error);
    return NextResponse.json({ success: false, error: "Could not reset the overview amount." }, { status: 503, headers });
  }
}
