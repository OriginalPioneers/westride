import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Section } from "@astryxdesign/core/Section";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { listIdeas, type SupportWant, isSupportWant } from "@westride/db/ideas";
import { summarizePlatformSupport, type PlatformSupportSummary } from "@westride/db/support";
import { PLEDGES_PATH } from "@/lib/account-paths";
import { signInPath } from "@/lib/auth-paths";
import { wePledgePath } from "@/lib/support/schema";
import { IdeaCard } from "../ideas/idea-card";
import { DarkBand } from "./dark-band";
import { Glyph, type GlyphName } from "./glyph";
import { WePledgeHero } from "./wepledge-hero";
import { WePledgeRoot } from "./wepledge-root";
import { Container, Eyebrow, SectionIntro } from "./wepledge-shared";
import { kindTint, revealDelay } from "./wepledge-styles";

export const metadata: Metadata = {
  title: "WePledge™",
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
              href={wePledgePath(way.kind)}
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

/* ----------------------------- Ideas ---------------------------- */

function IdeasSection({
  kind,
  ideas,
  viewerId,
  signInHref,
}: {
  kind: SupportWant | null;
  ideas: Awaited<ReturnType<typeof listIdeas>>;
  viewerId: string | null;
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
          <Grid columns={{ minWidth: 320, max: 3 }} gap={4} className="sp-reveal" style={revealDelay(1)}>
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} viewerId={viewerId} />
            ))}
          </Grid>
        )}
        {viewerId === null ? (
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
                  <Button label="Your pledges" size="lg" href={PLEDGES_PATH} />
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

  const [ideas, platform] = await Promise.all([
    listIdeas({ wants: kind ?? undefined, sort: "newest" }, { clerkUserId: userId }),
    summarizePlatformSupport(),
  ]);
  const lookingFor = kind
    ? ideas
    : ideas.filter((idea) => idea.wantsTokens || idea.wantsCompute || idea.wantsCapital);
  const signInHref = `${signInPath}?redirect_url=${encodeURIComponent(wePledgePath(kind ?? undefined))}`;

  return (
    <Layout
      content={
        <LayoutContent padding={0}>
          <WePledgeRoot>
            <WePledgeHero stats={platform} kind={kind} isSignedIn={Boolean(userId)} signInHref={signInHref} />
            <WaysSection kind={kind} platform={platform} />
            <IdeasSection kind={kind} ideas={lookingFor} viewerId={userId} signInHref={signInHref} />
            <ClosingBand isSignedIn={Boolean(userId)} signInHref={signInHref} />
          </WePledgeRoot>
        </LayoutContent>
      }
    />
  );
}
