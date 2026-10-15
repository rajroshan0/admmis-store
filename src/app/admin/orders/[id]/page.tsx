import Link from "next/link";
import { notFound } from "next/navigation";
import AdminOrderControls from "@/components/AdminOrderControls";
import { requireAdmin } from "@/lib/auth";
import { formatNPR } from "@/shared/format";
import type { Order } from "@/shared/types";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const o = data as unknown as Order;
  const needsRefund = o.status === "cancelled" && o.payment_status === "paid";

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/orders" className="text-sm text-ink-soft hover:text-brand">← All orders</Link>
      <div>
        <h2 className="text-2xl font-semibold">Order #{o.order_number}</h2>
        <p className="text-sm text-ink-soft">
          {new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu", dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>

      {needsRefund && (
        <p className="rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark">
          This order is cancelled but was paid via eSewa. Refund it from your eSewa merchant portal, then set payment to <b>refunded</b>.
        </p>
      )}

      <AdminOrderControls orderId={o.id} status={o.status} paymentStatus={o.payment_status} />

      <section className="card divide-y divide-line">
        {(o.order_items ?? []).map((i) => (
          <div key={i.id} className="flex justify-between gap-4 p-4 text-sm">
            <div>
              <p className="font-medium">{i.name}</p>
              <p className="text-ink-soft">{[i.size, i.color].filter(Boolean).join(" · ")} × {i.quantity}</p>
            </div>
            <p className="font-medium">{formatNPR(i.unit_price * i.quantity)}</p>
          </div>
        ))}
        <div className="space-y-1 p-4 text-sm">
          <div className="flex justify-between"><span className="text-ink-soft">Subtotal</span><span>{formatNPR(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="flex justify-between text-ok"><span>Discount{o.promo_code ? ` (${o.promo_code})` : ""}</span><span>−{formatNPR(o.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-ink-soft">Delivery</span><span>{o.shipping_fee === 0 ? "Free" : formatNPR(o.shipping_fee)}</span></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Total</span><span>{formatNPR(o.total)}</span></div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card p-4 text-sm">
          <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink-mute">Deliver to</h3>
          <p className="font-medium">{o.shipping_name}</p>
          <p><a href={`tel:${o.shipping_phone}`} className="text-brand">{o.shipping_phone}</a></p>
          <p className="text-ink-soft">{[o.shipping_address, o.shipping_city, o.shipping_district].filter(Boolean).join(", ")}</p>
          {o.notes && <p className="mt-2 italic text-ink-soft">“{o.notes}”</p>}
        </section>
        <section className="card p-4 text-sm">
          <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink-mute">Payment</h3>
          <p className="font-medium uppercase">{o.payment_method}</p>
          <p className="text-ink-soft">Status: {o.payment_status}</p>
          {o.esewa_ref_id && <p className="text-ink-soft">eSewa ref: {o.esewa_ref_id}</p>}
          {o.paid_at && <p className="text-ink-soft">Paid: {new Date(o.paid_at).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" })}</p>}
        </section>
      </div>
    </div>
  );
}
