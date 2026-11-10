"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Search,
  MessageCircle,
  ArrowLeft,
  Calendar,
  MapPin,
  CreditCard,
  ShoppingBag,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatPrice } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import { BUSINESS_INFO } from "@/lib/business-info";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  storage?: string;
  color?: string;
}

interface Order {
  id: string;
  userId?: string;
  customerName: string;
  address: string;
  district: string;
  primaryPhone: string;
  secondaryPhone?: string;
  items: OrderItem[];
  totalPrice: number;
  paymentMethod: "COD" | "Card" | string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | string;
  createdAt: string;
}

// Function to calculate Estimated Delivery Date range
function getDeliveryEstimate(createdAtStr: string, status: string) {
  const created = new Date(createdAtStr || Date.now());
  const st = (status || "").toLowerCase();

  if (st === "delivered" || st === "completed") {
    return {
      label: "Delivered & Completed",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      dateText: `Delivered on ${created.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
      step: 4
    };
  }

  if (st === "cancelled") {
    return {
      label: "Cancelled",
      color: "text-red-500 bg-red-50 border-red-200",
      dateText: "Order Cancelled",
      step: 0
    };
  }

  // Calculate 2-3 business days from order date
  const minDate = new Date(created);
  minDate.setDate(minDate.getDate() + 2);

  const maxDate = new Date(created);
  maxDate.setDate(maxDate.getDate() + 4);

  const minFormatted = minDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const maxFormatted = maxDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (st === "shipped") {
    return {
      label: "Out for Delivery",
      color: "text-blue-600 bg-blue-50 border-blue-200",
      dateText: `Expected Today or Tomorrow (${minFormatted})`,
      step: 3
    };
  }

  if (st === "packed") {
    return {
      label: "Packing Completed",
      color: "text-amber-600 bg-amber-50 border-amber-200",
      dateText: `Handover to Courier (${minFormatted})`,
      step: 2
    };
  }

  if (st === "processing") {
    return {
      label: "Processing Order",
      color: "text-purple-600 bg-purple-50 border-purple-200",
      dateText: `Preparing items: ${minFormatted} – ${maxFormatted}`,
      step: 2
    };
  }

  // Default: Pending
  return {
    label: "Order Placed",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    dateText: `Estimated Delivery: ${minFormatted} – ${maxFormatted}`,
    step: 1
  };
}

export default function OrderHistoryPage() {
  const { user, profile, gender, updateGender, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  useEffect(() => {
    async function fetchUserOrders() {
      setLoading(true);
      const fetchedMap = new Map<string, Order>();

      // 1. Collect recent order IDs stored in browser localStorage (bounded to 10)
      let storedIds: string[] = [];
      try {
        const storedRaw =
          localStorage.getItem("oneplace_recent_orders") ||
          localStorage.getItem("sm_recent_orders") ||
          "[]";
        const parsed = JSON.parse(storedRaw);
        if (Array.isArray(parsed)) {
          storedIds = parsed
            .filter((id) => typeof id === "string" && id.trim())
            .map((id) => id.trim())
            .slice(0, 10);
        }
      } catch (e) {
        console.warn("Local storage order read error:", e);
      }

      // 2. Fetch authenticated user orders via targeted Server API
      if (user) {
        try {
          const res = await fetch(`/api/orders?userId=${encodeURIComponent(user.uid)}`);
          const data = await res.json();
          if (Array.isArray(data?.orders)) {
            data.orders.forEach((o: Order) => {
              if (o && o.id) fetchedMap.set(o.id, o);
            });
          }
        } catch (e) {
          console.warn("API orders fetch warning:", e);
        }
      }

      // 3. Fetch any recent localStorage order IDs not yet loaded via a single targeted API call
      const missingIds = storedIds.filter((id) => !fetchedMap.has(id));
      if (missingIds.length > 0) {
        try {
          const res = await fetch(`/api/orders?ids=${encodeURIComponent(missingIds.join(","))}`);
          const data = await res.json();
          if (Array.isArray(data?.orders)) {
            data.orders.forEach((o: Order) => {
              if (o && o.id) fetchedMap.set(o.id, o);
            });
          }
        } catch (e) {
          console.warn("Recent orders lookup warning:", e);
        }
      }

      const list = Array.from(fetchedMap.values());
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list);
      setLoading(false);
    }

    fetchUserOrders();
  }, [user]);

  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const searchTerm = phoneSearch.trim();
    if (!searchTerm) return;
    setLoading(true);
    setSearchTriggered(true);

    try {
      const fetchedMap = new Map<string, Order>();
      const digitsOnly = searchTerm.replace(/\D/g, "");
      const looksLikeOrderId =
        searchTerm.toUpperCase().startsWith("1P-") ||
        /[a-zA-Z]/.test(searchTerm) ||
        digitsOnly.length < 9;

      const queryUrl = looksLikeOrderId
        ? `/api/orders?id=${encodeURIComponent(searchTerm)}`
        : `/api/orders?phone=${encodeURIComponent(searchTerm)}`;

      try {
        const res = await fetch(queryUrl);
        const data = await res.json();
        if (Array.isArray(data?.orders)) {
          data.orders.forEach((o: Order) => {
            if (o && o.id) fetchedMap.set(o.id, o);
          });
        }
      } catch (e) {
        console.warn("API order search warning:", e);
      }

      const list = Array.from(fetchedMap.values());
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list);
    } catch (err) {
      console.warn("Order lookup error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 lg:px-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-black mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Continue Shopping
            </Link>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
              <Package className="w-8 h-8 text-black" /> My Account &amp; Orders
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Track live order statuses and manage your account
            </p>
          </div>

          {/* Quick WhatsApp Support */}
          <a
            href={`https://wa.me/${BUSINESS_INFO.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hello " + BUSINESS_INFO.brandName + ", I have an inquiry about my order.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20bd5a] transition-all shadow-md shrink-0"
          >
            <MessageCircle className="w-4 h-4" /> Order Help
          </a>
        </div>

        {/* Logged-In User Profile Card with Avatar & Sign Out */}
        {user && (
          <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <UserAvatar
                gender={gender || profile?.gender || "male"}
                name={user.displayName || "User"}
                photoURL={user.photoURL}
                size="xl"
                showBadge
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-gray-900 truncate">
                  {user.displayName || "Customer"}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                    {(gender || profile?.gender) === "female" ? "👩 Female Account" : "👨 Male Account"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  window.location.href = "/";
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all border border-red-200/60 cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Track Order Search Box (Always visible for all users) */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 mb-8 shadow-sm">
          <h3 className="font-bold text-base text-gray-900 mb-1">Track Order by Phone Number or Order ID</h3>
          <p className="text-xs text-gray-400 mb-4">
            Type your phone number or Order ID below to view your order status and live delivery date estimates.
          </p>
          <form onSubmit={handlePhoneSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter Phone (e.g. 077 123 4567) or Order ID (e.g. 1P-XXXXXX)"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shrink-0 active:scale-95"
            >
              Track Order
            </button>
          </form>
        </div>

        {/* Order List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 bg-white border border-gray-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 text-center p-8 shadow-sm">
            <ShoppingBag className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No orders found</h3>
            <p className="text-sm text-gray-400 max-w-sm mb-6">
              {searchTriggered
                ? "No matching orders found for this phone number."
                : "You haven't placed any orders yet. Explore our mobile store to get started!"}
            </p>
            <Link
              href="/products"
              className="px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-md"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const estimate = getDeliveryEstimate(order.createdAt, order.status);
              const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div
                  key={order.id}
                  className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Top Bar: ID, Date, Delivery Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-400">Order #{order.id.slice(-8).toUpperCase()}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${estimate.color}`}>
                          {estimate.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Placed on {orderDate}
                      </div>
                    </div>

                    {/* Delivery Date Display Banner */}
                    <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-xs">
                        <span className="text-emerald-800 font-bold block">{estimate.dateText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Progress Stepper */}
                  {order.status !== "cancelled" && (
                    <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="flex items-center justify-between relative">
                        {/* Progress Bar Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />
                        <div
                          className="absolute top-1/2 left-0 h-1 bg-black -translate-y-1/2 z-0 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (estimate.step / 4) * 100)}%`
                          }}
                        />

                        {/* Step Dots */}
                        {[
                          { title: "Placed", step: 1 },
                          { title: "Packed", step: 2 },
                          { title: "Shipped", step: 3 },
                          { title: "Delivered", step: 4 },
                        ].map((s) => (
                          <div key={s.step} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                                estimate.step >= s.step
                                  ? "bg-black text-white"
                                  : "bg-white border-2 border-gray-300 text-gray-400"
                              }`}
                            >
                              {estimate.step >= s.step ? "✓" : s.step}
                            </div>
                            <span className="text-[10px] font-semibold text-gray-500 mt-1">{s.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thank You Banner for Completed Orders */}
                  {(order.status === "completed" || order.status === "delivered") && (
                    <div className="mb-6 p-5 rounded-2xl bg-black text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg border border-gray-800 animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                          ✓
                        </div>
                        <div>
                          <p className="font-black text-sm text-white">Thank you for your order on 1place.lk!</p>
                          <p className="text-xs text-gray-300 mt-0.5 font-medium">Your package has been successfully packed, shipped & delivered.</p>
                        </div>
                      </div>

                      <a
                        href={`https://wa.me/${BUSINESS_INFO.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I would like to join the 1place.lk VIP updates channel.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4" /> Join Our WhatsApp Channel
                      </a>
                    </div>
                  )}

                  {/* Purchased Items List */}
                  <div className="space-y-3 mb-5">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-14 h-14 bg-gray-50 rounded-xl p-1 shrink-0 overflow-hidden border border-gray-100 flex items-center justify-center">
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h4>
                          <p className="text-xs text-gray-400">
                            Qty: {item.quantity} {item.storage ? `• ${item.storage}` : ""} {item.color ? `• ${item.color}` : ""}
                          </p>
                        </div>
                        <div className="font-bold text-sm text-gray-900 text-right">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary & Customer Details Footer */}
                  <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
                    <div className="text-xs text-gray-500 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium text-gray-800">{order.customerName}</span> — {order.address}, {order.district}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                        Payment: <span className="font-semibold text-gray-800">{order.paymentMethod}</span>
                      </p>
                    </div>

                    <div className="text-right self-end sm:self-auto">
                      <span className="text-xs text-gray-400 block">Total Amount</span>
                      <span className="text-lg font-black text-gray-900">{formatPrice(order.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
