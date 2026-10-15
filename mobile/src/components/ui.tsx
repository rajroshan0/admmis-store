import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useLang } from "@/providers/Providers";
import { MAX_WIDTH, colors, fonts, radius } from "@/lib/theme";

/** Centers content and caps its width so layouts stay tidy on tablets and wide windows. */
export function Container({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: 16 }, style]}>
      {children}
    </View>
  );
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityRole="header" style={[{ fontFamily: fonts.displayXL, fontSize: 28, color: colors.ink }, style]}>
      {children}
    </Text>
  );
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityRole="header" style={[{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, style, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 22 }, style]}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, lineHeight: 19 }, style]}>{children}</Text>;
}

type Variant = "primary" | "marigold" | "outline" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: colors.brand, marigold: colors.marigold, outline: colors.white, ghost: "transparent", danger: colors.white }[variant];
  const fg = { primary: colors.white, marigold: colors.night, outline: colors.ink, ghost: colors.brand, danger: colors.brandDark }[variant];
  const border = variant === "outline" ? colors.line : variant === "danger" ? colors.brand : "transparent";
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderRadius: radius.pill,
          paddingHorizontal: 22,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          opacity: off ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading && <ActivityIndicator color={fg} />}
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.ink }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inkMute}
        {...props}
        style={[
          {
            minHeight: 50,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? colors.brand : colors.line,
            backgroundColor: colors.white,
            paddingHorizontal: 14,
            paddingVertical: props.multiline ? 12 : 0,
            fontFamily: fonts.body,
            fontSize: 16,
            color: colors.ink,
          },
          props.multiline ? { minHeight: 84, textAlignVertical: "top" } : null,
          props.style,
        ]}
      />
      {error ? <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.brandDark }}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Pill({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 40,
        paddingHorizontal: 16,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: selected ? colors.ink : colors.line,
        backgroundColor: selected ? colors.ink : colors.white,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: selected ? colors.white : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  const { t } = useLang();
  return (
    <View style={{ padding: 40, alignItems: "center", gap: 10 }}>
      <ActivityIndicator color={colors.brand} />
      <Muted>{t("common.loading")}</Muted>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { t } = useLang();
  return (
    <View style={{ padding: 32, alignItems: "center", gap: 14 }}>
      <H2 style={{ textAlign: "center" }}>{t("common.offline_title")}</H2>
      <Muted style={{ textAlign: "center" }}>{message ?? t("common.offline_sub")}</Muted>
      <Button title={t("common.retry")} onPress={onRetry} variant="outline" />
    </View>
  );
}

export function Empty({ title, sub, action }: { title: string; sub?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ padding: 36, alignItems: "center", gap: 12 }}>
      <H2 style={{ textAlign: "center" }}>{title}</H2>
      {sub ? <Muted style={{ textAlign: "center" }}>{sub}</Muted> : null}
      {action ? <Button title={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

/** Small back button for screens inside the stack. */
export function BackLink({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="link" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={10}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.brand }}>‹ {label}</Text>
    </Pressable>
  );
}

/** − 1 + quantity control. */
export function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  const btn = (label: string, onPress: () => void, disabled: boolean, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.ink, lineHeight: 24 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {btn("−", () => onChange(Math.max(min, value - 1)), value <= min, "-")}
      <Text style={{ minWidth: 24, textAlign: "center", fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}>{value}</Text>
      {btn("+", () => onChange(Math.min(max, value + 1)), value >= max, "+")}
    </View>
  );
}


/** Label on the left, amount on the right (order summaries). */
export function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
      <Text style={{ fontFamily: big ? fonts.bold : fonts.body, fontSize: big ? 17 : 15, color: big ? colors.ink : colors.inkSoft }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: big ? 20 : 15, color: colors.ink }}>{value}</Text>
    </View>
  );
}
