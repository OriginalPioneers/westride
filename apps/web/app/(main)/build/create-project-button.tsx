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
import { CreateTile } from "../create-tile";
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

const SIGN_IN_HREF = `${signInPath}?redirect_url=/build`;

/** The first tile under "Your Projects": a whole card that starts a new project. */
export function CreateProjectCard() {
  const open = useContext(CreateProjectContext);

  return (
    <CreateTile
      label="New project"
      description="Plan the tickets, link the code, and track the build."
      onClick={open}
      signInHref={SIGN_IN_HREF}
    />
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
        href={SIGN_IN_HREF}
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
