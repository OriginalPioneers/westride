import { useAuth, useClerk, useUser } from "@clerk/expo";
import { WestrideApiError } from "@westride/api-client";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/button";
import { ErrorState, LoadingState } from "@/components/request-state";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { API_BASE_URL } from "@/lib/api";
import { useApi } from "@/lib/api-context";
import { useRequest } from "@/lib/use-request";
import { useColors, useTheme, type ThemeMode } from "@/lib/theme-preference";
import { radius, spacing, type Palette } from "@/theme";

const APPEARANCE: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function YouScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const colors = useColors();
  const { mode, setMode } = useTheme();
  const api = useApi();
  const load = useCallback(
    (signal: AbortSignal) => api.getMe({ signal }),
    [api],
  );
  const { data: me, error, isLoading, refresh } = useRequest(load);

  if (!isSignedIn || !user) {
    return <LoadingState />;
  }

  const apiError =
    error instanceof WestrideApiError ? error : error ? new Error(error.message) : undefined;

  return (
    <Screen>
      <View style={styles.hero}>
        <Avatar
          imageUrl={user.imageUrl}
          name={user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "You"}
          size={72}
        />
        <Text variant="title">
          {user.fullName ?? user.username ?? "WeStride member"}
        </Text>
        {user.username ? <Text variant="supporting">@{user.username}</Text> : null}
        <Text variant="supporting">{user.primaryEmailAddress?.emailAddress}</Text>
        <BrandMark size={56} />
      </View>

      <View style={[styles.card, cardStyle(colors)]}>
        <Text variant="heading">Appearance</Text>
        <Text variant="supporting">Light, dark, or match this device.</Text>
        <Segmented options={APPEARANCE} value={mode} onChange={setMode} />
      </View>

      <View style={[styles.card, cardStyle(colors)]}>
        <Text variant="heading">This app</Text>
        <Text variant="supporting">
          Signed in with Clerk, the same account as westride.org. Ideas, builds,
          and agents come from {API_BASE_URL.replace(/^https?:\/\//, "")}.
        </Text>
        {isLoading ? (
          <LoadingState compact />
        ) : me ? (
          <Text variant="label">
            API sees you as {me.name}
            {me.username ? ` (@${me.username})` : ""}.
          </Text>
        ) : (
          <ErrorState
            title="API is not reachable"
            message={apiError?.message ?? "Sign-in worked, but the WeStride API did not."}
            actionLabel="Try again"
            onAction={refresh}
          />
        )}
      </View>

      <Button label="Sign out" onPress={() => void signOut()} variant="secondary" />
    </Screen>
  );
}

function cardStyle(colors: Palette) {
  return {
    backgroundColor: colors.backgroundCard,
    borderColor: colors.border,
  };
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: spacing(4),
  },
  card: {
    borderRadius: radius.container,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing(2),
    padding: spacing(4),
  },
});
