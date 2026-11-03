import type { NormalizedOrder } from "./order-utils";

/** Quote CSV fields and keep customer text from being interpreted as formulas. */
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (typeof value !== "number" && /^\s*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildOrdersCSV(orders: NormalizedOrder[]): string {
  const headers = ["Order ID", "Order Date", "Customer Name", "Email", "Primary Phone", "Alternative Phone", "Delivery Address", "City", "District", "Payment Method", "Payment Status", "Order Status", "Subtotal (LKR)", "Delivery Fee (LKR)", "COD Fee (LKR)", "Grand Total (LKR)"];
  const rows = orders.map((order) => [order.orderId, order.createdAt, order.customerName, order.customerEmail, order.primaryPhone, order.alternativePhone, order.deliveryAddress.address, order.deliveryAddress.city, order.deliveryAddress.district, order.paymentMethod, order.paymentStatus, order.orderStatus, order.subtotal, order.deliveryFee, order.codFee, order.grandTotal]);
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
