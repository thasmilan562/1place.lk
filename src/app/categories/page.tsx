import { Metadata } from "next";
import Link from "next/link";
import { getCategories, getProducts } from "@/lib/firestore-client";
import { ChevronRight, Grid } from "lucide-react";

import CategoryIcon from "@/components/ui/CategoryIcon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Categories | Electronics, Mobile Phones & Tech Accessories | 1PLACE.LK",
  description:
    "Explore all product categories at 1PLACE.LK Sri Lanka. Genuine Apple, Samsung, Xiaomi smartphones, chargers, earbuds, smartwatches & lifestyle electronics with warranty.",
  alternates: {
    canonical: "https://www.1place.lk/categories",
  },
  openGraph: {
    title: "All Categories | Electronics, Mobile Phones & Tech Accessories | 1PLACE.LK",
    description:
      "Explore all product categories at 1PLACE.LK Sri Lanka. Genuine Apple, Samsung, Xiaomi smartphones, chargers, earbuds, smartwatches & accessories.",
    url: "https://www.1place.lk/categories",
    type: "website",
    siteName: "1PLACE.LK",
    locale: "en_LK",
  },
};

export default async function CategoriesPage() {
  const [categories, products] = await Promise.all([
    getCategories().catch(() => []),
    getProducts().catch(() => []),
  ]);

  // Count products per category
  const productCountMap: Record<string, number> = {};
  products.forEach((p) => {
    const slug = (p.category_slug || p.categorySlug || p.category_id || p.category_name || "").toLowerCase();
    if (slug) {
      productCountMap[slug] = (productCountMap[slug] || 0) + 1;
    }
  });

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.1place.lk",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Categories",
        "item": "https://www.1place.lk/categories",
      },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://www.1place.lk/categories#collection",
    "name": "All Product Categories - 1PLACE.LK",
    "description": "Directory of mobile phone and tech accessory categories at 1PLACE.LK Sri Lanka.",
    "url": "https://www.1place.lk/categories",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": categories.map((cat, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "url": `https://www.1place.lk/category/${cat.slug || cat.id}`,
        "name": cat.name,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-white text-[#090909] pt-24 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-6">
          <Link href="/" className="hover:text-black">
            Home
          </Link>
          <span>/</span>
          <span className="text-black font-bold">Categories</span>
        </nav>

        {/* Header Banner */}
        <div className="bg-[#F8F8F9] border border-neutral-200/80 rounded-3xl p-6 sm:p-10 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-wider mb-3">
            <Grid className="w-3 h-3" />
            Explore Catalog
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#090909]">
            Product Categories
          </h1>
          <p className="text-sm text-neutral-500 mt-2 max-w-xl font-medium">
            Browse our full range of 100% genuine smartphones, tablets, audio gear, and premium accessories with islandwide warranty.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const catSlug = cat.slug || cat.id || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const count = productCountMap[catSlug.toLowerCase()] || 0;

            return (
              <Link
                key={cat.id || catSlug}
                href={`/category/${catSlug}`}
                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-[#68122F]/40 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center gap-3.5 mb-2.5">
                    <div className="w-11 h-11 rounded-full bg-white border border-neutral-200/80 flex items-center justify-center shrink-0 text-[#68122F] shadow-xs group-hover:bg-[#68122F] group-hover:text-white transition-colors">
                      <CategoryIcon category={cat} size={22} className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900 group-hover:text-[#68122F] transition-colors">
                      {cat.name}
                    </h2>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-1.5 font-normal">
                      {cat.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-neutral-200/60 text-xs font-semibold text-neutral-500">
                  <span>{count > 0 ? `${count} Products` : "Browse"}</span>
                  <span className="flex items-center text-neutral-900 font-bold group-hover:translate-x-1 transition-transform">
                    View <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
