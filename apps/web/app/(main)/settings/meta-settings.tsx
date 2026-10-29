"use client";

import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { MetaConnectionSummary } from "@/lib/meta/connection";
import { disconnectMeta } from "../meta-actions";
import { MetaConnectOptions } from "../meta-connect-options";

export function MetaSettings({
  connection,
  canConnectMetaAccount,
}: {
  connection: MetaConnectionSummary | null;
  canConnectMetaAccount: boolean;
}) {
  const router = useRouter();

  if (!connection) {
    return (
      <MetaConnectOptions
        canConnectMetaAccount={canConnectMetaAccount}
        onConnected={() => router.refresh()}
      />
    );
  }

  return (
    <HStack gap={3} vAlign="center" wrap="wrap">
      <StackItem size="fill">
        <VStack gap={0}>
          <Text>{connection.label}</Text>
          <Text type="supporting">
            {connection.kind === "META_ACCOUNT"
              ? "Signed in with Meta. WeStride renews the key daily."
              : "A Model API key you pasted."}{" "}
            Connected <Timestamp value={connection.connectedAt} format="date" />.
          </Text>
        </VStack>
      </StackItem>
      <Button label="Disconnect" clickAction={() => disconnectMeta()} />
    </HStack>
  );
}
