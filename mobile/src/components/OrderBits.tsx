import { Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";
import { useLang } from "@/providers/Providers";
import type { DictKey } from "@/shared/i18n";
import type { OrderStatus, PaymentStatus } from "@/shared/types";

const STATUS_STYLE: Record<OrderStatus, { bg: string; fg: string }> = {
  pending: { bg: colors.sand, fg: colors.inkSoft },
  confirmed: { bg: "#e8f0fe", fg: "#1e3a8a" },
  processing: { bg: "#fff4dc", fg: "#92520a" },
  shipped: { bg: "#e9e7ff", fg: "#3730a3" },
  delivered: { bg: colors.okLight, fg: colors.ok },
  cancelled: { bg: colors.brandLight, fg: colors.brandDark },
};

const PAY_STYLE: Record<PaymentStatus, { bg: string; fg: string }> = {
  unpaid: { bg: colors.sand, fg: colors.inkSoft },
  paid: { bg: colors.okLight, fg: colors.ok },
  failed: { bg: colors.brandLight, fg: colors.brandDark },
  refunded: { bg: colors.sand, fg: colors.inkSoft },
};

function Chip({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: fg }}>{text}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useLang();
  const s = STATUS_STYLE[status];
  return <Chip text={t(`status.${status}` as DictKey)} bg={s.bg} fg={s.fg} />;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { t } = useLang();
  const s = PAY_STYLE[status];
  return <Chip text={t(`pay.${status}` as DictKey)} bg={s.bg} fg={s.fg} />;
}

const STEPS: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

/** Order progress: received → confirmed → packing → on the way → delivered. */
export function Timeline({ status }: { status: OrderStatus }) {
  const { t } = useLang();
  if (status === "cancelled") {
    return (
      <View style={{ backgroundColor: colors.brandLight, borderRadius: 14, padding: 14 }}>
        <Text style={{ fontFamily: fonts.medium, color: colors.brandDark }}>{t("status.cancelled")}</Text>
      </View>
    );
  }
  const current = STEPS.indexOf(status);
  return (
    <View accessibilityLabel={t("orders.track")} style={{ flexDirection: "row" }}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <View key={step} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? "transparent" : i <= current ? colors.ok : colors.line }} />
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? colors.ok : colors.white,
                  borderWidth: 2,
                  borderColor: done ? colors.ok : colors.line,
                }}
              >
                {done ? <Text style={{ color: colors.white, fontSize: 13, fontFamily: fonts.bold }}>✓</Text> : null}
              </View>
              <View style={{ flex: 1, height: 3, backgroundColor: i === STEPS.length - 1 ? "transparent" : i < current ? colors.ok : colors.line }} />
            </View>
            <Text
              style={{
                marginTop: 6,
                fontFamily: done ? fonts.bold : fonts.body,
                fontSize: 11,
                color: done ? colors.ink : colors.inkMute,
                textAlign: "center",
              }}
            >
              {t(`status.${step}` as DictKey)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
