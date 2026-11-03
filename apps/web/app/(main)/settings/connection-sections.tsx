import type { ReactNode } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { ChatConnection, OwnSandboxProvider } from "@westride/db";
import { getGithubConnection } from "@westride/db/github";
import { whatsappLinkUrl } from "@/lib/chat/whatsapp";
import { getGithubAccountAccess, type GithubAccountAccess } from "@/lib/github/repos";
import { deviceClientId } from "@/lib/idea-factory/muse";
import type { MetaConnectionSummary } from "@/lib/meta/connection";
import type { ModalConnectionSummary } from "@/lib/modal/connection";
import { vercelDeviceClientId } from "@/lib/vercel/api";
import type { VercelConnectionSummary } from "@/lib/vercel/connection";
import type { WhatsAppLinkStart } from "./actions";
import { DisconnectChatButton } from "./disconnect-chat-button";
import { DisconnectGithubButton } from "./disconnect-github-button";
import { GithubAccess } from "./github-access";
import { MetaSettings } from "./meta-settings";
import { ModalSettings } from "./modal-settings";
import { SandboxProviderSwitch } from "./sandbox-provider-switch";
import { VercelSettings } from "./vercel-settings";
import { WhatsAppLink } from "./whatsapp-link";

const GITHUB_CONNECT_HREF = "/integrations/github/connect?returnTo=/settings";
const GITHUB_INSTALL_HREF =
  "/integrations/github/connect?intent=install&returnTo=/settings";

function notSetUp(name: string) {
  return <Text type="supporting">{`${name} is not set up on this WeStride server yet.`}</Text>;
}

function Panel({ about, children }: { about?: ReactNode; children: ReactNode }) {
  return (
    <VStack gap={4}>
      {about ? <Text type="supporting">{about}</Text> : null}
      {children}
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

export type GithubState = {
  connection: NonNullable<Awaited<ReturnType<typeof getGithubConnection>>>;
  /** Null when GitHub could not be reached, or no longer accepts the grant. */
  access: GithubAccountAccess | null;
  loadFailed: boolean;
};

export async function loadGithubState(userId: string): Promise<GithubState | null> {
  const connection = await getGithubConnection(userId);
  if (!connection) {
    return null;
  }
  try {
    return { connection, access: await getGithubAccountAccess(userId), loadFailed: false };
  } catch (error) {
    console.error("GitHub access lookup failed", error);
    return { connection, access: null, loadFailed: true };
  }
}

/** GitHub stopped accepting the grant, so the connection was dropped. */
export function githubNeedsReconnect(state: GithubState) {
  return !state.access && !state.loadFailed;
}

export function GithubPanel({
  configured,
  state,
}: {
  configured: boolean;
  state: GithubState | null;
}) {
  if (!configured) {
    return notSetUp("GitHub");
  }
  const about =
    "You choose which repositories WeStride can reach on GitHub, and you can change that at any time. Code WeStride commits for you is committed by the WeStride app, not your account.";

  if (!state) {
    return (
      <Panel about={about}>
        <HStack>
          <Button label="Connect GitHub" variant="primary" href={GITHUB_CONNECT_HREF} />
        </HStack>
      </Panel>
    );
  }

  if (githubNeedsReconnect(state)) {
    return (
      <Panel>
        <Banner
          status="warning"
          title="Reconnect GitHub"
          description="GitHub no longer accepts WeStride's access to your account."
        />
        <HStack>
          <Button label="Connect GitHub" variant="primary" href={GITHUB_CONNECT_HREF} />
        </HStack>
      </Panel>
    );
  }

  const { connection, access } = state;
  return (
    <Panel>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <Avatar
          name={connection.login}
          src={connection.avatarUrl ?? undefined}
          size="md"
          tooltip={false}
        />
        <StackItem size="fill">
          <VStack gap={0}>
            <Text>{connection.login}</Text>
            <Text type="supporting">Connected GitHub account</Text>
          </VStack>
        </StackItem>
        <DisconnectGithubButton />
      </HStack>
      <Divider />
      {access ? (
        <GithubAccess access={access} installHref={GITHUB_INSTALL_HREF} />
      ) : (
        <Banner
          status="error"
          title="GitHub could not be reached"
          description="Your repositories will show here again once it responds."
        />
      )}
      <Text type="supporting">
        Disconnecting removes WeStride&apos;s access to your GitHub account. To remove WeStride
        from an account or organization entirely, uninstall it on GitHub.
      </Text>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Meta, Vercel, and Modal
// ---------------------------------------------------------------------------

export function MetaPanel({
  configured,
  connection,
}: {
  configured: boolean;
  connection: MetaConnectionSummary | null;
}) {
  if (!configured) {
    return notSetUp("Connecting Meta");
  }
  return (
    <Panel about="You pay Meta directly. WeStride keeps the key encrypted and only uses it for requests you make.">
      <MetaSettings connection={connection} canConnectMetaAccount={deviceClientId() !== null} />
    </Panel>
  );
}

export function VercelPanel({
  configured,
  connection,
  activeProvider,
}: {
  configured: boolean;
  connection: VercelConnectionSummary | null;
  /** Which own account hosts sandboxes; set only when both Vercel and Modal are connected. */
  activeProvider: OwnSandboxProvider | null;
}) {
  if (!configured) {
    return notSetUp("Connecting Vercel");
  }
  return (
    <Panel about="Vercel bills you for sandbox time. WeStride keeps the token encrypted and only uses it for runs you or your scheduled agents start.">
      {activeProvider ? <SandboxProviderSwitch thisProvider="VERCEL" active={activeProvider} /> : null}
      <VercelSettings connection={connection} canSignIn={vercelDeviceClientId() !== null} />
    </Panel>
  );
}

export function ModalPanel({
  configured,
  connection,
  activeProvider,
}: {
  configured: boolean;
  connection: ModalConnectionSummary | null;
  /** Which own account hosts sandboxes; set only when both Vercel and Modal are connected. */
  activeProvider: OwnSandboxProvider | null;
}) {
  if (!configured) {
    return notSetUp("Connecting Modal");
  }
  return (
    <Panel about="Modal bills your workspace for sandbox time. WeStride keeps the token encrypted and only uses it for runs you or your scheduled agents start.">
      {activeProvider ? <SandboxProviderSwitch thisProvider="MODAL" active={activeProvider} /> : null}
      <ModalSettings connection={connection} />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

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

export function SlackPanel({
  configured,
  account,
}: {
  configured: boolean;
  account: ChatConnection | null;
}) {
  if (!configured) {
    return notSetUp("Slack");
  }
  if (!account) {
    return (
      <HStack>
        <Button label="Connect Slack" variant="primary" href="/integrations/slack/connect" />
      </HStack>
    );
  }
  return (
    <ConnectedAccount
      connection={account}
      description={
        account.workspaceName ? `Slack account in ${account.workspaceName}` : "Slack account"
      }
      usage={
        <>
          Type <Code size="inherit">/westride tracks</Code> in any workspace where the WeStride
          app is installed.
        </>
      }
    />
  );
}

export function DiscordPanel({
  configured,
  account,
}: {
  configured: boolean;
  account: ChatConnection | null;
}) {
  if (!configured) {
    return notSetUp("Discord");
  }
  if (!account) {
    return (
      <VStack gap={2}>
        <HStack>
          <Button label="Connect Discord" variant="primary" href="/integrations/discord/connect" />
        </HStack>
        <Text type="supporting">
          Connecting also adds the WeStride app to your Discord account, so its commands work
          wherever you are.
        </Text>
      </VStack>
    );
  }
  return (
    <ConnectedAccount
      connection={account}
      description="Discord account"
      usage={
        <>
          Type <Code size="inherit">/westride tracks</Code> in any server or direct message.
        </>
      }
    />
  );
}

export function WhatsAppPanel({
  phoneNumber,
  account,
  pending,
}: {
  /** WeStride's WhatsApp number, without the plus; null when WhatsApp is not set up. */
  phoneNumber: string | null;
  account: ChatConnection | null;
  pending: { code: string; expiresAt: Date } | null;
}) {
  if (!phoneNumber) {
    return notSetUp("WhatsApp");
  }
  const displayNumber = `+${phoneNumber}`;
  if (account) {
    return (
      <ConnectedAccount
        connection={account}
        description={`+${account.externalId}`}
        usage={
          <>
            Send <Code size="inherit">tracks</Code> to WeStride at {displayNumber}.
          </>
        }
      />
    );
  }
  const link: WhatsAppLinkStart | null = pending
    ? {
        code: pending.code,
        url: whatsappLinkUrl(phoneNumber, pending.code),
        expiresAt: pending.expiresAt.toISOString(),
      }
    : null;
  return <WhatsAppLink displayNumber={displayNumber} pending={link} />;
}
