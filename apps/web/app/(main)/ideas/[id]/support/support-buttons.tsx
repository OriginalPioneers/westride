"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { AdjustmentsHorizontalIcon, ComputerDesktopIcon, SparklesIcon } from "@heroicons/react/24/outline";
import type { Pledge } from "@westride/db";
import type { SupportSettingsDraft } from "@/lib/support/schema";
import { PledgeComputeDialog } from "./pledge-compute-dialog";
import { PledgeTokensDialog } from "./pledge-tokens-dialog";
import { SupportSettingsDialog } from "./support-settings-dialog";

/** Opens a dialog each time with fresh state (the key resets it). */
function useDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);
  return {
    isOpen,
    setIsOpen,
    session,
    open() {
      setSession((current) => current + 1);
      setIsOpen(true);
    },
  };
}

export function PledgeTokensButton({
  ideaId,
  ideaName,
  existing,
  hasMetaKey,
  signInHref,
}: {
  ideaId: string;
  ideaName: string;
  existing: Pledge | null;
  hasMetaKey: boolean;
  /** Set for signed-out viewers; the button becomes a sign-in link. */
  signInHref?: string;
}) {
  const dialog = useDialog();
  const isActive = existing?.status === "ACTIVE";
  const label = isActive ? "Your token pledge" : existing?.status === "PAUSED" ? "Pledge paused" : "Pledge tokens";
  if (signInHref) {
    return <Button label="Pledge tokens" variant="primary" icon={<Icon icon={SparklesIcon} />} href={signInHref} />;
  }
  return (
    <>
      <Button
        label={label}
        variant={isActive ? "secondary" : "primary"}
        icon={<Icon icon={SparklesIcon} />}
        onClick={dialog.open}
      />
      <PledgeTokensDialog
        key={dialog.session}
        isOpen={dialog.isOpen}
        onOpenChange={dialog.setIsOpen}
        ideaId={ideaId}
        ideaName={ideaName}
        existing={existing}
        hasMetaKey={hasMetaKey}
      />
    </>
  );
}

export function PledgeComputeButton({
  ideaId,
  ideaName,
  existing,
  deviceCount,
  signInHref,
}: {
  ideaId: string;
  ideaName: string;
  existing: Pledge | null;
  deviceCount: number;
  signInHref?: string;
}) {
  const dialog = useDialog();
  const isActive = existing?.status === "ACTIVE";
  const label = isActive ? "Your compute pledge" : existing?.status === "PAUSED" ? "Pledge paused" : "Pledge compute";
  if (signInHref) {
    return (
      <Button label="Pledge compute" variant="primary" icon={<Icon icon={ComputerDesktopIcon} />} href={signInHref} />
    );
  }
  return (
    <>
      <Button
        label={label}
        variant={isActive ? "secondary" : "primary"}
        icon={<Icon icon={ComputerDesktopIcon} />}
        onClick={dialog.open}
      />
      <PledgeComputeDialog
        key={dialog.session}
        isOpen={dialog.isOpen}
        onOpenChange={dialog.setIsOpen}
        ideaId={ideaId}
        ideaName={ideaName}
        existing={existing}
        deviceCount={deviceCount}
      />
    </>
  );
}

export function SupportSettingsButton({ ideaId, initial }: { ideaId: string; initial: SupportSettingsDraft }) {
  const dialog = useDialog();
  return (
    <>
      <Button
        label="Support settings"
        variant="secondary"
        icon={<Icon icon={AdjustmentsHorizontalIcon} />}
        onClick={dialog.open}
      />
      <SupportSettingsDialog
        key={dialog.session}
        isOpen={dialog.isOpen}
        onOpenChange={dialog.setIsOpen}
        ideaId={ideaId}
        initial={initial}
      />
    </>
  );
}
