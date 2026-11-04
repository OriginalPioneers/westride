"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Markdown } from "@astryxdesign/core/Markdown";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Token } from "@astryxdesign/core/Token";
import {
  ArrowTopRightOnSquareIcon,
  CubeTransparentIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import type { BuildSuggestion, BuildSuggestionKind, IdeaBuildSuggestion } from "@westride/db";
import { ticketProgressPercent, totalTickets } from "@westride/db/build-rules";
import { PROJECT_STATUS_LABELS, projectPath } from "@/lib/build/labels";
import type { LinkedProject } from "./actions";

const KIND_LABELS: Record<BuildSuggestionKind, string> = {
  web: "Web app",
  mobile: "Mobile app",
  api: "API / backend",
  worker: "Background worker",
  library: "Library / SDK",
  infrastructure: "Infrastructure",
  docs: "Docs / marketing site",
  other: "Project",
};

const KIND_VARIANTS: Record<
  BuildSuggestionKind,
  "blue" | "purple" | "teal" | "orange" | "green" | "cyan" | "pink" | "neutral"
> = {
  web: "blue",
  mobile: "purple",
  api: "teal",
  worker: "orange",
  library: "green",
  infrastructure: "cyan",
  docs: "pink",
  other: "neutral",
};

function LinkedProjects({ projects }: { projects: LinkedProject[] }) {
  if (projects.length === 0) {
    return (
      <Text type="supporting">
        No Project Factory projects are linked to this idea yet. Start one from a suggestion below,
        or with &ldquo;Build this idea&rdquo; on the idea page.
      </Text>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Project</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Progress</TableHeaderCell>
          <TableHeaderCell>Repositories</TableHeaderCell>
          <TableHeaderCell>Updated</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const total = totalTickets(project.ticketCounts);
          return (
            <TableRow key={project.id}>
              <TableCell>
                <Link href={projectPath(project.id)}>{project.name}</Link>
              </TableCell>
              <TableCell>{PROJECT_STATUS_LABELS[project.status]}</TableCell>
              <TableCell>
                <VStack gap={1} width={160}>
                  <ProgressBar
                    label={`${project.name} tickets done`}
                    isLabelHidden
                    value={total > 0 ? ticketProgressPercent(project.ticketCounts) : 0}
                    variant={project.status === "LAUNCHED" ? "success" : "accent"}
                  />
                  <Text type="supporting" size="xsm" hasTabularNumbers>
                    {project.ticketCounts.DONE} of {total} tickets done
                  </Text>
                </VStack>
              </TableCell>
              <TableCell>
                {project.repos.length === 0 ? (
                  <Text type="supporting">None</Text>
                ) : (
                  <VStack gap={0.5}>
                    {project.repos.map((repo) => (
                      <Link key={repo.htmlUrl} href={repo.htmlUrl} isExternalLink>
                        {repo.fullName}
                      </Link>
                    ))}
                  </VStack>
                )}
              </TableCell>
              <TableCell>
                <Timestamp value={project.updatedAt.toISOString()} format="auto" />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function SuggestionCard({
  project,
  all,
  linked,
  isBusy,
  onStart,
}: {
  project: BuildSuggestion;
  all: BuildSuggestion[];
  linked: LinkedProject | null;
  isBusy: boolean;
  onStart: () => void;
}) {
  const dependencyNames = project.dependsOn
    .map((key) => all.find((item) => item.key === key)?.name ?? null)
    .filter((name): name is string => name !== null);
  return (
    <Card padding={5} elevation={linked ? "none" : "low"}>
      <VStack gap={4}>
        <HStack gap={2} vAlign="start" wrap="wrap">
          <StackItem size="fill">
            <VStack gap={1}>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Badge variant={KIND_VARIANTS[project.kind]} label={KIND_LABELS[project.kind]} />
                {linked ? <Badge variant="success" label="Started" /> : null}
              </HStack>
              <Heading level={3}>{project.name}</Heading>
              <Text type="supporting" hasTabularNumbers>
                Repository: {project.repoName}
              </Text>
            </VStack>
          </StackItem>
        </HStack>

        {project.summary ? <Text>{project.summary}</Text> : null}

        {project.stack.length > 0 ? (
          <HStack gap={1.5} wrap="wrap">
            {project.stack.map((item) => (
              <Token key={item} label={item} />
            ))}
          </HStack>
        ) : null}

        {project.firstMilestones.length > 0 ? (
          <VStack gap={1}>
            <Text type="supporting" weight="semibold">
              First milestones
            </Text>
            <List listStyle="decimal" edge="padded" density="compact">
              {project.firstMilestones.map((milestone, index) => (
                <ListItem key={`${project.key}-m-${index}`} label={<Text>{milestone}</Text>} />
              ))}
            </List>
          </VStack>
        ) : null}

        {dependencyNames.length > 0 ? (
          <Text type="supporting">Needs first: {dependencyNames.join(", ")}</Text>
        ) : null}

        {project.description ? (
          <Collapsible trigger={<Text weight="semibold">Full brief</Text>} defaultIsOpen={false}>
            <VStack paddingBlockStart={2}>
              <Markdown density="compact" headingLevelStart={4} contentWidth="100%">
                {project.description}
              </Markdown>
            </VStack>
          </Collapsible>
        ) : null}

        <HStack gap={2} wrap="wrap">
          {linked ? (
            <Button
              label={`Open ${linked.name}`}
              variant="secondary"
              size="sm"
              href={projectPath(linked.id)}
              endContent={<Icon icon={ArrowTopRightOnSquareIcon} size="sm" />}
            />
          ) : (
            <Button
              label="Start this project"
              variant="primary"
              size="sm"
              icon={<Icon icon={WrenchScrewdriverIcon} size="sm" />}
              isLoading={isBusy}
              onClick={onStart}
            />
          )}
        </HStack>
      </VStack>
    </Card>
  );
}

export function BuildPanel({
  projects,
  suggestion,
  hasEvaluation,
  isConnected,
  isSuggesting,
  startingKey,
  error,
  onSuggest,
  onStartProject,
}: {
  projects: LinkedProject[];
  suggestion: IdeaBuildSuggestion | null;
  hasEvaluation: boolean;
  isConnected: boolean;
  isSuggesting: boolean;
  /** Key of the suggestion whose project dialog is being prepared. */
  startingKey: string | null;
  error: string | null;
  onSuggest: () => void;
  onStartProject: (project: BuildSuggestion) => void;
}) {
  const linkedById = new Map(projects.map((project) => [project.id, project]));
  return (
    <VStack gap={8}>
      <Card padding={6}>
        <VStack gap={5}>
          <HStack gap={4} vAlign="center" wrap="wrap">
            <Icon icon={CubeTransparentIcon} size="lg" color="accent" />
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={2}>Build projects</Heading>
                <Text type="supporting">
                  When the idea is ready to build, Muse splits it into the repositories it needs,
                  each with a brief a coding agent can start from. Every project you start lands in
                  Project Factory and stays linked here.
                </Text>
              </VStack>
            </StackItem>
            <Button
              label={
                isSuggesting
                  ? "Drafting…"
                  : suggestion
                    ? "Refresh suggestions"
                    : "Suggest build projects"
              }
              variant={suggestion ? "secondary" : "primary"}
              icon={<Icon icon={SparklesIcon} />}
              isLoading={isSuggesting}
              isDisabled={!isConnected}
              onClick={onSuggest}
            />
          </HStack>
          {error ? <Banner status="error" title={error} /> : null}
          {!isConnected ? (
            <Text type="supporting">Connect your Meta account to draft suggestions.</Text>
          ) : !hasEvaluation && !suggestion ? (
            <Banner
              status="info"
              title="Suggestions are sharper after an evaluation"
              description="Muse reads the advisors' findings to decide what to build first. You can draft suggestions now and refresh them later."
            />
          ) : null}
        </VStack>
      </Card>

      <VStack gap={3}>
        <Heading level={3}>Linked Project Factory projects</Heading>
        <LinkedProjects projects={projects} />
      </VStack>

      <VStack gap={4}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Heading level={3}>Suggested build projects</Heading>
          {suggestion ? (
            <Text type="supporting">
              Drafted <Timestamp value={suggestion.createdAt.toISOString()} format="auto" />
            </Text>
          ) : null}
        </HStack>
        {suggestion ? (
          <VStack gap={4}>
            <Markdown density="compact" headingLevelStart={4} contentWidth="100%">
              {suggestion.summary}
            </Markdown>
            <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
              {suggestion.projects.map((project) => (
                <SuggestionCard
                  key={project.key}
                  project={project}
                  all={suggestion.projects}
                  linked={project.projectId ? (linkedById.get(project.projectId) ?? null) : null}
                  isBusy={startingKey === project.key}
                  onStart={() => onStartProject(project)}
                />
              ))}
            </Grid>
          </VStack>
        ) : (
          <EmptyState
            title="No suggestions yet"
            description="Muse will propose the repositories this idea needs, in the order to build them, with a brief and first milestones for each."
            isCompact
          />
        )}
      </VStack>
    </VStack>
  );
}
