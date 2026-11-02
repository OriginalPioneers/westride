import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { Pledge } from "@westride/db";
import { countOnlineDevicesForIdea, listDevicesForSupporter } from "@westride/db/devices";
import type { IdeaWithDetails } from "@westride/db/ideas";
import { listPledgesForSupporterOnIdea, summarizeIdeaSupport } from "@westride/db/support";
import { signInPath } from "@/lib/auth-paths";
import { ideaPath } from "@/lib/ideas/filters";
import { getMuseApiKey } from "@/lib/meta/connection";
import { formatMicros, formatSeconds } from "@/lib/support/schema";
import { CapitalLinks } from "./capital-links";
import { PledgeComputeButton, PledgeTokensButton, SupportSettingsButton } from "./support-buttons";

function wantsSupport(idea: IdeaWithDetails) {
  return idea.wantsTokens || idea.wantsCompute || idea.wantsCapital;
}

/** Founders always see the section so they can turn support on. */
export function showsSupportSection(idea: IdeaWithDetails, isFounder: boolean) {
  return isFounder || wantsSupport(idea);
}

/** Opens the founder's editor for what the idea is looking for. */
export function SupportSettings({ idea }: { idea: IdeaWithDetails }) {
  return (
    <SupportSettingsButton
      ideaId={idea.id}
      initial={{
        wantsTokens: idea.wantsTokens,
        wantsCompute: idea.wantsCompute,
        wantsCapital: idea.wantsCapital,
        capitalLinks: idea.capitalLinks.map((link) => ({ url: link.url, label: link.label })),
      }}
    />
  );
}

/**
 * How people who are not on the team can help: pledge tokens, pledge
 * compute, or follow the team's own links to contribute capital. The page
 * supplies the section heading and, for founders, SupportSettings.
 */
export async function SupportSection({
  idea,
  viewerId,
  isFounder,
}: {
  idea: IdeaWithDetails;
  viewerId: string | null;
  isFounder: boolean;
}) {
  const wantsAnything = wantsSupport(idea);
  if (!showsSupportSection(idea, isFounder)) {
    return null;
  }

  const [summary, mine, devices, onlineDevices, museKey] = await Promise.all([
    summarizeIdeaSupport(idea.id),
    viewerId ? listPledgesForSupporterOnIdea(viewerId, idea.id) : Promise.resolve([] as Pledge[]),
    viewerId && idea.wantsCompute ? listDevicesForSupporter(viewerId) : Promise.resolve([]),
    idea.wantsCompute ? countOnlineDevicesForIdea(idea.id) : Promise.resolve(0),
    viewerId && idea.wantsTokens ? getMuseApiKey(viewerId) : Promise.resolve(null),
  ]);
  const tokenPledge = mine.find((pledge) => pledge.kind === "TOKENS") ?? null;
  const computePledge = mine.find((pledge) => pledge.kind === "COMPUTE") ?? null;
  const signInHref = viewerId ? undefined : `${signInPath}?redirect_url=${encodeURIComponent(ideaPath(idea.id))}`;

  const stats: string[] = [];
  if (summary.supporters > 0) stats.push(`${summary.supporters} supporter${summary.supporters === 1 ? "" : "s"}`);
  if (summary.sponsoredMicros > 0) stats.push(`${formatMicros(summary.sponsoredMicros)} in tokens covered`);
  if (summary.computeSeconds > 0) stats.push(`${formatSeconds(summary.computeSeconds)} of compute`);
  if (summary.jobs > 0) stats.push(`${summary.jobs} job${summary.jobs === 1 ? "" : "s"}`);

  return (
    <VStack gap={4}>
      <Text>
        {wantsAnything
          ? "Help the team without joining it. Supporters choose exactly what they give, and can stop any time."
          : "You have not said what help this idea needs yet. Turn on tokens, compute, or capital to invite supporters."}
      </Text>

      {stats.length > 0 ? <Text type="supporting">{stats.join(" · ")}</Text> : null}

      {wantsAnything ? (
        <VStack gap={3}>
          {idea.wantsTokens ? (
            <Card>
              <HStack gap={4} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <VStack gap={1}>
                    <HStack gap={2} vAlign="center">
                      <Heading level={3}>Tokens</Heading>
                      {summary.tokenPledges > 0 ? <Badge variant="blue" label={String(summary.tokenPledges)} /> : null}
                    </HStack>
                    <Text type="supporting">
                      Let the team&apos;s agents run on your Meta API key, up to a monthly or one-time cap you set.
                      The team picks the model; you pick the limit.
                    </Text>
                  </VStack>
                </StackItem>
                <PledgeTokensButton
                  ideaId={idea.id}
                  ideaName={idea.name}
                  existing={tokenPledge}
                  hasMetaKey={museKey !== null}
                  signInHref={signInHref}
                />
              </HStack>
            </Card>
          ) : null}

          {idea.wantsCompute ? (
            <Card>
              <HStack gap={4} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <VStack gap={1}>
                    <HStack gap={2} vAlign="center">
                      <Heading level={3}>Compute</Heading>
                      {summary.computePledges > 0 ? (
                        <Badge variant="green" label={String(summary.computePledges)} />
                      ) : null}
                    </HStack>
                    <Text type="supporting">
                      Run agent code jobs on your own computer in an isolated Docker container. Works with a local
                      Ollama model or your Meta key.
                      {onlineDevices > 0
                        ? ` ${onlineDevices} supporter computer${onlineDevices === 1 ? " is" : "s are"} online now.`
                        : ""}
                    </Text>
                  </VStack>
                </StackItem>
                <PledgeComputeButton
                  ideaId={idea.id}
                  ideaName={idea.name}
                  existing={computePledge}
                  deviceCount={devices.length}
                  signInHref={signInHref}
                />
              </HStack>
            </Card>
          ) : null}

          {idea.wantsCapital && idea.capitalLinks.length > 0 ? (
            <Card>
              <VStack gap={3}>
                <VStack gap={1}>
                  <Heading level={3}>Capital</Heading>
                  <Text type="supporting">The team accepts contributions through these outside services.</Text>
                </VStack>
                <CapitalLinks links={idea.capitalLinks} />
              </VStack>
            </Card>
          ) : null}
        </VStack>
      ) : null}
    </VStack>
  );
}
