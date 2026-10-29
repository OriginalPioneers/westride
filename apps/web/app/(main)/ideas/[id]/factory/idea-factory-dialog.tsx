"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import {
  Layout,
  LayoutContent,
  LayoutPanel,
} from "@astryxdesign/core/Layout";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Cog6ToothIcon, LinkIcon } from "@heroicons/react/24/outline";
import type { IdeaFactoryFinding, IdeaFactoryMessage, IdeaType } from "@westride/db";
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
import {
  forgetBrowserMuseCredential,
  readFactoryPreferences,
  writeFactoryPreferences,
  type FactoryPreferences,
} from "@/lib/idea-factory/credentials";
import { DEFAULT_MUSE_MODEL, getMuseModel } from "@/lib/idea-factory/pricing";
import type { MetaConnectionSummary } from "@/lib/meta/connection";
import { disconnectMeta } from "../../../meta-actions";
import {
  loadFactory,
  runEvaluationAgent,
  sendAgentMessage,
  startEvaluation,
  synthesizeEvaluation,
  type FactoryData,
} from "./actions";
import { ActivityPanel } from "./activity-panel";
import { AgentRail, viewKey, type FactoryView } from "./agent-rail";
import { AgentThread } from "./agent-thread";
import { ConnectPanel } from "./connect-panel";
import { EvaluationPanel } from "./evaluation-panel";

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

  // First visit without a Meta connection lands on the connect screen.
  useEffect(() => {
    if (data && !data.meta && !hasChosenView) {
      setView({ kind: "connect" });
    }
  }, [data, hasChosenView]);

  const isConnected = meta !== null;
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

  async function handleSend(agentSlug: string, content: string) {
    if (sendingSlugs.has(agentSlug)) {
      return;
    }
    setThreadError(agentSlug, null);
    setSendingSlugs((current) => new Set(current).add(agentSlug));

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

    try {
      const result = await sendAgentMessage({
        ideaId: idea.id,
        agentSlug,
        content,
        model: preferences.model,
        webSearch: preferences.webSearch,
      });

      if (result.status === "ok") {
        replaceMessage(agentSlug, optimisticId, result.userMessage);
        appendMessage(agentSlug, result.agentMessage, result.threadId);
        recordRequest(result.request);
      } else {
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
          <Spinner size="lg" label="Opening the Idea Factory…" />
        </VStack>
      );
    }

    if (view.kind === "connect") {
      return (
        <VStack padding={6} hAlign="center">
          <ConnectPanel
            canConnectMeta={data.canConnectMeta}
            canConnectMetaAccount={data.canConnectMetaAccount}
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
              onStart={(slugs) => void handleEvaluate(slugs)}
              onAskCoach={askCoach}
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
          members={data.members}
          isConnected={isConnected}
          isSending={sendingSlugs.has(agent.slug)}
          error={threadErrors[agent.slug] ?? null}
          onSend={(content) => void handleSend(agent.slug, content)}
        />
      </VStack>
    );
  }

  const isChat = view.kind === "agent";

  return (
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
          <DialogHeader
            title="Idea Factory"
            subtitle={idea.name}
            hasDivider
            onOpenChange={onOpenChange}
            endContent={
              isConnected ? (
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Badge variant="success" label="Connected" />
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
        }
        start={
          <LayoutPanel width={RAIL_WIDTH} hasDivider padding={3} label="Advisory team">
            <AgentRail
              ideaType={idea.type}
              view={view}
              onSelect={chooseView}
              busyAgentSlugs={sendingSlugs}
              isEvaluationRunning={isEvaluating}
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
  );
}
