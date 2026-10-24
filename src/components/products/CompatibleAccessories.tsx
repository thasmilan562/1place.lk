"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, Zap, Headphones, Watch, BatteryCharging, Shield, Cable as CableIcon } from "lucide-react";
import { Product } from "@/lib/types";
import {
  detectProductBrand,
  detectProductType,
  getCompatibleAccessories,
  getCompatibleDevices,
} from "@/lib/recommendation-engine";
import ProductCard from "@/components/products/ProductCard";

interface CompatibleAccessoriesProps {
  currentProduct: Product;
  allProducts: Product[];
}

export default function CompatibleAccessories({
  currentProduct,
  allProducts,
}: CompatibleAccessoriesProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const brand = useMemo(() => detectProductBrand(currentProduct), [currentProduct]);
  const productType = useMemo(() => detectProductType(currentProduct), [currentProduct]);

  // If viewing a phone, get accessories. If viewing an accessory, get companion accessories + compatible phones
  const rawAccessories = useMemo(() => {
    return getCompatibleAccessories(currentProduct, allProducts, 12);
  }, [currentProduct, allProducts]);

  const compatibleDevices = useMemo(() => {
    if (productType !== "phone") {
      return getCompatibleDevices(currentProduct, allProducts, 4);
    }
    return [];
  }, [currentProduct, allProducts, productType]);

  // Combined product list depending on type
  const itemsToDisplay = useMemo(() => {
    const list = [...rawAccessories];
    if (selectedFilter === "all") return list;

    return list.filter((p) => {
      const pType = detectProductType(p);
      if (selectedFilter === "chargers") return pType === "charger";
      if (selectedFilter === "audio") return pType === "audio";
      if (selectedFilter === "watches") return pType === "watch";
      if (selectedFilter === "cables") return pType === "cable";
      if (selectedFilter === "powerbanks") return pType === "powerbank";
      return true;
    });
  }, [rawAccessories, selectedFilter]);

  if (rawAccessories.length === 0 && compatibleDevices.length === 0) {
    return null;
  }

  const isPhone = productType === "phone" || productType === "tablet" || productType === "laptop";

  const filterTabs = [
    { id: "all", label: "All Accessories", icon: Package },
    { id: "chargers", label: "Fast Chargers", icon: Zap },
    { id: "audio", label: "Earbuds & Audio", icon: Headphones },
    { id: "watches", label: "Smart Watches", icon: Watch },
    { id: "cables", label: "Cables", icon: CableIcon },
    { id: "powerbanks", label: "Power Banks", icon: BatteryCharging },
  ];

  return (
    <section className="mt-16 sm:mt-24 pt-12 border-t border-[#EAEAEA]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
            {isPhone ? `Recommended for ${brand !== "Universal" ? brand : "Your Device"}` : "Ecosystem & Pairings"}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            {isPhone
              ? `Compatible Accessories for ${brand !== "Universal" ? brand : "This Device"}`
              : `Recommended Companion Products`}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            {isPhone
              ? `Official & certified fast chargers, ${brand === "Apple" ? "AirPods, Apple Watch" : "earbuds, smartwatches"}, power banks and cables.`
              : `Top smartphones, fast cables, and accessories compatible with this ${currentProduct.name}.`}
          </p>
        </div>

        <Link
          href={`/products?category=mobile-accessories`}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-black text-black hover:text-emerald-600 transition-colors group shrink-0"
        >
          <span>Explore All Accessories</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Compatible Devices Preview (If viewing an accessory) */}
      {!isPhone && compatibleDevices.length > 0 && (
        <div className="mb-10 p-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-1.5">
            📱 Compatible Smartphones &amp; Devices
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {compatibleDevices.map((device) => (
              <div key={device.id} className="h-full">
                <ProductCard product={device} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accessories Grid */}
      {itemsToDisplay.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 w-full min-w-0">
          {itemsToDisplay.slice(0, 8).map((product) => (
            <div key={product.id} className="h-full w-full min-w-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-gray-400">
          No accessories in this category currently.
        </div>
      )}
    </section>
  );
}
