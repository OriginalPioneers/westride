import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Section } from "@astryxdesign/core/Section";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { Device, PledgeStatus } from "@westride/db";
import { getPendingPairingCode, isDeviceOnline, listDevicesForSupporter } from "@westride/db/devices";
import { listIdeas, type SupportWant, isSupportWant } from "@westride/db/ideas";
import {
  listContributionsForSupporter,
  listPledgesForSupporter,
  summarizePlatformSupport,
  summarizeSupporter,
  type PlatformSupportSummary,
  type PledgeWithIdea,
} from "@westride/db/support";
import { signInPath } from "@/lib/auth-paths";
import { isVolunteerRunnerConfigured } from "@/lib/build/agent/config";
import { ideaPath } from "@/lib/ideas/filters";
import { formatMicros, formatSeconds, supportingPath } from "@/lib/support/schema";
import { EntityImage } from "../entity-image";
import { LookingForBadges } from "../ideas/idea-badges";
import { CountUp, type CountFormat } from "./count-up";
import { DarkBand } from "./dark-band";
import { DeviceActions } from "./device-actions";
import { Glyph, type GlyphName } from "./glyph";
import { LinkDeviceButton } from "./link-device-dialog";
import { PledgeActions } from "./pledge-actions";
import { SupportingHero } from "./supporting-hero";
import { SupportingRoot } from "./supporting-root";
import { Container, Eyebrow, SectionIntro } from "./supporting-shared";
import { kindTint, revealDelay } from "./supporting-styles";

export const metadata: Metadata = {
  title: "Supporting",
  description:
    "Back an idea without joining its team. Pledge tokens or compute to the ideas you choose, or contribute capital through a team's own links.",
};

type Way = {
  kind: SupportWant;
  label: string;
  blurb: string;
  how: string;
  icon: GlyphName;
};

const WAYS: Way[] = [
  {
    kind: "tokens",
    label: "Tokens",
    blurb: "Let a team's agents run on your Meta API key, up to a cap you set each month or once.",
    how: "Jobs run on your key through WeStride's runner, and you see every one it paid for. The cap is a limit you can change or pause at any time.",
    icon: "sparkles",
  },
  {
    kind: "compute",
    label: "Compute",
    blurb: "Run agent code jobs on your own computer, in an isolated container, with a local model or your key.",
    how: "Link a computer with one command. It only takes jobs for ideas you pledged to, and only when that team opted in.",
    icon: "computer",
  },
  {
    kind: "capital",
    label: "Capital",
    blurb: "Teams list where they take contributions. WeStride never touches the money.",
    how: "Open an idea to find its team's own links: a sponsorship page, a crowdfunding campaign, a tip jar. You give there, directly.",
    icon: "banknotes",
  },
];

const STATUS_LABEL: Record<PledgeStatus, string> = { ACTIVE: "Active", PAUSED: "Paused", REVOKED: "Ended" };
const STATUS_VARIANT: Record<PledgeStatus, "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  REVOKED: "neutral",
};

function wayStat(way: Way, platform: PlatformSupportSummary): string {
  const ideas = (count: number, what: string) =>
    `${count} idea${count === 1 ? "" : "s"} looking for ${what}`;
  switch (way.kind) {
    case "tokens":
      return [
        ideas(platform.ideasWantingTokens, "tokens"),
        platform.tokenPledges > 0 ? `${platform.tokenPledges} pledge${platform.tokenPledges === 1 ? "" : "s"} active` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "compute":
      return [
        ideas(platform.ideasWantingCompute, "compute"),
        platform.devicesOnline > 0 ? `${platform.devicesOnline} computer${platform.devicesOnline === 1 ? "" : "s"} online` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "capital":
      return [
        ideas(platform.ideasWantingCapital, "capital"),
        platform.capitalLinks > 0 ? `${platform.capitalLinks} link${platform.capitalLinks === 1 ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
  }
}

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

/* ----------------------------- Ways ----------------------------- */

function WaysSection({ kind, platform }: { kind: SupportWant | null; platform: PlatformSupportSummary }) {
  return (
    <Section variant="transparent" padding={0}>
      <Container>
        <SectionIntro
          eyebrow="Three ways to help"
          title="Give what you have: a key, a computer, or a contribution"
          lede="Each kind of support is a standing offer you control. Pick one to narrow the page to it, or open an idea below and choose from its page."
        />
        <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>
          {WAYS.map((way, index) => (
            <ClickableCard
              key={way.kind}
              className="sp-way sp-reveal"
              href={supportingPath(way.kind)}
              label={`${way.label}: ${way.blurb}`}
              padding={6}
              elevation="low"
              data-active={kind === way.kind ? "" : undefined}
              aria-current={kind === way.kind ? "page" : undefined}
              style={{ ...kindTint(way.kind), ...revealDelay(index + 1) } as CSSProperties}
            >
              <VStack gap={5}>
                <Center className="sp-way-icon">
                  <Glyph name={way.icon} size="lg" color="inherit" />
                </Center>
                <VStack gap={1}>
                  <Text type="supporting" size="xsm" weight="semibold">
                    {String(index + 1).padStart(2, "0")} · {wayStat(way, platform)}
                  </Text>
                  <Heading level={3}>{way.label}</Heading>
                </VStack>
                <Text type="supporting">{way.blurb}</Text>
                <Text type="supporting" size="sm">
                  {way.how}
                </Text>
                <HStack gap={1} vAlign="center">
                  <Text size="sm" weight="semibold" color="accent">
                    {kind === way.kind ? "Showing" : `Show ${way.label.toLowerCase()}`}
                  </Text>
                  <Glyph name="arrowRight" size="xsm" color="accent" />
                </HStack>
              </VStack>
            </ClickableCard>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}

/* -------------------------- Your support ------------------------ */

type MineStat = {
  label: string;
  value: number;
  format: CountFormat;
  icon: GlyphName;
  tint: CSSProperties;
};

function YourSupportSection({
  kind,
  pledges,
  devices,
  pairingCode,
  totals,
  contributions,
}: {
  kind: SupportWant | null;
  pledges: PledgeWithIdea[];
  devices: Device[];
  pairingCode: { code: string; expiresAt: string } | null;
  totals: { ideas: number; sponsoredMicros: number; computeSeconds: number; jobs: number };
  contributions: Awaited<ReturnType<typeof listContributionsForSupporter>>;
}) {
  const runnerConfigured = isVolunteerRunnerConfigured();
  const showPledges = kind !== "capital";
  const showDevices = kind === "compute" || kind === null || devices.length > 0;
  const visiblePledges = pledges.filter(
    (pledge) => !kind || kind === "capital" || pledge.kind === (kind === "tokens" ? "TOKENS" : "COMPUTE"),
  );
  const onlineCount = devices.filter((device) => isDeviceOnline(device)).length;

  const stats: MineStat[] = [
    {
      label: totals.ideas === 1 ? "idea backed" : "ideas backed",
      value: totals.ideas,
      format: "int",
      icon: "lightbulb",
      tint: { "--sp-tint": "var(--sp-purple)" } as CSSProperties,
    },
    { label: "in tokens covered", value: totals.sponsoredMicros, format: "dollars", icon: "sparkles", tint: kindTint("tokens") },
    { label: "of compute given", value: totals.computeSeconds, format: "seconds", icon: "clock", tint: kindTint("compute") },
    {
      label: totals.jobs === 1 ? "job made possible" : "jobs made possible",
      value: totals.jobs,
      format: "int",
      icon: "bolt",
      tint: { "--sp-tint": "var(--sp-teal)" } as CSSProperties,
    },
  ];

  return (
    <Section className="sp-mine" variant="transparent" padding={0} id="your-support" dividers={["top", "bottom"]}>
      <Container gap={10}>
        <SectionIntro
          eyebrow="Your support"
          title="What you have behind the ideas you back"
          lede="Every pledge and computer here is yours to pause, rename, or end. Nothing happens on your key or your hardware that you cannot see on this page."
        />

        <Grid columns={{ minWidth: 200, max: 4 }} gap={4}>
          {stats.map((stat, index) => (
            <Card
              key={stat.label}
              className="sp-mine-stat sp-reveal"
              padding={5}
              style={{ ...stat.tint, ...revealDelay(index + 1) } as CSSProperties}
            >
              <VStack gap={3}>
                <Center className="sp-stat-icon">
                  <Glyph name={stat.icon} size="md" color="inherit" />
                </Center>
                <VStack gap={0.5}>
                  <CountUp value={stat.value} format={stat.format} type="display-2" />
                  <Text type="supporting" weight="semibold">
                    {stat.label}
                  </Text>
                </VStack>
              </VStack>
            </Card>
          ))}
        </Grid>

        {showPledges ? (
          <VStack gap={4} className="sp-reveal">
            <HStack gap={3} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={3}>Your pledges</Heading>
                  <Text type="supporting">
                    {kind === "tokens"
                      ? "Token pledges draw on your Meta key up to the cap you set."
                      : kind === "compute"
                        ? "Compute pledges let your linked computers take jobs for these ideas."
                        : "Standing offers to the ideas you chose. Revoked pledges stay for the record."}
                  </Text>
                </VStack>
              </StackItem>
              <Button label="Find an idea" variant="secondary" href="#looking-for-support" />
            </HStack>
            {visiblePledges.length === 0 ? (
              <Card variant="muted" padding={5}>
                <Text type="supporting">
                  {pledges.length === 0
                    ? "No pledges yet. Pick an idea below and choose what to give from its page."
                    : `No ${kind} pledges yet. Pick an idea below and choose what to give from its page.`}
                </Text>
              </Card>
            ) : (
              <Card padding={0}>
                <List hasDividers edge="flush">
                  {visiblePledges.map((pledge) => (
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
              </Card>
            )}
          </VStack>
        ) : null}

        {showDevices ? (
          <VStack gap={4} className="sp-reveal">
            <HStack gap={3} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Heading level={3}>Your computers</Heading>
                    {devices.length > 0 ? (
                      <Badge
                        variant={onlineCount > 0 ? "success" : "neutral"}
                        label={`${onlineCount} of ${devices.length} online`}
                      />
                    ) : null}
                  </HStack>
                  <Text type="supporting">
                    Computers running the WeStride runner. They only take jobs for ideas you have pledged compute to,
                    and only when the team has opted in.
                  </Text>
                </VStack>
              </StackItem>
              {runnerConfigured ? <LinkDeviceButton initialCode={pairingCode} /> : null}
            </HStack>
            {!runnerConfigured ? (
              <Card variant="muted" padding={5}>
                <Text type="supporting">Supporter computers are not set up on this WeStride server yet.</Text>
              </Card>
            ) : devices.length === 0 ? (
              <Card variant="muted" padding={5}>
                <VStack gap={2}>
                  <Text weight="semibold">No computers linked yet.</Text>
                  <Text type="supporting">
                    Link one with a single command and it starts picking up jobs for the ideas you pledged compute to.
                    It runs in an isolated container and never sees your files.
                  </Text>
                </VStack>
              </Card>
            ) : (
              <Card padding={0}>
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
              </Card>
            )}
          </VStack>
        ) : null}

        {contributions.length > 0 && kind !== "capital" ? (
          <VStack gap={4} className="sp-reveal">
            <VStack gap={1}>
              <Heading level={3}>Recent jobs you made possible</Heading>
              <Text type="supporting">The latest agent runs your pledges paid for or your computers ran.</Text>
            </VStack>
            <Card padding={0}>
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
            </Card>
          </VStack>
        ) : null}
      </Container>
    </Section>
  );
}

/* ----------------------------- Ideas ---------------------------- */

function IdeasSection({
  kind,
  ideas,
  isSignedIn,
  signInHref,
}: {
  kind: SupportWant | null;
  ideas: Awaited<ReturnType<typeof listIdeas>>;
  isSignedIn: boolean;
  signInHref: string;
}) {
  const way = kind ? WAYS.find((entry) => entry.kind === kind) : null;
  return (
    <Section className="sp-dots" variant="transparent" padding={0} id="looking-for-support">
      <Container>
        <SectionIntro
          eyebrow={way ? `Looking for ${way.label.toLowerCase()}` : "Looking for support"}
          title={way ? `Ideas looking for ${way.label.toLowerCase()} right now` : "Ideas looking for support right now"}
          lede={
            way?.kind === "capital"
              ? "Capital links live on each idea's page. Open one to see where its team accepts contributions."
              : "Open an idea to pledge, or to find the team's capital links. Teams turn this on from their idea's support settings."
          }
        />
        {ideas.length === 0 ? (
          <Card variant="muted" padding={6} className="sp-reveal">
            <VStack gap={2}>
              <Text weight="semibold">None right now.</Text>
              <Text type="supporting">
                Teams turn this on from their idea&apos;s support settings. If you lead an idea, open it and tell
                supporters what would help.
              </Text>
            </VStack>
          </Card>
        ) : (
          <Card padding={0} className="sp-reveal" style={revealDelay(1)}>
            <List hasDividers edge="flush">
              {ideas.map((idea) => (
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
          </Card>
        )}
        {!isSignedIn ? (
          <HStack className="sp-reveal">
            <Button label="Sign in to pledge" variant="primary" size="lg" href={signInHref} />
          </HStack>
        ) : null}
      </Container>
    </Section>
  );
}

/* --------------------------- Closing band ----------------------- */

function ClosingBand({ isSignedIn, signInHref }: { isSignedIn: boolean; signInHref: string }) {
  return (
    <DarkBand>
      <Section className="sp-band" variant="transparent" padding={0}>
        <Container gap={6}>
          <Grid columns={{ minWidth: 320, max: 2 }} gap={8} align="center">
            <VStack gap={4} className="sp-reveal">
              <Eyebrow>How it stays safe</Eyebrow>
              <Heading level={2} type="display-3" textWrap="balance">
                You stay in control, and WeStride never holds money
              </Heading>
              <Text type="large" color="secondary" textWrap="pretty">
                Token pledges have a cap you choose and can pause in one click. Compute runs in a container that
                never sees your files or your GitHub. Capital goes straight to the team through links they publish
                themselves.
              </Text>
            </VStack>
            <VStack gap={3} className="sp-reveal" style={revealDelay(2)}>
              {WAYS.map((way) => (
                <Card key={way.kind} padding={4} style={kindTint(way.kind)}>
                  <HStack gap={3} vAlign="center" wrap="nowrap">
                    <Center className="sp-stat-icon">
                      <Glyph name={way.icon} size="md" color="inherit" />
                    </Center>
                    <VStack gap={0.5}>
                      <Text weight="semibold">{way.label}</Text>
                      <Text type="supporting" size="sm">
                        {way.how}
                      </Text>
                    </VStack>
                  </HStack>
                </Card>
              ))}
              {!isSignedIn ? (
                <HStack>
                  <Button label="Sign in to pledge" variant="primary" size="lg" href={signInHref} />
                </HStack>
              ) : (
                <HStack gap={2} wrap="wrap">
                  <Button label="Browse ideas" variant="primary" size="lg" href="#looking-for-support" />
                  <Button label="Your support" size="lg" href="#your-support" />
                </HStack>
              )}
            </VStack>
          </Grid>
        </Container>
      </Section>
    </DarkBand>
  );
}

/* ----------------------------- Page ----------------------------- */

export default async function SupportingPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const [{ userId }, params] = await Promise.all([auth(), searchParams]);
  const kindParam = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const kind: SupportWant | null = kindParam && isSupportWant(kindParam) ? kindParam : null;

  const [pledges, devices, pairingCode, totals, contributions, ideas, platform] = await Promise.all([
    userId ? listPledgesForSupporter(userId) : Promise.resolve([]),
    userId ? listDevicesForSupporter(userId) : Promise.resolve([]),
    userId ? getPendingPairingCode(userId) : Promise.resolve(null),
    userId ? summarizeSupporter(userId) : Promise.resolve(null),
    userId ? listContributionsForSupporter(userId, 12) : Promise.resolve([]),
    listIdeas({ wants: kind ?? undefined, sort: "newest" }, { clerkUserId: userId }),
    summarizePlatformSupport(),
  ]);
  const lookingFor = kind
    ? ideas
    : ideas.filter((idea) => idea.wantsTokens || idea.wantsCompute || idea.wantsCapital);
  const signInHref = `${signInPath}?redirect_url=${encodeURIComponent(supportingPath(kind ?? undefined))}`;

  return (
    <Layout
      content={
        <LayoutContent padding={0}>
          <SupportingRoot>
            <SupportingHero stats={platform} kind={kind} isSignedIn={Boolean(userId)} signInHref={signInHref} />
            <WaysSection kind={kind} platform={platform} />
            {userId && totals ? (
              <YourSupportSection
                kind={kind}
                pledges={pledges}
                devices={devices}
                pairingCode={pairingCode ? { code: pairingCode.code, expiresAt: pairingCode.expiresAt.toISOString() } : null}
                totals={totals}
                contributions={contributions}
              />
            ) : null}
            <IdeasSection kind={kind} ideas={lookingFor} isSignedIn={Boolean(userId)} signInHref={signInHref} />
            <ClosingBand isSignedIn={Boolean(userId)} signInHref={signInHref} />
          </SupportingRoot>
        </LayoutContent>
      }
    />
  );
}
