"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useLang } from "@/components/LangProvider";
import { CheckIcon, MinusIcon, PlusIcon } from "@/components/Icons";
import { MAX_QTY_PER_LINE } from "@/shared/cart";
import type { Product } from "@/shared/types";

export default function AddToCart({ product }: { product: Product }) {
  const { t } = useLang();
  const cart = useCart();
  const router = useRouter();
  const variants = useMemo(() => product.product_variants ?? [], [product.product_variants]);

  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))], [variants]);
  const colors = useMemo(() => [...new Set(variants.map((v) => v.color).filter((c): c is string => !!c))], [variants]);

  // Pre-select when there is only one choice.
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0] : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const needsSize = sizes.length > 0;
  const needsColor = colors.length > 0;
  const complete = (!needsSize || size) && (!needsColor || color);

  const selected = useMemo(
    () =>
      complete
        ? variants.find((v) => (v.size ?? null) === (needsSize ? size : null) && (v.color ?? null) === (needsColor ? color : null))
        : undefined,
    [complete, variants, size, color, needsSize, needsColor],
  );

  const stockFor = (s: string | null, c: string | null) =>
    variants
      .filter((v) => (!needsSize || !s || v.size === s) && (!needsColor || !c || v.color === c))
      .reduce((sum, v) => sum + v.stock, 0);

  const maxQty = selected ? Math.min(selected.stock, MAX_QTY_PER_LINE) : 1;
  const inCart = selected ? cart.lines.find((l) => l.variantId === selected.id)?.quantity ?? 0 : 0;
  const canAdd = !!selected && selected.stock > 0 && inCart < selected.stock;

  function handleAdd() {
    if (!selected || !canAdd) return;
    cart.add({
      variantId: selected.id,
      productId: product.id,
      slug: product.slug,
      name_en: product.name_en,
      name_ne: product.name_ne,
      price: product.price,
      size: selected.size,
      color: selected.color,
      image: product.images[0] ?? null,
      quantity: Math.min(qty, selected.stock - inCart),
      maxStock: selected.stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  function handleBuyNow() {
    if (!selected || selected.stock === 0) return;
    if (canAdd) handleAdd();
    router.push("/checkout");
  }

  if (variants.length === 0 || variants.every((v) => v.stock === 0)) {
    return <p className="mt-6 rounded-xl bg-sand px-4 py-3 font-medium text-ink-soft">{t("product.sold_out")}</p>;
  }

  return (
    <div className="mt-6 space-y-5">
      {needsSize && (
        <fieldset>
          <legend className="label">{t("product.size")}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const out = stockFor(s, color) === 0;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={out}
                  aria-pressed={size === s}
                  onClick={() => {
                    setSize(s);
                    setQty(1);
                  }}
                  className={`chip min-w-[3rem] justify-center disabled:cursor-not-allowed disabled:text-ink-mute disabled:line-through disabled:opacity-60 ${
                    size === s ? "chip-active" : ""
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {needsColor && (
        <fieldset>
          <legend className="label">{t("product.color")}</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const out = stockFor(size, c) === 0;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={out}
                  aria-pressed={color === c}
                  onClick={() => {
                    setColor(c);
                    setQty(1);
                  }}
                  className={`chip disabled:cursor-not-allowed disabled:text-ink-mute disabled:line-through disabled:opacity-60 ${
                    color === c ? "chip-active" : ""
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {selected && selected.stock > 0 && (
        <p className={`text-sm font-medium ${selected.stock <= 5 ? "text-brand" : "text-ok"}`}>
          {selected.stock <= 5 ? t("product.low_stock", { n: selected.stock }) : t("product.in_stock")}
        </p>
      )}
      {selected && selected.stock === 0 && <p className="text-sm font-medium text-brand">{t("product.sold_out")}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-line bg-white" role="group" aria-label={t("cart.qty")}>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand disabled:opacity-40"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="−"
          >
            <MinusIcon width={18} height={18} />
          </button>
          <span className="w-8 text-center font-medium tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand disabled:opacity-40"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={!selected || qty >= maxQty}
            aria-label="+"
          >
            <PlusIcon width={18} height={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="btn-ghost flex-1 !border-ink sm:flex-none sm:px-8"
        >
          {!complete ? t("product.pick") : added ? (<><CheckIcon width={18} height={18} /> {t("product.added")}</>) : t("product.add")}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!selected || selected.stock === 0}
          className="btn-brand w-full sm:w-auto sm:px-10"
        >
          {t("product.buy_now")}
        </button>
      </div>

      {added && (
        <Link href="/cart" className="inline-block text-sm font-medium text-brand hover:underline">
          {t("product.go_cart")} →
        </Link>
      )}
    </div>
  );
}
