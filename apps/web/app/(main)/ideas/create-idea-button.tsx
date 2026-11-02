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
import type { CategoryOption } from "@westride/db/ideas";
import { signInPath } from "@/lib/auth-paths";
import { CreateTile } from "../create-tile";
import { CreateIdeaDialog, type IdeaFounder } from "./create-idea-dialog";

export type { IdeaFounder };

const CreateIdeaContext = createContext<(() => void) | null>(null);

export function CreateIdeaProvider({
  founder,
  categoryOptions,
  children,
}: {
  founder: IdeaFounder | null;
  categoryOptions: CategoryOption[];
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
          categoryOptions={categoryOptions}
        />
      ) : null}
    </CreateIdeaContext.Provider>
  );
}

const SIGN_IN_HREF = `${signInPath}?redirect_url=/ideas`;

/** The first tile under "Your Ideas": a whole card that starts a new idea. */
export function CreateIdeaCard() {
  const open = useContext(CreateIdeaContext);

  return (
    <CreateTile
      label="New idea"
      description="Capture it, then workshop it with your AI advisory team."
      onClick={open}
      signInHref={SIGN_IN_HREF}
    />
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
        href={SIGN_IN_HREF}
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
