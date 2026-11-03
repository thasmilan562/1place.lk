"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  MessageSquare,
  CircleCheck as Sparkles,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  Save,
  Clock,
  Headphones,
  Settings,
  BookOpen,
  Filter,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Globe,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import {
  AssistantConversation,
  AssistantFAQ,
  AssistantSettings,
} from "@/lib/types";
import {
  DEFAULT_ASSISTANT_SETTINGS,
  DEFAULT_FAQS,
} from "@/lib/assistant-knowledge";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

export default function AssistantTab() {
  const { isLight } = useAdminTheme();
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "conversations" | "faqs" | "settings">("overview");

  // State
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [faqs, setFaqs] = useState<AssistantFAQ[]>(DEFAULT_FAQS);
  const [settings, setSettings] = useState<AssistantSettings>(DEFAULT_ASSISTANT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Conversation detail view
  const [selectedConv, setSelectedConv] = useState<AssistantConversation | null>(null);
  const [convSearch, setConvSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [internalNoteInput, setInternalNoteInput] = useState("");

  // FAQ Modal state
  const [editingFaq, setEditingFaq] = useState<AssistantFAQ | null>(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);

  // Load Assistant data from Firestore
  useEffect(() => {
    async function loadAssistantData() {
      setLoading(true);
      try {
        // 1. Load Settings
        const settingsSnap = await getDoc(doc(db, "settings", "assistant"));
        if (settingsSnap.exists()) {
          setSettings({ ...DEFAULT_ASSISTANT_SETTINGS, ...settingsSnap.data() } as AssistantSettings);
        }

        // 2. Load FAQs
        const faqsSnap = await getDocs(collection(db, "assistant_faqs"));
        if (!faqsSnap.empty) {
          const list = faqsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AssistantFAQ));
          setFaqs(list);
        } else {
          // Initialize defaults if collection empty
          setFaqs(DEFAULT_FAQS);
        }

        // 3. Load Conversations
        const res = await fetch("/api/assistant/conversations?limit=60");
        const data = await res.json();
        if (data.conversations) {
          setConversations(data.conversations);
        }
      } catch (err) {
        console.warn("Error loading assistant admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAssistantData();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "assistant"), {
        ...settings,
        updated_at: new Date().toISOString(),
      });
      triggerToast("Assistant settings saved successfully!");
    } catch (e: any) {
      alert("Failed to save settings: " + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Save FAQ
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq || !editingFaq.question_en.trim() || !editingFaq.answer_en.trim()) return;

    try {
      const faqId = editingFaq.id || `faq-${Date.now()}`;
      const payload = {
        ...editingFaq,
        id: faqId,
        created_at: editingFaq.created_at || new Date().toISOString(),
      };

      await setDoc(doc(db, "assistant_faqs", faqId), payload);

      setFaqs((prev) => {
        const idx = prev.findIndex((f) => f.id === faqId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = payload;
          return next;
        }
        return [payload, ...prev];
      });

      setIsFaqModalOpen(false);
      setEditingFaq(null);
      triggerToast("Knowledge FAQ saved!");
    } catch (err: any) {
      alert("Error saving FAQ: " + err.message);
    }
  };

  // Delete FAQ
  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      await deleteDoc(doc(db, "assistant_faqs", id));
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      triggerToast("FAQ removed.");
    } catch (err: any) {
      alert("Error deleting FAQ: " + err.message);
    }
  };

  // Update Conversation Status
  const handleUpdateConvStatus = async (id: string, status: any) => {
    try {
      await fetch("/api/assistant/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
      if (selectedConv?.id === id) {
        setSelectedConv((prev) => (prev ? { ...prev, status } : null));
      }
      triggerToast(`Conversation marked as ${status}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Save Internal Note on Conversation
  const handleSaveConvNote = async (id: string) => {
    if (!internalNoteInput.trim()) return;
    try {
      await fetch("/api/assistant/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes: internalNoteInput }),
      });

      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, notes: internalNoteInput } : c))
      );
      if (selectedConv?.id === id) {
        setSelectedConv((prev) => (prev ? { ...prev, notes: internalNoteInput } : null));
      }
      setInternalNoteInput("");
      triggerToast("Note saved.");
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Conversations
  const filteredConversations = conversations.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!convSearch.trim()) return true;
    const q = convSearch.toLowerCase();
    const msgsText = (c.messages || []).map((m) => m.text).join(" ").toLowerCase();
    return (
      (c.sessionId || "").toLowerCase().includes(q) ||
      (c.userName || "").toLowerCase().includes(q) ||
      msgsText.includes(q)
    );
  });

  // Calculate Metrics
  const todayStr = new Date().toISOString().split("T")[0];
  const conversationsToday = conversations.filter((c) => (c.createdAt || "").startsWith(todayStr)).length;
  const humanHandoffs = conversations.filter((c) => c.status === "handed_off").length;

  return (
    <div className="space-y-6 text-neutral-900 font-sans">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border border-neutral-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} p-6 sm:p-7 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-black border border-white/20 shadow-md shrink-0">
            <img
              src="/icon.svg"
              alt="1Place AI"
              className="w-full h-full object-cover object-center p-2"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                1Place AI Assistant
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                settings.enabled
                  ? isLight ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : isLight ? "bg-slate-100 text-slate-600 border border-slate-200" : "bg-white/10 text-white/60 border border-white/10"
              }`}>
                {settings.enabled ? "Active" : "Disabled"}
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Manage AI shopping assistance, multi-language knowledge, live conversations and store policies.
            </p>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className={`flex items-center gap-1.5 p-1 rounded-xl self-start md:self-auto text-xs font-semibold border ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"
        }`}>
          {[
            { id: "overview", label: "Overview", icon: TrendingUp },
            { id: "conversations", label: "Conversations", icon: MessageSquare },
            { id: "faqs", label: "Knowledge & FAQs", icon: BookOpen },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : isLight ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SUB-TAB 1: OVERVIEW METRICS
      ════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"}`}>
              <span className={`text-xs font-semibold uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Total Conversations
              </span>
              <span className={`text-3xl font-bold mt-1 block ${isLight ? "text-slate-900" : "text-white"}`}>
                {conversations.length}
              </span>
              <span className={`text-[11px] mt-2 block ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                Across English, Tamil &amp; Sinhala
              </span>
            </div>

            <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"}`}>
              <span className={`text-xs font-semibold uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Sessions Today
              </span>
              <span className="text-3xl font-bold text-emerald-500 mt-1 block">
                {conversationsToday}
              </span>
              <span className={`text-[11px] mt-2 block ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                Real-time active visitors
              </span>
            </div>

            <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"}`}>
              <span className={`text-xs font-semibold uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Human Handoffs
              </span>
              <span className={`text-3xl font-bold mt-1 block ${isLight ? "text-slate-900" : "text-white"}`}>
                {humanHandoffs}
              </span>
              <span className={`text-[11px] mt-2 block ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                WhatsApp &amp; Call referrals
              </span>
            </div>

            <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"}`}>
              <span className={`text-xs font-semibold uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Knowledge FAQs
              </span>
              <span className={`text-3xl font-bold mt-1 block ${isLight ? "text-slate-900" : "text-white"}`}>
                {faqs.length}
              </span>
              <span className={`text-[11px] mt-2 block ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                Active multi-language answers
              </span>
            </div>

          </div>

          {/* Quick Common Inquiries Card */}
          <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} p-6 rounded-2xl border space-y-4`}>
            <h3 className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>
              Popular Assistant Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>📱 Find a Phone</span>
                <p className={`mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>Queries live stock and displays rich product cards with instant Add to Bag.</p>
              </div>
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>📦 Verified Order Tracking</span>
                <p className={`mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>Protects customer data with 2-factor order # + phone verification.</p>
              </div>
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>🔧 Repairs &amp; Warranty</span>
                <p className={`mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>Explains Colombo service center screen/battery replacement and warranty details.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SUB-TAB 2: CONVERSATION MANAGER
      ════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "conversations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Conversations List (col-span-5) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            
            {/* Search & Status Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chats by query or ID..."
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border border-neutral-200 bg-neutral-50 outline-none focus:border-black"
                />
              </div>

              <div className="flex gap-1.5 text-[11px] font-bold">
                {["all", "active", "resolved", "handed_off"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                      statusFilter === st
                        ? "bg-black text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* List items */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  No conversations match this criteria.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedConv?.id === conv.id;
                  const lastMsg = conv.messages?.[conv.messages.length - 1];

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConv(conv);
                        setInternalNoteInput(conv.notes || "");
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-neutral-900 text-white border-black"
                          : "bg-neutral-50/60 border-neutral-200 hover:border-neutral-400 text-neutral-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono font-bold truncate">
                          {conv.sessionId?.slice(0, 16) || "Session"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-neutral-200 text-neutral-700"
                        }`}>
                          {conv.language || "EN"}
                        </span>
                      </div>

                      <p className={`line-clamp-2 text-[11px] ${isSelected ? "text-neutral-300" : "text-neutral-600"}`}>
                        {lastMsg ? lastMsg.text : "Empty chat"}
                      </p>

                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] opacity-70">
                        <span>{conv.messages?.length || 0} messages</span>
                        <span>{new Date(conv.updatedAt || conv.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right: Conversation Transcript Inspector (col-span-7) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            {selectedConv ? (
              <div className="space-y-4">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200">
                  <div>
                    <h4 className="font-extrabold text-sm text-neutral-950">
                      Session #{selectedConv.sessionId}
                    </h4>
                    <span className="text-xs text-neutral-500 font-mono">
                      Started: {new Date(selectedConv.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateConvStatus(selectedConv.id, "resolved")}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                    >
                      Mark Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateConvStatus(selectedConv.id, "handed_off")}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800"
                    >
                      Handed Off
                    </button>
                  </div>
                </div>

                {/* Message Log */}
                <div className="space-y-3 max-h-[380px] overflow-y-auto p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                  {(selectedConv.messages || []).map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === "assistant" ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`p-3 rounded-xl max-w-[85%] ${
                          m.sender === "assistant"
                            ? "bg-white border border-neutral-200 text-neutral-900"
                            : "bg-black text-white font-medium"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                          {m.sender}
                        </span>
                        <div className="whitespace-pre-line leading-relaxed">{m.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Internal Notes */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Internal Agent Notes
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Customer enquired about iPhone 16 Pro Max stock..."
                      value={internalNoteInput}
                      onChange={(e) => setInternalNoteInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl text-xs border border-neutral-200 outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveConvNote(selectedConv.id)}
                      className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800"
                    >
                      Save Note
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-20 text-center text-xs text-neutral-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                <p>Select a conversation from the left to view the transcript and agent controls.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SUB-TAB 3: KNOWLEDGE & FAQS
      ════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "faqs" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div>
              <h3 className="font-extrabold text-base text-neutral-950">
                Knowledge Base FAQs
              </h3>
              <p className="text-xs text-neutral-500">
                FAQs are automatically used by Street Assistant to answer customers accurately in English, Tamil, and Sinhala.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingFaq({
                  id: `faq-${Date.now()}`,
                  category: "products",
                  question_en: "",
                  answer_en: "",
                  question_ta: "",
                  answer_ta: "",
                  question_si: "",
                  answer_si: "",
                });
                setIsFaqModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New FAQ</span>
            </button>
          </div>

          {/* FAQs List */}
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-neutral-200 text-neutral-800">
                      {faq.category}
                    </span>
                    <h4 className="font-bold text-sm text-neutral-950">
                      {faq.question_en}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFaq(faq);
                        setIsFaqModalOpen(true);
                      }}
                      className="p-1.5 text-neutral-600 hover:text-black rounded-lg hover:bg-neutral-200 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  {faq.answer_en}
                </p>

                {faq.answer_ta && (
                  <p className="text-xs text-neutral-500 italic pt-1 border-t border-neutral-200/60">
                    <strong className="not-italic text-neutral-700">TA:</strong> {faq.answer_ta}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* FAQ Add / Edit Modal */}
          {isFaqModalOpen && editingFaq && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white max-w-lg w-full rounded-2xl p-6 space-y-4 border border-neutral-200 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <h4 className="font-extrabold text-base text-neutral-950">
                    {editingFaq.id ? "Edit FAQ" : "Add FAQ"}
                  </h4>
                  <button
                    onClick={() => setIsFaqModalOpen(false)}
                    className="text-neutral-400 hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveFaq} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={editingFaq.category}
                      onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                    >
                      <option value="products">Products</option>
                      <option value="repairs">Repairs &amp; Services</option>
                      <option value="warranty">Warranty</option>
                      <option value="orders">Orders &amp; Delivery</option>
                      <option value="payment">Payments</option>
                      <option value="store">Store Information</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Question (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingFaq.question_en}
                      onChange={(e) => setEditingFaq({ ...editingFaq, question_en: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Answer (English) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={editingFaq.answer_en}
                      onChange={(e) => setEditingFaq({ ...editingFaq, answer_en: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Question (Tamil - Optional)
                    </label>
                    <input
                      type="text"
                      value={editingFaq.question_ta || ""}
                      onChange={(e) => setEditingFaq({ ...editingFaq, question_ta: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Answer (Tamil - Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={editingFaq.answer_ta || ""}
                      onChange={(e) => setEditingFaq({ ...editingFaq, answer_ta: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setIsFaqModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-black text-white font-bold hover:bg-neutral-800"
                    >
                      Save FAQ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SUB-TAB 4: ASSISTANT SETTINGS
      ════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "settings" && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-neutral-200 shadow-2xs space-y-6">
          
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
            <div>
              <h3 className="font-extrabold text-base text-neutral-950">
                Assistant Configuration
              </h3>
              <p className="text-xs text-neutral-500">
                Configure Street Assistant identity, welcome greetings, and business hours.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Settings</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            
            {/* Assistant Enabled Toggle */}
            <div className="sm:col-span-2 flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <div>
                <span className="font-bold text-neutral-950 block text-sm">Enable Streetla Assistant</span>
                <span className="text-neutral-500">Show floating Streetla launcher on the website</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="w-5 h-5 rounded text-black accent-black cursor-pointer"
              />
            </div>

            {/* Streetla Avatar Preview & Controls */}
            <div className="sm:col-span-2 p-5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row items-center gap-5">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-lg bg-black shrink-0">
                <img
                  src={settings.avatar_url || "/streetla.png"}
                  alt="Streetla Avatar"
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute("src", "/streetla.png");
                  }}
                />
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[#00E676] border-2 border-black" />
              </div>

              <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                <h4 className="font-extrabold text-sm text-neutral-950">Official Streetla Avatar &amp; Icon</h4>
                
                {/* Image Link Input Field */}
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1 text-[11px]">
                    Paste Direct Image Link (URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.png or /images/..."
                      value={settings.avatar_url || ""}
                      onChange={(e) => setSettings({ ...settings, avatar_url: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl text-xs border border-neutral-200 bg-white outline-none focus:border-black font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSettings({ ...settings, avatar_url: "/streetla.png" });
                        triggerToast("Reset to default Streetla portrait.");
                      }}
                      className="px-3 py-2 rounded-xl border border-neutral-300 text-neutral-800 hover:bg-neutral-200 font-bold text-xs transition-colors shrink-0"
                    >
                      Default
                    </button>
                  </div>
                </div>

                {/* File Upload & Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                  <span className="text-[11px] text-neutral-400 font-medium">Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings({ ...settings, avatar_url: "/streetla.png" });
                      triggerToast("Selected 3D Tech Support Girl avatar.");
                    }}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-800 hover:bg-neutral-200 font-bold text-xs transition-colors"
                  >
                    3D Tech Girl
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings({ ...settings, avatar_url: "/streetla_vector.png" });
                      triggerToast("Selected Vector Support Girl avatar.");
                    }}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-800 hover:bg-neutral-200 font-bold text-xs transition-colors"
                  >
                    Vector Support Girl
                  </button>

                  <span className="text-[11px] text-neutral-400 font-medium ml-2">Or upload:</span>
                  <label className="px-3.5 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 font-bold text-xs cursor-pointer shadow-xs transition-all active:scale-95">
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) {
                              setSettings({ ...settings, avatar_url: reader.result as string });
                              triggerToast("Image file uploaded! Click 'Save Settings' to apply.");
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Assistant Name */}
            <div>
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Assistant Name
              </label>
              <input
                type="text"
                value={settings.assistant_name}
                onChange={(e) => setSettings({ ...settings, assistant_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-black font-bold"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Assistant Subtitle
              </label>
              <input
                type="text"
                value={settings.assistant_subtitle || "Your 1place.lk Shopping Assistant"}
                onChange={(e) => setSettings({ ...settings, assistant_subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-black"
              />
            </div>

            {/* Tooltip Text */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Launcher Welcome Tooltip
              </label>
              <input
                type="text"
                value={settings.tooltip_text || "Hi, I’m Streetla 👋 Need help?"}
                onChange={(e) => setSettings({ ...settings, tooltip_text: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-black"
              />
            </div>

            {/* Welcome Message EN */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Welcome Message (English)
              </label>
              <textarea
                rows={3}
                value={settings.welcome_message_en || ""}
                onChange={(e) => setSettings({ ...settings, welcome_message_en: e.target.value })}
                className="w-full p-3 rounded-xl border border-neutral-200 outline-none focus:border-black resize-none"
              />
            </div>

            {/* Welcome Message TA */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Welcome Message (Tamil)
              </label>
              <textarea
                rows={2}
                value={settings.welcome_message_ta || ""}
                onChange={(e) => setSettings({ ...settings, welcome_message_ta: e.target.value })}
                className="w-full p-3 rounded-xl border border-neutral-200 outline-none focus:border-black resize-none"
              />
            </div>

            {/* Business Hours */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Business Operating Hours
              </label>
              <input
                type="text"
                value={settings.business_hours || ""}
                onChange={(e) => setSettings({ ...settings, business_hours: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-black"
              />
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

function X(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
