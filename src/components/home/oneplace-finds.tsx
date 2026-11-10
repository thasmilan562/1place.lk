import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, normalizeImageUrl } from "@/lib/utils";

export default function OnePlaceFinds({ products }: { products: Product[] }) {
  const picks = products
    .filter((product) => product.status !== "draft" && product.status !== "inactive")
    .filter((product) => product.stock_status !== "out_of_stock" && product.price > 0)
    .map((product) => ({
      product,
      discount:
        product.old_price && product.old_price > product.price
          ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
          : 0,
      image: product.primary_image || product.cover_image || product.image_url || product.image || product.images?.[0],
    }))
    .filter((item) => item.image)
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 8);

  if (picks.length < 4) return null;

  return (
    <section aria-labelledby="oneplace-finds-title" className="oneplace-finds relative overflow-hidden bg-[#f5f4f1] py-12 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="mb-7 flex items-end justify-between gap-4 sm:mb-9">
          <div className="oneplace-finds__intro">
            <p className="oneplace-finds__eyebrow">ONEPLACE · A CURATED EDIT</p>
            <h2 id="oneplace-finds-title" className="text-3xl font-semibold tracking-[-0.045em] text-[#181818] sm:text-4xl lg:text-5xl">
              The OnePlace edit<span className="text-[#a77b3e]">.</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-neutral-600 sm:text-base">A considered selection of good finds, chosen from across the store.</p>
          </div>
          <Link href="/products" className="mb-1 hidden shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-black/25 hover:bg-white sm:inline-flex">
            Explore all <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="oneplace-finds__rail -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:gap-5 sm:px-8 lg:-mx-12 lg:px-12">
          {picks.map(({ product, discount, image }) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="oneplace-finds__card group relative w-[76vw] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-[22px] border border-[#e8e2d8] bg-white shadow-[0_8px_28px_rgba(50,38,24,0.045)] transition duration-300 hover:-translate-y-1 hover:border-[#c9ad7b] hover:shadow-[0_16px_36px_rgba(50,38,24,0.1)] sm:w-[280px] sm:rounded-[26px]"
            >
              <div className="relative m-2.5 flex aspect-square min-h-0 items-center justify-center overflow-hidden rounded-[17px] bg-[#f6f3ed] p-3 sm:m-3 sm:rounded-[20px] sm:p-4">
                {discount > 0 && <span className="absolute right-3 top-3 z-10 rounded-full border border-[#c9ad7b]/50 bg-[#f3e8d2] px-2.5 py-1 text-[10px] font-bold text-[#684d2c]">-{discount}%</span>}
                <img
                  src={normalizeImageUrl(image)}
                  alt={product.name}
                  loading="lazy"
                  className="block h-full min-h-0 w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
                <p className="mb-1.5 truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9b8057]">{product.category_name || "OnePlace find"}</p>
                <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-[#292522]">{product.name}</h3>
                <div className="mt-3 flex items-baseline gap-2 border-t border-[#eee9e1] pt-3">
                  <span className="text-base font-bold text-[#171717]">{formatPrice(product.price)}</span>
                  {product.old_price && product.old_price > product.price && <span className="text-xs text-neutral-400 line-through">{formatPrice(product.old_price)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/products" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#7b173b] sm:hidden">
          Explore all products <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
