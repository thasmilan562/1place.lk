"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";
import { DEFAULT_FOOTER_SETTINGS } from "@/lib/data";
import { FooterSettings } from "@/lib/types";

export default function FooterTab({ onRefresh }: { onRefresh?: () => void }) {
  const [settings, setSettings] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    getDoc(doc(db, "settings", "footer")).then((snapshot) => {
      if (snapshot.exists()) setSettings({ ...DEFAULT_FOOTER_SETTINGS, ...snapshot.data() } as FooterSettings);
    }).catch(() => { setLoadFailed(true); setError("Footer settings couldn't load. Refresh before editing."); }).finally(() => setLoading(false));
  }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving || loading || loadFailed) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await setDoc(doc(db, "settings", "footer"), settings, { merge: true });
      setMessage("Footer updated."); onRefresh?.();
    } catch { setError("Couldn't save the footer. Please try again."); }
    finally { setSaving(false); }
  };
  const update = <K extends keyof FooterSettings>(key: K, value: FooterSettings[K]) => { setSettings((previous) => ({ ...previous, [key]: value })); setMessage(""); };
  return <form className="admin-editor" onSubmit={save}>
    <div className="admin-editor__heading"><div><h1>Footer</h1><p>A simple sign-off for your store.</p></div><button type="submit" className="admin-editor__save" disabled={loading || saving || loadFailed}>{saving ? "Saving…" : "Save changes"}</button></div>
    {error && <p role="alert" className="admin-feedback">{error}</p>}{message && <p role="status" className="admin-feedback">{message}</p>}
    <fieldset disabled={loading || saving || loadFailed}>
      <section className="admin-editor__panel"><div className="admin-setting-row"><div><h3>Show footer</h3><p>Display store links and contact destinations.</p></div><button type="button" role="switch" aria-label="Show footer" aria-checked={settings.enabled} onClick={() => update("enabled", !settings.enabled)}><span /></button></div>
        <div className="pt-5"><label className="admin-editor__field">Short description<textarea rows={2} maxLength={180} value={settings.description} onChange={(event) => update("description", event.target.value)} /></label><label className="admin-editor__field">Logo URL<input value={settings.logo_url} onChange={(event) => update("logo_url", event.target.value)} /></label><label className="admin-editor__field">Copyright line<input value={settings.copyright_text} onChange={(event) => update("copyright_text", event.target.value)} /></label></div>
      </section>
      <section className="admin-editor__panel"><h2>Stay connected</h2>
        {([['instagram_url','instagram_enabled','Instagram'],['facebook_url','facebook_enabled','Facebook'],['tiktok_url','tiktok_enabled','TikTok']] as const).map(([url,enabled,label]) => <div key={url} className="mb-5"><div className="admin-setting-row"><h3>{label}</h3><button type="button" role="switch" aria-label={`Show ${label}`} aria-checked={settings[enabled]} onClick={() => update(enabled, !settings[enabled])}><span /></button></div><label className="admin-editor__field mt-3">{label} URL<input type="url" value={settings[url]} onChange={(event) => update(url, event.target.value)} /></label></div>)}
      </section>
    </fieldset>
  </form>;
}
