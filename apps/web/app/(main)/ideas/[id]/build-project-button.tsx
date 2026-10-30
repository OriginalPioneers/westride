"use client";

import { useState, useTransition } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { loadProjectPrefill, type ProjectPrefill } from "../../build/actions";
import {
  CreateProjectDialog,
  type ProjectCreator,
} from "../../build/create-project-dialog";

/** Starts a Build Studio project from this idea, with its details filled in. */
export function BuildProjectButton({
  ideaId,
  creator,
}: {
  ideaId: string;
  creator: ProjectCreator;
}) {
  const [prefill, setPrefill] = useState<ProjectPrefill | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [isLoading, startLoading] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    startLoading(async () => {
      const result = await loadProjectPrefill(ideaId);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setPrefill(result.prefill);
      setSession((current) => current + 1);
      setIsOpen(true);
    });
  }

  return (
    <>
      <Button
        label="Build this idea"
        variant="secondary"
        icon={<Icon icon={WrenchScrewdriverIcon} />}
        isLoading={isLoading}
        onClick={open}
        tooltip={error ?? undefined}
      />
      {isOpen && prefill ? (
        <CreateProjectDialog
          key={session}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          creator={creator}
          prefill={prefill}
        />
      ) : null}
    </>
  );
}
