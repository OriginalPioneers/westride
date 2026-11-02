"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { MetaConnectionSummary } from "@/lib/meta/connection";
import { MetaConnectOptions } from "../../../meta-connect-options";

export function ConnectPanel({
  canConnectMeta,
  canConnectMetaAccount,
  cloudAvailable = false,
  onConnected,
}: {
  canConnectMeta: boolean;
  canConnectMetaAccount: boolean;
  cloudAvailable?: boolean;
  onConnected: (connection: MetaConnectionSummary) => void;
}) {
  return (
    <VStack gap={6} maxWidth={cloudAvailable ? 1100 : 880}>
      <VStack gap={2}>
        <Heading level={2}>Bring your own Muse</Heading>
        <Text>
          The advisory team runs on Meta&apos;s Muse models through your own
          Meta Model API account, so you pay Meta directly and can see every
          request and what it cost. Your Meta connection is kept encrypted on
          your WeStride account and only used for requests you make. Manage it
          any time in Settings.
          {cloudAvailable
            ? " Or skip the Meta account and let WeStride Cloud run it from your WeStride balance."
            : ""}
        </Text>
      </VStack>

      {canConnectMeta ? (
        <MetaConnectOptions
          canConnectMetaAccount={canConnectMetaAccount}
          cloudAvailable={cloudAvailable}
          onConnected={onConnected}
        />
      ) : (
        <Banner
          status="error"
          title="Connecting Meta is not set up on this WeStride server yet"
        />
      )}
    </VStack>
  );
}
