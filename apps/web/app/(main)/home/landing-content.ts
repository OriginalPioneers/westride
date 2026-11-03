import type { ComponentType, SVGProps } from "react";
import {
  AcademicCapIcon,
  BanknotesIcon,
  BoltIcon,
  CodeBracketSquareIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  LightBulbIcon,
  SparklesIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { APP_STORE_URL, PLAY_STORE_URL, STORE_LINKS } from "../../store-links";
import { PROJECT_REPOSITORY } from "../legal-document";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const SOURCE_URL = PROJECT_REPOSITORY;
export const COMMITS_URL = `${PROJECT_REPOSITORY}/commits/main`;
export const HACKATHON_NAME = "Meta Global AI Developer Hackathon";
export const HACKATHON_URL =
  "https://cerebralvalley.ai/e/meta-ai-developer-hackathon";
export const HACKATHON_LOGO = "/logos/meta-global-ai-developer-hackathon.jpg";

/** Brand accent aliases defined on the landing root: `--wl-<tint>`. */
export type Tint =
  | "indigo"
  | "purple"
  | "blue"
  | "teal"
  | "green"
  | "pink"
  | "orange"
  | "yellow";

/** The brand pastels the theme publishes as `--color-brand-pastel-<name>`. */
export type Pastel = "blue" | "indigo" | "purple" | "teal" | "orange";

export type PathStep = {
  step: string;
  where: string;
  href: string;
  how: string;
  icon: IconComponent;
  tints: [Tint, Tint];
};

export type Studio = PathStep & {
  /** The call to action that opens this studio. */
  action: string;
};

/** The three studios an idea moves through on its way to a shipped product. */
export const STUDIOS: Studio[] = [
  {
    step: "Shape the idea",
    where: "Idea Studio",
    action: "Workshop an idea",
    href: "/ideas",
    how: "Bring a business, non-profit, game, open-source, website, or mobile app idea. A team of Muse advisors pressure-tests it with live research and cited sources, so you know what holds up before you build.",
    icon: LightBulbIcon,
    tints: ["indigo", "purple"],
  },
  {
    step: "Build it for real",
    where: "Build Studio",
    action: "Build a project",
    href: "/build",
    how: "Projects, tickets, and a linked GitHub repository. Muse drafts the backlog and roadmap, and Muse Code agents work the tickets and open pull requests.",
    icon: WrenchScrewdriverIcon,
    tints: ["blue", "teal"],
  },
  {
    step: "Give it agents",
    where: "Agent Studio",
    action: "Manage an AI agent fleet",
    href: "/agents",
    how: "Design the Muse agents a project needs, give each one a job, and add them to it, so the product keeps working after you ship it.",
    icon: CpuChipIcon,
    tints: ["orange", "pink"],
  },
];

export type SupporterWay = {
  /** The hero call to action. */
  action: string;
  href: string;
  /** One line on what the supporter gives. */
  how: string;
  icon: IconComponent;
};

/**
 * Three ways to back an idea without joining its team. WeStride never
 * collects or holds money: capital goes through links the team lists.
 */
export const SUPPORTER_WAYS: SupporterWay[] = [
  {
    action: "Pledge tokens",
    href: "/supporting?kind=tokens",
    how: "Let a team's agents run on your Meta API key, up to a cap you set.",
    icon: SparklesIcon,
  },
  {
    action: "Pledge compute",
    href: "/supporting?kind=compute",
    how: "Run agent jobs on your own computer, in an isolated container.",
    icon: ComputerDesktopIcon,
  },
  {
    action: "Pledge capital",
    href: "/supporting?kind=capital",
    how: "Contribute through the links a team lists, outside WeStride.",
    icon: BanknotesIcon,
  },
];

/** Help along the way, for anyone who wants to learn or find a guide first. */
export const SUPPORT: PathStep[] = [
  {
    step: "Learn the basics",
    where: "Academy",
    href: "/academy",
    how: "Short tracks on AI fundamentals, prompting, and agents, with challenges Muse gives feedback on.",
    icon: AcademicCapIcon,
    tints: ["purple", "blue"],
  },
  {
    step: "Find a mentor",
    where: "Mentorship",
    href: "/mentorship",
    how: "Free, one-to-one guidance from builders who have shipped before.",
    icon: UserGroupIcon,
    tints: ["teal", "green"],
  },
];

export type MobileApp = {
  name: string;
  store: string;
  href: string;
  logo: string;
};

export const MOBILE_APPS: MobileApp[] = [
  { name: "iOS app", store: "App Store", href: APP_STORE_URL, logo: "/logos/apple.svg" },
  {
    name: "Android app",
    store: "Google Play",
    href: PLAY_STORE_URL,
    logo: "/logos/android.svg",
  },
];

/** Compact links under the mobile apps: the platform, without a store. */
export type PlatformSurface = {
  name: string;
  detail: string;
  href: string;
  label: string;
  logo?: string;
  icon?: IconComponent;
};

export const PLATFORM_SURFACES: PlatformSurface[] = [
  {
    name: "API",
    detail: "Public REST",
    href: "/settings/api",
    label: "WeStride public API",
    icon: CodeBracketSquareIcon,
  },
  {
    name: "MCP",
    detail: "AI assistants",
    href: "/settings/mcp",
    label: "WeStride MCP server",
    logo: "/logos/model-context-protocol.svg",
  },
];

export type MetaModel = {
  name: string;
  role: string;
  detail: string;
  icon: IconComponent;
  /** The card's field. */
  pastel: Pastel;
  /** The icon's ink, the brand color the pastel is a tint of. */
  tint: Tint;
};

export const META_MODELS: MetaModel[] = [
  {
    name: "Muse Spark and Muse Wonder",
    role: "The advisory team",
    detail:
      "Every Idea Studio advisor is Muse with its own specialist brief. Advisors search the web, cite sources, and answer in structured JSON the page renders directly. Members pick Muse Spark 1.3 or Muse Wonder 1.0 and see what each request cost.",
    icon: SparklesIcon,
    pastel: "blue",
    tint: "blue",
  },
  {
    name: "Muse planning",
    role: "The product manager",
    detail:
      "In Build Studio, Muse reads the project, the linked idea, and the repository README, then drafts a backlog and roadmap and ranks the open tickets. Every ticket is a self-contained brief, ready for a coding agent.",
    icon: BoltIcon,
    pastel: "purple",
    tint: "purple",
  },
  {
    name: "Muse Code agents",
    role: "The engineer",
    detail:
      "Hand a ticket to Muse Code without installing anything. WeStride starts an isolated sandbox, clones the repo, runs Muse Code headless on a branch, streams the work log live, and opens a pull request when it finishes.",
    icon: CommandLineIcon,
    pastel: "teal",
    tint: "teal",
  },
];

export type Integration = {
  name: string;
  detail: string;
  href: string;
  isExternal?: boolean;
  /** Path under /public, drawn on a light tile. */
  logo?: string;
  icon?: IconComponent;
};

export const INTEGRATIONS: Integration[] = [
  {
    name: "GitHub",
    detail: "Link repositories to projects. Muse Code agents open pull requests on them.",
    href: "/build",
    logo: "/logos/github.svg",
  },
  {
    name: "Meta account",
    detail: "Validate and build on your own Muse key and credits, through the same device sign-in Muse Code uses.",
    href: "/settings",
    logo: "/logos/meta.svg",
  },
  {
    name: "Slack",
    detail: "Type /westride in any workspace with the WeStride app installed.",
    href: "/settings",
    logo: "/logos/slack.png",
  },
  {
    name: "Discord",
    detail: "The same /westride commands in any server or direct message.",
    href: "/settings",
    logo: "/logos/discord.svg",
  },
  {
    name: "WhatsApp",
    detail: "Message WeStride from your phone and get the Academy in reply.",
    href: "/settings",
    logo: "/logos/whatsapp.svg",
  },
  {
    name: "MCP server",
    detail: "Let ChatGPT, Claude, and Cursor read WeStride data through the Model Context Protocol.",
    href: "/settings/mcp",
    logo: "/logos/model-context-protocol.svg",
  },
  {
    name: "Public API",
    detail: "A read-only REST API with an OpenAPI document and an interactive explorer.",
    href: "/settings/api",
    icon: CodeBracketSquareIcon,
  },
  {
    name: "iOS and Android",
    detail: "The Academy in your pocket, built with Expo and React Native.",
    href: STORE_LINKS[0].href,
    isExternal: true,
    icon: DevicePhoneMobileIcon,
  },
];

export type StackLogo = { name: string; logo: string };

/** Two marquee rows. Logos live under public/logos. */
export const STACK_ROWS: StackLogo[][] = [
  [
    { name: "Next.js", logo: "/logos/nextjs.png" },
    { name: "React", logo: "/logos/react.png" },
    { name: "TypeScript", logo: "/logos/typescript.png" },
    { name: "Astryx", logo: "/logos/astryx.svg" },
    { name: "Heroicons", logo: "/logos/heroicons.svg" },
    { name: "Expo", logo: "/logos/expo.png" },
    { name: "React Native", logo: "/logos/react-native.png" },
    { name: "Storybook", logo: "/logos/storybook.png" },
    { name: "Zod", logo: "/logos/zod.svg" },
  ],
  [
    { name: "PostgreSQL", logo: "/logos/postgresql.png" },
    { name: "Neon", logo: "/logos/neon.svg" },
    { name: "Drizzle ORM", logo: "/logos/drizzle.svg" },
    { name: "Hono", logo: "/logos/hono.svg" },
    { name: "Clerk", logo: "/logos/clerk.svg" },
    { name: "Vercel", logo: "/logos/vercel.svg" },
    { name: "Bun", logo: "/logos/bun.svg" },
    { name: "Turborepo", logo: "/logos/turborepo.png" },
    { name: "Node.js", logo: "/logos/nodejs.svg" },
    { name: "Model Context Protocol", logo: "/logos/model-context-protocol.svg" },
  ],
];

export type Milestone = {
  date: string;
  built: string;
  /** Still ahead of us: shown as upcoming, and left out of the shipped list. */
  isPlanned?: boolean;
};

/** What shipped each day of the building period. Kickoff was October 26, 2026. */
export const MILESTONES: Milestone[] = [
  {
    date: "October 26",
    built:
      "Kickoff. Created the repository and set up the website, sign-in, the design site, the Academy data model, and the WeStride stamp.",
  },
  {
    date: "October 27",
    built:
      "Seeded the Academy tracks, achievements, and Mentorship. Shipped the public API, the MCP server, and the first iOS and Android builds.",
  },
  {
    date: "October 28",
    built:
      "Opened Idea Studio with its Muse advisory team. Added the achievement track, Muse learning challenges, and the Muse dock.",
  },
  {
    date: "October 29",
    built:
      "Connected GitHub and Meta accounts, and started Build Studio: projects, tickets, Muse planning, and Muse Code agent runs.",
  },
  {
    date: "October 30",
    built:
      "Added the game and open-source idea paths with their own advisors, repository creation from a new project, and the mentor request form.",
  },
  {
    date: "October 31",
    built:
      "Opened Agent Studio: standing Muse agents with backlogs, schedules, report and code jobs, and a usage ledger. Added GitHub import and idea claims.",
  },
  {
    date: "November 1",
    built:
      "Shipped Supporters: token and compute pledges, the supporter runner, and capital links. Added Vercel Sandbox on members' own accounts, Muse Image pictures for ideas, projects, and agents, and Muse Voice dictation on every long field.",
  },
  {
    date: "November 2",
    built:
      "Licensed the code under Apache 2.0, reviewed the platform against the judging rubric, and reorganised the header around the four studios.",
  },
  {
    date: "November 3",
    built:
      "Last full day of building. Demo video, seeded public ideas and projects, and submission checks.",
    isPlanned: true,
  },
  {
    date: "November 4",
    built: "Submission day. The building period closes and judging begins.",
    isPlanned: true,
  },
];

/** The days whose work has landed, for the "what we built" tables. */
export const SHIPPED_MILESTONES = MILESTONES.filter(
  (milestone) => !milestone.isPlanned,
);

/** The Stepper's current step: the first day still ahead, or the last day. */
export const CURRENT_MILESTONE_STEP = Math.max(
  0,
  MILESTONES.findIndex((milestone) => milestone.isPlanned) === -1
    ? MILESTONES.length - 1
    : MILESTONES.findIndex((milestone) => milestone.isPlanned),
);

/** The one person who built WeStride. */
export const FOUNDER = {
  name: "Garrett Hampton",
  role: "Founder. Design, code, and AI",
  photo: "/founder/garrett-hampton.jpg",
} as const;

export const CLONE_SNIPPET = `git clone ${SOURCE_URL}.git
cd westride && bun install
bun run dev:web   # http://localhost:3000`;
