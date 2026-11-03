"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Plus, Search, X } from "lucide-react";
import { ADMIN_NAVIGATION, adminTabHref } from "@/lib/admin-navigation";
import { useDialogFocus } from "@/lib/use-dialog-focus";

export default function CommandPalette({ isOpen, onClose, onOpenAddProduct }: { isOpen: boolean; onClose: () => void; onOpenAddProduct?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus(isOpen, onClose);
  const commands = useMemo(() => [
    { id: "add-product", label: "Add product", group: "Quick action", icon: Plus, href: "" },
    ...ADMIN_NAVIGATION.map((item) => ({ ...item, href: adminTabHref(item.id) })),
  ], []);
  const results = commands.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    if (!isOpen) return;
    setQuery(""); setSelected(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previous; };
  }, [isOpen]);
  useEffect(() => { setSelected(0); }, [query]);
  useEffect(() => { if (isOpen) document.getElementById(`admin-command-${selected}`)?.scrollIntoView({ block: "nearest" }); }, [selected, isOpen]);
  const execute = (item: (typeof commands)[number]) => {
    onClose();
    if (item.id === "add-product") {
      if (onOpenAddProduct) onOpenAddProduct();
      else window.dispatchEvent(new CustomEvent("open-add-product-modal"));
    } else router.push(item.href);
  };
  if (!isOpen) return null;
  return <div className="admin-command-overlay">
    <div className="admin-command-backdrop" aria-hidden="true" onClick={onClose} />
    <div className="admin-command" ref={dialogRef} role="dialog" aria-modal="true" aria-label="Search admin" tabIndex={-1} data-lenis-prevent>
      <div className="admin-command__input"><Search size={19} /><input ref={inputRef} type="search" aria-label="Search pages and actions" role="combobox" aria-expanded="true" aria-controls="admin-command-results" aria-activedescendant={results[selected] ? `admin-command-${selected}` : undefined} placeholder="Search your workspace…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setSelected((value) => (value + 1) % Math.max(1, results.length)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setSelected((value) => (value - 1 + Math.max(1, results.length)) % Math.max(1, results.length)); }
        if (event.key === "Enter" && results[selected]) { event.preventDefault(); execute(results[selected]); }
      }} /><button type="button" aria-label="Close admin search" onClick={onClose}><X size={20} /></button></div>
      <div id="admin-command-results" role="listbox" aria-label="Pages and actions" className="admin-command__results">{results.length ? results.map((item,index) => <button type="button" id={`admin-command-${index}`} role="option" aria-selected={selected === index} key={item.id} onMouseEnter={() => setSelected(index)} onClick={() => execute(item)}><item.icon size={17} /><span>{item.label}</span><small>{item.group}</small><ArrowUpRight size={14} /></button>) : <p role="status">No results. Try “orders”, “products” or “settings”.</p>}</div>
      <div className="admin-command__footer"><span>↑ ↓ Navigate · Enter to open</span><button type="button" onClick={onClose}>Esc · Close</button></div>
    </div>
  </div>;
}
