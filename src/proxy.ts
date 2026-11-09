import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function isValidAdminSession(token?: string | null): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;

    // Decode payload
    const jsonStr = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(jsonStr);

    if (!data.exp || Date.now() > data.exp || data.r !== "admin") {
      return false;
    }

    const secret = process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET;
    if (!secret) return false;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedSigBuf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return signature === expectedSig;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect Admin Dashboard Routes
  if (pathname === "/admin" || pathname.startsWith("/admin/dashboard")) {
    const token = request.cookies.get("admin_session")?.value;
    const isValid = await isValidAdminSession(token);

    if (!isValid) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect Admin API Routes (excluding admin auth endpoints)
  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth")) {
    const token = request.cookies.get("admin_session")?.value;
    const isValid = await isValidAdminSession(token);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access to administrator API." },
        { status: 401 }
      );
    }
  }

  // Canonical Category Redirects (Preserves merchant bookmarks & legacy links)
  if (pathname.startsWith("/category/")) {
    const slug = pathname.replace("/category/", "").toLowerCase();
    const redirects: Record<string, string> = {
      "toy": "toys-kids",
      "toys": "toys-kids",
      "toys-games": "toys-kids",
      "beauty-and-skincare": "beauty-skincare",
      "keyboard": "keyboards-and-mouse",
      "keyboards": "keyboards-and-mouse",
      "battery": "power-banks",
      "batteries": "power-banks",
      "powerbank": "power-banks",
      "tab": "tablets",
      "ipad": "tablets",
      "laptop": "laptops",
    };
    if (redirects[slug]) {
      return NextResponse.redirect(new URL(`/category/${redirects[slug]}`, request.url), 301);
    }
  }

  const response = NextResponse.next();

  // Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
