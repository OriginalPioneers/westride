/**
 * Landing page motion and decoration. Every value is a theme token so the
 * page retunes with the theme, and every animation stops under
 * prefers-reduced-motion. Rendered once through a <style> element.
 */
export const LANDING_STYLES = `
@property --wl-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes wl-rise {
  from {
    opacity: 0;
    transform: translateY(var(--spacing-6));
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes wl-drift-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(8%, -10%) scale(1.15); }
}

@keyframes wl-drift-b {
  0%, 100% { transform: translate(0, 0) scale(1.05); }
  50% { transform: translate(-10%, 8%) scale(0.92); }
}

@keyframes wl-drift-c {
  0%, 100% { transform: translate(0, 0) scale(0.95); }
  50% { transform: translate(6%, 9%) scale(1.1); }
}

@keyframes wl-spin {
  to { --wl-angle: 360deg; }
}

@keyframes wl-shimmer {
  to { background-position: 200% center; }
}

@keyframes wl-dash {
  to { stroke-dashoffset: 0; }
}

@keyframes wl-travel {
  0% { transform: translateX(0); opacity: 0; }
  8% { opacity: 1; }
  92% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}

@keyframes wl-marquee {
  to { transform: translateX(-50%); }
}

@keyframes wl-marquee-reverse {
  from { transform: translateX(-50%); }
  to { transform: none; }
}

@keyframes wl-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(calc(-1 * var(--spacing-2))); }
}

@keyframes wl-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.4); }
}

/* Stone keeps its semantic colors earthy. The brand stamp's hues live in the
   data-visualization ramp, so the landing's accents alias those tokens. */
.wl-root {
  --wl-indigo: var(--color-data-categorical-indigo);
  --wl-purple: var(--color-data-purple-3);
  --wl-blue: var(--color-data-blue-3);
  --wl-teal: var(--color-data-teal-3);
  --wl-green: var(--color-data-categorical-green);
  --wl-pink: var(--color-data-categorical-pink);
  --wl-orange: var(--color-data-orange-3);
  --wl-yellow: var(--color-data-yellow-3);
  --wl-accent: var(--color-data-categorical-purple);
}

[data-theme="dark"] .wl-root,
.wl-root [data-theme="dark"] {
  --wl-accent: var(--wl-indigo);
}

.wl-eyebrow {
  color: var(--wl-accent);
}

/* ---------- Scroll reveal ---------- */

.wl-root[data-js] .wl-reveal {
  opacity: 0;
  transform: translateY(var(--spacing-6));
  transition:
    opacity var(--duration-slow) var(--ease-standard),
    transform var(--duration-slow) var(--ease-standard);
  transition-delay: var(--wl-delay, 0s);
}

.wl-root[data-js] .wl-reveal[data-visible] {
  opacity: 1;
  transform: none;
}

/* ---------- Hero ---------- */

.wl-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: var(--color-background-body);
}

.wl-hero-sky {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.wl-hero-sky .wl-blob {
  transform-box: fill-box;
  transform-origin: center;
}

.wl-hero-sky .wl-blob-a {
  animation: wl-drift-a calc(var(--duration-slow-max) * 14) var(--ease-standard) infinite;
}

.wl-hero-sky .wl-blob-b {
  animation: wl-drift-b calc(var(--duration-slow-max) * 18) var(--ease-standard) infinite;
}

.wl-hero-sky .wl-blob-c {
  animation: wl-drift-c calc(var(--duration-slow-max) * 16) var(--ease-standard) infinite;
}

.wl-hero-sky .wl-stride {
  stroke-dasharray: 2400;
  stroke-dashoffset: 2400;
  animation: wl-dash calc(var(--duration-slow-max) * 3) var(--ease-standard) forwards;
  animation-delay: var(--duration-medium);
}

.wl-hero-sky .wl-node {
  transform-box: fill-box;
  transform-origin: center;
  animation: wl-pulse calc(var(--duration-slow-max) * 2) var(--ease-standard) infinite;
}

.wl-hero-sky .wl-node:nth-of-type(2) { animation-delay: calc(var(--duration-slow) * 0.5); }
.wl-hero-sky .wl-node:nth-of-type(3) { animation-delay: var(--duration-slow); }
.wl-hero-sky .wl-node:nth-of-type(4) { animation-delay: calc(var(--duration-slow) * 1.5); }
.wl-hero-sky .wl-node:nth-of-type(5) { animation-delay: calc(var(--duration-slow) * 2); }

.wl-hero-content {
  position: relative;
  z-index: 1;
}

.wl-hero-content > * {
  animation: wl-rise var(--duration-slow) var(--ease-standard) both;
}

.wl-hero-content > :nth-child(1) { animation-delay: 0s; }
.wl-hero-content > :nth-child(2) { animation-delay: var(--duration-fast-min); }
.wl-hero-content > :nth-child(3) { animation-delay: var(--duration-fast-max); }
.wl-hero-content > :nth-child(4) { animation-delay: var(--duration-medium-min); }
.wl-hero-content > :nth-child(5) { animation-delay: var(--duration-medium-max); }
.wl-hero-content > :nth-child(6) { animation-delay: var(--duration-slow-min); }

.wl-stamp {
  animation: wl-float calc(var(--duration-slow-max) * 4) var(--ease-standard) infinite;
  filter: drop-shadow(0 var(--spacing-2) var(--spacing-6) color-mix(in srgb, var(--wl-purple) 45%, transparent));
}

.wl-gradient-text {
  background-image: linear-gradient(
    90deg,
    var(--wl-indigo),
    var(--wl-purple),
    var(--wl-blue),
    var(--wl-teal),
    var(--wl-indigo)
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: wl-shimmer calc(var(--duration-slow-max) * 6) linear infinite;
}

/* Animated conic border, shared with the hackathon pill and feature frames. */
.wl-glow-border {
  position: relative;
  border: var(--border-width) solid transparent;
  background:
    linear-gradient(var(--color-background-surface), var(--color-background-surface)) padding-box,
    conic-gradient(
      from var(--wl-angle),
      var(--wl-indigo),
      var(--wl-purple),
      var(--wl-blue),
      var(--wl-teal),
      var(--wl-orange),
      var(--wl-indigo)
    ) border-box;
  animation: wl-spin calc(var(--duration-slow-max) * 6) linear infinite;
}

.wl-glow-border:hover {
  animation-duration: calc(var(--duration-slow-max) * 2);
}

.wl-pill {
  border-radius: var(--radius-full);
  box-shadow: 0 0 var(--spacing-4) color-mix(in srgb, var(--wl-indigo) 35%, transparent);
}

.wl-pill-logo {
  border-radius: var(--radius-full);
  width: var(--spacing-6);
  height: var(--spacing-6);
  object-fit: cover;
}

.wl-stat-value {
  font-variant-numeric: tabular-nums;
}

/* ---------- Path ---------- */

.wl-track {
  display: block;
  width: 100%;
  height: var(--spacing-4);
  overflow: visible;
}

.wl-track .wl-rail {
  stroke: var(--color-border-emphasized);
}

.wl-track .wl-glow {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
}

.wl-reveal[data-visible] .wl-track .wl-glow,
.wl-root:not([data-js]) .wl-track .wl-glow {
  animation: wl-dash calc(var(--duration-slow-max) * 2) var(--ease-standard) forwards;
}

.wl-track .wl-runner {
  transform-box: view-box;
  animation: wl-travel calc(var(--duration-slow-max) * 5) linear infinite;
}

.wl-step {
  height: 100%;
  transition:
    transform var(--duration-medium) var(--ease-standard),
    box-shadow var(--duration-medium) var(--ease-standard);
}

.wl-step:hover,
.wl-step:focus-within {
  transform: translateY(calc(-1 * var(--spacing-1)));
  box-shadow: var(--shadow-high);
}

.wl-step-icon {
  width: var(--spacing-12);
  height: var(--spacing-12);
  border-radius: var(--radius-container);
  color: var(--color-on-accent);
  background: linear-gradient(135deg, var(--wl-tint-a), var(--wl-tint-b));
  box-shadow: 0 var(--spacing-2) var(--spacing-5) color-mix(in srgb, var(--wl-tint-a) 40%, transparent);
  transition: transform var(--duration-medium) var(--ease-standard);
}

.wl-step:hover .wl-step-icon {
  transform: scale(1.06) rotate(-3deg);
}

/* ---------- Feature cards ---------- */

.wl-feature {
  height: 100%;
  transition:
    transform var(--duration-medium) var(--ease-standard),
    box-shadow var(--duration-medium) var(--ease-standard);
}

.wl-feature:hover {
  transform: translateY(calc(-1 * var(--spacing-1)));
  box-shadow: var(--shadow-med);
}

.wl-feature-icon {
  width: var(--spacing-10);
  height: var(--spacing-10);
  border-radius: var(--radius-element);
  background: var(--color-background-surface);
  color: var(--wl-tint, var(--wl-indigo));
  box-shadow: var(--shadow-low);
}

/* ---------- Integrations ---------- */

.wl-integration {
  height: 100%;
  transition:
    transform var(--duration-medium) var(--ease-standard),
    box-shadow var(--duration-medium) var(--ease-standard);
}

.wl-integration:hover,
.wl-integration:focus-within {
  transform: translateY(calc(-1 * var(--spacing-1)));
  box-shadow: var(--shadow-med);
}

.wl-logo-tile {
  flex-shrink: 0;
}

.wl-logo-tile img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ---------- Marquee ---------- */

.wl-marquee {
  overflow: hidden;
  width: 100%;
  -webkit-mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
}

.wl-marquee-track {
  width: max-content;
  animation: wl-marquee calc(var(--duration-slow-max) * 36) linear infinite;
}

.wl-marquee-track[data-direction="reverse"] {
  animation-name: wl-marquee-reverse;
}

.wl-marquee:hover .wl-marquee-track {
  animation-play-state: paused;
}

.wl-marquee-group {
  padding-inline-end: var(--spacing-4);
}

/* ---------- Dark bands ---------- */

.wl-band {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background:
    radial-gradient(
      ellipse at 20% 0%,
      color-mix(in srgb, var(--wl-indigo) 28%, transparent),
      transparent 55%
    ),
    radial-gradient(
      ellipse at 85% 100%,
      color-mix(in srgb, var(--wl-teal) 22%, transparent),
      transparent 55%
    ),
    var(--color-background-body);
}

.wl-code {
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .wl-root[data-js] .wl-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .wl-hero-sky .wl-blob,
  .wl-hero-sky .wl-node,
  .wl-hero-content > *,
  .wl-stamp,
  .wl-gradient-text,
  .wl-glow-border,
  .wl-track .wl-runner,
  .wl-marquee-track,
  .wl-step,
  .wl-step-icon,
  .wl-feature,
  .wl-integration {
    animation: none;
    transition: none;
  }

  .wl-hero-sky .wl-stride,
  .wl-track .wl-glow {
    animation: none;
    stroke-dashoffset: 0;
  }

  .wl-track .wl-runner {
    opacity: 0;
  }

  .wl-glow-border {
    background:
      linear-gradient(var(--color-background-surface), var(--color-background-surface)) padding-box,
      linear-gradient(120deg, var(--wl-indigo), var(--wl-purple), var(--wl-teal)) border-box;
  }
}
`;
