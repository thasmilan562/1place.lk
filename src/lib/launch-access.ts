const encoder = new TextEncoder();

function base64UrlEncode(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function getSigningSecret() {
  return process.env.LAUNCH_PREVIEW_SECRET || process.env.ADMIN_SESSION_SECRET || "";
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function matchesLaunchPreviewPassword(candidate: string) {
  const expected = process.env.LAUNCH_PREVIEW_PASSWORD || "";
  return Boolean(expected) && constantTimeEqual(candidate, expected);
}

export async function createLaunchPreviewToken() {
  const secret = getSigningSecret();
  if (!secret) return null;

  const payload = base64UrlEncode(
    encoder.encode(JSON.stringify({ purpose: "launch-preview", exp: Date.now() + 8 * 60 * 60 * 1000 })),
  );
  return `${payload}.${await sign(payload, secret)}`;
}

export async function isValidLaunchPreviewToken(token?: string | null) {
  if (!token || !token.includes(".")) return false;
  const secret = getSigningSecret();
  if (!secret) return false;

  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const expectedSignature = await sign(payload, secret);
    if (!constantTimeEqual(signature, expectedSignature)) return false;

    const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return data.purpose === "launch-preview" && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}
