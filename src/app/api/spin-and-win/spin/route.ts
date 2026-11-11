import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { SpinPromotionSettings, SpinReward, SpinSegment } from "@/lib/types";
import { DEFAULT_SPIN_SETTINGS } from "@/lib/spin-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, customerName, customerEmail, customerPhone } = body;

    let adminDb: any = null;
    try {
      adminDb = getAdminDb();
    } catch (e) {
      console.warn("Firebase Admin SDK not available, continuing with defaults:", e);
    }

    // 1. Fetch current settings
    let settings: SpinPromotionSettings = DEFAULT_SPIN_SETTINGS;
    if (adminDb) {
      try {
        const settingsSnap = await adminDb.collection("settings").doc("spin_and_win").get();
        if (settingsSnap.exists) {
          settings = {
            ...DEFAULT_SPIN_SETTINGS,
            ...(settingsSnap.data() as SpinPromotionSettings),
          };
        }
      } catch (err) {
        console.warn("Could not read spin settings from adminDb:", err);
      }
    }

    if (!settings.enabled) {
      return NextResponse.json(
        { success: false, error: "The Spin & Win promotion is currently closed." },
        { status: 400 }
      );
    }

    // 2. Strict Duplicate Prevention & Eligibility Check
    if (adminDb) {
      try {
        if (userId && userId !== "guest") {
          const snapUser = await adminDb.collection("spin_rewards").where("userId", "==", userId).limit(1).get();
          if (!snapUser.empty) {
            const existing = snapUser.docs[0].data();
            return NextResponse.json(
              {
                success: false,
                error: "You have already participated in the First Order Spin & Win.",
                existingReward: { id: snapUser.docs[0].id, ...existing },
              },
              { status: 400 }
            );
          }

          // Check prior orders
          const snapOrders = await adminDb.collection("orders").where("userId", "==", userId).get();
          const qualifyingOrders = snapOrders.docs.filter((d: any) => {
            const o = d.data();
            const status = (o.status || o.orderStatus || "").toLowerCase();
            return status !== "cancelled" && status !== "failed";
          });

          if (qualifyingOrders.length > 0) {
            return NextResponse.json(
              {
                success: false,
                error: "Spin & Win is strictly reserved for your first order.",
              },
              { status: 400 }
            );
          }
        }

        if (customerPhone) {
          const cleanPhone = customerPhone.replace(/\D/g, "");
          if (cleanPhone.length >= 9) {
            const snapPhone = await adminDb.collection("spin_rewards").where("customerPhone", "==", customerPhone).limit(1).get();
            if (!snapPhone.empty) {
              const existing = snapPhone.docs[0].data();
              return NextResponse.json(
                {
                  success: false,
                  error: "This phone number has already claimed a Spin & Win reward.",
                  existingReward: { id: snapPhone.docs[0].id, ...existing },
                },
                { status: 400 }
              );
            }
          }
        }
      } catch (eligErr) {
        console.warn("Eligibility check warn:", eligErr);
      }
    }

    // 3. Selection: STRICT REQUIREMENT - Spin wheel MUST ALWAYS land on 10% DISCOUNT only.
    const segments = settings.segments || DEFAULT_SPIN_SETTINGS.segments;

    let discount10Index = segments.findIndex(
      (s) => s.id === "seg_discount" || s.discountPercent === 10 || s.label.includes("10%")
    );

    let selectedSegment: SpinSegment;
    let winningSegmentIndex: number;

    if (discount10Index >= 0) {
      selectedSegment = segments[discount10Index];
      winningSegmentIndex = discount10Index;
    } else {
      selectedSegment = {
        id: "seg_discount",
        label: "10% DISCOUNT",
        subLabel: "On First Checkout",
        type: "discount",
        color: "#111111",
        textColor: "#F59E0B",
        icon: "tag",
        discountPercent: 10,
        probability: 100,
        inventory: 9999,
        claimedCount: 0,
      };
      winningSegmentIndex = Math.max(0, segments.length - 1);
    }

    // 4. Clean discount product descriptor
    const giftProductDetails = {
      id: "PROMO-10PERCENT",
      name: "10% Off First Order Discount",
      price: 0,
      originalPrice: 0,
      image: "/assets/promo/gift-box.png",
      slug: "spin-win-10-discount",
      couponCode: "1PLACE10",
      discountPercent: 10,
    };

    // 5. Generate Reward Record
    const rewardId = `RW-SPIN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const expiryDays = settings.rewardExpiryDays || 7;
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const newReward: SpinReward = {
      id: rewardId,
      userId: userId || "guest",
      customerName: customerName || "First Order Customer",
      customerEmail: customerEmail || "",
      customerPhone: customerPhone || "",
      rewardType: "discount",
      segmentId: selectedSegment.id,
      segmentLabel: selectedSegment.label || "10% DISCOUNT",
      productId: giftProductDetails.id,
      productName: "10% Off First Order Discount",
      productImage: "/assets/promo/gift-box.png",
      discountPercent: 10,
      couponCode: "1PLACE10",
      status: "issued",
      issuedAt: now.toISOString(),
      expiresAt,
    };

    const cleanRewardData = Object.fromEntries(
      Object.entries(newReward).filter(([_, v]) => v !== undefined)
    );

    // 6. Save reward to Firestore via adminDb
    if (adminDb) {
      try {
        await adminDb.collection("spin_rewards").doc(rewardId).set(cleanRewardData);
      } catch (saveErr) {
        console.warn("Could not write reward to adminDb:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      winningSegmentIndex: winningSegmentIndex >= 0 ? winningSegmentIndex : 0,
      segment: selectedSegment,
      reward: newReward,
      giftProduct: giftProductDetails,
    });
  } catch (err: any) {
    console.error("POST /api/spin-and-win/spin error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process spin." },
      { status: 500 }
    );
  }
}
