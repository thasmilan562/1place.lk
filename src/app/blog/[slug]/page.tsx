import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Clock,
  Calendar,
  User,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  MapPin,
  Phone,
  Lightbulb,
  Share2,
} from "lucide-react";
import { BLOG_POSTS, getBlogPostBySlug } from "@/lib/blog-data";
import { BUSINESS_INFO } from "@/lib/business-info";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Article Not Found | 1PLACE.LK",
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = `https://www.1place.lk/blog/${post.slug}`;

  return {
    title: `${post.metaTitle}`,
    description: post.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      url: canonicalUrl,
      siteName: "1PLACE.LK",
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostDetailPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  // Structured Data: BlogPosting
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `https://www.1place.lk/blog/${post.slug}#article`,
    "headline": post.title,
    "description": post.excerpt,
    "image": post.coverImage,
    "datePublished": post.publishedAt,
    "dateModified": post.updatedAt,
    "mainEntityOfPage": `https://www.1place.lk/blog/${post.slug}`,
    "author": {
      "@type": "Organization",
      "name": post.author.name,
      "url": "https://www.1place.lk",
    },
    "publisher": {
      "@type": "Organization",
      "name": BUSINESS_INFO.name,
      "url": "https://www.1place.lk",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.1place.lk/logo.svg",
      },
    },
    "keywords": post.tags.join(", "),
  };

  // Structured Data: BreadcrumbList
  const breadcrumbJsonLd = {
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
        "name": "Blog & Guides",
        "item": "https://www.1place.lk/blog",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": `https://www.1place.lk/blog/${post.slug}`,
      },
    ],
  };

  // Structured Data: FAQPage (if faqs exist)
  const faqJsonLd =
    post.faqs && post.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": post.faqs.map((faq) => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="min-h-screen bg-black text-white">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5">
            <ol className="flex items-center flex-wrap gap-2 text-xs text-zinc-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog & Guides
                </Link>
              </li>
              <li>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </li>
              <li className="text-zinc-200 font-medium truncate max-w-[200px] sm:max-w-xs" aria-current="page">
                {post.title}
              </li>
            </ol>
          </div>
        </nav>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <header className="mb-8 sm:mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
                {post.category}
              </span>
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {post.readTime}
              </span>
            </div>

            {/* Single canonical H1 */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-outfit text-white mb-6 leading-tight">
              {post.title}
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed mb-6 font-medium">
              {post.excerpt}
            </p>

            {/* Author & Date Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-sm">
                  SM
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{post.author.name}</div>
                  <div className="text-xs text-zinc-400">{post.author.role}</div>
                </div>
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Published: {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span className="hidden sm:inline text-zinc-600">•</span>
                <span className="hidden sm:inline">
                  Updated: {new Date(post.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </header>

          {/* Featured Image */}
          <div className="relative h-64 sm:h-96 w-full rounded-2xl overflow-hidden mb-10 border border-zinc-800/80 bg-zinc-950">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              priority
              className="object-cover"
            />
          </div>

          {/* Article Body Content */}
          <div className="space-y-6 sm:space-y-8 text-zinc-300 leading-relaxed text-base sm:text-lg">
            {post.content.map((block, idx) => {
              if (block.type === "paragraph") {
                return (
                  <p key={idx} className="text-zinc-300 leading-relaxed">
                    {block.text}
                  </p>
                );
              }

              if (block.type === "heading2") {
                return (
                  <h2
                    key={idx}
                    className="text-xl sm:text-2xl lg:text-3xl font-bold font-outfit text-white pt-6 pb-2 border-b border-zinc-800/60"
                  >
                    {block.text}
                  </h2>
                );
              }

              if (block.type === "heading3") {
                return (
                  <h3 key={idx} className="text-lg sm:text-xl font-semibold font-outfit text-white pt-4">
                    {block.text}
                  </h3>
                );
              }

              if (block.type === "list") {
                return (
                  <ul key={idx} className="space-y-3 pl-2">
                    {block.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-1" />
                        <span className="text-zinc-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }

              if (block.type === "table") {
                return (
                  <div key={idx} className="overflow-x-auto my-6 rounded-xl border border-zinc-800/80 bg-zinc-950">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-900 border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-400">
                        <tr>
                          {block.headers.map((h, hIdx) => (
                            <th key={hIdx} className="px-4 py-3 sm:px-6">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {block.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-zinc-900/40 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`px-4 py-3.5 sm:px-6 ${cIdx === 0 ? "font-semibold text-white" : "text-zinc-300"}`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              if (block.type === "callout") {
                return (
                  <div
                    key={idx}
                    className="my-8 p-6 rounded-2xl bg-gradient-to-r from-blue-950/30 to-zinc-900 border border-blue-900/40"
                  >
                    <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-2">
                      <Lightbulb className="w-4 h-4" />
                      <span>{block.title}</span>
                    </div>
                    <p className="text-sm sm:text-base text-zinc-300 mb-4">{block.text}</p>
                    {block.linkHref && block.linkText && (
                      <Link
                        href={block.linkHref}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                      >
                        <span>{block.linkText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 mr-2">Tags:</span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md text-xs bg-zinc-900 text-zinc-400 border border-zinc-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Frequently Asked Questions */}
          {post.faqs && post.faqs.length > 0 && (
            <section className="mt-12 pt-8 border-t border-zinc-800/80">
              <div className="flex items-center gap-2 mb-6">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl sm:text-2xl font-bold font-outfit text-white">
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="space-y-4">
                {post.faqs.map((faq, fIdx) => (
                  <div
                    key={fIdx}
                    className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/70 hover:border-zinc-700/80 transition-colors"
                  >
                    <h3 className="text-base font-semibold text-white mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Showroom Contact Card */}
          <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <h3 className="text-lg font-bold font-outfit text-white">
                Visit 1PLACE.LK Flagship Store
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
                42, Galle Road, Colombo 03, Sri Lanka. Open Mon-Sat 9AM-8PM, Sun 10AM-6PM.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/contact"
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs transition-colors"
              >
                Store Details
              </Link>
              <a
                href={`tel:${BUSINESS_INFO.phonePrimaryIntl}`}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors"
              >
                Call {BUSINESS_INFO.phonePrimary}
              </a>
            </div>
          </div>

          {/* Related Articles */}
          {otherPosts.length > 0 && (
            <section className="mt-14 pt-10 border-t border-zinc-800/80">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold font-outfit text-white">
                  Related Tech Guides
                </h2>
                <Link
                  href="/blog"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {otherPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="group block p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="relative h-28 w-full rounded-lg overflow-hidden mb-3 bg-zinc-950">
                      <Image
                        src={related.coverImage}
                        alt={related.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="text-xs text-blue-400 font-medium mb-1">
                      {related.category}
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                      {related.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Back to Blog */}
          <div className="mt-12 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to all guides</span>
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}
