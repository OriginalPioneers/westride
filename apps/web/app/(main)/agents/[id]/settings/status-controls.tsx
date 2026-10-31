"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { AgentStatus } from "@westride/db";
import { AGENT_STATUS_HINTS } from "@/lib/agents/labels";
import { agentsPath } from "@/lib/agents/labels";
import { deleteAgentAction, setAgentStatusAction } from "../../actions";

export function AgentStatusControls({
  agentId,
  agentName,
  status,
  activeJobs,
}: {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  activeJobs: number;
}) {
  const router = useRouter();
  const [isWorking, startWorking] = useTransition();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStatus(next: AgentStatus) {
    setError(null);
    startWorking(async () => {
      const result = await setAgentStatusAction(agentId, { status: next });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    startWorking(async () => {
      const result = await deleteAgentAction(agentId);
      if (result.status === "error") {
        setError(result.message);
        setIsConfirmingDelete(false);
        return;
      }
      router.push(agentsPath());
    });
  }

  const close = (open: boolean) => {
    if (!isWorking) {
      setIsConfirmingDelete(open);
    }
  };

  return (
    <VStack gap={4}>
      {error ? <Banner status="error" title={error} /> : null}
      <Text type="supporting">{AGENT_STATUS_HINTS[status]}</Text>
      <HStack gap={2} vAlign="center" wrap="wrap">
        {status !== "ACTIVE" ? (
          <Button label="Resume" variant="primary" isLoading={isWorking} onClick={() => setStatus("ACTIVE")} />
        ) : null}
        {status === "ACTIVE" ? (
          <Button label="Pause" variant="secondary" isLoading={isWorking} onClick={() => setStatus("PAUSED")} />
        ) : null}
        {status !== "ARCHIVED" ? (
          <Button label="Archive" variant="secondary" isDisabled={isWorking} onClick={() => setStatus("ARCHIVED")} />
        ) : null}
        <StackItem size="fill" />
        <Button
          label="Delete agent"
          variant="destructive"
          isDisabled={isWorking || activeJobs > 0}
          onClick={() => setIsConfirmingDelete(true)}
        />
      </HStack>
      {activeJobs > 0 ? <Text type="supporting">Stop the running job before deleting the agent.</Text> : null}
      <Dialog isOpen={isConfirmingDelete} onOpenChange={close} purpose="form" width={480}>
        <Layout
          header={<DialogHeader title="Delete this agent?" hasDivider onOpenChange={close} />}
          content={
            <LayoutContent>
              <Text>
                &ldquo;{agentName}&rdquo; and its tickets, jobs, work logs, and log entries will be removed. Spend
                already recorded against your Meta account stays in the request log. This cannot be undone.
              </Text>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} vAlign="center">
                <Button label="Keep it" variant="secondary" isDisabled={isWorking} onClick={() => setIsConfirmingDelete(false)} />
                <StackItem size="fill" />
                <Button label="Delete agent" variant="destructive" isLoading={isWorking} onClick={remove} />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </VStack>
  );
}
