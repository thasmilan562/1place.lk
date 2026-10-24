"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Star, X, Loader2, Quote, PenLine, CheckCircle2,
  ExternalLink, MessageCircle, Gift, Bell, Users, Zap,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Review, GoogleReviewsSettings } from "@/lib/types";
import { DiagonalCarousel } from "@/components/ui/diagonal-carousel";

const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VaDlUUfK0IBhEDemlN2A";

const validateUrl = (url?: string, fallbackUrl: string = "https://www.google.com/maps/search/1Place+LK+Colombo") => {
  if (!url || typeof url !== "string") return fallbackUrl;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {}
  return fallbackUrl;
};

/* ─── Avatar gradients ─── */
const AVATAR_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-blue-500",
];
function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

/* ─── Variants ─── */
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ─── Count-up ─── */
function CountUp({ to, duration = 1.2 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      setVal(Math.round(p * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration]);
  return <>{val}</>;
}

export default function ReviewsClient({
  initialReviews,
  googleSettings,
}: {
  initialReviews: Review[];
  googleSettings?: GoogleReviewsSettings;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const mainGoogleUrl = validateUrl(
    googleSettings?.view_all_reviews_url,
    "https://www.google.com/maps/place//@8.7505237,80.5028315,17z/data=!3m1!4b1!4m3!3m2!1s0x3afc159b991b1da5:0xa03e8d7360fe634a!12e1?entry=ttu&g_ep=EgoyMDI2MDgxNy4wIKXMDSoASAFQAw%3D%3D"
  );
  const mainWriteReviewUrl = validateUrl(
    googleSettings?.write_review_url,
    "https://www.google.com/maps/place//@8.7505237,80.5028315,17z/data=!3m1!4b1!4m3!3m2!1s0x3afc159b991b1da5:0xa03e8d7360fe634a!12e1?entry=ttu&g_ep=EgoyMDI2MDgxNy4wIKXMDSoASAFQAw%3D%3D"
  );
  const overallRatingVal = googleSettings?.overall_rating
    ? googleSettings.overall_rating.toFixed(1)
    : (reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : "4.9");
  const totalCountVal = googleSettings?.total_reviews_count || reviews.length || 250;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [formData, setFormData] = useState({ author_name: "", rating: 5, text: "" });
  const [filterRating, setFilterRating] = useState(0);

  const visibleReviews = reviews.filter((r) =>
    filterRating === 0 ? true : r.rating === filterRating
  );

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0
      ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100)
      : 0,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.author_name || !formData.text) return;
    setIsSubmitting(true);
    try {
      const newReview = {
        ...formData,
        author_photo: "",
        review_date: new Date().toISOString(),
        visible: true,
      };
      const docRef = await addDoc(collection(db, "reviews"), newReview);
      setReviews([{ ...newReview, id: docRef.id } as Review, ...reviews]);
      setSubmitted(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitted(false);
        setFormData({ author_name: "", rating: 5, text: "" });
      }, 1800);
    } catch (error) {
      console.error("Error adding review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen overflow-x-hidden">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-yellow-400/10 to-orange-400/10 blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-gradient-to-br from-violet-400/8 to-fuchsia-400/8 blur-3xl"
          />
          {/* Floating stars */}
          {[
            { x: "8%", y: "20%", d: 0 }, { x: "85%", y: "15%", d: 0.8 },
            { x: "55%", y: "55%", d: 0.4 }, { x: "20%", y: "70%", d: 1.3 },
            { x: "75%", y: "80%", d: 0.6 }, { x: "40%", y: "30%", d: 1.8 },
          ].map((p, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none"
              style={{ left: p.x, top: p.y }}
              animate={{ y: [0, -15, 0], opacity: [0.3, 0.8, 0.3], rotate: [0, 20, 0] }}
              transition={{ duration: 3.5 + p.d, repeat: Infinity, delay: p.d, ease: "easeInOut" }}
            >
              <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
            </motion.div>
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-14">

            {/* ── Left: Title ── */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200/70 text-xs font-bold text-yellow-700 mb-6 uppercase tracking-widest shadow-sm"
              >
                Customer Reviews
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-5">
                What People{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500">
                    Say
                  </span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.55, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-full origin-left -z-0 blur-[2px]"
                  />
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.65, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute -bottom-1.5 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full origin-left z-10"
                  />
                </span>
              </h1>

              <p className="text-gray-500 text-lg max-w-lg leading-relaxed mb-8">
                Real experiences from real customers. See why 1PLACE.LK is
                Sri Lanka's most trusted premium electronics destination.
              </p>

              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-gray-950 text-white rounded-2xl font-semibold text-sm shadow-xl shadow-black/15 hover:shadow-black/25 transition-all"
                >
                  <PenLine className="w-4 h-4" />
                  Write a Review
                </motion.button>

                <motion.a
                  href={mainGoogleUrl}
                  target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white border border-gray-200 text-gray-800 rounded-2xl font-semibold text-sm shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google Reviews
                  <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                </motion.a>
              </div>
            </motion.div>

            {/* ── Right: Rating card ── */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:w-auto shrink-0"
            >
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-2xl shadow-gray-200/80 min-w-[300px]">
                <div className="flex items-end gap-4 mb-7">
                  <div className="text-7xl font-black text-gray-950 leading-none">{overallRatingVal}</div>
                  <div className="pb-2">
                    <div className="flex gap-1 mb-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <motion.div
                          key={s}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + s * 0.09, type: "spring", stiffness: 400 }}
                        >
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 font-medium">
                      <CountUp to={totalCountVal} /> verified reviews
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {dist.map(({ star, count, pct }, i) => (
                    <motion.div
                      key={star}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.07 }}
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                    >
                      <span className="text-xs font-semibold text-gray-400 w-2">{star}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.6 + i * 0.07, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                          className={`h-full rounded-full transition-colors ${
                            filterRating === star ? "bg-yellow-400" : "bg-yellow-300 group-hover:bg-yellow-400"
                          }`}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-5 text-right">{count}</span>
                    </motion.div>
                  ))}
                </div>

                {filterRating > 0 && (
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={() => setFilterRating(0)}
                    className="mt-5 w-full text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    Clear filter ✕
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WHATSAPP COMMUNITY BANNER
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 pt-12 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#00a884] via-[#128C7E] to-[#075E54] p-8 md:p-10"
        >
          {/* Animated BG blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl"
            />
            <motion.div
              animate={{ x: [0, -30, 0], y: [0, 35, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/8 blur-3xl"
            />
            {/* WhatsApp wavy lines pattern */}
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Left content */}
            <div className="flex items-center gap-6">
              {/* WhatsApp icon pulse */}
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative shrink-0"
              >
                <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-xl">
                  {/* WhatsApp SVG */}
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                </div>
                {/* Ping ring */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-2xl border-2 border-white/40"
                />
              </motion.div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-white font-black text-2xl md:text-3xl leading-tight">
                    Join Our Community
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wide">
                    Free
                  </span>
                </div>
                <p className="text-white/80 text-sm max-w-sm leading-relaxed">
                  Get exclusive deals, latest updates &amp; giveaways straight to your WhatsApp.
                </p>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    { icon: <Gift className="w-3 h-3" />, label: "Free Giveaways" },
                    { icon: <Bell className="w-3 h-3" />, label: "Latest Offers" },
                    { icon: <Zap className="w-3 h-3" />, label: "Flash Sales" },
                    { icon: <Users className="w-3 h-3" />, label: "Exclusive Updates" },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white/90 text-xs font-medium"
                    >
                      {f.icon}
                      {f.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <motion.a
              href={WHATSAPP_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="shrink-0 group inline-flex items-center gap-3 px-8 py-4 bg-white text-[#075E54] rounded-2xl font-black text-sm shadow-2xl shadow-black/20 hover:shadow-black/30 transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              Join Now — It&apos;s Free!
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-lg"
              >
                →
              </motion.span>
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          REVIEW CARDS
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-14">

        {/* Filter indicator */}
        <AnimatePresence>
          {filterRating > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 mb-8 text-sm text-gray-400"
            >
              Showing{" "}
              <span className="font-semibold text-gray-900">{visibleReviews.length}</span>
              {" "}reviews for{" "}
              <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                {filterRating} <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {visibleReviews.length > 0 && (
          <div className="h-[500px] w-full">
            <DiagonalCarousel
              items={visibleReviews.map((review, index) => ({
                content: (
                  <a
                    href={validateUrl(review.google_url, mainGoogleUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-full h-[320px] bg-white border border-gray-100 rounded-3xl p-7 text-left group hover:border-gray-200 shadow-xl shadow-gray-200/50 transition-all duration-500 overflow-hidden flex flex-col cursor-pointer"
                  >
                    {/* Glow top border */}
                    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-yellow-400/0 to-transparent group-hover:via-yellow-400/60 transition-all duration-500 rounded-full" />
      
                    {/* Subtle corner glow */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-50 to-transparent rounded-tr-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
                    {/* Quote icon */}
                    <div className="absolute top-6 right-6 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                      <Quote className="w-12 h-12 fill-gray-900" />
                    </div>
      
                    {/* Stars */}
                    <div className="flex gap-1 mb-4 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 transition-all ${
                            s <= review.rating ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-gray-200"
                          }`}
                        />
                      ))}
                      <span className="ml-auto text-xs text-gray-300 font-medium">{review.rating}.0</span>
                    </div>
      
                    {/* Text */}
                    <p className="text-sm leading-relaxed text-gray-600 italic mb-6 relative z-10 flex-1 overflow-hidden" style={{ display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" }}>
                      &ldquo;{review.text}&rdquo;
                    </p>
      
                    {/* Divider */}
                    <div className="h-px bg-gray-100 mb-5 shrink-0" />
      
                    {/* Author */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${avatarGradient(review.author_name || "Google")} flex items-center justify-center shrink-0 shadow-md`}>
                        {review.author_photo ? (
                          <img src={review.author_photo} alt={review.author_name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="font-bold text-sm text-white">
                            {review.author_name ? review.author_name.charAt(0).toUpperCase() : "G"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{review.author_name}</div>
                        <div className="text-xs text-gray-400">
                          {review.review_date}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-500 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  </a>
                )
              }))}
              slideSize={340}
              inactiveScale={0.75}
              verticalStep={60}
              rotationStep={20}
              slideClassName="px-2"
            />
          </div>
        )}

        {visibleReviews.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
            <div className="text-5xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">No reviews yet</h3>
            <p className="text-gray-400 mb-6">Be the first to share your experience!</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-gray-950 text-white rounded-xl font-medium hover:bg-gray-800 transition-all active:scale-95"
            >
              Write a Review
            </button>
          </motion.div>
        )}

        {/* Bottom CTA */}
        {visibleReviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="mt-16 grid md:grid-cols-2 gap-6"
          >
            {/* Write review card */}
            <div className="flex flex-col items-center text-center gap-4 p-8 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200/50 rounded-3xl">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-900 font-bold text-xl">Loved our service?</p>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                Your feedback helps us grow. Share your experience and help others make the right choice!
              </p>
              <motion.button
                whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gray-950 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-black/10 hover:shadow-black/20 transition-all"
              >
                <PenLine className="w-4 h-4" />
                Write a Review
              </motion.button>
            </div>

            {/* WhatsApp mini card */}
            <motion.a
              href={WHATSAPP_CHANNEL}
              target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group flex flex-col items-center text-center gap-4 p-8 bg-gradient-to-br from-[#00a884]/10 via-[#128C7E]/8 to-[#075E54]/10 border border-[#128C7E]/20 rounded-3xl hover:border-[#128C7E]/40 transition-all cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#128C7E] flex items-center justify-center shadow-lg shadow-[#128C7E]/30 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
              </div>
              <p className="text-gray-900 font-bold text-xl">Stay in the Loop</p>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                Join our WhatsApp channel for free giveaways, flash deals &amp; exclusive updates.
              </p>
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-[#128C7E] text-white rounded-xl font-semibold text-sm shadow-md shadow-[#128C7E]/20 group-hover:bg-[#075E54] transition-colors">
                <MessageCircle className="w-4 h-4" />
                Join Free Channel
              </span>
            </motion.a>
          </motion.div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          WRITE REVIEW MODAL
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="relative bg-white border border-gray-100 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 lg:p-8 shadow-2xl z-10 max-h-[95vh] overflow-y-auto"
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-200 sm:hidden" />

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-10 gap-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </motion.div>
                    <h3 className="text-xl font-black text-gray-900">Thank you!</h3>
                    <p className="text-gray-400 text-center text-sm">Your review has been submitted successfully.</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <motion.div
                          key={s}
                          initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: s * 0.1, type: "spring", stiffness: 300 }}
                        >
                          <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center justify-between mb-7 mt-2 sm:mt-0">
                      <div>
                        <h3 className="text-xl font-black text-gray-900">Share Your Experience</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Your honest review means a lot to us</p>
                      </div>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">Your Name</label>
                        <input
                          type="text" required
                          value={formData.author_name}
                          onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none transition-all placeholder:text-gray-300"
                          placeholder="e.g. Ravi Kumar"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-3">Your Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <motion.button
                              key={star} type="button"
                              whileHover={{ scale: 1.25 }} whileTap={{ scale: 0.9 }}
                              onMouseEnter={() => setHoveredStar(star)}
                              onMouseLeave={() => setHoveredStar(0)}
                              onClick={() => setFormData({ ...formData, rating: star })}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`w-9 h-9 transition-all duration-150 ${
                                  star <= (hoveredStar || formData.rating)
                                    ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                                    : "fill-transparent text-gray-200"
                                }`}
                              />
                            </motion.button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-400 font-medium">
                          {["", "Poor", "Fair", "Good", "Very Good", "Excellent!"][hoveredStar || formData.rating]}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">Your Review</label>
                        <textarea
                          required rows={4}
                          value={formData.text}
                          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none transition-all resize-none placeholder:text-gray-300"
                          placeholder="Tell us about your experience with 1PLACE.LK..."
                        />
                        <p className="mt-1 text-xs text-gray-300 text-right">{formData.text.length} chars</p>
                      </div>

                      <motion.button
                        type="submit" disabled={isSubmitting}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-gray-950 text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-60 shadow-lg shadow-black/10"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <PenLine className="w-4 h-4" />
                            Submit Review
                          </>
                        )}
                      </motion.button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
