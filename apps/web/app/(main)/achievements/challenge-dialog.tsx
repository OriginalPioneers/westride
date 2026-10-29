"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Stepper, Step } from "@astryxdesign/core/Stepper";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import {
  challengeCatalog,
  interests,
  isChangedAnswer,
  type Interest,
  type Depth,
} from "@westride/db/challenges";
import type { LearningAttempt } from "@westride/db/learning";
import {
  startChallenge,
  saveChallengeAnswer,
  getChallengeFeedback,
  reviseChallenge,
  completeChallenge,
  type ChallengeResult,
} from "./actions";
export function ChallengeDialog({
  slug: initialSlug,
  viewerId,
  initialInterest = "games",
  initialDepth = "simple",
  initialAttempt,
  onClose,
}: {
  slug: string;
  viewerId: string;
  initialInterest?: Interest;
  initialDepth?: Depth;
  initialAttempt?: LearningAttempt;
  onClose: () => void;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug);
  const [interest, setInterest] = useState<Interest>(initialInterest);
  const [depth, setDepth] = useState<Depth>(initialDepth);
  const [attempt, setAttempt] = useState<LearningAttempt | null>(
    initialAttempt ?? null,
  );
  const [draft] = useState(() => {
    const saved = {
      answer: initialAttempt?.answer ?? "",
      revision: initialAttempt?.revision ?? "",
    };
    if (!initialAttempt || typeof window === "undefined") return saved;
    try {
      const local = JSON.parse(
        sessionStorage.getItem(
          `westride.challenge.${viewerId}.${initialAttempt.id}`,
        ) ?? "null",
      );
      if (
        local &&
        typeof local.answer === "string" &&
        typeof local.revision === "string"
      )
        return {
          answer: local.answer as string,
          revision: local.revision as string,
        };
    } catch {
      /* Use the saved server answer when local storage is unavailable. */
    }
    return saved;
  });
  const [answer, setAnswer] = useState(
    initialAttempt?.feedback || initialAttempt?.completedAt
      ? initialAttempt.answer
      : draft.answer,
  );
  const [revision, setRevision] = useState(draft.revision);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const draftKey = (id: string) => `westride.challenge.${viewerId}.${id}`;
  function persistDraft(nextAnswer: string, nextRevision: string) {
    if (!attempt) return;
    try {
      sessionStorage.setItem(
        draftKey(attempt.id),
        JSON.stringify({ answer: nextAnswer, revision: nextRevision }),
      );
    } catch {
      /* Saving on the server remains available. */
    }
  }
  function perform(
    action: () => Promise<ChallengeResult>,
    restore = false,
    finish = false,
  ) {
    setMessage("");
    start(async () => {
      try {
        const result = await action();
        if (result.status === "error") {
          setMessage(result.message);
          return;
        }
        setAttempt(result.attempt);
        let saved = {
          answer: result.attempt.answer,
          revision: result.attempt.revision,
        };
        if (restore) {
          try {
            const local = JSON.parse(
              sessionStorage.getItem(draftKey(result.attempt.id)) ?? "null",
            );
            if (
              local &&
              typeof local.answer === "string" &&
              typeof local.revision === "string"
            )
              saved = local;
          } catch {
            /* Ignore invalid local drafts. */
          }
        }
        setAnswer(
          result.attempt.feedback || result.attempt.completedAt
            ? result.attempt.answer
            : saved.answer,
        );
        setRevision(saved.revision);
        if (!restore)
          setMessage(
            result.attempt.completedAt
              ? "Challenge complete. Your progress is saved."
              : "Progress saved.",
          );
        router.refresh();
        if (finish) onClose();
      } catch {
        setMessage(
          "Couldn't reach the app. Your answer is still here; please try again.",
        );
      }
    });
  }
  const step = !attempt
    ? 0
    : attempt.completedAt
      ? 3
      : attempt.feedback
        ? 2
        : 1;
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      purpose="form"
      width="min(42rem, 100%)"
      maxHeight="90dvh"
    >
      <Layout
        header={
          <DialogHeader
            title={
              attempt
                ? challengeCatalog.find((c) => c.slug === attempt.challengeSlug)
                    ?.name
                : "Try a 2-minute challenge"
            }
            onOpenChange={() => {
              if (!pending) onClose();
            }}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={6}>
              <Stepper activeStep={step} label="Challenge progress">
                <Step step={0} label="Choose" />
                <Step step={1} label="Try" />
                <Step step={2} label="Reflect" />
              </Stepper>
              {message ? (
                <Banner role="status" status="info" title={message} />
              ) : null}
              {!attempt ? (
                <VStack gap={4}>
                  <Text>
                    Small experiments, useful feedback, and room to try again.
                    These achievements celebrate practice.
                  </Text>
                  <Selector
                    label="Challenge"
                    value={slug}
                    onChange={setSlug}
                    options={challengeCatalog.map((c) => ({
                      value: c.slug,
                      label: c.name,
                    }))}
                  />
                  <Selector
                    label="What interests you?"
                    value={interest}
                    onChange={(value) => setInterest(value as Interest)}
                    options={Object.entries(interests).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <SegmentedControl
                    label="Explanation level"
                    value={depth}
                    onChange={(value) => setDepth(value as Depth)}
                  >
                    <SegmentedControlItem
                      value="simple"
                      label="Keep it simple"
                    />
                    <SegmentedControlItem value="deeper" label="Go deeper" />
                  </SegmentedControl>
                  <Text type="supporting">
                    Keep personal information out of your answer. Younger
                    learners can work with a grown-up. Sending an answer for
                    feedback shares it with Muse.
                  </Text>
                </VStack>
              ) : (
                <VStack gap={4}>
                  <Text>{attempt.prompt}</Text>
                  <TextArea
                    label="Your answer"
                    value={answer}
                    onChange={(value) => {
                      setAnswer(value);
                      persistDraft(value, revision);
                    }}
                    rows={5}
                    maxLength={1200}
                    isReadOnly={Boolean(
                      attempt.feedback || attempt.completedAt,
                    )}
                    isDisabled={pending}
                  />
                  {attempt.feedback ? (
                    <VStack gap={3}>
                      <Heading level={3}>Muse noticed</Heading>
                      <Text>{attempt.feedback.observation}</Text>
                      <Heading level={3}>Try one improvement</Heading>
                      <Text>{attempt.feedback.suggestion}</Text>
                      <TextArea
                        label="Your revised answer (optional)"
                        value={revision}
                        onChange={(value) => {
                          setRevision(value);
                          persistDraft(answer, value);
                        }}
                        rows={5}
                        maxLength={1200}
                        isDisabled={pending}
                      />
                      <Button
                        label="Save revision"
                        variant="secondary"
                        isDisabled={
                          pending ||
                          !isChangedAnswer(attempt.answer, revision) ||
                          revision === attempt.revision ||
                          revision.length > 1200
                        }
                        onClick={() =>
                          perform(() =>
                            reviseChallenge({
                              id: attempt.id,
                              answer: revision,
                            }),
                          )
                        }
                      />
                    </VStack>
                  ) : (
                    <HStack gap={2} wrap="wrap">
                      {!attempt.completedAt ? (
                        <Button
                          label="Save answer"
                          variant="secondary"
                          isDisabled={
                            pending || !answer.trim() || answer.length > 1200
                          }
                          onClick={() =>
                            perform(() =>
                              saveChallengeAnswer({ id: attempt.id, answer }),
                            )
                          }
                        />
                      ) : null}
                      <Button
                        label="Get Muse feedback"
                        variant="primary"
                        isLoading={pending}
                        isDisabled={
                          pending || !answer.trim() || answer.length > 1200
                        }
                        onClick={() =>
                          perform(() =>
                            getChallengeFeedback({ id: attempt.id, answer }),
                          )
                        }
                      />
                    </HStack>
                  )}
                  <Text type="supporting">
                    You earn progress by trying. Feedback is optional. Saved
                    answers resume when you reopen the same challenge and
                    interest.
                  </Text>
                </VStack>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end" wrap="wrap">
              <Button
                label="Close"
                variant="secondary"
                isDisabled={pending}
                onClick={onClose}
              />
              {!attempt ? (
                <Button
                  label="Start challenge"
                  variant="primary"
                  isLoading={pending}
                  onClick={() =>
                    perform(
                      () => startChallenge({ slug, interest, depth }),
                      true,
                    )
                  }
                />
              ) : attempt.completedAt ? (
                <Button
                  label="Choose another"
                  variant="primary"
                  isDisabled={pending}
                  onClick={() => {
                    setAttempt(null);
                    setMessage("");
                    setSlug(
                      challengeCatalog[
                        (challengeCatalog.findIndex((c) => c.slug === slug) +
                          1) %
                          challengeCatalog.length
                      ].slug,
                    );
                  }}
                />
              ) : (
                <Button
                  label="Finish challenge"
                  variant="primary"
                  isDisabled={pending || !answer.trim() || answer.length > 1200}
                  onClick={() =>
                    perform(
                      async () => {
                        const saved =
                          attempt.feedback &&
                          revision.trim() &&
                          isChangedAnswer(attempt.answer, revision)
                            ? await reviseChallenge({
                                id: attempt.id,
                                answer: revision,
                              })
                            : await saveChallengeAnswer({
                                id: attempt.id,
                                answer,
                              });
                        return saved.status === "ok"
                          ? completeChallenge(attempt.id)
                          : saved;
                      },
                      false,
                      true,
                    )
                  }
                />
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
