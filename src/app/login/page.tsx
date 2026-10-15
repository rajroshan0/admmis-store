import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSessionUser, safeNext } from "@/lib/auth";
import { getT } from "@/lib/lang";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const user = await getSessionUser().catch(() => null);
  if (user) redirect(next);

  const { t } = await getT();
  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("auth.login_title")}</h1>
        <p className="mb-6 mt-2 text-ink-soft">
          {sp.next ? t("auth.login_to_continue") : t("auth.login_sub")}
        </p>
        <AuthForm mode="login" next={next} initialError={sp.error === "confirm" ? "err.generic" : undefined} />
      </div>
    </div>
  );
}
