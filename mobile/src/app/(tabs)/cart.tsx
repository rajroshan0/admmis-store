import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { TabScreen } from "@/components/Header";
import { Body, Button, Card, Container, Empty, H1, Muted, Row, Stepper } from "@/components/ui";
import AddressCard from "@/components/AddressCard";
import { ProductImage } from "@/components/ProductCard";
import { addressComplete, useAddress } from "@/lib/address";
import { getSettings } from "@/lib/data";
import { colors, fonts } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useAuth, useCart, useLang } from "@/providers/Providers";
import { shippingFor } from "@/shared/cart";
import { formatNPR, pickLang } from "@/shared/format";

export default function CartScreen() {
  const router = useRouter();
  const { lang, t } = useLang();
  const cart = useCart();
  const { user } = useAuth();
  const settings = useAsync(() => getSettings(), []);
  const addr = useAddress();

  // Check price and stock again every time the cart is opened.
  useFocusEffect(
    useCallback(() => {
      void cart.refresh();
      addr.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const s = settings.data ?? { shipping_fee: 150, free_shipping_over: 5000, cod_enabled: true, esewa_enabled: true };
  const shipping = shippingFor(cart.subtotal, s);
  const total = cart.subtotal + shipping;

  if (cart.ready && cart.lines.length === 0) {
    return (
      <TabScreen>
        <Empty
          title={t("cart.empty")}
          action={{ label: t("cart.continue"), onPress: () => router.navigate("/shop") }}
        />
      </TabScreen>
    );
  }

  return (
    <TabScreen>
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Container style={{ paddingTop: 20, gap: 14 }}>
        <H1>{t("cart.title")}</H1>
        <AddressCard value={addr.address} onSaved={addr.reload} />
        <Muted>{t("cart.items", { n: cart.count })}</Muted>
        {cart.changed ? (
          <View style={{ backgroundColor: colors.marigoldLight, borderRadius: 14, padding: 12 }}>
            <Body style={{ fontSize: 14 }}>{t("cart.updated")}</Body>
          </View>
        ) : null}

        {cart.lines.map((l) => (
          <Card key={l.variantId} style={{ flexDirection: "row", gap: 12, padding: 12 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/product/[slug]", params: { slug: l.slug } })}
              style={{ width: 78, borderRadius: 10, overflow: "hidden" }}
            >
              <ProductImage uri={l.image ?? undefined} />
            </Pressable>
            <View style={{ flex: 1, gap: 6 }}>
              <Text numberOfLines={2} style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.ink }}>
                {pickLang(lang, l.name_en, l.name_ne)}
              </Text>
              <Muted>{[l.size, l.color].filter(Boolean).join(" · ")}</Muted>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>{formatNPR(l.price * l.quantity)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Stepper value={l.quantity} min={1} max={l.maxStock} onChange={(n) => cart.setQty(l.variantId, n)} />
                <Pressable accessibilityRole="button" onPress={() => cart.remove(l.variantId)} hitSlop={8}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.brandDark }}>{t("cart.remove")}</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        ))}

        <Card style={{ gap: 10 }}>
          <Row label={t("cart.subtotal")} value={formatNPR(cart.subtotal)} />
          <Row label={t("cart.shipping")} value={shipping === 0 ? t("cart.free") : formatNPR(shipping)} />
          {shipping > 0 ? (
            <Muted>{t("cart.add_more", { amount: formatNPR(s.free_shipping_over - cart.subtotal) })}</Muted>
          ) : (
            <Muted>{t("cart.free_over", { amount: formatNPR(s.free_shipping_over) })}</Muted>
          )}
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <Row label={t("cart.total")} value={formatNPR(total)} big />
        </Card>

        <Button
          title={t("cart.checkout")}
          disabled={!addressComplete(addr.address)}
          onPress={() => (user ? router.push("/checkout") : router.push({ pathname: "/login", params: { next: "/checkout" } }))}
        />
        {!addressComplete(addr.address) ? <Muted style={{ textAlign: "center" }}>{t("cart.address_missing")}</Muted> : null}
        <Button title={t("cart.continue")} variant="outline" onPress={() => router.navigate("/shop")} />
      </Container>
    </ScrollView>
    </TabScreen>
  );
}
