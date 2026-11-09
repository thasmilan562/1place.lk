"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Save, Check } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import { useAdminTheme } from "@/app/admin/dashboard/layout";

export default function MobileExperienceTab() {
  const { isLight } = useAdminTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enableCampaignPopup: true,
    campaignPopupDelay: 3000,
    searchAliases: "fona:iphone\nmac:macbook\niwatch:apple watch",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, "settings", "mobile_experience"));
        if (snap.exists()) {
          setSettings(snap.data() as any);
        }
      } catch (e) {
        console.error("Failed to load mobile experience settings", e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "mobile_experience"), settings, { merge: true });
      showToast("Mobile experience settings saved successfully", "success");
    } catch (e) {
      console.error("Failed to save mobile experience settings", e);
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={`p-6 text-sm font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>Loading configuration...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className={`${isLight ? "bg-white border-[#E2E8F0] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"} border rounded-2xl p-6`}>
        <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
          <div className={`w-9 h-9 rounded-xl ${isLight ? "bg-blue-50 text-blue-600" : "bg-blue-500/10 text-blue-400"} flex items-center justify-center`}>
            <Smartphone className="w-5 h-5" />
          </div>
          Mobile Experience Configuration
        </h3>

        <div className="space-y-6">
          {/* Campaign Popup Config */}
          <div className="space-y-3">
            <h4 className={`font-semibold text-sm ${isLight ? "text-slate-800" : "text-white"}`}>Campaign Popup (Bottom Sheet)</h4>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={settings.enableCampaignPopup}
                onChange={(e) => setSettings({ ...settings, enableCampaignPopup: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20"
              />
              <span className={`text-sm ${isLight ? "text-slate-600" : "text-white/70"}`}>Enable sliding campaign popup on mobile</span>
            </label>
            <div className="mt-2">
              <label className={`text-xs mb-1 block ${isLight ? "text-slate-500" : "text-white/50"}`}>Popup Delay (ms)</label>
              <input
                type="number"
                value={settings.campaignPopupDelay}
                onChange={(e) => setSettings({ ...settings, campaignPopupDelay: parseInt(e.target.value) || 0 })}
                className={`w-full rounded-xl px-3.5 py-2 text-sm outline-none border focus:border-blue-500 ${
                  isLight ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 focus:bg-white" : "bg-[#0B111A] border-white/[0.08] text-white"
                }`}
              />
            </div>
          </div>

          <hr className={isLight ? "border-slate-200" : "border-white/5"} />

          {/* Search Aliases Config */}
          <div className="space-y-3">
            <div>
              <h4 className={`font-semibold text-sm ${isLight ? "text-slate-800" : "text-white"}`}>Fuzzy Search Aliases</h4>
              <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>Map common typos or slang to correct search terms. Format: <code>wrong_term:correct_term</code> (one per line).</p>
            </div>
            <textarea
              value={settings.searchAliases}
              onChange={(e) => setSettings({ ...settings, searchAliases: e.target.value })}
              rows={4}
              className={`w-full rounded-xl px-3.5 py-2 text-sm font-mono outline-none border focus:border-blue-500 ${
                isLight ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-900 focus:bg-white" : "bg-[#0B111A] border-white/[0.08] text-white"
              }`}
              placeholder="fona:iphone&#10;mac:macbook"
            />
          </div>

          {/* Save Button */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {saving ? <Check className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
