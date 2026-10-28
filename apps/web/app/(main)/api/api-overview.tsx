"use client";

import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { DocPage, DocSection } from "../doc-page";

const API_URL = "https://api.westride.org";
const EXPLORER_URL = `${API_URL}/docs`;
const SPEC_URL = `${API_URL}/openapi.json`;
const SOURCE_URL = "https://github.com/WeStrideOrg";

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

export function ApiOverview() {
  return (
    <DocPage
      title="WeStride API"
      lede="Public, read-only access to the data behind WeStride, starting with the Academy catalog."
      actions={
        <>
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
        </>
      }
    >
      <DocSection id="what-it-is" title="What the API is">
        <Text>
          The WeStride API is a plain HTTPS and JSON interface to the
          platform&apos;s data. Anyone can use it to build on WeStride: show
          Academy tracks in another app, plan a study path, or give an AI
          assistant something real to reason about.
        </Text>
        <Text>
          Today it serves the Academy catalog, a path of learning tracks from
          AI fundamentals to launching your own product. More of the platform
          will open up as it grows. It is the same API our own MCP server and
          mobile app call, so what you see is what they see.
        </Text>
      </DocSection>

      <DocSection id="first-request" title="Make your first request">
        <Text>
          There is nothing to sign up for. Send a request from your terminal:
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
          . It lists each endpoint with its parameters and response fields,
          sends live requests from your browser, and gives you ready-to-copy
          snippets in cURL, JavaScript, and Python.
        </Text>
      </DocSection>

      <DocSection id="endpoints" title="Endpoints">
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
          code, so they always list the current endpoints, even if this table
          falls behind.
        </Text>
      </DocSection>

      <DocSection id="access" title="Access and conventions">
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
          Successful responses wrap their payload in <Code>data</Code>. Errors
          return a matching HTTP status and an <Code>error</Code> object with a
          stable <Code>code</Code> you can branch on:
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
      </DocSection>

      <DocSection id="how-its-built" title="How it's built">
        <Text>
          The API is a TypeScript service in the WeStride monorepo, next to
          this website, the MCP server, and the mobile app. They share
          packages, so a field defined once flows from the database to every
          client.
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
      </DocSection>

      <DocSection id="run-locally" title="Run it locally">
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
      </DocSection>

      <DocSection id="built-on-it" title="What runs on it">
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
      </DocSection>
    </DocPage>
  );
}
