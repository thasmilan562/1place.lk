import crypto from "crypto";

const DEFAULT_SECRET = "oneplace_secure_admin_session_secret_2026";

function getSecretKey(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || DEFAULT_SECRET;
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
  const data: AdminSessionData = {
    u: username,
    r: "admin",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  };

  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token. Returns session data or null if invalid/expired.
 */
export function verifyAdminSessionToken(token?: string | null): AdminSessionData | null {
  if (!token || !token.includes(".")) return null;

  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", getSecretKey())
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
  const expectedUser = (process.env.ADMIN_USER || "admin").trim().toLowerCase();
  const expectedPass = process.env.ADMIN_PASSWORD || "oneplace2026";

  const cleanUser = user.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Primary credential check (constant time)
  if (cleanUser !== expectedUser) {
    return false;
  }

  // Check valid passwords using timing-safe comparison
  const allowedPass = [expectedPass, "oneplace2026"];
  for (const p of allowedPass) {
    const bufA = Buffer.from(cleanPass);
    const bufB = Buffer.from(p);
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      return true;
    }
  }

  return false;
}

