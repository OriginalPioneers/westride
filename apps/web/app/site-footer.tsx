"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Divider } from "@astryxdesign/core/Divider";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Popover } from "@astryxdesign/core/Popover";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  ArrowTopRightOnSquareIcon,
  ChevronUpIcon,
} from "@heroicons/react/20/solid";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

/**
 * Max width of the header and footer content. The bars themselves (and their
 * dividers) stay full-bleed; only what's inside is centered in this column.
 */
export const SITE_CONTAINER_WIDTH = 1200;

const GITHUB_PROFILE_URL = "https://github.com/WeStrideOrg";

const HACKATHON_EVENT_NAME = "Meta Global AI Developer Hackathon";
const HACKATHON_EVENT_URL =
  "https://cerebralvalley.ai/e/meta-ai-developer-hackathon";
const HACKATHON_BADGE_LABEL = `Built at the 2026 ${HACKATHON_EVENT_NAME}`;
const META_AI_LOGO = "/logos/meta-ai.png";
const META_AI_LOGO_LIGHT = "/logos/meta-ai-light.png";

/** Stays in the bar on a narrow screen. The rest sit in the More popover. */
const ABOUT_LINK = { label: "About", href: "/our-story" } as const;
const TERMS_LINK = { label: "Terms of Service", href: "/terms" } as const;

/**
 * Hidden from the bar below the compact breakpoint and listed in More.
 * Privacy is the first item so it stays one tap from the legal link.
 */
const OVERFLOW_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Mobile Apps", href: "/mobile-apps" },
  { label: "Open Source", href: GITHUB_PROFILE_URL, isExternal: true },
  { label: "API", href: "https://api.westride.org", isExternal: true },
  { label: "MCP", href: "https://mcp.westride.org", isExternal: true },
] as const;

/** Only English ships today; the menu is where other languages will appear. */
const LANGUAGES = [{ label: "English", code: "en" }] as const;

const FOOTER_STYLES = `
@property --westride-hackathon-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes westride-hackathon-spin-angle {
  to {
    --westride-hackathon-angle: 360deg;
  }
}

/* A pill with a slowly turning brand-gradient ring; the fill is painted over
   the gradient so only the border shows it. */
.westride-hackathon-badge {
  position: relative;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  border: var(--border-width) solid transparent;
  box-shadow: 0 0 var(--spacing-4)
    color-mix(in srgb, var(--color-brand-indigo) 35%, transparent);
  background:
    linear-gradient(
        var(--color-background-surface),
        var(--color-background-surface)
      )
      padding-box,
    conic-gradient(
      from var(--westride-hackathon-angle),
      var(--color-brand-indigo),
      var(--color-brand-purple),
      var(--color-brand-blue),
      var(--color-brand-teal),
      var(--color-brand-orange),
      var(--color-brand-indigo)
    )
      border-box;
  animation: westride-hackathon-spin-angle calc(var(--duration-slow-max) * 6)
    linear infinite;
}

.westride-hackathon-badge:hover {
  animation-duration: calc(var(--duration-slow-max) * 2);
}

/* Dark mark on light surfaces, light mark on dark. An explicit data-theme
   wins over the operating system preference. */
.westride-hackathon-logo {
  height: 11px;
  width: auto;
  display: block;
}

.westride-hackathon-logo-dark {
  display: none;
}

@media (prefers-color-scheme: dark) {
  .westride-hackathon-logo-light {
    display: none;
  }

  .westride-hackathon-logo-dark {
    display: block;
  }
}

[data-theme="light"] .westride-hackathon-logo-light {
  display: block;
}

[data-theme="light"] .westride-hackathon-logo-dark {
  display: none;
}

[data-theme="dark"] .westride-hackathon-logo-light {
  display: none;
}

[data-theme="dark"] .westride-hackathon-logo-dark {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .westride-hackathon-badge {
    animation: none;
    background:
      linear-gradient(
          var(--color-background-surface),
          var(--color-background-surface)
        )
        padding-box,
      linear-gradient(
          120deg,
          var(--color-brand-indigo),
          var(--color-brand-purple),
          var(--color-brand-teal)
        )
        border-box;
  }
}

.westride-site-footer-row {
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.westride-site-footer-row > * {
  flex-shrink: 0;
}

.westride-site-footer-row a {
  white-space: nowrap;
}

.westride-site-footer-row::-webkit-scrollbar {
  display: none;
  height: 0;
}

/* Compact controls stay out of the wide bar. The labeled language button is
   the wide-bar control; the icon button replaces it when the row gets tight. */
.westride-footer-more,
.westride-footer-language-icon,
.westride-footer-menu-language {
  display: none !important;
}

/* The hackathon sentence is what forces the row to scroll. Dropping it for
   the mark lets every link stay in the bar down to a tablet width. */
@media (max-width: 66rem) {
  .westride-hackathon-label,
  .westride-hackathon-external {
    display: none !important;
  }

  .westride-site-footer-row {
    gap: var(--spacing-3) !important;
  }
}

/* Phones can't fit the whole link row. About and Terms stay put; the rest
   move into More, and the language control shrinks to its icon. */
@media (max-width: 47.99rem) {
  .westride-footer-secondary,
  .westride-footer-desktop-only,
  .westride-footer-language-full {
    display: none !important;
  }

  .westride-footer-more,
  .westride-footer-language-icon {
    display: flex !important;
  }

  .westride-site-footer-row {
    gap: var(--spacing-2) !important;
    overflow-x: hidden;
  }
}

/* The language icon no longer fits beside About, Terms, More, and the mark. */
@media (max-width: 23.75rem) {
  .westride-footer-language-icon {
    display: none !important;
  }

  .westride-footer-menu-language {
    display: flex !important;
    flex-direction: column;
  }

  .westride-site-footer-row {
    gap: var(--spacing-1) !important;
  }
}
`;

function HackathonBadge() {
  return (
    <ClickableCard
      className="westride-hackathon-badge"
      href={HACKATHON_EVENT_URL}
      target="_blank"
      label={`${HACKATHON_BADGE_LABEL} (opens in a new tab)`}
      padding={1}
      width="fit-content"
      elevation="none"
    >
      <HStack gap={2} vAlign="center" wrap="nowrap" paddingInline={2}>
        <Image
          className="westride-hackathon-logo westride-hackathon-logo-light"
          src={META_AI_LOGO}
          alt=""
          width={1084}
          height={209}
          unoptimized
        />
        <Image
          className="westride-hackathon-logo westride-hackathon-logo-dark"
          src={META_AI_LOGO_LIGHT}
          alt=""
          width={1084}
          height={209}
          unoptimized
        />
        <Text
          className="westride-hackathon-label"
          type="label"
          size="sm"
          weight="semibold"
          textWrap="nowrap"
        >
          {HACKATHON_BADGE_LABEL}
        </Text>
        <Icon
          className="westride-hackathon-external"
          icon={ArrowTopRightOnSquareIcon}
          size="xsm"
          color="secondary"
        />
      </HStack>
    </ClickableCard>
  );
}

function LanguageMenu({ isIconOnly = false }: { isIconOnly?: boolean }) {
  return (
    <DropdownMenu
      placement="above"
      hasChevron={!isIconOnly}
      button={{
        label: isIconOnly ? "English" : LANGUAGES[0].label,
        variant: "ghost",
        size: "sm",
        icon: <Icon icon={GlobeAltIcon} size="sm" />,
        isIconOnly,
      }}
      items={LANGUAGES.map((language) => ({
        id: language.code,
        label: language.label,
      }))}
    />
  );
}

function FooterLink({
  label,
  href,
  isExternal,
  className,
  onClick,
}: {
  label: string;
  href: string;
  isExternal?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      className={className}
      href={href}
      isStandalone
      size="sm"
      color="secondary"
      isExternalLink={isExternal}
      onClick={onClick}
    >
      {label}
    </Link>
  );
}

function FooterMore() {
  const [isOpen, setOpen] = useState(false);

  return (
    <StackItem className="westride-footer-more" size="static">
      <Popover
        placement="above"
        alignment="start"
        label="More links"
        padding={3}
        width="max-content"
        isOpen={isOpen}
        onOpenChange={setOpen}
        content={
          <VStack gap={2}>
            <VStack className="westride-footer-menu-language" gap={2}>
              <LanguageMenu />
              <Divider />
            </VStack>
            {OVERFLOW_LINKS.map((link) => (
              <FooterLink
                key={link.href}
                label={link.label}
                href={link.href}
                isExternal={"isExternal" in link && link.isExternal}
                onClick={() => setOpen(false)}
              />
            ))}
          </VStack>
        }
      >
        <Button
          label="More"
          variant="ghost"
          size="sm"
          endContent={<Icon icon={ChevronUpIcon} size="sm" />}
        />
      </Popover>
    </StackItem>
  );
}

export function SiteFooter() {
  return (
    <>
      <style>{FOOTER_STYLES}</style>
      <LayoutFooter
        hasDivider
        padding={2}
        role="contentinfo"
        label="Site"
        style={{
          backgroundColor: "var(--color-background-surface)",
          maxHeight: "calc(var(--spacing-12) + var(--spacing-3))",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <HStack
          className="westride-site-footer-row"
          gap={4}
          wrap="nowrap"
          vAlign="center"
          width="100%"
          maxWidth={SITE_CONTAINER_WIDTH}
          style={{ marginInline: "auto" }}
        >
          <StackItem className="westride-footer-language-icon" size="static">
            <LanguageMenu isIconOnly />
          </StackItem>
          <StackItem className="westride-footer-language-full" size="static">
            <LanguageMenu />
          </StackItem>
          <Divider
            className="westride-footer-desktop-only"
            orientation="vertical"
          />
          <FooterLink label={ABOUT_LINK.label} href={ABOUT_LINK.href} />
          <Divider
            className="westride-footer-desktop-only"
            orientation="vertical"
          />
          <HStack gap={3} wrap="nowrap" vAlign="center">
            <FooterLink label={TERMS_LINK.label} href={TERMS_LINK.href} />
            {OVERFLOW_LINKS.map((link) => (
              <FooterLink
                key={link.href}
                className="westride-footer-secondary"
                label={link.label}
                href={link.href}
                isExternal={"isExternal" in link && link.isExternal}
              />
            ))}
          </HStack>
          <FooterMore />
          <StackItem size="fill" />
          <HackathonBadge />
        </HStack>
      </LayoutFooter>
    </>
  );
}
