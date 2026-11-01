import Image from "next/image";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Icon } from "@astryxdesign/core/Icon";
import { LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { STORE_LINKS } from "./store-links";

const HACKATHON_EVENT_NAME = "Meta Global AI Developer Hackathon";
const HACKATHON_EVENT_URL =
  "https://cerebralvalley.ai/e/meta-ai-developer-hackathon";
const HACKATHON_EVENT_LOGO = "/logos/meta-global-ai-developer-hackathon.jpg";
const HACKATHON_BADGE_LABEL = `Built at the 2026 ${HACKATHON_EVENT_NAME}`;

const FACEBOOK_PROFILE_URL = "https://www.facebook.com/WeStrideOrg";
const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/WeStrideOrg";
const THREADS_PROFILE_URL = "https://www.threads.com/@westrideorg";
const X_PROFILE_URL = "https://x.com/WeStrideOrg";
const GITHUB_PROFILE_URL = "https://github.com/WeStrideOrg";

const FOOTER_LINKS = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  ...STORE_LINKS.map((link) => ({ ...link, isExternal: true as const })),
  { label: "GitHub", href: GITHUB_PROFILE_URL, isExternal: true },
  { label: "Facebook", href: FACEBOOK_PROFILE_URL, isExternal: true },
  { label: "Instagram", href: INSTAGRAM_PROFILE_URL, isExternal: true },
  { label: "Threads", href: THREADS_PROFILE_URL, isExternal: true },
  { label: "X", href: X_PROFILE_URL, isExternal: true },
] as const;

const BADGE_STYLES = `
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

.westride-hackathon-badge {
  position: relative;
  flex-shrink: 0;
  margin-inline-start: auto;
  border-radius: var(--radius-full);
  border: var(--border-width) solid transparent;
  box-shadow: 0 0 var(--spacing-4)
    color-mix(in srgb, var(--color-data-categorical-indigo) 35%, transparent);
  background:
    linear-gradient(
        var(--color-background-surface),
        var(--color-background-surface)
      )
      padding-box,
    conic-gradient(
      from var(--westride-hackathon-angle),
      var(--color-data-categorical-indigo),
      var(--color-data-purple-3),
      var(--color-data-blue-3),
      var(--color-data-teal-3),
      var(--color-data-orange-3),
      var(--color-data-categorical-indigo)
    )
      border-box;
  animation: westride-hackathon-spin-angle calc(var(--duration-slow-max) * 6)
    linear infinite;
}

.westride-hackathon-badge:hover {
  animation-duration: calc(var(--duration-slow-max) * 2);
}

.westride-hackathon-logo {
  border-radius: var(--radius-full);
  width: var(--spacing-6);
  height: var(--spacing-6);
  object-fit: cover;
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
          var(--color-data-categorical-indigo),
          var(--color-data-purple-3),
          var(--color-data-teal-3)
        )
        border-box;
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
      <HStack gap={2} vAlign="center" wrap="nowrap" paddingInlineEnd={2}>
        <Image
          className="westride-hackathon-logo"
          src={HACKATHON_EVENT_LOGO}
          alt=""
          width={630}
          height={630}
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

export function SiteFooter() {
  return (
    <>
      <style>{BADGE_STYLES}</style>
      <LayoutFooter
        hasDivider
        padding={2}
        role="contentinfo"
        label="Site"
        style={{
          backgroundColor: "var(--color-background-surface)",
          maxHeight: "calc(var(--spacing-12) + var(--spacing-3))",
        }}
      >
        <HStack
          className="westride-site-footer-row"
          gap={4}
          wrap="nowrap"
          vAlign="center"
        >
          <Text type="supporting" size="sm" textWrap="nowrap">
            WeStride is an open-source project.
          </Text>
          <HStack gap={3} wrap="nowrap" vAlign="center">
            {FOOTER_LINKS.map((link) => (
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
          <HackathonBadge />
        </HStack>
      </LayoutFooter>
    </>
  );
}
