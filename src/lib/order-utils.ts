import { jsPDF } from "jspdf";
import { BUSINESS_INFO } from "@/lib/business-info";

export interface NormalizedOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  color?: string;
  storage?: string;
  ram?: string;
  sku?: string;
  warrantyTitle?: string;
  warrantyPrice?: number;
  lineTotal: number;
}

export interface OrderAuditEntry {
  adminId?: string;
  previousStatus?: string;
  newStatus?: string;
  action: string;
  timestamp: string;
  note?: string;
}

export interface NormalizedOrder {
  id: string;
  orderId: string;
  createdAt: string;
  updatedAt?: string;
  customerName: string;
  customerEmail: string;
  primaryPhone: string;
  alternativePhone: string;
  deliveryAddress: {
    address: string;
    city: string;
    district: string;
    province: string;
    postalCode: string;
    landmark?: string;
    instructions?: string;
  };
  items: NormalizedOrderItem[];
  subtotal: number;
  warrantyTotal: number;
  deliveryFee: number;
  codFee: number;
  cardFee?: number;
  discountTotal: number;
  grandTotal: number;
  currency: string;
  paymentMethod: "COD" | "PayHere" | "WhatsApp" | string;
  paymentStatus: "Pending" | "Paid" | "Failed" | "Cancelled" | "Refunded" | "Charged Back";
  orderStatus: "Pending" | "Confirmed" | "Processing" | "Packed" | "Shipped" | "Out for Delivery" | "Delivered" | "Cancelled" | "Returned";
  transactionId?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  statusHistory: OrderAuditEntry[];
  internalNotes?: string;
  needsReview: boolean;
  rawDoc: any;
}

/**
 * Single normalized order/customer mapping function.
 * Handles field variations and prevents 'undefined' text from leaking into the UI or DB.
 */
export function normalizeOrder(docData: any, docId: string): NormalizedOrder {
  const data = docData || {};
  const id = docId || data.id || `ORD-${Date.now()}`;

  // 1. Resolve Customer Name safely
  let rawName =
    data.customerName ||
    data.name ||
    data.fullName ||
    data.deliveryAddress?.name ||
    data.shippingAddress?.name ||
    (data.deliveryAddress?.firstName
      ? `${data.deliveryAddress.firstName} ${data.deliveryAddress.lastName || ""}`.trim()
      : "") ||
    (data.firstName ? `${data.firstName} ${data.lastName || ""}`.trim() : "") ||
    "";

  if (typeof rawName !== "string" || rawName.trim() === "" || rawName.trim().toLowerCase() === "undefined") {
    const fallbackPhone = data.primaryPhone || data.phone || data.deliveryAddress?.phone;
    rawName = fallbackPhone ? `Customer (${fallbackPhone})` : "Not provided";
  } else {
    rawName = rawName.trim();
  }

  // 2. Resolve Contact Numbers & Email
  const primaryPhone = data.primaryPhone || data.phone || data.deliveryAddress?.phone || "Not provided";
  const alternativePhone = data.alternativePhone || data.altPhone || data.secondaryPhone || data.deliveryAddress?.altPhone || "";
  const customerEmail = data.customerEmail || data.email || data.deliveryAddress?.email || "Not provided";

  // 3. Resolve Delivery Address
  const addrObj = data.deliveryAddress || data.shippingAddress || {};
  const deliveryAddress = {
    address: addrObj.address || data.address || "No street address provided",
    city: addrObj.city || data.city || "",
    district: addrObj.district || data.district || "",
    province: addrObj.province || data.province || "",
    postalCode: addrObj.postalCode || data.postalCode || "",
    landmark: addrObj.landmark || data.landmark || "",
    instructions: addrObj.instructions || data.instructions || "",
  };

  // 4. Resolve & Normalize Order Items
  const rawItems = Array.isArray(data.items) ? data.items : [];
  let calculatedSubtotal = 0;

  const items: NormalizedOrderItem[] = rawItems.map((item: any) => {
    const pPrice = typeof item.price === "number" && !isNaN(item.price) ? item.price : 0;
    const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
    const lineTotal = pPrice * qty;
    calculatedSubtotal += lineTotal;

    return {
      productId: item.productId || item.id || "N/A",
      name: item.name || "Unknown Product",
      price: pPrice,
      quantity: qty,
      image: item.image || item.images?.[0] || "/placeholder.png",
      color: item.color || item.selectedColor || "",
      storage: item.storage || item.selectedStorage || "",
      ram: item.ram || "",
      sku: item.sku || "",
      warrantyTitle: item.warrantyTitle || item.warranty || "",
      warrantyPrice: item.warrantyPrice || 0,
      lineTotal,
    };
  });

  // 5. Resolve Fees & Discounts
  const deliveryFee = typeof data.deliveryFee === "number" ? data.deliveryFee : 0;
  const codFee = typeof data.codFee === "number" ? data.codFee : 0;
  const cardFee = typeof data.cardFee === "number" ? data.cardFee : typeof data.payhereFee === "number" ? data.payhereFee : 0;
  const warrantyTotal = typeof data.warrantyTotal === "number" ? data.warrantyTotal : 0;
  const discountTotal = typeof data.discountTotal === "number" ? data.discountTotal : data.couponDiscount || 0;

  // 6. Recalculate Grand Total & Check for Zero Total Anomaly
  let grandTotal = typeof data.finalTotal === "number" ? data.finalTotal : typeof data.grandTotal === "number" ? data.grandTotal : typeof data.totalPrice === "number" ? data.totalPrice : 0;
  let needsReview = false;

  const reconstructedTotal = calculatedSubtotal + deliveryFee + codFee + cardFee + warrantyTotal - discountTotal;

  if (grandTotal === 0 && reconstructedTotal > 0) {
    grandTotal = reconstructedTotal;
  } else if (grandTotal === 0 && calculatedSubtotal === 0 && items.length === 0) {
    needsReview = true;
  }

  // 7. Resolve Separate Statuses
  const isCardOrPayHere =
    (data.paymentMethod || "").toString().toLowerCase().includes("payhere") ||
    (data.paymentMethod || "").toString().toLowerCase().includes("card");

  let paymentStatus: NormalizedOrder["paymentStatus"] = "Pending";
  const rawPaymentStatus = (data.paymentStatus || "").toString().toLowerCase();

  if (isCardOrPayHere) {
    // For Card / PayHere: strictly require server webhook verification (status_code 2)
    // to prevent incomplete/unauthorized card attempts (e.g. before 6-digit OTP is entered) from displaying as Paid
    if (rawPaymentStatus.includes("refund")) {
      paymentStatus = "Refunded";
    } else if (rawPaymentStatus.includes("charge") || data.payhereStatusCode === "-3") {
      paymentStatus = "Charged Back";
    } else if (data.payhereStatusCode === "2" || (data.payhereVerified === true && rawPaymentStatus === "paid")) {
      paymentStatus = "Paid";
    } else if (rawPaymentStatus.includes("fail") || data.payhereStatusCode === "-2") {
      paymentStatus = "Failed";
    } else if (rawPaymentStatus.includes("refund")) {
      paymentStatus = "Refunded";
    } else if (rawPaymentStatus.includes("charge") || data.payhereStatusCode === "-3") {
      paymentStatus = "Charged Back";
    } else if (rawPaymentStatus.includes("cancel") || data.payhereStatusCode === "-1") {
      paymentStatus = "Cancelled";
    } else {
      paymentStatus = "Pending";
    }
  } else {
    // For Cash on Delivery (COD) and manual payments:
    if (["paid", "completed", "cash collected"].includes(rawPaymentStatus.trim())) paymentStatus = "Paid";
    else if (rawPaymentStatus.includes("fail")) paymentStatus = "Failed";
    else if (rawPaymentStatus.includes("refund")) paymentStatus = "Refunded";
    else if (rawPaymentStatus.includes("charge")) paymentStatus = "Charged Back";
    else if (rawPaymentStatus.includes("cancel")) paymentStatus = "Cancelled";
    else paymentStatus = "Pending";
  }

  let orderStatus: NormalizedOrder["orderStatus"] = "Pending";
  const rawOrderStatus = (data.orderStatus || data.status || "").toString().toLowerCase();

  if (rawOrderStatus.includes("cancel") || paymentStatus === "Cancelled") orderStatus = "Cancelled";
  else if (rawOrderStatus.includes("return")) orderStatus = "Returned";
  else if (rawOrderStatus.includes("out for delivery")) orderStatus = "Out for Delivery";
  else if (rawOrderStatus.includes("deliver") || rawOrderStatus.includes("complete")) orderStatus = "Delivered";
  else if (rawOrderStatus.includes("ship")) orderStatus = "Shipped";
  else if (rawOrderStatus.includes("pack")) orderStatus = "Packed";
  else if (rawOrderStatus.includes("process") || (isCardOrPayHere && paymentStatus === "Paid")) orderStatus = "Processing";
  else if (rawOrderStatus.includes("confirm")) orderStatus = "Confirmed";
  else orderStatus = "Pending";

  return {
    id,
    orderId: data.orderId || id,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt,
    customerName: rawName,
    customerEmail,
    primaryPhone,
    alternativePhone,
    deliveryAddress,
    items,
    subtotal: calculatedSubtotal,
    warrantyTotal,
    deliveryFee,
    codFee,
    cardFee,
    discountTotal,
    grandTotal,
    currency: "LKR",
    paymentMethod: data.paymentMethod ? (data.paymentMethod === "cod" ? "COD" : data.paymentMethod === "payhere" ? "PayHere" : data.paymentMethod) : "COD",
    paymentStatus,
    orderStatus,
    transactionId: data.transactionId || data.paymentId || data.payherePaymentId || "",
    trackingNumber: data.trackingNumber || "",
    estimatedDelivery: data.estimatedDelivery || "",
    statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
    internalNotes: data.internalNotes || "",
    needsReview,
    rawDoc: data,
  };
}

/**
 * Format currency with single-line LKR non-breaking format
 */
export function formatLKR(amount: number): string {
  const val = typeof amount === "number" && !isNaN(amount) ? Math.round(amount) : 0;
  return `LKR ${val.toLocaleString("en-US")}`;
}

/**
 * PDF Invoice Generator
 */
export function printOrderInvoice(order: NormalizedOrder) {
  const doc = new jsPDF();

  // Header Branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(BUSINESS_INFO.name.toUpperCase(), 14, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(BUSINESS_INFO.address, 14, 26);
  doc.text(`Tel: ${BUSINESS_INFO.phonePrimary} | Email: ${BUSINESS_INFO.email}`, 14, 31);
  doc.text(`Web: ${BUSINESS_INFO.website}`, 14, 36);

  // Invoice Details Header (Right Side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("INVOICE", 150, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Order ID: #${order.id.slice(-8).toUpperCase()}`, 150, 26);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-GB")}`, 150, 31);
  doc.text(`Status: ${order.orderStatus}`, 150, 36);

  // Line Divider
  doc.setDrawColor(220);
  doc.line(14, 42, 196, 42);

  // Customer & Shipping Info
  let y = 50;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Billed & Shipped To:", 14, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;
  doc.text(`Customer: ${order.customerName}`, 14, y);
  y += 5;
  doc.text(`Phone: ${order.primaryPhone} ${order.alternativePhone ? `(Alt: ${order.alternativePhone})` : ""}`, 14, y);
  y += 5;
  doc.text(`Email: ${order.customerEmail}`, 14, y);
  y += 5;
  doc.text(`Address: ${order.deliveryAddress.address}, ${order.deliveryAddress.city}, ${order.deliveryAddress.district}`, 14, y);

  // Items Table Header
  y += 12;
  doc.setFillColor(245, 247, 250);
  doc.rect(14, y, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Item Description", 16, y + 5.5);
  doc.text("Qty", 125, y + 5.5);
  doc.text("Unit Price", 145, y + 5.5);
  doc.text("Total", 175, y + 5.5);

  y += 10;
  doc.setFont("helvetica", "normal");

  order.items.forEach((item) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const specs = [item.storage, item.color, item.ram].filter(Boolean).join(" / ");
    const titleText = specs ? `${item.name} (${specs})` : item.name;

    doc.text(titleText.slice(0, 55), 16, y);
    doc.text(`${item.quantity}`, 125, y);
    doc.text(formatLKR(item.price), 145, y);
    doc.text(formatLKR(item.lineTotal), 175, y);
    y += 7;
  });

  // Summary Totals Right Side
  y += 5;
  doc.setDrawColor(220);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text(`Subtotal: ${formatLKR(order.subtotal)}`, 140, y);
  if (order.deliveryFee > 0) {
    y += 5;
    doc.text(`Delivery Fee: ${formatLKR(order.deliveryFee)}`, 140, y);
  }
  if (order.codFee > 0) {
    y += 5;
    doc.text(`COD Fee: ${formatLKR(order.codFee)}`, 140, y);
  }
  if (order.discountTotal > 0) {
    y += 5;
    doc.text(`Discount: -${formatLKR(order.discountTotal)}`, 140, y);
  }
  y += 7;
  doc.setFontSize(12);
  doc.setTextColor(17, 17, 17);
  doc.text(`Grand Total: ${formatLKR(order.grandTotal)}`, 140, y);

  // Save PDF
  doc.save(`Invoice_${order.id.slice(-8)}.pdf`);
}

/**
 * PDF Packing Slip Generator
 */
export function printPackingSlip(order: NormalizedOrder) {
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`${BUSINESS_INFO.name.toUpperCase()} — PACKING SLIP`, 14, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Order ID: #${order.id.slice(-8).toUpperCase()}`, 14, 27);
  doc.text(`Print Date: ${new Date().toLocaleDateString("en-GB")}`, 14, 32);

  doc.setDrawColor(200);
  doc.line(14, 36, 196, 36);

  let y = 44;
  doc.setFont("helvetica", "bold");
  doc.text("DELIVERY DESTINATION:", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(`Customer Name: ${order.customerName}`, 14, y);
  y += 5;
  doc.text(`Phone: ${order.primaryPhone} ${order.alternativePhone ? `/ ${order.alternativePhone}` : ""}`, 14, y);
  y += 5;
  doc.text(`Address: ${order.deliveryAddress.address}, ${order.deliveryAddress.city}, ${order.deliveryAddress.district}, ${order.deliveryAddress.province}`, 14, y);
  if (order.deliveryAddress.landmark) {
    y += 5;
    doc.text(`Landmark: ${order.deliveryAddress.landmark}`, 14, y);
  }

  y += 12;
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Items to Pack", 16, y + 5.5);
  doc.text("SKU", 120, y + 5.5);
  doc.text("Quantity", 165, y + 5.5);

  y += 10;
  doc.setFont("helvetica", "normal");

  order.items.forEach((item) => {
    const specs = [item.storage, item.color, item.ram].filter(Boolean).join(" • ");
    doc.text(`${item.name} ${specs ? `(${specs})` : ""}`.slice(0, 50), 16, y);
    doc.text(item.sku || "N/A", 120, y);
    doc.text(`[  ] ${item.quantity} units`, 165, y);
    y += 8;
  });

  doc.save(`PackingSlip_${order.id.slice(-8)}.pdf`);
}
