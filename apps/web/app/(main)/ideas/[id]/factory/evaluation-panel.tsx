"use client";

import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import type { IdeaFactoryFinding, IdeaType } from "@westride/db";
import type { EvaluationWithFindings } from "@westride/db/idea-factory";
import {
  agentsForIdea,
  EVIDENCE_CLASS_DESCRIPTIONS,
  EVIDENCE_CLASS_LABELS,
  getAgent,
  IDEA_COACH_SLUG,
  type AgentDefinition,
} from "@/lib/idea-factory/agents";
import { getMuseModel } from "@/lib/idea-factory/pricing";
import { AGENT_ICONS, EvaluateIcon } from "./agent-icons";
import { EvidenceBadge, SourceList, VerdictBadge } from "./evidence";

const EVIDENCE_ORDER = ["VERIFIED", "ESTIMATE", "ASSUMPTION", "HYPOTHESIS"] as const;

function FindingCard({
  finding,
  agent,
}: {
  finding: IdeaFactoryFinding;
  agent: AgentDefinition | undefined;
}) {
  const name = agent?.name ?? finding.agentSlug;
  const icon = agent ? AGENT_ICONS[agent.icon] : EvaluateIcon;

  return (
    <Card padding={5}>
      <VStack gap={4}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Icon icon={icon} color="accent" />
          <StackItem size="fill">
            <VStack gap={0}>
              <Heading level={3}>{name}</Heading>
              {agent ? <Text type="supporting">{agent.tagline}</Text> : null}
            </VStack>
          </StackItem>
          {finding.status === "COMPLETED" && finding.verdict ? (
            <VerdictBadge verdict={finding.verdict} />
          ) : null}
          {finding.status === "RUNNING" || finding.status === "PENDING" ? (
            <HStack gap={2} vAlign="center">
              <Spinner size="sm" aria-label={`${name} is evaluating`} />
              <Text type="supporting">
                {finding.status === "RUNNING" ? "Evaluating…" : "Queued"}
              </Text>
            </HStack>
          ) : null}
          {finding.status === "FAILED" ? <Badge variant="error" label="Failed" /> : null}
        </HStack>

        {finding.status === "FAILED" ? (
          <Text type="supporting">{finding.error ?? "This advisor could not finish."}</Text>
        ) : null}

        {finding.summary ? (
          <Markdown density="compact" headingLevelStart={4} contentWidth="100%">
            {finding.summary}
          </Markdown>
        ) : null}

        {finding.findings.length > 0 ? (
          <List hasDividers edge="flush" density="balanced">
            {finding.findings.map((item, index) => (
              <ListItem
                key={`${finding.id}-${index}`}
                align="first-line"
                startContent={<EvidenceBadge evidenceClass={item.evidenceClass} />}
                label={<Text weight="semibold">{item.claim}</Text>}
                description={
                  <VStack gap={2}>
                    {item.detail ? (
                      <Markdown density="compact" headingLevelStart={5} contentWidth="100%">
                        {item.detail}
                      </Markdown>
                    ) : null}
                    <SourceList sources={item.sources} heading={null} />
                  </VStack>
                }
              />
            ))}
          </List>
        ) : null}

        {finding.nextSteps.length > 0 ? (
          <VStack gap={1}>
            <Text type="supporting" weight="semibold">
              Next steps
            </Text>
            <List listStyle="decimal" edge="padded" density="compact">
              {finding.nextSteps.map((step, index) => (
                <ListItem key={`${finding.id}-step-${index}`} label={<Text>{step}</Text>} />
              ))}
            </List>
          </VStack>
        ) : null}
      </VStack>
    </Card>
  );
}

function SynthesisSection({
  evaluation,
  onAskCoach,
}: {
  evaluation: EvaluationWithFindings;
  onAskCoach: (question: string) => void;
}) {
  const synthesis = evaluation.synthesis;
  const finished = evaluation.findings.filter((finding) => finding.status === "COMPLETED");
  const pending = evaluation.findings.filter(
    (finding) => finding.status === "PENDING" || finding.status === "RUNNING",
  );

  if (!synthesis) {
    if (evaluation.status === "FAILED") {
      return (
        <Banner
          status="error"
          title="The evaluation did not finish"
          description={evaluation.error ?? "Muse could not synthesise the findings."}
        />
      );
    }
    return (
      <Card variant="muted" padding={5}>
        <HStack gap={3} vAlign="center">
          <Spinner size="md" aria-label="Evaluation in progress" />
          <VStack gap={0}>
            <Text weight="semibold">
              {pending.length > 0
                ? `${finished.length} of ${evaluation.findings.length} advisors have reported`
                : "Muse is synthesising the team's findings"}
            </Text>
            <Text type="supporting">
              Each advisor works independently; Muse then compares their findings
              and explains where they disagree.
            </Text>
          </VStack>
        </HStack>
      </Card>
    );
  }

  return (
    <Card padding={6} elevation="low">
      <VStack gap={5}>
        <VStack gap={1}>
          <Text type="supporting" weight="semibold">
            Muse synthesis
          </Text>
          <Heading level={3}>What the team found, taken together</Heading>
        </VStack>
        <Markdown density="compact" headingLevelStart={4} contentWidth="100%">
          {synthesis.overview}
        </Markdown>

        {synthesis.disagreements.length > 0 ? (
          <VStack gap={2}>
            <Heading level={4}>Where the advisors disagree</Heading>
            <List hasDividers edge="flush">
              {synthesis.disagreements.map((item) => (
                <ListItem
                  key={item.topic}
                  align="first-line"
                  label={<Text weight="semibold">{item.topic}</Text>}
                  description={
                    <VStack gap={1}>
                      <Text>{item.positions}</Text>
                      <Text type="supporting">How to settle it: {item.resolution}</Text>
                    </VStack>
                  }
                />
              ))}
            </List>
          </VStack>
        ) : null}

        <Grid columns={{ minWidth: 260, max: 2 }} gap={5}>
          {synthesis.agreements.length > 0 ? (
            <VStack gap={2}>
              <Heading level={4}>Where they agree</Heading>
              <List listStyle="disc" edge="padded" density="compact">
                {synthesis.agreements.map((item) => (
                  <ListItem key={item} label={<Text>{item}</Text>} />
                ))}
              </List>
            </VStack>
          ) : null}
          {synthesis.risks.length > 0 ? (
            <VStack gap={2}>
              <Heading level={4}>Risks to watch</Heading>
              <List listStyle="disc" edge="padded" density="compact">
                {synthesis.risks.map((item) => (
                  <ListItem key={item} label={<Text>{item}</Text>} />
                ))}
              </List>
            </VStack>
          ) : null}
        </Grid>

        <VStack gap={2}>
          <Heading level={4}>Recommendation</Heading>
          <Markdown density="compact" headingLevelStart={5} contentWidth="100%">
            {synthesis.recommendation}
          </Markdown>
        </VStack>

        {synthesis.questionsForYou.length > 0 ? (
          <VStack gap={2}>
            <Heading level={4}>What do you want to do next?</Heading>
            <Text type="supporting">
              Pick a question to take it to the Idea Coach, who has read every finding.
            </Text>
            <VStack gap={2} hAlign="start">
              {synthesis.questionsForYou.map((question) => (
                <Button
                  key={question}
                  label={question}
                  variant="secondary"
                  size="sm"
                  icon={<Icon icon={ChatBubbleLeftRightIcon} />}
                  onClick={() => onAskCoach(question)}
                />
              ))}
            </VStack>
          </VStack>
        ) : null}
      </VStack>
    </Card>
  );
}

function EvaluationReport({
  evaluation,
  onAskCoach,
}: {
  evaluation: EvaluationWithFindings;
  onAskCoach: (question: string) => void;
}) {
  const model = getMuseModel(evaluation.model);
  return (
    <VStack gap={5}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <Text type="supporting">
            Started <Timestamp value={evaluation.createdAt.toISOString()} format="auto" />
            {" · "}
            {model?.label ?? evaluation.model}
            {" · "}
            {evaluation.findings.length} advisors
          </Text>
        </StackItem>
        {evaluation.status === "RUNNING" ? (
          <Badge variant="info" label="Running" />
        ) : null}
        {evaluation.status === "FAILED" ? <Badge variant="error" label="Failed" /> : null}
      </HStack>
      <SynthesisSection evaluation={evaluation} onAskCoach={onAskCoach} />
      <Grid columns={{ minWidth: 360, max: 2 }} gap={4}>
        {evaluation.findings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            agent={getAgent(finding.agentSlug)}
          />
        ))}
      </Grid>
    </VStack>
  );
}

export function EvaluationPanel({
  ideaType,
  evaluations,
  isConnected,
  isRunning,
  error,
  defaultAgentSlugs,
  onStart,
  onAskCoach,
}: {
  ideaType: IdeaType;
  evaluations: EvaluationWithFindings[];
  isConnected: boolean;
  isRunning: boolean;
  error: string | null;
  defaultAgentSlugs: string[];
  onStart: (agentSlugs: string[]) => void;
  onAskCoach: (question: string) => void;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(defaultAgentSlugs),
  );
  const [isRosterOpen, setIsRosterOpen] = useState(evaluations.length === 0);
  const roster = agentsForIdea(ideaType).filter((agent) => agent.slug !== IDEA_COACH_SLUG);
  const [latest, ...older] = evaluations;

  function toggle(slug: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(slug);
      } else {
        next.delete(slug);
      }
      return next;
    });
  }

  return (
    <VStack gap={8}>
      <Card padding={6}>
        <VStack gap={5}>
          <HStack gap={4} vAlign="center" wrap="wrap">
            <Icon icon={EvaluateIcon} size="lg" color="accent" />
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={2}>Evaluate my idea</Heading>
                <Text type="supporting">
                  Each advisor reviews the idea independently and labels every
                  finding as verified, an estimate, an assumption, or a
                  hypothesis. Muse then compares their findings, explains where
                  they disagree, and asks what you want to do next.
                </Text>
              </VStack>
            </StackItem>
            <Button
              label={isRunning ? "Evaluating…" : "Evaluate my idea"}
              variant="primary"
              isLoading={isRunning}
              isDisabled={!isConnected || selected.size === 0}
              onClick={() => onStart([...selected])}
            />
          </HStack>

          {error ? <Banner status="error" title={error} /> : null}
          {!isConnected ? (
            <Text type="supporting">Connect your Meta account to run an evaluation.</Text>
          ) : null}

          <Collapsible
            trigger={
              <Text weight="semibold">
                {selected.size} of {roster.length} advisors selected
              </Text>
            }
            isOpen={isRosterOpen}
            onOpenChange={setIsRosterOpen}
          >
            <VStack gap={3} paddingBlockStart={2}>
              <Text type="supporting">
                Each advisor is one request to Muse, plus one more for the
                synthesis. Deselect advisors to keep the run smaller.
              </Text>
              <Grid columns={{ minWidth: 240, max: 3 }} gap={2}>
                {roster.map((agent) => (
                  <CheckboxInput
                    key={agent.slug}
                    label={agent.name}
                    description={agent.tagline}
                    value={selected.has(agent.slug)}
                    onChange={(checked) => toggle(agent.slug, checked)}
                    isDisabled={isRunning}
                  />
                ))}
              </Grid>
            </VStack>
          </Collapsible>
        </VStack>
      </Card>

      {latest ? (
        <VStack gap={6}>
          <EvaluationReport evaluation={latest} onAskCoach={onAskCoach} />
          <Divider />
          <HStack gap={3} wrap="wrap">
            {EVIDENCE_ORDER.map((evidenceClass) => (
              <HStack key={evidenceClass} gap={2} vAlign="center">
                <EvidenceBadge evidenceClass={evidenceClass} />
                <Text type="supporting">
                  {EVIDENCE_CLASS_DESCRIPTIONS[evidenceClass]}
                </Text>
              </HStack>
            ))}
          </HStack>
        </VStack>
      ) : (
        <EmptyState
          title="No evaluations yet"
          description="Run the advisory team once and their findings become shared context for every conversation."
        />
      )}

      {older.length > 0 ? (
        <VStack gap={4}>
          <Heading level={3}>Earlier evaluations</Heading>
          {older.map((evaluation) => (
            <Collapsible
              key={evaluation.id}
              defaultIsOpen={false}
              trigger={
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Text weight="semibold">
                    <Timestamp
                      value={evaluation.createdAt.toISOString()}
                      format="date_time"
                      type="inherit"
                      color="inherit"
                    />
                  </Text>
                  <Text type="supporting">
                    {evaluation.findings.length} advisors ·{" "}
                    {evaluation.status === "COMPLETED"
                      ? "completed"
                      : evaluation.status.toLowerCase()}
                  </Text>
                </HStack>
              }
            >
              <VStack paddingBlockStart={3}>
                <EvaluationReport evaluation={evaluation} onAskCoach={onAskCoach} />
              </VStack>
            </Collapsible>
          ))}
        </VStack>
      ) : null}

      <Text type="supporting">
        {`${EVIDENCE_CLASS_LABELS.VERIFIED} means a named, dated source was found.`}
        Everything else is the advisors&apos; reasoning and should be checked
        before you rely on it.
      </Text>
    </VStack>
  );
}
