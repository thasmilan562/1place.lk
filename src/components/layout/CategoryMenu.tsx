"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { Category } from "@/lib/types";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { deduplicateCategories } from "@/lib/category-utils";

export default function CategoryMenu({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: Category[] }) {
  const dialogRef = useDialogFocus(open, onClose);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  if (!open) return null;
  return <div className="category-menu-layer">
    <div className="category-menu-backdrop" aria-hidden="true" onClick={onClose} />
    <div ref={dialogRef} className="category-menu" role="dialog" aria-modal="true" aria-labelledby="category-menu-title" tabIndex={-1} data-lenis-prevent>
      <div className="category-menu__inner">
        <div className="category-menu__heading"><p id="category-menu-title">Explore ONEPLACE</p><button type="button" aria-label="Close categories" onClick={onClose}><X size={20} /></button></div>
        <nav aria-label="Shop by category" className="category-menu__links">
          {deduplicateCategories(categories).filter((category) => category.slug !== "more").map((category) => <Link key={category.id || category.slug} href={`/category/${category.slug}`} onClick={onClose}>{category.name}<ArrowUpRight size={16} /></Link>)}
        </nav>
        <Link href="/products" onClick={onClose} className="category-menu__all">Shop the entire collection <ArrowUpRight size={15} /></Link>
      </div>
    </div>
  </div>;
}
