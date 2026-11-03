"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Plus, Check, Trash2, Edit3, CircleCheck as Sparkles, Building2, Home } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, deleteDoc, addDoc, updateDoc } from "firebase/firestore";
import { User } from "firebase/auth";

export interface SavedAddress {
  id: string;
  label: string; // e.g. "Home", "Work", "Default"
  firstName: string;
  lastName: string;
  phone: string;
  altPhone?: string;
  email: string;
  province: string;
  district: string;
  city: string;
  postalCode: string;
  address: string;
  landmark?: string;
  instructions?: string;
}

interface SavedAddressSelectorProps {
  user: User | null;
  selectedAddressId: string | null;
  onSelectAddress: (addr: SavedAddress | null) => void;
  onAddNewClick: () => void;
  isFormUsingSaved: boolean;
}

export default function SavedAddressSelector({
  user,
  selectedAddressId,
  onSelectAddress,
  onAddNewClick,
  isFormUsingSaved,
}: SavedAddressSelectorProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      return;
    }

    async function fetchAddresses() {
      setLoading(true);
      try {
        const q = query(collection(db, "users", user!.uid, "addresses"));
        const snap = await getDocs(q);
        
        // Deduplicate addresses based on normalized content
        const seenKeys = new Set<string>();
        const uniqueList: SavedAddress[] = [];
        const duplicateDocIds: string[] = [];

        snap.docs.forEach((d) => {
          const data = d.data() as SavedAddress;
          const key = `${(data.address || "").trim().toLowerCase()}|${(data.city || "").trim().toLowerCase()}|${(data.district || "").trim().toLowerCase()}|${(data.phone || "").replace(/\D/g, "")}`;
          
          if (seenKeys.has(key)) {
            // Mark duplicate document for deletion
            duplicateDocIds.push(d.id);
          } else {
            seenKeys.add(key);
            uniqueList.push({ ...data, id: d.id });
          }
        });

        // Asynchronously clean up duplicate address documents in Firestore
        if (duplicateDocIds.length > 0) {
          duplicateDocIds.forEach((dupId) => {
            deleteDoc(doc(db, "users", user!.uid, "addresses", dupId)).catch(() => null);
          });
        }

        setAddresses(uniqueList);

        if (uniqueList.length > 0 && !selectedAddressId) {
          // Auto-select the first saved address
          onSelectAddress(uniqueList[0]);
        }
      } catch (err) {
        console.warn("Could not load user addresses from Firestore:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAddresses();
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !confirm("Are you sure you want to delete this saved address?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "addresses", id));
      const nextList = addresses.filter((a) => a.id !== id);
      setAddresses(nextList);
      if (selectedAddressId === id) {
        onSelectAddress(nextList[0] || null);
      }
    } catch (err) {
      console.error("Failed to delete address:", err);
    }
  };

  if (!user || addresses.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200/90 space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onAddNewClick}
          className="text-xs font-bold text-neutral-900 hover:text-black flex items-center gap-1 hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Use a different address</span>
        </button>
      </div>

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {addresses.map((addr) => {
          const isSelected = selectedAddressId === addr.id && isFormUsingSaved;

          return (
            <div
              key={addr.id}
              onClick={() => onSelectAddress(addr)}
              className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? "bg-white border-black ring-1 ring-black shadow-xs"
                  : "bg-white/60 border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-extrabold text-neutral-900 flex items-center gap-1.5">
                    {addr.label?.toLowerCase() === "work" ? (
                      <Building2 className="w-3.5 h-3.5 text-neutral-600" />
                    ) : (
                      <Home className="w-3.5 h-3.5 text-neutral-600" />
                    )}
                    {addr.label || "Saved Address"}
                  </span>

                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="font-bold text-neutral-900 leading-tight">
                  {addr.firstName} {addr.lastName} ({addr.phone})
                </p>
                <p className="text-neutral-600 line-clamp-2 mt-0.5">
                  {addr.address}, {addr.city}, {addr.district}
                </p>
              </div>

              <div className="pt-2.5 mt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                <span className="text-neutral-700 font-semibold">
                  {isSelected ? "Active address" : "Click to use"}
                </span>

                <button
                  type="button"
                  onClick={(e) => handleDelete(addr.id, e)}
                  className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                  title="Delete address"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
