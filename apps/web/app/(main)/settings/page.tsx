import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { ChatPlatform } from "@westride/db";
import { getPendingChatLinkCode, listChatConnections } from "@westride/db/chat";
import { getDiscordConfig, getSlackConfig, getWhatsAppConfig } from "@/lib/chat/config";
import type { ChatFlowOutcome } from "@/lib/chat/oauth-routes";
import { isGithubAppConfigured } from "@/lib/github/config";
import type { GithubFlowOutcome } from "@/lib/github/flow";
import { getMetaConnectionSummary, isMetaConnectionConfigured } from "@/lib/meta/connection";
import {
  getVercelConnectionSummary,
  isVercelConnectionConfigured,
} from "@/lib/vercel/connection";
import { AccountTabs } from "../section-tabs";
import { ConnectionGroup, ConnectionRow, type ConnectionStatus } from "./connection-list";
import {
  DiscordPanel,
  GithubPanel,
  githubNeedsReconnect,
  loadGithubState,
  MetaPanel,
  SlackPanel,
  VercelPanel,
  WhatsAppPanel,
  type GithubState,
} from "./connection-sections";

export const metadata: Metadata = {
  title: "Connections",
};

const OUTCOMES: Record<
  GithubFlowOutcome,
  { status: "success" | "info" | "warning" | "error"; title: string; description?: string }
> = {
  connected: {
    status: "success",
    title: "GitHub is connected",
    description:
      "If you were creating an idea in another tab, go back to it and import again.",
  },
  requested: {
    status: "info",
    title: "Waiting for an organization owner",
    description:
      "GitHub asked an owner to approve WeStride. Its repositories appear here once they do.",
  },
  denied: {
    status: "warning",
    title: "GitHub was not connected",
    description: "The request was cancelled on GitHub.",
  },
  expired: {
    status: "warning",
    title: "That GitHub sign-in expired",
    description: "Start again from this page.",
  },
  failed: {
    status: "error",
    title: "GitHub could not be connected",
    description: "Try again in a moment.",
  },
  unavailable: {
    status: "error",
    title: "GitHub is not set up on WeStride yet",
  },
};

function isOutcome(value: unknown): value is GithubFlowOutcome {
  return typeof value === "string" && value in OUTCOMES;
}

type Outcome = (typeof OUTCOMES)[GithubFlowOutcome];

function chatOutcome(name: string, value: unknown): Outcome | null {
  const outcomes: Record<ChatFlowOutcome, Outcome> = {
    connected: { status: "success", title: `${name} is connected` },
    denied: {
      status: "warning",
      title: `${name} was not connected`,
      description: `The request was cancelled on ${name}.`,
    },
    expired: {
      status: "warning",
      title: `That ${name} sign-in expired`,
      description: "Start again from this page.",
    },
    failed: {
      status: "error",
      title: `${name} could not be connected`,
      description: "Try again in a moment.",
    },
    unavailable: { status: "error", title: `${name} is not set up on WeStride yet` },
  };
  return typeof value === "string" && value in outcomes
    ? outcomes[value as ChatFlowOutcome]
    : null;
}

const CONNECTED: ConnectionStatus = { variant: "success", label: "Connected" };
const NOT_CONNECTED: ConnectionStatus = { variant: "neutral", label: "Not connected" };
const UNAVAILABLE: ConnectionStatus = { variant: "neutral", label: "Not available" };

function needsAttention(label: string): ConnectionStatus {
  return { variant: "warning", label };
}

function githubStatus(configured: boolean, state: GithubState | null): ConnectionStatus {
  if (!configured) {
    return UNAVAILABLE;
  }
  if (!state) {
    return NOT_CONNECTED;
  }
  if (githubNeedsReconnect(state)) {
    return needsAttention("Reconnect");
  }
  if (state.access && state.access.installations.length === 0) {
    return needsAttention("Choose repositories");
  }
  return CONNECTED;
}

function accountStatus(configured: boolean, isConnected: boolean): ConnectionStatus {
  return !configured ? UNAVAILABLE : isConnected ? CONNECTED : NOT_CONNECTED;
}

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    github?: string | string[];
    slack?: string | string[];
    discord?: string | string[];
  }>;
}) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/settings" });
  }
  const { github, slack, discord } = await searchParams;
  const githubOutcome = isOutcome(github) ? OUTCOMES[github] : null;
  const slackOutcome = chatOutcome("Slack", slack);
  const discordOutcome = chatOutcome("Discord", discord);
  const outcome = githubOutcome ?? slackOutcome ?? discordOutcome;

  const githubConfigured = isGithubAppConfigured();
  const metaConfigured = isMetaConnectionConfigured();
  const vercelConfigured = isVercelConnectionConfigured();
  const slackConfigured = getSlackConfig() !== null;
  const discordConfigured = getDiscordConfig() !== null;
  const whatsapp = getWhatsAppConfig();

  const [githubState, meta, vercel, chatConnections, whatsappPending] = await Promise.all([
    githubConfigured ? loadGithubState(userId) : null,
    metaConfigured ? getMetaConnectionSummary(userId) : null,
    vercelConfigured ? getVercelConnectionSummary(userId) : null,
    listChatConnections(userId),
    whatsapp ? getPendingChatLinkCode(userId, "WHATSAPP") : null,
  ]);
  const chatAccount = (platform: ChatPlatform) =>
    chatConnections.find((connection) => connection.platform === platform) ?? null;
  const slackAccount = chatAccount("SLACK");
  const discordAccount = chatAccount("DISCORD");
  const whatsappAccount = chatAccount("WHATSAPP");

  const statuses = {
    github: githubStatus(githubConfigured, githubState),
    meta: accountStatus(metaConfigured, meta !== null),
    vercel:
      vercelConfigured && vercel && !vercel.scope
        ? needsAttention("Choose a team")
        : accountStatus(vercelConfigured, vercel !== null),
    slack: accountStatus(slackConfigured, slackAccount !== null),
    discord: accountStatus(discordConfigured, discordAccount !== null),
    whatsapp:
      whatsapp && !whatsappAccount && whatsappPending
        ? ({ variant: "accent", label: "Waiting for your message" } as const)
        : accountStatus(whatsapp !== null, whatsappAccount !== null),
  };
  const returnedFrom = githubOutcome
    ? "github"
    : slackOutcome
      ? "slack"
      : discordOutcome
        ? "discord"
        : null;
  const defaultOpen = Object.entries(statuses)
    .filter(([key, status]) => key === returnedFrom || status.variant === "warning" || status.variant === "accent")
    .map(([key]) => key);

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <AccountTabs />
            <VStack gap={2}>
              <Heading level={1}>Connections</Heading>
              <Text type="supporting">
                Link the accounts WeStride works with. Each one is optional, and you can
                disconnect it at any time.
              </Text>
            </VStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {outcome ? (
              <Banner
                status={outcome.status}
                title={outcome.title}
                description={outcome.description}
                isDismissable={outcome.status === "success" || outcome.status === "info"}
              />
            ) : null}

            <ConnectionGroup
              title="Code"
              description="Start ideas and projects from repositories you already have."
              defaultOpen={defaultOpen}
            >
              <ConnectionRow
                value="github"
                name="GitHub"
                purpose="Choose which repositories WeStride can reach."
                logo="/logos/github.svg"
                status={statuses.github}
              >
                <GithubPanel configured={githubConfigured} state={githubState} />
              </ConnectionRow>
            </ConnectionGroup>

            <ConnectionGroup
              title="AI and compute"
              description={
                <>
                  Bring your own Meta and Vercel accounts and WeStride is free; you pay them
                  directly. No accounts?{" "}
                  <Link href="/cloud" type="inherit">
                    WeStride Cloud
                  </Link>{" "}
                  runs Muse and
                  sandboxes for you from a prepaid balance.
                </>
              }
              defaultOpen={defaultOpen}
            >
              <ConnectionRow
                value="meta"
                name="Meta"
                purpose="Run Muse advisors, like the Idea Factory, on your Meta Model API account."
                logo="/logos/meta.svg"
                status={statuses.meta}
              >
                <MetaPanel configured={metaConfigured} connection={meta} />
              </ConnectionRow>
              <ConnectionRow
                value="vercel"
                name="Vercel"
                purpose="Run Muse Code agents in sandboxes on your Vercel account."
                logo="/logos/vercel-mark.svg"
                status={statuses.vercel}
              >
                <VercelPanel configured={vercelConfigured} connection={vercel} />
              </ConnectionRow>
            </ConnectionGroup>

            <ConnectionGroup
              title="Chat apps"
              description="Talk to WeStride from the chat apps you already use. For now you can browse the Academy tracks; more is on the way."
              defaultOpen={defaultOpen}
            >
              <ConnectionRow
                value="slack"
                name="Slack"
                purpose="Use /westride in your Slack workspaces."
                logo="/logos/slack-mark.svg"
                status={statuses.slack}
              >
                <SlackPanel configured={slackConfigured} account={slackAccount} />
              </ConnectionRow>
              <ConnectionRow
                value="discord"
                name="Discord"
                purpose="Use /westride in any server or direct message."
                logo="/logos/discord.svg"
                status={statuses.discord}
              >
                <DiscordPanel configured={discordConfigured} account={discordAccount} />
              </ConnectionRow>
              <ConnectionRow
                value="whatsapp"
                name="WhatsApp"
                purpose="Message WeStride from your phone."
                logo="/logos/whatsapp.svg"
                status={statuses.whatsapp}
              >
                <WhatsAppPanel
                  phoneNumber={whatsapp?.phoneNumber ?? null}
                  account={whatsappAccount}
                  pending={whatsappPending}
                />
              </ConnectionRow>
            </ConnectionGroup>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
