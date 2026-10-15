import type { Metadata } from "next";
import CheckoutForm from "@/components/CheckoutForm";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { getT } from "@/lib/lang";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const { t } = await getT();
  const supabase = await createClient();
  const [settings, { data: profile }] = await Promise.all([
    getSettings(),
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="mb-6 text-3xl font-semibold sm:text-4xl">{t("checkout.title")}</h1>
      <CheckoutForm
        settings={settings}
        defaults={{ name: profile?.full_name ?? "", phone: profile?.phone ?? "" }}
      />
    </div>
  );
}
