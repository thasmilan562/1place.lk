"use client";
import { useEffect, useState } from "react";
import { Brand } from "@/lib/types";
import { deleteBrandFromDb, getBrandsFromDb, saveBrandToDb } from "@/lib/firestore-brands";

export default function SimpleBrandsTab() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const remove = async (brand: Brand) => {
    if (deleting || !window.confirm(`Permanently delete “${brand.name}”? This removes the brand from your store and cannot be undone here. Products will be kept.`)) return;
    setDeleting(brand.id); setError(""); setMessage("");
    try {
      await deleteBrandFromDb(brand.id, brand);
      setBrands((current) => current.filter((item) => item.id !== brand.id));
      if (editing?.id === brand.id) setEditing(null);
      setMessage(`${brand.name} was permanently removed.`);
    } catch { setError("Couldn't delete this brand. Please try again."); }
    finally { setDeleting(null); }
  };
  useEffect(() => { getBrandsFromDb().then(setBrands).catch(() => setError("Brands couldn't load. Please refresh.")).finally(() => setLoading(false)); }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editing || saving) return;
    const name = editing.name?.trim();
    const slug = (editing.slug || name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!name || !slug) { setError("Enter a brand name and a valid URL slug."); return; }
    if (brands.some((brand) => brand.id !== editing.id && brand.slug === slug)) { setError("That brand URL is already in use."); return; }
    setSaving(true); setError("");
    try { await saveBrandToDb({ ...editing, name, slug }); setBrands(await getBrandsFromDb()); setEditing(null); }
    catch { setError("Couldn't save this brand. Try again."); }
    finally { setSaving(false); }
  };
  return <div className="admin-editor"><div className="admin-editor__heading"><div><h1>Brands</h1><p>Manage the names and logos used across your catalog.</p></div><button className="admin-editor__save" type="button" onClick={() => { setError(""); setEditing({ name: "", slug: "", enabled: true }); }}>Add brand</button></div>
    {error && <p className="admin-feedback" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {editing && <form onSubmit={save} className="admin-editor__panel"><h2>{editing.id ? "Edit brand" : "New brand"}</h2><label className="admin-editor__field">Brand name<input required value={editing.name || ""} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><label className="admin-editor__field">URL slug<input value={editing.slug || ""} placeholder="Created from the name if left blank" onChange={(event) => setEditing({ ...editing, slug: event.target.value })} /></label><label className="admin-editor__field">Logo URL<input type="url" value={editing.logo_url || ""} onChange={(event) => setEditing({ ...editing, logo_url: event.target.value })} /></label><label className="flex gap-2 text-xs mb-5"><input type="checkbox" checked={editing.enabled !== false} onChange={(event) => setEditing({ ...editing, enabled: event.target.checked, status: event.target.checked ? "active" : "inactive" })} /> Active in the store</label><div className="flex gap-5 items-center"><button className="admin-editor__save" type="submit" disabled={saving}>{saving ? "Saving…" : "Save brand"}</button><button type="button" className="text-xs" onClick={() => setEditing(null)}>Cancel</button></div></form>}
    <section className="admin-editor__panel"><label className="admin-editor__field">Search brands<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a brand" /></label>{loading ? <p className="text-sm">Loading brands…</p> : brands.filter((brand) => brand.name.toLowerCase().includes(search.toLowerCase())).map((brand) => <div key={brand.id} className="admin-setting-row"><div><h3>{brand.name}</h3><p>{brand.enabled === false || brand.status === "inactive" ? "Inactive" : "Active"}</p></div><div className="flex items-center gap-2"><button className="text-xs min-h-11 px-3" type="button" onClick={() => { setEditing(brand); setError(""); }}>Edit</button><button className="text-xs min-h-11 px-3 text-red-600" type="button" disabled={deleting !== null} aria-label={`Permanently delete ${brand.name}`} onClick={() => remove(brand)}>{deleting === brand.id ? "Deleting…" : "Delete"}</button></div></div>)}{!loading && !brands.some((brand) => brand.name.toLowerCase().includes(search.toLowerCase())) && <p className="text-sm text-neutral-500">No matching brands.</p>}</section>
  </div>;
}

