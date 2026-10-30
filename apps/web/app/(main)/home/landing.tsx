"use client";

import Image from "next/image";
import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Text } from "@astryxdesign/core/Text";
import { Theme } from "@astryxdesign/core/theme";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  StarIcon,
} from "@heroicons/react/20/solid";
import { defaultThemeSlug, themes } from "@/astryx-themes";
import { signUpPath } from "@/lib/auth-paths";
import { STORE_LINKS } from "../../store-links";
import {
  CLONE_SNIPPET,
  COMMITS_URL,
  HACKATHON_LOGO,
  HACKATHON_NAME,
  HACKATHON_URL,
  HERO_CONNECTIONS,
  INTEGRATIONS,
  META_MODELS,
  MILESTONES,
  MOBILE_APPS,
  SOURCE_URL,
  STACK_ROWS,
  STUDIOS,
  SUPPORT,
  TEAM,
  type ConnectionStatus,
  type ConnectionStatuses,
  type HeroConnection,
  type Integration,
  type MobileApp,
  type StackLogo,
} from "./landing-content";
import { HeroGlobe } from "./hero-globe";
import { LANDING_STYLES } from "./landing-styles";

export type LandingStats = {
  advisors: number;
};

type LandingProps = {
  firstName: string | null;
  isSignedIn: boolean;
  stats: LandingStats;
  connections: ConnectionStatuses;
};

const CONTENT_WIDTH = 1120;

// Section props stop at spacing step 10, and Section paints its surface on an
// inner element, so a band's padding lives on its content column instead.
// That keeps the painted surface and the hero sky edge to edge.
const bandPadding: CSSProperties = {
  paddingInline: "var(--spacing-6)",
  paddingBlock: "calc(var(--spacing-12) * 2)",
};

const heroPadding: CSSProperties = {
  paddingInline: "var(--spacing-6)",
  paddingBlockStart: "calc(var(--spacing-12) * 2.25)",
  paddingBlockEnd: "calc(var(--spacing-12) * 2)",
};

const centered: CSSProperties = {
  marginInline: "auto",
  boxSizing: "content-box",
};

const eyebrowStyle: CSSProperties = {
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

/**
 * Marks the page as scripted and reveals `.wl-reveal` blocks as they scroll
 * into view. Without JavaScript nothing is ever hidden.
 */
function useScrollReveal(rootRef: React.RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root == null) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>(".wl-reveal")
    );
    root.dataset.js = "";

    // Anything already on screen shows at once, so the first paint never
    // flashes empty space where content was a moment ago.
    const viewportHeight = window.innerHeight;
    const pending = targets.filter((target) => {
      if (target.getBoundingClientRect().top < viewportHeight) {
        target.dataset.visible = "";
        return false;
      }
      return true;
    });

    if (pending.length === 0 || !("IntersectionObserver" in window)) {
      pending.forEach((target) => {
        target.dataset.visible = "";
      });
      return () => {
        delete root.dataset.js;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "";
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );
    pending.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      delete root.dataset.js;
    };
  }, [rootRef]);
}

function revealDelay(step: number): CSSProperties {
  return {
    "--wl-delay": `calc(var(--duration-fast-min) * ${step})`,
  } as CSSProperties;
}

function Container({
  children,
  gap = 8,
  className,
  style,
}: {
  children: ReactNode;
  gap?: 4 | 6 | 8 | 10;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <VStack
      gap={gap}
      maxWidth={CONTENT_WIDTH}
      className={className}
      style={{ ...centered, ...bandPadding, ...style }}
    >
      {children}
    </VStack>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text
      type="label"
      size="sm"
      weight="semibold"
      className="wl-eyebrow"
      style={eyebrowStyle}
    >
      {children}
    </Text>
  );
}

function SectionIntro({
  eyebrow,
  title,
  lede,
  align = "start",
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <VStack
      gap={3}
      hAlign={align}
      maxWidth={align === "center" ? 760 : 820}
      className="wl-reveal"
      style={align === "center" ? centered : undefined}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading level={2} type="display-3" justify={align} textWrap="balance">
        {title}
      </Heading>
      {lede != null && (
        <Text type="large" color="secondary" justify={align} textWrap="pretty">
          {lede}
        </Text>
      )}
    </VStack>
  );
}

/** Light tile so dark artwork stays legible in both color modes. */
function LogoTile({
  src,
  alt = "",
  wide = false,
  size = "md",
}: {
  src: string;
  alt?: string;
  wide?: boolean;
  size?: "sm" | "md";
}) {
  const side = size === "sm" ? "var(--spacing-8)" : "var(--spacing-12)";
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <Card
        className="wl-logo-tile"
        padding={size === "sm" ? 1.5 : 2}
        width={wide ? `calc(${side} * 2.5)` : side}
        height={side}
      >
        <Image
          src={src}
          alt={alt}
          width={120}
          height={48}
          // The optimizer fetches this file without a browser user agent,
          // and the proxy refuses that request.
          unoptimized
        />
      </Card>
    </Theme>
  );
}

/* ----------------------------- Hero ----------------------------- */

/** Where each streak starts, in sky units, and how its timing is staggered. */
const SHOOTING_STARS = [
  { x: 1240, y: 70, cycle: 7, delay: 1 },
  { x: 760, y: 40, cycle: 10, delay: 4 },
  { x: 1400, y: 300, cycle: 12, delay: 7.5 },
  { x: 420, y: 110, cycle: 9, delay: 11 },
] as const;

function HeroSky() {
  return (
    <svg
      className="wl-hero-sky"
      viewBox="0 0 1440 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id="wl-grid"
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M48 0H0V48"
            fill="none"
            stroke="var(--color-border-emphasized)"
            strokeOpacity="0.45"
          />
        </pattern>
        <radialGradient id="wl-fade" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="wl-grid-mask">
          <rect width="100%" height="100%" fill="url(#wl-fade)" />
        </mask>
        <radialGradient id="wl-g-blue">
          <stop offset="0" stopColor="var(--wl-indigo)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--wl-indigo)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wl-g-purple">
          <stop offset="0" stopColor="var(--wl-purple)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--wl-purple)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wl-g-teal">
          <stop offset="0" stopColor="var(--wl-teal)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--wl-teal)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wl-stride-gradient" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--wl-indigo)" />
          <stop offset="0.5" stopColor="var(--wl-purple)" />
          <stop offset="1" stopColor="var(--wl-teal)" />
        </linearGradient>
        <linearGradient id="wl-star-trail" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-text-primary)" stopOpacity="0" />
          <stop offset="0.7" stopColor="var(--wl-blue)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--color-text-primary)" />
        </linearGradient>
        <filter
          id="wl-node-glow"
          x="-200%"
          y="-200%"
          width="500%"
          height="500%"
        >
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        width="100%"
        height="100%"
        fill="url(#wl-grid)"
        mask="url(#wl-grid-mask)"
      />

      <circle
        className="wl-blob wl-blob-a"
        cx="300"
        cy="220"
        r="320"
        fill="url(#wl-g-blue)"
      />
      <circle
        className="wl-blob wl-blob-b"
        cx="1130"
        cy="240"
        r="360"
        fill="url(#wl-g-purple)"
      />
      <circle
        className="wl-blob wl-blob-c"
        cx="760"
        cy="680"
        r="300"
        fill="url(#wl-g-teal)"
      />

      <path
        className="wl-stride"
        d="M -40 640 C 260 620 380 460 600 440 C 820 420 900 300 1480 120"
        fill="none"
        stroke="url(#wl-stride-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <g filter="url(#wl-node-glow)" opacity="0.7">
        <circle
          className="wl-node"
          cx="156"
          cy="603"
          r="6"
          fill="var(--wl-indigo)"
        />
        <circle
          className="wl-node"
          cx="366"
          cy="513"
          r="6"
          fill="var(--wl-purple)"
        />
        <circle
          className="wl-node"
          cx="600"
          cy="440"
          r="6"
          fill="var(--wl-blue)"
        />
        <circle
          className="wl-node"
          cx="870"
          cy="356"
          r="6"
          fill="var(--wl-teal)"
        />
        <circle
          className="wl-node"
          cx="1187"
          cy="220"
          r="7"
          fill="var(--wl-orange)"
        />
      </g>

      <g>
        {SHOOTING_STARS.map((star) => (
          <g key={`${star.x}-${star.y}`} transform={`translate(${star.x} ${star.y})`}>
            <line
              className="wl-shooting-star"
              x1="150"
              y1="-60"
              x2="0"
              y2="0"
              stroke="url(#wl-star-trail)"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={
                {
                  "--wl-star-cycle": star.cycle,
                  "--wl-star-delay": star.delay,
                } as CSSProperties
              }
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

function HackathonPill() {
  return (
    <ClickableCard
      className="wl-glow-border wl-pill"
      href={HACKATHON_URL}
      target="_blank"
      label={`Built at the 2026 ${HACKATHON_NAME} (opens in a new tab)`}
      padding={1}
      width="fit-content"
      elevation="none"
    >
      <HStack gap={2} vAlign="center" wrap="nowrap" paddingInlineEnd={2}>
        <Image
          className="wl-pill-logo"
          src={HACKATHON_LOGO}
          alt=""
          width={630}
          height={630}
          unoptimized
        />
        <Text type="label" size="sm" weight="semibold" textWrap="nowrap">
          Built at the 2026 {HACKATHON_NAME}
        </Text>
        <Icon icon={ArrowTopRightOnSquareIcon} size="xsm" color="secondary" />
      </HStack>
    </ClickableCard>
  );
}

const CONNECTION_STATUS: Record<
  ConnectionStatus,
  { label: string; variant: "success" | "accent" | "neutral" }
> = {
  connected: { label: "Connected", variant: "success" },
  disconnected: { label: "Not connected", variant: "accent" },
  available: { label: "Available", variant: "accent" },
  unavailable: { label: "Coming soon", variant: "neutral" },
};

function ConnectionTile({
  connection,
  status,
}: {
  connection: HeroConnection;
  status: ConnectionStatus;
}) {
  const { label, variant } = CONNECTION_STATUS[status];
  return (
    <ClickableCard
      className="wl-connect-tile"
      href="/settings"
      label={`${connection.name}: ${label}. Manage in settings.`}
      padding={3}
    >
      <VStack gap={2}>
        <LogoTile src={connection.logo} size="sm" />
        <VStack gap={0.5}>
          <Text size="sm" weight="semibold" textWrap="nowrap">
            {connection.name}
          </Text>
          <HStack gap={1.5} vAlign="center" wrap="nowrap">
            <StatusDot variant={variant} label={label} />
            <Text type="supporting" size="xsm" textWrap="nowrap">
              {label}
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </ClickableCard>
  );
}

function MobileAppTile({ app }: { app: MobileApp }) {
  return (
    <ClickableCard
      className="wl-app-tile"
      href={app.href}
      target="_blank"
      label={`WeStride ${app.name} on ${app.store} (opens in a new tab)`}
      padding={3}
      variant="transparent"
    >
      <HStack gap={3} vAlign="center" wrap="nowrap">
        <LogoTile src={app.logo} size="sm" />
        <VStack gap={0.5}>
          <Text size="sm" weight="semibold" textWrap="nowrap">
            {app.name}
          </Text>
          <HStack gap={1} vAlign="center" wrap="nowrap">
            <Text type="supporting" size="xsm" textWrap="nowrap">
              {app.store}
            </Text>
            <Icon icon={ArrowTopRightOnSquareIcon} size="xsm" color="secondary" />
          </HStack>
        </VStack>
      </HStack>
    </ClickableCard>
  );
}

function ConnectionStrip({
  connections,
  isSignedIn,
}: {
  connections: ConnectionStatuses;
  isSignedIn: boolean;
}) {
  return (
    <HStack className="wl-hero-connect" gap={4} wrap="wrap">
      <VStack
        className="wl-connect-group wl-connect-integrations"
        gap={3}
        padding={4}
      >
        <HStack gap={2} hAlign="between" vAlign="center" wrap="wrap">
          <Eyebrow>{isSignedIn ? "Your connections" : "Works with"}</Eyebrow>
          <Link href="/settings" isStandalone size="sm">
            {isSignedIn ? "Manage connections" : "Sign in to connect"}
          </Link>
        </HStack>
        <Grid columns={{ minWidth: 120, max: 5 }} gap={2}>
          {HERO_CONNECTIONS.map((connection) => (
            <ConnectionTile
              key={connection.id}
              connection={connection}
              status={connections[connection.id]}
            />
          ))}
        </Grid>
      </VStack>

      <VStack
        className="wl-connect-group wl-connect-apps wl-glow-border"
        gap={3}
        padding={4}
      >
        <Eyebrow>Take it with you</Eyebrow>
        <Grid columns={{ minWidth: 150, max: 2 }} gap={2}>
          {MOBILE_APPS.map((app) => (
            <MobileAppTile key={app.href} app={app} />
          ))}
        </Grid>
      </VStack>
    </HStack>
  );
}

function Hero({ isSignedIn, stats, connections }: LandingProps) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <Section className="wl-hero" variant="transparent" padding={0}>
        <HeroSky />
        <VStack
          className="wl-hero-content"
          gap={10}
          maxWidth={CONTENT_WIDTH}
          style={{ ...centered, ...heroPadding }}
        >
          <Grid columns={{ minWidth: 360, max: 2 }} gap={8} align="center">
            <VStack className="wl-hero-copy" gap={6} hAlign="start">
              <HackathonPill />

              <Image
                className="wl-wordmark"
                src="/logos/westride/WeStride_landscape_white.png"
                alt="WeStride"
                width={2582}
                height={788}
                preload
                unoptimized
                style={{
                  width: "min(100%, calc(var(--spacing-12) * 7))",
                  height: "auto",
                }}
              />

              <Heading level={1} type="display-1" textWrap="balance">
                Build what&apos;s 
                <Text
                  type="inherit"
                  display="inline"
                  className="wl-gradient-text"
                >
                   &nbsp;next.
                </Text>
              </Heading>

              <Text
                type="large"
                color="secondary"
                textWrap="pretty"
                maxLines={0}
              >
                {`Bring an idea and WeStride takes it the whole way. A team of ${stats.advisors} Muse advisors pressure-tests it, Muse Code builds it in your GitHub repository, and Agent Studio gives it AI agents of its own. Open source, and powered by Meta's models.`}
              </Text>

              <HStack gap={3} wrap="wrap">
                {STUDIOS.map((studio, index) => (
                  <Button
                    key={studio.href}
                    label={studio.action}
                    variant={index === 0 ? "primary" : undefined}
                    size="lg"
                    href={studio.href}
                    icon={<Icon icon={studio.icon} color="inherit" />}
                  />
                ))}
              </HStack>

              <HStack gap={2} wrap="wrap">
                <Button
                  label="Star on GitHub"
                  variant="ghost"
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={<Icon icon={StarIcon} color="inherit" />}
                />
                <Button label="Our story" variant="ghost" href="/our-story" />
              </HStack>
            </VStack>

            <HeroGlobe />
          </Grid>

          <ConnectionStrip connections={connections} isSignedIn={isSignedIn} />
        </VStack>
      </Section>
    </Theme>
  );
}

/* ----------------------------- Path ----------------------------- */

function PathTrack() {
  return (
    <svg
      className="wl-track"
      viewBox="0 0 1000 16"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* A horizontal line has no bounding-box height, so the gradient
            must be measured in user space or it is dropped entirely. */}
        <linearGradient
          id="wl-track-gradient"
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="1000"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="var(--wl-indigo)" />
          <stop offset="0.5" stopColor="var(--wl-purple)" />
          <stop offset="1" stopColor="var(--wl-teal)" />
        </linearGradient>
      </defs>
      <line
        className="wl-rail"
        x1="0"
        y1="8"
        x2="1000"
        y2="8"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <line
        className="wl-glow"
        x1="0"
        y1="8"
        x2="1000"
        y2="8"
        stroke="url(#wl-track-gradient)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <line
        className="wl-runner"
        x1="0"
        y1="8"
        x2="0.01"
        y2="8"
        stroke="var(--wl-purple)"
        strokeWidth="10"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity="0"
      />
    </svg>
  );
}

function StudiosSection() {
  return (
    <Section variant="transparent" padding={0}>
      <Container>
        <SectionIntro
          eyebrow="Idea, build, agent"
          title="Take an idea from a hunch to a shipped product with agents of its own"
          lede="Three studios, one path. Muse pressure-tests the idea, plans the work and writes the code with you, then gives the finished project agents that keep working. Every step runs on Meta's models."
        />
        <VStack gap={4} className="wl-reveal" style={revealDelay(1)}>
          <PathTrack />
          <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>
            {STUDIOS.map((studio, index) => (
              <ClickableCard
                key={studio.href}
                className="wl-step"
                href={studio.href}
                label={`${studio.action} in ${studio.where}`}
                padding={6}
                elevation="low"
              >
                <VStack gap={5}>
                  <Center
                    className="wl-step-icon"
                    style={
                      {
                        "--wl-tint-a": `var(--wl-${studio.tints[0]})`,
                        "--wl-tint-b": `var(--wl-${studio.tints[1]})`,
                      } as CSSProperties
                    }
                  >
                    <Icon icon={studio.icon} size="lg" color="inherit" />
                  </Center>
                  <VStack gap={1}>
                    <Text type="supporting" size="xsm" weight="semibold">
                      {String(index + 1).padStart(2, "0")} · {studio.where}
                    </Text>
                    <Heading level={3}>{studio.step}</Heading>
                  </VStack>
                  <Text type="supporting">{studio.how}</Text>
                  <HStack gap={1} vAlign="center">
                    <Text size="sm" weight="semibold" color="accent">
                      {studio.action}
                    </Text>
                    <Icon icon={ArrowRightIcon} size="xsm" color="accent" />
                  </HStack>
                </VStack>
              </ClickableCard>
            ))}
          </Grid>
        </VStack>

        <VStack gap={3} className="wl-reveal" style={revealDelay(2)}>
          <Text type="supporting" weight="semibold">
            Want a hand along the way?
          </Text>
          <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
            {SUPPORT.map((step) => (
              <ClickableCard
                key={step.href}
                className="wl-support"
                href={step.href}
                label={`${step.step} in ${step.where}`}
                padding={4}
                variant="muted"
              >
                <HStack gap={3} vAlign="center">
                  <Center
                    className="wl-feature-icon"
                    style={
                      { "--wl-tint": `var(--wl-${step.tints[0]})` } as CSSProperties
                    }
                  >
                    <Icon icon={step.icon} size="md" color="inherit" />
                  </Center>
                  <StackItem size="fill">
                    <VStack gap={0.5}>
                      <Text weight="semibold">
                        {step.step} · {step.where}
                      </Text>
                      <Text type="supporting" size="sm">
                        {step.how}
                      </Text>
                    </VStack>
                  </StackItem>
                  <Icon icon={ArrowRightIcon} size="xsm" color="secondary" />
                </HStack>
              </ClickableCard>
            ))}
          </Grid>
        </VStack>
      </Container>
    </Section>
  );
}

/* --------------------------- Meta AI ---------------------------- */

function MetaAiSection() {
  return (
    <Section variant="muted" padding={0}>
      <Container>
        <SectionIntro
          eyebrow="Powered by Meta AI"
          title="Muse is the coach, the advisory team, and the engineer"
          lede="Meta's models are not a feature bolted onto WeStride. They give feedback on every challenge, pressure-test every idea, and work every ticket."
        />
        <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>
          {META_MODELS.map((model, index) => (
            <Card
              key={model.name}
              className="wl-feature wl-reveal"
              variant={model.variant}
              padding={6}
              style={revealDelay(index + 1)}
            >
              <VStack gap={4}>
                <Center
                  className="wl-feature-icon"
                  style={
                    { "--wl-tint": `var(--wl-${model.tint})` } as CSSProperties
                  }
                >
                  <Icon icon={model.icon} size="md" color="inherit" />
                </Center>
                <VStack gap={1}>
                  <Text type="supporting" size="xsm" weight="semibold">
                    {model.role}
                  </Text>
                  <Heading level={3}>{model.name}</Heading>
                </VStack>
                <Text type="supporting">{model.detail}</Text>
              </VStack>
            </Card>
          ))}
        </Grid>
        <HStack gap={2} wrap="wrap" vAlign="center" className="wl-reveal">
          <Text type="supporting">
            Learning on WeStride is free, with a daily Muse allowance. To
            validate and build, members connect their own Meta account so that
            work runs on their key and credits.
          </Text>
          <Link href="/settings" isStandalone>
            Connect your Meta account
          </Link>
        </HStack>
      </Container>
    </Section>
  );
}

/* -------------------------- Hackathon --------------------------- */

function HackathonSection() {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <Section className="wl-band" variant="transparent" padding={0}>
        <Container>
          <Grid columns={{ minWidth: 320, max: 2 }} gap={8} align="center">
            <VStack gap={5} className="wl-reveal">
              <Eyebrow>Where it started</Eyebrow>
              <Heading level={2} type="display-3" textWrap="balance">
                Born at the {HACKATHON_NAME}
              </Heading>
              <Text type="large" color="secondary" textWrap="pretty">
                Hosted by Cerebral Valley, with kickoff on October 26, 2026 and
                a building period that runs through November 4. We chose the
                &ldquo;Build for Your World&rdquo; problem statement: bring
                Meta&apos;s models into a domain you know firsthand.
              </Text>
              <Text textWrap="pretty">
                Every line of WeStride was written during the hackathon,
                starting at kickoff. The rules asked for a public repository. We
                would have opened it anyway: a project that teaches people to
                build with AI should let them read how it was built.
              </Text>
              <HStack gap={2} wrap="wrap">
                <Button
                  label="Event details"
                  variant="primary"
                  href={HACKATHON_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  endContent={
                    <Icon icon={ArrowTopRightOnSquareIcon} color="inherit" />
                  }
                />
                <Button
                  label="Commit history"
                  href={COMMITS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              </HStack>
            </VStack>

            <Card
              className="wl-reveal"
              padding={6}
              elevation="high"
              style={revealDelay(2)}
            >
              <VStack gap={5}>
                <HStack gap={3} vAlign="center">
                  <Image
                    src={HACKATHON_LOGO}
                    alt=""
                    width={630}
                    height={630}
                    unoptimized
                    style={{
                      width: "var(--spacing-12)",
                      height: "var(--spacing-12)",
                      borderRadius: "var(--radius-element)",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <StackItem size="fill">
                    <VStack gap={0.5}>
                      <Text weight="semibold">Build log</Text>
                      <Text type="supporting">
                        Cerebral Valley · October 26 to November 4, 2026
                      </Text>
                    </VStack>
                  </StackItem>
                </HStack>
                <Stepper
                  orientation="vertical"
                  activeStep={MILESTONES.length - 1}
                  density="compact"
                  label="What we built each day"
                >
                  {MILESTONES.map((milestone, index) => (
                    <Step
                      key={milestone.date}
                      step={index}
                      label={milestone.date}
                      description={milestone.built}
                    />
                  ))}
                </Stepper>
              </VStack>
            </Card>
          </Grid>
        </Container>
      </Section>
    </Theme>
  );
}

/* ------------------------- Integrations ------------------------- */

function IntegrationCard({
  integration,
  index,
}: {
  integration: Integration;
  index: number;
}) {
  const Glyph = integration.icon;
  return (
    <ClickableCard
      className="wl-integration wl-reveal"
      href={integration.href}
      target={integration.isExternal ? "_blank" : undefined}
      label={
        integration.isExternal
          ? `${integration.name} (opens in a new tab)`
          : integration.name
      }
      padding={4}
      style={revealDelay((index % 4) + 1)}
    >
      <VStack gap={3}>
        {integration.logo != null ? (
          <LogoTile src={integration.logo} />
        ) : Glyph != null ? (
          <Center className="wl-feature-icon">
            <Icon icon={Glyph} size="md" color="inherit" />
          </Center>
        ) : null}
        <VStack gap={1}>
          <Heading level={3}>{integration.name}</Heading>
          <Text type="supporting">{integration.detail}</Text>
        </VStack>
      </VStack>
    </ClickableCard>
  );
}

function IntegrationsSection() {
  return (
    <Section variant="transparent" padding={0}>
      <Container>
        <SectionIntro
          eyebrow="Integrations"
          title="Plugs into the places you already work"
          lede="Connect the accounts you use, talk to WeStride from your chat app, and let your AI assistant read the same data the website does."
        />
        <Grid columns={{ minWidth: 240, max: 4 }} gap={4}>
          {INTEGRATIONS.map((integration, index) => (
            <IntegrationCard
              key={integration.name}
              integration={integration}
              index={index}
            />
          ))}
        </Grid>
      </Container>
    </Section>
  );
}

/* --------------------- Tech stack and source -------------------- */

function MarqueeRow({
  items,
  direction,
}: {
  items: StackLogo[];
  direction: "forward" | "reverse";
}) {
  const group = (isDuplicate: boolean) => (
    <HStack
      className="wl-marquee-group"
      gap={4}
      wrap="nowrap"
      vAlign="start"
      aria-hidden={isDuplicate || undefined}
    >
      {items.map((item) => (
        <VStack key={item.name} gap={1.5} hAlign="center">
          <LogoTile src={item.logo} alt={isDuplicate ? "" : item.name} wide />
          <Text type="supporting" size="xsm" textWrap="nowrap">
            {item.name}
          </Text>
        </VStack>
      ))}
    </HStack>
  );

  return (
    <HStack className="wl-marquee" wrap="nowrap">
      <HStack
        className="wl-marquee-track"
        gap={0}
        wrap="nowrap"
        data-direction={direction}
      >
        {group(false)}
        {group(true)}
      </HStack>
    </HStack>
  );
}

function StackSection() {
  return (
    <Section variant="muted" padding={0}>
      <Container gap={10}>
        <SectionIntro
          align="center"
          eyebrow="Open source, all the way down"
          title="One TypeScript monorepo, and you can read every line"
          lede="The website, public API, MCP server, design site, and mobile app live side by side and share packages, so a database column defined once is typed all the way to every screen that shows it."
        />

        <VStack gap={4} className="wl-reveal" style={revealDelay(1)}>
          <MarqueeRow items={STACK_ROWS[0]} direction="forward" />
          <MarqueeRow items={STACK_ROWS[1]} direction="reverse" />
        </VStack>

        <Grid columns={{ minWidth: 320, max: 2 }} gap={8} align="center">
          <VStack gap={4} className="wl-reveal">
            <Heading level={3}>Clone it, run it, change it</Heading>
            <Text type="supporting" textWrap="pretty">
              WeStride teaches people to build with AI, and it is built that way
              too. The repository holds the prompts we sent to Muse, the
              conventions AI coding agents follow here, and the full commit
              history from kickoff onward.
            </Text>
            <HStack gap={2} wrap="wrap">
              <Button
                label="View the source"
                variant="primary"
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                endContent={
                  <Icon icon={ArrowTopRightOnSquareIcon} color="inherit" />
                }
              />
              <Button label="Tech stack" href="/tech-stack" />
              <Button label="API" variant="ghost" href="/api" />
              <Button label="MCP" variant="ghost" href="/mcp" />
            </HStack>
          </VStack>
          <VStack className="wl-reveal" style={revealDelay(2)}>
            <CodeBlock
              className="wl-code"
              code={CLONE_SNIPPET}
              language="bash"
              title="terminal"
              width="100%"
            />
          </VStack>
        </Grid>
      </Container>
    </Section>
  );
}

/* ---------------------------- Story ----------------------------- */

function StorySection() {
  return (
    <Section variant="transparent" padding={0}>
      <Container>
        <Grid columns={{ minWidth: 320, max: 2 }} gap={8} align="center">
          <SectionIntro
            eyebrow="Our story"
            title="Three friends, one hackathon, and a problem we kept seeing in the Discord"
            lede="Team after team was ideating, vetting, and researching. The people doing it could not have been more different: students on a first project, people who had never written code, and engineers with decades behind them. The project was not any one of our ideas. It was the path all of them were walking."
          />
          <VStack gap={5} className="wl-reveal" style={revealDelay(2)}>
            <Grid columns={{ minWidth: 160, max: 3 }} gap={4}>
              {TEAM.map((member) => (
                <VStack key={member.name} gap={2} hAlign="center">
                  <Avatar name={member.name} size={72} tooltip={false} />
                  <VStack gap={0.5} hAlign="center">
                    <Text weight="semibold" justify="center">
                      {member.name}
                    </Text>
                    <Text type="supporting" size="sm" justify="center">
                      {member.role}
                    </Text>
                  </VStack>
                </VStack>
              ))}
            </Grid>
            <HStack hAlign="center">
              <Button
                label="Read our story"
                href="/our-story"
                endContent={<Icon icon={ArrowRightIcon} color="inherit" />}
              />
            </HStack>
          </VStack>
        </Grid>
      </Container>
    </Section>
  );
}

/* --------------------------- Closing ---------------------------- */

function ClosingSection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <Section className="wl-band" variant="transparent" padding={0}>
        <Container gap={6}>
          <SectionIntro
            align="center"
            eyebrow="Stride with us"
            title={
              <>
                Bring an idea. Build it for real.{" "}
                <Text type="inherit" className="wl-gradient-text">
                  Give it agents.
                </Text>
              </>
            }
            lede="WeStride is open source, and the path is the same whether this is your first idea or your fiftieth repository."
          />
          <HStack
            gap={3}
            wrap="wrap"
            hAlign="center"
            className="wl-reveal"
            style={revealDelay(1)}
          >
            {isSignedIn ? (
              <Button
                label="Start an idea"
                variant="primary"
                size="lg"
                href="/ideas"
              />
            ) : (
              <Button
                label="Create a free account"
                variant="primary"
                size="lg"
                href={signUpPath}
              />
            )}
            <Button
              label="Become a mentor"
              size="lg"
              href="/mentorship/become"
            />
            {STORE_LINKS.map((link) => (
              <Button
                key={link.href}
                label={link.label}
                variant="ghost"
                size="lg"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${link.label} (opens in a new tab)`}
              />
            ))}
          </HStack>
        </Container>
      </Section>
    </Theme>
  );
}

/* ----------------------------- Page ----------------------------- */

export function Landing(props: LandingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollReveal(rootRef);

  return (
    <Layout
      content={
        <LayoutContent padding={0}>
          <style>{LANDING_STYLES}</style>
          <VStack className="wl-root" gap={0} ref={rootRef}>
            <Hero {...props} />
            <StudiosSection />
            <MetaAiSection />
            <HackathonSection />
            <IntegrationsSection />
            <StackSection />
            <StorySection />
            <ClosingSection isSignedIn={props.isSignedIn} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
