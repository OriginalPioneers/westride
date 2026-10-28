"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { DocPage, DocSection } from "../doc-page";

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
                  server URL, and set Authentication to{" "}
                  <Menu>No authentication</Menu>.
                </>
              ),
            },
            {
              title: "Use it in a chat",
              body: (
                <>
                  Start a new chat, open the <Menu>+</Menu> menu, pick{" "}
                  <Menu>Developer mode</Menu>, and enable{" "}
                  <Menu>WeStride</Menu>.
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
              title: "Use it in a chat",
              body: (
                <>
                  In any conversation, open the tools menu below the message
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
      </>
    ),
  },
  {
    value: "other",
    label: "Other clients",
    content: (
      <Text>
        Any MCP client that supports the Streamable HTTP transport, including
        VS Code, can connect to <Code>{MCP_URL}</Code> with no authentication.
        Look for an option to add a remote or HTTP server in its settings.
      </Text>
    ),
  },
];

const TOOLS = [
  {
    name: "list_academy_tracks",
    description:
      "Every Academy track in recommended order, with its difficulty, estimated duration, category, tags, prerequisite tracks, learning objectives, and the badge earned on completion.",
  },
];

const PROMPTS = [
  "Using WeStride, which Academy tracks should a beginner take first, and in what order?",
  "Look up the WeStride Academy tracks and build me a four-week learning plan.",
  "Which WeStride tracks cover AI agents, and what should I finish before starting them?",
  "How long would it take to finish every beginner track in WeStride Academy?",
];

const ACCESS = [
  {
    label: "No sign-in",
    detail:
      "The server is public. It does not know who you are and cannot see your WeStride account.",
  },
  {
    label: "Read-only",
    detail:
      "Tools only read published catalog data. Nothing is created, changed, or deleted.",
  },
  {
    label: "Only what your assistant sends",
    detail:
      "The server receives the tool calls your assistant makes, not your conversation, and keeps no session between calls.",
  },
  {
    label: "Same data as the API",
    detail:
      "Results come from the public WeStride API, so they match what the API, this website, and the mobile app show.",
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
      "Routes requests, allows any origin so browser-based clients can connect, and serves the setup guide at the root of mcp.westride.org.",
  },
  {
    name: "@westride/api-client",
    detail:
      "Tools call the WeStride API rather than the database, through the same typed client the mobile app uses.",
  },
  {
    name: "Zod",
    detail:
      "Each tool publishes a Zod output schema, so clients know the shape of a result before they call it. Results come back as structured content plus a JSON text copy for clients that only read text.",
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
  "Your assistant decides it needs WeStride data and sends a JSON-RPC request to POST /mcp.",
  "The server creates a fresh MCP server and transport for that request alone. Nothing is shared between requests, so instances can scale out freely.",
  "The tool calls the WeStride API, which answers from Vercel's cache or reads Neon Postgres.",
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
    detail: "The public API every MCP tool reads from.",
    href: "/api",
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
      title="WeStride MCP"
      lede="Connect ChatGPT, Claude, Cursor, and other AI assistants to WeStride, so they answer from the real Academy catalog."
      actions={
        <>
          <Button
            label="Open the setup guide"
            variant="primary"
            href={MCP_HOME_URL}
            target="_blank"
          />
          <Button label="Read about the API" href="/api" />
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
          The WeStride MCP server gives assistants the Academy catalog. Ask one
          to compare tracks, check prerequisites, or plan what to learn next,
          and it answers from WeStride&apos;s data instead of guessing.
        </Text>
      </DocSection>

      <DocSection id="connect" title="Connect your assistant">
        <Text>
          Every client uses the same server URL. There is no account, API key,
          or sign-in.
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
          Tools are what an assistant can call. Each one is read-only and
          idempotent: calling it never changes anything, and calling it twice
          returns the same result.
        </Text>
        <Table
          data={TOOLS}
          idKey="name"
          columns={[
            {
              key: "name",
              header: "Tool",
              renderCell: (row) => <Code>{row.name}</Code>,
            },
            { key: "description", header: "Returns" },
          ]}
        />
        <Text type="supporting">
          More tools will follow as more of WeStride opens up through the API.
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
cp apps/api/.env.example apps/api/.env   # then set DATABASE_URL
cp apps/mcp/.env.example apps/mcp/.env
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
