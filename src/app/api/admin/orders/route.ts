import { NextResponse } from "next/server";
import { FieldValue, getAdminDb } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { getLocalOrders, updateLocalOrder, deleteLocalOrder } from "@/lib/orders-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const maxDuration = 30;

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized access to administrator API." }, { status: 401, headers: noStore });
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") || 50);
    const pageSize = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50;
    const pageToken = searchParams.get("pageToken")?.trim() || undefined;

    // Vercel function filesystems are ephemeral. Only Firestore is a durable
    // order source in production; keep the JSON store as a local-dev fallback.
    const localOrders =
      process.env.NODE_ENV === "production" || pageToken ? [] : getLocalOrders().slice(0, pageSize);

    // Read a bounded page from the configured production Firestore.
    let firestoreOrders: Array<Record<string, any> & { id: string; docId?: string }>;
    let nextPageToken: string | undefined;
    try {
      const page = await Promise.race([
        getAdminDb().collection("orders").listPage(pageSize, pageToken),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Firestore orders query timed out.")), 8000)
        ),
      ]);
      nextPageToken = page.nextPageToken;
      firestoreOrders = page.docs.map((document) => {
        const data = document.data() || {};
        const orderId = (typeof data.id === "string" && data.id.trim()) ? data.id.trim() : document.id;
        return { ...data, id: orderId, docId: document.id };
      });
    } catch (fsErr) {
      const reason = fsErr instanceof Error ? fsErr.message : String(fsErr);
      console.error("[Admin Orders API] Firestore read failed:", reason);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            success: false,
            orders: [],
            error: `The production order database is unavailable: ${reason}`,
          },
          { status: 503, headers: noStore }
        );
      }
      firestoreOrders = [];
    }

    // 3. Merge both sources without duplicates, favoring latest updates
    const orderMap = new Map<string, any>();

    localOrders.forEach((order) => {
      if (order?.id) orderMap.set(order.id, order);
    });

    firestoreOrders.forEach((fOrder) => {
      if (fOrder?.id) {
        const existing = orderMap.get(fOrder.id) || (fOrder.docId ? orderMap.get(fOrder.docId) : null);
        if (!existing) {
          orderMap.set(fOrder.id, fOrder);
        } else {
          const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const firestoreTime = new Date(fOrder.updatedAt || fOrder.createdAt || 0).getTime();
          if (firestoreTime >= localTime) {
            orderMap.set(fOrder.id, { ...existing, ...fOrder });
          } else {
            orderMap.set(fOrder.id, { ...fOrder, ...existing });
          }
        }
      }
    });

    const orders = Array.from(orderMap.values());
    orders.sort((a, b) => new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime());

    return NextResponse.json(
      {
        success: true,
        orders,
        nextPageToken: nextPageToken || null,
        hasMore: Boolean(nextPageToken),
      },
      { headers: noStore }
    );
  } catch (error: any) {
    console.error("[Admin Orders API] Read error:", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, orders: [], error: "The production order database could not be read." },
        { status: 503, headers: noStore }
      );
    }
    try {
      const fallback = getLocalOrders();
      return NextResponse.json({ success: true, orders: fallback }, { headers: noStore });
    } catch {
      return NextResponse.json({ success: true, orders: [] }, { headers: noStore });
    }
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

    // 1. Immediately update local persistent store so status changes reflect instantly and reliably
    for (const change of changes) {
      if (typeof change?.id === "string" && change.id.trim() && change.updates) {
        updateLocalOrder(change.id.trim(), change.updates);
      }
    }

    // 2. Best-effort update to Firestore with 2000ms timeout guard
    try {
      await Promise.race([
        (async () => {
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
              if (Object.keys(safeUpdates).length) batch.set(db.collection("orders").doc(change.id.trim()), safeUpdates, { merge: true });
            }
            await batch.commit();
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore batch commit timeout")), 5000)),
      ]);
    } catch (fsError) {
      console.warn("[Admin Orders API] Firestore batch update warning (persisted locally):", fsError);
    }

    return NextResponse.json({ success: true, updatedCount: changes.length }, { headers: noStore });
  } catch (error: any) {
    console.error("[Admin Orders API] Update failed:", error);
    return NextResponse.json({ success: false, error: error?.message || "Order update failed" }, { status: 500, headers: noStore });
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

    // 1. Delete from local persistent store
    for (const id of cleanIds) {
      deleteLocalOrder(id);
    }

    // 2. Best-effort batched delete from Firestore with 2500ms timeout (no redundant subcollection scans)
    try {
      await Promise.race([
        (async () => {
          const db = getAdminDb();
          for (let offset = 0; offset < cleanIds.length; offset += 450) {
            const batch = db.batch();
            for (const id of cleanIds.slice(offset, offset + 450)) {
              batch.delete(db.collection("orders").doc(id));
            }
            await batch.commit();
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore delete timeout")), 2500)),
      ]);
    } catch (fsError) {
      console.warn("[Admin Orders API] Firestore delete warning (deleted locally):", fsError);
    }

    return NextResponse.json({ success: true, deletedCount: cleanIds.length }, { headers: noStore });
  } catch (error: any) {
    console.error("[Admin Orders API] Delete failed:", error);
    return NextResponse.json({ success: false, error: error?.message || "Order deletion failed" }, { status: 500, headers: noStore });
  }
}
