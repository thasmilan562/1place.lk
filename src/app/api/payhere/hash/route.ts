import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, currency = "LKR" } = body;

    // Strict validation
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      return NextResponse.json({ error: "A valid orderId is required." }, { status: 400 });
    }

    const cleanOrderId = orderId.trim();

    // Only sign an existing, unpaid PayHere order using the server-stored total.
    const orderSnap = await getAdminDb().collection("orders").doc(cleanOrderId).get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: "The order was not found." }, { status: 404 });
    }
    const orderData = orderSnap.data()!;
    if (!String(orderData.paymentMethod || "").toLowerCase().includes("payhere")) {
      return NextResponse.json({ error: "This order is not configured for PayHere." }, { status: 400 });
    }
    if (String(orderData.paymentStatus || "").toLowerCase() === "paid" || orderData.payhereVerified === true) {
      return NextResponse.json({ error: "This order has already been paid." }, { status: 409 });
    }
    const storedTotal = orderData.finalTotal ?? orderData.totalPrice;
    const verifiedAmount = Number(storedTotal);

    if (isNaN(verifiedAmount) || !Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      return NextResponse.json({ error: "A valid positive amount is required." }, { status: 400 });
    }

    const cleanCurrency = String(currency || "LKR").trim().toUpperCase();
    if (cleanCurrency !== "LKR") {
      return NextResponse.json({ error: "Only LKR currency is supported." }, { status: 400 });
    }

    // Read credentials securely strictly from server-side environment variables
    const merchantId = (process.env.PAYHERE_MERCHANT_ID || "").trim();
    const merchantSecret = (process.env.PAYHERE_MERCHANT_SECRET || "").trim();
    if (!merchantId || !merchantSecret || /placeholder|replace|your_/i.test(merchantSecret)) {
      return NextResponse.json({ error: "PayHere merchant credentials are not configured." }, { status: 503 });
    }

    // PayHere requires amount formatted to strictly 2 decimal places (e.g. "1000.00")
    const amountInCents = Math.round(verifiedAmount * 100);
    const formattedAmount = (amountInCents / 100).toFixed(2);

    // Official PayHere Hash formula:
    // Hash = strtoupper(md5(merchant_id + order_id + formatted_amount + currency + strtoupper(md5(merchant_secret))))
    const secretHash = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
    const hash = crypto
      .createHash("md5")
      .update(merchantId + cleanOrderId + formattedAmount + cleanCurrency + secretHash)
      .digest("hex")
      .toUpperCase();

    // Determine site base URL strictly from server environment
    const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
    if (!configuredSiteUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is required for PayHere redirects." }, { status: 503 });
    }
    const siteBaseUrl = new URL(configuredSiteUrl).origin;

    const mode = (process.env.PAYHERE_MODE || "sandbox").trim().toLowerCase();
    if (mode !== "sandbox" && mode !== "live") {
      return NextResponse.json({ error: "PAYHERE_MODE must be set to sandbox or live." }, { status: 503 });
    }

    return NextResponse.json({
      hash,
      merchantId,
      amount: formattedAmount,
      currency: cleanCurrency,
      orderId: cleanOrderId,
      mode,
      sandbox: mode === "sandbox",
      returnUrl: `${siteBaseUrl}/payment/success`,
      cancelUrl: `${siteBaseUrl}/payment/cancel`,
      notifyUrl: `${siteBaseUrl}/api/payhere/notify`,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[PayHere Hash] Error generating hash:", errMsg);
    return NextResponse.json(
      { error: "Failed to generate secure payment signature." },
      { status: 500 }
    );
  }
}
