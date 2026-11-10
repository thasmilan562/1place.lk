import { NextResponse } from "next/server";
import { getAdminDb, getServerAdminAuth } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { getLocalCustomers, deleteLocalCustomer, CustomerRecord } from "@/lib/customers-store";
import { getLocalOrders, OrderRecord } from "@/lib/orders-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized access to administrator API." }, { status: 401, headers: noStore });
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) return unauthorized();

  try {
    // 1. Start with local cached customers immediately
    const localCustomers = getLocalCustomers();
    const customerMap = new Map<string, CustomerRecord>();

    localCustomers.forEach((c) => {
      if (c.id) customerMap.set(c.id, c);
      if (c.email) customerMap.set(c.email.toLowerCase(), c);
    });

    // 2. Fetch live users from Firestore 'users' collection with 8000ms timeout
    try {
      const firestoreUsers = await Promise.race([
        (async () => {
          try {
            const snap = await getAdminDb().collection("users").get();
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch (e) {
            console.warn("[Admin Customers API] Firestore users get warning:", e);
            return [];
          }
        })(),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 8000)),
      ]);

      firestoreUsers.forEach((u: any) => {
        const email = (u.email || "").toLowerCase().trim();
        const existing = (u.id && customerMap.get(u.id)) || (email && customerMap.get(email));
        const record: CustomerRecord = {
          ...existing,
          ...u,
          id: u.id || existing?.id || `user-${Date.now()}`,
          isGuest: false,
          displayName: u.displayName || u.name || existing?.displayName || "Registered User",
          email: u.email || existing?.email || "",
          phone: u.phone || u.phoneNumber || existing?.phone || "",
          phoneNumber: u.phone || u.phoneNumber || existing?.phoneNumber || "",
          createdAt: u.createdAt || existing?.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        };
        customerMap.set(record.id, record);
        if (email) customerMap.set(email, record);
      });
    } catch (fsErr) {
      console.warn("[Admin Customers API] Error loading Firestore users:", fsErr);
    }

    // 3. Fetch Firebase Auth users with 5000ms timeout
    try {
      const authUsers = await Promise.race([
        (async () => {
          try {
            const list = await getServerAdminAuth().listUsers(100);
            return list.users;
          } catch (e) {
            console.warn("[Admin Customers API] Firebase Auth listUsers warning:", e);
            return [];
          }
        })(),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);

      authUsers.forEach((u: any) => {
        const email = (u.email || "").toLowerCase().trim();
        const existing = (u.uid && customerMap.get(u.uid)) || (email && customerMap.get(email));
        const record: CustomerRecord = {
          ...existing,
          id: u.uid,
          isGuest: false,
          displayName: u.displayName || existing?.displayName || (email ? email.split("@")[0] : "Registered User"),
          email: u.email || existing?.email || "",
          phone: u.phoneNumber || existing?.phone || "",
          phoneNumber: u.phoneNumber || existing?.phoneNumber || "",
          photoURL: u.photoURL || existing?.photoURL || "",
          createdAt: u.metadata?.creationTime || existing?.createdAt || new Date().toISOString(),
        };
        customerMap.set(record.id, record);
        if (email) customerMap.set(email, record);
      });
    } catch (authErr) {
      console.warn("[Admin Customers API] Error loading Auth users:", authErr);
    }

    // 4. Merge Customers from local and Firestore orders. Orders submitted on
    // production/serverless instances are stored in Firestore, so the local
    // JSON cache alone is not a complete source for guest customer details.
    try {
      const localOrders = getLocalOrders();
      const firestoreOrders = await Promise.race([
        (async () => {
          try {
            const snap = await getAdminDb().collection("orders").get();
            return snap.docs.map((d): OrderRecord => {
              const data = d.data() || {};
              return { ...data, id: (typeof data.id === "string" && data.id.trim()) ? data.id.trim() : d.id };
            });
          } catch (error) {
            console.warn("[Admin Customers API] Firestore orders get warning:", error);
            return [];
          }
        })(),
        new Promise<OrderRecord[]>((resolve) => setTimeout(() => resolve([]), 8000)),
      ]);
      const ordersById = new Map<string, OrderRecord>();
      [...localOrders, ...firestoreOrders].forEach((order) => {
        if (!order?.id) return;
        const existing = ordersById.get(order.id);
        if (!existing) {
          ordersById.set(order.id, order);
          return;
        }
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const orderTime = new Date(order.updatedAt || order.createdAt || 0).getTime();
        ordersById.set(order.id, orderTime >= existingTime ? { ...existing, ...order } : { ...order, ...existing });
      });

      const orders = Array.from(ordersById.values());
      orders.forEach((ord) => {
        const email = (ord.email || ord.customerEmail || ord.deliveryAddress?.email || "").toLowerCase().trim();
        const phone = ord.phone || ord.primaryPhone || ord.phoneNumber || ord.deliveryAddress?.phone || "";
        const name = ord.customerName || ord.name || ord.fullName || ord.deliveryAddress?.name || "";
        const userId = ord.userId;

        const matched = (userId && customerMap.get(userId)) || (email && customerMap.get(email));

        if (matched) {
          if (!matched.phone && phone) {
            matched.phone = phone;
            matched.phoneNumber = phone;
          }
          if ((!matched.displayName || matched.displayName === "Registered User") && name) {
            matched.displayName = name;
          }
        } else if (name || phone || email) {
          const guestId = userId && userId !== "guest" ? userId : (email ? `cust-${Buffer.from(email).toString("hex").slice(0, 10)}` : ord.id);
          const guestRecord: CustomerRecord = {
            id: guestId,
            isGuest: true,
            displayName: name || "Guest Customer",
            email: email || "Not provided",
            phone: phone || "",
            phoneNumber: phone || "",
            role: "customer",
            createdAt: ord.createdAt || new Date().toISOString(),
          };
          customerMap.set(guestId, guestRecord);
          if (email) customerMap.set(email, guestRecord);
        }
      });
    } catch (ordErr) {
      console.warn("[Admin Customers API] Error merging order customers:", ordErr);
    }

    // 5. Deduplicate by unique id
    const uniqueMap = new Map<string, CustomerRecord>();
    customerMap.forEach((cust) => {
      if (cust.id && !uniqueMap.has(cust.id)) {
        uniqueMap.set(cust.id, cust);
      }
    });

    const mergedList = Array.from(uniqueMap.values()).sort((a, b) => {
      // Show registered users first, then by newest
      if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return NextResponse.json({ success: true, customers: mergedList }, { headers: noStore });
  } catch (error) {
    console.error("[Admin Customers API] Internal Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customer directory." },
      { status: 500, headers: noStore }
    );
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminRequest(request)) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json({ success: false, error: "Customer ID is required." }, { status: 400 });
    }

    const cleanId = id.trim();

    // 1. Delete from local cache
    deleteLocalCustomer(cleanId);

    // 2. Delete from Firestore if exists
    try {
      const db = getAdminDb();
      await db.collection("users").doc(cleanId).delete().catch(() => {});
      await db.collection("guest_profiles").doc(cleanId).delete().catch(() => {});
    } catch (fsErr) {
      console.warn("[Admin Customers API] Firestore delete warning:", fsErr);
    }

    return NextResponse.json({ success: true, message: "Customer profile deleted successfully." }, { headers: noStore });
  } catch (error) {
    console.error("[Admin Customers API] Delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete customer." },
      { status: 500, headers: noStore }
    );
  }
}

