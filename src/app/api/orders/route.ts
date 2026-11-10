import { NextResponse } from "next/server";
import { getLocalOrders, saveLocalOrder, updateLocalOrder, updateLocalOrderStatus, deleteLocalOrder, OrderRecord } from "@/lib/orders-store";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, getDoc, query, where, limit, setDoc, updateDoc } from "firebase/firestore";
import { deductProductStock } from "@/lib/stock-deduction";

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]).catch(() => fallback);
}

async function withRequiredTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function sanitize(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitize(item));
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = sanitize(val);
    }
  }
  return cleaned;
}

// GET /api/orders - returns orders with targeted lookup (never full collection scan)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim();
    const userId = searchParams.get("userId")?.trim();
    const orderId = searchParams.get("id")?.trim();
    const idsParam = searchParams.get("ids")?.trim();
    const includeUnpaid = searchParams.get("includeUnpaid") === "true";

    const idList = idsParam
      ? Array.from(
          new Set(
            idsParam
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        ).slice(0, 10)
      : [];

    const hasValidLookup =
      Boolean(orderId) ||
      idList.length > 0 ||
      Boolean(userId && userId !== "guest") ||
      Boolean(phone && phone.length >= 7);

    // Reject unbounded requests immediately to protect Firestore read quota
    if (!hasValidLookup) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // 1. Read local persistent orders only in non-production
    const localList = process.env.NODE_ENV === "production" ? [] : getLocalOrders();

    // 2. Targeted Firestore lookup (Admin DB first, targeted client fallback; zero full collection scans)
    let firestoreList: OrderRecord[] = [];
    try {
      let adminDb: ReturnType<typeof getAdminDb> | null = null;
      try {
        adminDb = getAdminDb();
      } catch {
        adminDb = null;
      }

      if (orderId) {
        const candidates = Array.from(
          new Set([
            orderId,
            orderId.toUpperCase(),
            orderId.toUpperCase().startsWith("1P-") ? orderId.toUpperCase() : `1P-${orderId.toUpperCase()}`,
          ])
        );
        for (const candidateId of candidates) {
          if (adminDb) {
            const snap = await withTimeout(adminDb.collection("orders").doc(candidateId).get(), 2500, null);
            if (snap && snap.exists) {
              firestoreList = [{ ...(snap.data() || {}), id: snap.id } as OrderRecord];
              break;
            }
          } else {
            const directDoc = await withTimeout(getDoc(doc(db, "orders", candidateId)), 1500, null);
            if (directDoc && directDoc.exists()) {
              firestoreList = [{ ...directDoc.data(), id: directDoc.id } as OrderRecord];
              break;
            }
          }
        }
      } else if (idList.length > 0) {
        const docs = await Promise.all(
          idList.map((id) =>
            adminDb
              ? withTimeout(adminDb.collection("orders").doc(id).get(), 2500, null)
              : withTimeout(getDoc(doc(db, "orders", id)), 1500, null)
          )
        );
        for (const d of docs) {
          if (!d) continue;
          const exists = typeof (d as any).exists === "function" ? (d as any).exists() : Boolean((d as any).exists);
          if (exists) {
            firestoreList.push({ ...(d.data() || {}), id: d.id } as OrderRecord);
          }
        }
      } else if (userId && userId !== "guest") {
        if (adminDb) {
          const snap = await withTimeout(
            adminDb.collection("orders").where("userId", "==", userId).limit(25).get(),
            3000,
            null
          );
          if (snap) {
            firestoreList = snap.docs.map((d) => ({ ...(d.data() || {}), id: d.id } as OrderRecord));
          }
        } else {
          const q = query(collection(db, "orders"), where("userId", "==", userId), limit(25));
          const snap = await withTimeout(getDocs(q), 1500, null);
          if (snap) {
            firestoreList = snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderRecord));
          }
        }
      } else if (phone) {
        if (adminDb) {
          const snap = await withTimeout(
            adminDb.collection("orders").where("primaryPhone", "==", phone).limit(20).get(),
            3000,
            null
          );
          if (snap) {
            firestoreList = snap.docs.map((d) => ({ ...(d.data() || {}), id: d.id } as OrderRecord));
          }
        } else {
          const q = query(collection(db, "orders"), where("primaryPhone", "==", phone), limit(20));
          const snap = await withTimeout(getDocs(q), 1500, null);
          if (snap) {
            firestoreList = snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderRecord));
          }
        }
      }
    } catch (e) {
      console.warn("API GET orders targeted Firestore read warning:", e);
    }

    // Merge without duplicates
    const map = new Map<string, OrderRecord>();
    [...localList, ...firestoreList].forEach((item) => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });

    let result = Array.from(map.values());

    // Filter out abandoned online payment attempts unless specifically requested
    if (!includeUnpaid && !orderId) {
      result = result.filter((o: any) => {
        const method = (o.paymentMethod || "").toString().toLowerCase();
        const isOnlineCard = method.includes("payhere") || method.includes("card") || method.includes("online");
        if (isOnlineCard) {
          const payStatus = (o.paymentStatus || "").toString().toLowerCase();
          const ordStatus = (o.status || o.orderStatus || "").toString().toLowerCase();
          const isPaid = payStatus === "paid" || ordStatus === "paid" || o.payhereVerified || o.payhereStatusCode === "2";
          return isPaid;
        }
        return true;
      });
    }

    // Apply strict filtering
    if (orderId) {
      result = result.filter(
        (o) =>
          o.id.toLowerCase() === orderId.toLowerCase() ||
          o.id.slice(-6).toLowerCase() === orderId.toLowerCase() ||
          o.id.slice(-8).toLowerCase() === orderId.toLowerCase()
      );
    } else if (idList.length > 0) {
      const idSet = new Set(idList.map((i) => i.toLowerCase()));
      result = result.filter((o) => idSet.has(o.id.toLowerCase()));
    } else if (phone) {
      result = result.filter(
        (o) =>
          o.primaryPhone?.includes(phone) ||
          o.secondaryPhone?.includes(phone) ||
          phone.includes(o.primaryPhone || "___")
      );
    } else if (userId && userId !== "guest") {
      result = result.filter((o) => o.userId === userId);
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return NextResponse.json({ success: true, orders: result });
  } catch (err: any) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ success: false, error: err.message, orders: [] });
  }
}

// POST /api/orders - save new order (supports both Authenticated and Guest Checkout)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate items
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Your order must contain at least one item." },
        { status: 400 }
      );
    }

    // Customer contact details validation
    const customerName = (body.customerName || body.codName || body.cardName || "").trim();
    const primaryPhone = (body.primaryPhone || body.phone || body.codPhone1 || "").trim();
    const address = (body.address || body.codAddress || "").trim();
    const district = (body.district || body.codDistrict || "Colombo").trim();

    if (!customerName || customerName.length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid customer full name." },
        { status: 400 }
      );
    }

    if (!primaryPhone || primaryPhone.replace(/\D/g, "").length < 9) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid Sri Lankan mobile phone number." },
        { status: 400 }
      );
    }

    if (!address || address.length < 5) {
      return NextResponse.json(
        { success: false, error: "Please enter a complete delivery street address." },
        { status: 400 }
      );
    }

    // ── Promotional Free Gift & Standalone Validation ──
    const giftItems = items.filter((i: any) => i.isFreeGift === true);
    const paidItems = items.filter((i: any) => !i.isFreeGift && Number(i.price) > 0);

    if (giftItems.length > 0) {
      if (paidItems.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotional free gifts cannot be ordered alone. You must purchase at least one regular qualifying product in your order.",
          },
          { status: 400 }
        );
      }

      // Verify reward on server with timeout guard
      for (const gift of giftItems) {
        const rewardId = gift.rewardId || body.giftRewardId;
        if (rewardId) {
          try {
            const rewardDocRef = doc(db, "spin_rewards", rewardId);
            const rewardSnap = await withTimeout(getDoc(rewardDocRef), 1200, null);
            if (rewardSnap && rewardSnap.exists()) {
              const rData = rewardSnap.data();
              if (rData.status === "redeemed") {
                return NextResponse.json(
                  { success: false, error: "This promotional free gift reward has already been redeemed." },
                  { status: 400 }
                );
              }
              if (new Date(rData.expiresAt).getTime() < Date.now()) {
                return NextResponse.json(
                  { success: false, error: "This promotional free gift reward has expired." },
                  { status: 400 }
                );
              }
            }
          } catch (rErr) {
            console.warn("Could not verify reward status from Firestore:", rErr);
          }
        }
      }
    }

    // Zero / Invalid Price & Quantity Protection + Fresh Product Read (no stale cache)
    let serverSubtotal = 0;
    const prefetchedProducts = new Map<string, Record<string, any>>();
    for (const item of items) {
      const itemPrice = Number(item.price);
      const itemQty = Number(item.quantity);

      if (item.isFreeGift) {
        if (itemQty !== 1) {
          return NextResponse.json(
            { success: false, error: "Promotional free gift quantity is limited to 1." },
            { status: 400 }
          );
        }
        continue;
      }

      if (isNaN(itemPrice) || itemPrice <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid price detected for "${item.name || "Product"}". Please reload cart.`,
          },
          { status: 400 }
        );
      }

      if (isNaN(itemQty) || itemQty <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid quantity for "${item.name || "Product"}".`,
          },
          { status: 400 }
        );
      }

      // Server-side fresh database verification (deduplicated per productId within this request)
      const pid = typeof item.productId === "string" ? item.productId.trim() : "";
      if (pid) {
        try {
          let pData = prefetchedProducts.get(pid);
          if (!pData) {
            const adminDb = getAdminDb();
            const pDoc = await withTimeout(adminDb.collection("products").doc(pid).get(), 2500, null);
            if (pDoc && pDoc.exists) {
              pData = pDoc.data() || {};
              prefetchedProducts.set(pid, pData);
            }
          }
          if (pData && pData.status === "draft") {
            return NextResponse.json(
              { success: false, error: `Product "${pData.name || item.name}" is a draft and not for sale.` },
              { status: 400 }
            );
          }
        } catch (dbErr) {
          console.warn("Could not check product doc in DB:", dbErr);
        }
      }
      serverSubtotal += itemPrice * itemQty;
    }

    // Free Shipping Reward Verification
    let deliveryFee = typeof body.deliveryFee === "number" ? body.deliveryFee : 450;
    const shippingRewardId = body.shippingRewardId;
    let isShippingRewardVerified = false;

    if (shippingRewardId) {
      try {
        const shipSnap = await withTimeout(getDoc(doc(db, "spin_rewards", shippingRewardId)), 1200, null);
        if (shipSnap && shipSnap.exists()) {
          const sData = shipSnap.data();
          if (
            sData.rewardType === "free_shipping" &&
            sData.status !== "redeemed" &&
            new Date(sData.expiresAt).getTime() > Date.now()
          ) {
            deliveryFee = 0;
            isShippingRewardVerified = true;
          }
        }
      } catch (sErr) {
        console.warn("Could not verify shipping reward:", sErr);
      }
    }

    const isCard =
      (body.paymentMethod || "").toString().toLowerCase().includes("payhere") ||
      (body.paymentMethod || "").toString().toLowerCase().includes("card") ||
      (body.paymentMethod || "").toString().toLowerCase().includes("online");
    const isCod = !isCard;
    const codFee = isCod ? (typeof body.codFee === "number" ? body.codFee : 250) : 0;
    const couponDiscount = Math.max(0, Number(body.couponDiscount) || 0);

    const calculatedTotal = Math.max(0, serverSubtotal + deliveryFee + codFee - couponDiscount);

    // 1place.lk Unique Order ID: 1P-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const orderId = body.id || `1P-${randomDigits}`;

    const isGuest = !body.userId || body.userId === "guest";
    const userId = isGuest ? "guest" : String(body.userId);

    const initialPaymentStatus = isCod
      ? "Pending COD"
      : body.paymentStatus === "Cancelled" || body.paymentStatus === "Failed"
      ? body.paymentStatus
      : "Pending";

    const initialOrderStatus = isCod ? "Processing" : "Payment Pending";

    const orderPayload: any = {
      id: orderId,
      userId,
      customerName,
      address,
      district,
      city: body.city || district,
      province: body.province || "Western Province",
      primaryPhone,
      secondaryPhone: (body.secondaryPhone || body.codPhone2 || "").trim(),
      postalCode: (body.postalCode || body.codPostal || "").trim(),
      email: (body.email || "").trim().toLowerCase(),
      items,
      totalPrice: calculatedTotal,
      finalTotal: calculatedTotal,
      subtotal: serverSubtotal,
      deliveryFee,
      codFee,
      couponDiscount,
      couponCode: body.couponCode || "",
      deliveryOption: body.deliveryOption || "standard",
      deliveryAddress: {
        address,
        district,
        city: body.city || district,
        province: body.province || "Western Province",
        postalCode: (body.postalCode || body.codPostal || "").trim(),
      },
      paymentMethod: isCard ? "Online Card (PayHere)" : "Cash on Delivery (COD)",
      status: isCod ? "processing" : "pending",
      orderStatus: initialOrderStatus,
      paymentStatus: initialPaymentStatus,
      payherePaymentId: body.payherePaymentId || "",
      payhereVerified: false,
      payhereStatusCode: "0",
      cardFee: 0,
      payhereFee: 0,
      trackingNumber: `TRK-${randomDigits}`,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGuest,
    };

    // 1. Save full order to local persistent JSON store first so order is NEVER dropped or lost
    saveLocalOrder(orderPayload);

    // 2. Persist to Firestore. Do not report success if the durable write
    // fails: checkout will then try its browser-side Firestore fallback.
    try {
      const cleanPayload = sanitize(orderPayload);
      try {
        const adminDb = getAdminDb();
        await withRequiredTimeout(
          adminDb.collection("orders").doc(orderPayload.id).set(cleanPayload, { merge: true }),
          5000,
          "Order database write timed out."
        );
      } catch (adminWriteError) {
        try {
          await withRequiredTimeout(
            setDoc(doc(db, "orders", orderPayload.id), cleanPayload, { merge: true }),
            2500,
            "Order database fallback timed out."
          );
        } catch (clientWriteError) {
          console.error("[Orders API] Durable order save failed:", adminWriteError, clientWriteError);
          return NextResponse.json(
            { success: false, error: "We couldn't save your order yet. Please retry checkout." },
            { status: 503 }
          );
        }
      }

      // 2b. Mark promotional spin rewards as redeemed
      if (giftItems.length > 0) {
        for (const gift of giftItems) {
          const rId = (gift as any).rewardId || body.giftRewardId;
          if (rId) {
            withTimeout(
              updateDoc(doc(db, "spin_rewards", rId), {
                status: "redeemed",
                redeemedAt: new Date().toISOString(),
                orderId: orderPayload.id,
              }),
              1500,
              null
            ).catch(() => {});
          }
        }
      }

      if (isShippingRewardVerified && shippingRewardId) {
        withTimeout(
          updateDoc(doc(db, "spin_rewards", shippingRewardId), {
            status: "redeemed",
            redeemedAt: new Date().toISOString(),
            orderId: orderPayload.id,
          }),
          1500,
          null
        ).catch(() => {});
      }
    } catch (fsErr) {
      console.error("[Orders API] Durable order save failed:", fsErr);
      return NextResponse.json(
        { success: false, error: "We couldn't save your order yet. Please retry checkout." },
        { status: 503 }
      );
    }

    // 3. Deduct inventory synchronously before returning response for confirmed COD orders
    // Reuses the fresh product snapshot read during this checkout request (zero stale cache, zero duplicate reads)
    try {
      if (isCod && orderPayload.items && orderPayload.items.length > 0) {
        await withTimeout(
          deductProductStock(orderPayload.items, { prefetchedProducts }),
          2500,
          undefined
        );
      }
    } catch (stockErr) {
      console.warn("[Inventory Deduction Warning]:", stockErr);
    }

    return NextResponse.json({
      success: true,
      orderId: orderPayload.id,
      order: orderPayload,
    });
  } catch (err: any) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/orders - update status
export async function PATCH(req: Request) {
  try {
    const { id, status, orderStatus, paymentStatus, trackingNumber } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing order id" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (status) {
      updates.status = status;
      if (!orderStatus) updates.orderStatus = status;
    }
    if (orderStatus) {
      updates.orderStatus = orderStatus;
      if (!status) updates.status = orderStatus;
    }
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (trackingNumber) updates.trackingNumber = trackingNumber;

    updateLocalOrder(id, updates);

    try {
      try {
        const adminDb = getAdminDb();
        await withTimeout(adminDb.collection("orders").doc(id).set(updates, { merge: true }), 2000, null);
      } catch {
        await withTimeout(updateDoc(doc(db, "orders", id), updates), 1500, null);
      }
    } catch (e) {
      console.warn("Firestore status update warning (saved locally):", e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/orders - delete order(s)
export async function DELETE(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access to order deletion API." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("id");
    const queryIds = searchParams.get("ids");

    let idsToDelete: string[] = [];
    if (queryIds) {
      idsToDelete = queryIds.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (queryId) {
      idsToDelete = [queryId.trim()];
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: false, error: "Missing order id(s)" }, { status: 400 });
    }

    // Always delete from local store first
    for (const id of idsToDelete) deleteLocalOrder(id);

    try {
      const adminDb = getAdminDb();
      for (let offset = 0; offset < idsToDelete.length; offset += 450) {
        const batch = adminDb.batch();
        idsToDelete.slice(offset, offset + 450).forEach((id) => batch.delete(adminDb.collection("orders").doc(id)));
        await withTimeout(batch.commit(), 2000, null);
      }
    } catch (fsErr) {
      console.warn("Firestore batch delete warning (deleted locally):", fsErr);
    }

    return NextResponse.json({ success: true, deletedCount: idsToDelete.length });
  } catch (err: any) {
    console.error("DELETE /api/orders error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
