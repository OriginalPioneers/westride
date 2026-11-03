import { useSignIn } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Text } from "@/components/text";
import { Wordmark } from "@/components/wordmark";
import { clerkMessage } from "@/lib/clerk-error";
import { useColors } from "@/lib/theme-preference";
import { brand, spacing } from "@/theme";

export default function SignInScreen() {
  const colors = useColors();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startHostedAuth } = useHostedAuth();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [hostedBusy, setHostedBusy] = useState(false);

  const busy = fetchStatus === "fetching" || hostedBusy;

  async function handleSignIn() {
    setFormError(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      setFormError(clerkMessage(error, "Check your email and password."));
      return;
    }
    if (signIn.status === "complete") {
      const result = await signIn.finalize();
      if (result.error) {
        setFormError(clerkMessage(result.error));
      }
    }
  }

  async function handleHosted() {
    setFormError(null);
    setHostedBusy(true);
    try {
      await startHostedAuth({ mode: "sign-in" });
    } catch (error) {
      setFormError(clerkMessage(error, "Could not open the WeStride sign-in page."));
    } finally {
      setHostedBusy(false);
    }
  }

  const fieldError =
    errors.fields.identifier?.message ??
    errors.fields.password?.message ??
    errors.global?.[0]?.message;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Wordmark height={40} tone="white" />
            <Text style={styles.tagline}>Stride with AI. Build with community.</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.backgroundBody }]}>
            <Text variant="title">Sign in</Text>
            <Text variant="supporting">
              Your ideas, builds, and agents — the same WeStride you use on the web.
            </Text>
            <Field
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmailAddress}
              textContentType="emailAddress"
              value={emailAddress}
            />
            <Field
              autoComplete="password"
              label="Password"
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              value={password}
            />
            {formError || fieldError ? (
              <Text style={[styles.error, { color: colors.danger }]}>{formError ?? fieldError}</Text>
            ) : null}
            <Button label="Sign in" loading={busy} onPress={() => void handleSignIn()} />
            <Button
              label="Continue in browser"
              loading={hostedBusy}
              onPress={() => void handleHosted()}
              variant="secondary"
            />
            <Link href="/sign-up" asChild>
              <Pressable accessibilityRole="link" style={styles.link}>
                <Text variant="supporting">New here? Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: brand.navy,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing(6),
    justifyContent: "center",
    padding: spacing(5),
    paddingBottom: spacing(8),
  },
  brand: {
    alignItems: "center",
    gap: spacing(3),
  },
  tagline: {
    color: brand.white,
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    gap: spacing(3),
    padding: spacing(5),
  },
  error: {},
  link: {
    alignItems: "center",
    paddingVertical: spacing(1),
  },
});
