import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useState } from "react";
import { useToken } from "./hooks";
import {
  acceptsBearer,
  buildRequestPath,
  defaultParameterValues,
  exampleRequestBody,
  requiresBearer,
  type OpenApiDocument,
  type Operation,
} from "./openapi";
import {
  buildSnippet,
  SNIPPET_LANGUAGES,
  type SnippetLanguage,
} from "./snippets";

const API_KEYS_PAGE = "https://westride.org/settings/api";

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

const SHOWN_HEADERS = [
  "content-type",
  "cache-control",
  "age",
  "x-vercel-cache",
  "www-authenticate",
];

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

function jsonProblem(text: string): string | null {
  if (!text.trim()) {
    return null;
  }
  try {
    JSON.parse(text);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Not valid JSON.";
  }
}

export function RequestConsole({
  doc,
  operation,
}: {
  doc: OpenApiDocument;
  operation: Operation;
}) {
  const parameters = operation.parameters ?? [];
  const hasBody = Boolean(operation.requestBody);
  const needsToken = requiresBearer(operation);
  const takesToken = acceptsBearer(operation);

  const [values, setValues] = useState(() => defaultParameterValues(operation));
  const [body, setBody] = useState(() => exampleRequestBody(doc, operation) ?? "");
  const [missing, setMissing] = useState<string[]>([]);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [result, setResult] = useState<ConsoleResult | null>(null);
  const [language, setLanguage] = useState<SnippetLanguage>("curl");
  const [token, setToken] = useToken();

  const requestPath = buildRequestPath(operation, values);
  const requestUrl = `${window.location.origin}${requestPath}`;
  const snippetSyntax =
    SNIPPET_LANGUAGES.find((option) => option.value === language)?.syntax ?? "bash";

  async function send() {
    const empty = parameters
      .filter((p) => (p.required || p.in === "path") && !values[p.name]?.trim())
      .map((p) => p.name);
    setMissing(empty);
    const problem = hasBody ? jsonProblem(body) : null;
    setBodyError(problem);
    const noToken = needsToken && !token.trim();
    setTokenMissing(noToken);
    if (empty.length > 0 || problem || noToken) {
      return;
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (token.trim()) {
      headers.authorization = `Bearer ${token.trim()}`;
    }
    if (hasBody && body.trim()) {
      headers["content-type"] = "application/json";
    }

    const started = performance.now();
    try {
      const response = await fetch(requestPath, {
        method: operation.method,
        headers,
        body: hasBody && body.trim() ? body : undefined,
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

        {takesToken ? (
          <TextInput
            label="Bearer token"
            type="password"
            autoComplete="off"
            description={
              needsToken
                ? "Required. A WeStride API key or OAuth access token."
                : "Optional. Send one to include your private work."
            }
            isRequired={needsToken}
            isOptional={!needsToken}
            value={token}
            onChange={(value) => {
              setToken(value);
              setTokenMissing(false);
            }}
            status={
              tokenMissing
                ? { type: "error", message: "This endpoint needs a token." }
                : undefined
            }
            width="100%"
          />
        ) : null}

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

        {hasBody ? (
          <TextArea
            label="Request body"
            description={
              operation.requestBody?.description ??
              "JSON. Required fields are filled with placeholders; see the Request body table for the rest."
            }
            value={body}
            onChange={(value) => {
              setBody(value);
              setBodyError(null);
            }}
            rows={Math.min(18, Math.max(4, body.split("\n").length + 1))}
            status={bodyError ? { type: "error", message: bodyError } : undefined}
          />
        ) : null}

        <CodeBlock
          code={`${operation.method} ${requestPath}`}
          language="http"
          hasCopyButton={false}
          hasLanguageLabel={false}
          isWrapped
          width="100%"
        />
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Button label="Send request" variant="primary" clickAction={send} />
          {takesToken ? (
            <Text type="supporting" size="sm">
              Tokens stay in this tab.{" "}
              <Link href={API_KEYS_PAGE} isExternalLink>
                Create an API key
              </Link>
            </Text>
          ) : null}
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
            code={buildSnippet(language, {
              method: operation.method,
              url: requestUrl,
              body: hasBody ? body || "{}" : null,
              withToken: needsToken || (takesToken && Boolean(token.trim())),
            })}
            language={snippetSyntax}
            width="100%"
          />
        </VStack>
      </VStack>
    </VStack>
  );
}
