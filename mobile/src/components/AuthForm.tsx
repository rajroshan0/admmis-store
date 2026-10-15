import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { TopBar } from "@/components/Header";
import { Body, Button, Card, Container, Field, H1, Muted } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/providers/Providers";
import { isValidNepalMobile } from "@/shared/format";
import type { DictKey } from "@/shared/i18n";

/** Only allow in-app paths as the "go here afterwards" target. */
function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { t } = useLang();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(params.next);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const signup = mode === "signup";

  async function submit() {
    setError(null);
    if (!email.trim() || !password) return setError(t("auth.bad_credentials"));
    if (signup) {
      if (fullName.trim().length < 2) return setError(t("err.invalid_shipping"));
      if (phone.trim() && !isValidNepalMobile(phone)) return setError(t("auth.invalid_phone"));
      if (password.length < 8) return setError(t("auth.weak_password"));
    }
    setBusy(true);
    try {
      if (!signup) {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) {
          const m = err.message.toLowerCase();
          setError(
            m.includes("confirm")
              ? t("auth.email_not_confirmed")
              : m.includes("invalid")
                ? t("auth.bad_credentials")
                : `${t("err.generic")} (${err.message})`,
          );
          return;
        }
        router.replace(next as never);
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), phone: phone.trim() } },
        });
        if (err) {
          const m = err.message.toLowerCase();
          setError(
            m.includes("registered") || m.includes("already")
              ? t("auth.already_registered")
              : m.includes("password")
                ? t("auth.weak_password")
                : t("err.generic"),
          );
          return;
        }
        // Email confirmation ON: an existing address comes back with no identities. OFF: we get a session straight away.
        if (data.session) router.replace(next as never);
        else if (data.user && data.user.identities?.length === 0) setError(t("auth.already_registered"));
        else setCheckEmail(true);
      }
    } catch (e) {
      setError(`${t("err.network")} (${e instanceof Error ? e.message : "?"})`);
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <TopBar back />
        <Container style={{ paddingTop: 40, gap: 14 }}>
          <H1>{t("auth.check_email")}</H1>
          <Body style={{ color: colors.inkSoft }}>{t("auth.check_email_sub")}</Body>
          <Button title={t("auth.login_btn")} onPress={() => router.replace({ pathname: "/login", params: { next } })} />
        </Container>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <TopBar back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 24, paddingBottom: 60 }}>
          <Container style={{ maxWidth: 520, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <H1>{signup ? t("auth.signup_title") : t("auth.login_title")}</H1>
              <Muted>{signup ? t("auth.signup_sub") : params.next ? t("auth.login_to_continue") : t("auth.login_sub")}</Muted>
            </View>
            <Card style={{ gap: 14 }}>
              {signup ? (
                <>
                  <Field label={t("auth.full_name")} value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" />
                  <Field label={t("auth.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="98XXXXXXXX" />
                </>
              ) : null}
              <Field
                label={t("auth.email")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
              />
              <Field
                label={t("auth.password")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={signup ? "new-password" : "current-password"}
                textContentType={signup ? "newPassword" : "password"}
                onSubmitEditing={submit}
              />
              {signup ? <Muted>{t("auth.password_hint")}</Muted> : null}
              {!signup ? (
                <Pressable accessibilityRole="link" onPress={() => router.push("/forgot-password")} hitSlop={8} style={{ alignSelf: "flex-start" }}>
                  <Body style={{ color: colors.brand, fontFamily: fonts.medium, fontSize: 14 }}>{t("auth.forgot")}</Body>
                </Pressable>
              ) : null}
              {error ? (
                <View accessibilityRole="alert">
                  <Body style={{ color: colors.brandDark, fontFamily: fonts.medium, fontSize: 14 }}>{error}</Body>
                </View>
              ) : null}
              <Button
                title={busy ? t("auth.working") : signup ? t("auth.signup_btn") : t("auth.login_btn")}
                onPress={submit}
                loading={busy}
              />
            </Card>
            <Button
              title={signup ? `${t("auth.have_account")} ${t("nav.login")}` : `${t("auth.no_account")} ${t("nav.signup")}`}
              variant="ghost"
              onPress={() => router.replace({ pathname: signup ? "/login" : "/signup", params: params.next ? { next } : {} })}
            />
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
