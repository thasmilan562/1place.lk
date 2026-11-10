import { CreditCard, Headphones, Truck } from "lucide-react";

const promises = [
  {
    icon: Truck,
    title: "Delivered islandwide",
    copy: "Good finds delivered across Sri Lanka.",
  },
  {
    icon: CreditCard,
    title: "Checkout your way",
    copy: "Choose a payment option that works for you.",
  },
  {
    icon: Headphones,
    title: "Here when you need us",
    copy: "Our team is ready to help with your order.",
  },
];

export default function StorePromises() {
  return (
    <section aria-labelledby="store-promises-title" className="store-promises border-y border-[#e9e4dc] bg-[#fbfaf7]">
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <h2 id="store-promises-title" className="store-promises__title mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8057] sm:mb-7">
          A little more peace of mind
        </h2>
        <div className="store-promises__grid grid grid-cols-1 divide-y divide-[#e9e4dc] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {promises.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="store-promises__card flex items-center gap-4 py-4 first:pt-0 last:pb-0 sm:justify-center sm:px-5 sm:py-1 sm:first:pt-1 sm:last:pb-1 lg:gap-5">
              <span className="store-promises__icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d9c9a7] bg-white text-[#7b173b] shadow-[0_4px_12px_rgba(48,35,16,0.04)]">
                <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-[-0.015em] text-[#262321]">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-neutral-500">{copy}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
