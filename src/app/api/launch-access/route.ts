import { NextRequest, NextResponse } from "next/server";
import { createLaunchPreviewToken, matchesLaunchPreviewPassword } from "@/lib/launch-access";
import { LAUNCH_PREVIEW_COOKIE, LAUNCH_PREVIEW_COOKIE_MAX_AGE } from "@/lib/launch-config";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "local";
  const address = forwardedFor.split(",")[0].trim().slice(0, 80) || "local";
  const now = Date.now();
  const current = attempts.get(address);
  const record = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;

  if (record.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ success: false, error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  let password = "";
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ success: false, error: "Enter the preview password." }, { status: 400 });
  }

  if (!(await matchesLaunchPreviewPassword(password))) {
    attempts.set(address, { count: record.count + 1, resetAt: record.resetAt });
    return NextResponse.json({ success: false, error: "That password did not match." }, { status: 401 });
  }

  const token = await createLaunchPreviewToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "Preview access is not configured on this server." }, { status: 503 });
  }

  attempts.delete(address);
  const response = NextResponse.json({ success: true });
  response.cookies.set(LAUNCH_PREVIEW_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: LAUNCH_PREVIEW_COOKIE_MAX_AGE,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
