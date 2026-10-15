import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/500.css";
import "@fontsource/noto-sans-devanagari/700.css";
import "./globals.css";
import Header, { type HeaderUser } from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";
import { LangProvider } from "@/components/LangProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getLang } from "@/lib/lang";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — clothes & everyday essentials`, template: `%s · ${site.name}` },
  description: "Shop clothing, accessories and home essentials online in Nepal. Pay with eSewa or cash on delivery.",
  applicationName: site.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_NP",
    title: `${site.name} — clothes & everyday essentials`,
    description: "Shop online in Nepal. Pay with eSewa or cash on delivery.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120f30",
};

async function loadHeaderUser(): Promise<HeaderUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return { email: user.email ?? null, isAdmin: profile?.role === "admin" };
  } catch {
    return null; // Supabase not configured yet, or temporarily unreachable
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, user] = await Promise.all([getLang(), loadHeaderUser()]);

  return (
    <html lang={lang}>
      <body>
        <LangProvider lang={lang}>
          <CartProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
            >
              Skip to content
            </a>
            <Header user={user} storeName={site.name} />
            <main id="main">{children}</main>
            <Footer lang={lang} />
            <ServiceWorkerRegister />
          </CartProvider>
        </LangProvider>
      </body>
    </html>
  );
}
