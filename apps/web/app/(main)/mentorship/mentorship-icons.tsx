"use client";

// Icon is a Client Component, and a Server Component cannot hand it an icon
// component (a function) as a prop. Rendering it from here keeps that
// reference on the client.
import { Icon } from "@astryxdesign/core/Icon";
import { MagnifyingGlassIcon, UserPlusIcon } from "@heroicons/react/24/outline";

export function BecomeMentorIcon() {
  return <Icon icon={UserPlusIcon} size="lg" color="accent" />;
}

export function FindMentorIcon() {
  return <Icon icon={MagnifyingGlassIcon} size="lg" color="accent" />;
}
