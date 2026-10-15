import Image from "next/image";
import Link from "next/link";
import OfferSticker from "@/components/OfferSticker";
import { offer } from "@/lib/offer";
import { site } from "@/lib/site";
import { pickLang } from "@/shared/format";
import type { Lang } from "@/shared/types";

/** Headline whose words rise out of a mask one after another (the page's single load sequence). */
function RisingWords({ text, startAt = 0.1 }: { text: string; startAt?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          <span className="hero-word-mask">
            <span className="hero-word" style={{ animationDelay: `${startAt + i * 0.09}s` }}>
              {w}
            </span>
          </span>
        </span>
      ))}
    </>
  );
}

export default function Hero({
  lang,
  title,
  sub,
  cta,
  offLabel,
  photo,
}: {
  lang: Lang;
  title: string;
  sub: string;
  cta: string;
  offLabel: string;
  /** Public path of the model photo, or null if none has been added yet. */
  photo: string | null;
}) {
  const offerTitle = pickLang(lang, offer.title.en, offer.title.ne);

  return (
    <section className="relative overflow-hidden bg-night text-white">
      {/* soft colour behind the arch */}
      <div
        className="pointer-events-none absolute -right-24 top-0 h-[34rem] w-[34rem] rounded-full bg-brand/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-marigold/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page relative grid items-center gap-10 pb-14 pt-10 md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:pb-20 md:pt-16">
        <div className="text-center md:text-left">
          <h1 className="text-balance text-[2.6rem] font-extrabold leading-[1.04] sm:text-6xl lg:text-7xl">
            <RisingWords text={title} />
          </h1>
          <p className="hero-fade mx-auto mt-5 max-w-md text-lg text-white/75 md:mx-0" style={{ animationDelay: "0.7s" }}>
            {sub}
          </p>
          <div className="hero-fade mt-8" style={{ animationDelay: "0.85s" }}>
            <Link href={offer.href} className="btn-marigold px-9 py-3.5 text-base">
              {cta}
            </Link>
          </div>
        </div>

        {/* Model photo in an arch */}
        <div className="hero-arch relative mx-auto w-full max-w-[22rem] md:max-w-[28rem]">
          <div
            className="absolute inset-0 translate-x-3 translate-y-3 rounded-t-[999px] rounded-b-[2rem] border-2 border-marigold/60 sm:translate-x-4 sm:translate-y-4"
            aria-hidden="true"
          />
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2rem] bg-gradient-to-b from-brand to-ink shadow-pop">
            {photo ? (
              <Image
                src={photo}
                alt={`${site.name} — ${offerTitle}`}
                fill
                priority
                sizes="(min-width: 768px) 28rem, 22rem"
                className="hero-photo object-cover object-top"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-end p-8 pb-12 text-center">
                <span className="break-words font-display text-4xl font-extrabold text-white/90">{site.name}</span>
                {process.env.NODE_ENV !== "production" && (
                  <span className="mt-3 max-w-[16rem] text-sm text-white/70">
                    Add your photo as <code className="rounded bg-white/15 px-1.5 py-0.5">public/images/hero-model.jpg</code>
                  </span>
                )}
              </div>
            )}
          </div>

          {offer.active && (
            <div className="hero-sticker absolute -left-3 bottom-10 w-28 sm:-left-8 sm:bottom-16 sm:w-36">
              <OfferSticker lang={lang} title={offerTitle} percent={offer.percent} offLabel={offLabel} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
