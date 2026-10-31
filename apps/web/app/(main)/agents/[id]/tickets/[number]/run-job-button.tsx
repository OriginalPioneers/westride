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
import { TextArea } from "@astryxdesign/core/TextArea";
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
  isDisabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isStarting, startStarting] = useTransition();
  const [instructions, setInstructions] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [needs, setNeeds] = useState<"meta" | "github" | null>(hasMetaConnection ? null : "meta");

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
          setNeeds(result.needsConnection ? "meta" : result.needsGithub ? "github" : null);
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
                      ? `The agent clones ${repoFullName} into a disposable Vercel Sandbox, works the ticket on a new branch with ${model}, and opens a pull request when it is done.`
                      : `The agent answers the ticket with ${model} and web search, and leaves the write-up on the ticket.`}{" "}
                    Your own Meta key pays for the model; nothing runs on your machine.
                  </Text>
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
                  <TextArea
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
                    isDisabled={needs === "meta"}
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
