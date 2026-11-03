"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { DocPage, DocSection } from "../../doc-page";
import { AccountTabs } from "../../section-tabs";

const MCP_HOME_URL = "https://mcp.westride.org";
const MCP_URL = `${MCP_HOME_URL}/mcp`;
const LOCAL_MCP_URL = "http://localhost:3002/mcp";
const SOURCE_URL = "https://github.com/WeStrideOrg";

function cursorConfig(url: string) {
  return `{
  "mcpServers": {
    "westride": { "url": "${url}" }
  }
}`;
}

function Menu({ children }: { children: ReactNode }) {
  return (
    <Text type="inherit" weight="semibold">
      {children}
    </Text>
  );
}

function Steps({ steps }: { steps: { title: string; body: ReactNode }[] }) {
  return (
    <List listStyle="decimal" edge="flush">
      {steps.map((step) => (
        <ListItem
          key={step.title}
          label={step.title}
          description={<Text type="supporting">{step.body}</Text>}
        />
      ))}
    </List>
  );
}

type Client = {
  value: string;
  label: string;
  content: ReactNode;
};

const CLIENTS: Client[] = [
  {
    value: "chatgpt",
    label: "ChatGPT",
    content: (
      <>
        <Steps
          steps={[
            {
              title: "Turn on Developer mode",
              body: (
                <>
                  In ChatGPT on the web, open <Menu>Settings</Menu> →{" "}
                  <Menu>Apps &amp; Connectors</Menu> →{" "}
                  <Menu>Advanced settings</Menu> and switch on{" "}
                  <Menu>Developer mode</Menu>.
                </>
              ),
            },
            {
              title: "Create the WeStride app",
              body: (
                <>
                  Back in <Menu>Apps &amp; Connectors</Menu>, choose{" "}
                  <Menu>Create</Menu>. Name it <Menu>WeStride</Menu>, paste the
                  server URL, and set Authentication to <Menu>OAuth</Menu>.
                  Leave the client fields empty; ChatGPT registers itself.
                </>
              ),
            },
            {
              title: "Sign in and use it",
              body: (
                <>
                  ChatGPT opens WeStride sign-in once. Then start a new chat,
                  open the <Menu>+</Menu> menu, pick <Menu>Developer mode</Menu>,
                  and enable <Menu>WeStride</Menu>.
                </>
              ),
            },
          ]}
        />
        <Text type="supporting">
          Available on ChatGPT Plus, Pro, Business, Enterprise, and Edu. On
          workspace plans, an admin may need to allow custom apps.
        </Text>
      </>
    ),
  },
  {
    value: "claude",
    label: "Claude",
    content: (
      <>
        <Steps
          steps={[
            {
              title: "Open Connectors",
              body: (
                <>
                  In Claude.ai or the desktop app, go to <Menu>Settings</Menu>{" "}
                  → <Menu>Connectors</Menu> and choose{" "}
                  <Menu>Add custom connector</Menu>.
                </>
              ),
            },
            {
              title: "Add WeStride",
              body: (
                <>
                  Name it <Menu>WeStride</Menu>, paste the server URL as the
                  remote MCP server URL, then select <Menu>Add</Menu>.
                </>
              ),
            },
            {
              title: "Sign in and use it",
              body: (
                <>
                  Claude asks you to connect; sign in with WeStride once. Then,
                  in any conversation, open the tools menu below the message
                  box and make sure <Menu>WeStride</Menu> is switched on.
                </>
              ),
            },
          ]}
        />
        <Text type="supporting">
          Available on every Claude plan. On Team and Enterprise, an owner adds
          the connector from Admin settings first.
        </Text>
      </>
    ),
  },
  {
    value: "claude-code",
    label: "Claude Code",
    content: (
      <>
        <Text>Run this once in your terminal:</Text>
        <CodeBlock
          code={`claude mcp add --transport http westride ${MCP_URL}`}
          language="bash"
          width="100%"
        />
        <Text type="supporting">
          Then type <Code>/mcp</Code> in Claude Code and pick WeStride to sign in.
        </Text>
      </>
    ),
  },
  {
    value: "cursor",
    label: "Cursor",
    content: (
      <>
        <Text>
          Add the server to <Code>.cursor/mcp.json</Code> in a project, or to{" "}
          <Code>~/.cursor/mcp.json</Code> to use it in every project:
        </Text>
        <CodeBlock
          code={cursorConfig(MCP_URL)}
          language="json"
          width="100%"
        />
        <Text type="supporting">
          Cursor shows a <Menu>Needs login</Menu> prompt next to the server;
          click it to sign in with WeStride.
        </Text>
      </>
    ),
  },
  {
    value: "other",
    label: "Other clients",
    content: (
      <>
        <Text>
          Any MCP client that supports the Streamable HTTP transport with OAuth,
          including VS Code, can connect to <Code>{MCP_URL}</Code> and will
          walk you through WeStride sign-in. Look for an option to add a remote
          or HTTP server in its settings.
        </Text>
        <Text>
          Clients without OAuth support can send a WeStride API key instead, as
          an <Code>Authorization: Bearer</Code> header. Create one under{" "}
          <Code>Your API keys</Code> on the{" "}
          <Link href="/settings/api">API page</Link>.
        </Text>
      </>
    ),
  },
];

const TOOL_GROUPS: { name: string; tools: { name: string; description: string }[] }[] = [
  {
    name: "You",
    tools: [{ name: "whoami", description: "The member this session is signed in as, with your member id." }],
  },
  {
    name: "Ideas",
    tools: [
      { name: "list_ideas", description: "Search ideas by text, type, category, country, collection, or support wanted." },
      { name: "get_idea", description: "One idea with its team, links, and the projects and agents built on it." },
      { name: "list_idea_categories", description: "Every category an idea can carry." },
      { name: "create_idea", description: "Start an idea with you as founder." },
      { name: "update_idea", description: "Edit name, description, categories, prototype, or team. Founders only." },
      { name: "follow_idea", description: "Follow or unfollow an idea." },
    ],
  },
  {
    name: "Projects",
    tools: [
      { name: "list_projects", description: "Search projects, or list the ones you belong to." },
      { name: "get_project", description: "One project with team, repositories, milestones, ticket counts, and agents." },
      { name: "create_project", description: "Start a project, optionally from an idea you belong to." },
      { name: "update_project", description: "Edit details, status, or team. Owners only." },
      { name: "list_tickets", description: "The ticket board, optionally one status." },
      { name: "get_ticket", description: "One ticket with its comments." },
      { name: "create_ticket", description: "Add a ticket to the backlog." },
      { name: "update_ticket", description: "Edit a ticket or move it between columns." },
      { name: "delete_ticket", description: "Delete a ticket." },
      { name: "comment_on_ticket", description: "Comment on a ticket as you." },
      { name: "create_milestone", description: "Add a milestone to the roadmap." },
      { name: "update_milestone", description: "Edit a milestone." },
      { name: "delete_milestone", description: "Remove a milestone." },
    ],
  },
  {
    name: "Agents",
    tools: [
      { name: "list_agents", description: "Search agents, or list the ones you own." },
      { name: "get_agent", description: "One agent with its brief, schedule, counts, usage, and your role." },
      { name: "create_agent", description: "Create an agent with an optional schedule and first ticket." },
      { name: "update_agent", description: "Edit settings, schedule, or status. Owners only." },
      { name: "delete_agent", description: "Delete an agent that has no running job. Owners only." },
      { name: "list_agent_tickets", description: "The agent's work queue." },
      { name: "get_agent_ticket", description: "One ticket with the jobs that worked it." },
      { name: "queue_agent_ticket", description: "Add work to the queue. Owner and collaborators." },
      { name: "update_agent_ticket", description: "Edit or move a queued ticket." },
      { name: "delete_agent_ticket", description: "Delete a queued ticket." },
      { name: "list_agent_jobs", description: "Jobs newest first, with status, pull request, and usage." },
      { name: "get_agent_job", description: "One job with its summary or report." },
      { name: "read_agent_log", description: "What the agent and its team did, newest first." },
      { name: "get_agent_usage", description: "Token and cost totals by model, trigger, and day." },
    ],
  },
  {
    name: "Academy",
    tools: [
      { name: "list_academy_tracks", description: "Every Academy track in recommended order." },
      { name: "get_academy_track", description: "One track with its lessons." },
    ],
  },
];

const PROMPTS = [
  "Using WeStride, show me the open tickets on my projects and draft a plan for this week.",
  "Create a WeStride idea for a neighbourhood tool library and invite my teammate.",
  "Queue a ticket for my docs agent on WeStride to review last week's changes, then tell me what it did on its last run.",
  "Which WeStride ideas are looking for compute, and which of them already have a project?",
  "Look up the WeStride Academy tracks and build me a four-week learning plan.",
];

const ACCESS = [
  {
    label: "You sign in once",
    detail:
      "The server follows the MCP authorization spec. Your client discovers WeStride sign-in, registers itself, and opens the sign-in page. Revoke its access any time from your account settings.",
  },
  {
    label: "Acts as you, no more",
    detail:
      "Every tool call is forwarded to the WeStride API with your token, so you see what you could see on the website and change only what you could change here.",
  },
  {
    label: "Assistants are told to confirm",
    detail:
      "Tools that create or delete things are marked as such and their descriptions ask the assistant to check with you first. Your client may also ask before running them.",
  },
  {
    label: "Only what your assistant sends",
    detail:
      "The server receives the tool calls your assistant makes, not your conversation, and keeps no session between calls.",
  },
];

const STACK = [
  {
    name: "MCP TypeScript SDK",
    detail:
      "The official SDK defines the tools and speaks the Streamable HTTP transport at /mcp.",
  },
  {
    name: "Hono",
    detail:
      "Routes requests, allows any origin so browser-based clients can connect, serves the OAuth discovery documents under /.well-known, and serves the setup guide at the root of mcp.westride.org.",
  },
  {
    name: "Clerk and @clerk/mcp-tools",
    detail:
      "Clerk is the OAuth authorization server, the same one this website uses. The MCP server publishes protected-resource metadata pointing at it and verifies each token by asking the API who it belongs to.",
  },
  {
    name: "@westride/api-client",
    detail:
      "Tools call the WeStride API rather than the database, through the same typed client the mobile app uses, with your token attached.",
  },
  {
    name: "Zod",
    detail:
      "Each tool declares a Zod input schema, so your assistant knows exactly what to send. Results come back as structured content plus a JSON text copy for clients that only read text.",
  },
  {
    name: "Astryx",
    detail:
      "The setup guide is rendered on the server with React and Astryx, then hydrated in the browser, using the same Stone theme as this site.",
  },
  {
    name: "Bun and Vercel",
    detail:
      "Bun runs the server in development and bundles it for production, where it runs as a Vercel Function.",
  },
];

const CALL_FLOW = [
  "The first time, your client calls POST /mcp without a token and gets a 401 pointing at the server's protected-resource metadata. From there it finds WeStride sign-in, registers itself, and opens the sign-in page for you.",
  "Afterwards every JSON-RPC request to POST /mcp carries your access token. The server checks it with the API and creates a fresh MCP server and transport bound to it for that request alone. Nothing is shared between requests, so instances can scale out freely.",
  "The tool calls the WeStride API with your token, which reads or writes Neon Postgres as you.",
  "The result goes back to your assistant as JSON, and the per-request server closes.",
];

const RELATED = [
  {
    label: "Setup guide",
    detail:
      "Step-by-step instructions for ChatGPT and Claude, served by the MCP server itself.",
    href: MCP_HOME_URL,
  },
  {
    label: "WeStride API",
    detail: "The API every MCP tool calls, and where you manage API keys.",
    href: "/settings/api",
  },
  {
    label: "Source code",
    detail: "The MCP server and everything else on WeStride, on GitHub.",
    href: SOURCE_URL,
  },
];

function ClientSetup() {
  const [selected, setSelected] = useState(CLIENTS[0].value);
  const client = CLIENTS.find((item) => item.value === selected) ?? CLIENTS[0];

  return (
    <VStack gap={4}>
      <TabList
        value={selected}
        onChange={setSelected}
        role="tablist"
        hasDivider
      >
        {CLIENTS.map((item) => (
          <Tab
            key={item.value}
            value={item.value}
            label={item.label}
            panelId={`mcp-client-${item.value}`}
          />
        ))}
      </TabList>
      <VStack
        gap={4}
        role="tabpanel"
        id={`mcp-client-${client.value}`}
        aria-label={client.label}
      >
        {client.content}
      </VStack>
    </VStack>
  );
}

export function McpOverview() {
  return (
    <DocPage
      tabs={<AccountTabs />}
      title="WeStride MCP"
      lede="Connect ChatGPT, Claude, Cursor, and other AI assistants to WeStride, so they can work on your ideas, projects, and agents with you."
      actions={
        <>
          <Button
            label="Open the setup guide"
            variant="primary"
            href={MCP_HOME_URL}
            target="_blank"
          />
          <Button label="Read about the API" href="/settings/api" />
        </>
      }
    >
      <DocSection id="what-it-is" title="What MCP is">
        <Text>
          The Model Context Protocol (MCP) is an open standard for connecting
          AI assistants to outside tools and data. An assistant that supports
          MCP can call a server&apos;s tools in the middle of a conversation
          and use the results in its answer.
        </Text>
        <Text>
          The WeStride MCP server gives assistants your WeStride. Ask one to
          find ideas looking for help, start a project and plan its first
          tickets, queue work for an agent and read what it did, or build a
          study plan from the Academy, and it works from WeStride&apos;s data
          instead of guessing.
        </Text>
      </DocSection>

      <DocSection id="connect" title="Connect your assistant">
        <Text>
          Every client uses the same server URL. The first time you connect,
          your client opens WeStride sign-in; there is no key to paste.
        </Text>
        <CodeBlock code={MCP_URL} title="Server URL" width="100%" />
        <ClientSetup />
        <Text type="supporting">
          Menu names in ChatGPT and Claude can change between releases. If a
          step looks different, search their settings for
          &ldquo;connectors&rdquo; or &ldquo;apps&rdquo;.
        </Text>
      </DocSection>

      <DocSection id="tools" title="Tools">
        <Text>
          Tools are what an assistant can call. Reads are marked read-only and
          idempotent; writes carry the same permission rules as the website,
          and deletes are flagged as destructive so clients can ask you first.
        </Text>
        <VStack gap={6}>
          {TOOL_GROUPS.map((group) => (
            <VStack key={group.name} gap={2}>
              <Heading level={3}>{group.name}</Heading>
              <Table
                data={group.tools}
                idKey="name"
                density="compact"
                verticalAlign="top"
                columns={[
                  {
                    key: "name",
                    header: "Tool",
                    renderCell: (row) => <Code>{row.name}</Code>,
                  },
                  { key: "description", header: "Does" },
                ]}
              />
            </VStack>
          ))}
        </VStack>
        <Text type="supporting">
          Linking GitHub repositories and starting agent jobs stay on the
          website for now, where GitHub access and Muse keys are checked.
        </Text>
      </DocSection>

      <DocSection id="try-it" title="Things to ask">
        <Text>Once WeStride is connected, try one of these:</Text>
        <List density="compact" listStyle="disc">
          {PROMPTS.map((prompt) => (
            <ListItem key={prompt} label={<Text>&ldquo;{prompt}&rdquo;</Text>} />
          ))}
        </List>
        <Text type="supporting">
          Naming WeStride in the question helps your assistant pick the right
          tool.
        </Text>
      </DocSection>

      <DocSection id="access" title="Access and privacy">
        <List density="compact" listStyle="disc">
          {ACCESS.map((item) => (
            <ListItem
              key={item.label}
              label={item.label}
              description={<Text type="supporting">{item.detail}</Text>}
            />
          ))}
        </List>
      </DocSection>

      <DocSection id="how-its-built" title="How it's built">
        <Text>
          The MCP server is a TypeScript service in the WeStride monorepo. It
          is a thin layer over the API: it describes the tools, then turns each
          call into an API request.
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
          <Heading level={3}>How a tool call flows</Heading>
          <List density="compact" listStyle="decimal">
            {CALL_FLOW.map((step) => (
              <ListItem key={step} label={<Text>{step}</Text>} />
            ))}
          </List>
        </VStack>
      </DocSection>

      <DocSection id="run-locally" title="Run it locally">
        <Text>
          With the repository cloned and Bun installed, start the MCP server
          together with the API it reads from:
        </Text>
        <CodeBlock
          code={`bun install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL and the CLERK_* keys
cp apps/mcp/.env.example apps/mcp/.env   # set CLERK_PUBLISHABLE_KEY
bun run dev:mcp                          # API on :3001, MCP on :3002`}
          language="bash"
          width="100%"
        />
        <Text>Then point Cursor, or any other client, at the local server:</Text>
        <CodeBlock
          code={cursorConfig(LOCAL_MCP_URL)}
          language="json"
          title=".cursor/mcp.json"
          width="100%"
        />
      </DocSection>

      <DocSection id="related" title="Related">
        <List edge="flush" hasDividers>
          {RELATED.map((item) => (
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
