import { site } from "@/lib/site";

/** Wordmark: "Admmis" in ink with ".fashion" in the brand colour. Works for any name; no dot means a plain brand-coloured full stop. */
export default function Logo({ className = "" }: { className?: string }) {
  const i = site.name.indexOf(".");
  const main = i === -1 ? site.name : site.name.slice(0, i);
  const rest = i === -1 ? "." : site.name.slice(i);
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      {main}
      <span className="font-semibold text-brand">{rest}</span>
    </span>
  );
}
