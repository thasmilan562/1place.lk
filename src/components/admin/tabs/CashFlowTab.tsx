"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import { CashFlowTransaction } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import {
  Search,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle2,
} from "lucide-react";
import CashFlowModal from "@/components/admin/CashFlowModal";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

export default function CashFlowTab() {
  const { isLight } = useAdminTheme();
  const [transactions, setTransactions] = useState<CashFlowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CashFlowTransaction | null>(null);

  // ── Real-Time Firestore Synchronization (onSnapshot) ──
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "cashflow"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        } as CashFlowTransaction));

        // Sort descending by transaction date
        data.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setTransactions(data);
        setLoading(false);
      },
      (error) => {
        console.error("Real-time Cash Flow snapshot error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction record?")) {
      try {
        await deleteDoc(doc(db, "cashflow", id));
      } catch (err) {
        console.error("Delete cashflow transaction error:", err);
        alert("Failed to delete transaction. Please try again.");
      }
    }
  };

  // Distinct categories available in live transactions
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [transactions]);

  // Filtered transactions based on search, type, category, and date range
  const filteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    return transactions.filter((t) => {
      const matchSearch =
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || t.type === typeFilter;
      const matchCategory = categoryFilter === "all" || t.category === categoryFilter;

      let matchDate = true;
      if (dateRangeFilter === "today") {
        matchDate = (t.date || "").startsWith(todayStr);
      } else if (dateRangeFilter === "month") {
        matchDate = (t.date || "").startsWith(currentMonth);
      }

      return matchSearch && matchType && matchCategory && matchDate;
    });
  }, [transactions, search, typeFilter, categoryFilter, dateRangeFilter]);

  // ── Metrics Computation ──
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  const netBalance = totalIncome - totalExpense;

  const todayIncome = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return transactions
      .filter((t) => t.type === "income" && (t.date || "").startsWith(todayStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  const todayExpense = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return transactions
      .filter((t) => t.type === "expense" && (t.date || "").startsWith(todayStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header with Live Real-time Pulse Badge */}
      <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 border rounded-2xl p-5 shadow-xs ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2.5 ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Cash Flow &amp; Expense Ledger
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Real-time ledger tracking store income, operating expenses, stock purchases, utilities, and net balance.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs shrink-0 cursor-pointer active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance */}
        <div className={`border rounded-2xl p-4.5 shadow-xs relative overflow-hidden ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="flex justify-between items-start mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Net Balance</span>
          </div>
          <h3 className={`text-xl font-bold tracking-tight ${netBalance >= 0 ? (isLight ? "text-slate-900" : "text-white") : "text-rose-600 dark:text-rose-400"}`}>
            {formatPrice(netBalance)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {transactions.length} live records
          </p>
        </div>

        {/* Total Income */}
        <div className={`border rounded-2xl p-4.5 shadow-xs ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="flex justify-between items-start mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Income</span>
          </div>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatPrice(totalIncome)}
          </h3>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Today: {formatPrice(todayIncome)}</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className={`border rounded-2xl p-4.5 shadow-xs ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="flex justify-between items-start mb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Expenses</span>
          </div>
          <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
            {formatPrice(totalExpense)}
          </h3>
          <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Today: {formatPrice(todayExpense)}</span>
          </div>
        </div>

        {/* Real-time Status Card */}
        <div className={`border rounded-2xl p-4.5 shadow-xs flex flex-col justify-between ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Sync Status</span>
          </div>
          <div className="mt-3">
            <div className={`text-xs font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time Active</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Instant multi-admin auto-sync
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by description or category..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs outline-none transition-colors border ${
                isLight
                  ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white"
                  : "bg-[#0B111A] border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500"
              }`}
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer border ${
                isLight
                  ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900"
                  : "bg-[#0B111A] border-white/[0.08] text-white"
              }`}
            >
              <option value="all">All Types</option>
              <option value="income">Income Only (+)</option>
              <option value="expense">Expenses Only (-)</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer border ${
                isLight
                  ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900"
                  : "bg-[#0B111A] border-white/[0.08] text-white"
              }`}
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer border ${
                isLight
                  ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900"
                  : "bg-[#0B111A] border-white/[0.08] text-white"
              }`}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Live Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                isLight ? "text-slate-400 border-slate-100" : "text-slate-400 border-white/[0.08]"
              }`}>
                <th className="pb-3">Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? "divide-slate-100" : "divide-white/[0.04]"}`}>
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading real-time cash flow records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium text-xs">
                    No cashflow records found matching your filters. Click &ldquo;Add Transaction&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className={`transition-colors ${isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02]"}`}>
                    <td className="py-3.5 font-mono text-slate-400">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                          t.type === "income"
                            ? isLight
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : isLight
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {t.type === "income" ? (
                          <>
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Income</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3 h-3" />
                            <span>Expense</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className={`py-3.5 font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{t.category}</td>
                    <td className={`py-3.5 max-w-sm ${isLight ? "text-slate-600" : "text-slate-300"}`}>{t.description}</td>
                    <td
                      className={`py-3.5 text-right font-bold text-sm ${
                        t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"} {formatPrice(Number(t.amount) || 0)}
                    </td>
                    <td className="py-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setEditingTransaction(t);
                          setIsModalOpen(true);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                            : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20"
                        }`}
                        title="Edit Transaction"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg border bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 transition-colors cursor-pointer"
                        title="Delete Transaction"
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

      {/* Cashflow Modal */}
      <CashFlowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => setIsModalOpen(false)}
        initialData={editingTransaction}
      />
    </div>
  );
}
