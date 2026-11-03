"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VoiceTextArea } from "../../../../voice-text-area";
import { BoltIcon } from "@heroicons/react/20/solid";
import type { ComputeTarget, ProjectRepo } from "@westride/db";
import type { AgentConnection } from "@/lib/build/agent/start";
import {
  COMPUTE_TARGET_DESCRIPTIONS,
  COMPUTE_TARGET_LABELS,
  COMPUTE_TARGETS,
  DEVICE_META_KEY_OPTION,
  isDeviceTarget,
  localModelsOf,
  type ComputeAvailability,
  type ComputeDeviceOption,
} from "@/lib/build/compute-target";
import {
  DEFAULT_AGENT_STEPS,
  MAX_AGENT_STEPS,
  MAX_PLAN_NOTES,
  MIN_AGENT_STEPS,
} from "@/lib/build/schema";
import { DEFAULT_MUSE_MODEL, MUSE_MODELS, getMuseModel } from "@/lib/idea-factory/pricing";
import { startRunAction } from "../../../run-actions";

const DIALOG_HEIGHT = "calc(100dvh - (2 * var(--spacing-4)))";

/** The banner shown for each thing the member still has to connect, fund, or link. */
const NEEDS_BANNERS: Record<
  AgentConnection,
  { title: string; description: string; primary: { label: string; href: string }; secondary?: { label: string; href: string } }
> = {
  meta: {
    title: "Connect your Meta account, or add funds",
    description: "The agent needs a Meta API key: yours from Settings, or WeStride Cloud's from your balance.",
    primary: { label: "Open settings", href: "/settings" },
    secondary: { label: "WeStride Cloud", href: "/cloud" },
  },
  compute: {
    title: "Connect a Vercel or Modal account",
    description: "A 3rd-party sandbox runs on your own Vercel or Modal account, which bills you directly.",
    primary: { label: "Open settings", href: "/settings" },
    secondary: { label: "Use WeStride Cloud instead", href: "/cloud" },
  },
  cloud: {
    title: "Add funds to WeStride Cloud",
    description: "WeStride Cloud runs the sandbox and the model from your balance.",
    primary: { label: "WeStride Cloud", href: "/cloud" },
  },
  github: {
    title: "GitHub access is needed",
    description: "Connect GitHub and grant WeStride this repository. You need push rights.",
    primary: { label: "Open settings", href: "/settings" },
  },
  device: {
    title: "Link a computer",
    description:
      "Start the WeStride runner on your computer and link it from Supporting. It picks up runs while it is online.",
    primary: { label: "Open Supporting", href: "/supporting" },
  },
};

function availabilityOf(compute: ComputeAvailability, target: ComputeTarget) {
  switch (target) {
    case "WESTRIDE_CLOUD":
      return compute.cloud;
    case "LOCAL":
      return compute.local;
    case "SPONSORS":
      return compute.sponsors;
    case "THIRD_PARTY":
      return compute.thirdParty;
  }
}

function devicesFor(compute: ComputeAvailability, target: ComputeTarget): ComputeDeviceOption[] {
  return target === "LOCAL" ? compute.local.devices : target === "SPONSORS" ? compute.sponsors.devices : [];
}

export function RunAgentButton({
  projectId,
  ticketId,
  ticketRepoId,
  repos,
  compute,
  isConfigured,
  isDisabled,
  disabledReason,
}: {
  projectId: string;
  ticketId: string;
  ticketRepoId: string | null;
  repos: ProjectRepo[];
  /** Where the viewer's runs can go right now; null when the server cannot run agents. */
  compute: ComputeAvailability | null;
  /** Whether this server can run Muse Code agents at all: sandboxes or linked computers. */
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
  const [target, setTarget] = useState<ComputeTarget>(compute?.defaultTarget ?? "WESTRIDE_CLOUD");
  const [model, setModel] = useState<string>(DEFAULT_MUSE_MODEL);
  const [deviceModel, setDeviceModel] = useState<string | null>(null);
  const [maxSteps, setMaxSteps] = useState<number>(DEFAULT_AGENT_STEPS);
  const [instructions, setInstructions] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [needs, setNeeds] = useState<AgentConnection | null>(null);

  const repo = repos.find((candidate) => candidate.id === repoId) ?? null;
  const modelOption = getMuseModel(model);
  const onDevice = isDeviceTarget(target);

  // What the chosen computer(s) can run: their Meta key, if any, and their Ollama models.
  const deviceModelOptions = useMemo(() => {
    const devices = compute ? devicesFor(compute, target) : [];
    const options: { value: string; label: string }[] = [];
    if (devices.some((device) => device.hasMetaKey)) {
      options.push({
        value: DEVICE_META_KEY_OPTION,
        label: target === "LOCAL" ? "Meta key on the computer (Muse models)" : "Supporter's Meta key (Muse models)",
      });
    }
    for (const tag of localModelsOf(devices)) {
      options.push({ value: tag, label: `${tag} (Ollama)` });
    }
    return options;
  }, [compute, target]);
  const chosenDeviceModel =
    deviceModel && deviceModelOptions.some((option) => option.value === deviceModel)
      ? deviceModel
      : (deviceModelOptions[0]?.value ?? null);
  const usesLocalModel = onDevice && chosenDeviceModel !== null && chosenDeviceModel !== DEVICE_META_KEY_OPTION;

  // Reasons the chosen target cannot take this run, before asking the server.
  const targetAvailability = compute ? availabilityOf(compute, target) : null;
  const sponsorsPrivateRepo = target === "SPONSORS" && (repo?.isPrivate ?? false);
  const targetBlocked = compute
    ? !targetAvailability?.ready
      ? (targetAvailability?.reason ?? "This option is not available right now.")
      : sponsorsPrivateRepo
        ? "Supporters' computers only take public repositories; this one is private."
        : onDevice && chosenDeviceModel === null
          ? "The computer has neither a Meta key nor an Ollama model to run."
          : !onDevice && !compute.hasMuseAccess && target === "THIRD_PARTY"
            ? "Connect your Meta account in Settings so the model can run on your own key."
            : null
    : null;

  const blocked = !isConfigured || !compute || repos.length === 0 || Boolean(isDisabled);
  const blockedReason = !isConfigured || !compute
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

  function changeTarget(next: string) {
    if (COMPUTE_TARGETS.includes(next as ComputeTarget)) {
      setTarget(next as ComputeTarget);
      setNeeds(null);
      setMessage(null);
    }
  }

  function start() {
    setMessage(null);
    setNeeds(null);
    startStarting(async () => {
      try {
        const result = await startRunAction(projectId, ticketId, {
          repoId,
          model,
          maxSteps,
          instructions,
          computeTarget: target,
          localModel: usesLocalModel ? chosenDeviceModel : null,
        });
        if (result.status === "error") {
          setMessage(result.message);
          setNeeds(result.needs ?? (result.needsConnection ? "meta" : null));
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

  const needsBanner = needs ? NEEDS_BANNERS[needs] : null;

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
      {isOpen && compute ? (
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
                    A Muse Code agent clones the repository, works the ticket on a new branch, and
                    opens a pull request when it is done. Choose where the work runs.
                  </Text>
                  {needsBanner ? (
                    <Banner
                      status="info"
                      title={needsBanner.title}
                      description={message ?? needsBanner.description}
                      collapsible={false}
                    >
                      <Button label={needsBanner.primary.label} href={needsBanner.primary.href} variant="secondary" />
                      {needsBanner.secondary ? (
                        <Button label={needsBanner.secondary.label} href={needsBanner.secondary.href} variant="ghost" />
                      ) : null}
                    </Banner>
                  ) : null}
                  {message && !needs ? <Banner status="error" title={message} /> : null}
                  <RadioList
                    label="Run the compute on"
                    value={target}
                    onChange={changeTarget}
                    isDisabled={isStarting}
                  >
                    {COMPUTE_TARGETS.map((option) => {
                      const availability = availabilityOf(compute, option);
                      const extra =
                        option === "WESTRIDE_CLOUD" && compute.cloud.balanceLabel
                          ? ` Balance: ${compute.cloud.balanceLabel}.`
                          : option === "THIRD_PARTY" && compute.thirdParty.provider
                            ? ` Your ${compute.thirdParty.provider} account is connected.`
                            : option === "LOCAL" && compute.local.devices.length > 0
                              ? ` Online: ${compute.local.devices.map((device) => device.name).join(", ")}.`
                              : option === "SPONSORS" && compute.sponsors.devices.length > 0
                                ? ` ${compute.sponsors.devices.length} online.`
                                : "";
                      return (
                        <RadioListItem
                          key={option}
                          value={option}
                          align="first-line"
                          label={COMPUTE_TARGET_LABELS[option]}
                          description={
                            availability.ready
                              ? `${COMPUTE_TARGET_DESCRIPTIONS[option]}${extra}`
                              : `${COMPUTE_TARGET_DESCRIPTIONS[option]} ${availability.reason ?? ""}`
                          }
                          isDisabled={!availability.ready}
                        />
                      );
                    })}
                  </RadioList>
                  {targetBlocked ? <Banner status="warning" title={targetBlocked} /> : null}
                  {repos.length > 1 ? (
                    <Selector
                      label="Repository"
                      options={repos.map((candidate) => ({
                        value: candidate.id,
                        label: `${candidate.owner}/${candidate.name}${candidate.isPrivate ? " (private)" : ""}`,
                      }))}
                      value={repoId}
                      onChange={(value) => setRepoId(value)}
                    />
                  ) : null}
                  {onDevice && deviceModelOptions.length > 0 ? (
                    <Selector
                      label="Model on the computer"
                      description={
                        target === "LOCAL"
                          ? "An Ollama model your computer serves, or Muse models through the Meta key set on your runner."
                          : "What the supporter's runner offers: their Ollama models or Muse models through their Meta key."
                      }
                      options={deviceModelOptions}
                      value={chosenDeviceModel ?? ""}
                      onChange={(value) => {
                        if (value) {
                          setDeviceModel(value);
                        }
                      }}
                    />
                  ) : null}
                  {!usesLocalModel ? (
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
                  ) : null}
                  {!usesLocalModel && modelOption?.isContributor ? (
                    <Banner
                      status="warning"
                      title="Contributor mode shares your code with Meta"
                      description="The repository contents the agent reads may be used to train future Meta models."
                    />
                  ) : null}
                  {target === "LOCAL" && repo?.isPrivate ? (
                    <Text type="supporting">
                      This repository is private, so your computer receives a short-lived read-only
                      token for just this repository to clone it. WeStride pushes the branch and opens
                      the pull request; your computer never gets write access.
                    </Text>
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
                  <VoiceTextArea
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
                    label={onDevice ? "Queue the run" : "Start the agent"}
                    variant="primary"
                    isLoading={isStarting}
                    isDisabled={needs !== null || !repoId || targetBlocked !== null}
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
