"use client";

import { useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { FolderOpenIcon, PaintBrushIcon } from "@heroicons/react/24/outline";
import type { IdeaFactoryArtifact, IdeaType } from "@westride/db";
import { agentsForIdea } from "@/lib/idea-factory/agents";
import { collectionLabel } from "@/lib/idea-factory/artifacts";
import { ArtifactCard, type ArtifactActions } from "./artifact-card";

type Group = {
  collection: string;
  label: string;
  items: IdeaFactoryArtifact[];
  chosen: IdeaFactoryArtifact | null;
  archivedCount: number;
};

function groupArtifacts(artifacts: IdeaFactoryArtifact[], showArchived: boolean): Group[] {
  const groups = new Map<string, Group>();
  for (const artifact of artifacts) {
    const key = artifact.collection;
    let group = groups.get(key);
    if (!group) {
      group = {
        collection: key,
        label: collectionLabel(key),
        items: [],
        chosen: null,
        archivedCount: 0,
      };
      groups.set(key, group);
    }
    if (artifact.archivedAt) {
      group.archivedCount += 1;
      if (!showArchived) {
        continue;
      }
    }
    if (artifact.chosenAt) {
      group.chosen = artifact;
    }
    group.items.push(artifact);
  }
  return [...groups.values()]
    .filter((group) => group.items.length > 0)
    .sort((a, b) => {
      const newestA = a.items[0]?.createdAt.getTime() ?? 0;
      const newestB = b.items[0]?.createdAt.getTime() ?? 0;
      return newestB - newestA;
    });
}

export function FilesPanel({
  ideaType,
  artifacts,
  actions,
  busyIds,
  error,
  canStoreFiles,
  onOpenAgent,
}: {
  ideaType: IdeaType;
  artifacts: IdeaFactoryArtifact[];
  actions: ArtifactActions;
  busyIds: ReadonlySet<string>;
  error: string | null;
  canStoreFiles: boolean;
  onOpenAgent: (slug: string) => void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const groups = useMemo(() => groupArtifacts(artifacts, showArchived), [artifacts, showArchived]);
  const archivedTotal = artifacts.filter((artifact) => artifact.archivedAt).length;
  const activeTotal = artifacts.length - archivedTotal;
  const drawers = agentsForIdea(ideaType).filter((agent) => agent.createsImages);

  return (
    <VStack gap={6}>
      <Card padding={6}>
        <VStack gap={4}>
          <HStack gap={4} vAlign="center" wrap="wrap">
            <Icon icon={FolderOpenIcon} size="lg" color="accent" />
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={2}>Files &amp; assets</Heading>
                <Text type="supporting">
                  Everything the advisory team has made for this idea: logo iterations, briefs,
                  plans, and reports. Mark the version you are going with; archive the rest so
                  advisors stop building on them.
                </Text>
              </VStack>
            </StackItem>
            {archivedTotal > 0 ? (
              <CheckboxInput
                label={`Show archived (${archivedTotal})`}
                value={showArchived}
                onChange={setShowArchived}
              />
            ) : null}
          </HStack>
          {!canStoreFiles ? (
            <Banner
              status="warning"
              title="File storage is not set up on this server"
              description="Advisors can still answer, but the files they make will not be kept."
            />
          ) : null}
          {error ? <Banner status="error" title={error} /> : null}
        </VStack>
      </Card>

      {groups.length === 0 ? (
        <EmptyState
          title={activeTotal === 0 && archivedTotal > 0 ? "Everything is archived" : "No files yet"}
          description={
            activeTotal === 0 && archivedTotal > 0
              ? "Show archived files above to restore one, or ask an advisor for a fresh version."
              : "Ask an advisor for a deliverable and it lands here. Try the Creative Director for logo concepts, or any advisor for a brief, plan, or checklist."
          }
          actions={
            drawers.length > 0 ? (
              <HStack gap={2} wrap="wrap" hAlign="center">
                {drawers.map((agent) => (
                  <Button
                    key={agent.slug}
                    label={`Ask the ${agent.name}`}
                    variant="secondary"
                    size="sm"
                    icon={<Icon icon={PaintBrushIcon} size="sm" />}
                    onClick={() => onOpenAgent(agent.slug)}
                  />
                ))}
              </HStack>
            ) : undefined
          }
        />
      ) : (
        groups.map((group) => (
          <VStack key={group.collection} gap={3}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Heading level={3}>{group.label}</Heading>
              <Text type="supporting">
                {group.items.length} {group.items.length === 1 ? "file" : "files"}
              </Text>
              {group.chosen ? (
                <Badge variant="success" label={`Going with: ${group.chosen.title}`} />
              ) : group.items.length > 1 ? (
                <Text type="supporting">Pick the one you like and archive the rest.</Text>
              ) : null}
            </HStack>
            <Grid columns={{ minWidth: 240, max: 4 }} gap={3}>
              {group.items.map((artifact) => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  actions={actions}
                  isBusy={busyIds.has(artifact.id)}
                />
              ))}
            </Grid>
          </VStack>
        ))
      )}
    </VStack>
  );
}
