"use client";

import { useState, useEffect } from "react";
import { Supplier } from "@/lib/types";
import { db } from "@/lib/admin-firebase";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { X, Building, Phone, Mail, MapPin, DollarSign, Package } from "lucide-react";

export default function SupplierModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData: Supplier | null;
}) {
  const [formData, setFormData] = useState<Partial<Supplier>>({
    companyName: "",
    contactPerson: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    productsSupplied: [],
    outstandingBalance: 0,
    rating: 5,
  });
  const [productsInput, setProductsInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setProductsInput(initialData.productsSupplied?.join(", ") || "");
    } else {
      setFormData({
        companyName: "",
        contactPerson: "",
        phone: "",
        whatsapp: "",
        email: "",
        address: "",
        productsSupplied: [],
        outstandingBalance: 0,
        rating: 5,
      });
      setProductsInput("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Parse comma-separated products
    const parsedProducts = productsInput.split(",").map(p => p.trim()).filter(p => p.length > 0);
    const finalData = { ...formData, productsSupplied: parsedProducts };

    try {
      if (initialData) {
        await updateDoc(doc(db, "suppliers", initialData.id), finalData);
      } else {
        await addDoc(collection(db, "suppliers"), {
          ...finalData,
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
        <div className="sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-white/10 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-purple-500" />
            {initialData ? "Edit Supplier" : "New Supplier"}
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2">Company Info</h3>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Company Name</label>
                <input required type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Contact Person</label>
                <input required type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2 flex items-center gap-2">Contact Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Phone <Phone className="inline w-3 h-3 text-blue-400"/></label>
                  <input required type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">WhatsApp <MessageCircleIcon className="inline w-3 h-3 text-green-400"/></label>
                  <input type="text" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Email Address <Mail className="inline w-3 h-3 text-orange-400"/></label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" /> Address & Products
            </h3>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Address</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 flex items-center gap-1"><Package className="w-3 h-3"/> Products Supplied (Comma Separated)</label>
              <input type="text" placeholder="Displays, Batteries, Chargers..." value={productsInput} onChange={(e) => setProductsInput(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Financials
            </h3>
            <div className="w-1/2">
              <label className="block text-xs font-medium text-white/60 mb-1.5">Outstanding Balance (LKR)</label>
              <input type="number" min="0" value={formData.outstandingBalance} onChange={(e) => setFormData({ ...formData, outstandingBalance: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
              {loading ? "Saving..." : initialData ? "Update Supplier" : "Create Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageCircleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
    </svg>
  );
}
