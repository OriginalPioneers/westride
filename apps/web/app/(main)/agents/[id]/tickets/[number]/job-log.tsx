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
import { describeRunEvent, type JobLogEvent, type JobSnapshot } from "@/lib/agents/snapshot";
import { formatMicrosAsUsd, formatTokens } from "@/lib/idea-factory/pricing";
import { JobKindBadge, JobStatusBadge, JobTriggerBadge } from "../../../agent-badges";
import { cancelJobAction, readJobAction } from "../../../job-actions";

const POLL_MS = 3000;
const ACTIVE: AgentRunStatus[] = ["QUEUED", "RUNNING"];

/**
 * A job's status, report, and work log. Polls while the job is active, then
 * tells the page to refresh so the ticket's status and the log catch up.
 */
export function JobLog({
  agentId,
  initial,
  canCancel,
  defaultOpen = true,
}: {
  agentId: string;
  initial: JobSnapshot;
  canCancel: boolean;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [isCancelling, startCancelling] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const wasActive = useRef(ACTIVE.includes(initial.job.status));
  const isActive = ACTIVE.includes(snapshot.job.status);

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
        const next = await readJobAction(agentId, snapshot.job.id, last === undefined ? undefined : last);
        if (cancelled || "status" in next) {
          return;
        }
        setSnapshot((current) => ({ job: next.job, events: mergeEvents(current.events, next.events) }));
      } catch (error) {
        console.error("Job poll failed", error);
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isActive, agentId, snapshot.job.id, snapshot.events, router]);

  function cancel() {
    setMessage(null);
    startCancelling(async () => {
      const result = await cancelJobAction(agentId, snapshot.job.id);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      setSnapshot((current) => ({ ...current, job: { ...current.job, status: "CANCELLED" } }));
      router.refresh();
    });
  }

  const { job } = snapshot;
  const facts = [
    job.repoFullName && job.branch ? `${job.repoFullName} · ${job.branch}` : null,
    job.model,
    job.totalTokens > 0 ? `${formatTokens(job.totalTokens)} tokens · ${formatMicrosAsUsd(job.estimatedCostMicros)}` : null,
    `${snapshot.events.length} events`,
  ].filter((part): part is string => Boolean(part));

  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        {isActive ? <Spinner size="sm" aria-label="Agent working" /> : null}
        <JobStatusBadge status={job.status} />
        <JobKindBadge kind={job.kind} />
        <JobTriggerBadge trigger={job.trigger} />
        <StackItem size="fill">
          <Text type="supporting">
            {facts.join(" · ")} · <Timestamp value={job.startedAt ?? job.createdAt} format="relative" />
          </Text>
        </StackItem>
        {job.prUrl ? (
          <Link href={job.prUrl} isExternalLink>
            {`Pull request #${job.prNumber}`}
          </Link>
        ) : null}
        {canCancel && isActive ? (
          <Button label="Stop" variant="destructive" size="sm" isLoading={isCancelling} onClick={cancel} />
        ) : null}
      </HStack>
      {message ? <Banner status="error" title={message} /> : null}
      {job.error ? <Banner status="error" title="Job error" description={job.error} /> : null}
      {job.summary && !isActive ? (
        <Collapsible trigger={job.kind === "REPORT" ? "Report" : "Agent's report"} defaultIsOpen>
          <Markdown density="compact" headingLevelStart={4} contentWidth="100%">
            {job.summary}
          </Markdown>
        </Collapsible>
      ) : null}
      <Collapsible trigger={`Work log (${snapshot.events.length})`} defaultIsOpen={defaultOpen}>
        {snapshot.events.length === 0 ? (
          <Text type="supporting">
            {job.kind === "CODE" ? "Waiting for the sandbox to report in." : "Waiting for Muse to answer."}
          </Text>
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

function mergeEvents(current: JobLogEvent[], incoming: JobLogEvent[]): JobLogEvent[] {
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

function EventLine({ event }: { event: JobLogEvent }) {
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
