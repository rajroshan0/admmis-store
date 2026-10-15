"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus, PaymentStatus } from "@/shared/types";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const PAYMENTS: PaymentStatus[] = ["unpaid", "paid", "failed", "refunded"];

export default function AdminOrderControls({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  const router = useRouter();
  const [s, setS] = useState<OrderStatus>(status);
  const [p, setP] = useState<PaymentStatus>(paymentStatus);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (s === "cancelled" && status !== "cancelled" && !window.confirm("Cancel this order? Stock will be returned to inventory.")) return;
    setBusy(true);
    setMsg(null);
    const patch: Record<string, unknown> = { status: s, payment_status: p };
    if (p === "paid" && paymentStatus !== "paid") patch.paid_at = new Date().toISOString();
    const { error } = await createClient().from("orders").update(patch).eq("id", orderId);
    setBusy(false);
    if (error) return setMsg(`Could not save: ${error.message}`);
    setMsg("Saved.");
    router.refresh();
  }

  const dirty = s !== status || p !== paymentStatus;

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-lg font-semibold">Update order</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="o-status">Order status</label>
          <select id="o-status" className="input capitalize" value={s} onChange={(e) => setS(e.target.value as OrderStatus)}>
            {STATUSES.map((x) => (
              <option key={x} value={x} disabled={status === "cancelled" && x !== "cancelled"}>{x}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="o-pay">Payment status</label>
          <select id="o-pay" className="input capitalize" value={p} onChange={(e) => setP(e.target.value as PaymentStatus)}>
            {PAYMENTS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-mute">
        For cash on delivery, set payment to <b>paid</b> once the courier hands over the cash. Cancelling an order returns its items to stock.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary" disabled={busy || !dirty} onClick={save}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        {msg && <span className="text-sm text-ink-soft" role="status">{msg}</span>}
      </div>
    </div>
  );
}
