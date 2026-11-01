"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MAX_DEVICE_NAME } from "@/lib/support/schema";
import { renameDeviceAction, revokeDeviceAction } from "../support-actions";

export function DeviceActions({ deviceId, name }: { deviceId: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  function rename() {
    startTransition(async () => {
      const result = await renameDeviceAction({ deviceId, name: draft });
      if (result.status === "error") {
        setError(result.fieldErrors.name ?? result.message);
        return;
      }
      setIsRenaming(false);
      router.refresh();
    });
  }

  function unlink() {
    if (!window.confirm(`Unlink ${name}? The runner on it stops getting work until you pair it again.`)) {
      return;
    }
    startTransition(async () => {
      const result = await revokeDeviceAction(deviceId);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <HStack gap={2} vAlign="center" wrap="wrap">
        {error && !isRenaming ? <Text type="supporting">{error}</Text> : null}
        <Button label="Rename" variant="ghost" size="sm" isDisabled={isPending} onClick={() => setIsRenaming(true)} />
        <Button label="Unlink" variant="ghost" size="sm" isDisabled={isPending} onClick={unlink} />
      </HStack>
      <Dialog isOpen={isRenaming} onOpenChange={setIsRenaming} purpose="form" width={420}>
        <Layout
          header={<DialogHeader title="Rename computer" hasDivider onOpenChange={setIsRenaming} />}
          content={
            <LayoutContent>
              <FormLayout>
                <TextInput
                  label="Name"
                  value={draft}
                  onChange={(value) => {
                    setDraft(value.slice(0, MAX_DEVICE_NAME));
                    setError(null);
                  }}
                  status={error ? { type: "error", message: error } : undefined}
                  hasAutoFocus
                  onEnter={rename}
                />
              </FormLayout>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} vAlign="center">
                <Button label="Cancel" variant="secondary" isDisabled={isPending} onClick={() => setIsRenaming(false)} />
                <StackItem size="fill" />
                <Button label="Save" variant="primary" isLoading={isPending} onClick={rename} />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}
