import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { getServerAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: "Admin session required." }, { status: 401, headers });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  }
  try {
    const token = await getServerAdminAuth().createCustomToken("oneplace-store-administrator", { admin: true });
    return NextResponse.json({ token }, { headers });
  } catch {
    return NextResponse.json({ error: "Admin database sign-in is unavailable. Check the server Firebase credentials." }, { status: 503, headers });
  }
}
