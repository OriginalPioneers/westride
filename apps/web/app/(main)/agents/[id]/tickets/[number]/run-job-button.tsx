"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VoiceTextArea } from "../../../../voice-text-area";
import { BoltIcon } from "@heroicons/react/20/solid";
import { MAX_JOB_INSTRUCTIONS } from "@/lib/agents/schema";
import { runJobAction } from "../../../job-actions";

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";

export function RunJobButton({
  agentId,
  ticketId,
  agentName,
  model,
  runsCode,
  repoFullName,
  hasMetaConnection,
  hasVercelConnection,
  isDisabled,
  disabledReason,
}: {
  agentId: string;
  ticketId: string;
  agentName: string;
  model: string;
  runsCode: boolean;
  repoFullName: string | null;
  hasMetaConnection: boolean;
  /** Whether the viewer's Vercel account is connected with a team and project chosen. */
  hasVercelConnection: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isStarting, startStarting] = useTransition();
  const [instructions, setInstructions] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  // Only code jobs need a sandbox; reports run through the Model API alone.
  const [needs, setNeeds] = useState<"meta" | "github" | "vercel" | null>(
    !hasMetaConnection ? "meta" : runsCode && !hasVercelConnection ? "vercel" : null,
  );

  function handleOpenChange(next: boolean) {
    if (!next && isStarting) {
      return;
    }
    setIsOpen(next);
  }

  function start() {
    setMessage(null);
    startStarting(async () => {
      try {
        const result = await runJobAction(agentId, ticketId, { instructions });
        if (result.status === "error") {
          setMessage(result.message);
          setNeeds(
            result.needsConnection
              ? "meta"
              : result.needsVercel
                ? "vercel"
                : result.needsGithub
                  ? "github"
                  : null,
          );
          return;
        }
        setIsOpen(false);
        router.refresh();
      } catch (error) {
        console.error("Job start failed", error);
        setMessage("The job could not be started. Try again.");
      }
    });
  }

  return (
    <>
      {isDisabled ? (
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Button label="Run now" variant="primary" icon={<Icon icon={BoltIcon} size="sm" />} isDisabled />
          {disabledReason ? <Text type="supporting">{disabledReason}</Text> : null}
        </HStack>
      ) : (
        <Button label="Run now" variant="primary" icon={<Icon icon={BoltIcon} size="sm" />} onClick={() => setIsOpen(true)} />
      )}
      {isOpen ? (
        <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} purpose="form" width={640} maxHeight={DIALOG_HEIGHT}>
          <Layout
            height="fill"
            header={<DialogHeader title={`Run ${agentName} on this ticket`} hasDivider onOpenChange={handleOpenChange} />}
            content={
              <LayoutContent>
                <FormLayout defaultOptionality="optional">
                  <Text type="supporting">
                    {runsCode
                      ? `The agent clones ${repoFullName} into a disposable Vercel Sandbox on your own Vercel account, works the ticket on a new branch with ${model}, and opens a pull request when it is done. Your Meta key pays for the model and your Vercel plan for the sandbox; nothing runs on your machine.`
                      : `The agent answers the ticket with ${model} and web search, and leaves the write-up on the ticket. Your own Meta key pays for the model; nothing runs on your machine.`}
                  </Text>
                  {needs === "vercel" ? (
                    <Banner
                      status="info"
                      title="Connect your Vercel account first"
                      description={message ?? "The sandbox runs on your Vercel account, so Vercel bills you, not WeStride. Choose a team and project after connecting."}
                      collapsible={false}
                    >
                      <Button label="Open settings" href="/settings" variant="secondary" />
                    </Banner>
                  ) : null}
                  {needs === "meta" ? (
                    <Banner
                      status="info"
                      title="Connect your Meta account first"
                      description="The job runs on your Meta API key."
                      collapsible={false}
                    >
                      <Button label="Open settings" href="/settings" variant="secondary" />
                    </Banner>
                  ) : null}
                  {needs === "github" ? (
                    <Banner
                      status="info"
                      title="GitHub access is needed"
                      description="Connect GitHub and grant WeStride this repository. You need push rights."
                      collapsible={false}
                    >
                      <Button label="Open settings" href="/settings" variant="secondary" />
                    </Banner>
                  ) : null}
                  {message && !needs ? <Banner status="error" title={message} /> : null}
                  <VoiceTextArea
                    label="Extra guidance"
                    description="Anything beyond the ticket and the agent's standing instructions, for this run only."
                    value={instructions}
                    onChange={setInstructions}
                    rows={4}
                    maxLength={MAX_JOB_INSTRUCTIONS}
                  />
                </FormLayout>
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <HStack gap={2} vAlign="center">
                  <Button label="Cancel" variant="secondary" isDisabled={isStarting} onClick={() => handleOpenChange(false)} />
                  <StackItem size="fill" />
                  <Button
                    label="Start"
                    variant="primary"
                    icon={<Icon icon={BoltIcon} size="sm" />}
                    isLoading={isStarting}
                    isDisabled={needs === "meta" || needs === "vercel"}
                    onClick={start}
                  />
                </HStack>
              </LayoutFooter>
            }
          />
        </Dialog>
      ) : null}
    </>
  );
}
