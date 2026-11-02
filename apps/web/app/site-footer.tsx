import Image from "next/image";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Divider } from "@astryxdesign/core/Divider";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
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

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Open Source", href: GITHUB_PROFILE_URL, isExternal: true },
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

.westride-hackathon-logo {
  height: 11px;
  width: auto;
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
          className="westride-hackathon-logo"
          src={META_AI_LOGO}
          alt=""
          width={1084}
          height={209}
          unoptimized
        />
        <Text type="label" size="sm" weight="semibold" textWrap="nowrap">
          {HACKATHON_BADGE_LABEL}
        </Text>
        <Icon icon={ArrowTopRightOnSquareIcon} size="xsm" color="secondary" />
      </HStack>
    </ClickableCard>
  );
}

function LanguageMenu() {
  return (
    <DropdownMenu
      placement="above"
      button={{
        label: LANGUAGES[0].label,
        variant: "ghost",
        size: "sm",
        icon: <Icon icon={GlobeAltIcon} size="sm" />,
      }}
      items={LANGUAGES.map((language) => ({
        id: language.code,
        label: language.label,
      }))}
    />
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
          <LanguageMenu />
          <Divider orientation="vertical" />
          <Link href="/our-story" isStandalone size="sm" color="secondary">
            About WeStride
          </Link>
          <Divider orientation="vertical" />
          <HStack gap={3} wrap="nowrap" vAlign="center">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                isStandalone
                size="sm"
                color="secondary"
                isExternalLink={"isExternal" in link && link.isExternal}
              >
                {link.label}
              </Link>
            ))}
          </HStack>
          <StackItem size="fill" />
          <HackathonBadge />
        </HStack>
      </LayoutFooter>
    </>
  );
}
