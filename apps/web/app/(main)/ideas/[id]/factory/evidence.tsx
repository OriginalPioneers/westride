"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Link } from "@astryxdesign/core/Link";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { EvidenceClass, MuseFindingVerdict, MuseSource } from "@westride/db";
import { EVIDENCE_CLASS_LABELS } from "@/lib/idea-factory/agents";

const EVIDENCE_VARIANT: Record<EvidenceClass, "green" | "blue" | "yellow" | "purple"> = {
  VERIFIED: "green",
  ESTIMATE: "blue",
  ASSUMPTION: "yellow",
  HYPOTHESIS: "purple",
};

export function EvidenceBadge({ evidenceClass }: { evidenceClass: EvidenceClass }) {
  return (
    <Badge
      variant={EVIDENCE_VARIANT[evidenceClass]}
      label={EVIDENCE_CLASS_LABELS[evidenceClass]}
    />
  );
}

const VERDICT_VARIANT: Record<MuseFindingVerdict, "success" | "warning" | "error"> = {
  PROMISING: "success",
  CAUTION: "warning",
  BLOCKER: "error",
};

const VERDICT_LABEL: Record<MuseFindingVerdict, string> = {
  PROMISING: "Promising",
  CAUTION: "Caution",
  BLOCKER: "Blocker",
};

export function VerdictBadge({ verdict }: { verdict: MuseFindingVerdict }) {
  return <Badge variant={VERDICT_VARIANT[verdict]} label={VERDICT_LABEL[verdict]} />;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceList({
  sources,
  heading = "Sources",
}: {
  sources: MuseSource[];
  heading?: string | null;
}) {
  if (sources.length === 0) {
    return null;
  }
  return (
    <VStack gap={1}>
      {heading ? (
        <Text type="supporting" weight="semibold">
          {heading}
        </Text>
      ) : null}
      {sources.map((source) => (
        <HStack key={source.url} gap={2} vAlign="center" wrap="wrap">
          <Link href={source.url} target="_blank" isStandalone>
            {source.title?.trim() || hostOf(source.url)}
          </Link>
          <Text type="supporting">
            {hostOf(source.url)}
            {source.date ? ` · ${source.date}` : ""}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}
