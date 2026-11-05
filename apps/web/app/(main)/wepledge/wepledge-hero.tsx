"use client";

import type { ComponentType, CSSProperties, SVGProps } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Theme } from "@astryxdesign/core/theme";
import {
  BanknotesIcon,
  BoltIcon,
  ComputerDesktopIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { PlatformSupportSummary } from "@westride/db/support";
import { defaultThemeSlug, themes } from "@/astryx-themes";
import { PLEDGES_PATH } from "@/lib/account-paths";
import { formatMicros, formatSeconds, wePledgePath } from "@/lib/support/schema";
import { CountUp, formatCount, type CountFormat } from "./count-up";
import { Eyebrow, WEPLEDGE_CONTENT_WIDTH, centered } from "./wepledge-shared";
import { kindTint, type SupportKind } from "./wepledge-styles";

const KIND_LABEL: Record<SupportKind, string> = { tokens: "Tokens", compute: "Compute", capital: "Capital" };
const KINDS: SupportKind[] = ["tokens", "compute", "capital"];

/* ----------------------------- Sky ------------------------------ */

function HeroSky() {
  return (
    <svg
      className="sp-hero-sky"
      viewBox="0 0 1440 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="sp-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="var(--color-border-emphasized)" strokeOpacity="0.45" />
        </pattern>
        <radialGradient id="sp-fade" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="sp-grid-mask">
          <rect width="100%" height="100%" fill="url(#sp-fade)" />
        </mask>
        <radialGradient id="sp-g-teal">
          <stop offset="0" stopColor="var(--sp-teal)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--sp-teal)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sp-g-indigo">
          <stop offset="0" stopColor="var(--sp-indigo)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--sp-indigo)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sp-g-green">
          <stop offset="0" stopColor="var(--sp-green)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--sp-green)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sp-grid)" mask="url(#sp-grid-mask)" />
      <circle className="sp-blob sp-blob-a" cx="260" cy="240" r="320" fill="url(#sp-g-teal)" />
      <circle className="sp-blob sp-blob-b" cx="1150" cy="220" r="360" fill="url(#sp-g-indigo)" />
      <circle className="sp-blob sp-blob-c" cx="780" cy="700" r="300" fill="url(#sp-g-green)" />
    </svg>
  );
}

/* ----------------------------- Flow ----------------------------- */

/** Heroicons 24/outline heart, drawn in a 24-unit box. */
const HEART_PATH =
  "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z";

const SOURCES: { kind: SupportKind; y: number; label: string }[] = [
  { kind: "tokens", y: 96, label: "Tokens" },
  { kind: "compute", y: 200, label: "Compute" },
  { kind: "capital", y: 304, label: "Capital" },
];

const HUB = { x: 232, y: 200, r: 34 };
const IDEAS = [
  { x: 356, y: 120 },
  { x: 372, y: 200 },
  { x: 356, y: 280 },
];

function streamPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const bend = (toX - fromX) * 0.55;
  return `M${fromX} ${fromY} C ${fromX + bend} ${fromY}, ${toX - bend} ${toY}, ${toX} ${toY}`;
}

/**
 * Three streams meet at a hub and leave toward the ideas they back. The
 * dashes move, the hub beats, and the orbit rings turn, so the diagram
 * reads as support in motion rather than a static chart.
 */
function FlowDiagram() {
  const sourceX = 62;
  return (
    <VStack className="sp-flow" gap={0}>
      <svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="sp-hub-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--sp-teal)" />
            <stop offset="1" stopColor="var(--sp-purple)" />
          </linearGradient>
          <filter id="sp-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Inbound streams: rail first, moving dashes on top. */}
        {SOURCES.map((source) => (
          <path
            key={`rail-${source.kind}`}
            className="sp-stream-rail"
            d={streamPath(sourceX + 20, source.y, HUB.x - HUB.r - 4, HUB.y)}
            fill="none"
            strokeWidth="2"
          />
        ))}
        {SOURCES.map((source) => (
          <path
            key={`stream-${source.kind}`}
            className="sp-stream"
            data-kind={source.kind}
            d={streamPath(sourceX + 20, source.y, HUB.x - HUB.r - 4, HUB.y)}
            fill="none"
            strokeWidth="3"
          />
        ))}

        {/* Outbound streams to the ideas. */}
        {IDEAS.map((idea) => (
          <path
            key={`out-rail-${idea.x}-${idea.y}`}
            className="sp-stream-rail"
            d={streamPath(HUB.x + HUB.r + 4, HUB.y, idea.x - 12, idea.y)}
            fill="none"
            strokeWidth="2"
          />
        ))}
        {IDEAS.map((idea) => (
          <path
            key={`out-${idea.x}-${idea.y}`}
            className="sp-stream"
            data-kind="out"
            d={streamPath(HUB.x + HUB.r + 4, HUB.y, idea.x - 12, idea.y)}
            fill="none"
            strokeWidth="2.5"
          />
        ))}

        {/* Sources. */}
        {SOURCES.map((source) => (
          <g key={source.kind} className="sp-source" style={kindTint(source.kind)}>
            <circle cx={sourceX} cy={source.y} r="20" fill="var(--sp-tint)" fillOpacity="0.18" />
            <circle cx={sourceX} cy={source.y} r="20" fill="none" stroke="var(--sp-tint)" strokeWidth="2" />
            <circle cx={sourceX} cy={source.y} r="7" fill="var(--sp-tint)" filter="url(#sp-glow)" />
            <text className="sp-source-label" x={sourceX} y={source.y + 40} textAnchor="middle">
              {source.label}
            </text>
          </g>
        ))}

        {/* Hub: orbit rings, pings, and the heart. */}
        <circle className="sp-orbit" cx={HUB.x} cy={HUB.y} r={HUB.r + 24} strokeWidth="1.5" strokeDasharray="4 10" />
        <circle className="sp-orbit" cx={HUB.x} cy={HUB.y} r={HUB.r + 44} strokeWidth="1" strokeDasharray="2 14" />
        <circle className="sp-ring" cx={HUB.x} cy={HUB.y} r={HUB.r} strokeWidth="2" />
        <circle className="sp-ring" cx={HUB.x} cy={HUB.y} r={HUB.r} strokeWidth="2" />
        <g className="sp-hub">
          <circle cx={HUB.x} cy={HUB.y} r={HUB.r} fill="url(#sp-hub-fill)" filter="url(#sp-glow)" />
          <path
            d={HEART_PATH}
            fill="none"
            stroke="var(--color-on-accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${HUB.x - 16} ${HUB.y - 16}) scale(1.3333)`}
          />
        </g>

        {/* Ideas. */}
        <g filter="url(#sp-glow)">
          {IDEAS.map((idea) => (
            <circle key={`${idea.x}-${idea.y}`} className="sp-node" cx={idea.x} cy={idea.y} r="7" fill="var(--sp-purple)" />
          ))}
        </g>
      </svg>
    </VStack>
  );
}

/* ----------------------------- Stats ---------------------------- */

type Stat = {
  kind: SupportKind | "made";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  value: number;
  format: CountFormat;
  label: string;
  detail: string;
};

function madeTint(): CSSProperties {
  return { "--sp-tint": "var(--sp-purple)", "--sp-tint-b": "var(--sp-indigo)" } as CSSProperties;
}

/** Turns the summary into four headline numbers, each with a one-line footnote. */
function heroStats(stats: PlatformSupportSummary): Stat[] {
  const pledgeCount = `${stats.tokenPledges} token pledge${stats.tokenPledges === 1 ? "" : "s"}`;
  const tokens: Stat =
    stats.monthlyCapMicros > 0
      ? {
          kind: "tokens",
          icon: SparklesIcon,
          value: stats.monthlyCapMicros,
          format: "dollars",
          label: "a month in tokens pledged",
          detail: [
            stats.oneTimeCapMicros > 0 ? `plus ${formatMicros(stats.oneTimeCapMicros)} one-time` : null,
            stats.uncappedTokenPledges > 0 ? `${stats.uncappedTokenPledges} uncapped` : null,
            pledgeCount,
          ]
            .filter(Boolean)
            .join(" · "),
        }
      : stats.oneTimeCapMicros > 0
        ? {
            kind: "tokens",
            icon: SparklesIcon,
            value: stats.oneTimeCapMicros,
            format: "dollars",
            label: "in tokens pledged",
            detail: [stats.uncappedTokenPledges > 0 ? `${stats.uncappedTokenPledges} uncapped` : null, pledgeCount]
              .filter(Boolean)
              .join(" · "),
          }
        : {
            kind: "tokens",
            icon: SparklesIcon,
            value: stats.tokenPledges,
            format: "int",
            label: stats.tokenPledges === 1 ? "token pledge" : "token pledges",
            detail:
              stats.uncappedTokenPledges > 0
                ? `${stats.uncappedTokenPledges} with no cap`
                : `${stats.ideasWantingTokens} idea${stats.ideasWantingTokens === 1 ? "" : "s"} looking for tokens`,
          };

  return [
    tokens,
    {
      kind: "compute",
      icon: ComputerDesktopIcon,
      value: stats.devices,
      format: "int",
      label: stats.devices === 1 ? "computer linked" : "computers linked",
      detail:
        stats.devices > 0
          ? [
              `${stats.devicesOnline} online`,
              `${stats.cpus.toLocaleString()} CPU${stats.cpus === 1 ? "" : "s"}`,
              formatCount(stats.memoryMb, "gb"),
            ].join(" · ")
          : `${stats.ideasWantingCompute} idea${stats.ideasWantingCompute === 1 ? "" : "s"} looking for compute`,
    },
    {
      kind: "capital",
      icon: BanknotesIcon,
      value: stats.ideasWantingCapital,
      format: "int",
      label: stats.ideasWantingCapital === 1 ? "idea accepting capital" : "ideas accepting capital",
      detail:
        stats.capitalLinks > 0
          ? `${stats.capitalLinks} link${stats.capitalLinks === 1 ? "" : "s"} to give through, outside WeStride`
          : "Teams list their own links; WeStride never holds money",
    },
    {
      kind: "made",
      icon: BoltIcon,
      value: stats.jobs,
      format: "int",
      label: stats.jobs === 1 ? "agent job made possible" : "agent jobs made possible",
      detail: [
        `${stats.supporters} supporter${stats.supporters === 1 ? "" : "s"}`,
        stats.sponsoredMicros > 0 ? `${formatMicros(stats.sponsoredMicros)} covered` : null,
        stats.computeSeconds > 0 ? `${formatSeconds(stats.computeSeconds)} of compute` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
  ];
}

function StatTile({ stat, index }: { stat: Stat; index: number }) {
  return (
    <Card
      className="sp-stat"
      padding={3}
      variant="transparent"
      style={{ ...(stat.kind === "made" ? madeTint() : kindTint(stat.kind)), "--sp-i": index } as CSSProperties}
    >
      <HStack gap={2} vAlign="center" wrap="nowrap">
        <Center className="sp-stat-icon">
          <Icon icon={stat.icon} size="sm" color="inherit" />
        </Center>
        <VStack gap={0}>
          <CountUp value={stat.value} format={stat.format} type="large" />
          <Text size="sm" weight="semibold" textWrap="balance">
            {stat.label}
          </Text>
          <Text type="supporting" size="xsm" textWrap="pretty">
            {stat.detail}
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
}

/**
 * The home hero's carry bar, with the four support totals in its tiles.
 * It sits on the hero's bottom edge, half over the sky and half over the
 * section below.
 */
function StatsBar({ stats }: { stats: PlatformSupportSummary }) {
  return (
    <HStack
      className="sp-carry"
      gap={2}
      maxWidth={WEPLEDGE_CONTENT_WIDTH}
      vAlign="center"
      role="group"
      aria-label="Support so far"
    >
      <StackItem size="fill">
        <Grid columns={{ minWidth: 200, max: 4 }} gap={2}>
          {heroStats(stats).map((stat, index) => (
            <StatTile key={stat.kind} stat={stat} index={index} />
          ))}
        </Grid>
      </StackItem>
    </HStack>
  );
}

/* ----------------------------- Hero ----------------------------- */

export function WePledgeHero({
  stats,
  kind,
  isSignedIn,
  signInHref,
}: {
  stats: PlatformSupportSummary;
  kind: SupportKind | null;
  isSignedIn: boolean;
  signInHref: string;
}) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <VStack className="sp-hero-frame" gap={0}>
        <Section className="sp-hero" variant="transparent" padding={0}>
          <HeroSky />
          <VStack className="sp-hero-content" gap={10} maxWidth={WEPLEDGE_CONTENT_WIDTH} style={centered}>
            <Grid columns={{ minWidth: 440, max: 2 }} gap={8} align="center">
              <VStack className="sp-hero-copy" gap={5} hAlign="start">
                <Eyebrow>WePledge™</Eyebrow>
                <Heading level={1} type="display-1" textWrap="balance" className="sp-hero-title">
                  Back an idea{" "}
                  <Text type="inherit" display="inline" className="sp-gradient-text">
                    you believe in.
                  </Text>
                </Heading>
                <Text type="large" color="secondary" textWrap="pretty">
                  Pledge tokens or compute to the ideas you choose, without joining their team, or contribute capital
                  through a team&apos;s own links. Everything is yours to pause or stop at any time, and WeStride never
                  collects or holds money.
                </Text>
                <HStack gap={2} wrap="wrap">
                  <Button
                    label="All support"
                    variant={kind === null ? "primary" : "secondary"}
                    size="lg"
                    href={wePledgePath()}
                  />
                  {KINDS.map((entry) => (
                    <Button
                      key={entry}
                      label={KIND_LABEL[entry]}
                      variant={kind === entry ? "primary" : "secondary"}
                      size="lg"
                      href={wePledgePath(entry)}
                      icon={
                        <Icon
                          icon={entry === "tokens" ? SparklesIcon : entry === "compute" ? ComputerDesktopIcon : BanknotesIcon}
                          color="inherit"
                        />
                      }
                    />
                  ))}
                </HStack>
                {isSignedIn ? (
                  <Text type="supporting" textWrap="pretty">
                    Your pledges live on your profile.{" "}
                    <Link href={PLEDGES_PATH}>Open your pledges</Link>
                  </Text>
                ) : (
                  <Text type="supporting" textWrap="pretty">
                    Browse the ideas looking for support now. Pledging needs a WeStride account.{" "}
                    <Link href={signInHref}>Sign in to pledge</Link>
                  </Text>
                )}
              </VStack>
              <FlowDiagram />
            </Grid>
          </VStack>
        </Section>
        <StatsBar stats={stats} />
      </VStack>
    </Theme>
  );
}
