// Store identity. Override with env vars, or edit the defaults here.
export const site = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "Admmis.fashion",
  /** The parent company this shop belongs to. */
  company: process.env.NEXT_PUBLIC_COMPANY_NAME || "ADMMIS",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  city: process.env.NEXT_PUBLIC_STORE_CITY || "Kathmandu, Nepal",
};

export function absoluteUrl(path: string): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
