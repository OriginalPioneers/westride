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
  INTEGRATIONS,
  META_MODELS,
  MILESTONES,
  PATH,
  SOURCE_URL,
  STACK_ROWS,
  TEAM,
  type Integration,
  type StackLogo,
} from "./landing-content";
import { LANDING_STYLES } from "./landing-styles";

export type LandingStats = {
  advisors: number;
  achievements: number;
  tracks: number;
};

type LandingProps = {
  firstName: string | null;
  isSignedIn: boolean;
  stats: LandingStats;
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
}: {
  src: string;
  alt?: string;
  wide?: boolean;
}) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <Card
        className="wl-logo-tile"
        padding={2}
        width={wide ? "calc(var(--spacing-12) * 2.5)" : "var(--spacing-12)"}
        height="var(--spacing-12)"
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <VStack gap={0.5} hAlign="center">
      <Text type="display-3" weight="bold" className="wl-stat-value">
        {value}
      </Text>
      <Text type="supporting" justify="center">
        {label}
      </Text>
    </VStack>
  );
}

function Hero({ firstName, isSignedIn, stats }: LandingProps) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <Section className="wl-hero" variant="transparent" padding={0}>
        <HeroSky />
        <VStack
          className="wl-hero-content"
          gap={6}
          hAlign="center"
          maxWidth={880}
          style={{ ...centered, ...heroPadding }}
        >
          <HackathonPill />

          <Image
            className="wl-stamp"
            src="/westride-stamp.png"
            alt=""
            width={1156}
            height={778}
            preload
            unoptimized
            style={{ width: "calc(var(--spacing-12) * 3.5)", height: "auto" }}
          />

          <VStack gap={3} hAlign="center">
            <Heading
              level={1}
              type="display-1"
              justify="center"
              textWrap="balance"
            >
              Build what&apos;s 
              <Text type="inherit" display="inline" className="wl-gradient-text">
                 &nbsp;next.
              </Text>
            </Heading>
          </VStack>

          <Text
            type="large"
            color="secondary"
            justify="center"
            textWrap="balance"
            maxLines={0}
            style={{ maxWidth: "calc(var(--spacing-12) * 14)" }}
          >
            WeStride is an open-source platform that walks the whole path with
            you, from your first prompt to a shipped product, powered by
            Meta&apos;s models.
          </Text>

          <HStack gap={3} wrap="wrap" hAlign="center">
            <Button
              label={isSignedIn ? "Continue learning" : "Start learning"}
              variant="primary"
              size="lg"
              href="/academy"
              endContent={<Icon icon={ArrowRightIcon} color="inherit" />}
            />
            <Button
              label="Star on GitHub"
              size="lg"
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              icon={<Icon icon={StarIcon} color="inherit" />}
            />
            <Button
              label="Our story"
              variant="ghost"
              size="lg"
              href="/our-story"
            />
          </HStack>

          <Grid columns={{ minWidth: 130, max: 5 }} gap={4} width="100%">
            <Stat value="100%" label="open source" />
            <Stat value="$0" label="to learn" />
            <Stat value={String(stats.tracks)} label="Academy tracks" />
            <Stat value={String(stats.achievements)} label="achievements" />
            <Stat value={String(stats.advisors)} label="Muse advisors" />
          </Grid>
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

function PathSection() {
  return (
    <Section variant="transparent" padding={0}>
      <Container>
        <SectionIntro
          eyebrow="One path, five strides"
          title="From a first prompt to a shipped product, with help at every step"
          lede="Every builder walks the same path: learn enough AI to start, find someone who has done it before, check that the idea holds up, build it, and give it agents. WeStride is that path, in one place."
        />
        <VStack gap={4} className="wl-reveal" style={revealDelay(1)}>
          <PathTrack />
          <Grid columns={{ minWidth: 200, max: 5 }} gap={4}>
            {PATH.map((step, index) => (
              <ClickableCard
                key={step.step}
                className="wl-step"
                href={step.href}
                label={`${step.step} in ${step.where}`}
                padding={4}
                elevation="low"
              >
                <VStack gap={4}>
                  <Center
                    className="wl-step-icon"
                    style={
                      {
                        "--wl-tint-a": `var(--wl-${step.tints[0]})`,
                        "--wl-tint-b": `var(--wl-${step.tints[1]})`,
                      } as CSSProperties
                    }
                  >
                    <Icon icon={step.icon} size="lg" color="inherit" />
                  </Center>
                  <VStack gap={1}>
                    <Text type="supporting" size="xsm" weight="semibold">
                      {String(index + 1).padStart(2, "0")} · {step.where}
                    </Text>
                    <Heading level={3}>{step.step}</Heading>
                  </VStack>
                  <Text type="supporting">{step.how}</Text>
                </VStack>
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
                Learn something. Share what you know.{" "}
                <Text type="inherit" className="wl-gradient-text">
                  Build it with us.
                </Text>
              </>
            }
            lede="WeStride is open source. It is free to learn on, and the path is the same whether you are writing your first prompt or your thousandth pull request."
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
            <PathSection />
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
