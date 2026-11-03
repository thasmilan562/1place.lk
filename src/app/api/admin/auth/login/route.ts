import { NextResponse } from "next/server";
import { verifyAdminCredentials, createAdminSessionToken } from "@/lib/admin-auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    const isValid = verifyAdminCredentials(username, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid administrative credentials. Access restricted." },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken(username.trim().toLowerCase());

    const response = NextResponse.json({
      success: true,
      message: "Authenticated successfully.",
      user: { username: username.trim().toLowerCase(), role: "admin" },
    });

    const isProduction = process.env.NODE_ENV === "production";

    // Set secure HttpOnly session cookie
    response.cookies.set({
      name: "admin_session",
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during authentication." },
      { status: 500 }
    );
  }
}

