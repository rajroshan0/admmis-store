import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { TopBar } from "@/components/Header";
import { Card, Container, H1, Muted } from "@/components/ui";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from "@/lib/config";
import { colors, fonts } from "@/lib/theme";
import { useLang } from "@/providers/Providers";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export default function SupportScreen() {
  const { t } = useLang();
  const options: { icon: IconName; label: string; sub: string; url: string }[] = [];
  if (SUPPORT_WHATSAPP) options.push({ icon: "logo-whatsapp", label: t("support.whatsapp"), sub: `+${SUPPORT_WHATSAPP}`, url: `https://wa.me/${SUPPORT_WHATSAPP}` });
  if (SUPPORT_PHONE) options.push({ icon: "call-outline", label: t("support.call"), sub: SUPPORT_PHONE, url: `tel:${SUPPORT_PHONE.replace(/\s/g, "")}` });
  if (SUPPORT_EMAIL) options.push({ icon: "mail-outline", label: t("support.email"), sub: SUPPORT_EMAIL, url: `mailto:${SUPPORT_EMAIL}` });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar back title={t("support.title")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Container style={{ paddingTop: 20, gap: 12, maxWidth: 520 }}>
          <H1>{t("support.title")}</H1>
          <Muted>{t("support.sub")}</Muted>
          {options.length === 0 ? <Card><Muted>{t("support.none")}</Muted></Card> : null}
          {options.map((o) => (
            <Pressable key={o.url} accessibilityRole="button" onPress={() => void Linking.openURL(o.url)}>
              <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Ionicons name={o.icon} size={26} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>{o.label}</Text>
                  <Muted>{o.sub}</Muted>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkMute} />
              </Card>
            </Pressable>
          ))}
        </Container>
      </ScrollView>
    </View>
  );
}
