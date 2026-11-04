"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { CheckIcon } from "@heroicons/react/20/solid";
import { PlusIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import { ideaPath } from "@/lib/ideas/filters";
import { setIdeaFollow } from "./actions";

type FollowButtonProps = {
  ideaId: string;
  /** Where a visitor lands after signing in. Defaults to the idea's id address. */
  returnTo?: string;
  isFollowing: boolean;
  /** Null for a visitor, who is sent to sign in instead. */
  viewerId: string | null;
  size?: "sm" | "md";
};

/**
 * Follow an idea you are not on the team of. Render it only for non-members:
 * the team already sees the idea under "Your Ideas".
 */
export function FollowButton({
  ideaId,
  returnTo,
  isFollowing,
  viewerId,
  size = "md",
}: FollowButtonProps) {
  const router = useRouter();
  const [pressed, setPressed] = useState(isFollowing);
  const [error, setError] = useState<string | null>(null);

  if (!viewerId) {
    return (
      <Button
        label="Follow"
        variant="secondary"
        size={size}
        icon={<Icon icon={PlusIcon} />}
        href={`${signInPath}?redirect_url=${encodeURIComponent(returnTo ?? ideaPath(ideaId))}`}
      />
    );
  }

  return (
    <ToggleButton
      label="Follow"
      size={size}
      isPressed={pressed}
      icon={<Icon icon={PlusIcon} />}
      pressedIcon={<Icon icon={CheckIcon} />}
      tooltip={error ?? (pressed ? "Following" : undefined)}
      pressedChangeAction={async (next) => {
        setError(null);
        const result = await setIdeaFollow(ideaId, next);
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        setPressed(result.isFollowing);
        router.refresh();
      }}
    />
  );
}
