"use client";

import { useState, useTransition } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { MuseRequest } from "@westride/db";
import type {
  MuseRequestSummary,
  MuseUsageTotals,
} from "@westride/db/idea-factory";
import { getAgent } from "@/lib/idea-factory/agents";
import type { FactoryPreferences } from "@/lib/idea-factory/credentials";
import {
  formatMicrosAsUsd,
  formatTokens,
  getMuseModel,
  MUSE_MODELS,
} from "@/lib/idea-factory/pricing";
import type { MetaConnectionSummary } from "@/lib/meta/connection";
import { getMuseRequestDetail } from "./actions";

const META_DASHBOARD_URL = "https://dev.meta.ai/";

const PURPOSE_LABELS: Record<string, string> = {
  chat: "Conversation",
  evaluation: "Evaluation",
  synthesis: "Synthesis",
  verify: "Key check",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <VStack gap={0}>
      <Text type="supporting">{label}</Text>
      <Text type="large" weight="semibold">
        {value}
      </Text>
      {hint ? <Text type="supporting">{hint}</Text> : null}
    </VStack>
  );
}

function requestTitle(request: MuseRequestSummary): string {
  const agent = request.agentSlug ? getAgent(request.agentSlug) : undefined;
  const purpose = PURPOSE_LABELS[request.purpose] ?? request.purpose;
  return agent ? `${agent.name} · ${purpose}` : purpose;
}

function requestDetail(request: MuseRequestSummary): string {
  const model = getMuseModel(request.model)?.label ?? request.model;
  const tokens = `${formatTokens(request.inputTokens)} in / ${formatTokens(request.outputTokens)} out`;
  const search = request.webSearchCalls > 0 ? ` · ${request.webSearchCalls} web search` : "";
  const seconds = (request.durationMs / 1000).toFixed(1);
  return `${model} · ${tokens}${search} · ${seconds}s`;
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return String(value);
  }
}

export function ActivityPanel({
  ideaId,
  requests,
  usage,
  meta,
  preferences,
  onPreferencesChange,
  onDisconnect,
}: {
  ideaId: string;
  requests: MuseRequestSummary[];
  usage: MuseUsageTotals;
  meta: MetaConnectionSummary | null;
  preferences: FactoryPreferences;
  onPreferencesChange: (next: FactoryPreferences) => void;
  onDisconnect: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MuseRequest | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoadingDetail, startLoadingDetail] = useTransition();

  const latest = requests.find(
    (request) =>
      request.rateLimitRemainingTokens !== null ||
      request.rateLimitRemainingRequests !== null,
  );
  const model = getMuseModel(preferences.model);

  function open(request: MuseRequestSummary) {
    if (selectedId === request.id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    setSelectedId(request.id);
    setDetail(null);
    setDetailError(null);
    startLoadingDetail(async () => {
      const result = await getMuseRequestDetail(ideaId, request.id);
      if (result.status === "ok") {
        setDetail(result.request);
      } else {
        setDetailError(result.message);
      }
    });
  }

  return (
    <VStack gap={8}>
      <Card padding={6}>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Your Meta connection</Heading>
            <Text type="supporting">
              Requests are billed to your own Meta Model API account. The key is
              kept encrypted on your WeStride account.
            </Text>
          </VStack>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              {meta ? (
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Badge variant="success" label="Connected" />
                  <Text>{meta.label}</Text>
                  <Text type="supporting">
                    since <Timestamp value={meta.connectedAt} format="date" />
                  </Text>
                </HStack>
              ) : (
                <Text type="supporting">Not connected.</Text>
              )}
            </StackItem>
            {meta ? (
              <Button label="Disconnect" variant="secondary" onClick={onDisconnect} />
            ) : null}
          </HStack>
          <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
            <Selector
              label="Muse model"
              options={MUSE_MODELS.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              value={preferences.model}
              onChange={(value) => {
                if (value) {
                  onPreferencesChange({ ...preferences, model: value });
                }
              }}
              description={model?.description}
              width="100%"
            />
            <CheckboxInput
              label="Let advisors search the web"
              description="Research agents cite sources with dates. Meta bills $2.50 per 1,000 searches on top of tokens."
              value={preferences.webSearch}
              onChange={(checked) =>
                onPreferencesChange({ ...preferences, webSearch: checked })
              }
            />
          </Grid>
          {model?.isContributor ? (
            <Banner
              status="warning"
              title="Contributor mode shares your content with Meta"
              description="Prompts and responses sent to a Contributor model may be used to train future Meta models. Switch to a standard model if this idea is confidential."
            />
          ) : null}
        </VStack>
      </Card>

      <Card padding={6}>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Your spend on this idea</Heading>
            <Text type="supporting">
              Estimated from Meta&apos;s published prices and the token counts each
              response reports. Meta does not expose an account balance through
              the API; the exact bill is in your{" "}
              <Link href={META_DASHBOARD_URL} target="_blank">
                Meta dashboard
              </Link>
              .
            </Text>
          </VStack>
          <Grid columns={{ minWidth: 150, max: 5 }} gap={5}>
            <Stat label="Requests" value={formatTokens(usage.requests)} />
            <Stat
              label="Input tokens"
              value={formatTokens(usage.inputTokens)}
              hint={
                usage.cachedTokens > 0
                  ? `${formatTokens(usage.cachedTokens)} from cache`
                  : undefined
              }
            />
            <Stat label="Output tokens" value={formatTokens(usage.outputTokens)} />
            <Stat
              label="Web searches"
              value={formatTokens(usage.webSearchCalls)}
            />
            <Stat
              label="Estimated cost"
              value={formatMicrosAsUsd(usage.estimatedCostMicros)}
              hint="USD, before tax"
            />
          </Grid>
          {latest ? (
            <Text type="supporting">
              Meta&apos;s rate limit after your last request:{" "}
              {latest.rateLimitRemainingTokens !== null
                ? `${formatTokens(latest.rateLimitRemainingTokens)} tokens`
                : "tokens n/a"}
              {" · "}
              {latest.rateLimitRemainingRequests !== null
                ? `${formatTokens(latest.rateLimitRemainingRequests)} requests`
                : "requests n/a"}{" "}
              remaining this minute, shared across your team&apos;s keys.
            </Text>
          ) : null}
        </VStack>
      </Card>

      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>Requests sent to Muse</Heading>
          <Text type="supporting">
            Every call the Idea Factory made for this idea, by any member.
            Select one to read exactly what was sent and what came back.
          </Text>
        </VStack>

        {requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Ask an advisor a question or run an evaluation and it will show up here."
            isCompact
          />
        ) : (
          <List hasDividers edge="flush" density="compact">
            {requests.map((request) => (
              <ListItem
                key={request.id}
                label={requestTitle(request)}
                description={requestDetail(request)}
                isSelected={selectedId === request.id}
                onClick={() => open(request)}
                startContent={
                  request.error ? (
                    <Badge variant="error" label="Error" />
                  ) : (
                    <Badge variant="neutral" label={String(request.statusCode ?? "—")} />
                  )
                }
                endContent={
                  <VStack gap={0} hAlign="end">
                    <Text weight="semibold">
                      {formatMicrosAsUsd(request.estimatedCostMicros)}
                    </Text>
                    <Timestamp value={request.createdAt.toISOString()} format="auto" />
                  </VStack>
                }
              />
            ))}
          </List>
        )}

        {selectedId ? (
          <Card padding={5} variant="muted">
            {isLoadingDetail ? (
              <HStack gap={2} vAlign="center">
                <Spinner size="sm" aria-label="Loading request" />
                <Text type="supporting">Loading the request…</Text>
              </HStack>
            ) : detailError ? (
              <Banner status="error" title={detailError} />
            ) : detail ? (
              <VStack gap={5}>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <StackItem size="fill">
                    <VStack gap={0}>
                      <Heading level={3}>{requestTitle(detail)}</Heading>
                      <Text type="supporting">
                        POST https://api.meta.ai/v1{detail.endpoint} ·{" "}
                        {detail.statusCode ?? "no response"} ·{" "}
                        <Timestamp value={detail.createdAt.toISOString()} format="date_time" />
                      </Text>
                    </VStack>
                  </StackItem>
                  <Text type="supporting">
                    {formatTokens(detail.totalTokens)} tokens
                    {detail.reasoningTokens > 0
                      ? ` (${formatTokens(detail.reasoningTokens)} reasoning)`
                      : ""}{" "}
                    · {formatMicrosAsUsd(detail.estimatedCostMicros)}
                  </Text>
                </HStack>
                {detail.error ? <Banner status="error" title={detail.error} /> : null}
                <CodeBlock
                  code={pretty(detail.requestBody)}
                  language="json"
                  title="Request body (Authorization header omitted)"
                  isCollapsible
                  maxHeight={360}
                />
                <CodeBlock
                  code={pretty(detail.responseBody)}
                  language="json"
                  title="Response body"
                  isCollapsible
                  maxHeight={480}
                />
              </VStack>
            ) : null}
          </Card>
        ) : null}
      </VStack>
    </VStack>
  );
}
