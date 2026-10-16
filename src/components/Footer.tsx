import Link from "next/link";
import Logo from "@/components/Logo";
import { site } from "@/lib/site";
import { translate } from "@/shared/i18n";
import type { Lang } from "@/shared/types";

export default function Footer({ lang }: { lang: Lang }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  const brandOf = translate(lang, "brand.of", { company: site.company });
  return (
    <footer className="mt-20 border-t border-line bg-sand/60">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-3">
        <div>
          <p className="text-2xl">
            <Logo />
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{brandOf}</p>
          <p className="mt-2 max-w-xs text-sm text-ink-soft">{t("brand.tagline")}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-mute">{t("footer.help")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/app" className="hover:text-brand">{t("footer.app")}</Link></li>
            <li><Link href="/legal/returns" className="hover:text-brand">{t("footer.returns")}</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-brand">{t("footer.privacy")}</Link></li>
            <li><Link href="/legal/terms" className="hover:text-brand">{t("footer.terms")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-mute">{t("footer.contact")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            {site.supportPhone && (
              <li><a href={`tel:${site.supportPhone}`} className="hover:text-brand">{site.supportPhone}</a></li>
            )}
            {site.supportEmail && (
              <li><a href={`mailto:${site.supportEmail}`} className="hover:text-brand">{site.supportEmail}</a></li>
            )}
            <li>{site.city}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-mute">
        © {new Date().getFullYear()} {site.name} ({brandOf.charAt(0).toLowerCase() + brandOf.slice(1)}). {t("footer.rights")}
      </div>
    </footer>
  );
}
