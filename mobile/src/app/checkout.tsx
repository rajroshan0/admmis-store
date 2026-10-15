import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { TopBar } from "@/components/Header";
import { Body, Button, Card, Container, Empty, Field, H1, H2, Loading, Muted, Row } from "@/components/ui";
import { ApiError, apiPost } from "@/lib/api";
import { loadAddress, saveAddress } from "@/lib/address";
import { getSettings } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useRequireUser } from "@/lib/useRequireUser";
import { useCart, useLang } from "@/providers/Providers";
import { shippingFor } from "@/shared/cart";
import { formatNPR, isValidNepalMobile } from "@/shared/format";
import type { DictKey } from "@/shared/i18n";
import type { PaymentMethod } from "@/shared/types";

interface EsewaPayload {
  formUrl: string;
  fields: Record<string, string>;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { t } = useLang();
  const cart = useCart();
  const auth = useRequireUser("/checkout");
  const settings = useAsync(() => getSettings(), []);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cod");

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved delivery address (from the cart) wins; profile fills any gaps.
  useEffect(() => {
    void loadAddress().then((a) => {
      setName((v) => v || a.name);
      setPhone((v) => v || a.phone);
      setAddress((v) => v || a.address);
      setCity((v) => v || a.city);
      setDistrict((v) => v || a.district);
    });
  }, []);

  // Prefill from the customer's profile once.
  useEffect(() => {
    if (!auth.user) return;
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", auth.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setName((v) => v || data.full_name || "");
        setPhone((v) => v || data.phone || "");
      });
  }, [auth.user]);

  const s = settings.data ?? { shipping_fee: 150, free_shipping_over: 5000, cod_enabled: true, esewa_enabled: true };
  const methods = useMemo<PaymentMethod[]>(
    () => [...(s.cod_enabled ? (["cod"] as const) : []), ...(s.esewa_enabled ? (["esewa"] as const) : [])],
    [s.cod_enabled, s.esewa_enabled],
  );
  useEffect(() => {
    if (methods.length > 0 && !methods.includes(method)) setMethod(methods[0]);
  }, [methods, method]);

  // A changed cart invalidates a promo we already checked.
  const cartKey = cart.lines.map((l) => `${l.variantId}:${l.quantity}`).join(",");
  useEffect(() => {
    setPromo(null);
    setPromoMsg(null);
  }, [cartKey]);

  const shipping = shippingFor(cart.subtotal, s);
  const discount = promo?.discount ?? 0;
  const total = cart.subtotal - discount + shipping;

  async function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoBusy(true);
    setPromoMsg(null);
    const { data, error: err } = await supabase.rpc("preview_promo", {
      p_code: code,
      p_items: cart.lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
    });
    setPromoBusy(false);
    if (err || !data) {
      setPromo(null);
      return setPromoMsg({ ok: false, text: t("err.generic") });
    }
    const res = data as { ok: boolean; error?: string; min?: number; code?: string; discount?: number };
    if (!res.ok) {
      setPromo(null);
      const key = (res.error?.startsWith("promo_") ? `err.${res.error}` : "err.generic") as DictKey;
      return setPromoMsg({ ok: false, text: t(key, { amount: formatNPR(res.min ?? 0) }) });
    }
    setPromo({ code: res.code ?? code, discount: res.discount ?? 0 });
    setPromoMsg({ ok: true, text: t("checkout.promo_applied", { code: res.code ?? code, amount: formatNPR(res.discount ?? 0) }) });
  }

  function removePromo() {
    setPromo(null);
    setPromoMsg(null);
    setPromoInput("");
  }

  async function placeOrder() {
    setError(null);
    if (!name.trim() || !address.trim() || !city.trim()) return setError(t("err.invalid_shipping"));
    if (!isValidNepalMobile(phone)) return setError(t("err.invalid_phone"));
    if (cart.lines.length === 0) return setError(t("checkout.empty"));

    setBusy(true);
    try {
      const res = await apiPost<{ orderId: string; orderNumber: number; esewa: EsewaPayload | null }>("/api/checkout", {
        items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        shipping: { name, phone, address, city, district, notes },
        paymentMethod: method,
        promo: promo?.code,
      });
      void saveAddress({ name, phone, address, city, district });
      cart.clear();
      if (method === "esewa" && res.esewa) {
        router.replace({ pathname: "/pay", params: { orderId: res.orderId, payload: JSON.stringify(res.esewa) } });
      } else {
        router.replace({ pathname: "/orders/[id]", params: { id: res.orderId, placed: "1" } });
      }
    } catch (e) {
      if (e instanceof ApiError) {
        switch (e.code) {
          case "network":
            return setError(t("err.network"));
          case "out_of_stock":
            return setError(t("err.out_of_stock", { name: String(e.extra?.name ?? "") }));
          case "unavailable":
          case "invalid_cart":
            return setError(t("err.unavailable"));
          case "invalid_phone":
            return setError(t("err.invalid_phone"));
          case "invalid_shipping":
            return setError(t("err.invalid_shipping"));
          case "method_disabled":
            return setError(t("err.method_disabled"));
          case "not_authenticated":
            return router.replace({ pathname: "/login", params: { next: "/checkout" } });
          default:
            if (e.code.startsWith("promo_")) return setError(t(`err.${e.code}` as DictKey, { amount: "" }));
        }
      }
      setError(t("err.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (!auth.ready || !auth.user) return <Shell><Loading /></Shell>;
  if (cart.ready && cart.lines.length === 0) {
    return (
      <Shell>
        <Empty title={t("checkout.empty")} action={{ label: t("cart.continue"), onPress: () => router.replace("/shop") }} />
      </Shell>
    );
  }

  return (
    <Shell>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
          <Container style={{ paddingTop: 20, gap: 16, maxWidth: 720 }}>
            <H1>{t("checkout.title")}</H1>

            <Card style={{ gap: 14 }}>
              <H2 style={{ fontSize: 18 }}>{t("checkout.shipping")}</H2>
              <Field label={t("checkout.name")} value={name} onChangeText={setName} autoComplete="name" />
              <Field label={t("checkout.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98XXXXXXXX" autoComplete="tel" />
              <Field label={t("checkout.address")} value={address} onChangeText={setAddress} autoComplete="street-address" />
              <Field label={t("checkout.city")} value={city} onChangeText={setCity} />
              <Field label={t("checkout.district")} value={district} onChangeText={setDistrict} />
              <Field label={t("checkout.notes")} value={notes} onChangeText={setNotes} multiline />
            </Card>

            <Card style={{ gap: 12 }}>
              <H2 style={{ fontSize: 18 }}>{t("checkout.payment")}</H2>
              {methods.length === 0 ? <Body>{t("checkout.no_methods")}</Body> : null}
              {methods.map((m) => {
                const on = method === m;
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setMethod(m)}
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      alignItems: "center",
                      padding: 14,
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor: on ? colors.brand : colors.line,
                      backgroundColor: on ? colors.brandLight : colors.white,
                    }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? colors.brand : colors.inkMute, alignItems: "center", justifyContent: "center" }}>
                      {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
                        {m === "cod" ? t("checkout.cod") : t("checkout.esewa")}
                      </Text>
                      <Muted>{m === "cod" ? t("checkout.cod_sub") : t("checkout.esewa_sub")}</Muted>
                    </View>
                  </Pressable>
                );
              })}
            </Card>

            <Card style={{ gap: 12 }}>
              <H2 style={{ fontSize: 18 }}>{t("checkout.summary")}</H2>
              {cart.lines.map((l) => (
                <Row key={l.variantId} label={`${l.name_en}${l.size ? ` · ${l.size}` : ""} × ${l.quantity}`} value={formatNPR(l.price * l.quantity)} />
              ))}
              <View style={{ height: 1, backgroundColor: colors.line }} />

              {promo ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <Muted style={{ flex: 1, color: colors.ok, fontFamily: fonts.medium }}>{promoMsg?.text}</Muted>
                  <Button title={t("checkout.promo_remove")} variant="ghost" onPress={removePromo} style={{ minHeight: 36, paddingHorizontal: 8 }} />
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t("checkout.promo")}
                        value={promoInput}
                        onChangeText={(v) => setPromoInput(v.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        onSubmitEditing={applyPromo}
                      />
                    </View>
                    <Button title={t("checkout.promo_apply")} variant="outline" onPress={applyPromo} loading={promoBusy} disabled={!promoInput.trim()} />
                  </View>
                  {promoMsg ? (
                    <Muted style={{ color: promoMsg.ok ? colors.ok : colors.brandDark, fontFamily: fonts.medium }}>{promoMsg.text}</Muted>
                  ) : null}
                </View>
              )}

              <Row label={t("cart.subtotal")} value={formatNPR(cart.subtotal)} />
              {discount > 0 ? <Row label={`${t("checkout.discount")} (${promo?.code})`} value={`−${formatNPR(discount)}`} /> : null}
              <Row label={t("cart.shipping")} value={shipping === 0 ? t("cart.free") : formatNPR(shipping)} />
              <View style={{ height: 1, backgroundColor: colors.line }} />
              <Row label={t("cart.total")} value={formatNPR(total)} big />
            </Card>

            {error ? (
              <View accessibilityRole="alert" style={{ backgroundColor: colors.brandLight, borderRadius: 14, padding: 14 }}>
                <Body style={{ color: colors.brandDark, fontFamily: fonts.medium }}>{error}</Body>
              </View>
            ) : null}

            <Button
              title={
                busy
                  ? t("checkout.placing")
                  : method === "esewa"
                    ? t("checkout.pay_esewa", { amount: formatNPR(total) })
                    : t("checkout.place")
              }
              onPress={placeOrder}
              loading={busy}
              disabled={methods.length === 0}
              variant={method === "esewa" ? "primary" : "marigold"}
            />
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar back title={t("checkout.title")} />
      {children}
    </View>
  );
}
