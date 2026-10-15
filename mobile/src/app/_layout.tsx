import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { configProblem } from "@/lib/config";
import { colors } from "@/lib/theme";
import Providers from "@/providers/Providers";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, fontError]);

  if (!loaded && !fontError) return null;

  if (configProblem) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.night, justifyContent: "center", padding: 28 }}>
        <Text style={{ color: colors.marigold, fontSize: 22, fontWeight: "700", marginBottom: 12 }}>Almost there</Text>
        <Text style={{ color: colors.white, fontSize: 16, lineHeight: 24 }}>{configProblem}</Text>
        <Text style={{ color: "rgba(255,255,255,.6)", fontSize: 14, marginTop: 16 }}>
          After saving .env, stop the app (Ctrl+C) and run: npx expo start -c
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Providers>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="pay" options={{ presentation: "modal", gestureEnabled: false }} />
        </Stack>
      </Providers>
    </SafeAreaProvider>
  );
}
