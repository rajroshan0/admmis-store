import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Body, Button, Card, Field, Muted } from "@/components/ui";
import { EMPTY_ADDRESS, addressComplete, saveAddress, type Address } from "@/lib/address";
import { colors, fonts } from "@/lib/theme";
import { useLang } from "@/providers/Providers";
import { isValidNepalMobile } from "@/shared/format";

/** "Deliver to" box shown at the top of the cart. Tap Change to edit; saved on this phone. */
export default function AddressCard({ value, onSaved }: { value: Address; onSaved: () => void }) {
  const { t } = useLang();
  const complete = addressComplete(value);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Address>(EMPTY_ADDRESS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(value), [value]);
  const set = (k: keyof Address) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!addressComplete(form)) return setError(t("err.invalid_shipping"));
    if (!isValidNepalMobile(form.phone)) return setError(t("err.invalid_phone"));
    setError(null);
    await saveAddress({ ...form, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), city: form.city.trim(), district: form.district.trim() });
    setEditing(false);
    onSaved();
  }

  if (editing) {
    return (
      <Card style={{ gap: 12 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>{t("cart.deliver_to")}</Text>
        <Field label={t("checkout.name")} value={form.name} onChangeText={set("name")} autoComplete="name" />
        <Field label={t("checkout.phone")} value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="98XXXXXXXX" />
        <Field label={t("checkout.address")} value={form.address} onChangeText={set("address")} autoComplete="street-address" />
        <Field label={t("checkout.city")} value={form.city} onChangeText={set("city")} />
        <Field label={t("checkout.district")} value={form.district} onChangeText={set("district")} />
        {error ? <Body style={{ color: colors.brandDark, fontSize: 14, fontFamily: fonts.medium }}>{error}</Body> : null}
        <Button title={t("cart.save_address")} onPress={save} />
      </Card>
    );
  }

  return (
    <Pressable accessibilityRole="button" onPress={() => setEditing(true)}>
      <Card style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Ionicons name="location" size={24} color={colors.brand} />
        <View style={{ flex: 1, gap: 2 }}>
          <Muted>{t("cart.deliver_to")}</Muted>
          {complete ? (
            <>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
                {value.name} · {value.phone}
              </Text>
              <Muted>{[value.address, value.city, value.district].filter(Boolean).join(", ")}</Muted>
            </>
          ) : (
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.brand }}>{t("cart.add_address")}</Text>
          )}
        </View>
        {complete ? <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.brand }}>{t("cart.change")}</Text> : <Ionicons name="chevron-forward" size={20} color={colors.inkMute} />}
      </Card>
    </Pressable>
  );
}
