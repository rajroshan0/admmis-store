import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

/** Slow scrolling strip of shop promises (marigold band, like the website). */
export default function Marquee({ items }: { items: string[] }) {
  const x = useRef(new Animated.Value(0)).current;
  const [rowW, setRowW] = useState(0);

  useEffect(() => {
    if (rowW <= 0) return;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, { toValue: -rowW, duration: Math.max(12000, rowW * 28), easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [rowW, x]);

  const row = (measure: boolean, key: string) => (
    <View
      key={key}
      onLayout={measure ? (e) => setRowW(e.nativeEvent.layout.width) : undefined}
      style={{ flexDirection: "row", alignItems: "center" }}
    >
      {items.map((text, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.night }}>{text}</Text>
          <View style={{ width: 9, height: 9, backgroundColor: colors.night, opacity: 0.7, marginHorizontal: 24, transform: [{ rotate: "45deg" }] }} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ backgroundColor: colors.marigold, overflow: "hidden", paddingVertical: 12 }} accessibilityLabel={items.join(", ")}>
      <Animated.View style={{ flexDirection: "row", transform: [{ translateX: x }], width: 10000 }}>
        {row(true, "a")}
        {row(false, "b")}
        {row(false, "c")}
        {row(false, "d")}
      </Animated.View>
    </View>
  );
}
