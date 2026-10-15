import Image from "next/image";

/** Product photo, or a tasteful placeholder when none has been uploaded yet. */
export default function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) {
    const initial = alt.trim().charAt(0).toUpperCase() || "A";
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-sand to-line ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="font-display text-5xl text-ink-mute/60">{initial}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
