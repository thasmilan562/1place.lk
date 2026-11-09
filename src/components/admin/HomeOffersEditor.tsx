"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Clock, ImagePlus, Save } from "lucide-react";
import { db } from "@/lib/firebase";
import { HOME_OFFER_DEFAULTS, HomeOfferSettings, offerEndTime } from "@/lib/home-offers";
import { uploadImageWithFallback } from "@/lib/upload-utils";

function toDateTimeLocal(value: string) {
  const timestamp = offerEndTime(value);
  if (!Number.isFinite(timestamp)) return "";
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function HomeOffersEditor() {
  const [settings, setSettings] = useState<HomeOfferSettings>(HOME_OFFER_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // 1. Fetch from server API first (resilient, no auth rule blocks)
    fetch("/api/admin/home-offers")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings({ ...HOME_OFFER_DEFAULTS, ...data.settings });
        } else {
          // Fallback to client Firestore
          return Promise.all([getDoc(doc(db, "settings", "home_offers")), getDoc(doc(db, "settings", "today_deal"))])
            .then(([snapshot, todayDeal]) => {
              const loaded = { ...HOME_OFFER_DEFAULTS, ...(snapshot.exists() ? snapshot.data() : {}) } as HomeOfferSettings;
              if (!loaded.endsAt && todayDeal.exists()) loaded.endsAt = String(todayDeal.data().endsAt || "");
              setSettings(loaded);
            });
        }
      })
      .catch(() => setMessage("Couldn't load the deal settings. Refresh before saving."))
      .finally(() => setLoading(false));
  }, []);

  const field = <K extends keyof HomeOfferSettings>(key: K, value: HomeOfferSettings[K]) => setSettings((previous) => ({ ...previous, [key]: value }));

  async function uploadImage(file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const url = await uploadImageWithFallback(file, "home_offers");
      field("dealImage", url);
      setMessage("Product image uploaded. Save the banner to publish it.");
    } catch {
      setMessage("Image upload failed. Try a smaller image file.");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || saving || uploading) return;
    if (settings.endsAt && (!Number.isFinite(offerEndTime(settings.endsAt)) || offerEndTime(settings.endsAt) <= Date.now())) {
      setMessage("Choose a future deal end date and time.");
      return;
    }
    if (!settings.dealLink.startsWith("/") || settings.dealLink.startsWith("//")) {
      setMessage("Use a store link beginning with /.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      // 1. Post to server-side admin API (uses service account / local store, immune to client rule blocks)
      const res = await fetch("/api/admin/home-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setMessage("Today's Deal banner saved. The homepage will update live.");
        if (data.settings) setSettings(data.settings);
      } else {
        throw new Error(data.error || "Save failed");
      }
    } catch {
      // 2. Client fallback attempt
      try {
        await setDoc(doc(db, "settings", "home_offers"), settings, { merge: true });
        setMessage("Today's Deal banner saved. The homepage will update live.");
      } catch {
        setMessage("Couldn't save the deal banner. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-editor__panel home-deal-editor" onSubmit={save}>
      <div className="home-deal-editor__heading">
        <div>
          <h2>Today&apos;s Deal banner</h2>
          <p>One panoramic banner with a centered product, promo copy and a live end-time countdown.</p>
        </div>
        <label className="home-deal-editor__toggle"><input type="checkbox" checked={settings.enabled} onChange={(event) => field("enabled", event.target.checked)} />Show banner</label>
      </div>

      <fieldset disabled={loading || saving || uploading}>
        <div className="home-deal-editor__columns">
          <div className="home-deal-editor__fields">
            <label className="admin-editor__field">Product name / left headline
              <input type="text" value={settings.dealTitle === "Today's Deal" ? "" : settings.dealTitle} placeholder="Leave blank to use the selected deal product" onChange={(event) => field("dealTitle", event.target.value)} />
            </label>
            <label className="admin-editor__field">Offer label
              <input type="text" value={settings.dealBadge || ""} placeholder="LIMITED TIME DEAL" onChange={(event) => field("dealBadge", event.target.value)} />
            </label>
            <label className="admin-editor__field">Right-side headline
              <input type="text" value={settings.ctaTitle} onChange={(event) => field("ctaTitle", event.target.value)} />
            </label>
            <label className="admin-editor__field">Description
              <textarea rows={3} value={settings.dealDescription || ""} onChange={(event) => field("dealDescription", event.target.value)} />
            </label>
            <div className="home-deal-editor__pair">
              <label className="admin-editor__field">Button text
                <input type="text" value={settings.ctaText} onChange={(event) => field("ctaText", event.target.value)} />
              </label>
              <label className="admin-editor__field">Button link
                <input type="text" value={settings.dealLink} placeholder="/products" onChange={(event) => field("dealLink", event.target.value)} />
              </label>
            </div>
          </div>

          <div className="home-deal-editor__media">
            <label className="admin-editor__field">Banner product image
              <span className="home-deal-editor__hint">A cutout or transparent PNG gives the closest match to the reference.</span>
              <input type="url" value={settings.dealImage} placeholder="Paste an image URL, or upload below" onChange={(event) => field("dealImage", event.target.value)} />
            </label>
            <label className="home-deal-editor__upload"><ImagePlus size={17} />{uploading ? "Uploading image…" : "Upload product image"}<input type="file" accept="image/*" onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
            {settings.dealImage && <div className="home-deal-editor__image-preview"><img src={settings.dealImage} alt="Today's deal image preview" /><button type="button" onClick={() => field("dealImage", "")}>Remove image</button></div>}
            <label className="admin-editor__field">Banner green
              <div className="home-deal-editor__color"><input type="color" value={settings.dealBackgroundColor || "#118a22"} onChange={(event) => field("dealBackgroundColor", event.target.value)} /><input type="text" value={settings.dealBackgroundColor || "#118a22"} onChange={(event) => field("dealBackgroundColor", event.target.value)} /></div>
            </label>
            <label className="admin-editor__field">Deal ends · Sri Lanka time
              <span className="home-deal-editor__input-icon"><Clock size={15} /><input type="datetime-local" value={toDateTimeLocal(settings.endsAt)} onChange={(event) => field("endsAt", event.target.value)} /></span>
              <small>The countdown follows this end time and won&apos;t reset when the page refreshes.</small>
            </label>
          </div>
        </div>

        <button className="admin-editor__save home-deal-editor__save" disabled={loading || saving || uploading} type="submit"><Save size={16} />{loading ? "Loading…" : saving ? "Saving…" : "Save Today’s Deal"}</button>
      </fieldset>
      {message && <p className="home-deal-editor__message" role="status">{message}</p>}
    </form>
  );
}
