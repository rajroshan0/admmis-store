import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { MAX_WIDTH, colors, fonts, radius } from "@/lib/theme";

export interface Slide {
  key: string;
  bg: string;
  fg: string;
  accent: string;
  title: string;
  sub: string;
  cta: string;
  onPress: () => void;
  /** Optional photo on the right side. */
  photo?: string | null;
  onPhotoError?: () => void;
  /** Where the subject is across the photo (0 = left edge, 1 = right edge) and the photo's width/height. */
  photoFocusX?: number;
  photoAspect?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Big badge text such as "25%" */
  badge?: string;
  badgeSub?: string;
}


/** Shows a wide photo inside a narrow frame, keeping the chosen point (focusX, 0..1 across the photo) in view. */
function PhotoCrop({ uri, height, focusX, aspect, onError }: { uri: string; height: number; focusX: number; aspect: number; onError?: () => void }) {
  const [w, setW] = useState(0);
  const imgW = height * aspect;
  const left = w ? Math.min(0, Math.max(w - imgW, w / 2 - focusX * imgW)) : 0;
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ position: "absolute", right: 0, top: 0, bottom: 0, left: 0, overflow: "hidden", borderTopLeftRadius: 80, borderBottomLeftRadius: 24 }}
    >
      {w > 0 ? <Image source={{ uri }} resizeMode="cover" onError={onError} style={{ position: "absolute", top: 0, left, width: Math.max(imgW, w), height }} /> : null}
    </View>
  );
}

const GAP = 10;

/** Swipeable promo banners (next one peeks in from the side), auto-advancing, with dots. */
export default function BannerCarousel({ slides }: { slides: Slide[] }) {
  const [W, setW] = useState(0);
  const [idx, setIdx] = useState(0);
  const ref = useRef<ScrollView>(null);
  const idxRef = useRef(0);
  const paused = useRef(false);

  const cw = Math.max(0, W - 44);
  const step = cw + GAP;
  const h = Math.max(150, Math.min(220, cw * 0.46));

  useEffect(() => {
    if (!cw || slides.length < 2) return;
    const id = setInterval(() => {
      if (paused.current) return;
      const next = (idxRef.current + 1) % slides.length;
      ref.current?.scrollTo({ x: next * step, animated: true });
      idxRef.current = next;
      setIdx(next);
    }, 4500);
    return () => clearInterval(id);
  }, [cw, step, slides.length]);

  return (
    <View style={{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {cw > 0 ? (
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: 12, gap: GAP }}
          onScrollBeginDrag={() => (paused.current = true)}
          onMomentumScrollEnd={(e) => {
            paused.current = false;
            const i = Math.round(e.nativeEvent.contentOffset.x / step);
            idxRef.current = i;
            setIdx(i);
          }}
        >
          {slides.map((s) => (
            <Pressable
              key={s.key}
              accessibilityRole="button"
              accessibilityLabel={`${s.title}. ${s.sub}`}
              onPress={s.onPress}
              style={{ width: cw, height: h, borderRadius: radius.lg, overflow: "hidden", backgroundColor: s.bg, flexDirection: "row" }}
            >
              <View style={{ flex: 1.2, padding: 16, justifyContent: "space-between" }}>
                <View style={{ gap: 4 }}>
                  <Text numberOfLines={2} style={{ fontFamily: fonts.displayXL, fontSize: cw < 330 ? 21 : 25, lineHeight: cw < 330 ? 24 : 28, color: s.fg }}>
                    {s.title}
                  </Text>
                  <Text numberOfLines={2} style={{ fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: s.fg, opacity: 0.85 }}>
                    {s.sub}
                  </Text>
                </View>
                <View style={{ alignSelf: "flex-start", backgroundColor: s.accent, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: s.bg === colors.marigold ? colors.night : colors.night }}>{s.cta}</Text>
                </View>
              </View>

              <View style={{ flex: 0.9, alignItems: "center", justifyContent: "center" }}>
                {s.photo ? (
                  <PhotoCrop uri={s.photo} height={h} focusX={s.photoFocusX ?? 0.5} aspect={s.photoAspect ?? 1.78} onError={s.onPhotoError} />
                ) : s.icon ? (
                  <Ionicons name={s.icon} size={Math.min(96, h * 0.55)} color={s.fg} style={{ opacity: 0.9 }} />
                ) : null}
                {s.badge ? (
                  <View
                    style={{
                      position: "absolute",
                      left: -6,
                      bottom: 14,
                      width: 68,
                      height: 68,
                      borderRadius: 34,
                      backgroundColor: colors.marigold,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: colors.night,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.displayXL, fontSize: 20, lineHeight: 22, color: colors.night }}>{s.badge}</Text>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.night }}>{s.badgeSub}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={{ height: 170 }} />
      )}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, paddingTop: 10 }}>
        {slides.map((s, i) => (
          <View key={s.key} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? colors.brand : colors.line }} />
        ))}
      </View>
    </View>
  );
}
