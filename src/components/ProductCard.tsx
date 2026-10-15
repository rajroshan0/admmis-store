import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import { discountPercent, formatNPR, productName } from "@/shared/format";
import { translate } from "@/shared/i18n";
import type { Lang, Product } from "@/shared/types";

export default function ProductCard({
  product,
  lang,
  priority = false,
}: {
  product: Product;
  lang: Lang;
  priority?: boolean;
}) {
  const name = productName(product, lang);
  const off = discountPercent(product.price, product.compare_at_price);
  const stock = (product.product_variants ?? []).reduce((s, v) => s + v.stock, 0);
  const isNew = Date.now() - new Date(product.created_at).getTime() < 14 * 24 * 3600 * 1000;
  const soldOut = (product.product_variants?.length ?? 0) > 0 && stock === 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-white transition hover:shadow-card"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        <ProductImage
          src={product.images[0]}
          alt={name}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className="transition duration-500 group-hover:scale-105"
        />
        {off > 0 && !soldOut && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">
            {translate(lang, "product.off", { n: off })}
          </span>
        )}
        {isNew && !soldOut && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-marigold px-2.5 py-1 text-xs font-bold text-night">
            {translate(lang, "product.new")}
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-center text-xs font-semibold text-paper">
            {translate(lang, "product.sold_out")}
          </span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] font-medium leading-snug">{name}</h3>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">{formatNPR(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-sm text-ink-mute line-through">{formatNPR(product.compare_at_price)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}
