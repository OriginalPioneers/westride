"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { PlusIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import { CreateTile } from "../create-tile";
import { CreateAgentDialog, type CreateAgentOptions } from "./create-agent-dialog";

const CreateAgentContext = createContext<(() => void) | null>(null);

export function CreateAgentProvider({
  options,
  children,
}: {
  /** Null when the viewer is signed out. */
  options: CreateAgentOptions | null;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);
  const open = useCallback(() => {
    setSession((current) => current + 1);
    setIsOpen(true);
  }, []);

  return (
    <CreateAgentContext.Provider value={options ? open : null}>
      {children}
      {options ? (
        <CreateAgentDialog key={session} isOpen={isOpen} onOpenChange={setIsOpen} options={options} />
      ) : null}
    </CreateAgentContext.Provider>
  );
}

const SIGN_IN_HREF = `${signInPath}?redirect_url=/agents`;

/** The first tile under "Your Agents": a whole card that starts a new agent. */
export function CreateAgentCard() {
  const open = useContext(CreateAgentContext);

  return (
    <CreateTile
      label="New agent"
      description="A standing Muse agent with its own backlog, schedule, and spend."
      onClick={open}
      signInHref={SIGN_IN_HREF}
    />
  );
}

export function CreateAgentButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const open = useContext(CreateAgentContext);

  if (!open) {
    return (
      <Button
        label="New agent"
        variant={variant}
        icon={<Icon icon={PlusIcon} />}
        href={SIGN_IN_HREF}
      />
    );
  }

  return <Button label="New agent" variant={variant} icon={<Icon icon={PlusIcon} />} onClick={open} />;
}
