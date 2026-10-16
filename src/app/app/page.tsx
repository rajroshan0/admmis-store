import type { Metadata } from "next";
import Logo from "@/components/Logo";
import { getT } from "@/lib/lang";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Get the app" };

/** Android app download page (the .apk link comes from NEXT_PUBLIC_APK_URL). */
export default async function AppPage() {
  const { t } = await getT();
  const steps = [t("app.step1"), t("app.step2"), t("app.step3")];

  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-xl">
        <p className="text-3xl">
          <Logo />
        </p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{t("app.title")}</h1>
        <p className="mt-2 text-ink-soft">{t("app.sub")}</p>

        {site.apkUrl ? (
          <>
            <a href={site.apkUrl} download className="btn-primary mt-6 w-full sm:w-auto" rel="noopener">
              {t("app.download")}
            </a>
            <div className="card mt-8 p-6">
              <h2 className="text-lg font-semibold">{t("app.steps_title")}</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-soft">
                {steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-ink-mute">{t("app.safe")}</p>
            </div>
          </>
        ) : (
          <div className="card mt-6 p-6 text-ink-soft">{t("app.coming")}</div>
        )}

        <div className="card mt-6 p-6">
          <h2 className="text-lg font-semibold">{t("app.pwa_title")}</h2>
          <p className="mt-2 text-ink-soft">{t("app.pwa_sub")}</p>
        </div>
      </div>
    </div>
  );
}
