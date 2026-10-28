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
    code: "not_found",
    status: "404",
    meaning: "The route or the resource it names does not exist.",
  },
  {
    code: "internal_error",
    status: "500",
    meaning: "Something failed on our side. Retry with backoff.",
  },
];

export function OverviewPage({
  doc,
  specPath,
}: {
  doc: OpenApiDocument;
  specPath: string;
}) {
  const origin = window.location.origin;
  const groups = groupOperations(doc);
  const firstListOperation = groups
    .flatMap((group) => group.operations)
    .find((operation) => operation.path.startsWith("/v1/"));
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
                Every endpoint is a plain HTTPS <Code>GET</Code> that returns
                JSON. There is no API key, so you can call it from a terminal, a
                server, or a browser on any origin.
              </Text>
              <CodeBlock code={`curl ${exampleUrl}`} language="bash" width="100%" />
              <Text type="supporting">
                Pick an endpoint from the menu to read its parameters and
                responses, then send a live request from the Try it panel.
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
                  code={`{ "data": { ... } }\n\n{ "error": { "code": "not_found", "message": "No track with slug \\"x\\"." } }`}
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
                <Heading level={3}>Caching</Heading>
                <Text>
                  Catalog responses send{" "}
                  <Code>Cache-Control: public, max-age=60, s-maxage=300</Code>.
                  Browsers reuse a response for a minute and the edge for five,
                  so new content can take up to five minutes to appear.
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
