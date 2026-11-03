"use client";

import { Show } from "@clerk/nextjs";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import {
  TopNav,
  TopNavHeading,
  TopNavItem,
  useTopNavRenderMode,
} from "@astryxdesign/core/TopNav";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import { ThemeToggle } from "../theme-toggle";
import { MuseDock } from "./muse-dock";
import { SITE_CONTAINER_WIDTH, SiteFooter } from "../site-footer";

type NavLink = {
  label: string;
  href: string;
};

/** The four studios, and what they cost. Left of the bar. */
const PRIMARY_LINKS: NavLink[] = [
  { label: "Idea Workshop", href: "/ideas" },
  { label: "Build Studio", href: "/build" },
  { label: "AI Agent Fleet", href: "/agents" },
  { label: "Support A Project", href: "/supporting" },
  { label: "Pricing", href: "/pricing" },
];

/** Help along the way. Right of the bar, quieter than the studios. */
const SECONDARY_LINKS: NavLink[] = [
  { label: "Mentorship", href: "/mentorship" },
  { label: "AI Academy", href: "/academy" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The secondary links live in a different slot depending on how TopNav is
 * rendering: the phone drawer only shows `startContent`, and the phone bar
 * only shows `endContent`, so each slot renders them in exactly one mode.
 * In the full bar they sit at the right, before the account controls, as
 * smaller plain text; in the drawer they follow the studios under a rule.
 */
function SecondaryNav({
  slot,
  pathname,
}: {
  slot: "start" | "end";
  pathname: string;
}) {
  const renderMode = useTopNavRenderMode();
  const isDrawer = renderMode === "drawer";
  if (slot === "start" ? !isDrawer : renderMode !== "default") {
    return null;
  }
  const items = SECONDARY_LINKS.map((link) => (
    <TopNavItem
      key={link.href}
      label={link.label}
      href={link.href}
      isSelected={isActive(pathname, link.href)}
      className={isDrawer ? undefined : "westride-nav-secondary"}
    />
  ));
  return isDrawer ? (
    <>
      <Divider orientation="horizontal" />
      {items}
    </>
  ) : (
    <>
      {items}
      <Divider orientation="vertical" />
    </>
  );
}

const WORDMARK_NAVY = "/logos/westride/WeStride_landscape_navy.png";
const WORDMARK_WHITE = "/logos/westride/WeStride_landscape_white.png";

function Wordmark() {
  return (
    <>
      <Image
        className="westride-header-wordmark westride-header-wordmark-light"
        src={WORDMARK_NAVY}
        alt=""
        width={2492}
        height={762}
        preload
        // The optimizer fetches this file without a browser user agent,
        // and the proxy refuses that request.
        unoptimized
      />
      <Image
        className="westride-header-wordmark westride-header-wordmark-dark"
        src={WORDMARK_WHITE}
        alt=""
        width={2492}
        height={762}
        preload
        unoptimized
      />
    </>
  );
}

function ProfileLink() {
  return (
    <IconButton
      label="Profile"
      tooltip="Profile"
      variant="ghost"
      href="/profile"
      icon={<Icon icon={UserCircleIcon} />}
    />
  );
}

export function AppFrame({
  children,
  viewerId = null,
}: {
  children: React.ReactNode;
  viewerId?: string | null;
}) {
  const pathname = usePathname();

  return (
    <AppShell
      variant="section"
      height="fill"
      topNav={
        <TopNav
          label="WeStride"
          // Center the bar's content in the site column; the shell keeps
          // the divider full-bleed.
          style={{ maxWidth: SITE_CONTAINER_WIDTH, marginInline: "auto" }}
          heading={
            // The lockup carries the name, so no heading text beside it.
            <TopNavHeading
              headingHref="/"
              logo={<Wordmark />}
              logoLabel="WeStride"
            />
          }
          // Items sit directly in the slot (no wrapper) so TopNav can lay
          // them out as a row in the bar and as a column in the phone drawer.
          startContent={
            <>
              {PRIMARY_LINKS.map((link) => (
                <TopNavItem
                  key={link.href}
                  label={link.label}
                  href={link.href}
                  isSelected={isActive(pathname, link.href)}
                />
              ))}
              <SecondaryNav slot="start" pathname={pathname} />
            </>
          }
          endContent={
            <>
              <SecondaryNav slot="end" pathname={pathname} />
              <ThemeToggle />
              <Show when="signed-out">
                <Button label="Sign In" variant="secondary" href={signInPath} />
              </Show>
              <Show when="signed-in">
                <ProfileLink />
              </Show>
            </>
          }
        />
      }
    >
      <Layout
        height="fill"
        padding={0}
        footer={
          <VStack gap={0} style={{ position: "relative" }}>
            <MuseDock key={viewerId ?? "guest"} viewerId={viewerId} />
            <SiteFooter />
          </VStack>
        }
      >
        {children}
      </Layout>
    </AppShell>
  );
}
