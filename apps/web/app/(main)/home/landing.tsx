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
import {
  AcademicCapIcon,
  CodeBracketIcon,
  HeartIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { defaultThemeSlug, themes } from "@/astryx-themes";
import {
  CLONE_SNIPPET,
  COMMITS_URL,
  CURRENT_MILESTONE_STEP,
  HACKATHON_LOGO,
  HACKATHON_NAME,
  HACKATHON_URL,
  INTEGRATIONS,
  META_MODELS,
  MILESTONES,
  MOBILE_APPS,
  PLATFORM_SURFACES,
  SOURCE_URL,
  STACK_ROWS,
  STUDIOS,
  SUPPORT,
  SUPPORTER_WAYS,
  FOUNDER,
  type Integration,
  type MobileApp,
  type PlatformSurface,
  type StackLogo,
  type Tint,
} from "./landing-content";
import { HeroGlobe } from "./hero-globe";
import { ImportRepoForm } from "./import-repo-form";
import { LANDING_STYLES } from "./landing-styles";

export type LandingStats = {
  advisors: number;
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
            <Icon
              icon={ArrowTopRightOnSquareIcon}
              size="xsm"
              color="secondary"
            />
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

const META_AI_URL = "https://meta.ai";
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
  /** Where the tab leads, shown under its label and as the panel eyebrow. */
  where: string;
  title: ReactNode;
  description: ReactNode;
  ctas: HeroCta[];
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tints: [Tint, Tint];
  /** This panel's action is the GitHub import field, in place of buttons. */
  hasImport?: boolean;
};

const [IDEA_STUDIO, BUILD_STUDIO, AGENT_STUDIO] = STUDIOS;

/**
 * What a visitor can do here, one panel each. The tab on the right picks
 * the panel; the panel's own copy and calls to action change with it.
 * Panels auto-advance until the visitor picks one.
 */
const HERO_SECTIONS: HeroSection[] = [
  {
    id: "import",
    tab: "Import a GitHub",
    where: "Importing",
    title: (
      <>
        Import a{" "}
        <Text type="inherit" display="inline" className="wl-gradient-text">
          GitHub.
        </Text>
      </>
    ),
    description:
      "Import any GitHub repository to instantly create a connected Idea and Project in WeStride. Explore new possibilities with AI advisors, collaborate on improvements, and bring your project to life.",
    ctas: [],
    icon: CodeBracketIcon,
    tints: ["yellow", "orange"],
    hasImport: true,
  },
  {
    id: "idea",
    tab: IDEA_STUDIO.action,
    where: IDEA_STUDIO.where,
    title: (
      <>
        Start with an idea{" "}
        <Text type="inherit" display="inline" className="wl-gradient-text">
          worth building.
        </Text>
      </>
    ),
    description: (
      <>
        Turn your business, nonprofit, game, or open-source idea into a plan
        worth building. Collaborate with{" "}
        <MetaLink href={META_AI_URL}>Meta AI</MetaLink> advisors to brainstorm,
        research, challenge assumptions, and refine your vision before writing a
        single line of code.
      </>
    ),
    ctas: [
      {
        label: IDEA_STUDIO.action,
        href: IDEA_STUDIO.href,
        icon: IDEA_STUDIO.icon,
      },
      { label: "Learn the basics", href: "/academy", icon: AcademicCapIcon },
    ],
    icon: IDEA_STUDIO.icon,
    tints: IDEA_STUDIO.tints,
  },
  {
    id: "build",
    tab: BUILD_STUDIO.action,
    where: BUILD_STUDIO.where,
    title: (
      <>
        Build it for real,{" "}
        <Text type="inherit" display="inline" className="wl-gradient-text">
          in GitHub.
        </Text>
      </>
    ),
    description: (
      <>
        {
          "Projects, tickets, and a linked repository. Muse drafts the backlog and roadmap, then "
        }
        <MetaLink href={MUSE_CODE_URL}>Meta Muse Code</MetaLink>
        {" agents work the tickets and open pull requests, directly in GitHub."}
      </>
    ),
    ctas: [
      {
        label: BUILD_STUDIO.action,
        href: BUILD_STUDIO.href,
        icon: BUILD_STUDIO.icon,
      },
      { label: "Find a mentor", href: "/mentorship", icon: UserGroupIcon },
    ],
    icon: BUILD_STUDIO.icon,
    tints: BUILD_STUDIO.tints,
  },
  {
    id: "agent",
    tab: AGENT_STUDIO.action,
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
        {"Design the "}
        <MetaLink href={MUSE_URL}>Muse AI</MetaLink>
        {
          " agents a project needs, give each one a job, and run them as a fleet, so the product keeps working after you ship it."
        }
      </>
    ),
    ctas: [
      {
        label: AGENT_STUDIO.action,
        href: AGENT_STUDIO.href,
        icon: AGENT_STUDIO.icon,
      },
      { label: "Connect your Meta account", href: "/settings" },
    ],
    icon: AGENT_STUDIO.icon,
    tints: AGENT_STUDIO.tints,
  },
  {
    id: "support",
    tab: "Support a project",
    where: "Supporting",
    title: (
      <>
        Back an idea{" "}
        <Text type="inherit" display="inline" className="wl-gradient-text">
          you believe in.
        </Text>
      </>
    ),
    description:
      "Pledge tokens or compute to the ideas you choose, or contribute capital through a team's own links. WeStride never collects or holds money.",
    ctas: SUPPORTER_WAYS.map((way) => ({
      label: way.action,
      href: way.href,
      icon: way.icon,
    })),
    icon: HeartIcon,
    tints: ["teal", "green"],
  },
];

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

  function onProgressEnd(event: AnimationEvent<HTMLElement>) {
    if (event.animationName !== PROGRESS_ANIMATION) return;
    setActiveId(HERO_SECTIONS[(activeIndex + 1) % HERO_SECTIONS.length].id);
  }

  return { activeId, isAutoplaying, pick, onProgressEnd };
}

function HeroPanel({
  section,
  isActive,
  isSignedIn,
}: {
  section: HeroSection;
  isActive: boolean;
  isSignedIn: boolean;
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
      {section.ctas.length > 0 && (
        <HStack gap={2} wrap="wrap">
          {section.ctas.map((cta, index) => (
            <Button
              key={cta.href}
              label={cta.label}
              variant={index === 0 ? "primary" : undefined}
              size="lg"
              href={cta.href}
              icon={
                cta.icon != null ? (
                  <Icon icon={cta.icon} color="inherit" />
                ) : undefined
              }
            />
          ))}
        </HStack>
      )}
      {section.hasImport && (
        <VStack gap={2} width="100%" className="wl-hero-import">
          <ImportRepoForm isSignedIn={isSignedIn} />
        </VStack>
      )}
    </VStack>
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
        gap={3}
        vAlign="center"
        wrap="nowrap"
      >
        <Center className="wl-hero-tab-icon">
          <Icon icon={section.icon} size="md" color="inherit" />
        </Center>
        <VStack gap={0}>
          <Text weight="semibold" textWrap="balance">
            {section.tab}
          </Text>
          <Text type="supporting" size="xsm" textWrap="nowrap">
            {section.where}
          </Text>
        </VStack>
      </HStack>
    </SelectableCard>
  );
}

const STUDIO_TAB_IDS = new Set(["idea", "build", "agent"]);

/**
 * Tinted swells along the bottom of the hero. The last path traces the
 * wave the hero's mask cuts (see `.wl-hero` in the styles), so the two must
 * change together.
 */
function HeroWave() {
  return (
    <svg
      className="wl-hero-wave"
      viewBox="0 0 1440 144"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="wl-wave-gradient"
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
      <path
        className="wl-wave-swell"
        d="M0 76C160 49.33 320 49.33 480 76C640 102.67 800 102.67 960 76C1120 49.33 1280 49.33 1440 76V144H0Z"
        fill="url(#wl-wave-gradient)"
        opacity="0.16"
      />
      <path
        className="wl-wave-swell"
        d="M0 100C120 78.67 240 78.67 360 100C480 121.33 600 121.33 720 100C840 78.67 960 78.67 1080 100C1200 121.33 1320 121.33 1440 100V144H0Z"
        fill="url(#wl-wave-gradient)"
        opacity="0.24"
      />
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

function Hero({ isSignedIn }: LandingProps) {
  const { activeId, isAutoplaying, pick, onProgressEnd } = useHeroSections();

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
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <VStack className="wl-hero-frame" gap={0}>
        <Section className="wl-hero" variant="transparent" padding={0}>
          <HeroSky />
          <HeroWave />
          <VStack
            className="wl-hero-content"
            gap={10}
            maxWidth={CONTENT_WIDTH}
            style={centered}
          >
            <Grid
              className="wl-hero-split"
              columns={{ minWidth: 484, max: 2 }}
              gap={8}
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
                      isSignedIn={isSignedIn}
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

              <Grid className="wl-hero-stage" columns={1} align="center">
                <HeroGlobe />
                <VStack
                  className="wl-hero-tabs"
                  gap={3}
                  role="group"
                  aria-label="What would you like to do?"
                  data-autoplay={isAutoplaying ? "" : undefined}
                >
                  {HERO_SECTIONS.filter(
                    (section) => section.id === "import"
                  ).map(tab)}
                  <VStack className="wl-hero-tab-group" gap={0}>
                    {HERO_SECTIONS.filter((section) =>
                      STUDIO_TAB_IDS.has(section.id)
                    ).map(tab)}
                  </VStack>
                  {HERO_SECTIONS.filter(
                    (section) => section.id === "support"
                  ).map(tab)}
                </VStack>
              </Grid>
            </Grid>
          </VStack>
        </Section>
        <CarryBar />
      </VStack>
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
              >
                <HStack gap={3} vAlign="center">
                  <Center
                    className="wl-feature-icon"
                    style={
                      {
                        "--wl-tint": `var(--wl-${step.tints[0]})`,
                      } as CSSProperties
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
    <Section variant="transparent" padding={0}>
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
        <Container gap={10}>
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
                One builder, one hackathon, and a problem I kept seeing in the
                Discord
              </Heading>
              <Text color="secondary" textWrap="pretty">
                Team after team was ideating, vetting, and researching. The
                people doing it could not have been more different: students on
                a first project, people who had never written code, and
                engineers with decades behind them. The project was not any one
                of my ideas. It was the path all of them were walking.
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
                    {FOUNDER.role}
                  </Text>
                </VStack>
              </VStack>
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
    <Section className="wl-stack" variant="transparent" padding={0}>
      <StudiosEdge
        edge="top"
        id="wl-stack"
        color="var(--color-brand-pastel-blue)"
      />
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
              <Button label="Tech stack" href="/our-story/tech-stack" />
              <Button label="API" variant="ghost" href="/settings/api" />
              <Button label="MCP" variant="ghost" href="/settings/mcp" />
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
