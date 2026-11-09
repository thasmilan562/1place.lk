import { NextResponse } from "next/server";
import { getLocalOrders, saveLocalOrder, updateLocalOrderStatus, deleteLocalOrder, OrderRecord } from "@/lib/orders-store";
import { verifyAdminRequest } from "@/lib/admin-auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, getDoc, query, where, limit, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { deductProductStock } from "@/lib/stock-deduction";

// GET /api/orders - returns orders with secure filtering
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim();
    const userId = searchParams.get("userId")?.trim();
    const orderId = searchParams.get("id")?.trim();
    const includeUnpaid = searchParams.get("includeUnpaid") === "true";

    // 1. Read local persistent orders
    const localList = getLocalOrders();

    // 2. Read Firestore orders
    let firestoreList: OrderRecord[] = [];
    try {
      if (orderId) {
        const directDoc = await getDoc(doc(db, "orders", orderId));
        if (directDoc.exists()) {
          firestoreList = [{ ...directDoc.data(), id: directDoc.id } as OrderRecord];
        } else {
          // Fallback query matching suffix
          const snap = await getDocs(query(collection(db, "orders"), limit(100)));
          firestoreList = snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderRecord));
        }
      } else if (userId && userId !== "guest") {
        const q = query(collection(db, "orders"), where("userId", "==", userId), limit(50));
        const snap = await getDocs(q);
        firestoreList = snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderRecord));
      } else if (phone) {
        const q = query(collection(db, "orders"), where("primaryPhone", "==", phone), limit(20));
        const snap = await getDocs(q);
        if (!snap.empty) {
          firestoreList = snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderRecord));
        } else {
          const generalSnap = await getDocs(query(collection(db, "orders"), limit(100)));
          firestoreList = generalSnap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderRecord));
        }
      } else {
        const snap = await getDocs(query(collection(db, "orders"), limit(200)));
        firestoreList = snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderRecord));
      }
    } catch (e) {
      console.warn("API GET orders Firestore read error (using local store):", e);
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
    return NextResponse.json({ success: false, error: err.message, orders: getLocalOrders() });
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

      // Verify reward on server
      for (const gift of giftItems) {
        const rewardId = gift.rewardId || body.giftRewardId;
        if (rewardId) {
          try {
            const rewardDocRef = doc(db, "spin_rewards", rewardId);
            const rewardSnap = await getDoc(rewardDocRef);
            if (rewardSnap.exists()) {
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

    // Zero / Invalid Price & Quantity Protection
    let serverSubtotal = 0;
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
        // Price for verified free gift is 0
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

      // Server-side database verification if productId provided
      if (item.productId) {
        try {
          const pDoc = await getDoc(doc(db, "products", item.productId));
          if (pDoc.exists()) {
            const pData = pDoc.data();
            if (pData.status === "draft") {
              return NextResponse.json(
                { success: false, error: `Product "${pData.name || item.name}" is a draft and not for sale.` },
                { status: 400 }
              );
            }
            const dbBasePrice = Number(pData.price) || 0;
            const hasCombos = Array.isArray(pData.variant_combos) && pData.variant_combos.length > 0;
            if (dbBasePrice <= 0 && !hasCombos) {
              return NextResponse.json(
                { success: false, error: `Product "${pData.name || item.name}" does not have an active price assigned.` },
                { status: 400 }
              );
            }
          }
        } catch (dbErr) {
          console.warn("Could not check product doc in DB:", dbErr);
        }
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
      serverSubtotal += itemPrice * itemQty;
    }

    // Free Shipping Reward Verification
    let deliveryFee = typeof body.deliveryFee === "number" ? body.deliveryFee : 450;
    const shippingRewardId = body.shippingRewardId;
    let isShippingRewardVerified = false;

    if (shippingRewardId) {
      try {
        const shipSnap = await getDoc(doc(db, "spin_rewards", shippingRewardId));
        if (shipSnap.exists()) {
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

    const newOrder: OrderRecord = {
      id: orderId,
      userId,
      customerName,
      address,
      district,
      primaryPhone,
      secondaryPhone: (body.secondaryPhone || body.codPhone2 || "").trim(),
      postalCode: (body.postalCode || body.codPostal || "").trim(),
      items,
      totalPrice: calculatedTotal,
      paymentMethod: isCard ? "Online Card (PayHere)" : "Cash on Delivery (COD)",
      status: isCod ? "processing" : "pending",
      paymentStatus: initialPaymentStatus,
      payherePaymentId: body.payherePaymentId || "",
      payhereVerified: false,
      cardFee: 0,
      payhereFee: 0,
      createdAt: body.createdAt || new Date().toISOString(),
    };

    // 1. Save to local JSON store
    saveLocalOrder(newOrder);

    // 2. Persist to Firestore
    try {
      const orderPayload = {
        ...newOrder,
        isGuest,
        email: (body.email || "").trim().toLowerCase(),
        deliveryAddress: {
          address: newOrder.address,
          district: newOrder.district,
          city: body.city || newOrder.district,
          province: body.province || "Western Province",
          postalCode: newOrder.postalCode,
        },
        deliveryOption: body.deliveryOption || "standard",
        deliveryFee,
        codFee,
        couponDiscount,
        couponCode: body.couponCode || "",
        subtotal: serverSubtotal,
        finalTotal: calculatedTotal,
        orderStatus: initialOrderStatus,
        payhereStatusCode: "0",
        trackingNumber: `TRK-${randomDigits}`,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "orders", newOrder.id), orderPayload, { merge: true });

      // 2b. Mark promotional spin rewards as redeemed
      if (giftItems.length > 0) {
        for (const gift of giftItems) {
          const rId = (gift as any).rewardId || body.giftRewardId;
          if (rId) {
            try {
              await updateDoc(doc(db, "spin_rewards", rId), {
                status: "redeemed",
                redeemedAt: new Date().toISOString(),
                orderId: newOrder.id,
              });
            } catch (rErr) {
              console.warn("Could not mark gift reward as redeemed:", rErr);
            }
          }
        }
      }

      if (isShippingRewardVerified && shippingRewardId) {
        try {
          await updateDoc(doc(db, "spin_rewards", shippingRewardId), {
            status: "redeemed",
            redeemedAt: new Date().toISOString(),
            orderId: newOrder.id,
          });
        } catch (sErr) {
          console.warn("Could not mark shipping reward as redeemed:", sErr);
        }
      }
    } catch (fsErr) {
      console.warn("Firestore save warning (order safely kept in local store):", fsErr);
    }

    // 3. Automatically deduct inventory for confirmed COD orders
    try {
      if (isCod && newOrder.items && newOrder.items.length > 0) {
        await deductProductStock(newOrder.items);
      }
    } catch (stockErr) {
      console.warn("[Inventory Deduction Warning]:", stockErr);
    }

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      order: newOrder,
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
    if (status) updates.status = status;
    if (orderStatus) updates.orderStatus = orderStatus;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (trackingNumber) updates.trackingNumber = trackingNumber;

    updateLocalOrderStatus(id, status || orderStatus);

    try {
      await updateDoc(doc(db, "orders", id), updates);
    } catch (e) {
      console.warn("Firestore status update warning:", e);
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

    const db = getAdminDb();
    for (let offset = 0; offset < idsToDelete.length; offset += 450) {
      const batch = db.batch();
      idsToDelete.slice(offset, offset + 450).forEach((id) => batch.delete(db.collection("orders").doc(id)));
      await batch.commit();
    }
    if (process.env.NODE_ENV !== "production") {
      for (const id of idsToDelete) deleteLocalOrder(id);
    }

    return NextResponse.json({ success: true, deletedCount: idsToDelete.length });
  } catch (err: any) {
    console.error("DELETE /api/orders error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
