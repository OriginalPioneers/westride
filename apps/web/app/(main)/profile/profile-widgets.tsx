"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import { afterAuthPath } from "@/lib/auth-paths";

export function EditAccountButton() {
  const { openUserProfile } = useClerk();

  return (
    <Button
      label="Edit account"
      onClick={() => {
        openUserProfile();
      }}
    />
  );
}

export function SignOutButton() {
  const { signOut } = useClerk();

  return (
    <Button
      label="Sign Out"
      icon={<Icon icon={ArrowRightStartOnRectangleIcon} />}
      clickAction={() => signOut({ redirectUrl: afterAuthPath })}
    />
  );
}
