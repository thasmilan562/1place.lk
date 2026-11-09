"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/admin-firebase";

export default function StoreSettingsTab() {
  const [settings, setSettings] = useState({ googleAuthEnabled: true, appleAuthEnabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    getDoc(doc(db, "settings", "auth")).then((snapshot) => {
      if (snapshot.exists()) setSettings({ googleAuthEnabled: snapshot.data().googleAuthEnabled !== false, appleAuthEnabled: snapshot.data().appleAuthEnabled !== false });
    }).catch(() => setError("Settings couldn't load. Refresh before making changes.")).finally(() => setLoading(false));
  }, []);
  const save = async () => {
    setSaving(true); setSaved(false); setError("");
    try {
      const batch = writeBatch(db);
      const data = { ...settings, updatedAt: new Date().toISOString() };
      batch.set(doc(db, "settings", "auth"), data, { merge: true });
      batch.set(doc(db, "siteSettings", "auth"), data, { merge: true });
      await batch.commit(); setSaved(true);
    } catch { setError("Couldn't save your settings. Try again."); }
    finally { setSaving(false); }
  };
  return <div className="admin-editor"><div className="admin-editor__heading"><div><h1>Store settings</h1><p>The essentials for your customer account experience.</p></div><button type="button" className="admin-editor__save" onClick={save} disabled={loading || saving || !!error}>{saving ? "Saving…" : "Save changes"}</button></div>
    {error && <p role="alert" className="admin-feedback">{error}<button type="button" onClick={() => window.location.reload()} className="ml-3 underline">Reload</button></p>}{saved && <p role="status" className="admin-feedback">Changes saved.</p>}
    <section className="admin-editor__panel"><h2>Customer sign-in</h2><p className="text-xs text-neutral-500 leading-relaxed">Email and password remain available. Social sign-in requires a configured provider.</p>
      {([['googleAuthEnabled', 'Google sign-in'], ['appleAuthEnabled', 'Apple sign-in']] as const).map(([key,label]) => <div className="admin-setting-row" key={key}><div><h3>{label}</h3><p>Show this option on the sign-in and registration forms.</p></div><button type="button" role="switch" aria-label={label} aria-checked={settings[key]} disabled={loading} onClick={() => { setSaved(false); setSettings((previous) => ({ ...previous, [key]: !previous[key] })); }}><span /></button></div>)}
    </section>
  </div>;
}
