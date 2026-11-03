import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Stack";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { operationHref } from "./hooks";
import { groupOperations, type OpenApiDocument } from "./openapi";

const ERROR_CODES = [
  {
    code: "validation_failed",
    status: "400",
    meaning: "A parameter or body field is wrong. `error.fields` names each one.",
  },
  {
    code: "unauthorized",
    status: "401",
    meaning: "The endpoint needs a token, or the one sent did not verify.",
  },
  {
    code: "forbidden",
    status: "403",
    meaning: "You are signed in but not allowed to do this, e.g. editing a project you do not own.",
  },
  {
    code: "not_found",
    status: "404",
    meaning: "Nothing with that id is visible to you. Private items read as missing.",
  },
  {
    code: "conflict",
    status: "409",
    meaning: "The change clashes with the current state, e.g. deleting an agent with a running job.",
  },
  {
    code: "internal_error",
    status: "500",
    meaning: "Something failed on our side. Retry with backoff.",
  },
];

const API_KEYS_PAGE = "https://westride.org/settings/api";

export function OverviewPage({
  doc,
  specPath,
}: {
  doc: OpenApiDocument;
  specPath: string;
}) {
  const origin = window.location.origin;
  const groups = groupOperations(doc);
  const operations = groups.flatMap((group) => group.operations);
  const firstListOperation =
    operations.find((operation) => operation.method === "GET" && operation.path === "/v1/ideas") ??
    operations.find((operation) => operation.method === "GET" && operation.path.startsWith("/v1/"));
  const exampleUrl = `${origin}${firstListOperation?.path ?? "/health"}`;

  return (
    <Layout
      contentWidth={960}
      padding={6}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Heading level={1}>{doc.info.title}</Heading>
            {doc.info.description ? (
              <Text type="supporting">{doc.info.description}</Text>
            ) : null}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            <VStack gap={4}>
              <Heading level={2}>Make your first request</Heading>
              <Text>
                Every endpoint speaks JSON over HTTPS and allows any origin.
                Public ideas, projects, agents, and the Academy need no token,
                so start from a terminal:
              </Text>
              <CodeBlock code={`curl ${exampleUrl}`} language="bash" width="100%" />
              <Text type="supporting">
                Pick an endpoint from the menu to read its parameters and
                responses, then send a live request from the Try it panel.
              </Text>
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>Authentication</Heading>
              <Text>
                To see your private work or change anything, send a bearer
                token. The API accepts two kinds, both tied to your WeStride
                account:
              </Text>
              <List edge="flush" hasDividers>
                <ListItem
                  label="API key"
                  description={
                    <Text size="sm">
                      For scripts and servers. Create and revoke keys at{" "}
                      <Link href={API_KEYS_PAGE} isExternalLink>
                        westride.org/settings/api
                      </Link>
                      . Keep them out of client-side code.
                    </Text>
                  }
                />
                <ListItem
                  label="OAuth access token"
                  description="For apps acting on a member's behalf, including MCP clients. The member signs in with WeStride and the app receives a token it forwards here."
                />
              </List>
              <CodeBlock
                code={`curl ${origin}/v1/me \\\n  -H "Authorization: Bearer $WESTRIDE_API_KEY"`}
                language="bash"
                width="100%"
              />
              <Text>
                Everything runs as the member behind the token: you see what you
                could see on the website and can do what you could do there, no
                more. Items you cannot see return <Code>404</Code>; actions you
                may not take return <Code>403</Code>.
              </Text>
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>Endpoints</Heading>
              {groups.map((group) => (
                <List
                  key={group.tag}
                  edge="flush"
                  hasDividers
                  header={
                    <VStack gap={1}>
                      <Heading level={3}>{group.tag}</Heading>
                      {group.description ? (
                        <Text type="supporting">{group.description}</Text>
                      ) : null}
                    </VStack>
                  }
                >
                  {group.operations.map((operation) => (
                    <ListItem
                      key={operation.id}
                      href={operationHref(operation.id)}
                      label={operation.summary ?? operation.path}
                      description={
                        <Code color="secondary">
                          {operation.method} {operation.path}
                        </Code>
                      }
                    />
                  ))}
                </List>
              ))}
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>Conventions</Heading>
              <VStack gap={2}>
                <Heading level={3}>Base URL</Heading>
                <Text>
                  Paths in this reference are relative to{" "}
                  <Code>{origin}</Code>. Data endpoints are versioned under{" "}
                  <Code>/v1</Code>.
                </Text>
              </VStack>
              <VStack gap={2}>
                <Heading level={3}>Response envelope</Heading>
                <Text>
                  Successful responses wrap their payload in <Code>data</Code>.
                  Errors use an <Code>error</Code> object with a stable{" "}
                  <Code>code</Code> you can branch on and a readable{" "}
                  <Code>message</Code>.
                </Text>
                <CodeBlock
                  code={`{ "data": { ... } }\n\n{ "error": { "code": "validation_failed", "message": "name: Give the idea a name.", "fields": { "name": "Give the idea a name." } } }`}
                  language="json"
                  width="100%"
                />
              </VStack>
              <VStack gap={2}>
                <Heading level={3}>Error codes</Heading>
                <Table
                  data={ERROR_CODES}
                  idKey="code"
                  density="compact"
                  columns={[
                    {
                      key: "code",
                      header: "Code",
                      renderCell: (row) => <Code>{row.code}</Code>,
                    },
                    { key: "status", header: "HTTP status" },
                    { key: "meaning", header: "Meaning" },
                  ]}
                />
              </VStack>
              <VStack gap={2}>
                <Heading level={3}>Partial updates</Heading>
                <Text>
                  <Code>PATCH</Code> endpoints take only the fields you want to
                  change; anything you leave out keeps its value. Send{" "}
                  <Code>null</Code> to clear an optional link such as a
                  ticket&apos;s milestone or an agent&apos;s project.
                </Text>
              </VStack>
              <VStack gap={2}>
                <Heading level={3}>People</Heading>
                <Text>
                  Members appear as <Code>{`{ id, name, username, imageUrl }`}</Code>.
                  When inviting someone, send their <Code>id</Code>; find your
                  own with <Code>GET /v1/me</Code>.
                </Text>
              </VStack>
              <VStack gap={2}>
                <Heading level={3}>Caching</Heading>
                <Text>
                  Catalog responses (Academy tracks, idea categories) send{" "}
                  <Code>Cache-Control: public, max-age=60, s-maxage=300</Code>.
                  Everything else is uncached and reflects the latest state.
                </Text>
              </VStack>
            </VStack>

            <Divider />

            <VStack gap={4}>
              <Heading level={2}>OpenAPI spec</Heading>
              <Text>
                This reference is generated from the API&apos;s OpenAPI 3.1
                document at{" "}
                <Link href={specPath} isExternalLink>
                  {specPath}
                </Link>
                . The spec is built from the same schemas the server uses to
                shape its responses, so it stays in step with the code. Import
                it into Postman or Insomnia, or feed it to a client generator.
              </Text>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
