import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { fallbackOfferBanners } from "@/lib/data";
import { OfferBanner } from "@/lib/types";
import { cachedFetch, CACHE_TTL } from "@/lib/data-cache";
import { getOfferBanners } from "@/lib/firestore-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, subtotal = 0, userId = "guest" } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { valid: false, message: "Please enter a valid coupon code." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const normalizedCode = cleanCode.replace(/\s+/g, "");
    if (normalizedCode === "STREET10" || cleanCode === "STREET 10") {
      return NextResponse.json(
        { valid: false, message: "This promo code is currently disabled or inactive." },
        { status: 400 }
      );
    }

    const orderSubtotal = Math.max(0, Number(subtotal) || 0);

    if (cleanCode === "1PLACE10") {
      const discountAmount = Math.min(orderSubtotal, Math.round(orderSubtotal * 0.1));
      return NextResponse.json({
        valid: true,
        code: cleanCode,
        discountAmount,
        discountType: "percentage",
        message: "Promo code '1PLACE10' applied — 10% off your order.",
      });
    }

    // 1. First check dedicated 'coupons' collection with in-memory caching
    try {
      const allCoupons = await cachedFetch("coupons:all", async () => {
        const couponSnap = await getDocs(collection(db, "coupons"));
        return couponSnap.docs.map((d) => ({ ...d.data(), id: d.id } as any));
      }, CACHE_TTL.SETTINGS);

      const matchedCoupon = (allCoupons || []).find(
        (c: any) => c.code && c.code.trim().toUpperCase() === cleanCode
      );

      if (matchedCoupon) {
        // Check if disabled
        if (matchedCoupon.status === "disabled") {
          return NextResponse.json(
            { valid: false, message: "This promo code is currently inactive or disabled." },
            { status: 400 }
          );
        }

        const now = new Date();

        // Check start date
        if (matchedCoupon.startAt) {
          const startDate = new Date(matchedCoupon.startAt);
          if (!isNaN(startDate.getTime()) && now < startDate) {
            return NextResponse.json(
              { valid: false, message: "This promo code is not active yet." },
              { status: 400 }
            );
          }
        }

        // Check expiry date
        if (matchedCoupon.endAt && !matchedCoupon.noExpiry) {
          const endDate = new Date(matchedCoupon.endAt);
          if (!isNaN(endDate.getTime()) && now > endDate) {
            return NextResponse.json(
              { valid: false, message: "This promo code has expired." },
              { status: 400 }
            );
          }
        }

        // Check target audience
        if (matchedCoupon.targetAudience === "logged_in" && (!userId || userId === "guest")) {
          return NextResponse.json(
            { valid: false, message: "This promo code is exclusively for registered members. Please sign in to apply." },
            { status: 403 }
          );
        }

        // Check minimum spend
        if (matchedCoupon.minSpend && orderSubtotal < Number(matchedCoupon.minSpend)) {
          return NextResponse.json(
            {
              valid: false,
              message: `A minimum order spend of Rs. ${Number(matchedCoupon.minSpend).toLocaleString()} is required to use this code.`,
            },
            { status: 400 }
          );
        }

        // Calculate discount
        let discountAmount = 0;
        if (matchedCoupon.discountType === "percentage") {
          const percent = Math.min(100, Math.max(1, Number(matchedCoupon.discountValue) || 10));
          discountAmount = Math.round(orderSubtotal * (percent / 100));
          if (matchedCoupon.maxDiscount && matchedCoupon.maxDiscount > 0) {
            discountAmount = Math.min(discountAmount, Number(matchedCoupon.maxDiscount));
          }
        } else if (matchedCoupon.discountType === "free_shipping") {
          discountAmount = 450;
        } else {
          // fixed
          discountAmount = Number(matchedCoupon.discountValue) || 0;
        }

        discountAmount = Math.min(discountAmount, orderSubtotal);

        return NextResponse.json({
          valid: true,
          code: cleanCode,
          discountAmount,
          discountType: matchedCoupon.discountType || "percentage",
          message: `Promo code '${cleanCode}' applied successfully!`,
        });
      }
    } catch (couponErr) {
      console.warn("Error checking coupons collection:", couponErr);
    }

    // 2. Fallback: Fetch active offer banners from cached store
    let allBanners: OfferBanner[] = [];
    try {
      allBanners = await getOfferBanners();
    } catch (err) {
      console.warn("Coupon fallback offer banners error:", err);
      allBanners = fallbackOfferBanners;
    }

    if (!allBanners || allBanners.length === 0) {
      allBanners = fallbackOfferBanners;
    }

    // 2. Find coupon matching code
    const matchedBanner = allBanners.find(
      (b) =>
        b.couponCode &&
        b.couponCode.trim().toUpperCase() === cleanCode &&
        (b.status === "active" || !b.status)
    );

    if (!matchedBanner) {
      return NextResponse.json(
        { valid: false, message: "Invalid or unrecognized coupon code." },
        { status: 404 }
      );
    }

    const now = new Date();

    // 3. Validate Start Date
    if (matchedBanner.startAt) {
      const startDate = new Date(matchedBanner.startAt);
      if (!isNaN(startDate.getTime()) && now < startDate) {
        return NextResponse.json(
          { valid: false, message: "This coupon is not active yet." },
          { status: 400 }
        );
      }
    }

    // 4. Validate End Date
    if (matchedBanner.endAt && !matchedBanner.noExpiry) {
      const endDate = new Date(matchedBanner.endAt);
      if (!isNaN(endDate.getTime()) && now > endDate) {
        return NextResponse.json(
          { valid: false, message: "This coupon has expired." },
          { status: 400 }
        );
      }
    }

    // 5. Validate Target Audience (Logged-in vs Guest)
    if (matchedBanner.targetAudience === "logged_in" && (!userId || userId === "guest")) {
      return NextResponse.json(
        { valid: false, message: "This coupon is exclusively for registered members. Please sign in to apply." },
        { status: 403 }
      );
    }

    // 6. Calculate Dynamic Discount Amount
    let discountAmount = 0;
    const headline = (matchedBanner.headline || "").toLowerCase();
    const desc = (matchedBanner.description || "").toLowerCase();
    const highlight = (matchedBanner.highlightText || "").toLowerCase();
    const combinedText = `${headline} ${desc} ${highlight}`;

    // Check if free shipping coupon
    if (cleanCode.includes("SHIP") || combinedText.includes("free delivery") || combinedText.includes("free shipping")) {
      const standardDeliveryFee = 450;
      discountAmount = standardDeliveryFee;
    } else if (combinedText.includes("%") || cleanCode.includes("10") || cleanCode.includes("15") || cleanCode.includes("20")) {
      // Extract percentage if available, default to 10%
      const match = combinedText.match(/(\d+)\s*%/);
      const percent = match ? Math.min(50, Math.max(1, parseInt(match[1], 10))) : 10;
      discountAmount = Math.round(orderSubtotal * (percent / 100));
    } else {
      // Fixed LKR discount
      const match = combinedText.match(/lkr\s*([\d,]+)/) || combinedText.match(/rs\.?\s*([\d,]+)/);
      if (match) {
        discountAmount = parseInt(match[1].replace(/,/g, ""), 10) || 500;
      } else {
        discountAmount = Math.min(orderSubtotal, 500);
      }
    }

    // Cap discount to order subtotal
    discountAmount = Math.min(discountAmount, orderSubtotal);

    return NextResponse.json({
      valid: true,
      code: cleanCode,
      discountAmount,
      bannerId: matchedBanner.id,
      headline: matchedBanner.headline || "Coupon Applied",
      message: `Coupon '${cleanCode}' applied successfully!`,
    });
  } catch (err: any) {
    console.error("POST /api/coupons/validate error:", err);
    return NextResponse.json(
      { valid: false, message: "An error occurred while validating the coupon." },
      { status: 500 }
    );
  }
}
