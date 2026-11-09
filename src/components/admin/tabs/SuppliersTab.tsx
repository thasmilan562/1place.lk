"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import { Supplier } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import {
  Building,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  DollarSign,
  Edit,
  Trash2,
  Package,
} from "lucide-react";
import SupplierModal from "@/components/admin/SupplierModal";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

export default function SuppliersTab() {
  const { isLight } = useAdminTheme();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "suppliers"));
      const data = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Supplier));
      setSuppliers(data);
    } catch (e) {
      console.error("Error fetching suppliers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await deleteDoc(doc(db, "suppliers", id));
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete supplier");
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    return (
      s.companyName.toLowerCase().includes(search.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      (s.address && s.address.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2.5 ${
            isLight ? "text-slate-900" : "text-white"
          }`}>
            <Building className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            Supplier Directory &amp; Contacts
          </h1>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Manage device vendors, accessory wholesalers, contact numbers, and outstanding accounts payable.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSupplier(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs shrink-0 cursor-pointer active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          Add New Supplier
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`rounded-2xl border p-4.5 shadow-xs ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Suppliers</p>
          <h3 className={`text-xl font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>{suppliers.length}</h3>
        </div>
        <div className={`rounded-2xl border p-4.5 shadow-xs ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Outstanding Payable</p>
          <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatPrice(suppliers.reduce((sum, s) => sum + (Number(s.outstandingBalance) || 0), 0))}
          </h3>
        </div>
        <div className={`rounded-2xl border p-4.5 shadow-xs col-span-2 lg:col-span-1 ${
          isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
        }`}>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Average Rating</p>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" /> 4.9 / 5.0
          </h3>
        </div>
      </div>

      {/* Search & Grid */}
      <div className={`rounded-2xl border p-5 sm:p-6 shadow-xs space-y-4 ${
        isLight ? "bg-white border-[#E2E8F0]" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by company, person, or phone..."
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs outline-none transition-colors border ${
              isLight
                ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white"
                : "bg-[#0B111A] border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500"
            }`}
          />
        </div>

        {/* Supplier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 font-medium text-xs">
              No suppliers found. Click &ldquo;Add New Supplier&rdquo; to create one.
            </div>
          ) : (
            filteredSuppliers.map((s) => (
              <div
                key={s.id}
                className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  isLight
                    ? "bg-[#F8FAFC] border-slate-200 hover:border-slate-300 shadow-xs"
                    : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                        {s.companyName}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">{s.contactPerson}</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded-md">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{s.rating || 5}</span>
                    </div>
                  </div>

                  <div className={`mt-4 space-y-2 text-xs ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                      <span>{s.phone}</span>
                    </div>
                    {s.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">{s.email}</span>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">{s.address}</span>
                      </div>
                    )}
                  </div>

                  {s.productsSupplied && s.productsSupplied.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {s.productsSupplied.map((p, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            isLight
                              ? "bg-white text-slate-700 border-slate-200"
                              : "bg-white/[0.06] text-slate-300 border-white/[0.08]"
                          }`}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`mt-5 pt-3 border-t flex items-center justify-between ${
                  isLight ? "border-slate-200" : "border-white/[0.08]"
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Balance</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {formatPrice(s.outstandingBalance || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingSupplier(s);
                        setIsModalOpen(true);
                      }}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isLight
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                          : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20"
                      }`}
                      title="Edit Supplier"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg border bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 cursor-pointer transition-colors"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          setIsModalOpen(false);
          fetchSuppliers();
        }}
        initialData={editingSupplier}
      />
    </div>
  );
}

