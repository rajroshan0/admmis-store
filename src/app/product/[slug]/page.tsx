import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import ProductImage from "@/components/ProductImage";
import { getProductBySlug, getProducts } from "@/lib/data";
import { getT } from "@/lib/lang";
import { absoluteUrl } from "@/lib/site";
import { discountPercent, formatNPR, pickLang, productDescription, productName } from "@/shared/format";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Product not found" };
  const description = (product.description_en ?? "").slice(0, 160);
  return {
    title: product.name_en,
    description,
    openGraph: {
      title: product.name_en,
      description,
      images: product.images[0] ? [product.images[0]] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { lang, t } = await getT();
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // "You may also like": same category first, topped up with newest items so there are always 4.
  const sameCategory = product.category_id
    ? await getProducts({ categoryId: product.category_id, excludeId: product.id, limit: 4 })
    : [];
  const everything = await getProducts({ sort: "new", excludeId: product.id, limit: 28 });
  const related = [...sameCategory, ...everything.filter((p) => !sameCategory.some((s) => s.id === p.id))].slice(0, 4);
  // ...then the rest of the shop continues below, without repeating anything already shown.
  const more = everything.filter((p) => !related.some((r) => r.id === p.id)).slice(0, 12);

  const name = productName(product, lang);
  const description = productDescription(product, lang);
  const off = discountPercent(product.price, product.compare_at_price);
  const inStock = (product.product_variants ?? []).some((v) => v.stock > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_en,
    description: product.description_en ?? undefined,
    image: product.images,
    offers: {
      "@type": "Offer",
      priceCurrency: "NPR",
      price: product.price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/product/${product.slug}`),
    },
  };

  return (
    <div className="container-page py-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav className="mb-5 text-sm text-ink-soft" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-brand">
          ← {t("product.back")}
        </Link>
        {product.categories && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/shop?category=${product.categories.slug}`} className="hover:text-brand">
              {pickLang(lang, product.categories.name_en, product.categories.name_ne)}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-sand">
            <ProductImage src={product.images[0]} alt={name} sizes="(min-width: 768px) 50vw, 100vw" priority />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {product.images.slice(1, 5).map((src, i) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-sand">
                  <ProductImage src={src} alt={`${name} ${i + 2}`} sizes="12vw" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{name}</h1>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-semibold">{formatNPR(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <>
                <span className="text-lg text-ink-mute line-through">{formatNPR(product.compare_at_price)}</span>
                <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-sm font-semibold text-brand">
                  {t("product.off", { n: off })}
                </span>
              </>
            )}
          </p>

          <AddToCart product={product} />

          {description && (
            <section className="mt-8 border-t border-line pt-6">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-mute">
                {t("product.details")}
              </h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-soft">{description}</p>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold">{t("product.related")}</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold">{t("product.more")}</h2>
            <Link href="/shop" className="text-sm font-semibold text-brand hover:underline">
              {t("home.view_all")}
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {more.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
