"use client";

import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { Spinner } from "@astryxdesign/core/Spinner";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  CubeTransparentIcon,
  FolderOpenIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import type { IdeaType } from "@westride/db";
import {
  AGENT_GROUP_LABELS,
  agentsForIdea,
  type AgentGroup,
} from "@/lib/idea-factory/agents";
import { AGENT_ICONS, EvaluateIcon } from "./agent-icons";

export type FactoryView =
  | { kind: "connect" }
  | { kind: "evaluation" }
  | { kind: "files" }
  | { kind: "build" }
  | { kind: "activity" }
  | { kind: "agent"; slug: string };

export function viewKey(view: FactoryView): string {
  return view.kind === "agent" ? `agent:${view.slug}` : view.kind;
}

const GROUP_ORDER: AgentGroup[] = [
  "core",
  "business",
  "non-profit",
  "game",
  "open-source",
  "website",
  "mobile-app",
];

function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

export function AgentRail({
  ideaType,
  view,
  onSelect,
  busyAgentSlugs,
  isEvaluationRunning,
  isSuggesting,
  evaluationCount,
  fileCount,
  projectCount,
  suggestionCount,
  requestCount,
}: {
  ideaType: IdeaType;
  view: FactoryView;
  onSelect: (view: FactoryView) => void;
  /** Agents with a reply in flight. */
  busyAgentSlugs: ReadonlySet<string>;
  isEvaluationRunning: boolean;
  isSuggesting: boolean;
  evaluationCount: number;
  /** Files that are not archived. */
  fileCount: number;
  projectCount: number;
  suggestionCount: number;
  requestCount: number;
}) {
  const agents = agentsForIdea(ideaType);
  const selected = viewKey(view);

  const buildDescription = isSuggesting
    ? "Muse is drafting…"
    : projectCount === 0 && suggestionCount === 0
      ? "Prep repos and hand off"
      : [
          projectCount > 0 ? `${plural(projectCount, "project")} linked` : null,
          suggestionCount > 0 ? `${suggestionCount} suggested` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <VStack gap={5}>
      <List
        edge="outset"
        density="compact"
        header={
          <Text type="label" color="secondary" weight="semibold">
            Your workshop
          </Text>
        }
      >
        <ListItem
          label="Evaluate my idea"
          description={
            isEvaluationRunning
              ? "Advisors are working…"
              : evaluationCount === 0
                ? "Whole team, one report"
                : plural(evaluationCount, "evaluation")
          }
          startContent={
            isEvaluationRunning ? (
              <Spinner size="sm" aria-label="Evaluation running" />
            ) : (
              <Icon icon={EvaluateIcon} color="accent" />
            )
          }
          isSelected={selected === "evaluation"}
          onClick={() => onSelect({ kind: "evaluation" })}
        />
        <ListItem
          label="Files & assets"
          description={fileCount === 0 ? "Logos, briefs, and reports" : plural(fileCount, "file")}
          startContent={<Icon icon={FolderOpenIcon} color="secondary" />}
          isSelected={selected === "files"}
          onClick={() => onSelect({ kind: "files" })}
        />
        <ListItem
          label="Build projects"
          description={buildDescription}
          startContent={
            isSuggesting ? (
              <Spinner size="sm" aria-label="Drafting build projects" />
            ) : (
              <Icon icon={CubeTransparentIcon} color="secondary" />
            )
          }
          isSelected={selected === "build"}
          onClick={() => onSelect({ kind: "build" })}
        />
        <ListItem
          label="Muse activity"
          description={
            requestCount === 1 ? "1 request logged" : `${requestCount} requests logged`
          }
          startContent={<Icon icon={ListBulletIcon} color="secondary" />}
          isSelected={selected === "activity"}
          onClick={() => onSelect({ kind: "activity" })}
        />
      </List>

      {GROUP_ORDER.map((group) => {
        const members = agents.filter((agent) => agent.group === group);
        if (members.length === 0) {
          return null;
        }
        return (
          <List
            key={group}
            edge="outset"
            density="compact"
            header={
              <Text type="label" color="secondary" weight="semibold">
                {AGENT_GROUP_LABELS[group]}
              </Text>
            }
          >
            {members.map((agent) => (
              <ListItem
                key={agent.slug}
                label={agent.name}
                description={agent.tagline}
                startContent={
                  busyAgentSlugs.has(agent.slug) ? (
                    <Spinner size="sm" aria-label={`${agent.name} is replying`} />
                  ) : (
                    <Icon icon={AGENT_ICONS[agent.icon]} color="secondary" />
                  )
                }
                isSelected={selected === `agent:${agent.slug}`}
                onClick={() => onSelect({ kind: "agent", slug: agent.slug })}
              />
            ))}
          </List>
        );
      })}
    </VStack>
  );
}
