"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { createClient } from "@/lib/supabase/client";
import { isValidNepalMobile } from "@/shared/format";

export default function AccountForm({
  userId,
  email,
  fullName,
  phone,
}: {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
}) {
  const { t } = useLang();
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [mobile, setMobile] = useState(phone);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (mobile && !isValidNepalMobile(mobile)) return setMsg({ ok: false, text: t("err.invalid_phone") });
    setBusy(true);
    const { error } = await createClient()
      .from("profiles")
      .update({ full_name: name.trim(), phone: mobile.trim() })
      .eq("id", userId);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: t("err.generic") });
    setMsg({ ok: true, text: t("account.saved") });
    router.refresh();
  }

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-4 p-6 sm:p-8">
      <div>
        <label className="label" htmlFor="a-email">{t("auth.email")}</label>
        <input id="a-email" className="input bg-sand/60" value={email} readOnly />
      </div>
      <div>
        <label className="label" htmlFor="a-name">{t("auth.full_name")}</label>
        <input id="a-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="a-phone">{t("auth.phone")}</label>
        <input id="a-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
      </div>
      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? "text-ok" : "text-brand-dark"}`}>
          {msg.text}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={busy} type="submit">
          {t("account.save")}
        </button>
        <button className="btn-ghost" type="button" onClick={logout}>
          {t("nav.logout")}
        </button>
      </div>
    </form>
  );
}
