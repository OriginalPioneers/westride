"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import {
  Layout,
  LayoutContent,
  LayoutPanel,
} from "@astryxdesign/core/Layout";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Text } from "@astryxdesign/core/Text";
import { CheckIcon, Cog6ToothIcon, LinkIcon } from "@heroicons/react/24/outline";
import type {
  BuildSuggestion,
  IdeaFactoryArtifact,
  IdeaFactoryFinding,
  IdeaFactoryMessage,
  IdeaType,
} from "@westride/db";
import type {
  EvaluationWithFindings,
  MuseRequestSummary,
  MuseUsageTotals,
} from "@westride/db/idea-factory";
import {
  defaultEvaluationAgents,
  getAgent,
  IDEA_COACH_SLUG,
} from "@/lib/idea-factory/agents";
import { artifactPath } from "@/lib/idea-factory/artifacts";
import { uploadIdeaFiles } from "@/lib/idea-factory/upload-client";
import {
  forgetBrowserMuseCredential,
  readFactoryPreferences,
  writeFactoryPreferences,
  type FactoryPreferences,
} from "@/lib/idea-factory/credentials";
import { DEFAULT_MUSE_MODEL, getMuseModel } from "@/lib/idea-factory/pricing";
import type { MetaConnectionSummary } from "@/lib/meta/connection";
import { CreateProjectDialog } from "../../../build/create-project-dialog";
import type { ProjectPrefill } from "../../../build/actions";
import { disconnectMeta } from "../../../meta-actions";
import {
  generateEvaluationReport,
  linkSuggestedProject,
  loadFactory,
  loadSuggestedProjectPrefill,
  runEvaluationAgent,
  sendAgentMessage,
  setArtifactArchivedAction,
  setArtifactChosenAction,
  startEvaluation,
  suggestBuildProjects,
  synthesizeEvaluation,
  type FactoryData,
} from "./actions";
import { ActivityPanel } from "./activity-panel";
import { AgentRail, viewKey, type FactoryView } from "./agent-rail";
import { AgentThread } from "./agent-thread";
import type { ArtifactActions } from "./artifact-card";
import { BuildPanel } from "./build-panel";
import { ConnectPanel } from "./connect-panel";
import { EvaluationPanel } from "./evaluation-panel";
import { FilesPanel } from "./files-panel";

export type FactoryIdea = {
  id: string;
  name: string;
  type: IdeaType;
};

/** Same near-fullscreen frame as the idea wizard. */
const DIALOG_SIZE = "calc(100dvh - (2 * var(--spacing-4)))";
const DIALOG_WIDTH = "calc(100dvw - (2 * var(--spacing-4)))";
const RAIL_WIDTH = 300;
const PANEL_WIDTH = 1040;

const DEFAULT_PREFERENCES: FactoryPreferences = {
  model: DEFAULT_MUSE_MODEL,
  webSearch: true,
};

type View = FactoryView;

/** The workshop's four stages, in order; each maps to a view. */
const STAGES: { label: string; description: string; view: View }[] = [
  {
    label: "Explore",
    description: "Talk it through with the coach",
    view: { kind: "agent", slug: IDEA_COACH_SLUG },
  },
  { label: "Analyze", description: "Run the advisory team", view: { kind: "evaluation" } },
  { label: "Refine", description: "Logos, briefs, and files", view: { kind: "files" } },
  { label: "Plan", description: "Build projects and repos", view: { kind: "build" } },
];

function stageIndexFor(view: View): number {
  if (view.kind === "agent") {
    return 0;
  }
  const index = STAGES.findIndex((stage) => stage.view.kind === view.kind);
  return index === -1 ? 0 : index;
}

/** Which stages hold real work, so the stepper can mark them done out of order. */
function stagesDone(data: FactoryData | null): boolean[] {
  if (!data) {
    return STAGES.map(() => false);
  }
  return [
    data.threads.some((thread) => thread.messages.length > 0),
    data.evaluations.some((evaluation) => evaluation.status === "COMPLETED"),
    data.artifacts.some((artifact) => artifact.kind !== "REPORT" && !artifact.archivedAt),
    data.projects.length > 0 || data.buildSuggestion !== null,
  ];
}

function tempId(): string {
  return `temp-${Math.random().toString(36).slice(2)}`;
}

function addUsage(
  usage: MuseUsageTotals,
  request: MuseRequestSummary | null | undefined,
  viewerId: string,
): MuseUsageTotals {
  if (!request || request.clerkUserId !== viewerId) {
    return usage;
  }
  return {
    requests: usage.requests + 1,
    inputTokens: usage.inputTokens + request.inputTokens,
    cachedTokens: usage.cachedTokens + request.cachedTokens,
    outputTokens: usage.outputTokens + request.outputTokens,
    totalTokens: usage.totalTokens + request.totalTokens,
    webSearchCalls: usage.webSearchCalls + request.webSearchCalls,
    estimatedCostMicros: usage.estimatedCostMicros + request.estimatedCostMicros,
  };
}

function mergeArtifacts(
  current: IdeaFactoryArtifact[],
  incoming: IdeaFactoryArtifact[],
): IdeaFactoryArtifact[] {
  const byId = new Map(current.map((artifact) => [artifact.id, artifact]));
  for (const artifact of incoming) {
    byId.set(artifact.id, artifact);
  }
  return [...byId.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function IdeaFactoryDialog({
  isOpen,
  onOpenChange,
  idea,
  viewerId,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  idea: FactoryIdea;
  viewerId: string;
}) {
  const [preferences, setPreferences] = useState<FactoryPreferences>(DEFAULT_PREFERENCES);
  const [data, setData] = useState<FactoryData | null>(null);
  const [meta, setMeta] = useState<MetaConnectionSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "agent", slug: IDEA_COACH_SLUG });
  const [hasChosenView, setHasChosenView] = useState(false);
  const [sendingSlugs, setSendingSlugs] = useState<ReadonlySet<string>>(new Set());
  const [threadErrors, setThreadErrors] = useState<Record<string, string>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [busyArtifactIds, setBusyArtifactIds] = useState<ReadonlySet<string>>(new Set());
  const [filesError, setFilesError] = useState<string | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [reportBusyId, setReportBusyId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState<{
    key: string;
    suggestionId: string;
    prefill: ProjectPrefill;
  } | null>(null);

  useEffect(() => {
    setPreferences(readFactoryPreferences(viewerId, DEFAULT_PREFERENCES));
    forgetBrowserMuseCredential(viewerId);
  }, [viewerId]);

  useEffect(() => {
    let cancelled = false;
    void loadFactory(idea.id).then((result) => {
      if (cancelled) {
        return;
      }
      if (result.status === "ok") {
        setData(result.data);
        setMeta(result.data.meta);
      } else {
        setLoadError(result.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [idea.id]);

  // First visit with no way to pay for Muse lands on the connect screen.
  useEffect(() => {
    if (data && !data.meta && !data.canUseCloud && !hasChosenView) {
      setView({ kind: "connect" });
    }
  }, [data, hasChosenView]);

  // A funded WeStride Cloud balance counts as connected: the shared key pays.
  const isConnected = meta !== null || Boolean(data?.canUseCloud);
  const modelLabel = getMuseModel(preferences.model)?.label ?? preferences.model;

  const updatePreferences = useCallback(
    (next: FactoryPreferences) => {
      setPreferences(next);
      writeFactoryPreferences(viewerId, next);
    },
    [viewerId],
  );

  function chooseView(next: View) {
    setHasChosenView(true);
    setView(next);
  }

  function handleConnected(next: MetaConnectionSummary) {
    setMeta(next);
    chooseView({ kind: "agent", slug: IDEA_COACH_SLUG });
  }

  /** The server found no usable Meta key, so the member connects again. */
  function handleNeedsConnection() {
    setMeta(null);
    chooseView({ kind: "connect" });
  }

  function patchData(update: (current: FactoryData) => FactoryData) {
    setData((current) => (current ? update(current) : current));
  }

  function appendMessage(agentSlug: string, message: IdeaFactoryMessage, threadId: string) {
    patchData((current) => {
      const existing = current.threads.find((thread) => thread.agentSlug === agentSlug);
      if (!existing) {
        return {
          ...current,
          threads: [
            ...current.threads,
            {
              id: threadId,
              ideaId: idea.id,
              agentSlug,
              createdAt: message.createdAt,
              updatedAt: message.createdAt,
              messages: [message],
            },
          ],
        };
      }
      return {
        ...current,
        threads: current.threads.map((thread) =>
          thread.agentSlug === agentSlug
            ? {
                ...thread,
                id: threadId,
                updatedAt: message.createdAt,
                messages: [...thread.messages, message],
              }
            : thread,
        ),
      };
    });
  }

  function replaceMessage(agentSlug: string, fromId: string, message: IdeaFactoryMessage) {
    patchData((current) => ({
      ...current,
      threads: current.threads.map((thread) =>
        thread.agentSlug === agentSlug
          ? {
              ...thread,
              messages: thread.messages.map((item) => (item.id === fromId ? message : item)),
            }
          : thread,
      ),
    }));
  }

  function removeMessage(agentSlug: string, id: string) {
    patchData((current) => ({
      ...current,
      threads: current.threads.map((thread) =>
        thread.agentSlug === agentSlug
          ? { ...thread, messages: thread.messages.filter((item) => item.id !== id) }
          : thread,
      ),
    }));
  }

  function recordRequest(request: MuseRequestSummary | null | undefined) {
    if (!request) {
      return;
    }
    patchData((current) => ({
      ...current,
      requests: [request, ...current.requests.filter((item) => item.id !== request.id)],
      usage: addUsage(current.usage, request, viewerId),
    }));
  }

  function addArtifacts(artifacts: IdeaFactoryArtifact[]) {
    if (artifacts.length === 0) {
      return;
    }
    patchData((current) => ({
      ...current,
      artifacts: mergeArtifacts(current.artifacts, artifacts),
    }));
  }

  function setThreadError(agentSlug: string, message: string | null) {
    setThreadErrors((current) => {
      const next = { ...current };
      if (message) {
        next[agentSlug] = message;
      } else {
        delete next[agentSlug];
      }
      return next;
    });
  }

  async function handleSend(agentSlug: string, content: string, files: File[] = []) {
    if (sendingSlugs.has(agentSlug)) {
      return;
    }
    setThreadError(agentSlug, null);
    setSendingSlugs((current) => new Set(current).add(agentSlug));

    let uploaded: IdeaFactoryArtifact[] = [];
    if (files.length > 0) {
      const uploadedResult = await uploadIdeaFiles(idea.id, files);
      if (uploadedResult.status === "error") {
        setThreadError(agentSlug, uploadedResult.message);
        setSendingSlugs((current) => {
          const next = new Set(current);
          next.delete(agentSlug);
          return next;
        });
        return;
      }
      uploaded = uploadedResult.artifacts;
    }

    const optimisticId = tempId();
    const threadId = data?.threads.find((thread) => thread.agentSlug === agentSlug)?.id ?? tempId();
    appendMessage(
      agentSlug,
      {
        id: optimisticId,
        threadId,
        role: "USER",
        clerkUserId: viewerId,
        content,
        sources: [],
        requestId: null,
        createdAt: new Date(),
      },
      threadId,
    );
    if (uploaded.length > 0) {
      addArtifacts(uploaded.map((artifact) => ({ ...artifact, messageId: optimisticId })));
    }

    try {
      const result = await sendAgentMessage({
        ideaId: idea.id,
        agentSlug,
        content,
        artifactIds: uploaded.map((artifact) => artifact.id),
        model: preferences.model,
        webSearch: preferences.webSearch,
      });

      if (result.status === "ok") {
        replaceMessage(agentSlug, optimisticId, result.userMessage);
        appendMessage(agentSlug, result.agentMessage, result.threadId);
        addArtifacts(result.artifacts);
        for (const request of result.requests) {
          recordRequest(request);
        }
        if (result.artifactErrors.length > 0) {
          setThreadError(
            agentSlug,
            result.artifactErrors.length === 1
              ? result.artifactErrors[0]
              : `${result.artifactErrors.length} files could not be created: ${result.artifactErrors.join(" ")}`,
          );
        }
      } else {
        if (result.artifacts) {
          addArtifacts(result.artifacts);
        }
        if (result.userMessage) {
          replaceMessage(agentSlug, optimisticId, result.userMessage);
        } else {
          removeMessage(agentSlug, optimisticId);
        }
        recordRequest(result.request);
        setThreadError(agentSlug, result.message);
        if (result.needsConnection) {
          handleNeedsConnection();
        }
      }
    } catch {
      removeMessage(agentSlug, optimisticId);
      setThreadError(agentSlug, "Something went wrong. Try again.");
    } finally {
      setSendingSlugs((current) => {
        const next = new Set(current);
        next.delete(agentSlug);
        return next;
      });
    }
  }

  async function handleUploadFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }
    setFilesError(null);
    setIsUploadingFiles(true);
    try {
      const result = await uploadIdeaFiles(idea.id, files);
      if (result.status === "ok") {
        addArtifacts(result.artifacts);
      } else {
        setFilesError(result.message);
      }
    } catch {
      setFilesError("Those files could not be uploaded. Try again.");
    } finally {
      setIsUploadingFiles(false);
    }
  }

  // --- Files & assets -----------------------------------------------------

  function markArtifactBusy(artifactId: string, isBusy: boolean) {
    setBusyArtifactIds((current) => {
      const next = new Set(current);
      if (isBusy) {
        next.add(artifactId);
      } else {
        next.delete(artifactId);
      }
      return next;
    });
  }

  async function runArtifactAction(
    artifactId: string,
    action: () => ReturnType<typeof setArtifactArchivedAction>,
  ) {
    if (busyArtifactIds.has(artifactId)) {
      return;
    }
    setFilesError(null);
    markArtifactBusy(artifactId, true);
    try {
      const result = await action();
      if (result.status === "ok") {
        addArtifacts(result.artifacts);
      } else {
        setFilesError(result.message);
      }
    } catch {
      setFilesError("That file could not be updated. Try again.");
    } finally {
      markArtifactBusy(artifactId, false);
    }
  }

  const artifactActions: ArtifactActions = {
    onArchive: (artifactId, isArchived) =>
      void runArtifactAction(artifactId, () =>
        setArtifactArchivedAction({ ideaId: idea.id, artifactId }, isArchived),
      ),
    onChoose: (artifactId, isChosen) =>
      void runArtifactAction(artifactId, () =>
        setArtifactChosenAction({ ideaId: idea.id, artifactId }, isChosen),
      ),
  };

  async function handleDownloadReport(evaluationId: string) {
    if (reportBusyId) {
      return;
    }
    setEvaluationError(null);
    setReportBusyId(evaluationId);
    // Open the tab synchronously so the browser treats it as user-initiated.
    const tab = window.open("", "_blank");
    try {
      const result = await generateEvaluationReport({ evaluationId });
      if (result.status === "ok") {
        addArtifacts([result.artifact]);
        // Inline, so the new tab shows the PDF; Files & assets offers the download.
        const href = artifactPath(idea.id, result.artifact.id);
        if (tab) {
          tab.location.href = href;
        } else {
          window.location.assign(href);
        }
      } else {
        tab?.close();
        setEvaluationError(result.message);
        if (result.needsConnection) {
          handleNeedsConnection();
        }
      }
    } catch {
      tab?.close();
      setEvaluationError("The report could not be generated. Try again.");
    } finally {
      setReportBusyId(null);
    }
  }

  // --- Build projects -----------------------------------------------------

  async function handleSuggest() {
    if (isSuggesting) {
      return;
    }
    setBuildError(null);
    setIsSuggesting(true);
    try {
      const result = await suggestBuildProjects({ ideaId: idea.id, model: preferences.model });
      recordRequest(result.request);
      if (result.status === "ok") {
        patchData((current) => ({ ...current, buildSuggestion: result.suggestion }));
      } else {
        setBuildError(result.message);
        if (result.needsConnection) {
          handleNeedsConnection();
        }
      }
    } catch {
      setBuildError("Muse could not draft build projects. Try again.");
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleStartProject(project: BuildSuggestion) {
    const suggestion = data?.buildSuggestion;
    if (!suggestion || startingKey) {
      return;
    }
    setBuildError(null);
    setStartingKey(project.key);
    try {
      const result = await loadSuggestedProjectPrefill({
        ideaId: idea.id,
        suggestionId: suggestion.id,
        key: project.key,
      });
      if (result.status === "ok") {
        setProjectDraft({ key: project.key, suggestionId: suggestion.id, prefill: result.prefill });
      } else {
        setBuildError(result.message);
      }
    } catch {
      setBuildError("The project brief could not be loaded. Try again.");
    } finally {
      setStartingKey(null);
    }
  }

  async function handleProjectCreated(projectId: string) {
    const draft = projectDraft;
    if (!draft) {
      return;
    }
    try {
      const result = await linkSuggestedProject({
        ideaId: idea.id,
        suggestionId: draft.suggestionId,
        key: draft.key,
        projectId,
      });
      if (result.status === "ok") {
        patchData((current) => ({
          ...current,
          buildSuggestion: result.suggestion,
          projects: result.project
            ? [result.project, ...current.projects.filter((item) => item.id !== projectId)]
            : current.projects,
        }));
      }
    } catch {
      // The project exists either way; the link is a convenience.
    }
  }

  // --- Evaluation ---------------------------------------------------------

  function upsertEvaluation(evaluation: EvaluationWithFindings) {
    patchData((current) => {
      const exists = current.evaluations.some((item) => item.id === evaluation.id);
      return {
        ...current,
        evaluations: exists
          ? current.evaluations.map((item) => (item.id === evaluation.id ? evaluation : item))
          : [evaluation, ...current.evaluations],
      };
    });
  }

  function patchFinding(evaluationId: string, finding: IdeaFactoryFinding) {
    patchData((current) => ({
      ...current,
      evaluations: current.evaluations.map((evaluation) =>
        evaluation.id === evaluationId
          ? {
              ...evaluation,
              findings: evaluation.findings.map((item) =>
                item.agentSlug === finding.agentSlug ? finding : item,
              ),
            }
          : evaluation,
      ),
    }));
  }

  async function handleEvaluate(agentSlugs: string[]) {
    if (isEvaluating) {
      return;
    }
    setEvaluationError(null);
    setIsEvaluating(true);
    try {
      const started = await startEvaluation({
        ideaId: idea.id,
        agentSlugs,
        model: preferences.model,
      });
      if (started.status !== "ok") {
        setEvaluationError(started.message);
        if (started.needsConnection) {
          handleNeedsConnection();
        }
        return;
      }
      const evaluation = started.evaluation;
      upsertEvaluation(evaluation);

      // Every advisor works at once; findings land as each one finishes.
      await Promise.allSettled(
        evaluation.findings.map(async (slot) => {
          patchFinding(evaluation.id, { ...slot, status: "RUNNING" });
          const result = await runEvaluationAgent({
            evaluationId: evaluation.id,
            agentSlug: slot.agentSlug,
            webSearch: preferences.webSearch,
          });
          if (result.status === "ok") {
            patchFinding(evaluation.id, result.finding);
            recordRequest(result.request);
          } else {
            if (result.finding) {
              patchFinding(evaluation.id, result.finding);
            } else {
              patchFinding(evaluation.id, {
                ...slot,
                status: "FAILED",
                error: result.message,
                completedAt: new Date(),
              });
            }
            recordRequest(result.request);
          }
        }),
      );

      const synthesized = await synthesizeEvaluation({ evaluationId: evaluation.id });
      if (synthesized.evaluation) {
        upsertEvaluation(synthesized.evaluation);
      }
      recordRequest(synthesized.request);
      if (synthesized.status !== "ok") {
        setEvaluationError(synthesized.message);
        if (synthesized.needsConnection) {
          handleNeedsConnection();
        }
      }
    } catch {
      setEvaluationError("The evaluation could not run. Try again.");
    } finally {
      setIsEvaluating(false);
    }
  }

  function askCoach(question: string) {
    chooseView({ kind: "agent", slug: IDEA_COACH_SLUG });
    void handleSend(IDEA_COACH_SLUG, question);
  }

  const defaultEvaluationSlugs = useMemo(
    () => defaultEvaluationAgents(idea.type).map((agent) => agent.slug),
    [idea.type],
  );

  const activeFiles = useMemo(
    () => (data?.artifacts ?? []).filter((artifact) => !artifact.archivedAt),
    [data?.artifacts],
  );
  const hasCompletedEvaluation =
    data?.evaluations.some((evaluation) => evaluation.status === "COMPLETED") ?? false;
  const viewer = data?.members.find((member) => member.clerkUserId === viewerId);
  const unlinkedSuggestions =
    data?.buildSuggestion?.projects.filter((project) => !project.projectId).length ?? 0;

  function renderMain() {
    if (loadError) {
      return (
        <VStack padding={6}>
          <Banner status="error" title={loadError} />
        </VStack>
      );
    }
    if (!data) {
      return (
        <VStack height="100%" vAlign="center" hAlign="center">
          <Spinner size="lg" label="Opening the Idea Workshop…" />
        </VStack>
      );
    }

    if (view.kind === "connect") {
      return (
        <VStack padding={6} hAlign="center">
          <ConnectPanel
            canConnectMeta={data.canConnectMeta}
            canConnectMetaAccount={data.canConnectMetaAccount}
            cloudAvailable={data.cloudAvailable}
            onConnected={handleConnected}
          />
        </VStack>
      );
    }

    if (view.kind === "evaluation") {
      return (
        <VStack padding={6} hAlign="center">
          <VStack maxWidth={PANEL_WIDTH} width="100%">
            <EvaluationPanel
              ideaType={idea.type}
              evaluations={data.evaluations}
              isConnected={isConnected}
              isRunning={isEvaluating}
              error={evaluationError}
              defaultAgentSlugs={defaultEvaluationSlugs}
              canStoreFiles={data.canStoreFiles}
              reportBusyId={reportBusyId}
              onStart={(slugs) => void handleEvaluate(slugs)}
              actions={{
                onAskCoach: askCoach,
                onDownloadReport: (evaluationId) => void handleDownloadReport(evaluationId),
                onOpenBuild: () => chooseView({ kind: "build" }),
              }}
            />
          </VStack>
        </VStack>
      );
    }

    if (view.kind === "files") {
      return (
        <VStack padding={6} hAlign="center">
          <VStack maxWidth={PANEL_WIDTH} width="100%">
            <FilesPanel
              ideaType={idea.type}
              artifacts={data.artifacts}
              actions={artifactActions}
              busyIds={busyArtifactIds}
              error={filesError}
              canStoreFiles={data.canStoreFiles}
              isUploading={isUploadingFiles}
              onUpload={(files) => void handleUploadFiles(files)}
              onOpenAgent={(slug) => chooseView({ kind: "agent", slug })}
            />
          </VStack>
        </VStack>
      );
    }

    if (view.kind === "build") {
      return (
        <VStack padding={6} hAlign="center">
          <VStack maxWidth={PANEL_WIDTH} width="100%">
            <BuildPanel
              projects={data.projects}
              suggestion={data.buildSuggestion}
              hasEvaluation={hasCompletedEvaluation}
              isConnected={isConnected}
              isSuggesting={isSuggesting}
              startingKey={startingKey}
              error={buildError}
              onSuggest={() => void handleSuggest()}
              onStartProject={(project) => void handleStartProject(project)}
            />
          </VStack>
        </VStack>
      );
    }

    if (view.kind === "activity") {
      return (
        <VStack padding={6} hAlign="center">
          <VStack maxWidth={PANEL_WIDTH} width="100%">
            <ActivityPanel
              ideaId={idea.id}
              requests={data.requests}
              usage={data.usage}
              meta={meta}
              preferences={preferences}
              onPreferencesChange={updatePreferences}
              onDisconnect={() => {
                void disconnectMeta();
                handleNeedsConnection();
              }}
            />
          </VStack>
        </VStack>
      );
    }

    const agent = getAgent(view.slug);
    if (!agent) {
      return (
        <EmptyState
          title="That advisor is not on this team"
          description="Pick another advisor from the list."
        />
      );
    }
    const thread = data.threads.find((item) => item.agentSlug === view.slug);
    return (
      <VStack height="100%" minHeight={0}>
        {!isConnected ? (
          <VStack paddingInline={6} paddingBlockStart={4}>
            <Banner
              status="info"
              title="Connect your Meta account to talk to the team"
              description="You can read the team's earlier conversations, but new questions need your own Meta Model API access."
              endContent={
                <Button
                  label="Connect"
                  variant="primary"
                  size="sm"
                  onClick={() => chooseView({ kind: "connect" })}
                />
              }
            />
          </VStack>
        ) : null}
        <AgentThread
          agent={agent}
          messages={thread?.messages ?? []}
          artifacts={data.artifacts}
          artifactActions={artifactActions}
          busyArtifactIds={busyArtifactIds}
          members={data.members}
          isConnected={isConnected}
          isSending={sendingSlugs.has(agent.slug)}
          canStoreFiles={data.canStoreFiles}
          error={threadErrors[agent.slug] ?? null}
          onSend={(content, files) => void handleSend(agent.slug, content, files)}
        />
      </VStack>
    );
  }

  const isChat = view.kind === "agent";
  const showStepper = Boolean(data) && view.kind !== "connect";
  const done = stagesDone(data);
  const current = stageIndexFor(view);

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        purpose="info"
        width={DIALOG_WIDTH}
        maxHeight={DIALOG_SIZE}
        style={{ height: DIALOG_SIZE }}
      >
        <Layout
          height="fill"
          header={
            <VStack>
              <DialogHeader
                title="Idea Workshop"
                subtitle={idea.name}
                hasDivider={!showStepper}
                onOpenChange={onOpenChange}
                endContent={
                  isConnected ? (
                    <HStack gap={2} vAlign="center" wrap="wrap">
                      <Badge variant="success" label={meta ? "Connected" : "WeStride Cloud"} />
                      <Text type="supporting">{modelLabel}</Text>
                      <Button
                        label="Settings"
                        variant="ghost"
                        size="sm"
                        icon={<Icon icon={Cog6ToothIcon} />}
                        onClick={() => chooseView({ kind: "activity" })}
                      />
                    </HStack>
                  ) : (
                    <Button
                      label="Connect Meta"
                      variant="primary"
                      size="sm"
                      icon={<Icon icon={LinkIcon} />}
                      onClick={() => chooseView({ kind: "connect" })}
                    />
                  )
                }
              />
              {showStepper ? (
                <VStack>
                  <VStack paddingInline={6} paddingBlockEnd={3}>
                    <Stepper
                      label="Workshop stages"
                      activeStep={current}
                      density="compact"
                      indicatorPosition="on-track"
                      horizontalOptions={{ minimumStepWidth: 140, collapsedVariant: "withLabel" }}
                      onStepClick={(index) => {
                        const stage = STAGES[index];
                        if (stage) {
                          chooseView(stage.view);
                        }
                      }}
                    >
                      {STAGES.map((stage, index) => (
                        <Step
                          key={stage.label}
                          step={index}
                          label={stage.label}
                          description={stage.description}
                          /* Only stages that hold real work read as done, whatever the order. */
                          status={index !== current && done[index] ? "success" : undefined}
                          indicator={
                            index === current
                              ? "number"
                              : done[index]
                                ? <Icon icon={CheckIcon} size="sm" />
                                : "number"
                          }
                        />
                      ))}
                    </Stepper>
                  </VStack>
                  <Divider />
                </VStack>
              ) : null}
            </VStack>
          }
          start={
            <LayoutPanel
              width={RAIL_WIDTH}
              hasDivider
              padding={3}
              label="Advisory team"
              style={{ userSelect: "none", WebkitUserSelect: "none" }}
            >
              <AgentRail
                ideaType={idea.type}
                view={view}
                onSelect={chooseView}
                busyAgentSlugs={sendingSlugs}
                isEvaluationRunning={isEvaluating}
                isSuggesting={isSuggesting}
                evaluationCount={data?.evaluations.length ?? 0}
                fileCount={activeFiles.length}
                projectCount={data?.projects.length ?? 0}
                suggestionCount={unlinkedSuggestions}
                requestCount={data?.requests.length ?? 0}
              />
            </LayoutPanel>
          }
          content={
            /* Remount per view so one panel's scroll position does not carry over. */
            <LayoutContent key={viewKey(view)} padding={0} isScrollable={!isChat}>
              {renderMain()}
            </LayoutContent>
          }
        />
      </Dialog>

      {projectDraft ? (
        <CreateProjectDialog
          key={`${projectDraft.suggestionId}-${projectDraft.key}`}
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setProjectDraft(null);
            }
          }}
          creator={{
            name: viewer?.name ?? "You",
            imageUrl: viewer?.imageUrl ?? null,
          }}
          prefill={projectDraft.prefill}
          onCreated={handleProjectCreated}
        />
      ) : null}
    </>
  );
}
