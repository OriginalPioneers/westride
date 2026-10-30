"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Link } from "@astryxdesign/core/Link";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { AgentRunStatus } from "@westride/db";
import { describeRunEvent, type RunLogEvent, type RunSnapshot } from "@/lib/build/agent/snapshot";
import { AGENT_RUN_STATUS_LABELS } from "@/lib/build/labels";
import { cancelRunAction, readRunAction } from "../../../run-actions";

const POLL_MS = 3000;
const ACTIVE: AgentRunStatus[] = ["QUEUED", "RUNNING"];

const STATUS_VARIANT: Record<AgentRunStatus, "neutral" | "blue" | "green" | "error" | "orange"> = {
  QUEUED: "neutral",
  RUNNING: "blue",
  SUCCEEDED: "green",
  FAILED: "error",
  CANCELLED: "orange",
};

export function RunStatusBadge({ status }: { status: AgentRunStatus }) {
  return <Badge variant={STATUS_VARIANT[status]} label={AGENT_RUN_STATUS_LABELS[status]} />;
}

/**
 * A run's status and work log. Polls while the run is active, then tells
 * the page to refresh so the ticket's status and comments catch up.
 */
export function RunLog({
  projectId,
  initial,
  canCancel,
  defaultOpen = true,
}: {
  projectId: string;
  initial: RunSnapshot;
  canCancel: boolean;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [isCancelling, startCancelling] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const wasActive = useRef(ACTIVE.includes(initial.run.status));
  const isActive = ACTIVE.includes(snapshot.run.status);

  useEffect(() => {
    if (!isActive) {
      if (wasActive.current) {
        wasActive.current = false;
        router.refresh();
      }
      return;
    }
    let cancelled = false;
    const timer = setInterval(async () => {
      const last = snapshot.events.at(-1)?.sequence;
      try {
        const next = await readRunAction(
          projectId,
          snapshot.run.id,
          last === undefined ? undefined : last,
        );
        if (cancelled || "status" in next) {
          return;
        }
        setSnapshot((current) => ({
          run: next.run,
          events: mergeEvents(current.events, next.events),
        }));
      } catch (error) {
        console.error("Run poll failed", error);
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isActive, projectId, snapshot.run.id, snapshot.events, router]);

  function cancel() {
    setMessage(null);
    startCancelling(async () => {
      const result = await cancelRunAction(projectId, snapshot.run.id);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      setSnapshot((current) => ({ ...current, run: { ...current.run, status: "CANCELLED" } }));
      router.refresh();
    });
  }

  const { run } = snapshot;
  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        {isActive ? <Spinner size="sm" aria-label="Agent working" /> : null}
        <RunStatusBadge status={run.status} />
        <StackItem size="fill">
          <Text type="supporting">
            {run.repoFullName} · <Text type="code">{run.branch}</Text> · {run.model} ·{" "}
            {run.eventCount} events ·{" "}
            <Timestamp value={run.startedAt ?? run.createdAt} format="relative" />
          </Text>
        </StackItem>
        {run.prUrl ? (
          <Link href={run.prUrl} isExternalLink>
            {`Pull request #${run.prNumber}`}
          </Link>
        ) : null}
        {canCancel && isActive ? (
          <Button label="Stop" variant="destructive" size="sm" isLoading={isCancelling} onClick={cancel} />
        ) : null}
      </HStack>
      {message ? <Banner status="error" title={message} /> : null}
      {run.error ? <Banner status="error" title="Run error" description={run.error} /> : null}
      {run.summary && !isActive ? (
        <Collapsible trigger="Agent's report" defaultIsOpen>
          <Markdown density="compact" headingLevelStart={4} contentWidth="100%">
            {run.summary}
          </Markdown>
        </Collapsible>
      ) : null}
      <Collapsible trigger={`Work log (${snapshot.events.length})`} defaultIsOpen={defaultOpen}>
        {snapshot.events.length === 0 ? (
          <Text type="supporting">Waiting for the sandbox to report in.</Text>
        ) : (
          <VStack gap={2}>
            {snapshot.events.map((event) => (
              <EventLine key={`${event.sequence}`} event={event} />
            ))}
          </VStack>
        )}
      </Collapsible>
    </VStack>
  );
}

function mergeEvents(current: RunLogEvent[], incoming: RunLogEvent[]): RunLogEvent[] {
  if (incoming.length === 0) {
    return current;
  }
  const seen = new Set(current.map((event) => event.sequence));
  const merged = [...current];
  for (const event of incoming) {
    if (!seen.has(event.sequence)) {
      merged.push(event);
    }
  }
  return merged.sort((a, b) => a.sequence - b.sequence);
}

const TYPE_VARIANT: Record<string, "neutral" | "blue" | "purple" | "green" | "error" | "orange"> = {
  setup: "neutral",
  muse: "purple",
  git: "green",
  log: "orange",
  finished: "blue",
};

function EventLine({ event }: { event: RunLogEvent }) {
  const { title, detail } = describeRunEvent(event);
  return (
    <HStack gap={3} vAlign="start">
      <Badge variant={TYPE_VARIANT[event.type] ?? "neutral"} label={event.type} />
      <StackItem size="fill">
        <VStack gap={0}>
          <Text>{title}</Text>
          {detail ? (
            <Text type="code" color="secondary" maxLines={6}>
              {detail}
            </Text>
          ) : null}
        </VStack>
      </StackItem>
      <Text type="supporting" hasTabularNumbers>
        <Timestamp value={event.createdAt} format="time" />
      </Text>
    </HStack>
  );
}
