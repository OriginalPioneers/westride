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
      clickAction={() =>
        // A full load of the home page. Clerk's redirectUrl stays in the
        // app router, and this protected page then redirects to sign-in
        // while that navigation is still pending, so the app never settles.
        signOut(() => {
          window.location.assign(afterAuthPath);
        })
      }
    />
  );
}
