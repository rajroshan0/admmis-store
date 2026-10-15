import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, PaymentBadge, StatusBadge } from "@/components/OrderBits";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { createClient } from "@/lib/supabase/server";
import { formatNPR } from "@/shared/format";
import type { Order } from "@/shared/types";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  await requireUser("/orders");
  const { lang, t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_method, payment_status, total, created_at, order_items(id, name, quantity)")
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as unknown as Order[];

  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <h1 className="mb-6 text-3xl font-semibold sm:text-4xl">{t("orders.title")}</h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="text-ink-soft">{t("orders.empty")}</p>
          <Link href="/shop" className="btn-primary mt-6">
            {t("cart.continue")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="card block p-5 transition hover:shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{t("orders.order", { n: o.order_number })}</p>
                    <p className="text-sm text-ink-soft">{t("orders.placed", { date: formatDate(o.created_at, lang) })}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={o.status} lang={lang} />
                    <PaymentBadge status={o.payment_status} lang={lang} />
                  </div>
                </div>
                <p className="mt-3 line-clamp-1 text-sm text-ink-soft">
                  {(o.order_items ?? []).map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                </p>
                <p className="mt-2 font-semibold">{formatNPR(o.total)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
