import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import OrderActions from "@/components/OrderActions";
import { formatDate, PaymentBadge, StatusBadge, Timeline } from "@/components/OrderBits";
import ProductImage from "@/components/ProductImage";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { createClient } from "@/lib/supabase/server";
import { formatNPR } from "@/shared/format";
import type { Order } from "@/shared/types";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string; paid?: string; payment?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser(`/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { lang, t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const order = data as unknown as Order;

  const canPay =
    order.payment_method === "esewa" &&
    order.status !== "cancelled" &&
    (order.payment_status === "unpaid" || order.payment_status === "failed");
  const canCancel = order.status === "pending" && order.payment_status !== "paid";

  let banner: { tone: "ok" | "warn"; text: string } | null = null;
  if (sp.paid === "1" || (sp.placed === "1" && order.payment_status === "paid")) {
    banner = { tone: "ok", text: `${t("orders.thanks")} ${t("orders.thanks_paid")}` };
  } else if (sp.placed === "1") {
    banner = {
      tone: "ok",
      text: order.payment_method === "cod" ? `${t("orders.thanks")} ${t("orders.thanks_cod")}` : t("orders.thanks"),
    };
  } else if (sp.payment === "failed") {
    banner = { tone: "warn", text: t("orders.payment_failed") };
  } else if (sp.payment === "pending") {
    banner = { tone: "warn", text: t("orders.payment_pending") };
  }

  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <Link href="/orders" className="text-sm text-ink-soft hover:text-brand">
        ← {t("orders.back")}
      </Link>

      {banner && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
            banner.tone === "ok" ? "bg-green-50 text-ok" : "bg-brand-light text-brand-dark"
          }`}
        >
          {banner.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{t("orders.order", { n: order.order_number })}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t("orders.placed", { date: formatDate(order.created_at, lang) })}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={order.status} lang={lang} />
          <PaymentBadge status={order.payment_status} lang={lang} />
        </div>
      </div>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-ink-mute">{t("orders.track")}</h2>
        <Timeline status={order.status} lang={lang} />
      </section>

      {(canPay || canCancel) && (
        <div className="mt-6">
          <OrderActions orderId={order.id} canPay={canPay} canCancel={canCancel} />
        </div>
      )}

      <section className="card mt-6 divide-y divide-line">
        <h2 className="p-5 pb-3 font-sans text-sm font-semibold uppercase tracking-wider text-ink-mute">{t("orders.items")}</h2>
        {(order.order_items ?? []).map((i) => (
          <div key={i.id} className="flex gap-4 p-5">
            <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-sand">
              <ProductImage src={i.image} alt={i.name} sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{i.name}</p>
              <p className="text-sm text-ink-soft">
                {[i.size, i.color].filter(Boolean).join(" · ")} × {i.quantity}
              </p>
            </div>
            <p className="font-medium">{formatNPR(i.unit_price * i.quantity)}</p>
          </div>
        ))}
        <dl className="space-y-2 p-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("cart.subtotal")}</dt>
            <dd>{formatNPR(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-ok">
              <dt>
                {t("checkout.discount")}
                {order.promo_code ? ` (${order.promo_code})` : ""}
              </dt>
              <dd>−{formatNPR(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("cart.shipping")}</dt>
            <dd>{order.shipping_fee === 0 ? t("cart.free") : formatNPR(order.shipping_fee)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt className="font-semibold">{t("cart.total")}</dt>
            <dd className="text-lg font-semibold">{formatNPR(order.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-2 font-sans text-sm font-semibold uppercase tracking-wider text-ink-mute">{t("orders.delivery_to")}</h2>
          <p className="font-medium">{order.shipping_name}</p>
          <p className="text-sm text-ink-soft">{order.shipping_phone}</p>
          <p className="text-sm text-ink-soft">
            {[order.shipping_address, order.shipping_city, order.shipping_district].filter(Boolean).join(", ")}
          </p>
          {order.notes && <p className="mt-2 text-sm italic text-ink-soft">“{order.notes}”</p>}
        </section>
        <section className="card p-5">
          <h2 className="mb-2 font-sans text-sm font-semibold uppercase tracking-wider text-ink-mute">{t("orders.payment")}</h2>
          <p className="font-medium">
            {order.payment_method === "cod" ? t("orders.method_cod") : t("orders.method_esewa")}
          </p>
          {order.esewa_ref_id && (
            <p className="text-sm text-ink-soft">
              {t("orders.ref")}: {order.esewa_ref_id}
            </p>
          )}
          <p className="mt-2 text-sm text-ink-soft">{t("orders.contact_help")}</p>
        </section>
      </div>
    </div>
  );
}
