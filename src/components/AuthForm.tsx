"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { createClient } from "@/lib/supabase/client";
import { isValidNepalMobile } from "@/shared/format";
import type { DictKey } from "@/shared/i18n";

export default function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: "login" | "signup";
  next: string;
  initialError?: DictKey;
}) {
  const { t } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<DictKey | null>(initialError ?? null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      if (password.length < 8) return setError("auth.weak_password");
      if (!isValidNepalMobile(phone)) return setError("auth.invalid_phone");
    }

    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) {
          setError(err.message.toLowerCase().includes("confirm") ? "auth.email_not_confirmed" : "auth.bad_credentials");
          return;
        }
        router.push(next);
        router.refresh();
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim(), phone: phone.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (err) {
          console.error("[signup] Supabase error:", err.status, err.code, err.message);
          const m = err.message.toLowerCase();
          setError(m.includes("registered") || m.includes("already") ? "auth.already_registered" : m.includes("password") ? "auth.weak_password" : "err.generic");
          return;
        }
        // With email confirmation on, an existing address comes back with no identities.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError("auth.already_registered");
          return;
        }
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setSentTo(email.trim());
        }
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
        <h2 className="text-2xl font-semibold">{t("auth.check_email")}</h2>
        <p className="mt-3 text-ink-soft">{t("auth.check_email_sub", { email: sentTo })}</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary mt-6">
          {t("auth.login_btn")}
        </Link>
      </div>
    );
  }

  const isLogin = mode === "login";
  const other = isLogin ? "/signup" : "/login";

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6 sm:p-8" noValidate>
      {!isLogin && (
        <>
          <div>
            <label htmlFor="full_name" className="label">{t("auth.full_name")}</label>
            <input id="full_name" className="input" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="phone" className="label">{t("auth.phone")}</label>
            <input id="phone" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </>
      )}
      <div>
        <label htmlFor="email" className="label">{t("auth.email")}</label>
        <input id="email" className="input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password" className="label">{t("auth.password")}</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {!isLogin && <p className="mt-1.5 text-xs text-ink-mute">{t("auth.password_hint")}</p>}
        {isLogin && (
          <Link href="/forgot-password" className="mt-2 inline-block text-sm text-ink-soft hover:text-brand hover:underline">
            {t("auth.forgot")}
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark">
          {t(error)}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? t("auth.working") : isLogin ? t("auth.login_btn") : t("auth.signup_btn")}
      </button>

      <p className="text-center text-sm text-ink-soft">
        {isLogin ? t("auth.no_account") : t("auth.have_account")}{" "}
        <Link href={`${other}?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">
          {isLogin ? t("nav.signup") : t("nav.login")}
        </Link>
      </p>
    </form>
  );
}
