import type { Lang } from "@/shared/types";

/** Round marigold sticker: slowly rotating ring of text around a fixed "25% OFF". */
export default function OfferSticker({
  lang,
  title,
  percent,
  offLabel,
  className = "",
}: {
  lang: Lang;
  title: string;
  percent: number;
  offLabel: string;
  className?: string;
}) {
  const latin = lang === "en";
  const word = latin ? title.toUpperCase() : title;
  const unit = `${word} • ${percent}% ${offLabel} • `;
  const ring = unit + unit;

  return (
    <div className={`relative aspect-square ${className}`} role="img" aria-label={`${title}: ${percent}% ${offLabel}`}>
      <div className="absolute inset-0 rounded-full bg-marigold shadow-pop" />
      <svg viewBox="0 0 200 200" className="sticker-ring absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <path id="offer-ring" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
        </defs>
        <text
          className="fill-night font-sans"
          style={{ fontSize: latin ? 13.5 : 14, fontWeight: 700, letterSpacing: latin ? undefined : 0.5 }}
        >
          <textPath href="#offer-ring" {...(latin ? { textLength: 470, lengthAdjust: "spacing" as const } : {})}>
            {ring}
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-night text-center text-white">
        <span className="font-display text-[clamp(1.4rem,5.5vw,2.2rem)] font-extrabold leading-none">{percent}%</span>
        <span className="mt-0.5 text-[clamp(0.6rem,2vw,0.8rem)] font-bold leading-none tracking-wide text-marigold">
          {offLabel}
        </span>
      </div>
    </div>
  );
}
