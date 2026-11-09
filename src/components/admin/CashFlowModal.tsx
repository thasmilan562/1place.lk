"use client";

import { useState, useEffect } from "react";
import { CashFlowTransaction } from "@/lib/types";
import { db } from "@/lib/admin-firebase";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { X, DollarSign, Calendar, Tag, FileText } from "lucide-react";

export default function CashFlowModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData: CashFlowTransaction | null;
}) {
  const [formData, setFormData] = useState<Partial<CashFlowTransaction>>({
    type: "income",
    category: "Sales",
    amount: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        type: "income",
        category: "Sales",
        amount: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (initialData) {
        await updateDoc(doc(db, "cashflow", initialData.id), formData);
      } else {
        await addDoc(collection(db, "cashflow"), {
          ...formData,
          createdAt: new Date().toISOString(),
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

  const CATEGORIES = ["Salary", "Rent", "Electricity", "Transport", "Marketing", "Sales", "Repairs", "Other"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-white/10 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            {initialData ? "Edit Transaction" : "New Transaction"}
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "income", category: "Sales" })}
              className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                formData.type === "income" 
                  ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50" 
                  : "bg-white/5 text-white/50 border-2 border-transparent hover:bg-white/10"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "expense", category: "Other" })}
              className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                formData.type === "expense" 
                  ? "bg-red-500/20 text-red-400 border-2 border-red-500/50" 
                  : "bg-white/5 text-white/50 border-2 border-transparent hover:bg-white/10"
              }`}
            >
              Expense
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Amount (LKR)</label>
              <input required type="number" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3"/> Date</label>
              <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-white/60 mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3"/> Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-white/60 mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3"/> Description</label>
              <input required type="text" placeholder="e.g. Sold iPhone 13 Pro" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className={`px-6 py-2.5 font-bold text-white rounded-xl transition-colors disabled:opacity-50 ${
              formData.type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            }`}>
              {loading ? "Saving..." : initialData ? "Update Transaction" : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
