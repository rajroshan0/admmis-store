import type { Metadata } from "next";
import CartView from "@/components/CartView";
import { getSettings } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { getT } from "@/lib/lang";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const { t } = await getT();
  const [settings, user] = await Promise.all([getSettings(), getSessionUser()]);
  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="mb-6 text-3xl font-semibold sm:text-4xl">{t("cart.title")}</h1>
      <CartView settings={settings} isLoggedIn={!!user} />
    </div>
  );
}
