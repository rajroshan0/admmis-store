export type PayResult = "paid" | "failed" | "pending" | "unknown";

/**
 * After eSewa, our website checks the payment and redirects to /orders/<id>?paid=1 (or ?payment=failed|pending).
 * Given any URL the payment page moves to, returns the result when it is that "finished" redirect, otherwise null.
 */
export function payResultFromUrl(url: string): PayResult | null {
  const m = /^https?:\/\/[^/]+(\/[^?#]*)(?:\?([^#]*))?/i.exec(url);
  if (!m) return null;
  const path = m[1];
  if (!/^\/orders(\/|$)/.test(path) && !path.startsWith("/login")) return null;
  const query = new URLSearchParams(m[2] ?? "");
  if (query.get("paid") === "1") return "paid";
  const pay = query.get("payment");
  if (pay === "failed") return "failed";
  return pay ? "pending" : "unknown";
}
