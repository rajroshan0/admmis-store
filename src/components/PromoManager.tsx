"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNPR } from "@/shared/format";

export interface PromoRow {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  uses: number;
  once_per_user: boolean;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

function statusOf(p: PromoRow): { label: string; tone: string } {
  const now = Date.now();
  if (!p.is_active) return { label: "Off", tone: "bg-sand text-ink-soft" };
  if (p.expires_at && new Date(p.expires_at).getTime() <= now) return { label: "Expired", tone: "bg-sand text-ink-soft" };
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return { label: "Scheduled", tone: "bg-amber-50 text-amber-800" };
  if (p.max_uses !== null && p.uses >= p.max_uses) return { label: "Used up", tone: "bg-sand text-ink-soft" };
  return { label: "Live", tone: "bg-green-50 text-ok" };
}

export default function PromoManager({ initial }: { initial: PromoRow[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [oncePerUser, setOncePerUser] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const clean = code.trim().toUpperCase();
    const v = Number(value);
    if (!/^[A-Z0-9_-]{3,30}$/.test(clean)) return setMsg("Code: 3–30 letters or numbers (A–Z, 0–9, - or _).");
    if (!Number.isInteger(v) || v < 1) return setMsg("Enter the discount as a whole number.");
    if (kind === "percent" && v > 90) return setMsg("A percentage discount can be at most 90%.");
    setBusy(true);
    const { error } = await createClient().from("promo_codes").insert({
      code: clean,
      kind,
      value: v,
      min_subtotal: minSubtotal ? Math.max(0, Math.floor(Number(minSubtotal))) : 0,
      max_uses: maxUses ? Math.max(1, Math.floor(Number(maxUses))) : null,
      once_per_user: oncePerUser,
      // Valid until the end of the chosen day (Nepal time).
      expires_at: expires ? new Date(`${expires}T23:59:59+05:45`).toISOString() : null,
    });
    setBusy(false);
    if (error) return setMsg(error.code === "23505" ? "That code already exists." : `Could not save: ${error.message}`);
    setCode("");
    setMinSubtotal("");
    setMaxUses("");
    setExpires("");
    setMsg(`Created ${clean}.`);
    router.refresh();
  }

  async function toggle(p: PromoRow) {
    const { error } = await createClient().from("promo_codes").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return setMsg(`Could not update: ${error.message}`);
    router.refresh();
  }

  async function remove(p: PromoRow) {
    if (!window.confirm(`Delete ${p.code}? Past orders keep their discount.`)) return;
    const { error } = await createClient().from("promo_codes").delete().eq("id", p.id);
    if (error) return setMsg(`Could not delete: ${error.message}`);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="card p-5 sm:p-6" noValidate>
        <h2 className="mb-4 text-lg font-semibold">New promo code</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="pc-code">Code</label>
            <input id="pc-code" className="input uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="FESTIVE10" maxLength={30} autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="pc-kind">Discount type</label>
            <select id="pc-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as "percent" | "fixed")}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (Rs.)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pc-value">{kind === "percent" ? "Percent off" : "Rs. off"}</label>
            <input id="pc-value" className="input" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div>
            <label className="label" htmlFor="pc-min">Minimum basket (Rs., optional)</label>
            <input id="pc-min" className="input" inputMode="numeric" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </div>
          <div>
            <label className="label" htmlFor="pc-max">Total uses allowed (optional)</label>
            <input id="pc-max" className="input" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} placeholder="Unlimited" />
          </div>
          <div>
            <label className="label" htmlFor="pc-exp">Last valid day (optional)</label>
            <input id="pc-exp" type="date" className="input" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#d42a5b]" checked={oncePerUser} onChange={(e) => setOncePerUser(e.target.checked)} />
          Each customer can use this code only once
        </label>
        <div className="mt-5 flex items-center gap-3">
          <button className="btn-brand" disabled={busy}>{busy ? "Saving…" : "Create code"}</button>
          {msg && <span className="text-sm text-ink-soft" role="status">{msg}</span>}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-sand/50 text-xs text-ink-mute">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Rules</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {initial.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-soft">No promo codes yet. Create your first one above.</td></tr>
            )}
            {initial.map((p) => {
              const st = statusOf(p);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono font-semibold">{p.code}</td>
                  <td className="px-4 py-3">{p.kind === "percent" ? `${p.value}% off` : `${formatNPR(p.value)} off`}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {[
                      p.min_subtotal > 0 ? `min ${formatNPR(p.min_subtotal)}` : null,
                      p.once_per_user ? "once per customer" : null,
                      p.expires_at ? `until ${new Date(p.expires_at).toLocaleDateString("en-GB", { timeZone: "Asia/Kathmandu", dateStyle: "medium" })}` : null,
                    ].filter(Boolean).join(" · ") || "No limits"}
                  </td>
                  <td className="px-4 py-3">{p.uses}{p.max_uses !== null ? ` / ${p.max_uses}` : ""}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.tone}`}>{st.label}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-ghost !min-h-[36px] !px-4 !py-1.5" onClick={() => toggle(p)}>{p.is_active ? "Turn off" : "Turn on"}</button>
                      <button type="button" className="btn-danger !min-h-[36px] !px-4 !py-1.5" onClick={() => remove(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
