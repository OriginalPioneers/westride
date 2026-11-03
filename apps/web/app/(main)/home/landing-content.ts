import type { ComponentType, SVGProps } from "react";
import {
  BanknotesIcon,
  BoltIcon,
  CodeBracketSquareIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  LightBulbIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import {
  ANDROID_BETA_PATH,
  IOS_BETA_PATH,
  MOBILE_APPS_PATH,
} from "../../store-links";
import { PROJECT_REPOSITORY } from "../legal-document";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const SOURCE_URL = PROJECT_REPOSITORY;
export const HACKATHON_NAME = "Meta Global AI Developer Hackathon";
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
    step: "Explore the possibilities.",
    where: "Idea Workshop",
    action: "Workshop an Idea",
    href: "/ideas",
    how: "Bring your business, nonprofit, game, or open-source idea to life through collaborative brainstorming, research, and feedback. Work alongside Meta AI advisors to explore opportunities, challenge assumptions, and shape your next steps.",
    icon: LightBulbIcon,
    tints: ["indigo", "purple"],
  },
  {
    step: "From idea to code, in GitHub.",
    where: "Build Studio",
    action: "Build a Project",
    href: "/build",
    how: "Turn your ideas into working projects with Meta Muse Code. Plan development, organize GitHub issues, and collaborate with AI coding agents that write code and open pull requests directly in your repository.",
    icon: WrenchScrewdriverIcon,
    tints: ["blue", "teal"],
  },
  {
    step: "Create agents that work for you.",
    where: "Agent Studio",
    action: "Create an Agent",
    href: "/agents",
    how: "Build and manage custom AI agents powered by Meta's models. Give each agent a purpose, configure its capabilities, and create a team of agents to support your projects and workflows.",
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

export type MobileApp = {
  name: string;
  store: string;
  href: string;
  logo: string;
};

export const MOBILE_APPS: MobileApp[] = [
  { name: "iOS app", store: "Open beta", href: IOS_BETA_PATH, logo: "/logos/apple.svg" },
  {
    name: "Android app",
    store: "Open beta",
    href: ANDROID_BETA_PATH,
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
    name: "Think bigger with Muse AI",
    role: "Explore & refine",
    detail:
      "Collaborate with specialized AI advisors powered by Muse Spark and Muse Wonder. Brainstorm ideas, research opportunities, challenge assumptions, and refine your vision with web-backed insights, cited sources, and structured responses.",
    icon: SparklesIcon,
    pastel: "blue",
    tint: "blue",
  },
  {
    name: "Turn ideas into action",
    role: "Plan & prepare",
    detail:
      "Bring your vision into Build Studio, where Muse analyzes your project, GitHub repository, and README to create development roadmaps, prioritize tasks, and generate structured tickets that give coding agents the context they need.",
    icon: BoltIcon,
    pastel: "purple",
    tint: "purple",
  },
  {
    name: "Build with Muse Code",
    role: "Build & ship",
    detail:
      "Put Meta's Muse Code agents to work in isolated development environments connected to your GitHub repository. Agents write code, complete development tickets, and open pull requests. Follow progress through live logs and review changes before merging.",
    icon: CommandLineIcon,
    pastel: "teal",
    tint: "teal",
  },
];

/** What Muse brings to a real project, listed under the model cards. */
export const META_CAPABILITIES = [
  "Meta Muse Models",
  "Web Research & Citations",
  "Structured JSON Outputs",
  "GitHub Integration",
  "Isolated Sandboxes",
  "Pull Requests",
] as const;

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
    detail:
      "Connect your repositories, manage development tasks, and build projects with AI coding agents that create pull requests directly in GitHub.",
    href: "/build",
    logo: "/logos/github.svg",
  },
  {
    name: "Meta Account",
    detail:
      "Connect your Meta account to access Muse AI and Muse Code, manage your credentials, and power your AI development workflows.",
    href: "/settings",
    logo: "/logos/meta.svg",
  },
  {
    name: "Slack",
    detail:
      "Bring WeStride into your workspace. Collaborate, access project information, and interact with your AI assistant without leaving Slack.",
    href: "/settings",
    logo: "/logos/slack.png",
  },
  {
    name: "Discord",
    detail:
      "Connect with WeStride directly through Discord. Access your AI assistant, explore ideas, and stay engaged with your community.",
    href: "/settings",
    logo: "/logos/discord.svg",
  },
  {
    name: "WhatsApp",
    detail:
      "Take WeStride with you. Message your AI assistant, access learning resources, and stay connected from your phone.",
    href: "/settings",
    logo: "/logos/whatsapp.svg",
  },
  {
    name: "MCP Server",
    detail:
      "Connect AI tools like ChatGPT, Claude, and Cursor to your WeStride data through the Model Context Protocol.",
    href: "/settings/mcp",
    logo: "/logos/model-context-protocol.svg",
  },
  {
    name: "Public API",
    detail:
      "Extend WeStride with developer-friendly APIs to access platform data and build custom integrations.",
    href: "/settings/api",
    icon: CodeBracketSquareIcon,
  },
  {
    name: "iOS & Android",
    detail:
      "The mobile app is in open beta. Install a tester build and use the same account as the website.",
    href: MOBILE_APPS_PATH,
    icon: DevicePhoneMobileIcon,
  },
];

export type StackLogo = { name: string; logo: string };

/** Two marquee rows. Logos live under public/logos. */
export const STACK_ROWS: StackLogo[][] = [
  [
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
    { name: "Turbo", logo: "/logos/turborepo.png" },
  ],
];

/** The technology line under the open-source heading. */
export const STACK_LINE = STACK_ROWS.flat()
  .map((item) => item.name)
  .join(" · ");

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
  /** Title on Our Story. */
  role: "Founder. Design, code, and AI",
  /** Title on the home page. */
  title: "Founder & CTO, WeStride",
  tagline: "Built with experience. Driven by possibility.",
  photo: "/founder/garrett-hampton.jpg",
} as const;

export const CLONE_SNIPPET = `git clone ${SOURCE_URL}.git
cd westride && bun install
bun run dev:web`;
