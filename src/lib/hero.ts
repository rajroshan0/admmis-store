import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { HERO_IMAGE_NAMES } from "@/lib/offer";

/** Returns "/images/hero-model.jpg" (or .webp/.png) if the file exists in /public/images, otherwise null. */
export function heroImagePath(): string | null {
  for (const name of HERO_IMAGE_NAMES) {
    if (existsSync(path.join(process.cwd(), "public", "images", name))) return `/images/${name}`;
  }
  return null;
}
