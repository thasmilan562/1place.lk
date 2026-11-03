"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Product } from "@/lib/types";
import ProductCard from "@/components/products/ProductCard";

/** Discovery suggestions are not claims of technical compatibility. */
export default function CompatibleAccessories({ currentProduct, allProducts }: {
  currentProduct: Product;
  allProducts: Product[];
}) {
  const seen = new Set<string>();
  const category = currentProduct.category_id || currentProduct.category_slug;
  const products = allProducts.filter((product) => {
    if (product.id === currentProduct.id || seen.has(product.id) ||
        ["draft", "inactive", "archived", "deleted"].includes((product.status || "").toLowerCase())) return false;
    seen.add(product.id);
    return true;
  }).sort((a, b) => {
    if (!category) return 0;
    return Number((b.category_id || b.category_slug) === category) - Number((a.category_id || a.category_slug) === category);
  }).slice(0, 4);
  if (!products.length) return null;
  return (
    <section className="mt-16 sm:mt-24 pt-10 border-t border-neutral-200">
      <div className="flex items-end justify-between gap-5 mb-7">
        <div><p className="premium-eyebrow">A LITTLE MORE TO DISCOVER</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">You might also like.</h2>
          <p className="text-sm text-neutral-500 mt-3">More good finds from the collection.</p>
        </div>
        <Link href="/products" className="premium-text-link shrink-0">Shop all <ArrowRight size={16} /></Link>
      </div>
      <div className="premium-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>
  );
}
