import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function parseServiceAccount(): { project_id: string; client_email: string; private_key: string } {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!raw || typeof raw !== "string") {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON must be configured for server-side Firebase access.");
  }

  let cleaned = raw.trim();
  if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  let parsed: { project_id?: unknown; client_email?: unknown; private_key?: unknown };
  try {
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  if (
    typeof parsed.project_id !== "string" ||
    typeof parsed.client_email !== "string" ||
    typeof parsed.private_key !== "string"
  ) {
    throw new Error("Firebase Admin service account JSON must include project_id, client_email, and private_key.");
  }
  return {
    project_id: parsed.project_id,
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

function getAdminApp() {
  const existing = getApps().find((app) => app.name === "oneplace-server");
  if (existing) return existing;

  const serviceAccount = parseServiceAccount();

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
    projectId: serviceAccount.project_id,
  }, "oneplace-server");
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getServerAdminAuth() {
  return getAuth(getAdminApp());
}
