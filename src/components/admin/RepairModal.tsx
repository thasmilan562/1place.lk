"use client";

import { useState, useEffect } from "react";
import { RepairJob, RepairStatus } from "@/lib/types";
import { db } from "@/lib/admin-firebase";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { X, Wrench, Calendar, User, Phone, DollarSign, Smartphone } from "lucide-react";

export default function RepairModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData: RepairJob | null;
}) {
  const [formData, setFormData] = useState<Partial<RepairJob>>({
    customerName: "",
    phone: "",
    deviceImei: "",
    brand: "",
    model: "",
    problem: "",
    technician: "",
    cost: 0,
    advance: 0,
    balance: 0,
    warranty: "",
    estimatedDelivery: "",
    notes: "",
    status: "Pending",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        customerName: "",
        phone: "",
        deviceImei: "",
        brand: "",
        model: "",
        problem: "",
        technician: "",
        cost: 0,
        advance: 0,
        balance: 0,
        warranty: "30 Days",
        estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        notes: "",
        status: "Pending",
      });
    }
  }, [initialData, isOpen]);

  // Auto-calculate balance
  useEffect(() => {
    const cost = Number(formData.cost) || 0;
    const advance = Number(formData.advance) || 0;
    setFormData((prev) => ({ ...prev, balance: cost - advance }));
  }, [formData.cost, formData.advance]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        await updateDoc(doc(db, "repairs", initialData.id), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const jobId = "REP-" + Math.floor(1000 + Math.random() * 9000);
        await addDoc(collection(db, "repairs"), {
          ...formData,
          jobId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const STATUSES: RepairStatus[] = ["Pending", "Checking", "Waiting Parts", "Repairing", "Quality Check", "Ready", "Delivered", "Cancelled"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
        <div className="sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-white/10 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-500" />
            {initialData ? `Edit Repair Job - ${initialData.jobId}` : "New Repair Job"}
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" /> Customer Details
              </h3>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Customer Name</label>
                <input required type="text" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Phone Number</label>
                <input required type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            {/* Device Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" /> Device Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Brand</label>
                  <input required type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Apple, Samsung..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Model</label>
                  <input required type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="iPhone 13 Pro..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">IMEI / Serial Number</label>
                <input type="text" value={formData.deviceImei} onChange={(e) => setFormData({ ...formData, deviceImei: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-400" /> Repair Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Problem Description</label>
                <textarea required rows={4} value={formData.problem} onChange={(e) => setFormData({ ...formData, problem: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 custom-scrollbar" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as RepairStatus })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Assigned Technician</label>
                  <input type="text" value={formData.technician} onChange={(e) => setFormData({ ...formData, technician: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Billing
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Total Cost (LKR)</label>
                  <input type="number" required min="0" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Advance Paid (LKR)</label>
                  <input type="number" min="0" value={formData.advance} onChange={(e) => setFormData({ ...formData, advance: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Remaining Balance</label>
                <div className={`w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 font-bold ${Number(formData.balance) > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  Rs. {formData.balance?.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-400" /> Extras
              </h3>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Estimated Delivery Date</label>
                <input type="date" value={formData.estimatedDelivery} onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Warranty</label>
                <input type="text" value={formData.warranty} onChange={(e) => setFormData({ ...formData, warranty: e.target.value })} placeholder="e.g. 30 Days" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Internal Notes (Not visible to customer)</label>
            <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 custom-scrollbar" />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
              {loading ? "Saving..." : initialData ? "Update Job" : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
