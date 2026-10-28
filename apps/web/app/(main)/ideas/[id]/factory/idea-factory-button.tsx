"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { IdeaFactoryDialog, type FactoryIdea } from "./idea-factory-dialog";

export function IdeaFactoryButton({
  idea,
  viewerId,
}: {
  idea: FactoryIdea;
  viewerId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

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
