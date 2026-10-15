import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { TopBar } from "@/components/Header";
import { Body, Button } from "@/components/ui";
import { payResultFromUrl, type PayResult } from "@/lib/payRedirect";
import { colors, fonts } from "@/lib/theme";
import { useLang } from "@/providers/Providers";

interface EsewaPayload {
  formUrl: string;
  fields: Record<string, string>;
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A tiny page that posts the signed payment form to eSewa as soon as it opens. */
function buildHtml(p: EsewaPayload): string {
  const inputs = Object.entries(p.fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(String(v))}">`)
    .join("");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#1a1740">
<form id="f" method="POST" action="${esc(p.formUrl)}">${inputs}</form>
<p>Opening eSewa…</p>
<script>document.getElementById("f").submit();</script></body></html>`;
}

/**
 * eSewa payment screen. eSewa sends the customer back to the website (…/api/payments/esewa/success), which checks
 * the payment and marks the order paid, then redirects to /orders/…. We let that happen, then close this screen
 * as soon as we see the redirect and show the order.
 */
export default function PayScreen() {
  const router = useRouter();
  const { t } = useLang();
  const params = useLocalSearchParams<{ orderId: string; payload: string }>();
  const orderId = String(params.orderId ?? "");
  const payload = useMemo<EsewaPayload | null>(() => {
    try {
      return JSON.parse(String(params.payload)) as EsewaPayload;
    } catch {
      return null;
    }
  }, [params.payload]);

  const [loading, setLoading] = useState(true);
  const done = useRef(false);

  function finish(result: PayResult) {
    if (done.current) return;
    done.current = true;
    const q = result === "paid" ? { paid: "1" } : result === "unknown" ? {} : { payment: result };
    router.replace({ pathname: "/orders/[id]", params: { id: orderId, ...q } });
  }

  /** True when the page just moved to the "payment finished" redirect (and we have closed this screen). */
  function inspect(url: string): boolean {
    const result = payResultFromUrl(url);
    if (!result) return false;
    finish(result);
    return true;
  }

  // Browser testing only (no WebView there): post the form from the page itself.
  useEffect(() => {
    if (Platform.OS !== "web" || !payload) return;
    const doc = (globalThis as unknown as { document?: Document }).document;
    if (!doc) return;
    const form = doc.createElement("form");
    form.method = "POST";
    form.action = payload.formUrl;
    for (const [k, v] of Object.entries(payload.fields)) {
      const i = doc.createElement("input");
      i.type = "hidden";
      i.name = k;
      i.value = String(v);
      form.appendChild(i);
    }
    doc.body.appendChild(form);
    form.submit();
  }, [payload]);

  if (!payload) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <TopBar title={t("pay.title")} />
        <View style={{ padding: 24, gap: 14 }}>
          <Body>{t("err.generic")}</Body>
          <Button title={t("pay.check_order")} onPress={() => finish("unknown")} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <TopBar title={t("pay.title")} />
      <View style={{ flex: 1 }}>
        {Platform.OS !== "web" ? (
          <WebView
            source={{ html: buildHtml(payload), baseUrl: "https://rc-epay.esewa.com.np" }}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            onLoadEnd={() => setLoading(false)}
            onShouldStartLoadWithRequest={(req) => !inspect(req.url)}
            onNavigationStateChange={(nav: WebViewNavigation) => {
              inspect(nav.url);
            }}
            style={{ flex: 1 }}
          />
        ) : null}
        {loading ? (
          <View pointerEvents="none" style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <ActivityIndicator color={colors.brand} />
            <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("pay.opening")}</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => finish("unknown")}
        style={{ padding: 16, alignItems: "center", borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.paper }}
      >
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.brand }}>{t("pay.check_order")}</Text>
      </Pressable>
    </View>
  );
}
