import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { TabScreen } from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { Body, Button, Card, Container, Field, H1, H2, Muted } from "@/components/ui";
import { API_URL, COMPANY_NAME, STORE_NAME } from "@/lib/config";
import { getProducts } from "@/lib/data";
import { useAsync } from "@/lib/useAsync";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";
import { useAuth, useLang } from "@/providers/Providers";
import { isValidNepalMobile } from "@/shared/format";

function ProfileForm({ userId, email }: { userId: string; email: string }) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setName(data?.full_name ?? "");
        setPhone(data?.phone ?? "");
      });
  }, [userId]);

  async function save() {
    setMsg(null);
    if (phone && !isValidNepalMobile(phone)) return setMsg({ ok: false, text: t("err.invalid_phone") });
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), phone: phone.trim() }).eq("id", userId);
    setBusy(false);
    setMsg(error ? { ok: false, text: t("err.generic") } : { ok: true, text: t("account.saved") });
  }

  return (
    <Card style={{ gap: 14 }}>
      <Muted>{email}</Muted>
      <Field label={t("auth.full_name")} value={name} onChangeText={setName} />
      <Field label={t("auth.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98XXXXXXXX" />
      {msg ? <Muted style={{ color: msg.ok ? colors.ok : colors.brandDark, fontFamily: fonts.medium }}>{msg.text}</Muted> : null}
      <Button title={t("account.save")} onPress={save} loading={busy} />
    </Card>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function MenuRow({ icon, title, sub, onPress, last }: { icon: IconName; title: string; sub: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>{title}</Text>
        <Muted>{sub}</Muted>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.inkMute} />
    </Pressable>
  );
}

function MayLike() {
  const { t } = useLang();
  const { data } = useAsync(() => getProducts({ sort: "new", limit: 8 }), []);
  if (!data || data.length === 0) return null;
  return (
    <View style={{ marginTop: 10 }}>
      <Container style={{ paddingBottom: 8 }}>
        <H2>{t("acct.may_like")}</H2>
      </Container>
      <ProductGrid products={data} />
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useLang();
  const { user, ready, signOut } = useAuth();

  return (
    <TabScreen>
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Container style={{ paddingTop: 20, gap: 14, maxWidth: 720 }}>
        <H1>{t("account.title")}</H1>

        {ready && !user ? (
          <Card style={{ gap: 12 }}>
            <Body>{t("auth.login_sub")}</Body>
            <Button title={t("nav.login")} onPress={() => router.push("/login")} />
            <Button title={t("nav.signup")} variant="outline" onPress={() => router.push("/signup")} />
          </Card>
        ) : null}

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <MenuRow icon="receipt-outline" title={t("acct.orders")} sub={t("acct.orders_sub")} onPress={() => router.push({ pathname: "/orders", params: { view: "active" } })} />
          <MenuRow icon="time-outline" title={t("acct.history")} sub={t("acct.history_sub")} onPress={() => router.push({ pathname: "/orders", params: { view: "history" } })} />
          <MenuRow icon="heart-outline" title={t("acct.favs")} sub={t("acct.favs_sub")} onPress={() => router.navigate("/favorites")} />
          <MenuRow icon="qr-code-outline" title={t("acct.pickup")} sub={t("acct.pickup_sub")} onPress={() => router.push("/pickup")} />
          <MenuRow icon="eye-outline" title={t("acct.recent")} sub={t("acct.recent_sub")} onPress={() => router.push("/recent")} />
          <MenuRow icon="chatbubbles-outline" title={t("acct.support")} sub={t("acct.support_sub")} onPress={() => router.push("/support")} last />
        </Card>

        {user ? (
          <>
            <H2 style={{ marginTop: 6 }}>{t("acct.details")}</H2>
            <ProfileForm userId={user.id} email={user.email ?? ""} />
            <Button title={t("nav.logout")} variant="outline" onPress={() => void signOut()} />
          </>
        ) : null}

        <View style={{ marginTop: 18, gap: 4 }}>
          <Muted>{t("brand.of", { company: COMPANY_NAME })}</Muted>
          <Muted>
            {STORE_NAME} · {t("brand.tagline")}
          </Muted>
          <Muted>{API_URL}</Muted>
        </View>
      </Container>
      <MayLike />
    </ScrollView>
    </TabScreen>
  );
}
