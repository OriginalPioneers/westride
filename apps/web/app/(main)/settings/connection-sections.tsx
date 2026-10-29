import type { ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { ChatConnection, ChatPlatform } from "@westride/db";
import { getPendingChatLinkCode, listChatConnections } from "@westride/db/chat";
import { getDiscordConfig, getSlackConfig, getWhatsAppConfig } from "@/lib/chat/config";
import { whatsappLinkUrl } from "@/lib/chat/whatsapp";
import { deviceClientId } from "@/lib/idea-factory/muse";
import {
  getMetaConnectionSummary,
  isMetaConnectionConfigured,
} from "@/lib/meta/connection";
import { DisconnectChatButton } from "./disconnect-chat-button";
import { MetaSettings } from "./meta-settings";
import { WhatsAppLink } from "./whatsapp-link";

export async function MetaSection({ userId }: { userId: string }) {
  if (!isMetaConnectionConfigured()) {
    return (
      <Text type="supporting">Connecting Meta is not set up on this WeStride server yet.</Text>
    );
  }
  const connection = await getMetaConnectionSummary(userId);
  return (
    <MetaSettings
      connection={connection}
      canConnectMetaAccount={deviceClientId() !== null}
    />
  );
}

function ConnectedAccount({
  connection,
  description,
  usage,
}: {
  connection: ChatConnection;
  description: string;
  usage: ReactNode;
}) {
  return (
    <VStack gap={3}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={0}>
            <Text>{connection.displayName}</Text>
            <Text type="supporting">{description}</Text>
          </VStack>
        </StackItem>
        <DisconnectChatButton platform={connection.platform} />
      </HStack>
      <Text type="supporting">{usage}</Text>
    </VStack>
  );
}

function PlatformBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <VStack gap={3}>
      <Heading level={3}>{title}</Heading>
      {children}
    </VStack>
  );
}

function notSetUp(name: string) {
  return <Text type="supporting">{`${name} is not set up on this WeStride server yet.`}</Text>;
}

export async function ChatSection({ userId }: { userId: string }) {
  const slack = getSlackConfig();
  const discord = getDiscordConfig();
  const whatsapp = getWhatsAppConfig();

  const [connections, pendingCode] = await Promise.all([
    listChatConnections(userId),
    whatsapp ? getPendingChatLinkCode(userId, "WHATSAPP") : Promise.resolve(null),
  ]);
  const linked = (platform: ChatPlatform) =>
    connections.find((connection) => connection.platform === platform) ?? null;
  const slackAccount = linked("SLACK");
  const discordAccount = linked("DISCORD");
  const whatsappAccount = linked("WHATSAPP");
  const whatsappNumber = whatsapp ? `+${whatsapp.phoneNumber}` : "";

  return (
    <VStack gap={6}>
      <PlatformBlock title="Slack">
        {!slack ? (
          notSetUp("Slack")
        ) : slackAccount ? (
          <ConnectedAccount
            connection={slackAccount}
            description={
              slackAccount.workspaceName
                ? `Slack account in ${slackAccount.workspaceName}`
                : "Slack account"
            }
            usage={
              <>
                Type <Code size="inherit">/westride tracks</Code> in any workspace
                where the WeStride app is installed.
              </>
            }
          />
        ) : (
          <HStack>
            <Button
              label="Connect Slack"
              variant="primary"
              href="/integrations/slack/connect"
            />
          </HStack>
        )}
      </PlatformBlock>

      <PlatformBlock title="Discord">
        {!discord ? (
          notSetUp("Discord")
        ) : discordAccount ? (
          <ConnectedAccount
            connection={discordAccount}
            description="Discord account"
            usage={
              <>
                Type <Code size="inherit">/westride tracks</Code> in any server or
                direct message.
              </>
            }
          />
        ) : (
          <VStack gap={2}>
            <HStack>
              <Button
                label="Connect Discord"
                variant="primary"
                href="/integrations/discord/connect"
              />
            </HStack>
            <Text type="supporting">
              Connecting also adds the WeStride app to your Discord account, so
              its commands work wherever you are.
            </Text>
          </VStack>
        )}
      </PlatformBlock>

      <PlatformBlock title="WhatsApp">
        {!whatsapp ? (
          notSetUp("WhatsApp")
        ) : whatsappAccount ? (
          <ConnectedAccount
            connection={whatsappAccount}
            description={`+${whatsappAccount.externalId}`}
            usage={
              <>
                Send <Code size="inherit">tracks</Code> to WeStride at{" "}
                {whatsappNumber}.
              </>
            }
          />
        ) : (
          <WhatsAppLink
            displayNumber={whatsappNumber}
            pending={
              pendingCode
                ? {
                    code: pendingCode.code,
                    url: whatsappLinkUrl(whatsapp.phoneNumber, pendingCode.code),
                    expiresAt: pendingCode.expiresAt.toISOString(),
                  }
                : null
            }
          />
        )}
      </PlatformBlock>
    </VStack>
  );
}
