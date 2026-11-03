"use client";

import Image from "next/image";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Icon } from "@astryxdesign/core/Icon";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon as CheckBadgeSolidIcon } from "@heroicons/react/24/solid";
import type { IdeaFactoryArtifact } from "@westride/db";
import { getAgent } from "@/lib/idea-factory/agents";
import {
  ARTIFACT_KIND_LABELS,
  artifactPath,
  formatBytes,
  isImageArtifact,
} from "@/lib/idea-factory/artifacts";

export type ArtifactActions = {
  onArchive: (artifactId: string, isArchived: boolean) => void;
  onChoose: (artifactId: string, isChosen: boolean) => void;
};

const PREVIEW_SIZE = 512;

function Preview({ artifact }: { artifact: IdeaFactoryArtifact }) {
  if (isImageArtifact(artifact)) {
    return (
      <AspectRatio ratio={1} fit="cover">
        <Image
          src={artifactPath(artifact.ideaId, artifact.id)}
          alt={artifact.title}
          width={PREVIEW_SIZE}
          height={PREVIEW_SIZE}
          unoptimized
        />
      </AspectRatio>
    );
  }
  const icon = artifact.kind === "REPORT" ? DocumentChartBarIcon : DocumentTextIcon;
  return (
    <AspectRatio ratio={16 / 7}>
      <Card variant="muted" padding={0} height="100%">
        <Center minHeight="100%">
          <Icon icon={icon} size="lg" color="secondary" />
        </Center>
      </Card>
    </AspectRatio>
  );
}

/**
 * One file the team made. `compact` is the version that sits under an
 * advisor's reply; the full card lives in Files & assets.
 */
export function ArtifactCard({
  artifact,
  actions,
  isBusy = false,
  compact = false,
}: {
  artifact: IdeaFactoryArtifact;
  actions: ArtifactActions;
  isBusy?: boolean;
  compact?: boolean;
}) {
  const agent = artifact.agentSlug ? getAgent(artifact.agentSlug) : undefined;
  const isChosen = artifact.chosenAt !== null;
  const isArchived = artifact.archivedAt !== null;
  const openHref = artifactPath(artifact.ideaId, artifact.id);
  const downloadHref = artifactPath(artifact.ideaId, artifact.id, true);

  const menu = (
    <MoreMenu
      label={`Options for ${artifact.title}`}
      size="sm"
      alignment="end"
      isDisabled={isBusy}
      items={[
        {
          label: isChosen ? "Remove chosen mark" : "Mark as the one we're going with",
          onClick: () => actions.onChoose(artifact.id, !isChosen),
          isDisabled: isArchived,
        },
        {
          label: isArchived ? "Restore" : "Archive",
          onClick: () => actions.onArchive(artifact.id, !isArchived),
        },
        { type: "divider" },
        { label: "Open in a new tab", href: openHref, target: "_blank" },
        { label: "Download", href: downloadHref },
      ]}
    />
  );

  return (
    <Card padding={compact ? 2 : 3} variant={isArchived ? "muted" : "default"}>
      <VStack gap={compact ? 2 : 3}>
        <Preview artifact={artifact} />
        <HStack gap={2} vAlign="start">
          <StackItem size="fill">
            <VStack gap={0.5}>
              <HStack gap={1.5} vAlign="center" wrap="wrap">
                {isChosen ? (
                  <Icon icon={CheckBadgeSolidIcon} size="sm" color="success" />
                ) : null}
                <Text weight="semibold">{artifact.title}</Text>
              </HStack>
              <Text type="supporting" size="xsm">
                {ARTIFACT_KIND_LABELS[artifact.kind]}
                {agent ? ` · ${agent.name}` : ""}
                {" · "}
                <Timestamp value={artifact.createdAt.toISOString()} format="auto" />
                {compact ? "" : ` · ${formatBytes(artifact.sizeBytes)}`}
              </Text>
            </VStack>
          </StackItem>
          {menu}
        </HStack>
        {!compact && artifact.description && !isImageArtifact(artifact) ? (
          <Text type="supporting" size="xsm">
            {artifact.description}
          </Text>
        ) : null}
        <HStack gap={2} vAlign="center" wrap="wrap">
          {isChosen ? <Badge variant="success" label="Chosen" /> : null}
          {isArchived ? <Badge variant="neutral" label="Archived" /> : null}
          <StackItem size="fill" />
          {!compact ? (
            <Button
              label="Open"
              variant="ghost"
              size="sm"
              href={openHref}
              target="_blank"
              endContent={<Icon icon={ArrowTopRightOnSquareIcon} size="sm" />}
            />
          ) : null}
          <Button
            label="Download"
            variant="ghost"
            size="sm"
            href={downloadHref}
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
          />
          {compact && !isArchived && !isChosen ? (
            <Button
              label="Choose"
              variant="secondary"
              size="sm"
              isLoading={isBusy}
              icon={<Icon icon={CheckBadgeIcon} size="sm" />}
              onClick={() => actions.onChoose(artifact.id, true)}
            />
          ) : null}
        </HStack>
      </VStack>
    </Card>
  );
}
