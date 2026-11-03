"use client";

import { APIKeys, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { DocPage, DocSection } from "../../doc-page";
import { SettingsTabs } from "../../section-tabs";

const API_URL = "https://api.westride.org";
const EXPLORER_URL = `${API_URL}/docs`;
const SPEC_URL = `${API_URL}/openapi.json`;
const SOURCE_URL = "https://github.com/WeStrideOrg";

type Endpoint = { method: string; path: string; description: string; auth: "none" | "optional" | "required" };

const ENDPOINT_GROUPS: { name: string; endpoints: Endpoint[] }[] = [
  {
    name: "Me",
    endpoints: [
      { method: "GET", path: "/v1/me", description: "The member behind the token, and your own member id.", auth: "required" },
    ],
  },
  {
    name: "Ideas",
    endpoints: [
      { method: "GET", path: "/v1/ideas", description: "Search ideas by text, type, category, country, collection, or support wanted.", auth: "optional" },
      { method: "GET", path: "/v1/ideas/categories", description: "Every category, with the slug to filter by.", auth: "none" },
      { method: "GET", path: "/v1/ideas/{id}", description: "One idea with its team, links, and the projects and agents built on it.", auth: "optional" },
      { method: "POST", path: "/v1/ideas", description: "Create an idea with you as founder.", auth: "required" },
      { method: "PATCH", path: "/v1/ideas/{id}", description: "Edit name, description, categories, prototype, or team. Founders only.", auth: "required" },
      { method: "PUT / DELETE", path: "/v1/ideas/{id}/follow", description: "Follow or unfollow an idea.", auth: "required" },
    ],
  },
  {
    name: "Projects",
    endpoints: [
      { method: "GET", path: "/v1/projects", description: "Search projects by text or status; `mine=true` for your own.", auth: "optional" },
      { method: "GET", path: "/v1/projects/{id}", description: "One project with team, repositories, milestones, ticket counts, and agents.", auth: "optional" },
      { method: "POST", path: "/v1/projects", description: "Create a project, optionally from an idea you belong to.", auth: "required" },
      { method: "PATCH", path: "/v1/projects/{id}", description: "Edit details, status, or team. Owners only.", auth: "required" },
      { method: "GET", path: "/v1/projects/{id}/tickets", description: "The ticket board, optionally one status.", auth: "optional" },
      { method: "GET", path: "/v1/projects/{id}/tickets/{number}", description: "One ticket with its comments.", auth: "optional" },
      { method: "POST / PATCH / DELETE", path: "/v1/projects/{id}/tickets[/{number}]", description: "Create, edit, move, or delete tickets. Members only.", auth: "required" },
      { method: "POST", path: "/v1/projects/{id}/tickets/{number}/comments", description: "Comment on a ticket.", auth: "required" },
      { method: "POST / PATCH / DELETE", path: "/v1/projects/{id}/milestones[/{milestoneId}]", description: "Manage the roadmap. Members only.", auth: "required" },
    ],
  },
  {
    name: "Agents",
    endpoints: [
      { method: "GET", path: "/v1/agents", description: "Search agents by text or status; `mine=true` for the ones you own.", auth: "optional" },
      { method: "GET", path: "/v1/agents/{id}", description: "One agent with its brief, schedule, repository, counts, usage, and your role.", auth: "optional" },
      { method: "POST", path: "/v1/agents", description: "Create an agent you own, with an optional schedule and first ticket.", auth: "required" },
      { method: "PATCH / DELETE", path: "/v1/agents/{id}", description: "Edit settings, schedule, or status; delete. Owners only.", auth: "required" },
      { method: "GET", path: "/v1/agents/{id}/tickets[/{number}]", description: "The queue, or one ticket with the jobs that worked it.", auth: "optional" },
      { method: "POST / PATCH / DELETE", path: "/v1/agents/{id}/tickets[/{number}]", description: "Queue, edit, move, or delete work. Owner and collaborators.", auth: "required" },
      { method: "GET", path: "/v1/agents/{id}/jobs[/{jobId}]", description: "Jobs newest first, or one job with its outcome.", auth: "optional" },
      { method: "GET", path: "/v1/agents/{id}/log", description: "What the agent and its team did, newest first.", auth: "optional" },
      { method: "GET", path: "/v1/agents/{id}/usage", description: "Token and cost totals by model, trigger, and day.", auth: "optional" },
    ],
  },
  {
    name: "Academy",
    endpoints: [
      { method: "GET", path: "/v1/academy/tracks", description: "Every Academy learning track, in recommended order.", auth: "none" },
      { method: "GET", path: "/v1/academy/tracks/{slug}", description: "One track with its lessons and prerequisite tracks.", auth: "none" },
    ],
  },
  {
    name: "System",
    endpoints: [
      { method: "GET", path: "/health", description: "Returns ok: true when the API is up. Use it for uptime checks.", auth: "none" },
    ],
  },
];

const AUTH_LABEL: Record<Endpoint["auth"], string> = {
  none: "Public",
  optional: "Token optional",
  required: "Token required",
};

const STACK = [
  {
    name: "Hono",
    detail:
      "A small web framework built on Web Standards. Routes are declared with @hono/zod-openapi, so each handler is type-checked against the schema it documents.",
  },
  {
    name: "Clerk",
    detail:
      "The same identity provider this website signs you in with. The API verifies API keys and OAuth access tokens against it and resolves member names for responses.",
  },
  {
    name: "Zod and OpenAPI 3.1",
    detail:
      "Request and response shapes are Zod schemas. The server turns them into the OpenAPI document at /openapi.json, which drives the API explorer and any client you generate.",
  },
  {
    name: "Bun and Vercel",
    detail:
      "Bun runs the API in development and bundles it for production, where it runs as a Vercel Function on Fluid compute at api.westride.org.",
  },
  {
    name: "Drizzle ORM and Neon Postgres",
    detail:
      "Queries come from the shared @westride/db package, the same one this website uses, over Neon's serverless Postgres driver. Visibility rules live there once and apply everywhere.",
  },
  {
    name: "@westride/api-client",
    detail:
      "Typed models and a small fetch client with bearer-token support. The MCP server and the mobile app use it to call the API.",
  },
  {
    name: "Astryx",
    detail:
      "The API explorer is a React app built with the same Astryx design system and Stone theme as this site. It is bundled into the API and served at /docs.",
  },
];

const ACCESS = [
  {
    label: "Same permissions as the website",
    detail:
      "A token acts as you. You see what you could see signed in, and you can change what you could change: founders edit ideas, owners edit projects and agents, members work tickets.",
  },
  {
    label: "Private means not found",
    detail:
      "Items you cannot see return 404, whether they do not exist or are private. Actions you may not take return 403.",
  },
  {
    label: "Any origin",
    detail: "CORS allows every origin and method, so browser apps can call it directly.",
  },
  {
    label: "Versioned paths",
    detail: "Data endpoints live under /v1. Partial updates use PATCH; omitted fields keep their value.",
  },
  {
    label: "Cached catalogs",
    detail:
      "Academy tracks and idea categories send Cache-Control: public, max-age=60, s-maxage=300. Everything else is live.",
  },
];

const BUILT_ON_IT = [
  {
    label: "WeStride MCP server",
    detail:
      "Lets ChatGPT, Claude, Cursor, and other assistants read and change your ideas, projects, and agents through the API, after you sign in.",
    href: "/settings/mcp",
  },
  {
    label: "API explorer",
    detail: "Interactive reference for every endpoint, served by the API itself. Paste a token to try authenticated calls.",
    href: EXPLORER_URL,
  },
  {
    label: "Source code",
    detail: "The API, explorer, and everything else on WeStride, on GitHub.",
    href: SOURCE_URL,
  },
];

const REQUEST_FLOW = [
  "If the request carries a bearer token, the API asks Clerk to verify it and learns which member is calling. A missing token means a signed-out visitor; a bad one is refused.",
  "Hono validates the parameters and body against the route's Zod schema and routes to a handler.",
  "The handler reads or writes Neon Postgres through Drizzle, as that member, so the shared visibility rules apply.",
  "The rows are mapped to the public response shape, member ids become names and avatars, and the result is returned as JSON.",
];

export function ApiOverview() {
  return (
    <DocPage
      tabs={<SettingsTabs />}
      title="WeStride API"
      lede="Read and change ideas, projects, and agents from your own code, with the same permissions you have on the website."
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
          The WeStride API is a plain HTTPS and JSON interface to the platform.
          Use it to build on WeStride: show ideas and projects in another app,
          drive a project&apos;s ticket board from a script, queue work for an
          agent and read what it did, or give an AI assistant something real to
          act on.
        </Text>
        <Text>
          Public data needs no token. Send one and the API acts as you: your
          private work appears, and you can make the same changes you could
          make here. It is the same API our MCP server and mobile app call, so
          what you see is what they see.
        </Text>
      </DocSection>

      <DocSection id="first-request" title="Make your first request">
        <Text>
          Public ideas, projects, agents, and the Academy need nothing to sign
          up for. Send a request from your terminal:
        </Text>
        <CodeBlock
          code={`curl "${API_URL}/v1/ideas?view=featured"`}
          language="bash"
          width="100%"
        />
        <Text>
          With an API key, the same call also includes your private ideas, and
          you can create things:
        </Text>
        <CodeBlock
          code={`export WESTRIDE_API_KEY="…"   # from the section below

curl ${API_URL}/v1/me \\
  -H "Authorization: Bearer $WESTRIDE_API_KEY"

curl -X POST ${API_URL}/v1/ideas \\
  -H "Authorization: Bearer $WESTRIDE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"OPEN_SOURCE","name":"Tool library","description":"Lend tools between neighbours.","categories":["Community"],"isPublic":true}'`}
          language="bash"
          width="100%"
        />
        <Text>Or from JavaScript, on a server where the key stays secret:</Text>
        <CodeBlock
          code={`const response = await fetch("${API_URL}/v1/projects?mine=true", {
  headers: { authorization: \`Bearer \${process.env.WESTRIDE_API_KEY}\` },
});
const { data: projects } = await response.json();

for (const project of projects) {
  console.log(project.name, project.status, project.ticketCounts);
}`}
          language="javascript"
          width="100%"
        />
        <Text>
          To try every endpoint without writing code, open the{" "}
          <Link href={EXPLORER_URL} isExternalLink>
            API explorer
          </Link>
          . It lists each endpoint with its parameters, request body, and
          response fields, sends live requests from your browser with your
          token, and gives you ready-to-copy snippets in cURL, JavaScript, and
          Python.
        </Text>
      </DocSection>

      <DocSection id="api-keys" title="Your API keys">
        <Text>
          An API key is a long-lived bearer token tied to your account, for
          scripts, servers, and clients that cannot sign in with OAuth. Treat it
          like a password: keep it out of browsers and repositories, and revoke
          it here if it leaks.
        </Text>
        <SignedIn>
          <APIKeys />
        </SignedIn>
        <SignedOut>
          <VStack gap={3}>
            <Text type="supporting">Sign in to create and manage API keys.</Text>
            <Button label="Sign in" href="/sign-in" variant="primary" />
          </VStack>
        </SignedOut>
        <Text type="supporting">
          Apps acting on your behalf, such as MCP clients, use OAuth instead:
          you sign in once and they receive a short-lived token the API accepts
          the same way.
        </Text>
      </DocSection>

      <DocSection id="endpoints" title="Endpoints">
        <Text>
          Paths are relative to <Code>{API_URL}</Code>. Reads work without a
          token and show more with one; every write needs one.
        </Text>
        <VStack gap={6}>
          {ENDPOINT_GROUPS.map((group) => (
            <VStack key={group.name} gap={2}>
              <Heading level={3}>{group.name}</Heading>
              <Table
                data={group.endpoints}
                idKey="path"
                density="compact"
                verticalAlign="top"
                columns={[
                  {
                    key: "method",
                    header: "Method",
                    renderCell: (row) => <Code>{row.method}</Code>,
                  },
                  {
                    key: "path",
                    header: "Path",
                    renderCell: (row) => <Code>{row.path}</Code>,
                  },
                  { key: "description", header: "Does" },
                  {
                    key: "auth",
                    header: "Auth",
                    renderCell: (row) => <Text size="sm">{AUTH_LABEL[row.auth]}</Text>,
                  },
                ]}
              />
            </VStack>
          ))}
        </VStack>
        <Text type="supporting">
          Linking GitHub repositories and starting agent jobs stay on the
          website for now, where GitHub access and Muse keys are checked. The
          explorer and the OpenAPI spec are generated from the running code, so
          they always list the current endpoints, even if this table falls
          behind.
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
          stable <Code>code</Code> you can branch on. Validation errors add a{" "}
          <Code>fields</Code> map with one message per field:
        </Text>
        <CodeBlock
          code={`// 200 OK
{
  "data": {
    "id": "3f6c2a8e-1b2d-4c5e-9f7a-0b1c2d3e4f5a",
    "name": "Tool library",
    "members": [{ "id": "user_2x9F…", "name": "Ada Lovelace", "role": "FOUNDER" }]
  }
}

// 400 Bad Request
{
  "error": {
    "code": "validation_failed",
    "message": "name: Give the idea a name.",
    "fields": { "name": "Give the idea a name." }
  }
}

// 401 unauthorized · 403 forbidden · 404 not_found · 409 conflict · 500 internal_error`}
          language="json"
          width="100%"
        />
      </DocSection>

      <DocSection id="how-its-built" title="How it's built">
        <Text>
          The API is a TypeScript service in the WeStride monorepo, next to
          this website, the MCP server, and the mobile app. They share
          packages, so a field defined once flows from the database to every
          client, and the permission rules the website enforces are the ones
          the API enforces.
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
          installed, point the API at a Postgres database and your Clerk
          instance, then start it:
        </Text>
        <CodeBlock
          code={`bun install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL and the CLERK_* keys
bun run dev:api                          # http://localhost:3001/docs`}
          language="bash"
          width="100%"
        />
        <Text type="supporting">
          The development server rebuilds the explorer as you edit it and
          restarts the API when its code changes. Without Clerk keys it still
          serves public data; tokens are refused.
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
