"use client";

import React, { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { Download, FileSpreadsheet, FileText, UserCheck, ShoppingBag } from "lucide-react";
import { db } from "@/lib/admin-firebase";
import { collection, getDocs } from "firebase/firestore";
import { jsPDF } from "jspdf";

export default function UsersTab({ users }: { users: any[] }) {
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  // ── CSV / Excel Export ──
  const exportUsersExcel = () => {
    if (!users || users.length === 0) {
      alert("No registered user data available to export.");
      return;
    }
    const headers = ["User ID", "Full Name", "Email Address", "Joined Date"];
    const rows = users.map((u) => [
      `"${u.id || ""}"`,
      `"${(u.displayName || "Google User").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `street_mobile_users_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── PDF Report Export ──
  const exportUsersPDF = () => {
    if (!users || users.length === 0) {
      alert("No registered user data available to export.");
      return;
    }

    const doc = new jsPDF();

    // Brand Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("1PLACE.LK", 14, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Registered Users Master Report", 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Total Users: ${users.length}`, 14, 34);

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 38, 196, 38);

    // Table Column Headers
    let y = 48;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("#", 14, y);
    doc.text("User ID", 24, y);
    doc.text("Name", 65, y);
    doc.text("Email Address", 115, y);
    doc.text("Joined Date", 168, y);

    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, 196, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    users.forEach((u, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${idx + 1}`, 14, y);
      doc.text(`${(u.id || "N/A").slice(0, 16)}`, 24, y);
      doc.text(`${(u.displayName || "Google User").slice(0, 22)}`, 65, y);
      doc.text(`${(u.email || "N/A").slice(0, 26)}`, 115, y);
      doc.text(`${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}`, 168, y);
      y += 8;
    });

    doc.save(`street_mobile_users_report_${Date.now()}.pdf`);
  };

  const fetchOrders = async (userId: string) => {
    try {
      const snap = await getDocs(collection(db, "orders"));
      const filtered = snap.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .filter((order: any) => order.userId === userId);
      setUserOrders(filtered);
    } catch (e) {
      console.error("Failed to fetch orders for user", e);
    }
  };

  const handleViewOrders = (user: any) => {
    setSelectedUser(user);
    fetchOrders(user.id);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Registered Users</h3>
            <p className="text-xs text-white/40 mt-0.5">
              {users.length} users registered on your platform
            </p>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={exportUsersExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel (.CSV)
          </button>
          <button
            onClick={exportUsersPDF}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] text-white/40 uppercase tracking-widest bg-white/[0.02]">
                <th className="px-6 py-4 font-bold">User ID</th>
                <th className="px-6 py-4 font-bold">User Name</th>
                <th className="px-6 py-4 font-bold">Email Address</th>
                <th className="px-6 py-4 font-bold">Joined Date</th>
                <th className="px-6 py-4 font-bold text-right">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-white/80">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/30">
                    No registered users found in database.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-white/40">{u.id}</td>
                    <td className="px-6 py-4 font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {u.displayName || "Google User"}
                    </td>
                    <td className="px-6 py-4 text-white/60">{u.email}</td>
                    <td className="px-6 py-4 text-white/40 text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewOrders(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-all"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        View Orders
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Orders Modal / Details */}
      {selectedUser && (
        <div className="mt-8 bg-slate-900/60 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Orders for {selectedUser.displayName || selectedUser.email}
            </h3>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-xs text-white/40 hover:text-white px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Close Orders View
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-white/40 uppercase tracking-widest bg-white/[0.02]">
                  <th className="px-6 py-3.5 font-semibold">Order ID</th>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Total Amount</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/80">
                {userOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/30">
                      No orders found for this user.
                    </td>
                  </tr>
                ) : (
                  userOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-3.5 font-mono text-xs text-white/40">#{order.id.slice(-6)}</td>
                      <td className="px-6 py-3.5 text-xs text-white/60">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5 font-bold text-white">{formatPrice(order.totalPrice)}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
