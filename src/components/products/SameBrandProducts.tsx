"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { Product } from "@/lib/types";
import { getMoreFromBrand } from "@/lib/recommendation-engine";
import ProductCard from "@/components/products/ProductCard";

interface SameBrandProductsProps {
  currentProduct: Product;
  allProducts: Product[];
}

export default function SameBrandProducts({
  currentProduct,
  allProducts,
}: SameBrandProductsProps) {
  const { brandName, products: brandProducts } = useMemo(() => {
    return getMoreFromBrand(currentProduct, allProducts, 4);
  }, [currentProduct, allProducts]);

  if (!brandName || brandProducts.length === 0) return null;

  return (
    <section className="mt-16 sm:mt-24 pt-12 border-t border-[#EAEAEA]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-blue-600 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-600" /> More from {brandName}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
            More Products from {brandName}
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Discover more from the {brandName} collection.
          </p>
        </div>

        <Link
          href={`/products?brand=${encodeURIComponent(brandName.toLowerCase())}`}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-extrabold text-black hover:text-blue-600 transition-colors group"
        >
          <span>View All {brandName}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 w-full min-w-0">
        {brandProducts.map((product) => (
          <div key={product.id} className="h-full w-full min-w-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
