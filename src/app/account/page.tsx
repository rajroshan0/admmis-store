import type { Metadata } from "next";
import AccountForm from "@/components/AccountForm";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const { t } = await getT();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();

  return (
    <div className="container-page max-w-xl py-8 sm:py-12">
      <h1 className="mb-6 text-3xl font-semibold sm:text-4xl">{t("account.title")}</h1>
      <AccountForm
        userId={user.id}
        email={user.email ?? ""}
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
      />
    </div>
  );
}
