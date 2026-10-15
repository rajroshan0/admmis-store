import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/lib/theme";
import { useCart, useLang } from "@/providers/Providers";

type Icon = keyof typeof Ionicons.glyphMap;

function tabIcon(on: Icon, off: Icon) {
  // eslint-disable-next-line react/display-name
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => <Ionicons name={focused ? on : off} size={27} color={color} />;
}

/** Icon-only bottom bar (labels are still read out by screen readers). */
export default function TabsLayout() {
  const { t } = useLang();
  const cart = useCart();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.inkMute,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopColor: colors.line,
            height: 56 + insets.bottom,
            paddingTop: 8,
            paddingBottom: 4 + insets.bottom,
          },
          tabBarBadgeStyle: { backgroundColor: colors.brand, color: colors.white, fontFamily: fonts.bold, fontSize: 11 },
          sceneStyle: { backgroundColor: colors.paper },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t("nav.home"), tabBarAccessibilityLabel: t("nav.home"), tabBarIcon: tabIcon("home", "home-outline") }} />
        <Tabs.Screen name="shop" options={{ title: t("nav.shop"), tabBarAccessibilityLabel: t("nav.shop"), tabBarIcon: tabIcon("search", "search-outline") }} />
        <Tabs.Screen name="favorites" options={{ title: t("nav.favorites"), tabBarAccessibilityLabel: t("nav.favorites"), tabBarIcon: tabIcon("heart", "heart-outline") }} />
        <Tabs.Screen
          name="cart"
          options={{
            title: t("nav.cart"),
            tabBarAccessibilityLabel: t("nav.cart"),
            tabBarBadge: cart.count > 0 ? cart.count : undefined,
            tabBarIcon: tabIcon("bag", "bag-outline"),
          }}
        />
        <Tabs.Screen name="account" options={{ title: t("nav.account"), tabBarAccessibilityLabel: t("nav.account"), tabBarIcon: tabIcon("person", "person-outline") }} />
      </Tabs>
    </View>
  );
}
