import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getCategories, getProducts, type ProductSort } from "@/lib/data";
import { getT } from "@/lib/lang";
import { pickLang } from "@/shared/format";

export const metadata: Metadata = { title: "Shop" };

type SP = Promise<{ q?: string; category?: string; sort?: string }>;

const SORTS: ProductSort[] = ["new", "price_asc", "price_desc"];

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { lang, t } = await getT();

  const q = (sp.q ?? "").slice(0, 60);
  const category = sp.category ?? "";
  const sort: ProductSort = SORTS.includes(sp.sort as ProductSort) ? (sp.sort as ProductSort) : "new";

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ q, categorySlug: category || undefined, sort }),
  ]);

  const href = (over: Partial<{ q: string; category: string; sort: string }>) => {
    const params = new URLSearchParams();
    const next = { q, category, sort, ...over };
    if (next.q) params.set("q", next.q);
    if (next.category) params.set("category", next.category);
    if (next.sort && next.sort !== "new") params.set("sort", next.sort);
    const s = params.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">
        {q ? t("shop.results_for", { q }) : t("shop.title")}
      </h1>

      <form action="/shop" className="mt-5 flex gap-2" role="search">
        <label htmlFor="shop-q" className="sr-only">
          {t("shop.search_btn")}
        </label>
        <input
          id="shop-q"
          name="q"
          defaultValue={q}
          placeholder={t("shop.search_placeholder")}
          className="input rounded-full"
        />
        {category && <input type="hidden" name="category" value={category} />}
        {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
        <button className="btn-primary shrink-0" type="submit">
          {t("shop.search_btn")}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={href({ category: "" })} className={`chip ${!category ? "chip-active" : ""}`}>
          {t("shop.all")}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={href({ category: c.slug })}
            className={`chip ${category === c.slug ? "chip-active" : ""}`}
          >
            {pickLang(lang, c.name_en, c.name_ne)}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
        <p>{products.length === 1 ? t("shop.result_one") : t("shop.results", { n: products.length })}</p>
        <div className="flex items-center gap-2">
          <span>{t("shop.sort")}:</span>
          {SORTS.map((s) => (
            <Link
              key={s}
              href={href({ sort: s })}
              className={`rounded-full px-3 py-1.5 ${sort === s ? "bg-ink text-paper" : "hover:bg-sand"}`}
            >
              {s === "new" ? t("shop.sort_new") : s === "price_asc" ? t("shop.sort_low") : t("shop.sort_high")}
            </Link>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="text-ink-soft">{t("shop.none")}</p>
          {(q || category) && (
            <Link href="/shop" className="btn-ghost mt-5">
              {t("shop.clear")}
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} lang={lang} priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
