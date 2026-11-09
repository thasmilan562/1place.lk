"use client";
import { useState } from "react";
import { Search, Plus, Package, Pencil, Trash2 } from "lucide-react";
import type { Product, Category, Brand } from "@/lib/types";

export default function CatalogProductsTab({ products, categories = [], brands = [], onAdd, onEdit, onDelete }: { products: Product[]; categories?: Category[]; brands?: Brand[]; onAdd: (category?: string) => void; onEdit: (product: Product) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("recent");
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const stock = (p: Product) => p.stock_count ?? p.stock_quantity ?? 0;
  const filtered = products.filter(p => !p.isDeleted && p.status !== "deleted" && `${p.name || ""} ${p.sku || p.code || ""} ${p.brand_name || p.brand || ""}`.toLowerCase().includes(query.trim().toLowerCase()) && (!category || (p.category_id || p.categoryId) === category) && (!brand || (p.brand_id || p.brandId) === brand || p.brand === brand) && (!status || (status === "out" ? stock(p) === 0 || p.stock_status === "out_of_stock" : (p.status || "active") === status))).sort((a,b) => sort === "name" ? (a.name || "").localeCompare(b.name || "") : sort === "price" ? (a.price || 0)-(b.price || 0) : (Date.parse(b.created_at || "") || 0)-(Date.parse(a.created_at || "") || 0));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const current = Math.min(page, pages);
  const reset = () => { setQuery(""); setCategory(""); setStatus(""); setBrand(""); setPage(1); };
  return <div className="admin-editor catalog-workspace">
    <div className="admin-editor__heading"><div><h1>Products</h1><p>{products.filter(p => !p.isDeleted && p.status !== "deleted").length} products in your catalog. Everything you need, in one place.</p></div><button type="button" className="admin-editor__save" onClick={() => onAdd()}><Plus size={16}/> Add product</button></div>
    <section className="catalog-panel">
      <div className="catalog-filters"><label className="catalog-search"><Search size={18}/><input type="search" aria-label="Search products in catalog" placeholder="Search by product name or SKU" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}/></label><select aria-label="Filter products by category" value={category} onChange={e => {setCategory(e.target.value);setPage(1);}}><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="Filter products by status" value={status} onChange={e => {setStatus(e.target.value);setPage(1);}}><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option><option value="out">Out of stock</option></select><button type="button" aria-expanded={more} onClick={() => setMore(!more)}>More filters</button></div>
      {more && <div className="catalog-filters"><select aria-label="Filter products by brand" value={brand} onChange={e => {setBrand(e.target.value);setPage(1);}}><option value="">All brands</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Newest first</option><option value="name">Name A–Z</option><option value="price">Price: low to high</option></select></div>}
      <div className="catalog-results"><span>{filtered.length} {filtered.length === 1 ? "product" : "products"}</span>{(query || category || status || brand) && <button type="button" onClick={reset}>Clear filters</button>}</div>
      <div className="catalog-columns"><span>Product</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span></div>
      {filtered.slice((current-1)*20,current*20).map(p => <article className="catalog-row" key={p.id}><div className="catalog-product">{p.images?.[0] || p.image_url ? <img src={p.images?.[0] || p.image_url} alt=""/> : <div className="catalog-placeholder"><Package size={24}/></div>}<div><button className="catalog-name" type="button" onClick={() => onEdit(p)}>{p.name || "Untitled Product"}</button><p>{p.category_name || p.categoryName || categories.find(c => c.id === p.category_id)?.name || "Uncategorised"}{p.sku || p.code ? ` · ${p.sku || p.code}` : ""}</p></div></div><div className="catalog-price"><small>LKR</small> {Number(p.price || 0).toLocaleString("en-LK",{minimumFractionDigits:2})}</div><div><span>{stock(p)}</span><small className="catalog-stock-label">{p.stock_status ? String(p.stock_status).replaceAll("_", " ") : (stock(p) === 0 ? "out of stock" : "in stock")}</small></div><div><span className={`catalog-status catalog-status--${p.status || "active"}`}>{p.status || "active"}</span></div><div className="catalog-actions"><button type="button" aria-label={`Edit ${p.name || "product"}`} onClick={() => onEdit(p)}><Pencil size={16}/><span>Edit</span></button><button type="button" aria-label={`Delete ${p.name || "product"}`} onClick={() => onDelete(p.id || p.slug || (p as any)._id)}><Trash2 size={16}/></button></div></article>)}
      {!filtered.length && <div className="catalog-empty"><Package size={32}/><h2>No products found</h2><p>Try another search or clear your filters.</p><button type="button" onClick={reset}>Clear filters</button></div>}
      <div className="catalog-pagination"><span>Page {current} of {pages}</span><div><button type="button" disabled={current === 1} onClick={() => setPage(current-1)}>Previous</button><button type="button" disabled={current === pages} onClick={() => setPage(current+1)}>Next</button></div></div>
    </section>
  </div>;
}
