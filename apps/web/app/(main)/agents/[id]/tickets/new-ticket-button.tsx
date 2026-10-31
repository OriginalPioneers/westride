"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { PlusIcon } from "@heroicons/react/24/outline";
import { AgentTicketDialog } from "./ticket-dialog";

export function NewAgentTicketButton({
  agentId,
  runsCode,
  variant = "primary",
}: {
  agentId: string;
  runsCode: boolean;
  variant?: "primary" | "secondary";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      <Button
        label="New ticket"
        variant={variant}
        icon={<Icon icon={PlusIcon} />}
        onClick={() => {
          setSession((current) => current + 1);
          setIsOpen(true);
        }}
      />
      {isOpen ? (
        <AgentTicketDialog
          key={session}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          agentId={agentId}
          runsCode={runsCode}
        />
      ) : null}
    </>
  );
}
