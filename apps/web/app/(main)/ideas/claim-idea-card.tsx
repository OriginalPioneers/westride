"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VoiceTextArea } from "../voice-text-area";
import { CodeBracketIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import { MAX_CLAIM_MESSAGE } from "@/lib/claims/limits";
import { claimIdeaWithGithub, requestIdeaClaim } from "./claim-actions";

export type ClaimRepo = { fullName: string; htmlUrl: string };

export type ClaimIdeaCardProps = {
  ideaId: string;
  /** The repository the idea was imported from, if it is still linked. */
  repo: ClaimRepo | null;
  isSignedIn: boolean;
  /** Whether the viewer has GitHub connected, so the check can run at once. */
  hasGithubConnection: boolean;
  /** Whether the viewer already has an open request for this idea. */
  hasPendingRequest: boolean;
  /** Whether the team can receive requests (email is configured). */
  canRequest: boolean;
  /** Where to come back to after connecting GitHub. */
  returnTo: string;
  /** Adjusts the copy: the idea page, or the project built from it. */
  surface: "idea" | "project";
};

const DIALOG_HEIGHT = "min(calc(100dvh - (2 * var(--spacing-4))), 560px)";

function connectHref(returnTo: string): string {
  return `/integrations/github/connect?returnTo=${encodeURIComponent(returnTo)}`;
}

function installHref(returnTo: string): string {
  return `/integrations/github/connect?intent=install&returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * Shown on imported ideas and projects until someone becomes their founder.
 * Maintainers prove it through GitHub; anyone else asks the team.
 */
export function ClaimIdeaCard(props: ClaimIdeaCardProps) {
  const { ideaId, repo, isSignedIn, hasGithubConnection, hasPendingRequest, canRequest } = props;
  const router = useRouter();
  const [isClaiming, startClaiming] = useTransition();
  const [notice, setNotice] = useState<{
    status: "info" | "error" | "success";
    title: string;
    showInstall?: boolean;
  } | null>(null);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requested, setRequested] = useState(hasPendingRequest);

  const what = props.surface === "idea" ? "idea" : "project";
  const both = props.surface === "idea" ? "this idea and its project" : "this project and its idea";

  function claim() {
    setNotice(null);
    startClaiming(async () => {
      const result = await claimIdeaWithGithub(ideaId);
      switch (result.status) {
        case "claimed":
          setNotice({ status: "success", title: `You are now the founder of ${both}.` });
          router.refresh();
          return;
        case "needs-connection":
          router.push(connectHref(props.returnTo));
          return;
        case "not-eligible":
          setNotice({ status: "info", title: result.message, showInstall: true });
          return;
        case "error":
          setNotice({ status: "error", title: result.message });
          return;
      }
    });
  }

  return (
    <>
      <Card variant="muted" padding={5}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2} accessibilityLevel={2}>
              Nobody has claimed this {what} yet
            </Heading>
            <Text type="supporting">
              It was imported from{" "}
              {repo ? (
                <Link href={repo.htmlUrl} isExternalLink>
                  {repo.fullName}
                </Link>
              ) : (
                "GitHub"
              )}{" "}
              without a team. If you maintain the repository, claim {both}: you
              become the founder and the owner, and can edit, plan, and run agents
              on it.
            </Text>
          </VStack>

          {notice ? <Banner status={notice.status} title={notice.title} /> : null}
          {notice?.showInstall && isSignedIn ? (
            <Text type="supporting">
              <Link href={installHref(props.returnTo)} isExternalLink>
                Install WeStride on the repository
              </Link>{" "}
              so GitHub can show your admin access, then try again.
            </Text>
          ) : null}

          {!isSignedIn ? (
            <HStack gap={2} wrap="wrap">
              <Button label="Sign in to claim" variant="primary" href={signInPath} />
            </HStack>
          ) : requested ? (
            <Banner
              status="info"
              title="Your request is waiting for review"
              description="The WeStride team will look at it and email you either way."
            />
          ) : (
            <HStack gap={2} wrap="wrap" vAlign="center">
              {repo ? (
                hasGithubConnection ? (
                  <Button
                    label="Claim with GitHub"
                    variant="primary"
                    icon={<Icon icon={CodeBracketIcon} color="inherit" />}
                    isLoading={isClaiming}
                    onClick={claim}
                  />
                ) : (
                  <Button
                    label="Connect GitHub to claim"
                    variant="primary"
                    icon={<Icon icon={CodeBracketIcon} color="inherit" />}
                    href={connectHref(props.returnTo)}
                  />
                )
              ) : null}
              {canRequest ? (
                <Button
                  label="Request to claim"
                  variant={repo ? "secondary" : "primary"}
                  icon={<Icon icon={EnvelopeIcon} color="inherit" />}
                  isDisabled={isClaiming}
                  onClick={() => setIsRequestOpen(true)}
                />
              ) : null}
              {repo ? (
                <Text type="supporting">
                  GitHub confirms owners and admins of {repo.fullName} at once.
                  {canRequest ? " Anyone else can ask the team." : ""}
                </Text>
              ) : null}
            </HStack>
          )}
        </VStack>
      </Card>

      {isRequestOpen ? (
        <RequestClaimDialog
          ideaId={ideaId}
          repo={repo}
          isOpen={isRequestOpen}
          onOpenChange={setIsRequestOpen}
          onRequested={() => {
            setNotice(null);
            setRequested(true);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function RequestClaimDialog({
  ideaId,
  repo,
  isOpen,
  onOpenChange,
  onRequested,
}: {
  ideaId: string;
  repo: ClaimRepo | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onRequested: () => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next && isSending) {
      return;
    }
    onOpenChange(next);
  }

  function send() {
    if (message.length > MAX_CLAIM_MESSAGE) {
      setError(`Keep your message under ${MAX_CLAIM_MESSAGE} characters.`);
      return;
    }
    setError(null);
    startSending(async () => {
      const result = await requestIdeaClaim(ideaId, message);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      onOpenChange(false);
      onRequested();
    });
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      purpose="form"
      width={560}
      maxHeight={DIALOG_HEIGHT}
    >
      <Layout
        height="fill"
        header={
          <DialogHeader title="Request to claim" hasDivider onOpenChange={handleOpenChange} />
        }
        content={
          <LayoutContent>
            <VStack gap={5}>
              {error ? <Banner status="error" title={error} /> : null}
              <Text type="supporting">
                The WeStride team reviews requests by hand. Say how you are
                connected to {repo ? repo.fullName : "this project"}: a maintainer,
                a contributor, or the person who wants to carry it forward.
                They will email you with the decision.
              </Text>
              <VoiceTextArea
                label="Your message"
                value={message}
                onChange={(value) => {
                  setMessage(value);
                  setError(null);
                }}
                rows={6}
                maxLength={MAX_CLAIM_MESSAGE}
                placeholder="I maintain this project under a different GitHub account…"
                isOptional
                isDisabled={isSending}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <Button
                label="Cancel"
                variant="secondary"
                isDisabled={isSending}
                onClick={() => handleOpenChange(false)}
              />
              <StackItem size="fill" />
              <Button label="Send request" variant="primary" isLoading={isSending} onClick={send} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
