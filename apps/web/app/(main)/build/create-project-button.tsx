"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { PlusIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import {
  CreateProjectDialog,
  type IdeaOption,
  type ProjectCreator,
} from "./create-project-dialog";

export type { ProjectCreator };

const CreateProjectContext = createContext<(() => void) | null>(null);

export function CreateProjectProvider({
  creator,
  ideaOptions,
  children,
}: {
  creator: ProjectCreator | null;
  ideaOptions: IdeaOption[];
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);
  const open = useCallback(() => {
    setSession((current) => current + 1);
    setIsOpen(true);
  }, []);

  return (
    <CreateProjectContext.Provider value={creator ? open : null}>
      {children}
      {creator ? (
        <CreateProjectDialog
          key={session}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          creator={creator}
          ideaOptions={ideaOptions}
        />
      ) : null}
    </CreateProjectContext.Provider>
  );
}

export function CreateProjectButton({
  variant = "primary",
}: {
  variant?: "primary" | "secondary";
}) {
  const open = useContext(CreateProjectContext);

  if (!open) {
    return (
      <Button
        label="New project"
        variant={variant}
        icon={<Icon icon={PlusIcon} />}
        href={`${signInPath}?redirect_url=/build`}
      />
    );
  }

  return (
    <Button
      label="New project"
      variant={variant}
      icon={<Icon icon={PlusIcon} />}
      onClick={open}
    />
  );
}
