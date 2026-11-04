"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Text } from "@astryxdesign/core/Text";
import { Theme } from "@astryxdesign/core/theme";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/20/solid";
import { CodeBracketIcon, HeartIcon } from "@heroicons/react/24/outline";
import { defaultThemeSlug, themes } from "@/astryx-themes";
import {
  CLONE_SNIPPET,
  CURRENT_MILESTONE_STEP,
  HACKATHON_LOGO,
  HACKATHON_NAME,
  INTEGRATIONS,
  META_CAPABILITIES,
  META_MODEL_LINEUP,
  META_MODELS,
  MILESTONES,
  MOBILE_APPS,
  PLATFORM_SURFACES,
  SOURCE_URL,
  STACK_LINE,
  STACK_ROWS,
  STUDIOS,
  FOUNDER,
  type Integration,
  type MobileApp,
  type PlatformSurface,
  type StackLogo,
  type Tint,
} from "./landing-content";
import { youtubeEmbedUrl, youtubeVideoId } from "../academy/format";
import { HeroGlobe } from "./hero-globe";
import { ImportRepoForm, type ImportResume } from "./import-repo-form";
import { LANDING_STYLES } from "./landing-styles";

export type LandingStats = {
  advisors: number;
};

type LandingProps = {
  firstName: string | null;
  /** Set when someone comes back from sign-in or GitHub mid-import. Opens the importer. */
  importResume: ImportResume | null;
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
  icon,
  alt = "",
  wide = false,
  size = "md",
}: {
  src?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  alt?: string;
  wide?: boolean;
  size?: "xs" | "sm" | "md";
}) {
  const side =
    size === "xs"
      ? "var(--spacing-6)"
      : size === "sm"
      ? "var(--spacing-8)"
      : "var(--spacing-12)";
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      <Card
        className="wl-logo-tile"
        padding={size === "xs" ? 1 : size === "sm" ? 1.5 : 2}
        width={wide ? `calc(${side} * 2.5)` : side}
        height={side}
      >
        {src != null ? (
          <Image
            src={src}
            alt={alt}
            width={120}
            height={48}
            // The optimizer fetches this file without a browser user agent,
            // and the proxy refuses that request.
            unoptimized
          />
        ) : icon != null ? (
          <Center>
            <Icon icon={icon} size="xsm" />
          </Center>
        ) : null}
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

/**
 * The neural network behind the hero: lit nodes in sky units, and the
 * curved connections between them. Each connection draws itself in once,
 * then carries a small pulse of light from its first node to its second.
 * The paths sweep from the copy's lower left up past the platform preview
 * and down into the globe's corner.
 */
const NET_NODES = [
  { x: 120, y: 560, tint: "indigo", r: 5 },
  { x: 380, y: 420, tint: "purple", r: 4 },
  { x: 640, y: 300, tint: "blue", r: 5 },
  { x: 980, y: 120, tint: "teal", r: 4 },
  { x: 1160, y: 300, tint: "purple", r: 5 },
  { x: 1320, y: 520, tint: "blue", r: 6 },
  { x: 860, y: 720, tint: "teal", r: 4 },
] as const satisfies readonly { x: number; y: number; tint: Tint; r: number }[];

const NET_LINKS = [
  { d: "M120 560 C 260 540 420 330 640 300", cycle: 9, delay: 0 },
  { d: "M640 300 C 760 280 860 150 980 120", cycle: 7, delay: 2.5 },
  { d: "M980 120 C 1140 140 1260 340 1320 520", cycle: 8, delay: 1 },
  { d: "M380 420 C 620 470 900 420 1160 300", cycle: 11, delay: 4 },
  { d: "M860 720 C 1000 700 1200 640 1320 520", cycle: 8, delay: 5.5 },
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
        {/* The same grid, lit in the section's color. It only shows through
            the sweep mask below, a soft pool of light that wanders across
            the sky, so the lines seem to catch a passing glow. */}
        <pattern
          id="wl-grid-lit"
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M48 0H0V48"
            fill="none"
            stroke="var(--wl-scene-b)"
            strokeOpacity="0.55"
          />
        </pattern>
        <radialGradient id="wl-fade" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wl-sweep-light">
          <stop offset="0" stopColor="white" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.35" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="wl-grid-mask">
          <rect width="100%" height="100%" fill="url(#wl-fade)" />
        </mask>
        <mask id="wl-sweep-mask">
          <circle
            className="wl-sweep"
            cx="0"
            cy="0"
            r="360"
            fill="url(#wl-sweep-light)"
          />
        </mask>
        {/* The blobs take the active section's scene colors (set on .wl-hero
            and eased there), kept well under full strength so a change of
            section reads as a shift of light, not a new backdrop. */}
        <radialGradient id="wl-g-scene-a">
          <stop offset="0" stopColor="var(--wl-scene-a)" stopOpacity="0.38" />
          <stop offset="1" stopColor="var(--wl-scene-a)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wl-g-scene-b">
          <stop offset="0" stopColor="var(--wl-scene-b)" stopOpacity="0.34" />
          <stop offset="1" stopColor="var(--wl-scene-b)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wl-g-scene-c">
          <stop offset="0" stopColor="var(--wl-scene-c)" stopOpacity="0.3" />
          <stop offset="1" stopColor="var(--wl-scene-c)" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="wl-net-gradient"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="800"
          x2="1440"
          y2="0"
        >
          <stop offset="0" stopColor="var(--wl-scene-a)" />
          <stop offset="0.5" stopColor="var(--wl-scene-b)" />
          <stop offset="1" stopColor="var(--wl-scene-c)" />
        </linearGradient>
        <linearGradient id="wl-star-trail" x1="1" y1="0" x2="0" y2="1">
          <stop
            offset="0"
            stopColor="var(--color-text-primary)"
            stopOpacity="0"
          />
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
      <rect
        width="100%"
        height="100%"
        fill="url(#wl-grid-lit)"
        mask="url(#wl-sweep-mask)"
      />

      {/* Ambient light: the section's first color pools behind the platform
          preview, its second warms the upper right, and the third anchors
          the lower left under the copy. */}
      <circle
        className="wl-blob wl-blob-a"
        cx="940"
        cy="380"
        r="420"
        fill="url(#wl-g-scene-a)"
      />
      <circle
        className="wl-blob wl-blob-b"
        cx="1240"
        cy="180"
        r="340"
        fill="url(#wl-g-scene-b)"
      />
      <circle
        className="wl-blob wl-blob-c"
        cx="260"
        cy="700"
        r="320"
        fill="url(#wl-g-scene-c)"
      />

      <g className="wl-net">
        {NET_LINKS.map((link, index) => (
          <g
            key={link.d}
            style={
              {
                "--wl-i": index,
                "--wl-pulse-cycle": link.cycle,
                "--wl-pulse-delay": link.delay,
              } as CSSProperties
            }
          >
            <path
              className="wl-net-link"
              d={link.d}
              pathLength={1000}
              fill="none"
              stroke="url(#wl-net-gradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              className="wl-net-pulse"
              d={link.d}
              pathLength={1000}
              fill="none"
              stroke="var(--color-text-primary)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#wl-node-glow)"
            />
          </g>
        ))}
        <g filter="url(#wl-node-glow)" opacity="0.75">
          {NET_NODES.map((node) => (
            <circle
              key={`${node.x}-${node.y}`}
              className="wl-node"
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={`var(--wl-${node.tint})`}
            />
          ))}
        </g>
      </g>

      <g>
        {SHOOTING_STARS.map((star) => (
          <g
            key={`${star.x}-${star.y}`}
            transform={`translate(${star.x} ${star.y})`}
          >
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

function MobileAppTile({ app }: { app: MobileApp }) {
  const isExternal = app.href.startsWith("http");
  return (
    <ClickableCard
      className="wl-app-tile"
      href={app.href}
      target={isExternal ? "_blank" : undefined}
      label={
        isExternal
          ? `WeStride ${app.name} on ${app.store} (opens in a new tab)`
          : `WeStride ${app.name}, ${app.store}`
      }
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
            {isExternal ? (
              <Icon
                icon={ArrowTopRightOnSquareIcon}
                size="xsm"
                color="secondary"
              />
            ) : null}
          </HStack>
        </VStack>
      </HStack>
    </ClickableCard>
  );
}

function PlatformTile({ surface }: { surface: PlatformSurface }) {
  return (
    <ClickableCard
      className="wl-platform-tile"
      href={surface.href}
      label={surface.label}
      padding={2}
      variant="transparent"
    >
      <HStack gap={2} vAlign="center" wrap="nowrap">
        <LogoTile src={surface.logo} icon={surface.icon} size="xs" />
        <VStack gap={0}>
          <Text size="sm" weight="semibold" textWrap="nowrap">
            {surface.name}
          </Text>
          <Text type="supporting" size="xsm" textWrap="nowrap">
            {surface.detail}
          </Text>
        </VStack>
      </HStack>
    </ClickableCard>
  );
}

const MUSE_CODE_URL = "https://dev.meta.ai/lp/muse-code";
const MUSE_URL = "https://ai.meta.com/muse/";
const META_MODELS_URL = "https://ai.meta.com/";

function MetaLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      className="wl-meta-link"
      href={href}
      isExternalLink
      type="inherit"
      weight="semibold"
    >
      {children}
    </Link>
  );
}

/* -------------------------- Hero sections ----------------------- */

type HeroCta = {
  label: string;
  href: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

type HeroSection = {
  id: string;
  /** The tab label on the right. */
  tab: string;
  /** Where the tab leads, read out with its label. */
  where: string;
  title: ReactNode;
  description: ReactNode;
  /** The panel's buttons; the first is the primary one. */
  ctas: HeroCta[];
  /** The quieter ways in: text links with an arrow, under the buttons. */
  links: { label: string; href: string }[];
  /** The platform page the preview shows while this section is active. */
  screenshot: { src: string; alt: string };
  /**
   * A YouTube video that plays in the preview instead of the screenshot.
   * The screenshot stands in until the URL is a YouTube video.
   */
  video?: { url: string; title: string };
  /** The tab's icon, or "stamp" for the WeStride stamp in its place. */
  icon: ComponentType<SVGProps<SVGSVGElement>> | "stamp";
  /**
   * The tab's accent, and the pair the hero's sky and globe halo take on.
   * The globe's atmosphere glows in the second one.
   */
  tints: [Tint, Tint];
  /** How close the globe sits for this section; 1 is its resting size. */
  globeScale: number;
};

const [IDEA_STUDIO, BUILD_STUDIO, AGENT_STUDIO] = STUDIOS;

/**
 * What a visitor can do here, one panel each. The tab on the right picks
 * the panel; the panel's own copy and calls to action change with it.
 * Panels auto-advance until the visitor picks one.
 *
 * Each section also frames the hero: its tints wash the sky, and the globe
 * pulls in or out. An idea sees the whole world; building moves in; a
 * fleet of agents closer still; WePledge steps back to take it all in.
 */
const HERO_SECTIONS: HeroSection[] = [
  {
    id: "westride",
    tab: "WeStride",
    where: "Explore WeStride",
    title: (
      <>
        Workshop ideas.
        <br />
        Build projects.
        <br />
        Launch agents.
        <br />{" "}
        <Text type="inherit" display="inline" className="wl-gradient-text">
          All with Meta AI.
        </Text>
      </>
    ),
    description:
      "Bring your ideas to life with WeStride. Collaborate with AI-powered advisors to brainstorm, research, and refine your vision. Build real projects in GitHub with AI coding agents, create your own AI agents, and connect with a community of learners, creators, and builders.",
    ctas: [
      {
        label: "Workshop an Idea",
        href: IDEA_STUDIO.href,
        icon: IDEA_STUDIO.icon,
      },
      {
        label: "Build a Project",
        href: BUILD_STUDIO.href,
        icon: BUILD_STUDIO.icon,
      },
      {
        label: "Launch an Agent",
        href: AGENT_STUDIO.href,
        icon: AGENT_STUDIO.icon,
      },
    ],
    links: [
      { label: "Explore WeStride", href: "/#wl-studios" },
      {
        label: "Pledge tokens, compute or capital with WePledge™",
        href: "/wepledge",
      },
    ],
    screenshot: {
      src: "/hero/idea.webp",
      alt: "Idea Workshop in WeStride: a grid of your ideas with their pictures, kinds, and a card to start a new one.",
    },
    video: {
      url: "https://youtu.be/FwOTs4UxQS4",
      title:
        "WeStride: workshop ideas, build projects, and launch agents with Meta AI",
    },
    icon: "stamp",
    tints: ["indigo", "purple"],
    globeScale: 1,
  },
  {
    id: "idea",
    tab: "Idea Workshop",
    where: IDEA_STUDIO.where,
    title: (
      <>
        Explore ideas with<br/>
        <Text type="inherit" display="inline" className="wl-gradient-text">
          Meta AI advisors.
        </Text>
      </>
    ),
    description:
      "Bring your ideas to life with WeStride. Collaborate with AI-powered advisors to brainstorm, research, and refine your vision. Build real projects in GitHub with AI coding agents, create your own AI agents, and connect with a community of learners, creators, and builders.",
    ctas: [
      {
        label: "Workshop an Idea",
        href: IDEA_STUDIO.href,
        icon: IDEA_STUDIO.icon,
      },
    ],
    links: [{ label: "Explore WeStride", href: "/#wl-studios" }],
    screenshot: {
      src: "/hero/idea.webp",
      alt: "Idea Workshop in WeStride: a grid of your ideas with their pictures, kinds, and a card to start a new one.",
    },
    icon: IDEA_STUDIO.icon,
    tints: IDEA_STUDIO.tints,
    globeScale: 1,
  },
  {
    id: "build",
    tab: "Project Factory",
    where: BUILD_STUDIO.where,
    title: (
      <>
        From idea to code,{" "}
        <Text type="inherit" display="inline" className="wl-gradient-text">
          in GitHub.
        </Text>
      </>
    ),
    description: (
      <>
        {"Turn your ideas into working projects with "}
        <MetaLink href={MUSE_CODE_URL}>Meta Muse Code</MetaLink>
        {
          ". WeStride creates your project roadmap and organizes development tickets, while AI coding agents write code, tackle tasks, and open pull requests directly in your GitHub repository."
        }
      </>
    ),
    ctas: [
      {
        label: "Build a Project",
        href: BUILD_STUDIO.href,
        icon: BUILD_STUDIO.icon,
      },
    ],
    links: [{ label: "Find a Mentor", href: "/mentorship" }],
    screenshot: {
      src: "/hero/build.webp",
      alt: "Project Factory in WeStride: a project board with backlog, in progress, in review, roadblocked, and done columns of tickets.",
    },
    icon: BUILD_STUDIO.icon,
    tints: BUILD_STUDIO.tints,
    globeScale: 1.08,
  },
  {
    id: "agent",
    tab: "Agent Studio",
    where: AGENT_STUDIO.where,
    title: (
      <>
        Give your project{" "}
        <Text type="inherit" display="inline" className="wl-gradient-text">
          agents of its own.
        </Text>
      </>
    ),
    description: (
      <>
        {"Create and manage a fleet of AI agents powered by "}
        <MetaLink href={MUSE_URL}>Meta Muse</MetaLink>
        {
          ". Give each agent a role, define its responsibilities, and put it to work on your projects. From automating tasks to supporting ongoing development, your AI agents help keep things moving."
        }
      </>
    ),
    ctas: [
      {
        label: "Create an AI Agent",
        href: AGENT_STUDIO.href,
        icon: AGENT_STUDIO.icon,
      },
    ],
    links: [{ label: "Connect Your Meta Account", href: "/settings" }],
    screenshot: {
      src: "/hero/agent.webp",
      alt: "Agent Studio in WeStride: the new agent form, with a name, what it does, standing instructions, and the project it works in.",
    },
    icon: AGENT_STUDIO.icon,
    tints: AGENT_STUDIO.tints,
    globeScale: 1.14,
  },
  {
    id: "support",
    tab: "WePledge™",
    where: "Explore projects",
    title: (
      <>
        Back an idea{" "}
        <Text type="inherit" display="inline" className="wl-gradient-text">
          you believe in.
        </Text>
      </>
    ),
    description:
      "Discover ideas and projects worth supporting across the WeStride community. Help creators move their projects forward by contributing AI tokens, computing resources, or capital. Choose how you want to support, connect with the people building, and be part of what comes next.",
    ctas: [
      {
        label: "Explore Projects",
        href: "/wepledge#looking-for-support",
        icon: HeartIcon,
      },
    ],
    links: [{ label: "Pledge Tokens, Compute or Capital", href: "/wepledge" }],
    screenshot: {
      src: "/hero/support.webp",
      alt: "WePledge™ in WeStride: tokens, compute, and capital flowing into an idea, with counts of pledges and linked computers.",
    },
    icon: HeartIcon,
    tints: ["teal", "green"],
    globeScale: 0.94,
  },
];

/**
 * The active section's framing, set on the hero: the scene colors its sky,
 * wave, and globe halo are painted in, and how close the globe sits. The
 * styles ease each one when it changes.
 */
function sceneVars(section: HeroSection): CSSProperties {
  return {
    "--wl-scene-a": `var(--wl-${section.tints[0]})`,
    "--wl-scene-b": `var(--wl-${section.tints[1]})`,
    "--wl-globe-scale": section.globeScale,
  } as CSSProperties;
}

const PROGRESS_ANIMATION = "wl-tab-progress";

function tintVars(tints: [Tint, Tint]): CSSProperties {
  return {
    "--wl-tint-a": `var(--wl-${tints[0]})`,
    "--wl-tint-b": `var(--wl-${tints[1]})`,
  } as CSSProperties;
}

/**
 * Autoplay runs off the active tab's progress rail: the rail is a CSS
 * animation, and when it ends the next section takes over. Hovering or
 * focusing the tabs pauses the rail (and so the rotation), picking a tab
 * stops it, and reduced motion never starts it.
 */
function useHeroSections() {
  const [activeId, setActiveId] = useState(HERO_SECTIONS[0].id);
  const [isAutoplaying, setIsAutoplaying] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (query.matches) setIsAutoplaying(false);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const activeIndex = Math.max(
    0,
    HERO_SECTIONS.findIndex((section) => section.id === activeId)
  );

  function pick(id: string) {
    setActiveId(id);
    setIsAutoplaying(false);
  }

  function stop() {
    setIsAutoplaying(false);
  }

  function onProgressEnd(event: AnimationEvent<HTMLElement>) {
    if (event.animationName !== PROGRESS_ANIMATION) return;
    setActiveId(HERO_SECTIONS[(activeIndex + 1) % HERO_SECTIONS.length].id);
  }

  return {
    activeId,
    activeSection: HERO_SECTIONS[activeIndex],
    isAutoplaying,
    pick,
    stop,
    onProgressEnd,
  };
}

function HeroPanel({
  section,
  isActive,
}: {
  section: HeroSection;
  isActive: boolean;
}) {
  return (
    <VStack
      className="wl-hero-panel"
      gap={5}
      hAlign="start"
      id={`wl-hero-panel-${section.id}`}
      data-active={isActive ? "" : undefined}
      inert={!isActive}
      aria-hidden={!isActive}
    >
      <VStack gap={3} hAlign="start">
        <Heading
          level={isActive ? 1 : 2}
          type="display-1"
          textWrap="balance"
          className="wl-hero-title"
        >
          {section.title}
        </Heading>
      </VStack>
      <Text type="large" color="secondary" textWrap="pretty" maxLines={0}>
        {section.description}
      </Text>
      <VStack gap={3} hAlign="start">
        <HStack gap={3} wrap="wrap">
          {section.ctas.map((cta, index) => (
            <Button
              key={cta.href}
              className="wl-hero-cta"
              label={cta.label}
              variant={index === 0 ? "primary" : "secondary"}
              size="lg"
              icon={
                cta.icon != null ? (
                  <Icon icon={cta.icon} color="inherit" />
                ) : undefined
              }
              href={cta.href}
            />
          ))}
        </HStack>
        <HStack gap={5} wrap="wrap">
          {section.links.map((link) => (
            <Link
              key={link.href}
              className="wl-hero-link"
              href={link.href}
              isStandalone
              color="accent"
              weight="semibold"
              size="sm"
            >
              {link.label}
              <Icon icon={ArrowRightIcon} size="xsm" color="accent" />
            </Link>
          ))}
        </HStack>
      </VStack>
    </VStack>
  );
}

/**
 * The platform, as it looks right now: a screenshot of the active
 * section's page on a layered stand. Every section's picture is mounted so
 * a change of tab crossfades rather than reloads, and only the active one
 * is in the accessibility tree.
 *
 * A section with a video plays it here instead. The player mounts only
 * while its section is active, so leaving the tab stops playback, and
 * clicking into it calls `onEngage` so the tabs stop rotating away.
 */
function HeroShot({
  activeId,
  onEngage,
}: {
  activeId: string;
  onEngage: () => void;
}) {
  const playerRef = useRef<HTMLIFrameElement>(null);

  // A click inside a cross-origin player never reaches this page; the
  // window losing focus to the iframe is the only sign of it.
  useEffect(() => {
    function onBlur() {
      if (
        playerRef.current != null &&
        document.activeElement === playerRef.current
      ) {
        onEngage();
      }
    }
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [onEngage]);

  return (
    <Center className="wl-hero-shot-stand">
      <Grid className="wl-hero-shot" columns={1}>
        {HERO_SECTIONS.map((section, index) => {
          const isActive = section.id === activeId;
          const videoId =
            section.video != null ? youtubeVideoId(section.video.url) : null;
          if (section.video != null && videoId != null) {
            return isActive ? (
              <iframe
                key={section.id}
                ref={playerRef}
                className="wl-hero-shot-video"
                src={youtubeEmbedUrl(videoId)}
                title={section.video.title}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : null;
          }
          return (
            <Image
              key={section.id}
              className="wl-hero-shot-image"
              data-active={isActive ? "" : undefined}
              aria-hidden={!isActive}
              src={section.screenshot.src}
              alt={section.screenshot.alt}
              width={2160}
              height={1350}
              fetchPriority={index === 0 ? "high" : undefined}
              loading={index === 0 ? "eager" : "lazy"}
              // The optimizer fetches this file without a browser user
              // agent, and the proxy refuses that request.
              unoptimized
            />
          );
        })}
      </Grid>
    </Center>
  );
}

/**
 * A quiet row under the section tabs. It is not a carousel tab and never
 * auto-advances. Clicking it opens the importer.
 */
function HeroImportBar({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      className="wl-hero-import"
      label="Import a GitHub"
      variant="ghost"
      width="100%"
      icon={<Icon icon={CodeBracketIcon} size="sm" color="inherit" />}
      endContent={<Icon icon={ArrowRightIcon} size="xsm" color="inherit" />}
      onClick={onOpen}
      style={{ "--wl-i": HERO_SECTIONS.length } as CSSProperties}
    />
  );
}

/**
 * The repository field, mounted only while the dialog is open. It sits
 * outside the hero's dark theme so it follows the page.
 */
function ImportGithubDialog({
  isOpen,
  resume,
  onOpenChange,
}: {
  isOpen: boolean;
  resume: ImportResume | null;
  onOpenChange: (isOpen: boolean) => void;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={520}
    >
      <Layout
        header={
          <DialogHeader
            title="Import a GitHub"
            hasDivider
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Text type="supporting">
                Paste a repository link to create a connected idea and project.
              </Text>
              <ImportRepoForm resume={resume} />
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}

function HeroTab({
  section,
  index,
  isActive,
  onPick,
  onProgressEnd,
}: {
  section: HeroSection;
  index: number;
  isActive: boolean;
  onPick: (id: string) => void;
  onProgressEnd: (event: AnimationEvent<HTMLElement>) => void;
}) {
  return (
    <SelectableCard
      className="wl-hero-tab"
      label={`${section.tab}: ${section.where}`}
      isSelected={isActive}
      onChange={() => onPick(section.id)}
      padding={3}
      data-active={isActive ? "" : undefined}
      aria-controls={`wl-hero-panel-${section.id}`}
      onAnimationEnd={isActive ? onProgressEnd : undefined}
      style={{ ...tintVars(section.tints), "--wl-i": index } as CSSProperties}
    >
      <HStack
        className="wl-hero-tab-body"
        gap={2}
        vAlign="center"
        wrap="nowrap"
      >
        <Center
          className="wl-hero-tab-icon"
          data-stamp={section.icon === "stamp" ? "" : undefined}
        >
          {section.icon === "stamp" ? (
            <Image
              className="wl-hero-tab-stamp"
              src="/westride-stamp.png"
              alt=""
              width={1156}
              height={778}
              // The optimizer fetches this file without a browser user
              // agent, and the proxy refuses that request.
              unoptimized
            />
          ) : (
            <Icon icon={section.icon} size="sm" color="inherit" />
          )}
        </Center>
        <Text
          className="wl-hero-tab-label"
          size="sm"
          weight="bold"
          textWrap="balance"
          style={eyebrowStyle}
        >
          {section.tab}
        </Text>
      </HStack>
    </SelectableCard>
  );
}

const WAVE_WIDTH = 1440;
const WAVE_HEIGHT = 144;

/**
 * A wave along the bottom of the hero. Each one is drawn wider than the
 * box by at least one full period and then slid sideways by exactly one
 * period, so the loop is seamless. `flow` is the slide as a fraction of the
 * path's own width, which is what the CSS transform needs.
 */
type Wave = {
  d: string;
  /** One period as a fraction of the path width, negative to slide left. */
  flow: number;
  /** Seconds for one period, so each layer moves at its own pace. */
  seconds: number;
  isReversed: boolean;
  isFilled: boolean;
  opacity: number;
  strokeWidth?: number;
};

function makeWave({
  baseline,
  amplitude,
  halfPeriod,
  seconds,
  isReversed = false,
  isFilled,
  opacity,
  strokeWidth,
}: {
  baseline: number;
  amplitude: number;
  halfPeriod: number;
  seconds: number;
  isReversed?: boolean;
  isFilled: boolean;
  opacity: number;
  strokeWidth?: number;
}): Wave {
  const period = halfPeriod * 2;
  const periods = Math.ceil(WAVE_WIDTH / period) + 1;
  const width = periods * period;
  // Two control points a third of the way in, both at the same offset,
  // peak at three quarters of that offset.
  const control = amplitude / 0.75;
  let d = `M0 ${baseline}`;
  for (let i = 0; i < periods * 2; i++) {
    const x = i * halfPeriod;
    const cy = baseline + (i % 2 === 0 ? -control : control);
    d += ` C${x + halfPeriod / 3} ${cy} ${x + (halfPeriod * 2) / 3} ${cy} ${
      x + halfPeriod
    } ${baseline}`;
  }
  if (isFilled) d += ` V${WAVE_HEIGHT} H0 Z`;
  return {
    d,
    flow: period / width,
    seconds,
    isReversed,
    isFilled,
    opacity,
    strokeWidth,
  };
}

/** Back to front: broad slow swells behind, quicker thin lines in front. */
const WAVES: Wave[] = [
  makeWave({
    baseline: 56,
    amplitude: 24,
    halfPeriod: 480,
    seconds: 46,
    isFilled: true,
    opacity: 0.16,
  }),
  makeWave({
    baseline: 86,
    amplitude: 20,
    halfPeriod: 360,
    seconds: 36,
    isReversed: true,
    isFilled: true,
    opacity: 0.22,
  }),
  makeWave({
    baseline: 112,
    amplitude: 14,
    halfPeriod: 720,
    seconds: 28,
    isFilled: true,
    opacity: 0.3,
  }),
  makeWave({
    baseline: 44,
    amplitude: 22,
    halfPeriod: 480,
    seconds: 40,
    isReversed: true,
    isFilled: false,
    opacity: 0.7,
    strokeWidth: 2,
  }),
  makeWave({
    baseline: 78,
    amplitude: 16,
    halfPeriod: 288,
    seconds: 32,
    isFilled: false,
    opacity: 0.5,
    strokeWidth: 1.5,
  }),
];

/**
 * Layered swells and lines flowing along the bottom of the hero, each at
 * its own pace and some against the rest. The last, still path traces the
 * wave the hero's mask cuts (see `.wl-hero` in the styles), so the two must
 * change together.
 */
function HeroWave() {
  return (
    <svg
      className="wl-hero-wave"
      viewBox={`0 0 ${WAVE_WIDTH} ${WAVE_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="wl-wave-gradient"
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2={WAVE_WIDTH}
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="var(--wl-scene-a)" />
          <stop offset="0.5" stopColor="var(--wl-scene-b)" />
          <stop offset="1" stopColor="var(--wl-scene-c)" />
        </linearGradient>
        <linearGradient
          id="wl-wave-fade"
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="0"
          y1="0"
          y2={WAVE_HEIGHT}
        >
          <stop offset="0" stopColor="var(--wl-scene-b)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--wl-scene-a)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {WAVES.map((wave) => (
        <path
          key={wave.d}
          className="wl-wave-flow"
          data-reversed={wave.isReversed ? "" : undefined}
          d={wave.d}
          fill={wave.isFilled ? "url(#wl-wave-fade)" : "none"}
          stroke={wave.isFilled ? undefined : "url(#wl-wave-gradient)"}
          strokeWidth={wave.strokeWidth}
          vectorEffect={wave.isFilled ? undefined : "non-scaling-stroke"}
          opacity={wave.opacity}
          style={
            {
              "--wl-flow": `${(wave.flow * 100).toFixed(4)}%`,
              "--wl-flow-time": `${wave.seconds}s`,
            } as CSSProperties
          }
        />
      ))}
      <path
        d="M0 120C120 146.67 240 146.67 360 120C480 93.33 600 93.33 720 120C840 146.67 960 146.67 1080 120C1200 93.33 1320 93.33 1440 120"
        fill="none"
        stroke="url(#wl-wave-gradient)"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        opacity="0.8"
      />
    </svg>
  );
}

function CarryBar() {
  return (
    <HStack
      className="wl-carry"
      gap={4}
      maxWidth={CONTENT_WIDTH}
      vAlign="center"
      wrap="wrap"
      role="group"
      aria-label="Take WeStride with you"
    >
      <StackItem className="wl-carry-label">
        <Eyebrow>Take WeStride with you</Eyebrow>
      </StackItem>
      <StackItem size="fill">
        <Grid columns={{ minWidth: 150, max: 4 }} gap={2}>
          {MOBILE_APPS.map((app) => (
            <MobileAppTile key={app.href} app={app} />
          ))}
          {PLATFORM_SURFACES.map((surface) => (
            <PlatformTile key={surface.href} surface={surface} />
          ))}
        </Grid>
      </StackItem>
    </HStack>
  );
}

function Hero({ importResume }: LandingProps) {
  const { activeId, activeSection, isAutoplaying, pick, stop, onProgressEnd } =
    useHeroSections();
  const [isImportOpen, setIsImportOpen] = useState(importResume !== null);

  function openImport() {
    setIsImportOpen(true);
    stop();
  }

  function tab(section: HeroSection) {
    return (
      <HeroTab
        key={section.id}
        section={section}
        index={HERO_SECTIONS.findIndex((item) => item.id === section.id)}
        isActive={section.id === activeId}
        onPick={pick}
        onProgressEnd={onProgressEnd}
      />
    );
  }

  return (
    <>
      <Theme theme={themes[defaultThemeSlug]} mode="dark">
        <VStack className="wl-hero-frame" gap={0}>
          <Section
            className="wl-hero"
            variant="transparent"
            padding={0}
            style={sceneVars(activeSection)}
          >
            <HeroSky />
            <HeroGlobe glowToken={`--wl-${activeSection.tints[1]}`} />
            <HeroWave />
            <VStack
              className="wl-hero-content"
              gap={10}
              maxWidth={CONTENT_WIDTH + 200}
              style={centered}
            >
              <Grid
                className="wl-hero-split"
                columns={{ minWidth: 484, max: 2 }}
                gap={10}
                align="center"
              >
                <VStack className="wl-hero-copy" gap={6} hAlign="start">
                  <Image
                    className="wl-wordmark"
                    src="/logos/westride/WeStride_landscape_white.png"
                    alt="WeStride"
                    width={2582}
                    height={788}
                    preload
                    unoptimized
                  />

                  <Grid className="wl-hero-panels" columns={1} align="start">
                    {HERO_SECTIONS.map((section) => (
                      <HeroPanel
                        key={section.id}
                        section={section}
                        isActive={section.id === activeId}
                      />
                    ))}
                  </Grid>

                  <Text type="supporting" textWrap="pretty">
                    {"Open source. Powered by "}
                    <MetaLink href={META_MODELS_URL}>
                      Meta&apos;s AI models
                    </MetaLink>
                  </Text>
                </VStack>

                {/* The platform preview with the section tabs tucked in
                  behind its right edge, and import under the tabs. */}
                <VStack className="wl-hero-stage" gap={4} hAlign="end">
                  <HStack
                    className="wl-hero-stage-row"
                    gap={0}
                    vAlign="center"
                    wrap="nowrap"
                  >
                    <StackItem size="fill" className="wl-hero-stage-shot">
                      <HeroShot activeId={activeId} onEngage={stop} />
                    </StackItem>
                    <VStack
                      className="wl-hero-tabs"
                      gap={2}
                      role="group"
                      aria-label="What would you like to do?"
                      data-autoplay={isAutoplaying ? "" : undefined}
                    >
                      {HERO_SECTIONS.map(tab)}
                      <HeroImportBar onOpen={openImport} />
                    </VStack>
                  </HStack>
                </VStack>
              </Grid>
            </VStack>
          </Section>
          <CarryBar />
        </VStack>
      </Theme>
      {isImportOpen ? (
        <ImportGithubDialog
          isOpen={isImportOpen}
          resume={importResume}
          onOpenChange={setIsImportOpen}
        />
      ) : null}
    </>
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

/**
 * A line along a wavy section edge. The path traces the curve the studios
 * band's mask cuts (see `.wl-studios` in the styles), so those two must
 * change together. Without `color` the stroke is the brand gradient, and
 * `id` keeps each gradient unique. The studios band's bottom edge stays
 * its own pastel.
 */
function StudiosEdge({
  edge,
  id,
  color,
}: {
  edge: "top" | "bottom";
  id: string;
  color?: string;
}) {
  const gradientId = `${id}-gradient-${edge}`;
  return (
    <svg
      className="wl-studios-edge"
      data-edge={edge}
      viewBox="0 0 1440 48"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {color == null ? (
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="1440"
            y1="0"
            y2="0"
          >
            <stop offset="0" stopColor="var(--wl-indigo)" />
            <stop offset="0.5" stopColor="var(--wl-purple)" />
            <stop offset="1" stopColor="var(--wl-teal)" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d={
          edge === "top"
            ? "M0 24C240 0 480 0 720 24C960 48 1200 48 1440 24"
            : "M0 24C240 48 480 48 720 24C960 0 1200 0 1440 24"
        }
        fill="none"
        stroke={color ?? `url(#${gradientId})`}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        opacity={color == null ? 0.6 : 1}
      />
    </svg>
  );
}

function StudiosSection() {
  return (
    <Section className="wl-studios" variant="transparent" padding={0}>
      <StudiosEdge edge="top" id="wl-studios" />
      <Container>
        <SectionIntro
          eyebrow="Workshop. Build. Create."
          title="From your first idea to what comes next."
          lede="Explore possibilities, develop ideas, and build real projects with Meta AI. WeStride brings together AI-powered tools, coding agents, and a community of creators to help you move forward, wherever you are starting."
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
                        "--wl-tint-ink": `var(--wl-${studio.tints[0]}-ink)`,
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
      </Container>
    </Section>
  );
}

/* --------------------------- Meta AI ---------------------------- */

function MetaAiSection() {
  return (
    <Section variant="transparent" padding={0}>
      <Container>
        <SectionIntro
          eyebrow="Powered by Meta AI"
          title={
            <>
              From your first idea to working code. Powered by{" "}
              <Image
                className="wl-title-logo wl-title-logo-light"
                src="/logos/meta-ai.png"
                alt="Meta AI"
                width={1084}
                height={209}
                unoptimized
              />
              <Image
                className="wl-title-logo wl-title-logo-dark"
                src="/logos/meta-ai-light.png"
                alt=""
                width={1084}
                height={209}
                unoptimized
              />
            </>
          }
          lede="WeStride brings Meta's Muse AI models into every stage of your journey. Explore possibilities with AI advisors, turn ideas into actionable development plans, and build real projects in GitHub with Muse Code agents. All in one open-source platform."
        />
        <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>
          {META_MODELS.map((model, index) => (
            <Card
              key={model.name}
              className="wl-feature wl-pastel wl-reveal"
              variant="transparent"
              padding={6}
              style={
                {
                  ...revealDelay(index + 1),
                  "--wl-pastel": `var(--color-brand-pastel-${model.pastel})`,
                } as CSSProperties
              }
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
                  <Text
                    type="supporting"
                    size="xsm"
                    weight="semibold"
                    style={eyebrowStyle}
                  >
                    {model.role}
                  </Text>
                  <Heading level={3}>{model.name}</Heading>
                </VStack>
                <Text type="supporting">{model.detail}</Text>
              </VStack>
            </Card>
          ))}
        </Grid>
        <VStack gap={4} className="wl-reveal">
          <VStack gap={2}>
            <Eyebrow>Built for real workflows</Eyebrow>
            <Text type="supporting">{META_CAPABILITIES.join(" · ")}</Text>
          </VStack>
          <VStack gap={2}>
            <Text type="supporting">
              Start exploring WeStride with free learning resources. Connect
              your own Meta account to use your API key and credits for
              AI-powered work.
            </Text>
            <HStack gap={1} vAlign="center">
              <Link href="/settings" isStandalone>
                Connect your Meta account
              </Link>
              <Icon icon={ArrowRightIcon} size="xsm" color="accent" />
            </HStack>
          </VStack>
        </VStack>
        <VStack className="wl-reveal" gap={5}>
          <VStack gap={2}>
            <Eyebrow>Inside WeStride</Eyebrow>
            <Heading level={3} textWrap="balance">
              Meta&apos;s models, at every step.
            </Heading>
          </VStack>
          <Grid columns={{ minWidth: 220, max: 3 }} gap={4}>
            {META_MODEL_LINEUP.map((model) => (
              <Card
                key={model.name}
                className="wl-feature wl-model-card"
                padding={5}
              >
                <VStack gap={2}>
                  <Heading
                    level={4}
                    className="wl-model-name"
                    style={
                      { "--wl-dot": `var(--wl-${model.tint})` } as CSSProperties
                    }
                  >
                    {model.name}
                  </Heading>
                  <Text type="supporting" size="sm">
                    {model.detail}
                  </Text>
                </VStack>
              </Card>
            ))}
          </Grid>
        </VStack>
      </Container>
    </Section>
  );
}

/* -------------------------- Hackathon --------------------------- */

function HackathonSection() {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <Section className="wl-band" variant="transparent" padding={0}>
        <Container gap={10}>
          <Grid columns={{ minWidth: 320, max: 2 }} gap={8} align="center">
            <VStack gap={5} className="wl-reveal">
              <Eyebrow>Our origin</Eyebrow>
              <Heading level={2} type="display-3" textWrap="balance">
                Born at the {HACKATHON_NAME}.
              </Heading>
              <Text type="large" color="secondary" textWrap="pretty">
                WeStride began at the 2026 {HACKATHON_NAME}, hosted by Cerebral
                Valley. Built from the ground up using Meta&apos;s AI
                technologies, what started as a hackathon project became a
                platform designed to make exploring, learning, and building with
                AI more accessible.
              </Text>
              <Text textWrap="pretty">
                From workshopping an idea to writing real code, WeStride brings
                the tools, knowledge, and opportunities of AI into one connected
                experience.
              </Text>
              <HStack gap={2} wrap="wrap">
                <Button
                  label="Explore Our Story"
                  variant="primary"
                  href="/our-story"
                />
                <Button
                  label="View on GitHub"
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  endContent={<Icon icon={ArrowRightIcon} color="inherit" />}
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
                      <Text weight="semibold">Build Timeline</Text>
                      <Text type="supporting">
                        10 Days. One Vision. Built with Meta AI.
                      </Text>
                    </VStack>
                  </StackItem>
                </HStack>
                <Stepper
                  orientation="vertical"
                  activeStep={CURRENT_MILESTONE_STEP}
                  density="compact"
                  label="What shipped each day"
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

          <Grid columns={{ minWidth: 320, max: 2 }} gap={8} align="center">
            <VStack gap={3} className="wl-reveal">
              <Heading level={3} textWrap="balance">
                One builder, one hackathon, and a vision for what comes next.
              </Heading>
              <Text color="secondary" textWrap="pretty">
                WeStride began with a problem Garrett Hampton kept seeing
                throughout the hackathon: people had ideas and ambitions, but
                not everyone had the same experience, tools, or resources to
                bring them to life.
              </Text>
              <Text color="secondary" textWrap="pretty">
                Built during the 2026 {HACKATHON_NAME}, WeStride brings
                learning, AI-powered advisors, development tools, and mentorship
                into one platform designed to help people move forward, wherever
                they are starting.
              </Text>
              <Text weight="semibold" textWrap="balance">
                Every Idea. Every Ambition. Every Stride.
              </Text>
            </VStack>
            <VStack gap={5} className="wl-reveal" style={revealDelay(2)}>
              <VStack gap={2} hAlign="center">
                <Avatar
                  src={FOUNDER.photo}
                  name={FOUNDER.name}
                  size={72}
                  tooltip={false}
                />
                <VStack gap={0.5} hAlign="center">
                  <Text weight="semibold" justify="center">
                    {FOUNDER.name}
                  </Text>
                  <Text type="supporting" size="sm" justify="center">
                    {FOUNDER.title}
                  </Text>
                  <Text size="sm" justify="center">
                    {FOUNDER.tagline}
                  </Text>
                </VStack>
              </VStack>
              <HStack hAlign="center">
                <Button
                  label="Read Our Story"
                  href="/our-story"
                  endContent={<Icon icon={ArrowRightIcon} color="inherit" />}
                />
              </HStack>
            </VStack>
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
    <Section className="wl-dots" variant="transparent" padding={0}>
      <Container>
        <SectionIntro
          eyebrow="Integrations"
          title="Your tools. Your workflow. All connected."
          lede="Connect the platforms you already use to bring your ideas, projects, and AI-powered workflows together. From building with Meta AI and GitHub to collaborating across your favorite apps, WeStride helps you create, learn, and build wherever you work."
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
    <Section className="wl-stack" variant="transparent" padding={0}>
      <StudiosEdge
        edge="top"
        id="wl-stack"
        color="var(--color-brand-pastel-blue)"
      />
      <Container gap={10}>
        <SectionIntro
          align="center"
          eyebrow="Open source. All the way down."
          title="Built in the open. Made for everyone."
          lede="WeStride is an open-source platform built with Meta's AI models and modern development tools. Explore the technology behind the platform, see how it works, contribute to its development, or build something of your own. The code is open, and the possibilities are yours to explore."
        />

        <VStack gap={4} className="wl-reveal" style={revealDelay(1)}>
          <VStack gap={2} hAlign="center">
            <Heading level={3} justify="center" textWrap="balance">
              The technology behind WeStride
            </Heading>
            <Text type="supporting" justify="center">
              {STACK_LINE}
            </Text>
          </VStack>
          <MarqueeRow items={STACK_ROWS[0]} direction="forward" />
          <MarqueeRow items={STACK_ROWS[1]} direction="reverse" />
        </VStack>

        <Grid columns={{ minWidth: 320, max: 2 }} gap={8} align="center">
          <VStack gap={4} className="wl-reveal">
            <Heading level={3} textWrap="balance">
              Explore the code. Build what comes next.
            </Heading>
            <Text type="supporting" textWrap="pretty">
              Go beyond using AI. Explore the WeStride GitHub repository,
              understand how the platform works, and discover the tools and
              architecture behind it. Clone the code, customize it, and make it
              your own.
            </Text>
            <HStack gap={3} wrap="wrap" vAlign="center">
              <Button
                label="Explore on GitHub"
                variant="primary"
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                endContent={
                  <Icon icon={ArrowTopRightOnSquareIcon} color="inherit" />
                }
              />
              <Link href="/our-story/tech-stack" isStandalone>
                Tech Stack
              </Link>
              <Link href="/settings/api" isStandalone>
                API
              </Link>
              <Link href="/settings/mcp" isStandalone>
                MCP
              </Link>
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
      <StudiosEdge
        edge="bottom"
        id="wl-stack"
        color="var(--color-brand-pastel-blue)"
      />
    </Section>
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
            <MetaAiSection />
            <StudiosSection />
            <IntegrationsSection />
            <StackSection />
            <HackathonSection />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
