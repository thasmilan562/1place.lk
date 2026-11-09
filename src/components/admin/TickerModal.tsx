"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Truck,
  Lock,
  MapPin,
  Smartphone,
  Star,
  Zap,
  Gift,
  Heart,
  Award,
} from "lucide-react";
import { db } from "@/lib/admin-firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { TickerSettings, TickerMessage } from "@/lib/types";

const ICON_OPTIONS = [
  { value: "", label: "None" },
  { value: "ShieldCheck", label: "Shield Check" },
  { value: "Truck", label: "Truck" },
  { value: "Lock", label: "Lock" },
  { value: "MapPin", label: "Map Pin" },
  { value: "Smartphone", label: "Smartphone" },
  { value: "Star", label: "Star" },
  { value: "Zap", label: "Zap" },
  { value: "Gift", label: "Gift" },
  { value: "Heart", label: "Heart" },
  { value: "Award", label: "Award" },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  Truck,
  Lock,
  MapPin,
  Smartphone,
  Star,
  Zap,
  Gift,
  Heart,
  Award,
};

const DEFAULT_SETTINGS: TickerSettings = {
  enabled: true,
  messages: [
    { id: "t1", text: "Genuine Products with Warranty", icon: "ShieldCheck", active: true, sort_order: 0 },
    { id: "t2", text: "Islandwide Delivery Available", icon: "Truck", active: true, sort_order: 1 },
    { id: "t3", text: "Secure Online Payments", icon: "Lock", active: true, sort_order: 2 },
    { id: "t4", text: "Visit 1PLACE.LK — Colombo 03", icon: "MapPin", active: true, sort_order: 3 },
    { id: "t5", text: "Latest Smartphones & Accessories", icon: "Smartphone", active: true, sort_order: 4 },
  ],
  text_color: "#FFFFFF",
  bg_color: "#000000",
  speed: "normal",
  direction: "rtl",
  pause_on_hover: true,
};

interface TickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TickerModal({ isOpen, onClose }: TickerModalProps) {
  const [settings, setSettings] = useState<TickerSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Load existing settings from Firestore
  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      try {
        const snap = await getDoc(doc(db, "settings", "ticker"));
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as TickerSettings);
        }
      } catch {
        // Use defaults
      }
    }
    load();
  }, [isOpen]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...settings,
        messages: settings.messages.map((m, i) => ({ ...m, sort_order: i })),
        updated_at: new Date().toISOString(),
      };
      await setDoc(doc(db, "settings", "ticker"), payload, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Error saving ticker settings:", e);
      alert("Failed to save ticker settings");
    } finally {
      setSaving(false);
    }
  };

  const addMessage = () => {
    const newMsg: TickerMessage = {
      id: `t-${Date.now()}`,
      text: "",
      icon: "",
      active: true,
      sort_order: settings.messages.length,
    };
    setSettings({ ...settings, messages: [...settings.messages, newMsg] });
  };

  const removeMessage = (id: string) => {
    setSettings({ ...settings, messages: settings.messages.filter((m) => m.id !== id) });
  };

  const updateMessage = (id: string, field: keyof TickerMessage, value: string | boolean | number) => {
    setSettings({
      ...settings,
      messages: settings.messages.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    });
  };

  const moveMessage = (index: number, direction: "up" | "down") => {
    const msgs = [...settings.messages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= msgs.length) return;
    [msgs[index], msgs[targetIndex]] = [msgs[targetIndex], msgs[index]];
    setSettings({ ...settings, messages: msgs });
  };

  const activeMessages = settings.messages.filter((m) => m.active);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0A0A0F] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0A0A0F] border-b border-white/10 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-lg font-extrabold text-white">Announcement Ticker</h2>
            <p className="text-xs text-white/40 mt-0.5">Manage scrolling announcements below the hero slider</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
            <div>
              <p className="text-sm font-bold text-white">Enable Ticker</p>
              <p className="text-xs text-white/40">Show the scrolling announcement bar on the homepage</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
              className={`relative w-12 h-7 rounded-full transition-colors ${settings.enabled ? "bg-emerald-500" : "bg-white/10"}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.enabled ? "translate-x-5.5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Style Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Text Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Text Color</label>
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                <input type="color" value={settings.text_color} onChange={(e) => setSettings({ ...settings, text_color: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                <span className="text-xs font-mono text-white/60">{settings.text_color}</span>
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Background</label>
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                <input type="color" value={settings.bg_color} onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                <span className="text-xs font-mono text-white/60">{settings.bg_color}</span>
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Speed</label>
              <select
                value={settings.speed}
                onChange={(e) => setSettings({ ...settings, speed: e.target.value as "slow" | "normal" | "fast" })}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none"
              >
                <option value="slow" className="bg-black">Slow</option>
                <option value="normal" className="bg-black">Normal</option>
                <option value="fast" className="bg-black">Fast</option>
              </select>
            </div>

            {/* Direction */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Direction</label>
              <select
                value={settings.direction}
                onChange={(e) => setSettings({ ...settings, direction: e.target.value as "rtl" | "ltr" })}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none"
              >
                <option value="rtl" className="bg-black">Right → Left</option>
                <option value="ltr" className="bg-black">Left → Right</option>
              </select>
            </div>

            {/* Pause on Hover */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Pause on Hover</label>
              <button
                onClick={() => setSettings({ ...settings, pause_on_hover: !settings.pause_on_hover })}
                className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors ${settings.pause_on_hover ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-white/60"
                  }`}
              >
                {settings.pause_on_hover ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">Messages ({settings.messages.length})</h3>
              <button
                onClick={addMessage}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-bold text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Message
              </button>
            </div>

            <div className="space-y-2">
              {settings.messages.map((msg, index) => {
                const IconComp = msg.icon ? ICON_MAP[msg.icon] : null;
                return (
                  <div key={msg.id} className="flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                    {/* Reorder arrows */}
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button
                        onClick={() => moveMessage(index, "up")}
                        disabled={index === 0}
                        className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveMessage(index, "down")}
                        disabled={index === settings.messages.length - 1}
                        className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Message content */}
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={msg.text}
                        onChange={(e) => updateMessage(msg.id, "text", e.target.value)}
                        placeholder="Enter announcement text..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none placeholder:text-white/20"
                      />
                      <div className="flex items-center gap-3">
                        {/* Icon selector */}
                        <select
                          value={msg.icon || ""}
                          onChange={(e) => updateMessage(msg.id, "icon", e.target.value)}
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none"
                        >
                          {ICON_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-black">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {IconComp && <IconComp className="w-4 h-4 text-white/50" />}
                      </div>
                    </div>

                    {/* Toggle active + Delete */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => updateMessage(msg.id, "active", !msg.active)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${msg.active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"}`}
                      >
                        {msg.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => removeMessage(msg.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">Live Preview</h3>
              <div className="flex items-center gap-1.5">
                {(["desktop", "tablet", "mobile"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setPreviewDevice(d)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${previewDevice === d ? "bg-white text-black" : "bg-white/5 text-white/50 hover:text-white"}`}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl overflow-hidden border border-white/10 mx-auto"
              style={{
                maxWidth: previewDevice === "desktop" ? "100%" : previewDevice === "tablet" ? "768px" : "375px",
              }}
            >
              <div
                className="overflow-hidden"
                style={{
                  backgroundColor: settings.bg_color || "#000000",
                  color: settings.text_color || "#FFFFFF",
                  height: previewDevice === "desktop" ? "48px" : previewDevice === "tablet" ? "42px" : "38px",
                }}
              >
                <div className="h-full flex items-center overflow-hidden">
                  <div className="flex items-center gap-0 text-[13px] font-semibold ticker-marquee" style={{ animationDuration: "15s" }}>
                    <div className="flex items-center gap-0 shrink-0">
                      {activeMessages.map((msg, i) => {
                        const Ic = msg.icon ? ICON_MAP[msg.icon] : null;
                        return (
                          <span key={msg.id} className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap">
                            {Ic && <Ic className="w-3.5 h-3.5 opacity-70" />}
                            <span>{msg.text}</span>
                            <span className="mx-3 text-[10px] opacity-30">•</span>
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-0 shrink-0" aria-hidden="true">
                      {activeMessages.map((msg) => {
                        const Ic = msg.icon ? ICON_MAP[msg.icon] : null;
                        return (
                          <span key={`dup-${msg.id}`} className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap">
                            {Ic && <Ic className="w-3.5 h-3.5 opacity-70" />}
                            <span>{msg.text}</span>
                            <span className="mx-3 text-[10px] opacity-30">•</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Save */}
        <div className="sticky bottom-0 bg-[#0A0A0F] border-t border-white/10 px-6 py-4 flex items-center justify-between rounded-b-3xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-white/60 hover:text-white transition-colors">
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs font-bold text-emerald-400">✓ Saved!</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-white/90 text-black rounded-xl text-sm font-extrabold transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save & Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
