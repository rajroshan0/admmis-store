"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCart } from "@/components/CartProvider";
import { useLang } from "@/components/LangProvider";
import ProductImage from "@/components/ProductImage";
import { createClient } from "@/lib/supabase/client";
import { postForm } from "@/lib/postForm";
import { shippingFor } from "@/shared/cart";
import { formatNPR, isValidNepalMobile, pickLang } from "@/shared/format";
import type { DictKey } from "@/shared/i18n";
import type { PaymentMethod, StoreSettings } from "@/shared/types";

interface Props {
  settings: StoreSettings;
  defaults: { name: string; phone: string };
}

export default function CheckoutForm({ settings, defaults }: Props) {
  const { t, lang } = useLang();
  const cart = useCart();
  const router = useRouter();

  const methods: PaymentMethod[] = [
    ...(settings.cod_enabled ? (["cod"] as const) : []),
    ...(settings.esewa_enabled ? (["esewa"] as const) : []),
  ];

  const [name, setName] = useState(defaults.name);
  const [phone, setPhone] = useState(defaults.phone);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(methods[0] ?? "cod");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "placing" | "redirecting">("idle");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const promoItems = cart.lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity }));
  const promoItemsKey = JSON.stringify(promoItems);

  /** Asks the database what this code is worth for the current basket (prices come from the server). */
  async function checkPromo(code: string, silent = false): Promise<boolean> {
    setPromoBusy(true);
    if (!silent) setPromoError(null);
    try {
      const { data, error } = await createClient().rpc("preview_promo", { p_code: code, p_items: JSON.parse(promoItemsKey) });
      const r = data as { ok: boolean; code?: string; discount?: number; error?: string; min?: number } | null;
      if (error || !r) {
        setPromo(null);
        setPromoError(t("err.generic"));
        return false;
      }
      if (!r.ok) {
        setPromo(null);
        const known = ["promo_invalid", "promo_expired", "promo_used_up", "promo_already_used", "promo_min"];
        const key = (known.includes(r.error ?? "") ? `err.${r.error}` : "err.promo_invalid") as DictKey;
        setPromoError(t(key, { amount: formatNPR(r.min ?? 0) }));
        return false;
      }
      setPromo({ code: r.code ?? code, discount: r.discount ?? 0 });
      setPromoError(null);
      return true;
    } catch {
      setPromoError(t("err.network"));
      return false;
    } finally {
      setPromoBusy(false);
    }
  }

  // If the basket changes after a code was applied, re-check it so the saving stays correct.
  useEffect(() => {
    if (promo) void checkPromo(promo.code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoItemsKey]);

  useEffect(() => {
    if (cart.ready) void cart.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready]);

  if (!cart.ready) return <p className="py-20 text-center text-ink-soft">{t("common.loading")}</p>;

  if (cart.lines.length === 0 && status === "idle") {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-soft">{t("checkout.empty")}</p>
        <Link href="/shop" className="btn-primary mt-6">
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  if (methods.length === 0) {
    return <p className="rounded-xl bg-brand-light p-4 text-brand-dark">{t("checkout.no_methods")}</p>;
  }

  const shipping = shippingFor(cart.subtotal, settings);
  const discount = promo?.discount ?? 0;
  const total = cart.subtotal - discount + shipping;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !address.trim() || !city.trim()) return setError(t("err.invalid_shipping"));
    if (!isValidNepalMobile(phone)) return setError(t("err.invalid_phone"));

    setStatus("placing");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          shipping: { name, phone, address, city, district, notes },
          paymentMethod: method,
          promo: promo?.code,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        name?: string;
        orderId?: string;
        esewa?: { formUrl: string; fields: Record<string, string> } | null;
      };

      if (!res.ok || !json.orderId) {
        setStatus("idle");
        switch (json.error) {
          case "not_authenticated":
            return router.push("/login?next=%2Fcheckout");
          case "out_of_stock":
            void cart.refresh();
            return setError(t("err.out_of_stock", { name: json.name ?? "" }));
          case "unavailable":
            void cart.refresh();
            return setError(t("err.unavailable"));
          case "invalid_phone":
            return setError(t("err.invalid_phone"));
          case "invalid_shipping":
            return setError(t("err.invalid_shipping"));
          case "method_disabled":
            return setError(t("err.method_disabled"));
          case "promo_invalid":
          case "promo_expired":
          case "promo_used_up":
          case "promo_already_used":
          case "promo_min":
            setPromo(null);
            return setError(t(`err.${json.error}` as DictKey, { amount: "" }));
          default:
            return setError(t("err.generic"));
        }
      }

      // The order now exists on the server (stock reserved), so the cart can be emptied.
      cart.clear();

      if (method === "esewa" && json.esewa) {
        setStatus("redirecting");
        postForm(json.esewa.formUrl, json.esewa.fields);
        return;
      }
      router.push(`/orders/${json.orderId}?placed=1`);
    } catch {
      setStatus("idle");
      setError(t("err.network"));
    }
  }

  const busy = status !== "idle";

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12" noValidate>
      <div className="space-y-8">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-semibold">{t("checkout.shipping")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="label">{t("checkout.name")}</label>
              <input id="c-name" className="input" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="c-phone" className="label">{t("checkout.phone")}</label>
              <input id="c-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-address" className="label">{t("checkout.address")}</label>
              <input id="c-address" className="input" autoComplete="street-address" required value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label htmlFor="c-city" className="label">{t("checkout.city")}</label>
              <input id="c-city" className="input" autoComplete="address-level2" required value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label htmlFor="c-district" className="label">{t("checkout.district")}</label>
              <input id="c-district" className="input" autoComplete="address-level1" value={district} onChange={(e) => setDistrict(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-notes" className="label">{t("checkout.notes")}</label>
              <textarea id="c-notes" className="input min-h-[88px]" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-semibold">{t("checkout.payment")}</h2>
          <div className="space-y-3" role="radiogroup" aria-label={t("checkout.payment")}>
            {methods.map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  method === m ? "border-ink bg-sand/50" : "border-line hover:border-ink-mute"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={m}
                  checked={method === m}
                  onChange={() => setMethod(m)}
                  className="mt-1 h-4 w-4 accent-[#d42a5b]"
                />
                <span>
                  <span className="block font-medium">{m === "cod" ? t("checkout.cod") : t("checkout.esewa")}</span>
                  <span className="block text-sm text-ink-soft">
                    {m === "cod" ? t("checkout.cod_sub") : t("checkout.esewa_sub")}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-24">
        <h2 className="mb-4 text-xl font-semibold">{t("checkout.summary")}</h2>
        <ul className="max-h-72 space-y-3 overflow-auto pr-1">
          {cart.lines.map((l) => {
            const n = pickLang(lang, l.name_en, l.name_ne);
            return (
              <li key={l.variantId} className="flex gap-3 text-sm">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                  <ProductImage src={l.image} alt={n} sizes="56px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">{n}</p>
                  <p className="text-ink-soft">
                    {[l.size, l.color].filter(Boolean).join(" · ")} × {l.quantity}
                  </p>
                </div>
                <p className="font-medium">{formatNPR(l.price * l.quantity)}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 border-t border-line pt-4">
          <label htmlFor="c-promo" className="label">{t("checkout.promo")}</label>
          {promo ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-green-50 px-3.5 py-2.5 text-sm text-ok">
              <span>{t("checkout.promo_applied", { code: promo.code, amount: formatNPR(promo.discount) })}</span>
              <button
                type="button"
                className="shrink-0 font-semibold underline"
                onClick={() => {
                  setPromo(null);
                  setPromoInput("");
                  setPromoError(null);
                }}
              >
                {t("checkout.promo_remove")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                id="c-promo"
                className="input uppercase"
                value={promoInput}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={30}
                onChange={(e) => setPromoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (promoInput.trim()) void checkPromo(promoInput.trim());
                  }
                }}
              />
              <button
                type="button"
                className="btn-ghost shrink-0"
                disabled={promoBusy || !promoInput.trim()}
                onClick={() => void checkPromo(promoInput.trim())}
              >
                {t("checkout.promo_apply")}
              </button>
            </div>
          )}
          {promoError && (
            <p role="alert" className="mt-2 text-sm text-brand-dark">
              {promoError}
            </p>
          )}
        </div>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("cart.subtotal")}</dt>
            <dd>{formatNPR(cart.subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-ok">
              <dt>{t("checkout.discount")}</dt>
              <dd>−{formatNPR(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("cart.shipping")}</dt>
            <dd>{shipping === 0 ? t("cart.free") : formatNPR(shipping)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt className="font-semibold">{t("cart.total")}</dt>
            <dd className="text-lg font-semibold">{formatNPR(total)}</dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-brand mt-5 w-full">
          {status === "placing"
            ? t("checkout.placing")
            : status === "redirecting"
              ? t("checkout.redirecting")
              : method === "esewa"
                ? t("checkout.pay_esewa", { amount: formatNPR(total) })
                : t("checkout.place")}
        </button>
        <Link href="/cart" className="mt-3 block text-center text-sm text-ink-soft hover:text-brand">
          ← {t("nav.cart")}
        </Link>
      </aside>
    </form>
  );
}
