"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Outline, type OutlineItem } from "@astryxdesign/core/Outline";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";

const API_URL = "https://api.westride.org";
const EXPLORER_URL = `${API_URL}/docs`;
const SPEC_URL = `${API_URL}/openapi.json`;
const SOURCE_URL = "https://github.com/WeStrideOrg";

const OUTLINE_ITEMS: OutlineItem[] = [
  { id: "what-it-is", label: "What the API is", level: 2 },
  { id: "first-request", label: "Make your first request", level: 2 },
  { id: "endpoints", label: "Endpoints", level: 2 },
  { id: "access", label: "Access and conventions", level: 2 },
  { id: "how-its-built", label: "How it's built", level: 2 },
  { id: "run-locally", label: "Run it locally", level: 2 },
  { id: "built-on-it", label: "What runs on it", level: 2 },
];

const OUTLINE_OPTIONS = OUTLINE_ITEMS.map((item) => ({
  value: item.id,
  label: item.label,
}));

const ENDPOINTS = [
  {
    path: "/v1/academy/tracks",
    description: "Every Academy learning track, in recommended order.",
  },
  {
    path: "/v1/academy/tracks/{slug}",
    description:
      "One track with its lessons and the names of its prerequisite tracks.",
  },
  {
    path: "/health",
    description: "Returns ok: true when the API is up. Use it for uptime checks.",
  },
];

const STACK = [
  {
    name: "Hono",
    detail:
      "A small web framework built on Web Standards. Routes are declared with @hono/zod-openapi, so each handler is type-checked against the schema it documents.",
  },
  {
    name: "Zod and OpenAPI 3.1",
    detail:
      "Response shapes are Zod schemas. The server turns them into the OpenAPI document at /openapi.json, which drives the API explorer and any client you generate.",
  },
  {
    name: "Bun and Vercel",
    detail:
      "Bun runs the API in development and bundles it for production, where it runs as a Vercel Function on Fluid compute at api.westride.org.",
  },
  {
    name: "Drizzle ORM and Neon Postgres",
    detail:
      "Queries come from the shared @westride/db package, the same one this website uses, over Neon's serverless Postgres driver.",
  },
  {
    name: "@westride/api-client",
    detail:
      "Typed response models and a small fetch client. The MCP server and the mobile app use it to call the API.",
  },
  {
    name: "Astryx",
    detail:
      "The API explorer is a React app built with the same Astryx design system and Stone theme as this site. It is bundled into the API and served at /docs.",
  },
];

const ACCESS = [
  {
    label: "No API key",
    detail:
      "The API is public and read-only. There is no account, token, or header to set.",
  },
  {
    label: "Any origin",
    detail: "CORS allows every origin, so browser apps can call it directly.",
  },
  {
    label: "Versioned paths",
    detail: "Data endpoints live under /v1.",
  },
  {
    label: "Cached responses",
    detail:
      "Catalog responses send Cache-Control: public, max-age=60, s-maxage=300, so new content can take up to five minutes to appear.",
  },
];

const BUILT_ON_IT = [
  {
    label: "WeStride MCP server",
    detail:
      "Lets AI assistants such as Cursor and Claude browse the Academy catalog through the API.",
    href: "/mcp",
  },
  {
    label: "API explorer",
    detail: "Interactive reference for every endpoint, served by the API itself.",
    href: EXPLORER_URL,
  },
  {
    label: "Source code",
    detail: "The API, explorer, and everything else on WeStride, on GitHub.",
    href: SOURCE_URL,
  },
];

const REQUEST_FLOW = [
  "Vercel's edge answers from cache when it holds a fresh copy. Catalog responses stay fresh for five minutes there.",
  "Otherwise the request reaches the API function, where Hono routes it to a handler.",
  "The handler reads Neon Postgres through Drizzle.",
  "The rows are mapped to the public response shape and returned as JSON with cache headers.",
];

const outlinePanel: CSSProperties = {
  position: "sticky",
  top: "var(--spacing-6)",
  alignSelf: "start",
  paddingBlockStart: "var(--spacing-10)",
};

export function ApiOverview() {
  const [activeId, setActiveId] = useState<string | undefined>(
    OUTLINE_ITEMS[0]?.id,
  );
  const isMobile = useMediaQuery("(max-width: 768px)");

  const scrollToId = useCallback((id: string) => {
    setActiveId(id);
    const target = document.getElementById(id);
    if (target != null) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  }, []);

  return (
    <Layout
      height="auto"
      contentWidth={960}
      end={
        isMobile ? undefined : (
          <LayoutPanel
            isScrollable={false}
            label="On this page"
            role="complementary"
            style={outlinePanel}
          >
            <Outline items={OUTLINE_ITEMS} onActiveIdChange={setActiveId} />
          </LayoutPanel>
        )
      }
      content={
        <LayoutContent isScrollable={false} padding={8}>
          <VStack gap={8}>
            <VStack gap={4}>
              <VStack gap={2}>
                <Heading level={1} type="display-1">
                  WeStride API
                </Heading>
                <Text type="large" color="secondary">
                  Public, read-only access to the data behind WeStride, starting
                  with the Academy catalog.
                </Text>
              </VStack>
              <HStack gap={2} wrap="wrap">
                <Button
                  label="Open the API explorer"
                  variant="primary"
                  href={EXPLORER_URL}
                  target="_blank"
                />
                <Button
                  label="View the OpenAPI spec"
                  href={SPEC_URL}
                  target="_blank"
                />
              </HStack>
              {isMobile && (
                <Selector
                  label="On this page"
                  isLabelHidden
                  options={OUTLINE_OPTIONS}
                  value={activeId}
                  onChange={scrollToId}
                  width="100%"
                />
              )}
            </VStack>

            <VStack gap={4}>
              <Heading id="what-it-is" level={2}>
                What the API is
              </Heading>
              <Text>
                The WeStride API is a plain HTTPS and JSON interface to the
                platform&apos;s data. Anyone can use it to build on WeStride: show
                Academy tracks in another app, plan a study path, or give an AI
                assistant something real to reason about.
              </Text>
              <Text>
                Today it serves the Academy catalog, a path of learning tracks
                from AI fundamentals to launching your own product. More of the
                platform will open up as it grows. It is the same API our own
                MCP server and mobile app call, so what you see is what they see.
              </Text>
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading id="first-request" level={2}>
                Make your first request
              </Heading>
              <Text>
                There is nothing to sign up for. Send a request from your
                terminal:
              </Text>
              <CodeBlock
                code={`curl ${API_URL}/v1/academy/tracks`}
                language="bash"
                width="100%"
              />
              <Text>Or from JavaScript, in a browser or on a server:</Text>
              <CodeBlock
                code={`const response = await fetch("${API_URL}/v1/academy/tracks");
const { data: tracks } = await response.json();

for (const track of tracks) {
  console.log(track.sortOrder, track.name, track.difficulty);
}`}
                language="javascript"
                width="100%"
              />
              <Text>
                To try every endpoint without writing code, open the{" "}
                <Link href={EXPLORER_URL} isExternalLink>
                  API explorer
                </Link>
                . It lists each endpoint with its parameters and response
                fields, sends live requests from your browser, and gives you
                ready-to-copy snippets in cURL, JavaScript, and Python.
              </Text>
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading id="endpoints" level={2}>
                Endpoints
              </Heading>
              <Text>
                Every endpoint is a <Code>GET</Code>. Paths are relative to{" "}
                <Code>{API_URL}</Code>.
              </Text>
              <Table
                data={ENDPOINTS}
                idKey="path"
                columns={[
                  {
                    key: "path",
                    header: "Path",
                    renderCell: (row) => <Code>{row.path}</Code>,
                  },
                  { key: "description", header: "Returns" },
                ]}
              />
              <Text type="supporting">
                The explorer and the OpenAPI spec are generated from the running
                code, so they always list the current endpoints, even if this
                table falls behind.
              </Text>
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading id="access" level={2}>
                Access and conventions
              </Heading>
              <List density="compact" listStyle="disc">
                {ACCESS.map((item) => (
                  <ListItem
                    key={item.label}
                    label={item.label}
                    description={<Text type="supporting">{item.detail}</Text>}
                  />
                ))}
              </List>
              <Text>
                Successful responses wrap their payload in <Code>data</Code>.
                Errors return a matching HTTP status and an <Code>error</Code>{" "}
                object with a stable <Code>code</Code> you can branch on:
              </Text>
              <CodeBlock
                code={`// 200 OK
{
  "data": {
    "slug": "ai-foundations",
    "name": "AI Foundations: What AI Is and Why It Matters"
  }
}

// 404 Not Found
{
  "error": {
    "code": "not_found",
    "message": "No track with slug \\"ai-basics\\"."
  }
}`}
                language="json"
                width="100%"
              />
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading id="how-its-built" level={2}>
                How it&apos;s built
              </Heading>
              <Text>
                The API is a TypeScript service in the WeStride monorepo, next
                to this website, the MCP server, and the mobile app. They share
                packages, so a field defined once flows from the database to
                every client.
              </Text>
              <List edge="flush" hasDividers>
                {STACK.map((item) => (
                  <ListItem
                    key={item.name}
                    label={item.name}
                    description={<Text type="supporting">{item.detail}</Text>}
                  />
                ))}
              </List>
              <VStack gap={2}>
                <Heading level={3}>How a request flows</Heading>
                <List density="compact" listStyle="decimal">
                  {REQUEST_FLOW.map((step) => (
                    <ListItem key={step} label={<Text>{step}</Text>} />
                  ))}
                </List>
              </VStack>
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading id="run-locally" level={2}>
                Run it locally
              </Heading>
              <Text>
                WeStride is open source. With the repository cloned and Bun
                installed, point the API at a Postgres database and start it:
              </Text>
              <CodeBlock
                code={`bun install
cp apps/api/.env.example apps/api/.env   # then set DATABASE_URL
bun run dev:api                          # http://localhost:3001/docs`}
                language="bash"
                width="100%"
              />
              <Text type="supporting">
                The development server rebuilds the explorer as you edit it and
                restarts the API when its code changes.
              </Text>
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading id="built-on-it" level={2}>
                What runs on it
              </Heading>
              <List edge="flush" hasDividers>
                {BUILT_ON_IT.map((item) => (
                  <ListItem
                    key={item.label}
                    label={item.label}
                    description={<Text type="supporting">{item.detail}</Text>}
                    href={item.href}
                  />
                ))}
              </List>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
