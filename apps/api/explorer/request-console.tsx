import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useState } from "react";
import {
  buildRequestPath,
  defaultParameterValues,
  type Operation,
} from "./openapi";
import {
  buildSnippet,
  SNIPPET_LANGUAGES,
  type SnippetLanguage,
} from "./snippets";

type ConsoleResult =
  | {
      kind: "response";
      status: number;
      statusText: string;
      durationMs: number;
      sizeBytes: number;
      headers: [string, string][];
      body: string;
      language: string;
    }
  | { kind: "network-error"; message: string };

const SHOWN_HEADERS = ["content-type", "cache-control", "age", "x-vercel-cache"];

function formatBody(text: string, contentType: string | null) {
  if (contentType?.includes("json")) {
    try {
      return { body: JSON.stringify(JSON.parse(text), null, 2), language: "json" };
    } catch {
      // Fall through and show the raw text.
    }
  }
  return { body: text, language: "plaintext" };
}

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function RequestConsole({ operation }: { operation: Operation }) {
  const parameters = operation.parameters ?? [];
  const [values, setValues] = useState(() => defaultParameterValues(operation));
  const [missing, setMissing] = useState<string[]>([]);
  const [result, setResult] = useState<ConsoleResult | null>(null);
  const [language, setLanguage] = useState<SnippetLanguage>("curl");

  const requestPath = buildRequestPath(operation, values);
  const requestUrl = `${window.location.origin}${requestPath}`;
  const snippetSyntax =
    SNIPPET_LANGUAGES.find((option) => option.value === language)?.syntax ?? "bash";

  async function send() {
    const empty = parameters
      .filter((p) => (p.required || p.in === "path") && !values[p.name]?.trim())
      .map((p) => p.name);
    setMissing(empty);
    if (empty.length > 0) {
      return;
    }

    const started = performance.now();
    try {
      const response = await fetch(requestPath, {
        method: operation.method,
        headers: { accept: "application/json" },
      });
      const text = await response.text();
      setResult({
        kind: "response",
        status: response.status,
        statusText: response.statusText,
        durationMs: Math.round(performance.now() - started),
        sizeBytes: new TextEncoder().encode(text).length,
        headers: [...response.headers.entries()].filter(([name]) =>
          SHOWN_HEADERS.includes(name),
        ),
        ...formatBody(text, response.headers.get("content-type")),
      });
    } catch (error) {
      setResult({
        kind: "network-error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <VStack gap={6}>
      <VStack gap={4}>
        <Heading level={2}>Try it</Heading>
        {parameters.map((parameter) => (
          <TextInput
            key={parameter.name}
            label={parameter.name}
            description={parameter.description}
            isRequired={parameter.required || parameter.in === "path"}
            value={values[parameter.name] ?? ""}
            onChange={(value) => {
              setValues((current) => ({ ...current, [parameter.name]: value }));
              setMissing((current) => current.filter((name) => name !== parameter.name));
            }}
            onEnter={() => void send()}
            status={
              missing.includes(parameter.name)
                ? { type: "error", message: `Enter a ${parameter.name}.` }
                : undefined
            }
            width="100%"
          />
        ))}
        <CodeBlock
          code={`${operation.method} ${requestPath}`}
          language="http"
          hasCopyButton={false}
          hasLanguageLabel={false}
          isWrapped
          width="100%"
        />
        <HStack>
          <Button label="Send request" variant="primary" clickAction={send} />
        </HStack>
      </VStack>

      {result?.kind === "network-error" ? (
        <Banner
          status="error"
          title="Request failed"
          description={`The browser could not reach the API: ${result.message}`}
        />
      ) : null}

      {result?.kind === "response" ? (
        <VStack gap={3}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Heading level={3}>Response</Heading>
            <Badge
              variant={result.status < 400 ? "success" : "error"}
              label={`${result.status} ${result.statusText}`.trim()}
            />
            <Text type="supporting" size="sm">
              {result.durationMs} ms · {formatSize(result.sizeBytes)}
            </Text>
          </HStack>
          <CodeBlock
            code={result.body || "(empty body)"}
            language={result.language}
            maxHeight="60vh"
            width="100%"
          />
          {result.headers.length > 0 ? (
            <MetadataList title={<Heading level={4}>Headers</Heading>}>
              {result.headers.map(([name, value]) => (
                <MetadataListItem key={name} label={name}>
                  <Text type="code" size="sm">
                    {value}
                  </Text>
                </MetadataListItem>
              ))}
            </MetadataList>
          ) : null}
        </VStack>
      ) : null}

      <VStack gap={3}>
        <Heading level={3}>Code samples</Heading>
        <TabList
          value={language}
          onChange={(value) => setLanguage(value as SnippetLanguage)}
          size="sm"
          hasDivider
          role="tablist"
        >
          {SNIPPET_LANGUAGES.map((option) => (
            <Tab
              key={option.value}
              value={option.value}
              label={option.label}
              panelId="request-console-snippet"
            />
          ))}
        </TabList>
        <VStack id="request-console-snippet" role="tabpanel">
          <CodeBlock
            code={buildSnippet(language, operation.method, requestUrl)}
            language={snippetSyntax}
            width="100%"
          />
        </VStack>
      </VStack>
    </VStack>
  );
}
