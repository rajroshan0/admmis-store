import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Logo from "@/components/Logo";
import { MAX_WIDTH, colors, fonts } from "@/lib/theme";
import { useCart, useLang } from "@/providers/Providers";

/** English / नेपाली switch. */
export function LangToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang, t } = useLang();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Language"
      onPress={() => setLang(lang === "en" ? "ne" : "en")}
      hitSlop={8}
      style={{
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: light ? "rgba(255,255,255,.4)" : colors.line,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: light ? colors.white : colors.ink }}>
        {lang === "en" ? t("nav.language") : "English"}
      </Text>
    </Pressable>
  );
}

/** Top bar used on every screen: logo, language switch, and a cart shortcut. Handles the phone's notch. */
export function TopBar({ back, title, right }: { back?: boolean; title?: string; right?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  return (
    <View style={{ backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, paddingTop: insets.top }}>
      <View
        style={{
          width: "100%",
          maxWidth: MAX_WIDTH,
          alignSelf: "center",
          minHeight: 56,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            hitSlop={10}
            style={{ marginLeft: -6 }}
          >
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          {title ? (
            <Text numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>
              {title}
            </Text>
          ) : (
            <Logo size={22} />
          )}
        </View>
        {right}
        <LangToggle />
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Cart" onPress={() => router.navigate("/cart")} hitSlop={8}>
            <Ionicons name="bag-outline" size={24} color={colors.ink} />
            {cart.count > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: -6,
                  right: -8,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: colors.brand,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 11, fontFamily: fonts.bold }}>{cart.count}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Wraps a tab screen with the standard top bar. */
export function TabScreen({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar />
      {children}
    </View>
  );
}
