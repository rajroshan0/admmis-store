function Diamond() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="mx-6 shrink-0 opacity-70" aria-hidden="true">
      <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
    </svg>
  );
}

/** Slow scrolling strip of shop promises. Pauses on hover; static for reduced-motion users. */
export default function Marquee({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((text, i) => (
        <li key={i} className="flex items-center whitespace-nowrap text-sm font-semibold">
          {text}
          <Diamond />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="marquee overflow-hidden bg-marigold text-night">
      <div className="marquee-track py-3">
        {row(false)}
        {row(true)}
        {row(true)}
        {row(true)}
      </div>
      <div className="dhaka text-night" aria-hidden="true" />
    </div>
  );
}
