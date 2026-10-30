"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { SparklesIcon } from "@heroicons/react/20/solid";
import { PlanDialog } from "./plan-dialog";

export function PlanWithMuseButton({
  projectId,
  hasMetaConnection,
  openTicketCount,
  variant = "secondary",
}: {
  projectId: string;
  hasMetaConnection: boolean;
  openTicketCount: number;
  variant?: "primary" | "secondary";
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        label="Plan with Muse"
        variant={variant}
        icon={<Icon icon={SparklesIcon} size="sm" />}
        onClick={() => setIsOpen(true)}
      />
      {isOpen ? (
        <PlanDialog
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          projectId={projectId}
          hasMetaConnection={hasMetaConnection}
          openTicketCount={openTicketCount}
        />
      ) : null}
    </>
  );
}
