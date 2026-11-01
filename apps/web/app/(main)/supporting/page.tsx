import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { Device, PledgeStatus } from "@westride/db";
import { getPendingPairingCode, isDeviceOnline, listDevicesForSupporter } from "@westride/db/devices";
import { listIdeas, type SupportWant, isSupportWant } from "@westride/db/ideas";
import {
  listContributionsForSupporter,
  listPledgesForSupporter,
  summarizeSupporter,
  type PledgeWithIdea,
} from "@westride/db/support";
import { signInPath } from "@/lib/auth-paths";
import { isVolunteerRunnerConfigured } from "@/lib/build/agent/config";
import { ideaPath } from "@/lib/ideas/filters";
import { formatMicros, formatSeconds, supportingPath } from "@/lib/support/schema";
import { EntityImage } from "../entity-image";
import { LookingForBadges } from "../ideas/idea-badges";
import { DeviceActions } from "./device-actions";
import { LinkDeviceButton } from "./link-device-dialog";
import { PledgeActions } from "./pledge-actions";

export const metadata: Metadata = { title: "Supporting" };

const KINDS: { kind: SupportWant; label: string; blurb: string }[] = [
  {
    kind: "tokens",
    label: "Tokens",
    blurb: "Let a team's agents run on your Meta API key, up to a cap you set each month or once.",
  },
  {
    kind: "compute",
    label: "Compute",
    blurb: "Run agent code jobs on your own computer, in an isolated container, with a local model or your key.",
  },
  {
    kind: "capital",
    label: "Capital",
    blurb: "Teams list where they take contributions. WeStride never touches the money.",
  },
];

const STATUS_LABEL: Record<PledgeStatus, string> = { ACTIVE: "Active", PAUSED: "Paused", REVOKED: "Ended" };
const STATUS_VARIANT: Record<PledgeStatus, "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  REVOKED: "neutral",
};

function pledgeDetail(pledge: PledgeWithIdea): string {
  if (pledge.kind === "COMPUTE") {
    return pledge.jobsTotal > 0 ? `${pledge.jobsTotal} job${pledge.jobsTotal === 1 ? "" : "s"} run` : "No jobs yet";
  }
  const cap =
    pledge.capMicros === null
      ? "No cap"
      : `${formatMicros(pledge.capMicros)} ${pledge.resetsMonthly ? "a month" : "one time"}`;
  const spent =
    pledge.capMicros !== null && pledge.resetsMonthly
      ? `${formatMicros(pledge.spentMicrosThisPeriod)} used this period`
      : `${formatMicros(pledge.spentMicrosTotal)} used`;
  return `${cap} · ${spent}`;
}

function deviceDetail(device: Device): string {
  const parts: string[] = [];
  if (device.os || device.arch) parts.push([device.os, device.arch].filter(Boolean).join(" "));
  if (device.cpus) parts.push(`${device.cpus} CPU${device.cpus === 1 ? "" : "s"}`);
  if (device.memoryMb) parts.push(`${Math.round(device.memoryMb / 1024)} GB`);
  if (device.models.length > 0) parts.push(`${device.models.length} local model${device.models.length === 1 ? "" : "s"}`);
  if (device.hasMetaKey) parts.push("Meta key");
  if (device.jobsCompleted > 0) parts.push(`${device.jobsCompleted} job${device.jobsCompleted === 1 ? "" : "s"}`);
  return parts.join(" · ") || "Waiting for its first check-in";
}

export default async function SupportingPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const [{ userId }, params] = await Promise.all([auth(), searchParams]);
  const kindParam = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const kind: SupportWant | null = kindParam && isSupportWant(kindParam) ? kindParam : null;

  const [pledges, devices, pairingCode, totals, contributions, ideas] = await Promise.all([
    userId ? listPledgesForSupporter(userId) : Promise.resolve([]),
    userId ? listDevicesForSupporter(userId) : Promise.resolve([]),
    userId ? getPendingPairingCode(userId) : Promise.resolve(null),
    userId ? summarizeSupporter(userId) : Promise.resolve(null),
    userId ? listContributionsForSupporter(userId, 12) : Promise.resolve([]),
    listIdeas({ wants: kind ?? undefined, sort: "newest" }, { clerkUserId: userId }),
  ]);
  const lookingFor = kind
    ? ideas
    : ideas.filter((idea) => idea.wantsTokens || idea.wantsCompute || idea.wantsCapital);
  const showDevices = userId && (kind === "compute" || kind === null || devices.length > 0);
  const signInHref = `${signInPath}?redirect_url=${encodeURIComponent(supportingPath(kind ?? undefined))}`;

  return (
    <Layout
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={3}>
            <Heading level={1}>Supporting</Heading>
            <Text type="supporting">
              Back an idea without joining its team. Pledge tokens or compute to the ideas you choose, or follow a
              team&apos;s own links to contribute capital. Everything is yours to pause or stop at any time, and
              WeStride never collects or holds money.
            </Text>
            <HStack gap={2} wrap="wrap">
              <Button label="All" variant={kind === null ? "primary" : "secondary"} size="sm" href={supportingPath()} />
              {KINDS.map((entry) => (
                <Button
                  key={entry.kind}
                  label={entry.label}
                  variant={kind === entry.kind ? "primary" : "secondary"}
                  size="sm"
                  href={supportingPath(entry.kind)}
                />
              ))}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {kind ? (
              <Card variant="muted">
                <VStack gap={1}>
                  <Heading level={2}>{KINDS.find((entry) => entry.kind === kind)?.label}</Heading>
                  <Text>{KINDS.find((entry) => entry.kind === kind)?.blurb}</Text>
                  {kind === "capital" ? (
                    <Text type="supporting">
                      Capital links live on each idea&apos;s page. Open an idea below to see where its team accepts
                      contributions.
                    </Text>
                  ) : null}
                </VStack>
              </Card>
            ) : null}

            {!userId ? (
              <Banner
                status="info"
                title="Sign in to pledge"
                description="You can browse ideas looking for support now. Pledging tokens or compute needs a WeStride account."
              />
            ) : null}

            {userId && kind !== "capital" ? (
              <VStack gap={4}>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <StackItem size="fill">
                    <Heading level={2}>Your pledges</Heading>
                  </StackItem>
                  {totals && (totals.sponsoredMicros > 0 || totals.computeSeconds > 0) ? (
                    <Text type="supporting">
                      {[
                        totals.sponsoredMicros > 0 ? `${formatMicros(totals.sponsoredMicros)} in tokens covered` : null,
                        totals.computeSeconds > 0 ? `${formatSeconds(totals.computeSeconds)} of compute` : null,
                        `${totals.jobs} job${totals.jobs === 1 ? "" : "s"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
                </HStack>
                {pledges.length === 0 ? (
                  <Text type="supporting">
                    No pledges yet. Pick an idea below and choose what to give from its page.
                  </Text>
                ) : (
                  <List hasDividers edge="flush">
                    {pledges
                      .filter((pledge) => !kind || pledge.kind === (kind === "tokens" ? "TOKENS" : "COMPUTE"))
                      .map((pledge) => (
                        <ListItem
                          key={pledge.id}
                          startContent={<EntityImage name={pledge.idea.name} imageUrl={pledge.idea.imageUrl} size={48} />}
                          label={
                            <HStack gap={2} vAlign="center" wrap="wrap">
                              <Link href={ideaPath(pledge.idea.id)}>{pledge.idea.name}</Link>
                              <Badge
                                variant={pledge.kind === "TOKENS" ? "blue" : "green"}
                                label={pledge.kind === "TOKENS" ? "Tokens" : "Compute"}
                              />
                              <Badge variant={STATUS_VARIANT[pledge.status]} label={STATUS_LABEL[pledge.status]} />
                            </HStack>
                          }
                          description={pledgeDetail(pledge)}
                          endContent={<PledgeActions pledgeId={pledge.id} ideaId={pledge.ideaId} status={pledge.status} />}
                        />
                      ))}
                  </List>
                )}
              </VStack>
            ) : null}

            {showDevices ? (
              <>
                <Divider />
                <VStack gap={4}>
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    <StackItem size="fill">
                      <VStack gap={1}>
                        <Heading level={2}>Your computers</Heading>
                        <Text type="supporting">
                          Computers running the WeStride runner. They only take jobs for ideas you have pledged compute
                          to, and only when the team has opted in.
                        </Text>
                      </VStack>
                    </StackItem>
                    {isVolunteerRunnerConfigured() ? (
                      <LinkDeviceButton
                        initialCode={
                          pairingCode ? { code: pairingCode.code, expiresAt: pairingCode.expiresAt.toISOString() } : null
                        }
                      />
                    ) : null}
                  </HStack>
                  {!isVolunteerRunnerConfigured() ? (
                    <Text type="supporting">Supporter computers are not set up on this WeStride server yet.</Text>
                  ) : devices.length === 0 ? (
                    <Text type="supporting">No computers linked yet.</Text>
                  ) : (
                    <List hasDividers edge="flush">
                      {devices.map((device) => {
                        const online = isDeviceOnline(device);
                        return (
                          <ListItem
                            key={device.id}
                            label={
                              <HStack gap={2} vAlign="center" wrap="wrap">
                                <Text weight="medium">{device.name}</Text>
                                <Badge variant={online ? "success" : "neutral"} label={online ? "Online" : "Offline"} />
                                {device.currentJobId ? <Badge variant="blue" label="Working" /> : null}
                              </HStack>
                            }
                            description={deviceDetail(device)}
                            endContent={<DeviceActions deviceId={device.id} name={device.name} />}
                          />
                        );
                      })}
                    </List>
                  )}
                </VStack>
              </>
            ) : null}

            {userId && contributions.length > 0 && kind !== "capital" ? (
              <>
                <Divider />
                <VStack gap={4}>
                  <Heading level={2}>Recent jobs you made possible</Heading>
                  <List hasDividers edge="flush" density="compact">
                    {contributions.map((entry) => (
                      <ListItem
                        key={entry.id}
                        label={`${entry.ideaName}${entry.ticketTitle ? ` · ${entry.ticketTitle}` : ""}`}
                        description={[
                          entry.agentName,
                          entry.kind === "TOKENS"
                            ? `${formatMicros(entry.estimatedCostMicros)} estimated`
                            : `${formatSeconds(entry.wallClockSeconds)} on your computer`,
                          entry.createdAt.toLocaleDateString(),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                    ))}
                  </List>
                </VStack>
              </>
            ) : null}

            <Divider />
            <VStack gap={4}>
              <VStack gap={1}>
                <Heading level={2}>
                  {kind ? `Ideas looking for ${KINDS.find((entry) => entry.kind === kind)?.label.toLowerCase()}` : "Ideas looking for support"}
                </Heading>
                <Text type="supporting">Open an idea to pledge, or to find the team&apos;s capital links.</Text>
              </VStack>
              {lookingFor.length === 0 ? (
                <Text type="supporting">
                  None right now. Teams turn this on from their idea&apos;s support settings.
                </Text>
              ) : (
                <List hasDividers edge="flush">
                  {lookingFor.map((idea) => (
                    <ListItem
                      key={idea.id}
                      href={ideaPath(idea.id)}
                      startContent={<EntityImage name={idea.name} imageUrl={idea.imageUrl} size={48} />}
                      label={idea.name}
                      description={
                        <HStack gap={2} vAlign="center" wrap="wrap">
                          <LookingForBadges idea={idea} />
                        </HStack>
                      }
                    />
                  ))}
                </List>
              )}
              {!userId ? (
                <HStack>
                  <Button label="Sign in to pledge" variant="primary" href={signInHref} />
                </HStack>
              ) : null}
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
