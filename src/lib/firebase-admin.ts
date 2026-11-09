import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  const existing = getApps().find((app) => app.name === "oneplace-server");
  if (existing) return existing;

  const rawServiceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is required for privileged Firebase server operations.");
  }

  let serviceAccount: { project_id?: string; client_email?: string; private_key?: string };
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.");
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Firebase Admin service-account JSON is missing project_id, client_email, or private_key.");
  }

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
