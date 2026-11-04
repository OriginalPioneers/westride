"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { FieldStatus } from "@astryxdesign/core/FieldStatus";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  MAX_CAPITAL_LINKS,
  MAX_LINK_LABEL,
  validateSupportSettings,
  type FieldErrors,
  type SupportSettingsDraft,
} from "@/lib/support/schema";
import { updateIdeaSupportAction } from "../../../support-actions";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

export function SupportSettingsDialog({
  isOpen,
  onOpenChange,
  ideaId,
  initial,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  ideaId: string;
  initial: SupportSettingsDraft;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<SupportSettingsDraft>(initial);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const errors: FieldErrors = { ...(submitted ? validateSupportSettings(draft) : {}), ...serverErrors };

  function patch(changes: Partial<SupportSettingsDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setServerErrors({});
    setFormMessage(null);
  }

  function setLink(index: number, changes: Partial<{ url: string; label: string }>) {
    patch({ capitalLinks: draft.capitalLinks.map((link, i) => (i === index ? { ...link, ...changes } : link)) });
  }

  function close(next: boolean) {
    if (!next && isSaving) return;
    onOpenChange(next);
  }

  function save() {
    setSubmitted(true);
    const nextErrors = validateSupportSettings(draft);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      const result = await updateIdeaSupportAction(ideaId, draft);
      if (result.status === "error") {
        setServerErrors(result.fieldErrors);
        setFormMessage(result.message);
        return;
      }
      router.refresh();
      onOpenChange(false);
    });
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={close} purpose="form" width={640}>
      <Layout
        header={<DialogHeader title="Support settings" hasDivider onOpenChange={close} />}
        content={
          <LayoutContent>
            <VStack gap={6}>
              {formMessage ? <Banner status="error" title={formMessage} /> : null}
              <VStack gap={3}>
                <Heading level={2} accessibilityLevel={3}>
                  What this idea is looking for
                </Heading>
                <Text type="supporting">
                  These show on the idea and on the WePledge™ page, so people who want to help can find you.
                  Supporters still choose what to pledge.
                </Text>
                <CheckboxInput
                  label="Tokens"
                  description="Supporters let agent jobs use their Meta API key, up to a cap they set. Turn on token pledges in each agent's settings to use them."
                  value={draft.wantsTokens}
                  onChange={(value) => patch({ wantsTokens: value })}
                />
                <CheckboxInput
                  label="Compute"
                  description="Supporters run agent code jobs on their own computers. Public repositories only; turn it on per agent."
                  value={draft.wantsCompute}
                  onChange={(value) => patch({ wantsCompute: value })}
                />
                <CheckboxInput
                  label="Capital"
                  description="You list links to places that take contributions. WeStride never collects, holds, or processes money."
                  value={draft.wantsCapital}
                  onChange={(value) => patch({ wantsCapital: value })}
                />
              </VStack>

              {draft.wantsCapital ? (
                <>
                  <Divider />
                  <VStack gap={4}>
                    <VStack gap={2}>
                      <Heading level={2} accessibilityLevel={3}>
                        Where people can contribute
                      </Heading>
                      <Text type="supporting">
                        Up to {MAX_CAPITAL_LINKS} https:// links, like a crowdfunding page, an open-collective, or a
                        bank&apos;s donation form. Each shows its hostname and a note that it is outside WeStride.
                      </Text>
                    </VStack>
                    <VStack gap={4}>
                      {draft.capitalLinks.map((link, index) => (
                        <HStack key={index} gap={2} vAlign="start" wrap="wrap">
                          <StackItem size="fill">
                            <TextInput
                              label={`Link ${index + 1}`}
                              value={link.url}
                              placeholder="https://"
                              onChange={(value) => setLink(index, { url: value })}
                              status={fieldStatus(errors[`capitalLinks.${index}.url`])}
                            />
                          </StackItem>
                          <TextInput
                            label="Label"
                            value={link.label}
                            placeholder="Open Collective"
                            isOptional
                            width={200}
                            onChange={(value) => setLink(index, { label: value.slice(0, MAX_LINK_LABEL) })}
                            status={fieldStatus(errors[`capitalLinks.${index}.label`])}
                          />
                          <IconButton
                            label={`Remove link ${index + 1}`}
                            tooltip="Remove"
                            icon={<Icon icon={TrashIcon} />}
                            variant="ghost"
                            onClick={() => patch({ capitalLinks: draft.capitalLinks.filter((_, i) => i !== index) })}
                          />
                        </HStack>
                      ))}
                    </VStack>
                    {errors.capitalLinks ? (
                      <FieldStatus type="error" variant="detached" message={errors.capitalLinks} />
                    ) : null}
                    {draft.capitalLinks.length < MAX_CAPITAL_LINKS ? (
                      <HStack gap={2}>
                        <Button
                          label="Add a link"
                          variant="secondary"
                          icon={<Icon icon={PlusIcon} />}
                          onClick={() => patch({ capitalLinks: [...draft.capitalLinks, { url: "", label: "" }] })}
                        />
                      </HStack>
                    ) : null}
                  </VStack>
                </>
              ) : null}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <Button label="Cancel" variant="secondary" isDisabled={isSaving} onClick={() => close(false)} />
              <StackItem size="fill" />
              <Button label="Save" variant="primary" isLoading={isSaving} onClick={save} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
