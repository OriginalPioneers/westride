import { useSignUp } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { Link } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark, BrandStampRow } from "@/components/brand-mark";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Text } from "@/components/text";
import { clerkMessage } from "@/lib/clerk-error";
import { brand, colors, spacing } from "@/theme";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startHostedAuth } = useHostedAuth();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hostedBusy, setHostedBusy] = useState(false);

  const busy = fetchStatus === "fetching" || hostedBusy;

  async function handleSignUp() {
    setFormError(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      setFormError(clerkMessage(error, "Could not create the account."));
      return;
    }
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) {
      setFormError(clerkMessage(sent.error, "Could not send a verification code."));
      return;
    }
    setVerifying(true);
  }

  async function handleVerify() {
    setFormError(null);
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      setFormError(clerkMessage(error, "That code did not match."));
      return;
    }
    if (signUp.status === "complete") {
      const result = await signUp.finalize();
      if (result.error) {
        setFormError(clerkMessage(result.error));
      }
    }
  }

  async function handleHosted() {
    setFormError(null);
    setHostedBusy(true);
    try {
      await startHostedAuth({ mode: "sign-up" });
    } catch (error) {
      setFormError(clerkMessage(error, "Could not open the WeStride sign-up page."));
    } finally {
      setHostedBusy(false);
    }
  }

  const fieldError =
    errors.fields.emailAddress?.message ??
    errors.fields.password?.message ??
    errors.fields.code?.message ??
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
            <BrandMark size={72} />
            <Image
              accessibilityLabel="WeStride"
              resizeMode="contain"
              source={require("../../../assets/wordmark-navy.png")}
              style={styles.wordmark}
            />
            <BrandStampRow />
          </View>

          <View style={styles.card}>
            <Text variant="title">{verifying ? "Check your email" : "Create an account"}</Text>
            <Text variant="supporting">
              {verifying
                ? `We sent a code to ${emailAddress}.`
                : "Join WeStride to start ideas, run builds, and work with agents."}
            </Text>
            {verifying ? (
              <Field
                keyboardType="number-pad"
                label="Verification code"
                onChangeText={setCode}
                value={code}
              />
            ) : (
              <>
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
                  autoComplete="new-password"
                  label="Password"
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  value={password}
                />
              </>
            )}
            {formError || fieldError ? (
              <Text style={styles.error}>{formError ?? fieldError}</Text>
            ) : null}
            <Button
              label={verifying ? "Verify and continue" : "Create account"}
              loading={busy}
              onPress={() => void (verifying ? handleVerify() : handleSignUp())}
            />
            {!verifying ? (
              <Button
                label="Continue in browser"
                loading={hostedBusy}
                onPress={() => void handleHosted()}
                variant="secondary"
              />
            ) : null}
            <Link href="/sign-in" asChild>
              <Pressable accessibilityRole="link" style={styles.link}>
                <Text variant="supporting">Already have an account? Sign in</Text>
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
  wordmark: {
    height: 32,
    tintColor: brand.white,
    width: 200,
  },
  card: {
    backgroundColor: colors.backgroundBody,
    borderRadius: 16,
    gap: spacing(3),
    padding: spacing(5),
  },
  error: {
    color: colors.danger,
  },
  link: {
    alignItems: "center",
    paddingVertical: spacing(1),
  },
});
