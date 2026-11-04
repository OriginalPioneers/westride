import type { CSSProperties } from "react";

/** The kinds of support, each with the hue the styles give it. */
export type SupportKind = "tokens" | "compute" | "capital";

/** Hands a block the hue of one kind of support, for `--sp-tint`. */
export function kindTint(kind: SupportKind): CSSProperties {
  const pair: Record<SupportKind, [string, string]> = {
    tokens: ["var(--sp-tokens)", "var(--sp-indigo)"],
    compute: ["var(--sp-compute)", "var(--sp-teal)"],
    capital: ["var(--sp-capital)", "var(--sp-yellow)"],
  };
  const [a, b] = pair[kind];
  return { "--sp-tint": a, "--sp-tint-b": b } as CSSProperties;
}

/** Staggers a revealed block by `step` fast beats after its neighbours. */
export function revealDelay(step: number): CSSProperties {
  return { "--sp-delay": `calc(var(--duration-fast-min) * ${step})` } as CSSProperties;
}

/**
 * WePledge™ page motion and decoration. Every value is a theme token so the
 * page retunes with the theme, and every animation stops under
 * prefers-reduced-motion. Rendered once through a <style> element.
 *
 * Class prefix `sp-` keeps this independent of the home landing's `wl-`
 * styles; the two pages share a vocabulary (rise, drift, reveal) but can
 * change on their own.
 */
export const WEPLEDGE_STYLES = `
@keyframes sp-rise {
  from {
    opacity: 0;
    transform: translateY(var(--spacing-6));
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes sp-drift-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(8%, -10%) scale(1.15); }
}

@keyframes sp-drift-b {
  0%, 100% { transform: translate(0, 0) scale(1.05); }
  50% { transform: translate(-10%, 8%) scale(0.92); }
}

@keyframes sp-drift-c {
  0%, 100% { transform: translate(0, 0) scale(0.95); }
  50% { transform: translate(6%, 9%) scale(1.1); }
}

@keyframes sp-shimmer {
  to { background-position: 200% center; }
}

/* Dashes slide along a stream toward the hub: one dash period per cycle, so
   the loop is seamless. */
@keyframes sp-flow {
  to { stroke-dashoffset: calc(-1 * var(--sp-dash-period)); }
}

@keyframes sp-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes sp-orbit {
  to { transform: rotate(360deg); }
}

@keyframes sp-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.35); }
}

@keyframes sp-heartbeat {
  0%, 100% { transform: scale(1); }
  14% { transform: scale(1.08); }
  28% { transform: scale(1); }
  42% { transform: scale(1.06); }
}

@keyframes sp-halo {
  0%, 100% { opacity: 0.45; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.12); }
}

@keyframes sp-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(calc(-1 * var(--spacing-2))); }
}

@keyframes sp-ring-ping {
  0% { opacity: 0.6; transform: scale(0.6); }
  100% { opacity: 0; transform: scale(2.2); }
}

/* The theme publishes the brand palette as --color-brand-*; the extra tints
   this page needs come from the data-visualization ramp. */
.sp-root {
  --sp-indigo: var(--color-brand-indigo);
  --sp-purple: var(--color-brand-purple);
  --sp-blue: var(--color-brand-blue);
  --sp-teal: var(--color-brand-teal);
  --sp-orange: var(--color-brand-orange);
  --sp-green: var(--color-data-categorical-green);
  --sp-yellow: var(--color-data-yellow-3);
  /* Same treatment as the landing eyebrow: categorical purple does not
     lighten in dark mode, so the accent mixes Electric Purple toward the
     primary text color until small text stays readable. */
  --sp-accent: light-dark(
    var(--color-data-categorical-purple),
    color-mix(in srgb, var(--color-brand-purple) 50%, var(--color-text-primary))
  );
  /* One kind, one hue, everywhere on the page. */
  --sp-tokens: var(--sp-blue);
  --sp-compute: var(--sp-green);
  --sp-capital: var(--sp-orange);
}

.sp-root [data-theme="dark"] {
  --sp-accent: color-mix(in srgb, var(--color-brand-purple) 50%, var(--color-text-primary));
}

.sp-root [data-theme="light"] {
  --sp-accent: var(--color-data-categorical-purple);
}

.sp-eyebrow {
  color: var(--sp-accent);
}

/* ---------- Scroll reveal ---------- */

.sp-root[data-js] .sp-reveal {
  opacity: 0;
  transform: translateY(var(--spacing-6));
  transition:
    opacity var(--duration-slow) var(--ease-standard),
    transform var(--duration-slow) var(--ease-standard);
  transition-delay: var(--sp-delay, 0s);
}

.sp-root[data-js] .sp-reveal[data-visible] {
  opacity: 1;
  transform: none;
}

/* ---------- Hero ---------- */

.sp-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: var(--color-background-body);
}

/* A soft brand line closes the hero against the page below. */
.sp-hero::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: var(--border-width);
  background: linear-gradient(90deg, transparent, var(--sp-teal), var(--sp-green), var(--sp-tokens), transparent);
  opacity: 0.7;
}

.sp-hero-sky {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.sp-hero-sky .sp-blob {
  transform-box: fill-box;
  transform-origin: center;
}

.sp-hero-sky .sp-blob-a {
  animation: sp-drift-a calc(var(--duration-slow-max) * 14) var(--ease-standard) infinite;
}

.sp-hero-sky .sp-blob-b {
  animation: sp-drift-b calc(var(--duration-slow-max) * 18) var(--ease-standard) infinite;
}

.sp-hero-sky .sp-blob-c {
  animation: sp-drift-c calc(var(--duration-slow-max) * 16) var(--ease-standard) infinite;
}

.sp-hero .sp-hero-content {
  position: relative;
  z-index: 1;
  padding-inline: var(--spacing-6);
  padding-block: calc(var(--spacing-12) * 1.75) calc(var(--spacing-12) * 1.5);
}

@media (min-width: 64rem) and (min-height: 40rem) {
  .sp-hero .sp-hero-content {
    padding-block: calc(var(--spacing-12) * 2) calc(var(--spacing-12) * 1.75);
  }
}

/* The title is sized from its own column so it wraps to two balanced lines
   and never runs under the flow diagram beside it. */
.sp-hero .sp-hero-copy {
  container-type: inline-size;
  position: relative;
  z-index: 1;
}

.sp-hero .sp-hero-copy .sp-hero-title {
  font-size: clamp(var(--font-size-3xl), 7.2cqw, var(--font-size-5xl));
}

.sp-hero-copy > * {
  animation: sp-rise var(--duration-slow) var(--ease-standard) both;
}

.sp-hero-copy > :nth-child(1) { animation-delay: 0s; }
.sp-hero-copy > :nth-child(2) { animation-delay: var(--duration-fast-min); }
.sp-hero-copy > :nth-child(3) { animation-delay: var(--duration-fast-max); }
.sp-hero-copy > :nth-child(4) { animation-delay: var(--duration-medium-min); }
.sp-hero-copy > :nth-child(5) { animation-delay: var(--duration-medium-max); }

.sp-gradient-text {
  background-image: linear-gradient(
    90deg,
    var(--sp-teal),
    var(--sp-green),
    var(--sp-blue),
    var(--sp-purple),
    var(--sp-teal)
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: sp-shimmer calc(var(--duration-slow-max) * 6) linear infinite;
}

/* ---------- Flow diagram ---------- */

/* Three streams meet at a hub and leave toward the ideas they back. The
   SVG keeps its aspect and spills a little past the column on wide screens
   so it reads as a backdrop, not a figure. */
.sp-flow {
  position: relative;
  width: 100%;
  max-width: calc(var(--spacing-12) * 11);
  aspect-ratio: 1;
  margin-inline: auto;
  animation: sp-rise calc(var(--duration-slow-max) * 1.5) var(--ease-standard) both;
  animation-delay: var(--duration-medium);
}

.sp-flow::before {
  content: "";
  position: absolute;
  inset: 18%;
  z-index: -1;
  border-radius: var(--radius-full);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--sp-teal) 38%, transparent),
    color-mix(in srgb, var(--sp-indigo) 16%, transparent) 55%,
    transparent 72%
  );
  filter: blur(var(--spacing-10));
  animation: sp-halo calc(var(--duration-slow-max) * 5) var(--ease-standard) infinite;
}

.sp-flow svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.sp-flow .sp-stream-rail {
  stroke: var(--color-border-emphasized);
  stroke-opacity: 0.6;
}

.sp-flow .sp-stream {
  --sp-dash-period: 26;
  stroke-dasharray: 8 18;
  stroke-linecap: round;
  animation: sp-flow calc(var(--duration-slow-max) * 1.6) linear infinite;
}

.sp-flow .sp-stream[data-kind="tokens"] { stroke: var(--sp-tokens); }
.sp-flow .sp-stream[data-kind="compute"] { stroke: var(--sp-compute); animation-delay: calc(var(--duration-slow-max) * -0.5); }
.sp-flow .sp-stream[data-kind="capital"] { stroke: var(--sp-capital); animation-delay: calc(var(--duration-slow-max) * -1.1); }
.sp-flow .sp-stream[data-kind="out"] { stroke: var(--sp-purple); animation-duration: calc(var(--duration-slow-max) * 2.2); }

.sp-flow .sp-orbit {
  transform-box: fill-box;
  transform-origin: center;
  fill: none;
  stroke: var(--color-border-emphasized);
  stroke-opacity: 0.7;
  animation: sp-orbit calc(var(--duration-slow-max) * 24) linear infinite;
}

.sp-flow .sp-orbit + .sp-orbit {
  animation-duration: calc(var(--duration-slow-max) * 36);
  animation-direction: reverse;
}

.sp-flow .sp-hub {
  transform-box: fill-box;
  transform-origin: center;
  animation: sp-heartbeat calc(var(--duration-slow-max) * 2.4) var(--ease-standard) infinite;
}

.sp-flow .sp-ring {
  transform-box: fill-box;
  transform-origin: center;
  fill: none;
  stroke: var(--sp-teal);
  animation: sp-ring-ping calc(var(--duration-slow-max) * 2.4) var(--ease-standard) infinite;
}

.sp-flow .sp-ring + .sp-ring {
  animation-delay: calc(var(--duration-slow-max) * 1.2);
}

.sp-flow .sp-node {
  transform-box: fill-box;
  transform-origin: center;
  animation: sp-pulse calc(var(--duration-slow-max) * 2) var(--ease-standard) infinite;
}

.sp-flow .sp-node:nth-of-type(2) { animation-delay: calc(var(--duration-slow) * 0.6); }
.sp-flow .sp-node:nth-of-type(3) { animation-delay: calc(var(--duration-slow) * 1.2); }

.sp-flow .sp-source {
  transform-box: fill-box;
  transform-origin: center;
  animation: sp-float calc(var(--duration-slow-max) * 4) var(--ease-standard) infinite;
}

.sp-flow .sp-source:nth-of-type(2) { animation-delay: calc(var(--duration-slow-max) * -1.3); }
.sp-flow .sp-source:nth-of-type(3) { animation-delay: calc(var(--duration-slow-max) * -2.6); }

.sp-flow .sp-source-label {
  font-family: var(--font-family-body, inherit);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  fill: var(--color-text-secondary);
}

/* ---------- Stat tiles ---------- */

.sp-stat {
  position: relative;
  overflow: hidden;
  height: 100%;
  border-color: var(--color-border);
  background: color-mix(in srgb, var(--color-background-surface) 72%, transparent);
  -webkit-backdrop-filter: blur(var(--spacing-3));
  backdrop-filter: blur(var(--spacing-3));
  animation: sp-rise var(--duration-slow) var(--ease-standard) both;
  animation-delay: calc(var(--duration-medium-max) + var(--duration-fast-min) * var(--sp-i, 0));
  transition:
    transform var(--duration-medium) var(--ease-standard),
    box-shadow var(--duration-medium) var(--ease-standard),
    border-color var(--duration-medium) var(--ease-standard);
}

/* A hairline of the tile's hue along its top edge. */
.sp-stat::before {
  content: "";
  position: absolute;
  inset-inline: 0;
  top: 0;
  height: var(--spacing-0-5);
  background: linear-gradient(90deg, var(--sp-tint), transparent);
  opacity: 0.9;
}

.sp-stat:hover {
  transform: translateY(calc(-1 * var(--spacing-0-5)));
  border-color: color-mix(in srgb, var(--sp-tint) 45%, var(--color-border));
  box-shadow: 0 0 var(--spacing-8) color-mix(in srgb, var(--sp-tint) 25%, transparent);
}

.sp-stat-icon {
  flex-shrink: 0;
  width: var(--spacing-10);
  height: var(--spacing-10);
  border-radius: var(--radius-element);
  color: var(--sp-tint);
  background: color-mix(in srgb, var(--sp-tint) 14%, var(--color-background-surface));
  box-shadow: inset 0 0 0 var(--border-width) color-mix(in srgb, var(--sp-tint) 30%, transparent);
}

.sp-stat-value {
  font-variant-numeric: tabular-nums;
}

/* ---------- Ways band ---------- */

.sp-way {
  height: 100%;
  transition:
    transform var(--duration-medium) var(--ease-standard),
    box-shadow var(--duration-medium) var(--ease-standard),
    border-color var(--duration-medium) var(--ease-standard);
}

.sp-way:hover,
.sp-way:focus-within {
  transform: translateY(calc(-1 * var(--spacing-1)));
  box-shadow: var(--shadow-high);
}

.sp-way[data-active] {
  border-color: color-mix(in srgb, var(--sp-tint) 70%, var(--color-border));
  box-shadow: 0 0 0 var(--border-width) color-mix(in srgb, var(--sp-tint) 70%, transparent), var(--shadow-med);
}

.sp-way-icon {
  width: var(--spacing-12);
  height: var(--spacing-12);
  border-radius: var(--radius-container);
  color: var(--color-on-accent);
  background: linear-gradient(135deg, var(--sp-tint), var(--sp-tint-b));
  box-shadow: 0 var(--spacing-2) var(--spacing-5) color-mix(in srgb, var(--sp-tint) 40%, transparent);
  transition: transform var(--duration-medium) var(--ease-standard);
}

.sp-way:hover .sp-way-icon {
  transform: scale(1.06) rotate(-3deg);
}

/* ---------- Dotted band ---------- */

.sp-dots {
  position: relative;
  isolation: isolate;
}

.sp-dots::before {
  --sp-dot-mask:
    radial-gradient(
      circle,
      black calc(var(--border-width) * 1.5),
      transparent calc(var(--border-width) * 2)
    ) center / var(--spacing-6) var(--spacing-6) repeat,
    radial-gradient(ellipse 70% 65% at 50% 45%, black, transparent)
      center / 100% 100% no-repeat;
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(120deg, var(--sp-teal), var(--sp-green), var(--sp-blue), var(--sp-purple), var(--sp-teal));
  background-size: 300% 300%;
  opacity: 0.3;
  -webkit-mask: var(--sp-dot-mask);
  mask: var(--sp-dot-mask);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}

/* ---------- Dark bands ---------- */

.sp-band {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--sp-teal) 28%, transparent), transparent 55%),
    radial-gradient(ellipse at 85% 100%, color-mix(in srgb, var(--sp-purple) 22%, transparent), transparent 55%),
    var(--color-background-body);
}

@media (prefers-reduced-motion: reduce) {
  .sp-root[data-js] .sp-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .sp-hero-sky .sp-blob,
  .sp-hero-copy > *,
  .sp-gradient-text,
  .sp-flow,
  .sp-flow::before,
  .sp-flow .sp-stream,
  .sp-flow .sp-orbit,
  .sp-flow .sp-hub,
  .sp-flow .sp-node,
  .sp-flow .sp-source,
  .sp-stat,
  .sp-way,
  .sp-way-icon {
    animation: none;
    transition: none;
  }

  .sp-flow .sp-ring {
    animation: none;
    opacity: 0;
  }
}
`;
