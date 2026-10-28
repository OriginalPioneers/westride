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
import { CreateIdeaDialog, type IdeaFounder } from "./create-idea-dialog";

export type { IdeaFounder };

const CreateIdeaContext = createContext<(() => void) | null>(null);

export function CreateIdeaProvider({
  founder,
  children,
}: {
  founder: IdeaFounder | null;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);
  const open = useCallback(() => {
    setSession((current) => current + 1);
    setIsOpen(true);
  }, []);

  return (
    <CreateIdeaContext.Provider value={founder ? open : null}>
      {children}
      {founder ? (
        <CreateIdeaDialog
          key={session}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          founder={founder}
        />
      ) : null}
    </CreateIdeaContext.Provider>
  );
}

export function CreateIdeaButton({
  variant = "primary",
}: {
  variant?: "primary" | "secondary";
}) {
  const open = useContext(CreateIdeaContext);

  if (!open) {
    return (
      <Button
        label="New idea"
        variant={variant}
        icon={<Icon icon={PlusIcon} />}
        href={`${signInPath}?redirect_url=/ideas`}
      />
    );
  }

  return (
    <Button
      label="New idea"
      variant={variant}
      icon={<Icon icon={PlusIcon} />}
      onClick={open}
    />
  );
}
