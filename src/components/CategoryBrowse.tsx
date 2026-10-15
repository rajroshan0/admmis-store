"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { pickLang } from "@/shared/format";
import type { Category, Lang, Product } from "@/shared/types";

/**
 * Compact "shop by category": a row of small chips that filters the product grid instantly.
 * The first chip shows the newest products (the "new arrivals").
 */
export default function CategoryBrowse({
  lang,
  categories,
  products,
  labels,
}: {
  lang: Lang;
  categories: Category[];
  products: Product[];
  labels: { heading: string; newest: string; viewAll: string; empty: string };
}) {
  const [active, setActive] = useState<string>("new");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) if (p.category_id) m.set(p.category_id, (m.get(p.category_id) ?? 0) + 1);
    return m;
  }, [products]);

  // Only offer categories that actually have products.
  const chips = categories.filter((c) => (counts.get(c.id) ?? 0) > 0);
  const current = chips.find((c) => c.id === active);
  const shown = (active === "new" ? products : products.filter((p) => p.category_id === active)).slice(0, 8);

  return (
    <section className="container-page pt-14 sm:pt-20">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-3xl font-bold sm:text-4xl">{labels.heading}</h2>
        <Link
          href={current ? `/shop?category=${current.slug}` : "/shop"}
          className="shrink-0 text-sm font-semibold text-brand hover:underline"
        >
          {labels.viewAll}
        </Link>
      </div>

      <div
        role="tablist"
        aria-label={labels.heading}
        className="-mx-4 mt-5 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {[{ id: "new", label: labels.newest, n: products.length }, ...chips.map((c) => ({ id: c.id, label: pickLang(lang, c.name_en, c.name_ne), n: counts.get(c.id) ?? 0 }))].map(
          (c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active === c.id}
              onClick={() => setActive(c.id)}
              className={`chip shrink-0 snap-start gap-2 whitespace-nowrap ${active === c.id ? "chip-active" : ""}`}
            >
              {c.label}
              <span className={`text-xs ${active === c.id ? "text-paper/70" : "text-ink-mute"}`}>{c.n}</span>
            </button>
          ),
        )}
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-ink-soft">{labels.empty}</p>
      ) : (
        <div role="tabpanel" className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} lang={lang} />
          ))}
        </div>
      )}
    </section>
  );
}
