"use client";

import { Show, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
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
import {
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { afterAuthPath, signInPath } from "@/lib/auth-paths";
import { MuseDock } from "./muse-dock";
import { SITE_CONTAINER_WIDTH, SiteFooter } from "../site-footer";

type NavLink = {
  label: string;
  href: string;
};

/** Primary destinations, in two groups: make something, then get help with it. */
const NAV_GROUPS: NavLink[][] = [
  [
    { label: "Idea Workshop", href: "/ideas" },
    { label: "Build Studio", href: "/build" },
    { label: "AI Agent Fleet", href: "/agents" },
  ],
  [
    { label: "Support A Project", href: "/supporting" },
    { label: "Mentorship", href: "/mentorship" },
    { label: "AI Academy", href: "/academy" },
  ],
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Separates the nav groups: a vertical rule in the bar, a horizontal one in the drawer. */
function GroupDivider() {
  const renderMode = useTopNavRenderMode();
  return (
    <Divider orientation={renderMode === "drawer" ? "horizontal" : "vertical"} />
  );
}

function Wordmark() {
  return (
    <Image
      src="/logos/westride/WeStride_landscape_navy.png"
      alt="WeStride"
      width={2492}
      height={762}
      preload
      // The optimizer fetches this file without a browser user agent,
      // and the proxy refuses that request.
      unoptimized
      style={{
        height: "var(--spacing-8)",
        width: "auto",
        display: "block",
      }}
    />
  );
}

function AccountMenu() {
  const { signOut } = useClerk();

  return (
    <DropdownMenu
      placement="below"
      alignment="end"
      hasChevron={false}
      renderTrigger={(props) => (
        <IconButton
          {...props}
          label="Account"
          tooltip="Account"
          variant="ghost"
          icon={<Icon icon={UserCircleIcon} />}
        />
      )}
      items={[
        { label: "Profile", href: "/profile", icon: UserCircleIcon },
        { label: "Settings", href: "/settings", icon: Cog6ToothIcon },
        { type: "divider" },
        {
          label: "Sign Out",
          icon: ArrowRightStartOnRectangleIcon,
          onClick: () => {
            void signOut({ redirectUrl: afterAuthPath });
          },
        },
      ]}
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
            <TopNavHeading headingHref="/" logo={<Wordmark />} />
          }
          // Items sit directly in the slot (no wrapper) so TopNav can lay
          // them out as a row in the bar and as a column in the phone drawer.
          startContent={NAV_GROUPS.map((group, index) => (
            <Fragment key={index}>
              {index > 0 ? <GroupDivider /> : null}
              {group.map((link) => (
                <TopNavItem
                  key={link.href}
                  label={link.label}
                  href={link.href}
                  isSelected={isActive(pathname, link.href)}
                />
              ))}
            </Fragment>
          ))}
          endContent={
            <>
              <Show when="signed-out">
                <Button label="Sign In" variant="secondary" href={signInPath} />
              </Show>
              <Show when="signed-in">
                <AccountMenu />
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
