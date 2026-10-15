"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { createClient } from "@/lib/supabase/client";
import { postForm } from "@/lib/postForm";

export default function OrderActions({
  orderId,
  canPay,
  canCancel,
}: {
  orderId: string;
  canPay: boolean;
  canCancel: boolean;
}) {
  const { t } = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setBusy("pay");
    try {
      const res = await fetch("/api/payments/esewa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = (await res.json()) as { esewa?: { formUrl: string; fields: Record<string, string> } };
      if (!res.ok || !json.esewa) throw new Error("initiate");
      postForm(json.esewa.formUrl, json.esewa.fields);
    } catch {
      setBusy(null);
      setError(t("err.generic"));
    }
  }

  async function cancel() {
    if (!window.confirm(t("orders.cancel_confirm"))) return;
    setError(null);
    setBusy("cancel");
    const { error: err } = await createClient().rpc("cancel_my_order", { p_order_id: orderId });
    setBusy(null);
    if (err) return setError(t("err.generic"));
    router.refresh();
  }

  if (!canPay && !canCancel) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {canPay && (
          <button type="button" onClick={pay} disabled={busy !== null} className="btn-brand">
            {busy === "pay" ? t("checkout.redirecting") : t("orders.pay_now")}
          </button>
        )}
        {canCancel && (
          <button type="button" onClick={cancel} disabled={busy !== null} className="btn-danger">
            {t("orders.cancel")}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-brand-dark">
          {error}
        </p>
      )}
    </div>
  );
}
