"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TICKET_PRIORITY_LABELS, ticketsPath } from "@/lib/build/labels";
import type { BacklogDraft, PlanMode, RankingDraft } from "@/lib/build/planning";
import { MAX_PLAN_NOTES } from "@/lib/build/schema";
import { DEFAULT_MUSE_MODEL, MUSE_MODELS, getMuseModel } from "@/lib/idea-factory/pricing";
import { TicketPriorityBadge } from "../project-badges";
import { acceptBacklogPlan, acceptRankingPlan, planWithMuse } from "../planning-actions";

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";

const MODE_OPTIONS: { value: PlanMode; label: string; description: string }[] = [
  {
    value: "backlog",
    label: "Draft a backlog",
    description: "Milestones and tickets from the project brief, the idea, and the README.",
  },
  {
    value: "prioritize",
    label: "Prioritise open tickets",
    description: "Rank what is already on the board and suggest a priority for each.",
  },
];

type Step =
  | { kind: "setup" }
  | { kind: "backlog"; draft: BacklogDraft; museRequestId: string | null }
  | { kind: "ranking"; draft: RankingDraft; museRequestId: string | null };

export function PlanDialog({
  isOpen,
  onOpenChange,
  projectId,
  hasMetaConnection,
  openTicketCount,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projectId: string;
  hasMetaConnection: boolean;
  openTicketCount: number;
}) {
  const router = useRouter();
  const [isWorking, startWorking] = useTransition();
  const [mode, setMode] = useState<PlanMode>(openTicketCount > 0 ? "prioritize" : "backlog");
  const [model, setModel] = useState<string>(DEFAULT_MUSE_MODEL);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<Step>({ kind: "setup" });
  const [message, setMessage] = useState<string | null>(null);
  const [needsConnection, setNeedsConnection] = useState(!hasMetaConnection);
  const [keptMilestones, setKeptMilestones] = useState<boolean[]>([]);
  const [keptTickets, setKeptTickets] = useState<boolean[]>([]);

  const modelOption = getMuseModel(model);

  function handleOpenChange(next: boolean) {
    if (!next && isWorking) {
      return;
    }
    onOpenChange(next);
  }

  function ask() {
    setMessage(null);
    startWorking(async () => {
      try {
        const result = await planWithMuse(projectId, { mode, notes, model });
        if (result.status === "error") {
          setMessage(result.message);
          setNeedsConnection(Boolean(result.needsConnection));
          return;
        }
        if (result.mode === "backlog") {
          setKeptMilestones(result.draft.milestones.map(() => true));
          setKeptTickets(result.draft.tickets.map(() => true));
          setStep({ kind: "backlog", draft: result.draft, museRequestId: result.museRequestId });
        } else {
          setStep({ kind: "ranking", draft: result.draft, museRequestId: result.museRequestId });
        }
      } catch (error) {
        console.error("Planning failed", error);
        setMessage("Muse could not be reached. Try again.");
      }
    });
  }

  function accept() {
    if (step.kind === "setup") {
      return;
    }
    setMessage(null);
    startWorking(async () => {
      try {
        if (step.kind === "backlog") {
          const milestones = step.draft.milestones.filter((_, i) => keptMilestones[i]);
          const tickets = step.draft.tickets.filter((_, i) => keptTickets[i]);
          const result = await acceptBacklogPlan(projectId, {
            museRequestId: step.museRequestId,
            milestones,
            tickets,
          });
          if (result.status === "error") {
            setMessage(result.message);
            return;
          }
        } else {
          const result = await acceptRankingPlan(projectId, {
            ranking: step.draft.ranking.map((entry) => ({
              ticketId: entry.ticketId,
              priority: entry.priority,
            })),
          });
          if (result.status === "error") {
            setMessage(result.message);
            return;
          }
        }
        onOpenChange(false);
        router.push(ticketsPath(projectId));
        router.refresh();
      } catch (error) {
        console.error("Accepting plan failed", error);
        setMessage("The plan could not be applied. Try again.");
      }
    });
  }

  const keptCount =
    step.kind === "backlog"
      ? keptMilestones.filter(Boolean).length + keptTickets.filter(Boolean).length
      : step.kind === "ranking"
        ? step.draft.ranking.length
        : 0;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      purpose="form"
      width={760}
      maxHeight={DIALOG_HEIGHT}
    >
      <Layout
        height="fill"
        header={
          <DialogHeader
            title={step.kind === "setup" ? "Plan with Muse" : "Review Muse's plan"}
            hasDivider
            onOpenChange={handleOpenChange}
          />
        }
        content={
          <LayoutContent>
            {step.kind === "setup" ? (
              <FormLayout defaultOptionality="optional">
                {needsConnection ? (
                  <Banner
                    status="info"
                    title="Connect your Meta account first"
                    description="Muse runs on your own Meta API key. Connect it in Settings and come back here."
                    collapsible={false}
                  >
                    <Button label="Open settings" href="/settings" variant="secondary" />
                  </Banner>
                ) : null}
                {message ? <Banner status="error" title={message} /> : null}
                <Selector
                  label="What should Muse do?"
                  options={MODE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={mode}
                  onChange={(value) => {
                    if (value === "backlog" || value === "prioritize") {
                      setMode(value);
                    }
                  }}
                  description={MODE_OPTIONS.find((option) => option.value === mode)?.description}
                />
                {mode === "prioritize" && openTicketCount === 0 ? (
                  <Banner
                    status="warning"
                    title="Nothing to prioritise yet"
                    description="Draft a backlog first, or add tickets by hand."
                  />
                ) : null}
                <Selector
                  label="Muse model"
                  options={MUSE_MODELS.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  value={model}
                  onChange={(value) => {
                    if (value) {
                      setModel(value);
                    }
                  }}
                  description={modelOption?.description}
                />
                {modelOption?.isContributor ? (
                  <Banner
                    status="warning"
                    title="Contributor mode shares your content with Meta"
                    description="The project brief and tickets sent to a Contributor model may be used to train future Meta models."
                  />
                ) : null}
                <TextArea
                  label="Anything Muse should know?"
                  description="Constraints, the stack you have settled on, what to leave out, how big tickets should be."
                  value={notes}
                  onChange={setNotes}
                  rows={4}
                  maxLength={MAX_PLAN_NOTES}
                />
              </FormLayout>
            ) : step.kind === "backlog" ? (
              <VStack gap={6}>
                {message ? <Banner status="error" title={message} /> : null}
                <Text>{step.draft.summary}</Text>
                {step.draft.milestones.length > 0 ? (
                  <VStack gap={3}>
                    <Heading level={2}>Milestones</Heading>
                    {step.draft.milestones.map((milestone, index) => (
                      <CheckboxInput
                        key={`${milestone.title}-${index}`}
                        label={milestone.title}
                        description={[
                          milestone.targetDate ? `Target ${milestone.targetDate}` : null,
                          milestone.description || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        value={keptMilestones[index] ?? false}
                        onChange={(checked) =>
                          setKeptMilestones((current) =>
                            current.map((kept, i) => (i === index ? checked : kept)),
                          )
                        }
                      />
                    ))}
                  </VStack>
                ) : null}
                <VStack gap={3}>
                  <HStack gap={3} vAlign="center">
                    <StackItem size="fill">
                      <Heading level={2}>Tickets</Heading>
                    </StackItem>
                    <Button
                      label={keptTickets.every(Boolean) ? "Clear all" : "Keep all"}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const next = !keptTickets.every(Boolean);
                        setKeptTickets(keptTickets.map(() => next));
                      }}
                    />
                  </HStack>
                  {step.draft.tickets.length === 0 ? (
                    <Text type="supporting">Muse did not suggest any tickets.</Text>
                  ) : null}
                  {step.draft.tickets.map((ticket, index) => (
                    <VStack key={`${ticket.title}-${index}`} gap={1}>
                      <HStack gap={2} vAlign="center" wrap="wrap">
                        <StackItem size="fill">
                          <CheckboxInput
                            label={ticket.title}
                            description={ticket.milestone ?? undefined}
                            value={keptTickets[index] ?? false}
                            onChange={(checked) =>
                              setKeptTickets((current) =>
                                current.map((kept, i) => (i === index ? checked : kept)),
                              )
                            }
                          />
                        </StackItem>
                        <TicketPriorityBadge priority={ticket.priority} />
                      </HStack>
                      {ticket.description ? (
                        <Collapsible trigger="Brief" defaultIsOpen={false}>
                          <Markdown density="compact" headingLevelStart={4} contentWidth="100%">
                            {ticket.description}
                          </Markdown>
                        </Collapsible>
                      ) : null}
                    </VStack>
                  ))}
                </VStack>
              </VStack>
            ) : (
              <VStack gap={6}>
                {message ? <Banner status="error" title={message} /> : null}
                <Text>{step.draft.summary}</Text>
                <VStack gap={3}>
                  <Heading level={2}>Suggested order</Heading>
                  {step.draft.ranking.map((entry, index) => (
                    <HStack key={entry.ticketId} gap={3} vAlign="start" wrap="wrap">
                      <Text type="supporting" hasTabularNumbers>
                        {index + 1}.
                      </Text>
                      <StackItem size="fill">
                        <VStack gap={1}>
                          <HStack gap={2} vAlign="center" wrap="wrap">
                            <Text type="supporting" hasTabularNumbers>
                              {entry.key}
                            </Text>
                            <Text>{entry.title}</Text>
                          </HStack>
                          <Text type="supporting">{entry.reason}</Text>
                        </VStack>
                      </StackItem>
                      <TicketPriorityBadge priority={entry.priority} />
                    </HStack>
                  ))}
                </VStack>
                <Text type="supporting">
                  Accepting sets each ticket&rsquo;s priority to{" "}
                  {Object.values(TICKET_PRIORITY_LABELS).join("/").toLowerCase()} as shown and
                  reorders the backlog to match.
                </Text>
              </VStack>
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              {step.kind === "setup" ? (
                <Button
                  label="Cancel"
                  variant="secondary"
                  isDisabled={isWorking}
                  onClick={() => handleOpenChange(false)}
                />
              ) : (
                <Button
                  label="Back"
                  variant="secondary"
                  isDisabled={isWorking}
                  onClick={() => setStep({ kind: "setup" })}
                />
              )}
              <StackItem size="fill" />
              {step.kind === "setup" ? (
                <Button
                  label="Ask Muse"
                  variant="primary"
                  isLoading={isWorking}
                  isDisabled={needsConnection || (mode === "prioritize" && openTicketCount === 0)}
                  onClick={ask}
                />
              ) : (
                <Button
                  label={
                    step.kind === "backlog"
                      ? `Add ${keptCount} to the board`
                      : "Apply this order"
                  }
                  variant="primary"
                  isLoading={isWorking}
                  isDisabled={keptCount === 0}
                  onClick={accept}
                />
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
