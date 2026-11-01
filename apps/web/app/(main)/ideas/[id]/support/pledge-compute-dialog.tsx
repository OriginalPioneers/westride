"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import type { Pledge } from "@westride/db";
import { MAX_PLEDGE_NOTE, supportingPath } from "@/lib/support/schema";
import { pledgeComputeAction, setPledgeStatusAction } from "../../../support-actions";

export function PledgeComputeDialog({
  isOpen,
  onOpenChange,
  ideaId,
  ideaName,
  existing,
  deviceCount,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  ideaId: string;
  ideaName: string;
  existing: Pledge | null;
  /** Computers the viewer has linked, so the dialog can say what happens next. */
  deviceCount: number;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [note, setNote] = useState(existing?.note ?? "");
  const [formMessage, setFormMessage] = useState<string | null>(null);

  function close(next: boolean) {
    if (!next && isSaving) return;
    onOpenChange(next);
  }

  function save() {
    startSaving(async () => {
      const result = await pledgeComputeAction({ ideaId, note });
      if (result.status === "error") {
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
        header={<DialogHeader title={existing ? "Your compute pledge" : "Pledge compute"} hasDivider onOpenChange={close} />}
        content={
          <LayoutContent>
            <VStack gap={5}>
              {formMessage ? <Banner status="error" title={formMessage} /> : null}
              <Text>
                Your computer runs agent code jobs for <Text weight="semibold">{ideaName}</Text> when the team has
                opted in. Each job runs inside an isolated Docker container that only sees a fresh clone of a public
                repository. Your computer never receives GitHub access; it sends the changed files back and WeStride
                commits them.
              </Text>
              <Text>
                With a local model in Ollama, jobs can run with no API key at all. With your Meta key connected, it is
                used instead and the team&apos;s model choice applies.
              </Text>
              {deviceCount === 0 ? (
                <Banner
                  status="info"
                  title="No computer linked yet"
                  description="After pledging, link one from the Supporting page. Install takes a minute and needs Docker."
                />
              ) : (
                <Text type="supporting">
                  {deviceCount} computer{deviceCount === 1 ? "" : "s"} linked.{" "}
                  <Link href={supportingPath("compute")}>Manage them</Link>
                </Text>
              )}
              {existing && existing.jobsTotal > 0 ? (
                <Text type="supporting">
                  So far your computers have run {existing.jobsTotal} job{existing.jobsTotal === 1 ? "" : "s"} for this
                  idea.
                </Text>
              ) : null}
              <FormLayout defaultOptionality="optional">
                <TextArea
                  label="Note to the team"
                  value={note}
                  onChange={(value) => {
                    setNote(value);
                    setFormMessage(null);
                  }}
                  rows={2}
                  maxLength={MAX_PLEDGE_NOTE}
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
