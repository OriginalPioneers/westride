import { useAuth, useClerk, useUser } from "@clerk/expo";
import { WestrideApiError } from "@westride/api-client";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { BrandStampRow } from "@/components/brand-mark";
import { Button } from "@/components/button";
import { ErrorState, LoadingState } from "@/components/request-state";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { API_BASE_URL } from "@/lib/api";
import { useApi } from "@/lib/api-context";
import { useRequest } from "@/lib/use-request";
import { colors, radius, spacing } from "@/theme";

export default function YouScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
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
        <BrandStampRow />
      </View>

      <View style={styles.card}>
        <Text variant="heading">This app</Text>
        <Text variant="supporting">
          Signed in with Clerk, the same account as westride.org. Ideas, builds,
          and agents come from {API_BASE_URL.replace(/^https?:\/\//, "")}.
        </Text>
        {isLoading ? (
          <LoadingState />
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

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: spacing(4),
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderColor: colors.border,
    borderRadius: radius.container,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing(2),
    padding: spacing(4),
  },
});
