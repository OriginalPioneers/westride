import { Card } from "@astryxdesign/core/Card";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import {
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
} from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Theme } from "@astryxdesign/core/theme";
import type { ReactNode } from "react";
import { defaultThemeSlug, themes } from "../astryx-themes";
import { WestrideMark } from "./westride-mark";

type Step = { title: string; body: ReactNode };

function Menu({ children }: { children: ReactNode }) {
  return (
    <Text type="inherit" weight="semibold" color="primary">
      {children}
    </Text>
  );
}

function Steps({ steps }: { steps: Step[] }) {
  return (
    <List listStyle="decimal" edge="flush" density="spacious">
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

function GuideCard({
  id,
  name,
  tagline,
  intro,
  steps,
  extra,
  availability,
  prompt,
}: {
  id: string;
  name: string;
  tagline: string;
  intro: string;
  steps: Step[];
  extra?: ReactNode;
  availability: string;
  prompt: string;
}) {
  return (
    <Card>
      <VStack gap={6} height="100%" justify="between">
        <VStack gap={6}>
          <VStack gap={1}>
            <Heading level={2} id={id}>
              {name}
            </Heading>
            <Text type="supporting">{tagline}</Text>
          </VStack>
          <Text color="secondary">{intro}</Text>
          <Steps steps={steps} />
          {extra}
          <Text type="supporting">{availability}</Text>
        </VStack>
        <VStack gap={4}>
          <Divider />
          <VStack gap={1}>
            <Text type="label" color="secondary">
              Try asking
            </Text>
            <Text>“{prompt}”</Text>
          </VStack>
        </VStack>
      </VStack>
    </Card>
  );
}

export function HomePage({ serverUrl }: { serverUrl: string }) {
  const urlBlock = (label: string) => (
    <CodeBlock code={serverUrl} title={label} size="sm" width="100%" />
  );

  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <Layout
        height="auto"
        contentWidth={960}
        header={
          <LayoutHeader hasDivider>
            <HStack gap={3} vAlign="center" justify="between">
              <HStack gap={2} vAlign="center">
                <Icon icon={WestrideMark} size="lg" />
                <Text type="large" weight="bold">
                  WeStride
                </Text>
                <Text type="supporting">MCP</Text>
              </HStack>
              <Link href="https://westride.org">westride.org</Link>
            </HStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent isScrollable={false} padding={8}>
            <VStack gap={8}>
              <VStack gap={3}>
                <Text type="label" color="secondary">
                  Model Context Protocol
                </Text>
                <Heading level={1} type="display-1" textWrap="balance">
                  Bring WeStride into ChatGPT and Claude
                </Heading>
                <Text type="large" color="secondary" textWrap="pretty">
                  The WeStride MCP server lets your AI assistant work in
                  WeStride with you: find and shape ideas, run projects and
                  their ticket boards, queue work for agents and read what they
                  did, and explore the Academy, all in plain conversation.
                </Text>
                <Text type="supporting">
                  You sign in with your WeStride account the first time you
                  connect. The assistant then sees what you can see and can do
                  what you can do on the website, nothing more.
                </Text>
              </VStack>

              <Grid columns={{ minWidth: 400, max: 2 }} gap={6}>
                <GuideCard
                  id="chatgpt"
                  name="ChatGPT"
                  tagline="Add WeStride as a custom app"
                  intro="ChatGPT connects to MCP servers through Developer mode. Once WeStride is added and you have signed in, ChatGPT can read and update your ideas, projects, and agents while it answers you."
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
                          <Menu>Create</Menu>. Name it <Menu>WeStride</Menu>,
                          paste the server URL below, and set Authentication to{" "}
                          <Menu>OAuth</Menu>. Leave the client fields empty;
                          ChatGPT registers itself.
                        </>
                      ),
                    },
                    {
                      title: "Sign in and use it",
                      body: (
                        <>
                          ChatGPT opens WeStride sign-in once. Then in a new
                          chat, open the <Menu>+</Menu> menu, pick{" "}
                          <Menu>Developer mode</Menu>, and enable{" "}
                          <Menu>WeStride</Menu>.
                        </>
                      ),
                    },
                  ]}
                  extra={urlBlock("MCP server URL")}
                  availability="Available on ChatGPT Plus, Pro, Business, Enterprise, and Edu. On workspace plans, an admin may need to allow custom apps."
                  prompt="Using WeStride, show me the open tickets on my projects and draft a plan for this week."
                />

                <GuideCard
                  id="claude"
                  name="Claude"
                  tagline="Add WeStride as a custom connector"
                  intro="Claude supports remote MCP servers as custom connectors in Claude.ai and the desktop app, and as an MCP server in Claude Code."
                  steps={[
                    {
                      title: "Open Connectors",
                      body: (
                        <>
                          In Claude, go to <Menu>Settings</Menu> →{" "}
                          <Menu>Connectors</Menu> and choose{" "}
                          <Menu>Add custom connector</Menu>.
                        </>
                      ),
                    },
                    {
                      title: "Add WeStride",
                      body: (
                        <>
                          Name it <Menu>WeStride</Menu>, paste the server URL
                          below as the remote MCP server URL, then select{" "}
                          <Menu>Add</Menu>.
                        </>
                      ),
                    },
                    {
                      title: "Sign in and use it",
                      body: (
                        <>
                          Claude asks you to connect; sign in with WeStride
                          once. Then, in any conversation, open the tools menu
                          below the message box and make sure{" "}
                          <Menu>WeStride</Menu> is switched on.
                        </>
                      ),
                    },
                  ]}
                  extra={
                    <VStack gap={6}>
                      {urlBlock("Remote MCP server URL")}
                      <Divider />
                      <VStack gap={2}>
                        <Text weight="semibold">Using Claude Code?</Text>
                        <Text type="supporting">
                          Skip the steps above and run this once in your
                          terminal, then <Code>/mcp</Code> to sign in:
                        </Text>
                        <CodeBlock
                          code={`claude mcp add --transport http westride ${serverUrl}`}
                          language="bash"
                          size="sm"
                          width="100%"
                          isWrapped
                        />
                      </VStack>
                    </VStack>
                  }
                  availability="Available on every Claude plan. On Team and Enterprise, an owner adds the connector from Admin settings first."
                  prompt="Queue a ticket for my docs agent on WeStride to review last week's changes, then tell me what it did on its last run."
                />
              </Grid>

              <Divider />

              <Grid columns={{ minWidth: 240, max: 3 }} gap={8}>
                <VStack gap={2}>
                  <Heading level={3}>What your assistant can do</Heading>
                  <List listStyle="disc" density="compact">
                    <ListItem
                      label={
                        <Text color="secondary">
                          Ideas: search, read, create, edit, and follow
                        </Text>
                      }
                    />
                    <ListItem
                      label={
                        <Text color="secondary">
                          Projects: team, milestones, and the ticket board,
                          including comments
                        </Text>
                      }
                    />
                    <ListItem
                      label={
                        <Text color="secondary">
                          Agents: settings and schedule, queue work, read
                          jobs, log, and usage
                        </Text>
                      }
                    />
                    <ListItem
                      label={
                        <Text color="secondary">
                          Academy tracks and lessons
                        </Text>
                      }
                    />
                  </List>
                </VStack>
                <VStack gap={2}>
                  <Heading level={3}>How sign-in works</Heading>
                  <Text color="secondary">
                    The server follows the MCP authorization spec. Your client
                    discovers WeStride sign-in from the server, registers
                    itself, and opens the sign-in page in your browser. The
                    token it receives is forwarded to the WeStride API on every
                    call, so permissions match the website exactly. Revoke
                    access any time from your WeStride account settings.
                  </Text>
                </VStack>
                <VStack gap={2}>
                  <Heading level={3}>Other MCP clients</Heading>
                  <Text color="secondary">
                    Cursor, VS Code, and any other client that supports
                    Streamable HTTP with OAuth can connect to{" "}
                    <Code>{serverUrl}</Code>. Clients without OAuth support can
                    send a WeStride API key as a bearer token instead; create
                    one at{" "}
                    <Link href="https://westride.org/settings/api">
                      westride.org/settings/api
                    </Link>
                    .
                  </Text>
                </VStack>
              </Grid>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <Text type="supporting">
              Menu names in ChatGPT and Claude can change between releases. If
              a step looks different, search their settings for “connectors” or
              “apps”.
            </Text>
          </LayoutFooter>
        }
      />
    </Theme>
  );
}
