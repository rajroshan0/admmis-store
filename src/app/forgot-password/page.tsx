import type { Metadata } from "next";
import PasswordResetForm from "@/components/PasswordResetForm";
import { getT } from "@/lib/lang";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  const { t } = await getT();
  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("auth.forgot_title")}</h1>
        <p className="mb-6 mt-2 text-ink-soft">{t("auth.forgot_sub")}</p>
        <PasswordResetForm mode="request" />
      </div>
    </div>
  );
}
