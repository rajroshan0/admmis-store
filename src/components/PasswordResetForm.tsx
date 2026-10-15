"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { createClient } from "@/lib/supabase/client";
import type { DictKey } from "@/shared/i18n";

/** mode "request": ask for the email. mode "update": choose a new password (user arrived via the email link). */
export default function PasswordResetForm({ mode }: { mode: "request" | "update" }) {
  const { t } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<DictKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "request") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
        });
        if (err) return setError("err.generic");
        setSentTo(email.trim()); // same message whether or not the account exists
      } else {
        if (password.length < 8) return setError("auth.weak_password");
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) return setError(err.message.toLowerCase().includes("password") ? "auth.weak_password" : "err.generic");
        router.push("/account");
        router.refresh();
      }
    } catch {
      setError("err.network");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="card p-6 text-center">
        <p className="text-ink-soft">{t("auth.reset_sent", { email: sentTo })}</p>
        <Link href="/login" className="btn-primary mt-6">
          {t("auth.back_to_login")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6 sm:p-8" noValidate>
      {mode === "request" ? (
        <div>
          <label htmlFor="r-email" className="label">{t("auth.email")}</label>
          <input id="r-email" className="input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      ) : (
        <div>
          <label htmlFor="r-pass" className="label">{t("auth.new_password")}</label>
          <input id="r-pass" className="input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1.5 text-xs text-ink-mute">{t("auth.password_hint")}</p>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark">
          {t(error)}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? t("auth.working") : mode === "request" ? t("auth.send_link") : t("auth.reset_btn")}
      </button>
      {mode === "request" && (
        <p className="text-center text-sm">
          <Link href="/login" className="text-ink-soft hover:text-brand hover:underline">{t("auth.back_to_login")}</Link>
        </p>
      )}
    </form>
  );
}
