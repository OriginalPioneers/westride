"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import type { Pledge } from "@westride/db";
import {
  MAX_CAP_DOLLARS,
  MAX_PLEDGE_NOTE,
  MICROS_PER_DOLLAR,
  formatMicros,
  validateTokenPledge,
  type FieldErrors,
  type TokenPledgeDraft,
} from "@/lib/support/schema";
import { pledgeTokensAction, setPledgeStatusAction } from "../../../support-actions";

function fieldStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

export function PledgeTokensDialog({
  isOpen,
  onOpenChange,
  ideaId,
  ideaName,
  existing,
  hasMetaKey,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  ideaId: string;
  ideaName: string;
  existing: Pledge | null;
  hasMetaKey: boolean;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<TokenPledgeDraft>({
    capDollars: existing?.capMicros != null ? existing.capMicros / MICROS_PER_DOLLAR : 20,
    resetsMonthly: existing?.resetsMonthly ?? true,
    note: existing?.note ?? "",
  });
  const [hasCap, setHasCap] = useState(existing ? existing.capMicros !== null : true);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const effective: TokenPledgeDraft = { ...draft, capDollars: hasCap ? draft.capDollars : null };
  const errors: FieldErrors = { ...(submitted ? validateTokenPledge(ideaId, effective) : {}), ...serverErrors };

  function close(next: boolean) {
    if (!next && isSaving) return;
    onOpenChange(next);
  }

  function save() {
    setSubmitted(true);
    const nextErrors = validateTokenPledge(ideaId, effective);
    if (Object.keys(nextErrors).length > 0) {
      setServerErrors({});
      setFormMessage("Fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      const result = await pledgeTokensAction({ ideaId, ...effective });
      if (result.status === "error") {
        setServerErrors(result.fieldErrors);
        setFormMessage(result.message);
        return;
      }
      router.refresh();
      onOpenChange(false);
    });
  }

  function setStatus(status: "ACTIVE" | "PAUSED" | "REVOKED") {
    if (!existing) return;
    startSaving(async () => {
      const result = await setPledgeStatusAction({ pledgeId: existing.id, status, ideaId });
      if (result.status === "error") {
        setFormMessage(result.message);
        return;
      }
      router.refresh();
      onOpenChange(false);
    });
  }

  const isActive = existing?.status === "ACTIVE";

  return (
    <Dialog isOpen={isOpen} onOpenChange={close} purpose="form" width={560}>
      <Layout
        header={<DialogHeader title={existing ? "Your token pledge" : "Pledge tokens"} hasDivider onOpenChange={close} />}
        content={
          <LayoutContent>
            <VStack gap={5}>
              {formMessage ? <Banner status="error" title={formMessage} /> : null}
              <Text>
                Your Meta API key pays for agent jobs on <Text weight="semibold">{ideaName}</Text>, up to the cap you
                set. The team&apos;s agent settings choose the model; you only decide how much. Nothing is charged by
                WeStride, and no money changes hands here.
              </Text>
              {!hasMetaKey ? (
                <Banner
                  status="warning"
                  title="Connect your Meta account first"
                  description="Jobs can only use your key once it is connected in Settings. You can still save the pledge now."
                />
              ) : null}
              {existing && existing.spentMicrosTotal > 0 ? (
                <Text type="supporting">
                  So far: {formatMicros(existing.spentMicrosTotal)} across {existing.jobsTotal} job
                  {existing.jobsTotal === 1 ? "" : "s"}
                  {existing.capMicros !== null && existing.resetsMonthly
                    ? ` · ${formatMicros(existing.spentMicrosThisPeriod)} this period`
                    : ""}
                  .
                </Text>
              ) : null}
              <FormLayout defaultOptionality="optional">
                <SegmentedControl
                  label="Cap"
                  value={hasCap ? "capped" : "uncapped"}
                  onChange={(value) => {
                    setHasCap(value === "capped");
                    setFormMessage(null);
                  }}
                >
                  <SegmentedControlItem value="capped" label="Up to an amount" />
                  <SegmentedControlItem value="uncapped" label="No cap" />
                </SegmentedControl>
                {hasCap ? (
                  <>
                    <NumberInput
                      label="Amount"
                      description={`Estimated API spend, in US dollars. Up to $${MAX_CAP_DOLLARS.toLocaleString()}.`}
                      value={draft.capDollars}
                      onChange={(value) => {
                        setDraft((current) => ({ ...current, capDollars: value }));
                        setFormMessage(null);
                      }}
                      min={1}
                      max={MAX_CAP_DOLLARS}
                      step={5}
                      units="USD"
                      hasNumberSteppers
                      status={fieldStatus(errors.capDollars)}
                    />
                    <SegmentedControl
                      label="How often"
                      value={draft.resetsMonthly ? "monthly" : "once"}
                      onChange={(value) => setDraft((current) => ({ ...current, resetsMonthly: value === "monthly" }))}
                    >
                      <SegmentedControlItem value="monthly" label="Every month" />
                      <SegmentedControlItem value="once" label="One time" />
                    </SegmentedControl>
                  </>
                ) : (
                  <Banner
                    status="warning"
                    title="No cap means no limit"
                    description="Jobs keep using your key for as long as the pledge is active. Pause or end it any time from Supporting."
                  />
                )}
                <TextArea
                  label="Note to the team"
                  value={draft.note}
                  onChange={(value) => setDraft((current) => ({ ...current, note: value }))}
                  rows={2}
                  maxLength={MAX_PLEDGE_NOTE}
                  status={fieldStatus(errors.note)}
                />
              </FormLayout>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center" wrap="wrap">
              {existing && existing.status !== "REVOKED" ? (
                <>
                  <Button
                    label={isActive ? "Pause" : "Resume"}
                    variant="secondary"
                    isDisabled={isSaving}
                    onClick={() => setStatus(isActive ? "PAUSED" : "ACTIVE")}
                  />
                  <Button label="End pledge" variant="destructive" isDisabled={isSaving} onClick={() => setStatus("REVOKED")} />
                </>
              ) : (
                <Button label="Cancel" variant="secondary" isDisabled={isSaving} onClick={() => close(false)} />
              )}
              <StackItem size="fill" />
              <Button label={existing ? "Save" : "Pledge"} variant="primary" isLoading={isSaving} onClick={save} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
