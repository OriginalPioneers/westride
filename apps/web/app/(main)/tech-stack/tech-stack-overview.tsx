"use client";

import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack } from "@astryxdesign/core/Stack";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { STORE_LINKS } from "../../store-links";
import { DocPage, DocSection } from "../doc-page";

const SOURCE_URL = "https://github.com/WeStrideOrg";

type Workspace = {
  path: string;
  description: string;
  runsAt: string;
  href?: string;
  links?: readonly { label: string; href: string }[];
};

const WORKSPACES: Workspace[] = [
  {
    path: "apps/web",
    description:
      "This website: Academy, Mentorship, Idea Studio, and everything else you can sign in to.",
    runsAt: "westride.org",
    href: "https://westride.org",
  },
  {
    path: "apps/api",
    description: "The public, read-only REST API and its interactive explorer.",
    runsAt: "api.westride.org",
    href: "https://api.westride.org",
  },
  {
    path: "apps/mcp",
    description: "The MCP server that lets AI assistants read WeStride data.",
    runsAt: "mcp.westride.org",
    href: "https://mcp.westride.org",
  },
  {
    path: "apps/design",
    description: "Storybook reference for the brand and the components.",
    runsAt: "design.westride.org",
    href: "https://design.westride.org",
  },
  {
    path: "apps/mobile",
    description: "The iOS and Android app.",
    runsAt: "App Store and Google Play",
    links: STORE_LINKS,
  },
  {
    path: "packages/db",
    description:
      "Database schema, migrations, seed data, and the queries the website and API share.",
    runsAt: "Shared package",
  },
  {
    path: "packages/api-client",
    description:
      "Typed client for the API, used by the MCP server and the mobile app.",
    runsAt: "Shared package",
  },
];

const APPS = [
  {
    name: "Next.js and React",
    detail:
      "The website uses the Next.js App Router with React 19. Pages render on the server and read the database directly. Forms, such as founding an idea or writing a mentor profile, post to server actions.",
  },
  {
    name: "Astryx",
    detail:
      "Every screen on the website is composed from Astryx components and themed with Stone, which also handles light and dark mode. The Design page covers it in depth.",
  },
  {
    name: "Heroicons",
    detail: "Navigation and interface icons, in outline and solid styles.",
  },
  {
    name: "Expo and React Native",
    detail:
      "The mobile app runs on Expo SDK 58 with React Native and Expo Router. It reads the Academy catalog through the public API.",
  },
  {
    name: "Storybook",
    detail:
      "design.westride.org is a Storybook site, built with Vite, that documents the brand and the components.",
  },
];

const DATA = [
  {
    name: "Neon Postgres",
    detail:
      "Serverless Postgres holds everything: Academy tracks, achievements, mentor profiles, and ideas. The website and the API reach it over Neon's serverless driver.",
  },
  {
    name: "Drizzle ORM",
    detail:
      "The schema is TypeScript in @westride/db. drizzle-kit turns schema changes into SQL migrations, and a seed script loads the Academy catalog, achievements, and other reference data.",
  },
  {
    name: "Clerk",
    detail:
      "Accounts and sign-in. Signing in is optional. It unlocks achievements, mentor profiles, and founding ideas.",
  },
  {
    name: "Vercel Blob",
    detail:
      "File storage, split into a public store and a private store. Uploads such as mentor headshots live here.",
  },
  {
    name: "Hono",
    detail:
      "A small Web Standards framework that runs both the API and the MCP server.",
  },
  {
    name: "Zod",
    detail:
      "Validates form input on the website, and defines the API's response schemas, which generate its OpenAPI document.",
  },
  {
    name: "Model Context Protocol SDK",
    detail:
      "The official TypeScript SDK that the MCP server is built on.",
  },
];

const TOOLING = [
  {
    name: "Bun",
    detail:
      "Installs packages, links the workspaces, runs scripts, and bundles the API and MCP server for production.",
  },
  {
    name: "Turborepo",
    detail:
      "Runs dev, build, and lint across every workspace in dependency order, and caches builds that have not changed.",
  },
  {
    name: "TypeScript",
    detail:
      "Every app and package is TypeScript. Linting runs ESLint on the website and a type check everywhere else.",
  },
  {
    name: "EAS",
    detail:
      "Expo Application Services builds and signs the mobile app in the cloud, so no one needs Xcode or Android Studio installed.",
  },
];

const HOSTING = [
  {
    label: "Vercel",
    detail:
      "Hosts the website, the API, the MCP server, and the design site. The API and MCP server run as Vercel Functions.",
  },
  {
    label: "Neon",
    detail: "Hosts the Postgres database.",
  },
  {
    label: "Clerk",
    detail: "Hosts accounts, sessions, and the sign-in flow.",
  },
  {
    label: "Expo",
    detail: "Builds the mobile app and delivers it to testers.",
  },
];

const CONNECTIONS = [
  "The website reads and writes Postgres through @westride/db, from server components and server actions.",
  "The API reads the same package, so its responses use the same types as the website.",
  "The MCP server and the mobile app never touch the database. They call the public API through @westride/api-client.",
  "The website, the API explorer, the MCP setup guide, and the design site all use Astryx with the Stone theme, so they look like one product.",
];

const SCRIPTS = [
  { command: "bun run dev", runs: "Every app at once." },
  { command: "bun run dev:web", runs: "Only this website." },
  { command: "bun run dev:api", runs: "Only the API." },
  { command: "bun run dev:mcp", runs: "The MCP server and the API it calls." },
  { command: "bun run build", runs: "Production builds of every app." },
  { command: "bun run lint", runs: "ESLint and type checks across the repo." },
  {
    command: "bun run db:generate",
    runs: "A new SQL migration from schema changes.",
  },
];

function NamedList({ items }: { items: { name: string; detail: string }[] }) {
  return (
    <List edge="flush" hasDividers>
      {items.map((item) => (
        <ListItem
          key={item.name}
          label={item.name}
          description={<Text type="supporting">{item.detail}</Text>}
        />
      ))}
    </List>
  );
}

export function TechStackOverview() {
  return (
    <DocPage
      title="Tech Stack"
      lede="What WeStride runs on, why, and how the pieces fit together. It is all open source, so you can read every line."
      actions={
        <>
          <Button
            label="View the source"
            variant="primary"
            href={SOURCE_URL}
            target="_blank"
          />
          <Button label="Read about the API" href="/api" />
        </>
      }
    >
      <DocSection id="one-repository" title="One repository">
        <Text>
          WeStride is a single TypeScript monorepo. The website, API, MCP
          server, design site, and mobile app live side by side and share
          packages, so a database column defined once is typed all the way to
          every screen that shows it.
        </Text>
        <Table
          data={WORKSPACES}
          idKey="path"
          columns={[
            {
              key: "path",
              header: "Workspace",
              renderCell: (row) => <Code>{row.path}</Code>,
            },
            { key: "description", header: "What it is" },
            {
              key: "runsAt",
              header: "Where it runs",
              renderCell: (row) =>
                row.links ? (
                  <HStack gap={2} wrap="wrap">
                    {row.links.map((link) => (
                      <Link key={link.href} href={link.href} isExternalLink>
                        {link.label}
                      </Link>
                    ))}
                  </HStack>
                ) : row.href ? (
                  <Link href={row.href} isExternalLink>
                    {row.runsAt}
                  </Link>
                ) : (
                  <Text type="supporting">{row.runsAt}</Text>
                ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="apps" title="Website and apps">
        <NamedList items={APPS} />
      </DocSection>

      <DocSection id="data-and-services" title="Data and services">
        <NamedList items={DATA} />
      </DocSection>

      <DocSection id="tooling" title="Tooling">
        <NamedList items={TOOLING} />
      </DocSection>

      <DocSection id="hosting" title="Hosting">
        <List density="compact" listStyle="disc">
          {HOSTING.map((item) => (
            <ListItem
              key={item.label}
              label={item.label}
              description={<Text type="supporting">{item.detail}</Text>}
            />
          ))}
        </List>
      </DocSection>

      <DocSection id="how-it-connects" title="How the pieces connect">
        <List density="compact" listStyle="disc">
          {CONNECTIONS.map((line) => (
            <ListItem key={line} label={<Text>{line}</Text>} />
          ))}
        </List>
        <Text>
          Keeping the database behind the API for everything outside the
          website means the mobile app and AI assistants see the same data, in
          the same shape, as anyone else who builds on WeStride.
        </Text>
      </DocSection>

      <DocSection id="built-with-ai" title="Built with AI">
        <Text>
          WeStride teaches people to build with AI, and it is built that way
          too.
        </Text>
        <List edge="flush" hasDividers>
          <ListItem
            label="Muse"
            description={
              <Text type="supporting">
                Meta&apos;s Muse drafted the first ten Academy tracks and
                shaped the brand concept and logo prompt. The prompts we sent
                are kept in <Code size="inherit">docs/prompts-used</Code>.
              </Text>
            }
          />
          <ListItem
            label="Coding agents"
            description={
              <Text type="supporting">
                <Code size="inherit">AGENTS.md</Code> at the root of the repository tells AI
                coding agents how the monorepo, Next.js, and Astryx are set up
                here, so they follow the same conventions people do.
              </Text>
            }
          />
        </List>
      </DocSection>

      <DocSection id="run-locally" title="Run it locally">
        <Text>
          With the repository cloned and Bun installed, add your Neon, Clerk,
          and Blob keys, set up the database, and start the website:
        </Text>
        <CodeBlock
          code={`bun install
cp apps/web/.env.example apps/web/.env   # then fill in the keys
bun run db:migrate
bun run db:seed
bun run dev:web                          # http://localhost:3000`}
          language="bash"
          width="100%"
        />
        <Text>Run every script from the repository root:</Text>
        <Table
          data={SCRIPTS}
          idKey="command"
          columns={[
            {
              key: "command",
              header: "Command",
              renderCell: (row) => <Code>{row.command}</Code>,
            },
            { key: "runs", header: "Runs" },
          ]}
        />
        <Text type="supporting">
          To run one app through Turborepo, filter by its name, for example{" "}
          <Code size="inherit">bunx turbo run dev --filter=design</Code>.
        </Text>
      </DocSection>
    </DocPage>
  );
}
