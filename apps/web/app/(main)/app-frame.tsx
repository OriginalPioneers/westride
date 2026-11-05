"use client";

import { useState } from "react";
import { Show, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout } from "@astryxdesign/core/Layout";
import { Popover } from "@astryxdesign/core/Popover";
import { HStack, Stack, VStack } from "@astryxdesign/core/Stack";
import {
  TopNav,
  TopNavHeading,
  TopNavItem,
  useTopNavRenderMode,
} from "@astryxdesign/core/TopNav";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { TrophyIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { signInPath } from "@/lib/auth-paths";
import { isJudgeNavVisible, judgeAccessPath } from "@/lib/judge-access";
import { ThemeToggle } from "../theme-toggle";
import { SiteFooter } from "../site-footer";

type NavLink = {
  label: string;
  href: string;
};

/** The four studios, and what they cost. Left of the bar. */
const PRIMARY_LINKS: NavLink[] = [
  { label: "Idea Workshop", href: "/ideas" },
  { label: "Project Factory", href: "/build" },
  { label: "Agent Studio", href: "/agents" },
  { label: "WePledge™", href: "/wepledge" },
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

function PrimaryLinks({ pathname }: { pathname: string }) {
  const renderMode = useTopNavRenderMode();
  const items = PRIMARY_LINKS.map((link) => (
    <TopNavItem
      key={link.href}
      label={link.label}
      href={link.href}
      isSelected={isActive(pathname, link.href)}
    />
  ));
  // The drawer lays its children out as a column, so the row wrapper stays
  // on the wide bar only. The bar hides this row once More holds every link.
  if (renderMode !== "default") {
    return <>{items}</>;
  }
  return (
    <HStack className="westride-nav-primary" gap={1} vAlign="center" wrap="nowrap">
      {items}
    </HStack>
  );
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

const JUDGE_LABEL = "Hackathon Judge Access";

/**
 * Temporary entry for hackathon judges, present only while
 * NEXT_PUBLIC_HACKATHON_JUDGE_ACCESS is set. Signed-out visitors see it. A
 * signed-in visitor sees it only when they are the shared judge account.
 * It is the one primary button in the bar so it reads as the special thing
 * it is. The phone bar gets the icon alone; the drawer gets a plain item
 * with the studios.
 */
function useShowJudgeNav(judgeUserId: string | null) {
  const auth = useAuth();
  return isJudgeNavVisible({
    authLoaded: auth.isLoaded,
    userId: auth.userId,
    judgeUserId,
  });
}

function JudgeNav({
  slot,
  pathname,
  judgeUserId,
}: {
  slot: "start" | "end";
  pathname: string;
  judgeUserId: string | null;
}) {
  const renderMode = useTopNavRenderMode();
  const showJudge = useShowJudgeNav(judgeUserId);
  if (!showJudge) {
    return null;
  }
  const isDrawer = renderMode === "drawer";
  if (slot === "start" ? !isDrawer : isDrawer) {
    return null;
  }
  if (isDrawer) {
    return (
      <>
        <Divider orientation="horizontal" />
        <TopNavItem
          label={JUDGE_LABEL}
          href={judgeAccessPath}
          icon={<Icon icon={TrophyIcon} />}
          isSelected={isActive(pathname, judgeAccessPath)}
        />
      </>
    );
  }
  return (
    <Button
      label={JUDGE_LABEL}
      tooltip={renderMode === "mobile-bar" ? JUDGE_LABEL : undefined}
      variant="primary"
      size="sm"
      icon={<Icon icon={TrophyIcon} />}
      isIconOnly={renderMode === "mobile-bar"}
      href={judgeAccessPath}
    />
  );
}

/**
 * Mentorship, Academy, and the judge button. Hidden as a group when the bar
 * gets tight; NavMore lists them instead. The phone bar keeps the judge icon.
 */
function EndLinks({
  pathname,
  judgeUserId,
}: {
  pathname: string;
  judgeUserId: string | null;
}) {
  const renderMode = useTopNavRenderMode();
  const links = (
    <>
      <SecondaryNav slot="end" pathname={pathname} />
      <JudgeNav slot="end" pathname={pathname} judgeUserId={judgeUserId} />
    </>
  );
  if (renderMode !== "default") {
    return links;
  }
  return (
    <HStack className="westride-nav-end-links" gap={1} vAlign="center" wrap="nowrap">
      {links}
    </HStack>
  );
}

function MenuLink({
  pathname,
  label,
  href,
  icon,
  onNavigate,
}: {
  pathname: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <TopNavItem
      label={label}
      href={href}
      icon={icon}
      isSelected={isActive(pathname, href)}
      onClick={onNavigate}
    />
  );
}

/**
 * Holds whatever no longer fits in the bar: the right-hand links first, then
 * the five studio links. The phone drawer replaces this entirely.
 */
function NavMore({
  pathname,
  judgeUserId,
}: {
  pathname: string;
  judgeUserId: string | null;
}) {
  const renderMode = useTopNavRenderMode();
  const showJudge = useShowJudgeNav(judgeUserId);
  const [isOpen, setOpen] = useState(false);
  if (renderMode !== "default") {
    return null;
  }
  const close = () => setOpen(false);

  return (
    <HStack className="westride-nav-more" gap={1} vAlign="center">
      <Divider
        orientation="vertical"
        style={{ height: "var(--spacing-4)", alignSelf: "center" }}
      />
      <Popover
        placement="below"
        alignment="end"
        label="More pages"
        padding={3}
        width="max-content"
        isOpen={isOpen}
        onOpenChange={setOpen}
        content={
          <VStack gap={2}>
            <VStack className="westride-nav-more-primary" gap={1}>
              {PRIMARY_LINKS.map((link) => (
                <MenuLink
                  key={link.href}
                  pathname={pathname}
                  label={link.label}
                  href={link.href}
                  onNavigate={close}
                />
              ))}
              <Divider />
            </VStack>
            {SECONDARY_LINKS.map((link) => (
              <MenuLink
                key={link.href}
                pathname={pathname}
                label={link.label}
                href={link.href}
                onNavigate={close}
              />
            ))}
            {showJudge ? (
              <MenuLink
                pathname={pathname}
                label={JUDGE_LABEL}
                href={judgeAccessPath}
                icon={<Icon icon={TrophyIcon} />}
                onNavigate={close}
              />
            ) : null}
          </VStack>
        }
      >
        <Button
          label="More"
          variant="ghost"
          size="sm"
          endContent={<Icon icon={ChevronDownIcon} size="sm" />}
        />
      </Popover>
    </HStack>
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

/**
 * Wordmark, then a short rule, then the color-mode control. The drawer
 * repeats this lockup as its header, so the control stays in the bar only.
 */
function BrandLockup() {
  const renderMode = useTopNavRenderMode();

  return (
    <Stack direction="horizontal" gap={2} align="center">
      <TopNavHeading
        headingHref="/"
        logo={<Wordmark />}
        logoLabel="WeStride"
      />
      {renderMode === "drawer" ? null : (
        <>
          <Divider
            orientation="vertical"
            style={{ height: "var(--spacing-4)", alignSelf: "center" }}
          />
          <ThemeToggle />
        </>
      )}
    </Stack>
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
  judgeUserId,
}: {
  children: React.ReactNode;
  judgeUserId: string | null;
}) {
  const pathname = usePathname();

  return (
    <AppShell
      variant="section"
      height="fill"
      topNav={
        <TopNav
          className="westride-topnav"
          label="WeStride"
          heading={<BrandLockup />}
          // On the wide bar, PrimaryLinks and EndLinks are rows that can
          // leave as a group. In the phone drawer they render as direct
          // items so the drawer can stack them.
          startContent={
            <>
              <PrimaryLinks pathname={pathname} />
              <SecondaryNav slot="start" pathname={pathname} />
              <JudgeNav slot="start" pathname={pathname} judgeUserId={judgeUserId} />
            </>
          }
          endContent={
            <>
              <EndLinks pathname={pathname} judgeUserId={judgeUserId} />
              <NavMore pathname={pathname} judgeUserId={judgeUserId} />
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
        footer={<SiteFooter />}
      >
        {children}
      </Layout>
    </AppShell>
  );
}
