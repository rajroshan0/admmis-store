import Link from "next/link";
import { getT } from "@/lib/lang";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-7xl font-semibold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-semibold">{t("common.not_found")}</h1>
      <Link href="/" className="btn-primary mt-8">
        {t("common.go_home")}
      </Link>
    </div>
  );
}
