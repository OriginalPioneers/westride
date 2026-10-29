"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import {
  ChatComposer,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
} from "@astryxdesign/core/Chat";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import { ChallengeDialog } from "./achievements/challenge-dialog";
import { getMuseCompanionState, askMuseCompanion } from "./companion-actions";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribeMotion = (callback: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

type CompanionState = Awaited<ReturnType<typeof getMuseCompanionState>>;
type Message = {
  role: "user" | "assistant";
  text: string;
  action?: "next" | "ideas" | "academy" | "achievements" | "none";
};
const tour = [
  {
    title: "Tell Muse your goal",
    text: "Start small: “I want to make a game for my friends.” You can chat naturally. You don’t need a perfect prompt.",
    hint: "Try naming a goal and who it’s for.",
  },
  {
    title: "Build on the conversation",
    text: "Muse suggests one small step. Ask “Why?” or “Can you make that simpler?” You can correct it or try a different direction.",
    hint: "Suggestions can be imperfect. Your judgment matters.",
  },
  {
    title: "You choose what happens",
    text: "A suggestion can come with a button to a challenge or Idea Studio. Muse waits for you to click; opening this sheet doesn’t send a message or change your work.",
    hint: "Challenge feedback is available when you choose to ask for it.",
  },
];

export function MuseDock({ viewerId }: { viewerId: string | null }) {
  const pathname = usePathname();
  const reduceMotion = useSyncExternalStore(
    subscribeMotion,
    reducedMotion,
    () => true,
  );
  const opener = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [state, setState] = useState<CompanionState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();
  const [challengeOpen, setChallengeOpen] = useState(false);
  const tourKey = `westride.muse-tour.v1.${viewerId ?? "guest"}`;

  const load = useCallback(() => {
    setLoadError("");
    startLoading(async () => {
      try {
        setState(await getMuseCompanionState());
      } catch {
        setLoadError(
          "Your next step couldn’t load. You can retry or open Idea Studio.",
        );
      }
    });
  }, [startLoading]);
  const show = useCallback(() => {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOpen(true);
    try {
      setTourStep(localStorage.getItem(tourKey) ? null : 0);
    } catch {
      setTourStep(0);
    }
    load();
  }, [load, tourKey]);
  useEffect(() => {
    const topMuse = document.querySelector("[data-muse-top]");
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    const observer = topMuse
      ? new IntersectionObserver(
          ([entry]) => {
            clearTimeout(revealTimer);
            if (entry.intersectionRatio === 0)
              revealTimer = setTimeout(() => setScrolled(true), 150);
            else if (entry.intersectionRatio >= 0.15) setScrolled(false);
          },
          { threshold: [0, 0.15] },
        )
      : null;
    if (topMuse) observer?.observe(topMuse);
    const onScroll = (event: Event) => {
      if (topMuse) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("#astryx-app-shell-main") &&
        !target.closest("dialog") &&
        target.scrollHeight > target.clientHeight
      )
        setScrolled(target.scrollTop > 0);
    };
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("westride:open-muse", show);
    return () => {
      clearTimeout(revealTimer);
      observer?.disconnect();
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("westride:open-muse", show);
    };
  }, [show, pathname]);
  function finishTour() {
    try {
      localStorage.setItem(tourKey, "seen");
    } catch {
      /* The guide remains usable without storage. */
    }
    setTourStep(null);
  }
  function send(value: string) {
    if (sending) return;
    const text = value.trim();
    if (!text || text.length > 1200) {
      setError("Write a message of 1–1,200 characters.");
      return;
    }
    setError("");
    startSending(async () => {
      try {
        const result = await askMuseCompanion({
          message: text,
          history: messages.slice(-6).map(({ role, text }) => ({ role, text })),
        });
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        setMessages((current) => [
          ...current,
          { role: "user", text },
          { role: "assistant", text: result.reply, action: result.action },
        ]);
        setDraft("");
      } catch {
        setError("Muse couldn’t reply. Your message is still here; try again.");
      }
    });
  }
  function nextButton() {
    if (!state) return null;
    return (
      <Button
        label={state.next.label}
        variant="primary"
        href={state.userId ? state.next.href : signInPath}
        onClick={() => {
          setOpen(false);
          if (state.userId && state.next.challenge) setChallengeOpen(true);
        }}
      />
    );
  }
  function actionButton(action: Message["action"]) {
    if (action === "next") return nextButton();
    const destination =
      action === "ideas"
        ? ["Open Idea Studio", "/ideas"]
        : action === "academy"
          ? ["Explore Academy", "/academy"]
          : action === "achievements"
            ? ["View achievements", "/achievements"]
            : null;
    return destination ? (
      <Button
        label={destination[0]}
        href={destination[1]}
        variant="secondary"
        onClick={() => setOpen(false)}
      />
    ) : null;
  }
  return (
    <>
      <VStack
        gap={0}
        style={{
          position: "absolute",
          bottom: "100%",
          right: "var(--spacing-6)",
          width: "calc(var(--spacing-12) * 2)",
          height: "calc(var(--spacing-12) + var(--spacing-2))",
          overflow: "clip",
          contain: "paint",
          pointerEvents: scrolled ? "auto" : "none",
        }}
      >
        <IconButton
          ref={opener}
          label="Open Muse companion"
          tooltip="Chat with Muse · Find your next step"
          variant="ghost"
          onClick={show}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-hidden={!scrolled}
          tabIndex={scrolled ? 0 : -1}
          style={{
            transform: scrolled ? "translateY(0)" : "translateY(100%)",
            transition: reduceMotion
              ? "none"
              : "transform var(--duration-medium-min) var(--ease-standard)",
            position: "relative",
            flexShrink: 0,
            width: "calc(var(--spacing-12) * 2)",
            height: "calc(var(--spacing-12) + var(--spacing-2))",
            padding: 0,
            overflow: "hidden",
            borderRadius: "var(--radius-md)",
            backgroundColor: "transparent",
          }}
          icon={
            <Image
              src="/achievements/muse-companion.png"
              alt=""
              width={1086}
              height={1448}
              unoptimized
              style={{
                position: "absolute",
                top: "calc(-1 * var(--spacing-2))",
                left: 0,
                width: "100%",
                height: "auto",
                pointerEvents: "none",
              }}
            />
          }
        />
      </VStack>
      <BottomSheet
        isOpen={open}
        onOpenChange={setOpen}
        label="Muse companion"
        height="tall"
        purpose="form"
        finalFocusRef={returnFocus}
        padding={4}
      >
        <VStack
          gap={4}
          style={{
            maxWidth: "calc(var(--spacing-12) * 14)",
            marginInline: "auto",
          }}
        >
          <HStack gap={2} vAlign="center">
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={2}>A little help from Muse</Heading>
                <Text type="supporting">
                  Your AI learning companion. You choose the next step.
                </Text>
              </VStack>
            </StackItem>
            <IconButton
              label="Show Muse tour again"
              tooltip="Three tips for working with Muse"
              icon={<Icon icon={QuestionMarkCircleIcon} />}
              variant="ghost"
              onClick={() => setTourStep(0)}
            />
            <IconButton
              label="Close Muse"
              tooltip="Close; keep this conversation while you browse"
              icon={<Icon icon={XMarkIcon} />}
              variant="ghost"
              onClick={() => setOpen(false)}
            />
          </HStack>
          {tourStep !== null ? (
            <VStack gap={4}>
              <ProgressBar
                label="Meet your companion"
                value={tourStep + 1}
                max={tour.length}
                hasValueLabel
                formatValueLabel={(value, max) => `${value} of ${max}`}
              />
              <Heading level={3}>{tour[tourStep].title}</Heading>
              <Text>{tour[tourStep].text}</Text>
              <Text type="supporting">{tour[tourStep].hint}</Text>
              <HStack gap={2} wrap="wrap">
                <Button
                  label="Skip tour"
                  variant="ghost"
                  onClick={finishTour}
                />
                {tourStep > 0 ? (
                  <Button
                    label="Back"
                    variant="secondary"
                    onClick={() => setTourStep(tourStep - 1)}
                  />
                ) : null}
                <Button
                  label={
                    tourStep === tour.length - 1 ? "Let's try it" : "Next tip"
                  }
                  variant="primary"
                  onClick={() =>
                    tourStep === tour.length - 1
                      ? finishTour()
                      : setTourStep(tourStep + 1)
                  }
                />
              </HStack>
            </VStack>
          ) : (
            <>
              {loadError ? <Banner status="warning" title={loadError} /> : null}
              {loadError ? (
                <Button
                  label="Retry next step"
                  variant="secondary"
                  onClick={load}
                  isLoading={loading}
                />
              ) : null}
              <ChatMessageList align="top" density="compact" gap={4}>
                <ChatMessage sender="assistant">
                  <ChatMessageBubble name="Muse">
                    <VStack gap={3} hAlign="start">
                      <Text>
                        {loading
                          ? "Finding your next step…"
                          : state
                            ? `Ready when you are. ${state.next.title}. ${state.next.description}`
                            : "What would you like to learn or build? Tell me a small goal, and we’ll find a place to start."}
                      </Text>
                      {!loading ? nextButton() : null}
                    </VStack>
                  </ChatMessageBubble>
                </ChatMessage>
                {messages.map((message, index) => (
                  <ChatMessage key={index} sender={message.role}>
                    <ChatMessageBubble
                      name={message.role === "user" ? "You" : "Muse"}
                    >
                      <VStack gap={3} hAlign="start">
                        <Text>{message.text}</Text>
                        {actionButton(message.action)}
                      </VStack>
                    </ChatMessageBubble>
                  </ChatMessage>
                ))}
                {sending ? (
                  <ChatMessage sender="assistant">
                    <ChatMessageBubble name="Muse">
                      <Text>Muse is thinking about your message…</Text>
                    </ChatMessageBubble>
                  </ChatMessage>
                ) : null}
              </ChatMessageList>
              {!messages.length && viewerId ? (
                <HStack gap={2} wrap="wrap">
                  <Button
                    label="Help me get started"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setDraft(
                        "I’m new to AI. What is one small thing I can try?",
                      )
                    }
                  />
                  <Button
                    label="Help me shape an idea"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setDraft(
                        "I have an idea, but I’m not sure how to explain who it helps. Can you help?",
                      )
                    }
                  />
                </HStack>
              ) : null}
              {viewerId ? (
                <>
                  <ChatComposer
                    value={draft}
                    onChange={setDraft}
                    onSubmit={send}
                    isDisabled={sending}
                    placeholder="Tell Muse what you want to learn or build…"
                    elevation="none"
                    status={
                      error ? { type: "error", message: error } : undefined
                    }
                    footerActions={
                      <Text type="supporting" size="xsm">
                        {sending
                          ? "Waiting for Muse…"
                          : "Start with a goal. You can ask follow-up questions."}
                      </Text>
                    }
                  />
                  <Text type="supporting" size="xsm">
                    Only Send asks AI. Suggestions and shortcuts wait for your
                    click. This chat stays here while you browse; refreshing
                    starts a new conversation.
                  </Text>
                </>
              ) : (
                <Button
                  label="Sign in to chat with Muse"
                  href={signInPath}
                  variant="primary"
                />
              )}
              <HStack gap={2} wrap="wrap">
                <Button
                  label="Idea Studio"
                  href="/ideas"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                />
                <Button
                  label="My achievements"
                  href="/achievements"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                />
              </HStack>
            </>
          )}
        </VStack>
      </BottomSheet>
      {challengeOpen && state?.next.challenge && state.userId ? (
        <ChallengeDialog
          slug={state.next.challenge.slug}
          viewerId={state.userId}
          initialInterest={state.next.challenge.interest}
          initialDepth={state.next.challenge.depth}
          initialAttempt={state.attempt}
          onClose={() => {
            setChallengeOpen(false);
            window.dispatchEvent(new Event("westride:achievements"));
            returnFocus.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}
