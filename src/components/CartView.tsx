"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import { useLang } from "@/components/LangProvider";
import ProductImage from "@/components/ProductImage";
import { MinusIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { formatNPR, pickLang } from "@/shared/format";
import { shippingFor } from "@/shared/cart";
import type { StoreSettings } from "@/shared/types";

export default function CartView({
  settings,
  isLoggedIn,
}: {
  settings: Pick<StoreSettings, "shipping_fee" | "free_shipping_over">;
  isLoggedIn: boolean;
}) {
  const { t, lang } = useLang();
  const cart = useCart();

  // Re-check prices and stock whenever the cart page opens.
  useEffect(() => {
    if (cart.ready) void cart.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready]);

  if (!cart.ready) {
    return <p className="py-20 text-center text-ink-soft">{t("common.loading")}</p>;
  }

  if (cart.lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-ink-soft">{t("cart.empty")}</p>
        <Link href="/shop" className="btn-primary mt-6">
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  const shipping = shippingFor(cart.subtotal, settings);
  const total = cart.subtotal + shipping;
  const remaining = settings.free_shipping_over - cart.subtotal;
  const checkoutHref = isLoggedIn ? "/checkout" : "/login?next=%2Fcheckout";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      <div>
        {cart.changed && (
          <p className="mb-4 rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark" role="status">
            {t("cart.updated")}
          </p>
        )}
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {cart.lines.map((l) => {
            const name = pickLang(lang, l.name_en, l.name_ne);
            return (
              <li key={l.variantId} className="flex gap-4 p-4">
                <Link
                  href={`/product/${l.slug}`}
                  className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-sand sm:h-32 sm:w-28"
                >
                  <ProductImage src={l.image} alt={name} sizes="112px" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/product/${l.slug}`} className="line-clamp-2 font-medium hover:text-brand">
                        {name}
                      </Link>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {[l.size, l.color].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatNPR(l.price * l.quantity)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-full border border-line" role="group" aria-label={t("cart.qty")}>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand disabled:opacity-40"
                        onClick={() => cart.setQty(l.variantId, l.quantity - 1)}
                        disabled={l.quantity <= 1}
                        aria-label="−"
                      >
                        <MinusIcon width={16} height={16} />
                      </button>
                      <span className="w-7 text-center text-sm font-medium tabular-nums">{l.quantity}</span>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand disabled:opacity-40"
                        onClick={() => cart.setQty(l.variantId, l.quantity + 1)}
                        disabled={l.quantity >= l.maxStock}
                        aria-label="+"
                      >
                        <PlusIcon width={16} height={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.remove(l.variantId)}
                      className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm text-ink-soft hover:bg-sand hover:text-brand"
                    >
                      <TrashIcon width={16} height={16} />
                      {t("cart.remove")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-24">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">
              {t("cart.subtotal")} ({t("cart.items", { n: cart.count })})
            </dt>
            <dd className="font-medium">{formatNPR(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("cart.shipping")}</dt>
            <dd className="font-medium">{shipping === 0 ? t("cart.free") : formatNPR(shipping)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt className="font-semibold">{t("cart.total")}</dt>
            <dd className="text-lg font-semibold">{formatNPR(total)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-soft">
          {remaining > 0
            ? t("cart.add_more", { amount: formatNPR(remaining) })
            : t("cart.free_over", { amount: formatNPR(settings.free_shipping_over) })}
        </p>
        <Link href={checkoutHref} className="btn-brand mt-5 w-full">
          {t("cart.checkout")}
        </Link>
        <Link href="/shop" className="mt-3 block text-center text-sm text-ink-soft hover:text-brand">
          {t("cart.continue")}
        </Link>
      </aside>
    </div>
  );
}
