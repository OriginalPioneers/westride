"use client";

import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";

export function TheaterModeButton({ href }: { href: string }) {
  return (
    <Button
      label="Theater mode"
      variant="secondary"
      href={href}
      icon={<Icon icon={ArrowsPointingOutIcon} />}
      tooltip="Read this lesson without the navigation around it"
    />
  );
}
