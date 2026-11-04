"use client";

import { useMemo, useState } from "react";
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
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import {
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { IdeaFactoryFinding, IdeaType, MuseFindingVerdict } from "@westride/db";
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
import {
  READINESS_BAND_LABELS,
  READINESS_BAND_SUMMARIES,
  readinessFor,
  takeawaysFor,
  type Readiness,
  type ReadinessBand,
} from "@/lib/idea-factory/readiness";
import { AGENT_ICONS, EvaluateIcon } from "./agent-icons";
import { EvidenceBadge, SourceList, VerdictBadge } from "./evidence";

const EVIDENCE_ORDER = ["VERIFIED", "ESTIMATE", "ASSUMPTION", "HYPOTHESIS"] as const;

const BAND_VARIANT: Record<ReadinessBand, "success" | "info" | "warning" | "error"> = {
  high: "success",
  promising: "info",
  "needs-work": "warning",
  blocked: "error",
};

const BAND_BAR: Record<ReadinessBand, "success" | "accent" | "warning" | "error"> = {
  high: "success",
  promising: "accent",
  "needs-work": "warning",
  blocked: "error",
};

const VERDICT_BAR: Record<MuseFindingVerdict, "success" | "warning" | "error"> = {
  PROMISING: "success",
  CAUTION: "warning",
  BLOCKER: "error",
};

type ResultsTab = "insights" | "advisors" | "risks" | "next";

/** Synthesis bullets arrive as short markdown (bold runs, inline code), so render them as such. */
function Inline({ children }: { children: string }) {
  return (
    <Markdown density="compact" headingLevelStart={5} contentWidth="100%">
      {children}
    </Markdown>
  );
}

export type EvaluationActions = {
  onAskCoach: (question: string) => void;
  onDownloadReport: (evaluationId: string) => void;
  onOpenBuild: () => void;
};

// ---------------------------------------------------------------------------
// At a glance
// ---------------------------------------------------------------------------

function OverallCard({ readiness }: { readiness: Readiness }) {
  const band = readiness.band;
  return (
    <Card padding={5}>
      <VStack gap={3}>
        <Text type="label" color="secondary" weight="semibold">
          Overall readiness
        </Text>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Text type="display-2" as="p" hasTabularNumbers>
            {readiness.score === null ? "—" : `${readiness.score}%`}
          </Text>
          {band ? <Badge variant={BAND_VARIANT[band]} label={READINESS_BAND_LABELS[band]} /> : null}
        </HStack>
        <ProgressBar
          label="Overall readiness"
          isLabelHidden
          value={readiness.score ?? 0}
          variant={band ? BAND_BAR[band] : "neutral"}
        />
        <Text type="supporting">
          {band ? READINESS_BAND_SUMMARIES[band] : "Waiting for the first advisor to report."}
        </Text>
      </VStack>
    </Card>
  );
}

function TakeawaysCard({ evaluation }: { evaluation: EvaluationWithFindings }) {
  const takeaways = takeawaysFor(evaluation, 4);
  const icons = {
    success: { icon: CheckCircleIcon, color: "success" as const },
    warning: { icon: ExclamationTriangleIcon, color: "warning" as const },
    info: { icon: InformationCircleIcon, color: "accent" as const },
  };
  return (
    <Card padding={5}>
      <VStack gap={3}>
        <Text type="label" color="secondary" weight="semibold">
          Key takeaways
        </Text>
        {takeaways.length === 0 ? (
          <Text type="supporting">
            {evaluation.status === "RUNNING"
              ? "Muse writes these once every advisor has reported."
              : "The synthesis did not finish, so there are no takeaways yet."}
          </Text>
        ) : (
          <List edge="flush" density="compact">
            {takeaways.map((item, index) => (
              <ListItem
                key={index}
                align="first-line"
                startContent={<Icon icon={icons[item.tone].icon} color={icons[item.tone].color} />}
                label={<Inline>{item.text}</Inline>}
              />
            ))}
          </List>
        )}
      </VStack>
    </Card>
  );
}

function ConsensusCard({
  evaluation,
  readiness,
  canStoreFiles,
  isReportBusy,
  actions,
}: {
  evaluation: EvaluationWithFindings;
  readiness: Readiness;
  canStoreFiles: boolean;
  isReportBusy: boolean;
  actions: EvaluationActions;
}) {
  const share =
    readiness.finished > 0 ? Math.round((readiness.recommending / readiness.finished) * 100) : 0;
  const isDone = evaluation.status !== "RUNNING";
  return (
    <Card padding={5}>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <Icon icon={UsersIcon} color="accent" />
          <Text type="label" color="secondary" weight="semibold">
            Advisor consensus
          </Text>
        </HStack>
        <Text weight="semibold">
          {readiness.finished === 0
            ? "No advisor has reported yet"
            : `${readiness.recommending} of ${readiness.finished} advisors see a path forward`}
        </Text>
        <ProgressBar
          label="Share of advisors recommending moving forward"
          isLabelHidden
          value={share}
          hasValueLabel
        />
        <HStack gap={2} wrap="wrap">
          {readiness.counts.PROMISING > 0 ? (
            <Badge variant="success" label={`${readiness.counts.PROMISING} promising`} />
          ) : null}
          {readiness.counts.CAUTION > 0 ? (
            <Badge variant="warning" label={`${readiness.counts.CAUTION} caution`} />
          ) : null}
          {readiness.counts.BLOCKER > 0 ? (
            <Badge variant="error" label={`${readiness.counts.BLOCKER} blocker`} />
          ) : null}
        </HStack>
        <Divider />
        <VStack gap={2}>
          <Button
            label={isReportBusy ? "Preparing report…" : "Open PDF report"}
            variant="primary"
            size="sm"
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            isLoading={isReportBusy}
            isDisabled={!isDone || !canStoreFiles}
            tooltip={
              !canStoreFiles
                ? "File storage is not set up on this server."
                : !isDone
                  ? "Available once the evaluation finishes."
                  : undefined
            }
            onClick={() => actions.onDownloadReport(evaluation.id)}
          />
          <Button
            label="Plan build projects"
            variant="secondary"
            size="sm"
            icon={<Icon icon={CubeTransparentIcon} size="sm" />}
            onClick={actions.onOpenBuild}
          />
        </VStack>
      </VStack>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function AdvisorScoreCard({
  finding,
  score,
}: {
  finding: IdeaFactoryFinding;
  score: number | null;
}) {
  const agent = getAgent(finding.agentSlug);
  const icon = agent ? AGENT_ICONS[agent.icon] : EvaluateIcon;
  const isWorking = finding.status === "PENDING" || finding.status === "RUNNING";
  return (
    <Card padding={4}>
      <VStack gap={3}>
        <HStack gap={3} vAlign="center">
          <Icon icon={icon} color="accent" />
          <StackItem size="fill">
            <VStack gap={0}>
              <Text weight="semibold">{agent?.name ?? finding.agentSlug}</Text>
              {agent ? (
                <Text type="supporting" size="xsm">
                  {agent.tagline}
                </Text>
              ) : null}
            </VStack>
          </StackItem>
          {isWorking ? (
            <Spinner size="sm" aria-label={`${agent?.name ?? "Advisor"} is evaluating`} />
          ) : finding.verdict ? (
            <VerdictBadge verdict={finding.verdict} />
          ) : (
            <Badge variant="error" label="Failed" />
          )}
        </HStack>
        <HStack gap={3} vAlign="center">
          <StackItem size="fill">
            <ProgressBar
              label={`${agent?.name ?? finding.agentSlug} confidence`}
              isLabelHidden
              value={score ?? 0}
              isIndeterminate={isWorking}
              variant={finding.verdict ? VERDICT_BAR[finding.verdict] : "neutral"}
            />
          </StackItem>
          <Text type="supporting" hasTabularNumbers>
            {score === null ? "—" : `${score}%`}
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}

function InsightsTab({
  evaluation,
  readiness,
}: {
  evaluation: EvaluationWithFindings;
  readiness: Readiness;
}) {
  const synthesis = evaluation.synthesis;
  const scores = new Map(readiness.advisors.map((advisor) => [advisor.agentSlug, advisor.score]));
  return (
    <VStack gap={6}>
      {synthesis ? (
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
            <Grid columns={{ minWidth: 280, max: 2 }} gap={5}>
              {synthesis.agreements.length > 0 ? (
                <Card variant="muted" padding={4}>
                  <VStack gap={2}>
                    <Heading level={4}>Where the advisors agree</Heading>
                    <List edge="flush" density="compact">
                      {synthesis.agreements.map((item) => (
                        <ListItem
                          key={item}
                          align="first-line"
                          startContent={<Icon icon={CheckCircleIcon} color="success" />}
                          label={<Inline>{item}</Inline>}
                        />
                      ))}
                    </List>
                  </VStack>
                </Card>
              ) : null}
              {synthesis.questionsForYou.length > 0 ? (
                <Card variant="muted" padding={4}>
                  <VStack gap={2}>
                    <Heading level={4}>Where the advisors suggest focus</Heading>
                    <List edge="flush" density="compact">
                      {synthesis.questionsForYou.map((item) => (
                        <ListItem
                          key={item}
                          align="first-line"
                          startContent={<Icon icon={InformationCircleIcon} color="accent" />}
                          label={<Inline>{item}</Inline>}
                        />
                      ))}
                    </List>
                  </VStack>
                </Card>
              ) : null}
            </Grid>
            <VStack gap={2}>
              <Heading level={4}>Recommendation</Heading>
              <Markdown density="compact" headingLevelStart={5} contentWidth="100%">
                {synthesis.recommendation}
              </Markdown>
            </VStack>
          </VStack>
        </Card>
      ) : null}

      <VStack gap={3}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Heading level={3}>Advisor confidence</Heading>
          <Text type="supporting">
            Each score summarises an advisor&apos;s verdict and how well it is evidenced.
          </Text>
        </HStack>
        <Grid columns={{ minWidth: 260, max: 3 }} gap={3}>
          {evaluation.findings.map((finding) => (
            <AdvisorScoreCard
              key={finding.id}
              finding={finding}
              score={scores.get(finding.agentSlug) ?? null}
            />
          ))}
        </Grid>
      </VStack>
    </VStack>
  );
}

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
                <ListItem key={`${finding.id}-step-${index}`} label={<Inline>{step}</Inline>} />
              ))}
            </List>
          </VStack>
        ) : null}
      </VStack>
    </Card>
  );
}

function AdvisorsTab({ evaluation }: { evaluation: EvaluationWithFindings }) {
  return (
    <VStack gap={4}>
      <Grid columns={{ minWidth: 360, max: 2 }} gap={4}>
        {evaluation.findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} agent={getAgent(finding.agentSlug)} />
        ))}
      </Grid>
      <HStack gap={3} wrap="wrap">
        {EVIDENCE_ORDER.map((evidenceClass) => (
          <HStack key={evidenceClass} gap={2} vAlign="center">
            <EvidenceBadge evidenceClass={evidenceClass} />
            <Text type="supporting">{EVIDENCE_CLASS_DESCRIPTIONS[evidenceClass]}</Text>
          </HStack>
        ))}
      </HStack>
    </VStack>
  );
}

function RisksTab({ evaluation }: { evaluation: EvaluationWithFindings }) {
  const synthesis = evaluation.synthesis;
  const concerns = evaluation.findings.filter(
    (finding) =>
      finding.status === "COMPLETED" &&
      (finding.verdict === "CAUTION" || finding.verdict === "BLOCKER"),
  );
  const hasAnything =
    (synthesis?.risks.length ?? 0) > 0 ||
    (synthesis?.disagreements.length ?? 0) > 0 ||
    concerns.length > 0;
  if (!hasAnything) {
    return (
      <EmptyState
        title="No serious risks raised"
        description="Every advisor who finished found the idea promising in their area. The advisor reports still list assumptions worth checking."
        isCompact
      />
    );
  }
  return (
    <VStack gap={6}>
      {synthesis && synthesis.risks.length > 0 ? (
        <Card padding={5}>
          <VStack gap={2}>
            <Heading level={3}>Risks to watch</Heading>
            <List edge="flush" density="compact">
              {synthesis.risks.map((item) => (
                <ListItem
                  key={item}
                  align="first-line"
                  startContent={<Icon icon={ExclamationTriangleIcon} color="warning" />}
                  label={<Inline>{item}</Inline>}
                />
              ))}
            </List>
          </VStack>
        </Card>
      ) : null}

      {synthesis && synthesis.disagreements.length > 0 ? (
        <Card padding={5}>
          <VStack gap={2}>
            <Heading level={3}>Where the advisors disagree</Heading>
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
        </Card>
      ) : null}

      {concerns.length > 0 ? (
        <VStack gap={3}>
          <Heading level={3}>Advisors who raised concerns</Heading>
          <Grid columns={{ minWidth: 360, max: 2 }} gap={4}>
            {concerns.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                agent={getAgent(finding.agentSlug)}
              />
            ))}
          </Grid>
        </VStack>
      ) : null}
    </VStack>
  );
}

function NextStepsTab({
  evaluation,
  actions,
}: {
  evaluation: EvaluationWithFindings;
  actions: EvaluationActions;
}) {
  const synthesis = evaluation.synthesis;
  const steps = evaluation.findings
    .filter((finding) => finding.status === "COMPLETED" && finding.nextSteps.length > 0)
    .map((finding) => ({ finding, agent: getAgent(finding.agentSlug) }));
  return (
    <VStack gap={6}>
      {synthesis && synthesis.questionsForYou.length > 0 ? (
        <Card padding={5} elevation="low">
          <VStack gap={3}>
            <VStack gap={1}>
              <Heading level={3}>Decide with the Idea Coach</Heading>
              <Text type="supporting">
                Pick a question to take it to the Idea Coach, who has read every finding.
              </Text>
            </VStack>
            <VStack gap={2} hAlign="start">
              {synthesis.questionsForYou.map((question) => (
                <Button
                  key={question}
                  label={question}
                  variant="secondary"
                  size="sm"
                  icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />}
                  onClick={() => actions.onAskCoach(question)}
                />
              ))}
            </VStack>
          </VStack>
        </Card>
      ) : null}

      {steps.length > 0 ? (
        <VStack gap={3}>
          <Heading level={3}>What each advisor would do next</Heading>
          <Grid columns={{ minWidth: 300, max: 2 }} gap={3}>
            {steps.map(({ finding, agent }) => (
              <Card key={finding.id} padding={4}>
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center">
                    <Icon icon={agent ? AGENT_ICONS[agent.icon] : EvaluateIcon} color="accent" />
                    <Text weight="semibold">{agent?.name ?? finding.agentSlug}</Text>
                  </HStack>
                  <List listStyle="decimal" edge="padded" density="compact">
                    {finding.nextSteps.map((step, index) => (
                      <ListItem key={`${finding.id}-${index}`} label={<Inline>{step}</Inline>} />
                    ))}
                  </List>
                </VStack>
              </Card>
            ))}
          </Grid>
        </VStack>
      ) : null}

      <Card variant="muted" padding={5}>
        <HStack gap={4} vAlign="center" wrap="wrap">
          <Icon icon={CubeTransparentIcon} size="lg" color="accent" />
          <StackItem size="fill">
            <VStack gap={1}>
              <Heading level={3}>Ready to build?</Heading>
              <Text type="supporting">
                Muse can split this idea into the repositories it needs and hand each one to Project
                Factory with a brief and first milestones.
              </Text>
            </VStack>
          </StackItem>
          <Button label="Plan build projects" variant="primary" onClick={actions.onOpenBuild} />
        </HStack>
      </Card>
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// One evaluation, top to bottom
// ---------------------------------------------------------------------------

function RunningBanner({ evaluation }: { evaluation: EvaluationWithFindings }) {
  const finished = evaluation.findings.filter((finding) => finding.status === "COMPLETED").length;
  const pending = evaluation.findings.length - finished;
  const failed = evaluation.findings.filter((finding) => finding.status === "FAILED").length;
  if (evaluation.status === "FAILED") {
    return (
      <Banner
        status="error"
        title="The evaluation did not finish"
        description={evaluation.error ?? "Muse could not synthesise the findings."}
      />
    );
  }
  if (evaluation.status !== "RUNNING") {
    return null;
  }
  return (
    <Card variant="muted" padding={4}>
      <HStack gap={3} vAlign="center">
        <Spinner size="md" aria-label="Evaluation in progress" />
        <StackItem size="fill">
          <VStack gap={0}>
            <Text weight="semibold">
              {pending - failed > 0
                ? `${finished} of ${evaluation.findings.length} advisors have reported`
                : "Muse is synthesising the team's findings"}
            </Text>
            <Text type="supporting">
              Each advisor works independently; Muse then compares their findings and explains
              where they disagree.
            </Text>
          </VStack>
        </StackItem>
      </HStack>
    </Card>
  );
}

function EvaluationReport({
  evaluation,
  canStoreFiles,
  isReportBusy,
  actions,
}: {
  evaluation: EvaluationWithFindings;
  canStoreFiles: boolean;
  isReportBusy: boolean;
  actions: EvaluationActions;
}) {
  const [tab, setTab] = useState<ResultsTab>("insights");
  const readiness = useMemo(() => readinessFor(evaluation), [evaluation]);
  const model = getMuseModel(evaluation.model);
  const panelPrefix = `evaluation-${evaluation.id.slice(0, 8)}`;
  const concernCount =
    readiness.counts.CAUTION + readiness.counts.BLOCKER + (evaluation.synthesis?.risks.length ?? 0);

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
        {evaluation.status === "RUNNING" ? <Badge variant="info" label="Running" /> : null}
        {evaluation.status === "FAILED" ? <Badge variant="error" label="Failed" /> : null}
      </HStack>

      <RunningBanner evaluation={evaluation} />

      <Grid columns={{ minWidth: 260, max: 3 }} gap={4} align="stretch">
        <OverallCard readiness={readiness} />
        <TakeawaysCard evaluation={evaluation} />
        <ConsensusCard
          evaluation={evaluation}
          readiness={readiness}
          canStoreFiles={canStoreFiles}
          isReportBusy={isReportBusy}
          actions={actions}
        />
      </Grid>

      <TabList value={tab} onChange={(value) => setTab(value as ResultsTab)} hasDivider>
        <Tab value="insights" label="Results & insights" panelId={`${panelPrefix}-insights`} />
        <Tab
          value="advisors"
          label="Advisor reports"
          panelId={`${panelPrefix}-advisors`}
          endContent={<Badge variant="neutral" label={String(evaluation.findings.length)} />}
        />
        <Tab
          value="risks"
          label="Risks & considerations"
          panelId={`${panelPrefix}-risks`}
          endContent={
            concernCount > 0 ? <Badge variant="warning" label={String(concernCount)} /> : undefined
          }
        />
        <Tab value="next" label="Next steps" panelId={`${panelPrefix}-next`} />
      </TabList>

      <VStack id={`${panelPrefix}-${tab}`} role="tabpanel">
        {tab === "insights" ? <InsightsTab evaluation={evaluation} readiness={readiness} /> : null}
        {tab === "advisors" ? <AdvisorsTab evaluation={evaluation} /> : null}
        {tab === "risks" ? <RisksTab evaluation={evaluation} /> : null}
        {tab === "next" ? <NextStepsTab evaluation={evaluation} actions={actions} /> : null}
      </VStack>
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function EvaluationPanel({
  ideaType,
  evaluations,
  isConnected,
  isRunning,
  error,
  defaultAgentSlugs,
  canStoreFiles,
  reportBusyId,
  onStart,
  actions,
}: {
  ideaType: IdeaType;
  evaluations: EvaluationWithFindings[];
  isConnected: boolean;
  isRunning: boolean;
  error: string | null;
  defaultAgentSlugs: string[];
  canStoreFiles: boolean;
  /** Evaluation whose PDF is being rendered, if any. */
  reportBusyId: string | null;
  onStart: (agentSlugs: string[]) => void;
  actions: EvaluationActions;
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
                <Heading level={2}>{latest ? "Analyze" : "Evaluate my idea"}</Heading>
                <Text type="supporting">
                  Each advisor reviews the idea independently and labels every finding as
                  verified, an estimate, an assumption, or a hypothesis. Muse then compares their
                  findings, scores the idea&apos;s readiness, and asks what you want to do next.
                </Text>
              </VStack>
            </StackItem>
            <Button
              label={isRunning ? "Evaluating…" : latest ? "Evaluate again" : "Evaluate my idea"}
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
                Each advisor is one request to Muse, plus one more for the synthesis. Deselect
                advisors to keep the run smaller.
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
        <EvaluationReport
          evaluation={latest}
          canStoreFiles={canStoreFiles}
          isReportBusy={reportBusyId === latest.id}
          actions={actions}
        />
      ) : (
        <EmptyState
          title="No evaluations yet"
          description="Run the advisory team once and their findings become shared context for every conversation, with a readiness score and a report you can download."
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
                <EvaluationReport
                  evaluation={evaluation}
                  canStoreFiles={canStoreFiles}
                  isReportBusy={reportBusyId === evaluation.id}
                  actions={actions}
                />
              </VStack>
            </Collapsible>
          ))}
        </VStack>
      ) : null}

      <Text type="supporting">
        {`${EVIDENCE_CLASS_LABELS.VERIFIED} means a named, dated source was found. `}
        Everything else is the advisors&apos; reasoning and should be checked before you rely on
        it. Readiness scores summarise verdicts and evidence; they are not predictions.
      </Text>
    </VStack>
  );
}
