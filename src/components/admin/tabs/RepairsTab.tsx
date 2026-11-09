"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import { RepairJob, RepairStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import {
  Wrench,
  Plus,
  Search,
  Calendar,
  User,
  Phone,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";
import RepairModal from "@/components/admin/RepairModal";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

export default function RepairsTab() {
  const { isLight } = useAdminTheme();
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<RepairJob | null>(null);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "repairs"));
      const data = snap.docs.map((d) => ({ ...d.data(), id: d.id } as RepairJob));
      setRepairs(data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    } catch (e) {
      console.error("Error fetching repairs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this repair job?")) return;
    try {
      await deleteDoc(doc(db, "repairs", id));
      setRepairs((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete repair job");
    }
  };

  const filteredRepairs = repairs.filter((r) => {
    const matchSearch =
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search) ||
      (r.jobId && r.jobId.toLowerCase().includes(search.toLowerCase())) ||
      r.model.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: RepairStatus) => {
    switch (status) {
      case "Ready":
      case "Delivered":
        return isLight
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Repairing":
      case "Quality Check":
        return isLight
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Waiting Parts":
      case "Checking":
        return isLight
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Cancelled":
        return isLight
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return isLight
          ? "bg-purple-50 text-purple-700 border-purple-200"
          : "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2.5 ${
            isLight ? "text-slate-900" : "text-white"
          }`}>
            <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            Device Repair Management
          </h1>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Track phone & gadget repair jobs, technician assignments, costs, and customer warranty statuses.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRepair(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs shrink-0 cursor-pointer active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          Create New Repair Job
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-4.5 shadow-xs ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Jobs</p>
          <h3 className={`text-xl font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>{repairs.length}</h3>
        </div>
        <div className={`rounded-2xl border p-4.5 shadow-xs ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">In Progress</p>
          <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {repairs.filter((r) => r.status === "Repairing" || r.status === "Checking").length}
          </h3>
        </div>
        <div className={`rounded-2xl border p-4.5 shadow-xs ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Ready for Pickup</p>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {repairs.filter((r) => r.status === "Ready").length}
          </h3>
        </div>
        <div className={`rounded-2xl border p-4.5 shadow-xs ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Pending Advances</p>
          <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatPrice(repairs.reduce((sum, r) => sum + (Number(r.balance) || 0), 0))}
          </h3>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`rounded-2xl border p-5 sm:p-6 shadow-xs space-y-4 ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job ID, customer name, phone, or model..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs outline-none transition-colors border ${
                isLight
                  ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white"
                  : "bg-[#0B111A] border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500"
              }`}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer border ${
                isLight
                  ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900"
                  : "bg-[#0B111A] border-white/[0.08] text-white"
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Checking">Checking</option>
              <option value="Repairing">Repairing</option>
              <option value="Waiting Parts">Waiting Parts</option>
              <option value="Ready">Ready</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                isLight ? "text-slate-400 border-slate-100" : "text-slate-400 border-white/[0.08]"
              }`}>
                <th className="pb-3">Job ID</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Device / Model</th>
                <th className="pb-3">Problem</th>
                <th className="pb-3">Cost / Balance</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? "divide-slate-100" : "divide-white/[0.04]"}`}>
              {filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No repair jobs found.
                  </td>
                </tr>
              ) : (
                filteredRepairs.map((r) => (
                  <tr key={r.id} className={`transition-colors ${isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02]"}`}>
                    <td className="py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {r.jobId || `REP-${r.id.slice(0, 5)}`}
                    </td>
                    <td className="py-3.5">
                      <p className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{r.customerName}</p>
                      <p className="text-[11px] text-slate-400">{r.phone}</p>
                    </td>
                    <td className="py-3.5">
                      <p className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{r.brand} {r.model}</p>
                      {r.deviceImei && <p className="text-[10px] text-slate-400 font-mono">IMEI: {r.deviceImei}</p>}
                    </td>
                    <td className={`py-3.5 max-w-xs truncate ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                      {r.problem}
                    </td>
                    <td className="py-3.5">
                      <p className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{formatPrice(r.cost || 0)}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Bal: {formatPrice(r.balance || 0)}</p>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setEditingRepair(r);
                          setIsModalOpen(true);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                            : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20"
                        }`}
                        title="Edit Repair Job"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg border bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 cursor-pointer transition-colors"
                        title="Delete Repair Job"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repair Modal */}
      <RepairModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          setIsModalOpen(false);
          fetchRepairs();
        }}
        initialData={editingRepair}
      />
    </div>
  );
}

