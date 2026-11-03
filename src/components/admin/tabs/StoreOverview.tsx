"use client";
import Link from "next/link";
import { ArrowUpRight, ShoppingBag, Package, Users, Wallet } from "lucide-react";
import { Product } from "@/lib/types";

type Order = Record<string, unknown>;
const money = (value: number) => `LKR ${value.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const status = (order: Order) => String(order.status || order.orderStatus || "Pending");
const orderTotal = (order: Order) => Number(order.finalTotal ?? order.totalPrice ?? order.subtotal ?? 0) || 0;
function orderDate(order: Order) {
  const value = order.createdAt;
  if (typeof value === "string" || typeof value === "number") return new Date(value).getTime() || 0;
  if (value && typeof value === "object" && "seconds" in value) return Number(value.seconds) * 1000 || 0;
  return 0;
}

export default function StoreOverview({ orders, products, customerCount, loading }: { orders: Order[]; products: Product[]; customerCount: number; loading: boolean }) {
  const pending = orders.filter((order) => ["pending", "processing", "payment pending", "pending cod"].includes(status(order).toLowerCase())).length;
  const value = orders.filter((order) => !["cancelled", "canceled", "failed"].includes(status(order).toLowerCase())).reduce((total, order) => total + orderTotal(order), 0);
  const recent = [...orders].sort((a, b) => orderDate(b) - orderDate(a)).slice(0, 6);
  const lowStock = products.filter((product) => {
    const stock = product.stock_count ?? product.stock_quantity;
    return typeof stock === "number" && stock >= 0 && stock <= 5 && !["draft", "inactive", "archived", "deleted"].includes(product.status || "");
  }).slice(0, 5);
  const cards = [
    { label: "Order value", value: money(value), caption: "Non-cancelled orders, including unpaid", icon: Wallet },
    { label: "Orders", value: String(orders.length), caption: `${pending} awaiting attention`, icon: ShoppingBag },
    { label: "Products", value: String(products.length), caption: "In your catalog", icon: Package },
    { label: "Customers", value: String(customerCount), caption: "Registered and guest profiles", icon: Users },
  ];
  return <div className="store-overview" aria-busy={loading}>
    <div className="store-overview__heading"><div><p className="admin-kicker">YOUR STORE</p><h1>Everything, in perspective.</h1><p>The essentials to keep your store moving.</p></div><Link href="/admin/dashboard?tab=orders" className="admin-editor__save inline-flex items-center gap-2">Review orders <ArrowUpRight size={15} /></Link></div>
    <div className="store-overview__metrics">{cards.map((card) => <div key={card.label}><div><span>{card.label}</span><card.icon size={17} strokeWidth={1.5} /></div><strong>{loading ? "—" : card.value}</strong><p>{loading ? "Loading store data…" : card.caption}</p></div>)}</div>
    <div className="store-overview__panels"><section className="admin-editor__panel store-overview__orders"><div className="store-overview__panel-title"><h2>Recent orders</h2><Link href="/admin/dashboard?tab=orders">View all <ArrowUpRight size={13} /></Link></div>
      {loading ? <p className="admin-feedback">Loading orders…</p> : !recent.length ? <div className="admin-empty"><ShoppingBag size={28} strokeWidth={1.3} /><h3>Your first order starts here.</h3><p>New orders will appear here when customers check out.</p></div> : <div className="overflow-x-auto"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead><tbody>{recent.map((order, index) => <tr key={String(order.id || index)}><td><Link href="/admin/dashboard?tab=orders">#{String(order.orderNumber || order.orderId || order.id || "").slice(-12)}</Link></td><td>{String(order.customerName || order.fullName || "Customer")}</td><td><span className="admin-order-status">{status(order)}</span></td><td>{money(orderTotal(order))}</td></tr>)}</tbody></table></div>}
    </section><section className="admin-editor__panel"><div className="store-overview__panel-title"><h2>Inventory attention</h2><Link href="/admin/dashboard?tab=inventory">View stock <ArrowUpRight size={13} /></Link></div>
      {loading ? <p className="admin-feedback">Loading stock…</p> : !lowStock.length ? <div className="admin-empty"><Package size={28} strokeWidth={1.3} /><h3>No low-stock alerts.</h3><p>Products with recorded stock of five or fewer appear here.</p></div> : lowStock.map((product) => <Link className="admin-stock-row" href="/admin/dashboard?tab=inventory" key={product.id}><span>{product.name}</span><strong>{product.stock_count ?? product.stock_quantity} left</strong></Link>)}
    </section></div>
  </div>;
}
