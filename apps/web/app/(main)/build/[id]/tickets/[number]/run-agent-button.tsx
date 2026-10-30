"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { BoltIcon } from "@heroicons/react/20/solid";
import type { ProjectRepo } from "@westride/db";
import {
  DEFAULT_AGENT_STEPS,
  MAX_AGENT_STEPS,
  MAX_PLAN_NOTES,
  MIN_AGENT_STEPS,
} from "@/lib/build/schema";
import { DEFAULT_MUSE_MODEL, MUSE_MODELS, getMuseModel } from "@/lib/idea-factory/pricing";
import { startRunAction } from "../../../run-actions";

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";

export function RunAgentButton({
  projectId,
  ticketId,
  ticketRepoId,
  repos,
  hasMetaConnection,
  isConfigured,
  isDisabled,
  disabledReason,
}: {
  projectId: string;
  ticketId: string;
  ticketRepoId: string | null;
  repos: ProjectRepo[];
  hasMetaConnection: boolean;
  /** Whether this server can launch sandboxes at all. */
  isConfigured: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isStarting, startStarting] = useTransition();
  const [repoId, setRepoId] = useState<string>(
    ticketRepoId ?? repos.find((repo) => repo.isPrimary)?.id ?? repos[0]?.id ?? "",
  );
  const [model, setModel] = useState<string>(DEFAULT_MUSE_MODEL);
  const [maxSteps, setMaxSteps] = useState<number>(DEFAULT_AGENT_STEPS);
  const [instructions, setInstructions] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [needs, setNeeds] = useState<"meta" | "github" | null>(hasMetaConnection ? null : "meta");

  const modelOption = getMuseModel(model);
  const blocked = !isConfigured || repos.length === 0 || Boolean(isDisabled);
  const blockedReason = !isConfigured
    ? "Muse Code agents are not set up on this WeStride server."
    : repos.length === 0
      ? "Link a repository in Settings first."
      : disabledReason;

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
        const result = await startRunAction(projectId, ticketId, {
          repoId,
          model,
          maxSteps,
          instructions,
        });
        if (result.status === "error") {
          setMessage(result.message);
          setNeeds(result.needsConnection ? "meta" : result.needsGithub ? "github" : null);
          return;
        }
        setIsOpen(false);
        router.refresh();
      } catch (error) {
        console.error("Run start failed", error);
        setMessage("The agent could not be started. Try again.");
      }
    });
  }

  return (
    <>
      {blocked ? (
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Button
            label="Run with Muse Code"
            variant="primary"
            icon={<Icon icon={BoltIcon} size="sm" />}
            isDisabled
          />
          {blockedReason ? <Text type="supporting">{blockedReason}</Text> : null}
        </HStack>
      ) : (
        <Button
          label="Run with Muse Code"
          variant="primary"
          icon={<Icon icon={BoltIcon} size="sm" />}
          onClick={() => setIsOpen(true)}
        />
      )}
      {isOpen ? (
        <Dialog
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          purpose="form"
          width={640}
          maxHeight={DIALOG_HEIGHT}
        >
          <Layout
            height="fill"
            header={
              <DialogHeader
                title="Hand this ticket to Muse Code"
                hasDivider
                onOpenChange={handleOpenChange}
              />
            }
            content={
              <LayoutContent>
                <FormLayout defaultOptionality="optional">
                  <Text type="supporting">
                    A Muse Code agent clones the repository into a disposable Vercel Sandbox,
                    works the ticket on a new branch, and opens a pull request when it is done.
                    Your own Meta key pays for the model; nothing runs on your machine.
                  </Text>
                  {needs === "meta" ? (
                    <Banner
                      status="info"
                      title="Connect your Meta account first"
                      description="The agent runs on your Meta API key."
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
                  {repos.length > 1 ? (
                    <Selector
                      label="Repository"
                      options={repos.map((repo) => ({
                        value: repo.id,
                        label: `${repo.owner}/${repo.name}`,
                      }))}
                      value={repoId}
                      onChange={(value) => setRepoId(value)}
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
                      title="Contributor mode shares your code with Meta"
                      description="The repository contents the agent reads may be used to train future Meta models."
                    />
                  ) : null}
                  <NumberInput
                    label="Step budget"
                    description={`Model steps before the run stops. ${MIN_AGENT_STEPS}–${MAX_AGENT_STEPS}; a focused ticket usually needs under 100.`}
                    value={maxSteps}
                    onChange={(value) =>
                      setMaxSteps(Math.min(MAX_AGENT_STEPS, Math.max(MIN_AGENT_STEPS, Math.round(value))))
                    }
                    min={MIN_AGENT_STEPS}
                    max={MAX_AGENT_STEPS}
                    step={10}
                  />
                  <TextArea
                    label="Extra guidance"
                    description="Anything beyond the ticket: constraints, files to start from, what to avoid."
                    value={instructions}
                    onChange={setInstructions}
                    rows={4}
                    maxLength={MAX_PLAN_NOTES}
                  />
                </FormLayout>
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <HStack gap={2} vAlign="center">
                  <Button
                    label="Cancel"
                    variant="secondary"
                    isDisabled={isStarting}
                    onClick={() => handleOpenChange(false)}
                  />
                  <StackItem size="fill" />
                  <Button
                    label="Start the agent"
                    variant="primary"
                    isLoading={isStarting}
                    isDisabled={needs !== null || !repoId}
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
