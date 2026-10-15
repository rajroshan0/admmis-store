import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { TopBar } from "@/components/Header";
import { Body, Button, Card, Container, Field, H1, Muted } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";
import { useLang } from "@/providers/Providers";

/** Reset inside the app: email → code from the email + new password. */
export default function ForgotPassword() {
  const router = useRouter();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    if (!email.trim()) return setError(t("auth.bad_credentials"));
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (err) return setError(`${t("err.generic")} (${err.message})`);
      setSent(true);
    } catch {
      setError(t("err.network"));
    } finally {
      setBusy(false);
    }
  }

  async function saveNew() {
    setError(null);
    if (password.length < 8) return setError(t("auth.weak_password"));
    if (code.trim().length < 6) return setError(t("auth.reset_code_bad"));
    setBusy(true);
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
      if (vErr) return setError(t("auth.reset_code_bad"));
      const { error: uErr } = await supabase.auth.updateUser({ password });
      if (uErr) return setError(uErr.message.toLowerCase().includes("password") ? t("auth.weak_password") : t("err.generic"));
      setDone(true);
    } catch {
      setError(t("err.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 24, paddingBottom: 60 }}>
          <Container style={{ maxWidth: 520, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <H1>{done ? t("auth.reset_done") : t("auth.forgot_title")}</H1>
              {!done ? <Muted>{sent ? t("auth.reset_code_sent", { email: email.trim() }) : t("auth.forgot_sub")}</Muted> : null}
            </View>
            {done ? (
              <Button title={t("nav.account")} onPress={() => router.replace("/account")} />
            ) : (
              <Card style={{ gap: 14 }}>
                <Field
                  label={t("auth.email")}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!sent}
                />
                {sent ? (
                  <>
                    <Field label={t("auth.reset_code")} value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} />
                    <Field
                      label={t("auth.new_password")}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                      onSubmitEditing={saveNew}
                    />
                    <Muted>{t("auth.password_hint")}</Muted>
                  </>
                ) : null}
                {error ? (
                  <View accessibilityRole="alert">
                    <Body style={{ color: colors.brandDark, fontFamily: fonts.medium, fontSize: 14 }}>{error}</Body>
                  </View>
                ) : null}
                <Button title={sent ? t("auth.reset_btn") : t("auth.send_link")} onPress={sent ? saveNew : sendCode} loading={busy} />
                {sent ? <Button title={t("auth.send_link")} variant="ghost" onPress={sendCode} disabled={busy} /> : null}
              </Card>
            )}
            <Button title={t("auth.back_to_login")} variant="ghost" onPress={() => router.replace("/login")} />
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
