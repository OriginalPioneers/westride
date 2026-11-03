import { Badge, type BadgeProps } from "@astryxdesign/core/Badge";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
} from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Table } from "@astryxdesign/core/Table";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import {
  acceptsBearer,
  exampleFromSchema,
  flattenSchema,
  jsonSchemaOf,
  requiresBearer,
  schemaTypeLabel,
  type OpenApiDocument,
  type Operation,
} from "./openapi";
import { RequestConsole } from "./request-console";
import { SchemaTable } from "./schema-table";

const METHOD_BADGE: Record<string, BadgeProps["variant"]> = {
  GET: "blue",
  POST: "green",
  PUT: "orange",
  PATCH: "orange",
  DELETE: "red",
};

const STATUS_TEXT: Record<string, string> = {
  "200": "OK",
  "201": "Created",
  "204": "No Content",
  "400": "Bad Request",
  "401": "Unauthorized",
  "403": "Forbidden",
  "404": "Not Found",
  "409": "Conflict",
  "429": "Too Many Requests",
  "500": "Internal Server Error",
};

function AuthSection({ operation }: { operation: Operation }) {
  if (!acceptsBearer(operation)) {
    return null;
  }
  const required = requiresBearer(operation);
  return (
    <VStack gap={2}>
      <HStack gap={2} vAlign="center">
        <Heading level={2}>Authentication</Heading>
        <Badge variant={required ? "orange" : "neutral"} label={required ? "Required" : "Optional"} />
      </HStack>
      <Text>
        {required
          ? "Send a WeStride API key or OAuth access token as "
          : "Works without a token for public data. Send a WeStride API key or OAuth access token as "}
        <Code>Authorization: Bearer &lt;token&gt;</Code>
        {required
          ? ". The change is made as that member, with the same permissions they have on the website."
          : " to also see your private work and your role on each item."}
      </Text>
    </VStack>
  );
}

function RequestBodySection({
  doc,
  operation,
}: {
  doc: OpenApiDocument;
  operation: Operation;
}) {
  const body = operation.requestBody;
  if (!body) {
    return null;
  }
  const schema = jsonSchemaOf(body);
  const fields = flattenSchema(doc, schema);
  return (
    <VStack gap={3}>
      <Heading level={2}>Request body</Heading>
      <Text>
        JSON, sent as <Code>application/json</Code>.
        {body.description ? ` ${body.description}` : ""}
      </Text>
      {fields.length > 0 ? <SchemaTable fields={fields} /> : null}
    </VStack>
  );
}

function ParametersSection({
  doc,
  operation,
}: {
  doc: OpenApiDocument;
  operation: Operation;
}) {
  const rows = (operation.parameters ?? []).map((parameter) => ({
    name: parameter.name,
    location: parameter.in,
    type: schemaTypeLabel(doc, parameter.schema),
    isRequired: parameter.required || parameter.in === "path",
    description: parameter.description ?? "",
  }));

  return (
    <VStack gap={3}>
      <Heading level={2}>Parameters</Heading>
      {rows.length === 0 ? (
        <Text type="supporting">This endpoint takes no parameters.</Text>
      ) : (
        <Table
          data={rows}
          idKey="name"
          density="compact"
          verticalAlign="top"
          columns={[
            {
              key: "name",
              header: "Name",
              renderCell: (row) => <Code>{row.name}</Code>,
            },
            { key: "location", header: "In" },
            {
              key: "type",
              header: "Type",
              renderCell: (row) => (
                <Text type="code" size="sm">
                  {row.type}
                  {row.isRequired ? "" : " (optional)"}
                </Text>
              ),
            },
            { key: "description", header: "Description" },
          ]}
        />
      )}
    </VStack>
  );
}

function ResponsesSection({
  doc,
  operation,
}: {
  doc: OpenApiDocument;
  operation: Operation;
}) {
  const statuses = Object.keys(operation.responses);
  const [status, setStatus] = useState(statuses[0] ?? "200");
  const response = operation.responses[status];
  const schema = response ? jsonSchemaOf(response) : undefined;
  const fields = flattenSchema(doc, schema);
  const example =
    response?.content?.["application/json"]?.example ??
    exampleFromSchema(doc, schema);
  const headers = Object.entries(response?.headers ?? {});

  return (
    <VStack gap={3}>
      <Heading level={2}>Responses</Heading>
      <TabList value={status} onChange={setStatus} hasDivider role="tablist">
        {statuses.map((code) => (
          <Tab
            key={code}
            value={code}
            label={`${code} ${STATUS_TEXT[code] ?? ""}`.trim()}
            panelId="operation-response-panel"
          />
        ))}
      </TabList>
      {response ? (
        <VStack id="operation-response-panel" role="tabpanel" gap={4}>
          <Text>{response.description}</Text>
          {headers.length > 0 ? (
            <MetadataList title={<Heading level={3}>Headers</Heading>}>
              {headers.map(([name, header]) => (
                <MetadataListItem key={name} label={name}>
                  <Text size="sm">{header.description ?? ""}</Text>
                </MetadataListItem>
              ))}
            </MetadataList>
          ) : null}
          {fields.length > 0 ? (
            <VStack gap={2}>
              <Heading level={3}>Body</Heading>
              <SchemaTable fields={fields} />
            </VStack>
          ) : null}
          {schema ? (
            <VStack gap={2}>
              <Heading level={3}>Example</Heading>
              <CodeBlock
                code={JSON.stringify(example, null, 2)}
                language="json"
                maxHeight="40vh"
                width="100%"
              />
            </VStack>
          ) : null}
        </VStack>
      ) : null}
    </VStack>
  );
}

export function OperationPage({
  doc,
  operation,
}: {
  doc: OpenApiDocument;
  operation: Operation;
}) {
  const isStacked = useMediaQuery("(max-width: 1180px)");
  const requestConsole = <RequestConsole doc={doc} operation={operation} />;
  const hasBody = Boolean(operation.requestBody);
  const hasAuth = acceptsBearer(operation);

  return (
    <Layout
      padding={6}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Badge
                variant={METHOD_BADGE[operation.method] ?? "neutral"}
                label={operation.method}
              />
              <Code>{operation.path}</Code>
            </HStack>
            <Heading level={1}>{operation.summary ?? operation.path}</Heading>
            {operation.description ? (
              <Text type="supporting">{operation.description}</Text>
            ) : null}
          </VStack>
        </LayoutHeader>
      }
      end={
        isStacked ? undefined : (
          <LayoutPanel
            hasDivider
            width={460}
            role="complementary"
            label="Try it"
          >
            {requestConsole}
          </LayoutPanel>
        )
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {hasAuth ? (
              <>
                <AuthSection operation={operation} />
                <Divider />
              </>
            ) : null}
            <ParametersSection doc={doc} operation={operation} />
            {hasBody ? (
              <>
                <Divider />
                <RequestBodySection doc={doc} operation={operation} />
              </>
            ) : null}
            <Divider />
            <ResponsesSection doc={doc} operation={operation} />
            {isStacked ? (
              <>
                <Divider />
                {requestConsole}
              </>
            ) : null}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
