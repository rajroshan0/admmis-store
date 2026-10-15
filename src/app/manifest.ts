import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — clothes & everyday essentials`,
    short_name: site.name.split(".")[0],
    description: "Shop clothing, accessories and home essentials in Nepal. Pay with eSewa or cash on delivery.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#120f30",
    theme_color: "#120f30",
    lang: "en",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop", url: "/shop" },
      { name: "My cart", url: "/cart" },
      { name: "My orders", url: "/orders" },
    ],
  };
}
