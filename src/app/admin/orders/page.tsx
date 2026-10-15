import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatNPR } from "@/shared/format";
import type { Order, OrderStatus } from "@/shared/types";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : null;
  const q = (sp.q ?? "").replace(/[^0-9]/g, "");

  let query = supabase
    .from("orders")
    .select("id, order_number, status, payment_method, payment_status, total, shipping_name, shipping_phone, shipping_city, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  if (q) query = query.eq("order_number", Number(q));
  const { data } = await query;
  const orders = (data ?? []) as unknown as Order[];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/admin/orders" className={`chip ${!status ? "chip-active" : ""}`}>All</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={`chip capitalize ${status === s ? "chip-active" : ""}`}>
            {s}
          </Link>
        ))}
        <form className="ml-auto" action="/admin/orders">
          <input name="q" defaultValue={q} placeholder="Order number" inputMode="numeric" className="input !min-h-[40px] w-40 rounded-full" />
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-line bg-sand/50 text-xs uppercase tracking-wider text-ink-mute">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3"><span className="sr-only">Manage</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">No orders found.</td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-sand/30">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand hover:underline">#{o.order_number}</Link>
                  <div className="text-xs text-ink-mute">{new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu", dateStyle: "medium", timeStyle: "short" })}</div>
                </td>
                <td className="px-4 py-3">
                  {o.shipping_name}
                  <div className="text-xs text-ink-mute">{o.shipping_phone} · {o.shipping_city}</div>
                </td>
                <td className="px-4 py-3 capitalize">{o.status}</td>
                <td className="px-4 py-3">
                  <span className="uppercase">{o.payment_method}</span> · {o.payment_status}
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatNPR(o.total)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="btn-ghost !min-h-[36px] !px-4 !py-1.5">Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
