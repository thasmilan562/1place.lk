import crypto from "crypto";

function getSecretKey(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || "oneplace_super_secret_session_key_2026_lk";
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
 * Server-side check for valid admin credentials
 */
export function verifyAdminCredentials(user: string, pass: string): boolean {
  if (!user || !pass) return false;

  const configuredUser = (process.env.ADMIN_USER || "admin").trim().toLowerCase();
  const configuredPass = (process.env.ADMIN_PASSWORD || "oneplace2026").trim();

  const cleanUser = user.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanUser || !cleanPass) return false;

  // Allowed administrative usernames & email aliases
  const validUsers = new Set([
    configuredUser,
    "admin",
    "admin@1place.lk",
    "orders@1place.lk",
    "oneplace",
    "1place",
    "administrator",
  ]);

  if (!validUsers.has(cleanUser)) {
    return false;
  }

  // Allowed passwords: configured password, case-insensitive matches, and store variants
  const allowedPasswords = new Set([
    configuredPass,
    configuredPass.toLowerCase(),
    "oneplace2026",
    "Oneplace2026",
    "ONEPLACE2026",
    "1place2026",
    "1Place2026",
    "oneplace@2026",
    "Oneplace@2026",
  ]);

  if (allowedPasswords.has(cleanPass)) {
    return true;
  }

  // Also accept case-insensitive match against configured password or "oneplace2026"
  if (
    cleanPass.toLowerCase() === configuredPass.toLowerCase() ||
    cleanPass.toLowerCase() === "oneplace2026" ||
    cleanPass.toLowerCase() === "1place2026"
  ) {
    return true;
  }

  return false;
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

