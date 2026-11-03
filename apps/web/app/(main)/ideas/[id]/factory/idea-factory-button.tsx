"use client";

import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { IdeaFactoryDialog, type FactoryIdea } from "./idea-factory-dialog";

export function IdeaFactoryButton({
  idea,
  viewerId,
  autoOpen = false,
}: {
  idea: FactoryIdea;
  viewerId: string;
  /** Open the workshop as soon as the page shows, e.g. right after creating the idea. */
  autoOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(autoOpen);

  useEffect(() => {
    if (!autoOpen) {
      return;
    }
    // Drop the query so a refresh or back navigation does not reopen the dialog.
    const url = new URL(window.location.href);
    if (url.searchParams.has("factory")) {
      url.searchParams.delete("factory");
      window.history.replaceState(window.history.state, "", url);
    }
  }, [autoOpen]);

  return (
    <>
      <Button
        label="Open Idea Factory"
        variant="primary"
        icon={<Icon icon={SparklesIcon} />}
        onClick={() => setIsOpen(true)}
      />
      {isOpen ? (
        <IdeaFactoryDialog
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          idea={idea}
          viewerId={viewerId}
        />
      ) : null}
    </>
  );
}
