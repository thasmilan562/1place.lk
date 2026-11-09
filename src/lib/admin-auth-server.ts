import crypto from "crypto";

function getSecretKey(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || null;
}

export interface AdminSessionData {
  u: string;
  r: "admin";
  exp: number;
}

/**
 * Creates a signed session token using HMAC-SHA256
 */
export function createAdminSessionToken(username: string): string {
  const secret = getSecretKey();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET or AUTH_SECRET must be configured.");
  }

  const data: AdminSessionData = {
    u: username,
    r: "admin",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  };

  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token. Returns session data or null if invalid/expired.
 */
export function verifyAdminSessionToken(token?: string | null): AdminSessionData | null {
  if (!token || !token.includes(".")) return null;
  const secret = getSecretKey();
  if (!secret) return null;

  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return null;
    }

    const json = Buffer.from(payload, "base64url").toString("utf-8");
    const data = JSON.parse(json) as AdminSessionData;

    if (!data.exp || Date.now() > data.exp) {
      return null;
    }

    if (data.r !== "admin") {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Server-side check for valid admin credentials (constant-time comparison)
 */
export function verifyAdminCredentials(user: string, pass: string): boolean {
  const expectedUser = (process.env.ADMIN_USER || "").trim().toLowerCase();
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;

  const cleanUser = user.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Primary credential check (constant time)
  if (cleanUser !== expectedUser) {
    return false;
  }

  const bufA = Buffer.from(cleanPass);
  const bufB = Buffer.from(expectedPass);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/** Verifies the signed admin cookie at the data route itself, not only in Proxy. */
export function verifyAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("admin_session="));

  if (!cookie) return false;

  try {
    return Boolean(verifyAdminSessionToken(decodeURIComponent(cookie.slice("admin_session=".length))));
  } catch {
    return false;
  }
}

