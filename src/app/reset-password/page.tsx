import type { Metadata } from "next";
import Link from "next/link";
import PasswordResetForm from "@/components/PasswordResetForm";
import { getSessionUser } from "@/lib/auth";
import { getT } from "@/lib/lang";

export const metadata: Metadata = { title: "New password", robots: { index: false } };

export default async function ResetPasswordPage() {
  const { t } = await getT();
  // The emailed link signs the visitor in (via /auth/callback); without that session there is nothing to reset.
  const user = await getSessionUser().catch(() => null);

  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("auth.reset_title")}</h1>
        <div className="mt-6">
          {user ? (
            <PasswordResetForm mode="update" />
          ) : (
            <div className="card p-6 text-center">
              <p className="text-ink-soft">{t("auth.reset_expired")}</p>
              <Link href="/forgot-password" className="btn-primary mt-6">
                {t("auth.send_link")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
