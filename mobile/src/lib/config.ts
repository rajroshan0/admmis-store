// Settings come from the .env file (EXPO_PUBLIC_* values are baked into the app when it is built).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** The website's address: used for placing orders, eSewa and the hero photo. No trailing slash. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export const STORE_NAME = "Admmis.fashion";
export const COMPANY_NAME = "ADMMIS";

export const configProblem: string | null =
  !SUPABASE_URL || SUPABASE_URL.includes("YOUR-PROJECT") || !SUPABASE_ANON_KEY
    ? "Supabase is not set up. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    : !API_URL
      ? "Website address is not set. Add EXPO_PUBLIC_API_URL to .env (your Mac's Wi-Fi address, like http://192.168.1.23:3000)."
      : null;

/** Same festive offer as the website hero (lib/offer.ts there). */
export const offer = {
  active: true,
  percent: 25,
  title: { en: "Festive collection", ne: "उत्सव सङ्ग्रह" },
  strip: { en: "Up to 25% off the festive collection", ne: "उत्सव सङ्ग्रहमा २५% सम्म छुट" },
};

/** Support contact (set in .env). Leave empty to hide a button. WhatsApp: digits with country code, e.g. 9779812345678. */
export const SUPPORT_WHATSAPP = (process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/[^\d]/g, "");
export const SUPPORT_PHONE = (process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? "").trim();
export const SUPPORT_EMAIL = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "").trim();
