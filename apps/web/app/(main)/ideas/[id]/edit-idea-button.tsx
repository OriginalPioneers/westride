"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { EditIdeaDialog, type EditableIdea } from "./edit-idea-dialog";

export type { EditableIdea };

export function EditIdeaButton({
  idea,
  viewerId,
}: {
  idea: EditableIdea;
  viewerId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);

  return (
    <>
      <Button
        label="Edit idea"
        variant="secondary"
        icon={<Icon icon={PencilSquareIcon} />}
        onClick={() => {
          setSession((current) => current + 1);
          setIsOpen(true);
        }}
      />
      <EditIdeaDialog
        key={session}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        idea={idea}
        viewerId={viewerId}
      />
    </>
  );
}
