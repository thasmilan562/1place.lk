"use client";

import React, { useState } from "react";
import { Product, WhatsAppCampaign } from "@/lib/types";
import { Megaphone, MessageCircle, BarChart3, Users, Plus, CheckCircle2, AlertCircle, X, ChevronRight, Send, ArrowRight, Eye } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import { useAdminTheme } from "@/app/admin/dashboard/layout";
import Image from "next/image";

interface WhatsAppMarketingTabProps {
  campaigns: WhatsAppCampaign[];
  products: Product[];
  customers: any[];
}

export default function WhatsAppMarketingTab({ campaigns, products, customers }: WhatsAppMarketingTabProps) {
  const { isLight } = useAdminTheme();
  const [isCreating, setIsCreating] = useState(false);

  // Stats
  const totalCampaigns = campaigns.length;
  const messagesSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  const delivered = campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0);
  const clicks = campaigns.reduce((acc, c) => acc + (c.clickCount || 0), 0);

  if (isCreating) {
    return <CreateCampaignFlow 
      products={products} 
      customers={customers} 
      onClose={() => setIsCreating(false)} 
      isLight={isLight} 
    />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            WhatsApp Marketing
          </h1>
          <p className={`text-xs font-medium mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Direct-to-customer product campaigns and tracking
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: totalCampaigns, icon: Megaphone, color: "text-blue-400" },
          { label: "Messages Sent", value: messagesSent, icon: Send, color: "text-purple-400" },
          { label: "Delivered", value: delivered, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Product Clicks", value: clicks, icon: BarChart3, color: "text-amber-400" },
        ].map((stat, idx) => (
          <div key={idx} className={`p-5 rounded-2xl border shadow-xs ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              isLight ? "bg-slate-50 border border-slate-200" : "bg-[#121A25] border border-white/[0.08]"
            }`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              {stat.label}
            </p>
            <h3 className={`text-2xl font-bold mt-1 font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
              {stat.value.toLocaleString()}
            </h3>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border overflow-hidden ${
        isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? "border-slate-200" : "border-white/[0.08]"
        }`}>
          <h3 className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Recent Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`text-xs uppercase tracking-wider ${
              isLight ? "bg-slate-50 text-slate-500 border-b border-slate-200" : "bg-[#121A25] text-slate-400 border-b border-white/[0.08]"
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold">Campaign</th>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Sent</th>
                <th className="px-6 py-4 font-semibold">Clicks</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No campaigns created yet. Click "Create Campaign" to get started.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className={`transition-colors ${
                    isLight ? "hover:bg-slate-50" : "hover:bg-[#121A25]"
                  }`}>
                    <td className="px-6 py-4">
                      <p className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{camp.name}</p>
                      <p className="text-xs text-slate-500">{camp.createdAt ? new Date(camp.createdAt).toLocaleDateString() : "Just now"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {camp.productImage && (
                          <Image src={camp.productImage} alt="Product" width={32} height={32} className="rounded-md object-cover border border-white/10" />
                        )}
                        <span className={`font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>{camp.productName || "Unknown Product"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono">{camp.sentCount} / {camp.recipientIds?.length || 0}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-amber-400">
                      {camp.clickCount || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        camp.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                        camp.status === "active" ? "bg-blue-500/10 text-blue-500" :
                        "bg-slate-500/10 text-slate-400"
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className={`p-2 rounded-lg transition-colors ${
                        isLight ? "hover:bg-slate-200 text-slate-500" : "hover:bg-white/10 text-slate-400"
                      }`}>
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CREATE CAMPAIGN FLOW
// ════════════════════════════════════════════════════════════════════
function CreateCampaignFlow({ products, customers, onClose, isLight }: { products: Product[], customers: any[], onClose: () => void, isLight: boolean }) {
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState("Hey {{customer_name}},\n\nCheck out the new {{product_name}} we just restocked! It's available now for {{price}}.\n\nGrab yours before it sells out again!");
  const [isSaving, setIsSaving] = useState(false);

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const handleLaunch = async () => {
    if (!selectedProduct || selectedRecipients.length === 0 || !campaignName) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "whatsapp_campaigns"), {
        name: campaignName,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productImage: selectedProduct.images?.[0] || selectedProduct.image_url || "",
        recipientIds: selectedRecipients,
        messageTemplate: message,
        trackingUrl: `/api/campaign/whatsapp/{campaignId}/${selectedProduct.id}`,
        status: "active",
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        clickCount: 0,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to launch campaign.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border shadow-xl flex flex-col min-h-[600px] ${
      isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
    }`}>
      {/* Header */}
      <div className={`p-5 flex items-center justify-between border-b ${
        isLight ? "border-slate-200" : "border-white/[0.08]"
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Create WhatsApp Campaign</h2>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 w-8 rounded-full ${
                  step >= i ? "bg-emerald-500" : (isLight ? "bg-slate-200" : "bg-white/10")
                }`} />
              ))}
            </div>
          </div>
        </div>
        <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${
          isLight ? "hover:bg-slate-100 text-slate-500" : "hover:bg-white/10 text-slate-400"
        }`}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {step === 1 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Step 1: Campaign Details</h3>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isLight ? "text-slate-700" : "text-slate-300"}`}>Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="e.g. AirPods Pro Restock Oct 2026"
                className={`w-full px-4 py-3 rounded-xl border outline-none font-medium ${
                  isLight ? "bg-white border-slate-300 focus:border-emerald-500" : "bg-[#121A25] border-white/10 text-white focus:border-emerald-500"
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isLight ? "text-slate-700" : "text-slate-300"}`}>Select Product</label>
              <div className={`grid grid-cols-1 max-h-60 overflow-y-auto rounded-xl border p-2 gap-2 ${
                isLight ? "border-slate-300" : "border-white/10"
              }`}>
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={`flex items-center gap-4 p-3 rounded-lg text-left transition-colors border ${
                      selectedProduct?.id === p.id 
                        ? (isLight ? "bg-emerald-50 border-emerald-500" : "bg-emerald-500/10 border-emerald-500") 
                        : (isLight ? "bg-white border-transparent hover:bg-slate-50" : "bg-transparent border-transparent hover:bg-white/5")
                    }`}
                  >
                    {(p.images?.[0] || p.image_url) && (
                      <img src={p.images?.[0] || p.image_url} alt="" width={40} height={40} className="rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>{p.name}</p>
                      <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>Rs. {p.price?.toLocaleString()}</p>
                    </div>
                    {selectedProduct?.id === p.id && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Step 2: Select Recipients</h3>
            <p className={`text-sm ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Select the audience for this campaign. (For this demo, we'll select a bulk preset).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setSelectedRecipients(customers.map(c => c.id))}
                className={`p-5 rounded-xl border text-left transition-colors ${
                  selectedRecipients.length === customers.length && customers.length > 0
                    ? (isLight ? "bg-emerald-50 border-emerald-500" : "bg-emerald-500/10 border-emerald-500")
                    : (isLight ? "bg-white border-slate-300 hover:border-slate-400" : "bg-[#121A25] border-white/10 hover:border-white/20")
                }`}
              >
                <Users className={`w-6 h-6 mb-3 ${selectedRecipients.length === customers.length && customers.length > 0 ? "text-emerald-500" : "text-blue-500"}`} />
                <h4 className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>All Customers</h4>
                <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>{customers.length} Contacts</p>
              </button>
              <button 
                onClick={() => setSelectedRecipients([])}
                className={`p-5 rounded-xl border text-left transition-colors opacity-50 cursor-not-allowed ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-[#121A25] border-white/5"
                }`}
              >
                <BarChart3 className="w-6 h-6 mb-3 text-slate-400" />
                <h4 className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>VIP Customers</h4>
                <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>Purchased &gt; Rs. 50,000</p>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-6">
              <h3 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Step 3: Message Builder</h3>
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isLight ? "text-slate-700" : "text-slate-300"}`}>Message Content</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={8}
                  className={`w-full px-4 py-3 rounded-xl border outline-none text-sm leading-relaxed ${
                    isLight ? "bg-white border-slate-300 focus:border-emerald-500" : "bg-[#121A25] border-white/10 text-white focus:border-emerald-500"
                  }`}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {["{{customer_name}}", "{{product_name}}", "{{price}}", "{{store_name}}"].map(v => (
                    <button key={v} onClick={() => setMessage(m => m + " " + v)} className={`px-2 py-1 text-[10px] font-mono rounded border ${
                      isLight ? "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-[320px] bg-[#E5DDD5] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative h-[500px] flex flex-col">
                <div className="bg-[#075E54] text-white p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <span className="text-[#075E54] font-bold text-xs">1P</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">1place.lk</p>
                    <p className="text-[10px] opacity-80">Verified Business</p>
                  </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-cover">
                  <div className="bg-white rounded-xl rounded-tl-none p-3 max-w-[90%] shadow-sm mb-3">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                      {message
                        .replace("{{customer_name}}", "Customer")
                        .replace("{{product_name}}", selectedProduct?.name || "[Product]")
                        .replace("{{price}}", selectedProduct ? `Rs. ${selectedProduct.price?.toLocaleString()}` : "[Price]")
                        .replace("{{store_name}}", "1place.lk")
                      }
                    </p>
                    {selectedProduct && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                        {(selectedProduct.images?.[0] || selectedProduct.image_url) && (
                          <div className="relative h-32 bg-slate-100">
                            <img src={selectedProduct.images?.[0] || selectedProduct.image_url} alt="" className="object-cover w-full h-full" />
                          </div>
                        )}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">Buy Now</span>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-slate-400">12:45 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 text-center py-10">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Send className="w-10 h-10 text-emerald-500 ml-1" />
            </div>
            <h3 className={`text-2xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Ready to Launch?</h3>
            <p className={`text-base ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Your campaign <strong>"{campaignName}"</strong> will be sent to <strong>{selectedRecipients.length}</strong> customers.
            </p>
            <div className={`p-4 rounded-xl inline-block text-left ${
              isLight ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">Please ensure you comply with WhatsApp Business API policies. Promotional messages are only allowed for opted-in customers.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Controls */}
      <div className={`p-5 flex items-center justify-between border-t ${
        isLight ? "border-slate-200 bg-slate-50/50" : "border-white/[0.08] bg-white/[0.02]"
      }`}>
        <button
          onClick={handlePrev}
          disabled={step === 1 || isSaving}
          className={`px-5 py-2.5 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 ${
            isLight ? "text-slate-600 hover:bg-slate-200" : "text-slate-300 hover:bg-white/10"
          }`}
        >
          Back
        </button>
        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={
              (step === 1 && (!campaignName || !selectedProduct)) ||
              (step === 2 && selectedRecipients.length === 0)
            }
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleLaunch}
            disabled={isSaving}
            className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSaving ? "Launching..." : "Launch Campaign"}
            <Send className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>
    </div>
  );
}
