import Link from "next/link";
import CategoryBrowse from "@/components/CategoryBrowse";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import ProductCard from "@/components/ProductCard";
import { CashIcon, PhoneIcon, SwapIcon, TruckIcon } from "@/components/Icons";
import { getCategories, getProducts, getSettings } from "@/lib/data";
import { heroImagePath } from "@/lib/hero";
import { getT } from "@/lib/lang";
import { offer } from "@/lib/offer";
import { formatNPR, pickLang } from "@/shared/format";

export default async function HomePage() {
  const { lang, t } = await getT();
  const [categories, featured, newest, settings] = await Promise.all([
    getCategories(),
    getProducts({ featured: true, limit: 4 }),
    getProducts({ sort: "new", limit: 40 }),
    getSettings(),
  ]);

  const freeOver = formatNPR(settings.free_shipping_over);
  const trust = [
    { icon: CashIcon, title: t("home.trust_cod"), sub: t("home.trust_cod_sub") },
    { icon: PhoneIcon, title: t("home.trust_esewa"), sub: t("home.trust_esewa_sub") },
    { icon: TruckIcon, title: t("home.trust_delivery"), sub: t("home.trust_delivery_sub", { amount: freeOver }) },
    { icon: SwapIcon, title: t("home.trust_returns"), sub: t("home.trust_returns_sub") },
  ];

  const stripItems = [
    ...(offer.active ? [pickLang(lang, offer.strip.en, offer.strip.ne)] : []),
    t("home.trust_esewa"),
    t("home.trust_cod"),
    `${t("home.trust_delivery")} · ${t("home.trust_delivery_sub", { amount: freeOver })}`,
    t("home.trust_returns"),
  ];

  return (
    <>
      <Hero
        lang={lang}
        title={t("home.hero_title")}
        sub={t("home.hero_sub")}
        cta={t("home.hero_cta")}
        offLabel={t("offer.off")}
        photo={heroImagePath()}
      />
      <Marquee items={stripItems} />

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container-page pt-14 sm:pt-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-bold sm:text-4xl">{t("home.featured")}</h2>
            <Link href="/shop" className="text-sm font-semibold text-brand hover:underline">
              {t("home.view_all")}
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} lang={lang} priority={i < 2} />
            ))}
          </div>
        </section>
      )}

      {/* Shop by category: compact chips that filter the grid (first chip = newest arrivals) */}
      <CategoryBrowse
        lang={lang}
        categories={categories}
        products={newest}
        labels={{ heading: t("home.categories"), newest: t("home.new"), viewAll: t("home.view_all"), empty: t("home.empty") }}
      />

      {/* Trust strip */}
      <section className="mt-16 bg-sand sm:mt-24">
        <div className="container-page grid grid-cols-2 gap-x-4 gap-y-6 py-9 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand">
                <Icon />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-ink-soft">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
