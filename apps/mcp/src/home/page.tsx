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
                  The WeStride MCP server lets your AI assistant read WeStride
                  data directly, so you can explore WeStride Academy, compare
                  learning tracks, and plan what to learn next in plain
                  conversation.
                </Text>
                <Text type="supporting">
                  No account or API key needed. The server is read-only and
                  never changes anything on your behalf.
                </Text>
              </VStack>

              <Grid columns={{ minWidth: 400, max: 2 }} gap={6}>
                <GuideCard
                  id="chatgpt"
                  name="ChatGPT"
                  tagline="Add WeStride as a custom app"
                  intro="ChatGPT connects to MCP servers through Developer mode. Once WeStride is added, ChatGPT can look up Academy tracks while it answers you."
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
                  extra={urlBlock("MCP server URL")}
                  availability="Available on ChatGPT Plus, Pro, Business, Enterprise, and Edu. On workspace plans, an admin may need to allow custom apps."
                  prompt="Using WeStride, which Academy tracks should a beginner take first, and in what order?"
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
                      title: "Use it in a chat",
                      body: (
                        <>
                          In any conversation, open the tools menu below the
                          message box and make sure <Menu>WeStride</Menu> is
                          switched on.
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
                          terminal:
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
                  prompt="Look up the WeStride Academy tracks and build me a four-week learning plan."
                />
              </Grid>

              <Divider />

              <Grid columns={{ minWidth: 240, max: 3 }} gap={8}>
                <VStack gap={2}>
                  <Heading level={3}>What WeStride can share</Heading>
                  <List listStyle="disc" density="compact">
                    <ListItem
                      label={
                        <Text color="secondary">
                          Every WeStride Academy track in its recommended order
                        </Text>
                      }
                    />
                    <ListItem
                      label={
                        <Text color="secondary">
                          Difficulty, duration, prerequisites, and learning
                          goals
                        </Text>
                      }
                    />
                    <ListItem
                      label={
                        <Text color="secondary">
                          The badge you earn for finishing each track
                        </Text>
                      }
                    />
                  </List>
                </VStack>
                <VStack gap={2}>
                  <Heading level={3}>How it works</Heading>
                  <Text color="secondary">
                    MCP is an open standard that lets AI assistants call tools
                    on other services. When a question needs WeStride data,
                    your assistant asks this server and uses the answer in its
                    reply.
                  </Text>
                </VStack>
                <VStack gap={2}>
                  <Heading level={3}>Other MCP clients</Heading>
                  <Text color="secondary">
                    Cursor, VS Code, and any other client that supports
                    Streamable HTTP can connect to <Code>{serverUrl}</Code>{" "}
                    with no authentication.
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
