import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Text, View, useWindowDimensions } from "react-native";
import { Button } from "@/components/ui";
import { API_URL, STORE_NAME, offer } from "@/lib/config";
import { colors, fonts } from "@/lib/theme";
import { useLang } from "@/providers/Providers";
import { pickLang } from "@/shared/format";

/** Round marigold sticker with the offer, gently rotating. */
function OfferSticker({ size }: { size: number }) {
  const { lang, t } = useLang();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const title = pickLang(lang, offer.title.en, offer.title.ne);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${title}: ${offer.percent}% ${t("offer.off")}`}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.marigold,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: colors.night,
          transform: [{ rotate }],
        }}
      />
      <View
        style={{
          width: size * 0.74,
          height: size * 0.74,
          borderRadius: size,
          backgroundColor: colors.night,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.displayXL, fontSize: size * 0.27, color: colors.white, lineHeight: size * 0.3 }}>
          {offer.percent}%
        </Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.11, color: colors.marigold, letterSpacing: 0.6 }}>{t("offer.off")}</Text>
      </View>
    </View>
  );
}

const PHOTO_NAMES = ["hero-model.jpg", "hero-model.jpeg", "hero-model.webp", "hero-model.png"];

export default function Hero() {
  const router = useRouter();
  const { t } = useLang();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [photoIdx, setPhotoIdx] = useState(0);
  const photo = photoIdx < PHOTO_NAMES.length ? `${API_URL}/images/${PHOTO_NAMES[photoIdx]}` : null;

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fade]);

  const archW = wide ? 340 : Math.min(width - 90, 300);
  const archH = archW * 1.25;

  return (
    <View style={{ backgroundColor: colors.night, overflow: "hidden" }}>
      <View
        pointerEvents="none"
        style={{ position: "absolute", right: -80, top: -40, width: 340, height: 340, borderRadius: 170, backgroundColor: colors.brand, opacity: 0.28 }}
      />
      <Animated.View
        style={{
          opacity: fade,
          width: "100%",
          maxWidth: 1100,
          alignSelf: "center",
          paddingHorizontal: 20,
          paddingTop: 28,
          paddingBottom: 40,
          flexDirection: wide ? "row" : "column",
          alignItems: "center",
          gap: wide ? 40 : 28,
        }}
      >
        <View style={{ flex: wide ? 1 : undefined, alignItems: wide ? "flex-start" : "center", gap: 16 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: fonts.displayXL,
              fontSize: wide ? 52 : 38,
              lineHeight: wide ? 56 : 42,
              color: colors.white,
              textAlign: wide ? "left" : "center",
            }}
          >
            {t("home.hero_title")}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: "rgba(255,255,255,.78)", textAlign: wide ? "left" : "center", maxWidth: 440 }}>
            {t("home.hero_sub")}
          </Text>
          <Button title={t("home.hero_cta")} variant="marigold" onPress={() => router.push("/shop")} style={{ marginTop: 6, paddingHorizontal: 34 }} />
        </View>

        <View style={{ width: archW, height: archH }}>
          <View
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              width: archW,
              height: archH,
              borderTopLeftRadius: archW / 2,
              borderTopRightRadius: archW / 2,
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              borderWidth: 2,
              borderColor: "rgba(255,178,36,.6)",
            }}
          />
          <View
            style={{
              width: archW,
              height: archH,
              borderTopLeftRadius: archW / 2,
              borderTopRightRadius: archW / 2,
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              overflow: "hidden",
              backgroundColor: colors.brandDark,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {photo ? (
              <Image
                source={{ uri: photo }}
                resizeMode="cover"
                onError={() => setPhotoIdx((i) => i + 1)}
                style={{ position: "absolute", width: "100%", height: "100%" }}
              />
            ) : (
              <Text style={{ fontFamily: fonts.displayXL, fontSize: 30, color: "rgba(255,255,255,.9)", textAlign: "center", paddingHorizontal: 16 }}>
                {STORE_NAME}
              </Text>
            )}
          </View>
          {offer.active ? (
            <View style={{ position: "absolute", left: -10, bottom: 34 }}>
              <OfferSticker size={wide ? 128 : 104} />
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
