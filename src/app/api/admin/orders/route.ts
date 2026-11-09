import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized access to administrator API." }, { status: 401, headers: noStore });
}

function unavailable() {
  return NextResponse.json(
    { success: false, error: "Admin database connection is unavailable. Configure FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON in production." },
    { status: 503, headers: noStore }
  );
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) return unauthorized();

  try {
    const snapshot = await getAdminDb().collection("orders").get();
    const orders: Array<Record<string, any> & { id: string }> = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
    orders.sort((a, b) => new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime());
    return NextResponse.json({ success: true, orders }, { headers: noStore });
  } catch (error) {
    console.error("[Admin Orders API] Read failed:", error);
    return unavailable();
  }
}

const editableFields = new Set([
  "status",
  "orderStatus",
  "paymentStatus",
  "trackingNumber",
  "internalNotes",
  "cancellationReason",
  "updatedAt",
]);

export async function PATCH(request: Request) {
  if (!verifyAdminRequest(request)) return unauthorized();

  try {
    const body = await request.json();
    const changes: Array<{ id: string; updates: Record<string, unknown> }> = Array.isArray(body.changes)
      ? body.changes
      : (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : []).map((id: string) => ({ id, updates: body.updates || {} }));

    if (!changes.length) {
      return NextResponse.json({ success: false, error: "Order id(s) and valid order changes are required." }, { status: 400, headers: noStore });
    }

    const db = getAdminDb();
    for (let offset = 0; offset < changes.length; offset += 450) {
      const batch = db.batch();
      for (const change of changes.slice(offset, offset + 450)) {
        if (typeof change?.id !== "string" || !change.id.trim() || !change.updates || typeof change.updates !== "object") continue;
        const safeUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(change.updates)) {
          if (editableFields.has(key)) safeUpdates[key] = value;
        }
        if (Array.isArray(change.updates.statusHistory) && change.updates.statusHistory.length) {
          safeUpdates.statusHistory = FieldValue.arrayUnion(...change.updates.statusHistory);
        }
        if (Object.keys(safeUpdates).length) batch.update(db.collection("orders").doc(change.id.trim()), safeUpdates);
      }
      await batch.commit();
    }

    return NextResponse.json({ success: true, updatedCount: changes.length }, { headers: noStore });
  } catch (error) {
    console.error("[Admin Orders API] Update failed:", error);
    return unavailable();
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminRequest(request)) return unauthorized();

  try {
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    const cleanIds = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim())));
    if (!cleanIds.length) {
      return NextResponse.json({ success: false, error: "Order id(s) are required." }, { status: 400, headers: noStore });
    }

    const db = getAdminDb();
    const subcollections = ["items", "payments", "statusHistory", "notes", "tracking", "history", "audit"];
    for (const id of cleanIds) {
      const order = db.collection("orders").doc(id);
      for (const name of subcollections) {
        const snapshot = await order.collection(name).get();
        for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
          const batch = db.batch();
          snapshot.docs.slice(offset, offset + 450).forEach((document) => batch.delete(document.ref));
          await batch.commit();
        }
      }
      await order.delete();
    }

    return NextResponse.json({ success: true, deletedCount: cleanIds.length }, { headers: noStore });
  } catch (error) {
    console.error("[Admin Orders API] Delete failed:", error);
    return unavailable();
  }
}
