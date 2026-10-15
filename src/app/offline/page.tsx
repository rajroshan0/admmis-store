import Link from "next/link";
import { getT } from "@/lib/lang";

export const metadata = { title: "Offline" };

/** Shown by the service worker when the network is unreachable. */
export default async function OfflinePage() {
  const { t } = await getT();
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-3xl font-semibold">{t("common.offline_title")}</h1>
      <p className="mt-3 text-ink-soft">{t("common.offline_sub")}</p>
      <Link href="/" className="btn-primary mt-8">
        {t("common.retry")}
      </Link>
    </div>
  );
}
