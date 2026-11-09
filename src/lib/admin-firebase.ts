import { getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence, signInWithCustomToken, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import publicApp from "./firebase";

// Admin authentication must not replace the customer's storefront session.
const app = getApps().find((item) => item.name === "oneplace-admin-browser")
  || initializeApp(publicApp.options, "oneplace-admin-browser");
export const db = getFirestore(app);
export const storage = getStorage(app);
const auth = getAuth(app);
let pending: Promise<void> | null = null;

export function connectAdminFirebase(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch("/api/admin/auth/firebase", { method: "POST", cache: "no-store" });
    const result = await response.json();
    if (!response.ok || typeof result.token !== "string") throw new Error(result.error || "Admin database authentication failed.");
    await setPersistence(auth, inMemoryPersistence);
    await signInWithCustomToken(auth, result.token);
  })().finally(() => { pending = null; });
  return pending;
}

export async function disconnectAdminFirebase() {
  await signOut(auth);
}
