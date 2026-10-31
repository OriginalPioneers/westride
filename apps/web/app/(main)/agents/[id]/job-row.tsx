import { Link } from "@astryxdesign/core/Link";
import { ListItem } from "@astryxdesign/core/List";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { AgentJob } from "@westride/db";
import { agentJobPath } from "@/lib/agents/labels";
import { formatMicrosAsUsd, formatTokens } from "@/lib/idea-factory/pricing";
import { JobKindBadge, JobStatusBadge, JobTriggerBadge } from "../agent-badges";

/** One job in a list: what it worked on, how it ran, what it cost. */
export function JobRow({
  job,
  ticketKey,
  starterName,
}: {
  job: AgentJob;
  ticketKey: string | null;
  starterName: string | null;
}) {
  const facts = [
    job.model,
    job.repoFullName && job.branch ? `${job.repoFullName} · ${job.branch}` : null,
    job.trigger === "SCHEDULE" ? "on schedule" : starterName ? `started by ${starterName}` : null,
    job.totalTokens > 0
      ? `${formatTokens(job.totalTokens)} tokens · ${formatMicrosAsUsd(Number(job.estimatedCostMicros))}`
      : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <ListItem
      href={agentJobPath(job.agentId, job.id)}
      align="start"
      startContent={
        <Text type="supporting" hasTabularNumbers>
          {ticketKey ?? "—"}
        </Text>
      }
      label={job.ticketTitle}
      description={
        <Text type="supporting" maxLines={2}>
          {facts.join(" · ")}
          {" · "}
          <Timestamp value={(job.startedAt ?? job.createdAt).toISOString()} format="relative" />
          {job.error ? ` · ${job.error}` : ""}
        </Text>
      }
      endContent={
        <HStack gap={1} vAlign="center" wrap="wrap">
          {job.prUrl ? (
            <Link href={job.prUrl} isExternalLink>
              {`PR #${job.prNumber}`}
            </Link>
          ) : null}
          <JobTriggerBadge trigger={job.trigger} />
          <JobKindBadge kind={job.kind} />
          <JobStatusBadge status={job.status} />
        </HStack>
      }
    />
  );
}
