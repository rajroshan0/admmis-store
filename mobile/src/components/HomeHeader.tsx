import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LangToggle } from "@/components/Header";
import Logo from "@/components/Logo";
import { Container } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import { useAuth, useLang } from "@/providers/Providers";

/** Home top area: logo, language, orders shortcut (with a count of orders still on the way) and the search field. */
export default function HomeHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const active = useAsync(async () => {
    if (!user) return 0;
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "confirmed", "processing", "shipped"]);
    return count ?? 0;
  }, [user?.id]);

  function search() {
    const text = q.trim();
    router.navigate({ pathname: "/shop", params: { q: text, category: "" } });
    setQ("");
  }

  const n = active.data ?? 0;

  return (
    <View style={{ backgroundColor: colors.white, paddingTop: insets.top + 6, paddingBottom: 14 }}>
      <Container style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flexShrink: 1 }}>
            <Logo size={24} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
              <Ionicons name="location-outline" size={13} color={colors.inkSoft} />
              <Text numberOfLines={1} style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft }}>
                {t("home.deliver")}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <LangToggle />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("nav.orders")}
              onPress={() => router.push("/orders")}
              hitSlop={8}
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="receipt-outline" size={26} color={colors.ink} />
              {n > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    right: -2,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: colors.brand,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: 11, fontFamily: fonts.bold }}>{n}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        <View
          style={{
            minHeight: 50,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            backgroundColor: colors.sand,
            borderRadius: radius.md,
          }}
        >
          <Ionicons name="search" size={22} color={colors.inkMute} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder={t("shop.search_placeholder")}
            placeholderTextColor={colors.inkMute}
            accessibilityLabel={t("nav.search")}
            style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink, minHeight: 48 }}
          />
          {q ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t("shop.search_btn")} onPress={search} hitSlop={8}>
              <Ionicons name="arrow-forward-circle" size={28} color={colors.brand} />
            </Pressable>
          ) : null}
        </View>
      </Container>
    </View>
  );
}
