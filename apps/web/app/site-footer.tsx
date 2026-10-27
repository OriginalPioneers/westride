import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const HACKATHON_EVENT_NAME = "2026 Meta Global AI Developer Hackathon";
const HACKATHON_EVENT_URL =
  "https://cerebralvalley.ai/e/meta-ai-developer-hackathon";

// Swap these for the real profile URLs when the pages exist.
const FACEBOOK_PROFILE_URL = "https://www.facebook.com/westride";
const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/westride";

const GITHUB_REPOSITORY_URL = "https://github.com/OriginalPioneers/westride";

const FOOTER_LINKS = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "GitHub", href: GITHUB_REPOSITORY_URL, isExternal: true },
  { label: "Facebook", href: FACEBOOK_PROFILE_URL, isExternal: true },
  { label: "Instagram", href: INSTAGRAM_PROFILE_URL, isExternal: true },
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

@keyframes westride-hackathon-sheen {
  0%,
  62% {
    transform: translateX(-130%);
  }
  100% {
    transform: translateX(130%);
  }
}

@keyframes westride-hackathon-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes westride-hackathon-comet {
  0%,
  100% {
    opacity: 0.72;
  }
  50% {
    opacity: 1;
  }
}

.westride-hackathon-badge {
  position: relative;
  isolation: isolate;
  flex-shrink: 0;
  margin-inline-start: auto;
  border-radius: var(--radius-full);
  border: var(--border-width) solid transparent;
  background:
    linear-gradient(
        135deg,
        var(--color-background-blue),
        var(--color-background-purple) 52%,
        var(--color-background-cyan)
      )
      padding-box,
    conic-gradient(
      from var(--westride-hackathon-angle),
      var(--color-border-blue),
      var(--color-border-cyan),
      var(--color-border-purple),
      var(--color-border-pink),
      var(--color-border-yellow),
      var(--color-border-blue)
    )
      border-box;
  box-shadow: 0 0 var(--spacing-1)
    color-mix(in srgb, var(--color-border-blue) 55%, transparent);
  animation: westride-hackathon-spin-angle calc(var(--duration-slow-max) * 10)
    linear infinite;
}

.westride-hackathon-badge::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: linear-gradient(
    105deg,
    transparent 36%,
    color-mix(in srgb, var(--color-on-accent) 42%, transparent) 50%,
    transparent 64%
  );
  transform: translateX(-130%);
  animation: westride-hackathon-sheen calc(var(--duration-slow-max) * 8)
    var(--ease-standard) infinite;
  pointer-events: none;
}

.westride-hackathon-badge:hover {
  animation-duration: calc(var(--duration-slow-max) * 3);
}

.westride-hackathon-mark .orbit,
.westride-hackathon-mark .orbit-reverse {
  transform-box: view-box;
  transform-origin: center;
}

.westride-hackathon-mark .orbit {
  animation: westride-hackathon-orbit calc(var(--duration-slow-max) * 18) linear
    infinite;
}

.westride-hackathon-mark .orbit-reverse {
  animation: westride-hackathon-orbit calc(var(--duration-slow-max) * 26) linear
    infinite reverse;
}

.westride-hackathon-mark .comet {
  transform-box: fill-box;
  transform-origin: center;
  animation: westride-hackathon-comet calc(var(--duration-slow-max) * 2)
    var(--ease-standard) infinite;
}

.westride-hackathon-badge:hover .orbit {
  animation-duration: calc(var(--duration-slow-max) * 6);
}

.westride-hackathon-badge:hover .orbit-reverse {
  animation-duration: calc(var(--duration-slow-max) * 9);
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
          135deg,
          var(--color-background-blue),
          var(--color-background-purple) 52%,
          var(--color-background-cyan)
        )
        padding-box,
      linear-gradient(
          120deg,
          var(--color-border-blue),
          var(--color-border-purple),
          var(--color-border-yellow)
        )
        border-box;
  }

  .westride-hackathon-badge::before,
  .westride-hackathon-mark .orbit,
  .westride-hackathon-mark .orbit-reverse,
  .westride-hackathon-mark .comet {
    animation: none;
  }
}
`;

function HackathonMark() {
  return (
    <svg
      className="westride-hackathon-mark"
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{
        width: "var(--spacing-6)",
        height: "var(--spacing-6)",
        flexShrink: 0,
        overflow: "visible",
      }}
    >
      <defs>
        <filter
          id="westride-hackathon-comet"
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="32" cy="32" r="22" fill="var(--color-icon-blue)" />
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke="var(--color-border-blue)"
        strokeWidth="1.5"
      />
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="var(--color-border-yellow)"
        strokeWidth="1.5"
      />
      <g className="orbit">
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="var(--color-border-purple)"
          strokeWidth="1.25"
          strokeDasharray="2 5"
        />
        <circle
          className="comet"
          cx="32"
          cy="6"
          r="2.6"
          fill="var(--color-border-yellow)"
          filter="url(#westride-hackathon-comet)"
        />
        <circle cx="22.3" cy="7.9" r="1.7" fill="var(--color-border-yellow)" opacity="0.75" />
        <circle cx="15.3" cy="12.1" r="1.15" fill="var(--color-border-yellow)" opacity="0.45" />
      </g>
      <g className="orbit-reverse">
        <circle
          cx="32"
          cy="32"
          r="16"
          fill="none"
          stroke="var(--color-border-cyan)"
          strokeWidth="1.25"
          strokeDasharray="8 14"
        />
        <circle cx="48" cy="32" r="2" fill="var(--color-border-cyan)" />
      </g>
      <polyline
        points="23,42 32,33 43,22"
        fill="none"
        stroke="var(--color-on-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="42" r="2.2" fill="var(--color-border-cyan)" />
      <circle cx="32" cy="33" r="2.2" fill="var(--color-on-accent)" />
      <circle cx="43" cy="22" r="2.6" fill="var(--color-border-yellow)" />
    </svg>
  );
}

function HackathonBadge() {
  return (
    <ClickableCard
      className="westride-hackathon-badge"
      href={HACKATHON_EVENT_URL}
      target="_blank"
      label={`Created during the ${HACKATHON_EVENT_NAME} (opens in a new tab)`}
      padding={1}
      variant="default"
      width="fit-content"
      elevation="none"
    >
      <HStack
        gap={2}
        vAlign="center"
        wrap="nowrap"
        style={{ position: "relative", zIndex: 1 }}
      >
        <HackathonMark />
        <Text type="supporting" size="xsm" textWrap="nowrap">
          Created during
        </Text>
        <Text type="label" size="xsm" weight="semibold" textWrap="nowrap">
          {HACKATHON_EVENT_NAME}
        </Text>
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
            WeStride is an open-source nonprofit.
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
