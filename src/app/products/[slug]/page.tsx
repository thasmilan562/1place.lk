import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/firestore-client";
import ProductDetailClient from "./product-detail-client";
import { Metadata } from "next";

export const revalidate = 60;

function resolveProductBrand(product: any): string {
  if (product.brand_name && product.brand_name.trim() !== "") return product.brand_name.trim();
  if (product.brand && product.brand.trim() !== "") return product.brand.trim();
  if (product.brandName && product.brandName.trim() !== "") return product.brandName.trim();
  
  const name = (product.name || "").toLowerCase();
  if (name.includes("iphone") || name.includes("apple") || name.includes("macbook") || name.includes("airpods") || name.includes("ipad") || name.includes("magsafe")) return "Apple";
  if (name.includes("samsung") || name.includes("galaxy")) return "Samsung";
  if (name.includes("xiaomi") || name.includes("redmi") || name.includes("poco")) return "Xiaomi";
  if (name.includes("google") || name.includes("pixel")) return "Google";
  if (name.includes("oneplus")) return "OnePlus";
  if (name.includes("honor")) return "Honor";
  if (name.includes("oppo")) return "Oppo";
  if (name.includes("vivo")) return "Vivo";
  if (name.includes("realme")) return "Realme";
  if (name.includes("anker") || name.includes("soundcore")) return "Anker";
  if (name.includes("baseus")) return "Baseus";
  if (name.includes("jbl")) return "JBL";
  if (name.includes("sony")) return "Sony";
  if (name.includes("ugreen")) return "Ugreen";
  if (name.includes("hoco")) return "Hoco";
  if (name.includes("joyroom")) return "Joyroom";
  if (name.includes("remax")) return "REMAX";
  if (name.includes("ldnio")) return "LDNIO";
  if (name.includes("lenyes")) return "Lenyes";
  if (name.includes("oraimo")) return "Oraimo";

  return product.category_name || "1PLACE.LK";
}

function isProductPreorder(product: any): boolean {
  return Boolean(
    product.is_preorder ||
    product.pre_order ||
    product.pre_booking ||
    product.stock_status === "pre_order"
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | 1PLACE.LK Sri Lanka",
      description: "The requested smartphone or mobile accessory could not be found at 1PLACE.LK Sri Lanka.",
      robots: { index: false, follow: true },
    };
  }

  const brand = resolveProductBrand(product);
  const fullName = (product.name || "").toLowerCase().includes(brand.toLowerCase())
    ? product.name
    : `${brand} ${product.name}`;

  const effectivePrice = product.sale_price && product.sale_price > 0 && product.sale_price < product.price
    ? product.sale_price
    : product.price;

  const hasValidPrice = typeof effectivePrice === "number" && !isNaN(effectivePrice) && effectivePrice > 0;
  const priceStr = hasValidPrice ? `Rs. ${Math.round(effectivePrice).toLocaleString("en-LK")}` : "Price Coming Soon";
  const warranty = product.warranty || product.brand_warranty || "Official Company Warranty";
  const isPreOrder = isProductPreorder(product);
  const stockText = isPreOrder
    ? "Available for Pre-Order"
    : product.stock_status === "out_of_stock"
      ? "Currently out of stock"
      : "In Stock & Ready for Delivery";

  const title = `${fullName} Price in Sri Lanka | 1PLACE.LK`;
  const description =
    product.description && product.description.length > 40
      ? `${fullName} price in Sri Lanka: ${priceStr}. ${stockText} with ${warranty}. Buy genuine ${brand} devices at 1PLACE.LK with express islandwide delivery.`
      : `Buy original ${fullName} (${brand}) in Sri Lanka at 1PLACE.LK. Best price ${priceStr}, ${warranty}, and express islandwide delivery.`;

  const canonicalUrl = `https://www.1place.lk/products/${product.slug || slug}`;
  const images = product.images && product.images.length > 0
    ? product.images.map((img) => ({ url: img, alt: `${fullName} - 1PLACE.LK Sri Lanka` }))
    : [{ url: "https://www.1place.lk/logo.svg", alt: fullName }];

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      images,
      url: canonicalUrl,
      type: "website",
      siteName: "1PLACE.LK",
      locale: "en_LK",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.images?.[0] ? [product.images[0]] : ["https://www.1place.lk/logo.svg"],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const allProducts = await getProducts();

  if (!product) {
    notFound();
  }

  const brand = resolveProductBrand(product);
  const validSku = product.code && !/^[0-9]{6,}$/.test(product.code) ? product.code : product.slug;
  const categoryName = product.category_name || "Smartphones";
  const categorySlug = (product.category_slug || product.categorySlug || categoryName).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const effectivePrice = product.sale_price && product.sale_price > 0 && product.sale_price < product.price
    ? product.sale_price
    : product.price;

  const hasValidPrice = typeof effectivePrice === "number" && !isNaN(effectivePrice) && effectivePrice > 0;
  const isPreOrder = isProductPreorder(product);
  const reviewCount = Number(product.review_count ?? product.reviews_count ?? 0);

  const productJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `https://www.1place.lk/products/${product.slug || slug}#product`,
    "name": product.name,
    "image": product.images && product.images.length > 0 ? product.images : ["https://www.1place.lk/logo.svg"],
    "description": product.description || `Buy ${product.name} at 1PLACE.LK in Sri Lanka with warranty and islandwide delivery.`,
    "sku": validSku,
    "mpn": validSku,
    "brand": {
      "@type": "Brand",
      "name": brand,
    },
    ...(hasValidPrice
      ? {
          "offers": {
            "@type": "Offer",
            "url": `https://www.1place.lk/products/${product.slug || slug}`,
            "priceCurrency": "LKR",
            "price": effectivePrice,
            "itemCondition": "https://schema.org/NewCondition",
            "availability": isPreOrder
              ? "https://schema.org/PreOrder"
              : product.stock_status === "out_of_stock"
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
            "seller": {
              "@type": "Organization",
              "@id": "https://www.1place.lk/#organization",
              "name": "1PLACE.LK",
              "url": "https://www.1place.lk"
            }
          }
        }
      : {
          "offers": {
            "@type": "Offer",
            "url": `https://www.1place.lk/products/${product.slug || slug}`,
            "priceCurrency": "LKR",
            "availability": isPreOrder ? "https://schema.org/PreOrder" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition",
            "seller": {
              "@type": "Organization",
              "@id": "https://www.1place.lk/#organization",
              "name": "1PLACE.LK",
              "url": "https://www.1place.lk"
            }
          }
        }),
    ...(product.rating && product.rating > 0 && reviewCount > 0
      ? {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": product.rating,
            "reviewCount": reviewCount,
            "bestRating": "5",
            "worstRating": "1"
          }
        }
      : {})
  };

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.1place.lk"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": categoryName,
        "item": `https://www.1place.lk/category/${categorySlug}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": brand,
        "item": `https://www.1place.lk/products?brand=${encodeURIComponent(brand)}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": product.name,
        "item": `https://www.1place.lk/products/${product.slug || slug}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <ProductDetailClient product={product as any} allProducts={allProducts as any} />
    </>
  );
}
