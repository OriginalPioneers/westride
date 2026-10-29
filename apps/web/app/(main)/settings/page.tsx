import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { getGithubConnection } from "@westride/db/github";
import { isGithubAppConfigured } from "@/lib/github/config";
import type { GithubFlowOutcome } from "@/lib/github/flow";
import {
  getGithubAccountAccess,
  type GithubAccountAccess,
} from "@/lib/github/repos";
import { DisconnectGithubButton } from "./disconnect-github-button";
import { GithubAccess } from "./github-access";

export const metadata: Metadata = {
  title: "Settings",
};

const CONNECT_HREF = "/integrations/github/connect?returnTo=/settings";
const INSTALL_HREF = "/integrations/github/connect?intent=install&returnTo=/settings";

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

async function GithubSection({ userId }: { userId: string }) {
  if (!isGithubAppConfigured()) {
    return (
      <Text type="supporting">
        GitHub is not set up on this WeStride server yet.
      </Text>
    );
  }

  const connection = await getGithubConnection(userId);
  if (!connection) {
    return (
      <HStack>
        <Button label="Connect GitHub" variant="primary" href={CONNECT_HREF} />
      </HStack>
    );
  }

  let access: GithubAccountAccess | null = null;
  let loadFailed = false;
  try {
    access = await getGithubAccountAccess(userId);
  } catch (error) {
    console.error("GitHub access lookup failed", error);
    loadFailed = true;
  }

  // GitHub stopped accepting the grant, so the connection was dropped.
  if (!access && !loadFailed) {
    return (
      <VStack gap={4}>
        <Banner
          status="warning"
          title="Reconnect GitHub"
          description="GitHub no longer accepts WeStride's access to your account."
        />
        <HStack>
          <Button label="Connect GitHub" variant="primary" href={CONNECT_HREF} />
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack gap={6}>
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
        <GithubAccess access={access} installHref={INSTALL_HREF} />
      ) : (
        <Banner
          status="error"
          title="GitHub could not be reached"
          description="Your repositories will show here again once it responds."
        />
      )}
      <Text type="supporting">
        Disconnecting removes WeStride&apos;s access to your GitHub account. To
        remove WeStride from an account or organization entirely, uninstall it
        on GitHub.
      </Text>
    </VStack>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string | string[] }>;
}) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/settings" });
  }
  const { github } = await searchParams;
  const outcome = isOutcome(github) ? OUTCOMES[github] : null;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <Heading level={1}>Settings</Heading>
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
            <VStack gap={6}>
              <VStack gap={2}>
                <Heading level={2}>GitHub</Heading>
                <Text type="supporting">
                  Connect GitHub to start ideas from your repositories. You
                  choose which repositories WeStride can reach on GitHub, and
                  you can change that at any time. Code WeStride commits for
                  you is committed by the WeStride app, not your account.
                </Text>
              </VStack>
              <GithubSection userId={userId} />
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
