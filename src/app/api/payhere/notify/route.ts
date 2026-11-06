import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { deductProductStock } from "@/lib/stock-deduction";
import { updateLocalOrder } from "@/lib/orders-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const merchant_id = (formData.get("merchant_id") as string || "").trim();
    const order_id = (formData.get("order_id") as string || "").trim();
    const payment_id = (formData.get("payment_id") as string || "").trim();
    const payhere_amount = (formData.get("payhere_amount") as string || "").trim();
    const payhere_currency = (formData.get("payhere_currency") as string || "").trim().toUpperCase();
    const status_code = (formData.get("status_code") as string || "").trim();
    const md5sig = (formData.get("md5sig") as string || "").trim().toUpperCase();
    const method = (formData.get("method") as string || "").trim();
    const status_message = (formData.get("status_message") as string || "").trim();

    console.log(`[PayHere Webhook] Notification received for Order: ${order_id}, Status: ${status_code}, Payment ID: ${payment_id}`);

    // Read merchant secret strictly on the server
    const merchantSecret = (process.env.PAYHERE_MERCHANT_SECRET || "").trim();

    const configuredMerchantId = (process.env.PAYHERE_MERCHANT_ID || "").trim();
    if (!merchantSecret || !configuredMerchantId) {
      console.error("[PayHere Webhook] Server error: PAYHERE_MERCHANT_SECRET is not configured.");
      return NextResponse.json({ error: "PayHere merchant credentials are not configured." }, { status: 500 });
    }

    if (!order_id || !payment_id || !payhere_amount || !status_code || !/^[A-F0-9]{32}$/.test(md5sig)) {
      console.warn("[PayHere Webhook] Missing required parameters from PayHere.");
      return NextResponse.json({ error: "Missing required notification parameters." }, { status: 400 });
    }

    if (merchant_id !== configuredMerchantId) {
      console.error(`[PayHere Webhook] Merchant ID mismatch for Order ${order_id}.`);
      return NextResponse.json({ error: "Invalid merchant." }, { status: 400 });
    }

    // Official PayHere Webhook MD5 Signature Verification:
    // local_md5sig = strtoupper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(merchant_secret))))
    const secretHash = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
    const localMd5sig = crypto
      .createHash("md5")
      .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + secretHash)
      .digest("hex")
      .toUpperCase();

    const expectedSignature = Buffer.from(localMd5sig, "hex");
    const receivedSignature = Buffer.from(md5sig, "hex");
    if (expectedSignature.length !== receivedSignature.length || !crypto.timingSafeEqual(expectedSignature, receivedSignature)) {
      console.error(`[PayHere Webhook] Security Alert: Invalid MD5 signature mismatch for Order ${order_id}!`);
      return NextResponse.json({ error: "Invalid signature verification failed." }, { status: 400 });
    }

    // Locate the order in Firestore
    const orderRef = getAdminDb().collection("orders").doc(order_id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.warn(`[PayHere Webhook] Order document not found in Firestore: ${order_id}`);
      return NextResponse.json({ error: "Order not found; retry notification." }, { status: 503 });
    }

    const orderData = orderSnap.data();
    if (!orderData) {
      return NextResponse.json({ error: "Order data unavailable; retry notification." }, { status: 503 });
    }
    const nowIso = new Date().toISOString();

    // Prevent duplicate webhook processing (Idempotency check)
    if (String(orderData.paymentStatus || "").toLowerCase() === "paid" && orderData.payherePaymentId === payment_id) {
      console.log(`[PayHere Webhook] Duplicate notification ignored for already PAID order: ${order_id}`);
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    // ── Exact Minor-Unit (Integer Cents) Verification ──
    const storedTotal = orderData.finalTotal ?? orderData.totalPrice;
    if (storedTotal === undefined || storedTotal === null || storedTotal === "") {
      console.error(`[PayHere Webhook] Security Alert: Missing order total in Firestore for Order ${order_id}!`);
      return NextResponse.json({ error: "Order total missing in database records." }, { status: 400 });
    }

    const rawExpectedAmount = Number(storedTotal);
    const rawReceivedAmount = Number(payhere_amount);

    if (
      isNaN(rawExpectedAmount) ||
      !Number.isFinite(rawExpectedAmount) ||
      rawExpectedAmount <= 0 ||
      isNaN(rawReceivedAmount) ||
      !Number.isFinite(rawReceivedAmount) ||
      rawReceivedAmount <= 0
    ) {
      console.error(
        `[PayHere Webhook] Security Alert: Invalid or non-positive amount value for Order ${order_id}! Expected: ${rawExpectedAmount}, Received: ${payhere_amount}`
      );
      return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
    }

    // Convert both amounts to integer cents (minor units) to prevent floating-point precision errors
    const expectedCents = Math.round(rawExpectedAmount * 100);
    const receivedCents = Math.round(rawReceivedAmount * 100);

    if (
      !Number.isInteger(expectedCents) ||
      !Number.isInteger(receivedCents) ||
      expectedCents <= 0 ||
      receivedCents <= 0
    ) {
      console.error(
        `[PayHere Webhook] Security Alert: Minor-unit calculation failed for Order ${order_id}!`
      );
      return NextResponse.json({ error: "Invalid minor-unit calculation." }, { status: 400 });
    }

    // Require both integer cents amounts to match exactly
    if (expectedCents !== receivedCents) {
      console.error(
        `[PayHere Webhook] Security Alert: Amount mismatch for Order ${order_id}! Expected cents: ${expectedCents} (LKR ${rawExpectedAmount.toFixed(2)}), Received cents: ${receivedCents} (LKR ${rawReceivedAmount.toFixed(2)})`
      );
      await orderRef.update({
        paymentStatus: "amount_mismatch",
        payhereStatusCode: status_code,
        payhereStatusMessage: `Amount mismatch: expected ${rawExpectedAmount.toFixed(2)}, received ${rawReceivedAmount.toFixed(2)}`,
        updatedAt: nowIso,
      });
      return NextResponse.json({ error: "Amount mismatch detected." }, { status: 400 });
    }

    // Require currency to be strictly LKR
    if (payhere_currency !== "LKR") {
      console.error(`[PayHere Webhook] Currency mismatch for Order ${order_id}: ${payhere_currency}`);
      return NextResponse.json({ error: "Invalid currency detected. Only LKR is supported." }, { status: 400 });
    }

    // PayHere Status Codes:
    // 2  = Successful payment
    // 0  = Pending payment
    // -1 = Canceled payment
    // -2 = Failed payment
    // -3 = Chargedback payment
    switch (status_code) {
      case "2": {
        const updateFields = {
          paymentStatus: "Paid",
          status: orderData.status === "cancelled" ? "cancelled" : "processing",
          orderStatus: orderData.status === "cancelled" ? "Cancelled" : "Processing",
          payherePaymentId: payment_id,
          paidAmount: rawReceivedAmount,
          currency: payhere_currency,
          paymentMethod: `PayHere (${method || "Online Card"})`,
          payhereStatusCode: "2",
          payhereStatusMessage: status_message || "Payment completed successfully",
          payhereVerified: true,
          paidAt: nowIso,
          updatedAt: nowIso,
        };

        const applied = await orderRef.firestore.runTransaction(async (transaction) => {
          const latestSnap = await transaction.get(orderRef);
          if (!latestSnap.exists) return false;
          const latest = latestSnap.data()!;
          if (String(latest.paymentStatus || "").toLowerCase() === "paid") return false;
          transaction.update(orderRef, updateFields);
          return true;
        });
        if (!applied) {
          return NextResponse.json({ status: "already_processed" }, { status: 200 });
        }
        updateLocalOrder(order_id, updateFields);

        // Deduct stock for ordered items upon successful webhook verification
        try {
          if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
            await deductProductStock(orderData.items);
          }
        } catch (stockErr) {
          console.warn("[PayHere Webhook] Stock deduction warning:", stockErr);
        }

        console.log(`[PayHere Webhook] SUCCESS: Order ${order_id} marked as PAID (LKR ${payhere_amount}, Payment ID: ${payment_id})`);
        break;
      }

      case "0": {
        const updateFields = {
          paymentStatus: "Pending",
          payherePaymentId: payment_id,
          payhereStatusCode: "0",
          payhereStatusMessage: status_message || "Payment is pending authorization",
          payhereVerified: false,
          updatedAt: nowIso,
        };
        await orderRef.update(updateFields);
        updateLocalOrder(order_id, updateFields);
        console.log(`[PayHere Webhook] PENDING: Order ${order_id} marked as pending.`);
        break;
      }

      case "-1": {
        const updateFields = {
          paymentStatus: "Cancelled",
          status: "cancelled",
          orderStatus: "Cancelled",
          payhereStatusCode: "-1",
          payhereStatusMessage: status_message || "Payment was cancelled by user",
          payhereVerified: false,
          updatedAt: nowIso,
        };
        await orderRef.update(updateFields);
        updateLocalOrder(order_id, updateFields);
        console.log(`[PayHere Webhook] CANCELLED: Order ${order_id} marked as cancelled.`);
        break;
      }

      case "-2": {
        const updateFields = {
          paymentStatus: "Failed",
          status: "cancelled",
          orderStatus: "Cancelled",
          payhereStatusCode: "-2",
          payhereStatusMessage: status_message || "Payment failed or declined by issuing bank",
          payhereVerified: false,
          updatedAt: nowIso,
        };
        await orderRef.update(updateFields);
        updateLocalOrder(order_id, updateFields);
        console.warn(`[PayHere Webhook] FAILED: Order ${order_id} payment failed.`);
        break;
      }

      case "-3": {
        const updateFields = {
          paymentStatus: "Charged Back",
          status: "cancelled",
          orderStatus: "Cancelled",
          payhereStatusCode: "-3",
          payhereStatusMessage: status_message || "Payment charged back",
          payhereVerified: false,
          updatedAt: nowIso,
        };
        await orderRef.update(updateFields);
        updateLocalOrder(order_id, updateFields);
        console.warn(`[PayHere Webhook] CHARGED BACK: Order ${order_id}`);
        break;
      }

      default: {
        console.warn(`[PayHere Webhook] Unhandled status code: ${status_code} for order ${order_id}`);
        const updateFields = {
          payhereStatusCode: status_code,
          payhereStatusMessage: status_message || `Status: ${status_code}`,
          updatedAt: nowIso,
        };
        await orderRef.update(updateFields);
        updateLocalOrder(order_id, updateFields);
        break;
      }
    }

    return NextResponse.json({ status: "success", orderId: order_id, statusCode: status_code });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    console.error("[PayHere Webhook] Internal server error handling webhook:", errMsg);
    return NextResponse.json(
      { error: "Internal server error processing notification." },
      { status: 500 }
    );
  }
}
