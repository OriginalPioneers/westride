/**
 * Landing page motion and decoration. Every value is a theme token so the
 * page retunes with the theme, and every animation stops under
 * prefers-reduced-motion. Rendered once through a <style> element.
 */
export const LANDING_STYLES = `
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

/* A streak crosses the sky in the first few percent of its cycle, then waits
   out the rest, so each star is a brief, occasional event. Percentages are of
   the streak's own box, which keeps the travel parallel to its tail. */
@keyframes wl-shoot {
  0% { opacity: 0; transform: translate(0, 0); }
  1% { opacity: 1; }
  4% { opacity: 1; }
  7%, 100% { opacity: 0; transform: translate(-260%, 260%); }
}

/* A wave slides sideways by exactly one of its own periods (set per path as
   --wl-flow, a fraction of the path's width), so the loop never shows a
   seam. Reversed layers run the same distance the other way. */
@keyframes wl-flow {
  from { transform: translateX(0); }
  to { transform: translateX(calc(-1 * var(--wl-flow))); }
}

@keyframes wl-flow-reverse {
  from { transform: translateX(calc(-1 * var(--wl-flow))); }
  to { transform: translateX(0); }
}

/* A pool of light wanders over the grid, lower left to upper right and
   back, lighting the lines it passes. */
@keyframes wl-sweep {
  0% { transform: translate(220px, 640px); }
  50% { transform: translate(1180px, 160px); }
  100% { transform: translate(220px, 640px); }
}

/* A short dash travels the length of a connection (normalised to 1000 by
   pathLength), then waits out the rest of its cycle at the far end. */
@keyframes wl-net-pulse {
  0% { stroke-dashoffset: 1000; opacity: 0; }
  4% { opacity: 1; }
  36% { opacity: 1; }
  40%, 100% { stroke-dashoffset: 0; opacity: 0; }
}

@keyframes wl-shot-in {
  from {
    opacity: 0;
    transform: perspective(1600px) rotateY(-10deg) translateX(var(--spacing-8)) scale(0.96);
  }
  to {
    opacity: 1;
    transform: perspective(1600px) rotateY(-5deg) translateX(0) scale(1);
  }
}

@keyframes wl-dots-drift {
  from { background-position: 0% 50%; }
  to { background-position: 100% 50%; }
}

@keyframes wl-globe-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: none; }
}

/* The active hero tab's rail fills over one dwell; when it ends the next
   section takes over, so the rail and the rotation can never drift apart. */
@keyframes wl-tab-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* The hero's scene colors are registered so a change of section eases from
   one color to the next instead of cutting. Every gradient that reads them
   (sky blobs, stride, wave, globe halo) follows the eased value. Where
   @property is unsupported the colors still change, only at once. */
@property --wl-scene-a {
  syntax: "<color>";
  inherits: true;
  initial-value: transparent;
}

@property --wl-scene-b {
  syntax: "<color>";
  inherits: true;
  initial-value: transparent;
}

/* The theme keeps its semantic colors earthy and publishes the brand palette
   as --color-brand-*. The stamp's hues alias those; the extra tints the
   landing needs come from the data-visualization ramp. */
.wl-root {
  --wl-indigo: var(--color-brand-indigo);
  --wl-purple: var(--color-brand-purple);
  --wl-blue: var(--color-brand-blue);
  --wl-teal: var(--color-brand-teal);
  --wl-orange: var(--color-brand-orange);
  --wl-green: var(--color-data-categorical-green);
  --wl-pink: var(--color-data-categorical-pink);
  --wl-yellow: var(--color-data-yellow-3);
  /* Categorical purple is one deep hue in both schemes, so on a dark field
     it drops under the contrast small text needs. Dark mode mixes Electric
     Purple halfway toward the primary text color, which stays purple and
     clears the body, cards, and pastel fields. */
  --wl-accent: light-dark(
    var(--color-data-categorical-purple),
    color-mix(in srgb, var(--color-brand-purple) 50%, var(--color-text-primary))
  );
}

/* A nested theme resolves its own scheme. The variable above is computed on
   the page root, so a dark band inside a light page (and the reverse) sets
   it again. */
.wl-root [data-theme="dark"] {
  --wl-accent: color-mix(in srgb, var(--color-brand-purple) 50%, var(--color-text-primary));
}

.wl-root [data-theme="light"] {
  --wl-accent: var(--color-data-categorical-purple);
}

.wl-eyebrow {
  color: var(--wl-accent);
}

/* A pastel field. The element sets --wl-pastel to one of the theme's
   --color-brand-pastel-* tokens; Periwinkle is the default. Pair it with a
   transparent Card variant so no border or card background competes. */
.wl-pastel {
  background: var(--wl-pastel, var(--color-brand-pastel-indigo));
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

/* The bottom edge is a wave rather than a straight line: the mask keeps
   everything above a curve that swings either side of a midline half a
   wave height above the box's bottom. HeroWave traces the same curve. */
.wl-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  /* The active section sets --wl-scene-a and -b inline (see sceneVars).
     The third scene color stays anchored on teal, with a lean toward the
     section, so the sky keeps one hue in common from section to section. */
  --wl-scene-c: color-mix(in srgb, var(--wl-scene-b) 45%, var(--wl-teal));
  /* A faint wash under the sky, so the whole field warms or cools with the
     section rather than only the blobs. */
  background:
    radial-gradient(
      ellipse 70% 60% at 22% 18%,
      color-mix(in srgb, var(--wl-scene-a) 9%, transparent),
      transparent 70%
    ),
    radial-gradient(
      ellipse 60% 70% at 82% 40%,
      color-mix(in srgb, var(--wl-scene-b) 7%, transparent),
      transparent 70%
    ),
    var(--color-background-body);
  transition:
    --wl-scene-a calc(var(--duration-slow-max) * 2) var(--ease-standard),
    --wl-scene-b calc(var(--duration-slow-max) * 2) var(--ease-standard);
  --wl-wave-mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 48' preserveAspectRatio='none'%3E%3Cpath d='M0 24C120 50.67 240 50.67 360 24C480 -2.67 600 -2.67 720 24C840 50.67 960 50.67 1080 24C1200 -2.67 1320 -2.67 1440 24V0H0Z'/%3E%3C/svg%3E")
      bottom / 100% var(--wl-wave) no-repeat,
    linear-gradient(black, black)
      top / 100% calc(100% - var(--wl-wave) + var(--border-width)) no-repeat;
  -webkit-mask: var(--wl-wave-mask);
  mask: var(--wl-wave-mask);
}

.wl-hero-wave {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: 0;
  width: 100%;
  height: calc(var(--wl-wave) * 5);
  overflow: hidden;
  pointer-events: none;
}

/* Each layer is wider than the box and slides by one period (see
   HeroWave), so the percentages are of the path's own box. */
.wl-hero-wave .wl-wave-flow {
  transform-box: fill-box;
  animation: wl-flow var(--wl-flow-time) linear infinite;
}

.wl-hero-wave .wl-wave-flow[data-reversed] {
  animation-name: wl-flow-reverse;
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

/* The lit grid shows only through this wandering pool of light. */
.wl-hero-sky .wl-sweep {
  transform-box: view-box;
  animation: wl-sweep calc(var(--duration-slow-max) * 34) var(--ease-standard) infinite;
}

/* Connections draw themselves in once, staggered, then their pulses run. */
.wl-hero-sky .wl-net-link {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: wl-dash calc(var(--duration-slow-max) * 2.5) var(--ease-standard) forwards;
  animation-delay: calc(var(--duration-medium) + var(--duration-fast-max) * var(--wl-i, 0));
}

.wl-hero-sky .wl-net-pulse {
  opacity: 0;
  stroke-dasharray: 28 972;
  stroke-dashoffset: 1000;
  animation: wl-net-pulse calc(var(--duration-slow-max) * var(--wl-pulse-cycle, 8)) ease-in-out infinite;
  animation-delay: calc(var(--duration-slow-max) * (2 + var(--wl-pulse-delay, 0)));
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
.wl-hero-sky .wl-node:nth-of-type(6) { animation-delay: calc(var(--duration-slow) * 2.5); }
.wl-hero-sky .wl-node:nth-of-type(7) { animation-delay: calc(var(--duration-slow) * 3); }

.wl-hero-sky .wl-shooting-star {
  opacity: 0;
  transform-box: fill-box;
  animation: wl-shoot calc(var(--duration-slow-max) * var(--wl-star-cycle)) linear infinite;
  animation-delay: calc(var(--duration-slow-max) * var(--wl-star-delay));
}

.wl-hero .wl-hero-content {
  position: relative;
  z-index: 1;
  padding-inline: var(--spacing-6);
  padding-block: calc(var(--spacing-12) * 2.25) calc(var(--spacing-12) * 3);
}

/* On a large screen the hero fills what the scroll area shows (the viewport
   less the one-row site footer), less the lower half of the carry bar, so
   the whole bar is on screen. The bar's upper half covers extra bottom
   padding. The globe shrinks on shorter windows so the cards still fit. */
@media (min-width: 64rem) and (min-height: 40rem) {
  .wl-hero .wl-hero-content {
    --wl-hero-pad: var(--spacing-10);
    --wl-carry-half: var(--spacing-10);
    justify-content: center;
    padding-block: var(--wl-hero-pad)
      calc(var(--wl-hero-pad) + var(--wl-carry-half));
    min-height: calc(
      100dvh - var(--spacing-12) - var(--border-width) - var(--wl-hero-pad) * 2 -
        var(--wl-carry-half) * 2
    );
  }

}

/* Side by side (the Grid goes to two columns once both fit 484px), the
   stage takes the larger share so the platform preview reads, and the
   copy takes the rest. Grid exposes its template through this variable,
   set inline, so the override has to be important. */
.wl-hero .wl-hero-content {
  container-type: inline-size;
}

@container (min-width: 62.5rem) {
  .wl-hero .wl-hero-split {
    --x-gridTemplateColumns: minmax(0, 0.8fr) minmax(calc(var(--spacing-12) * 13), 1.2fr) !important;
  }
}

@media (min-width: 64rem) and (min-height: 40rem) and (max-height: 56rem) {
  .wl-hero .wl-hero-content {
    --wl-hero-pad: var(--spacing-6);
  }

  .wl-hero .wl-wordmark {
    width: min(100%, calc(var(--spacing-12) * 5));
  }
}

/* ---------- Hero stage: platform preview and tabs ---------- */

.wl-hero-stage {
  position: relative;
  z-index: 1;
  width: 100%;
  min-width: 0;
}

.wl-hero-stage-row {
  width: 100%;
  min-width: 0;
}

.wl-hero-stage-shot {
  min-width: 0;
  /* In front of the tabs, which tuck in behind its right edge. */
  position: relative;
  z-index: 1;
}

/* The stand: two tilted panels behind the screenshot give it depth, and a
   pool of the section's light sits behind both. */
.wl-hero-shot-stand {
  position: relative;
  width: 100%;
  animation: wl-shot-in calc(var(--duration-slow-max) * 1.4) var(--ease-standard) both;
  animation-delay: var(--duration-medium-min);
  transform: perspective(1600px) rotateY(-5deg);
  transform-style: preserve-3d;
  transition: transform var(--duration-slow) var(--ease-standard);
}

.wl-hero-shot-stand:hover {
  transform: perspective(1600px) rotateY(-2deg);
}

.wl-hero-shot-stand::before,
.wl-hero-shot-stand::after {
  content: "";
  position: absolute;
  z-index: -1;
  border-radius: calc(var(--radius-container) * 1.5);
  pointer-events: none;
}

/* The far panel: larger, leaning the other way, mostly light. */
.wl-hero-shot-stand::before {
  inset: -7% -4% 8% -3%;
  transform: rotate(-3.5deg);
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--wl-scene-a) 34%, transparent),
    color-mix(in srgb, var(--wl-scene-b) 14%, transparent) 55%,
    transparent
  );
  border: var(--border-width) solid color-mix(in srgb, var(--wl-scene-a) 28%, transparent);
  filter: blur(var(--border-width));
}

/* The near panel: a frosted sheet just behind the screenshot. */
.wl-hero-shot-stand::after {
  inset: 4% -2% -4% 3%;
  transform: rotate(2deg);
  background: color-mix(in srgb, var(--color-background-surface) 55%, transparent);
  border: var(--border-width) solid color-mix(in srgb, var(--color-border) 70%, transparent);
  box-shadow: 0 var(--spacing-6) var(--spacing-12) color-mix(in srgb, var(--wl-scene-a) 22%, transparent);
}

.wl-hero-shot {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: var(--radius-container);
  border: var(--border-width) solid color-mix(in srgb, var(--color-border-emphasized) 80%, var(--wl-scene-b));
  background: var(--color-background-body);
  box-shadow:
    0 var(--spacing-8) calc(var(--spacing-12) * 1.5) color-mix(in srgb, black 55%, transparent),
    0 0 0 var(--border-width) color-mix(in srgb, var(--wl-scene-b) 20%, transparent),
    0 0 var(--spacing-12) color-mix(in srgb, var(--wl-scene-a) 28%, transparent);
}

/* A thin highlight along the top edge, as if lit from above. */
.wl-hero-shot::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-text-primary) 10%, transparent),
    transparent 18%
  );
}

/* All pictures share one cell; the active one shows, the rest wait. */
.wl-hero-shot > .wl-hero-shot-image {
  grid-area: 1 / 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  opacity: 0;
  transform: scale(1.02);
  transition:
    opacity var(--duration-slow) var(--ease-standard),
    transform var(--duration-slow) var(--ease-standard);
}

.wl-hero-shot > .wl-hero-shot-image[data-active] {
  opacity: 1;
  transform: none;
}

/* ---------- Globe placement ---------- */

/* An atmospheric element rather than the subject: anchored to the hero's
   lower right corner, cropped by the hero's edges, behind the waves and
   everything in the content column. The section sets how close it sits
   (see sceneVars); the scale property composes with the entry animation's
   transform, so neither fights the other. */
.wl-hero .wl-globe {
  /* Sized from the hero's width so the same share of the sphere shows at
     every size: its centre sits just past the right edge, a little above
     the bottom, so the upper left of the globe rises into the stage. */
  --wl-globe-size: clamp(calc(var(--spacing-12) * 9), 50vw, calc(var(--spacing-12) * 19));
  position: absolute;
  right: calc(var(--wl-globe-size) * -0.3);
  bottom: calc(var(--wl-globe-size) * -0.44);
  z-index: 0;
  width: var(--wl-globe-size);
  max-width: none;
  margin: 0;
  scale: var(--wl-globe-scale, 1);
  transform-origin: 74% 90%;
  pointer-events: none;
  transition: scale calc(var(--duration-slow-max) * 2) var(--ease-standard);
}

.wl-hero .wl-globe-tilt {
  width: 100%;
  height: 100%;
  rotate: -45deg;
}

.wl-hero .wl-globe-canvas {
  pointer-events: auto;
}

/* On a phone the globe is a glow at the corner behind the stage. */
@media (max-width: 63.99rem) {
  .wl-hero .wl-globe {
    --wl-globe-size: clamp(calc(var(--spacing-12) * 8), 90vw, calc(var(--spacing-12) * 14));
    opacity: 0.6;
  }
}

/* The title is sized from its own column, so it wraps to two balanced
   lines at most and never runs under the tabs beside it. */
.wl-hero .wl-hero-copy {
  container-type: inline-size;
  /* Above the globe, which can spill under this column, so links stay clickable. */
  position: relative;
  z-index: 1;
}

.wl-hero .wl-hero-copy .wl-hero-title {
  font-size: clamp(var(--font-size-3xl), 11cqw, calc(var(--font-size-5xl) * 1.6));
  line-height: 1.04;
  letter-spacing: -0.02em;
}

/* One button, one quiet link under it. The link is plain text in the
   body color so nothing competes with the button. */
.wl-hero .wl-hero-link {
  text-underline-offset: 0.2em;
  text-decoration-color: color-mix(in srgb, var(--color-text-primary) 55%, transparent);
  transition: text-decoration-color var(--duration-medium) var(--ease-standard);
}

.wl-hero .wl-hero-link:hover {
  text-decoration-color: var(--wl-scene-b);
}

/* ---------- Hero panels ---------- */

/* Every panel shares one grid cell, so the column is as tall as the
   tallest panel and nothing below it jumps when the section changes. The
   outgoing panel fades first; the incoming one rises in behind it. */
.wl-hero-panels {
  width: 100%;
  max-width: calc(var(--spacing-12) * 14);
}

.wl-hero-panels > .wl-hero-panel {
  grid-area: 1 / 1;
  align-self: start;
  width: 100%;
  box-sizing: border-box;
  opacity: 0;
  visibility: hidden;
  transform: translateY(var(--spacing-3));
  transition:
    opacity var(--duration-medium) var(--ease-standard),
    transform var(--duration-medium) var(--ease-standard),
    visibility 0s linear var(--duration-medium);
}

.wl-hero-panels > .wl-hero-panel[data-active] {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition-delay: var(--duration-fast-min), var(--duration-fast-min), 0s;
}

.wl-hero-copy > * {
  animation: wl-rise var(--duration-slow) var(--ease-standard) both;
}

.wl-hero-copy > :nth-child(1) { animation-delay: 0s; }
.wl-hero-copy > :nth-child(2) { animation-delay: var(--duration-fast-min); }
.wl-hero-copy > :nth-child(3) { animation-delay: var(--duration-fast-max); }
.wl-hero-copy > :nth-child(4) { animation-delay: var(--duration-medium-min); }
.wl-hero-copy > :nth-child(5) { animation-delay: var(--duration-medium-max); }
.wl-hero-copy > :nth-child(6) { animation-delay: var(--duration-slow-min); }

/* ---------- Hero tabs ---------- */

/* The four section tabs stand in one column beside the platform preview.
   Side by side they tuck in behind its right edge and peek out; stacked
   on a phone they form a two-by-two grid under it. The import bar sits
   under the stage and is not a carousel tab. */
.wl-hero .wl-hero-tabs {
  --wl-hero-dwell: calc(var(--duration-slow-max) * 6);
  /* How far each tab hides behind the preview, and how far the active one
     pulls out from the stack. */
  --wl-tab-tuck: var(--spacing-12);
  --wl-tab-reach: var(--spacing-3);
  position: relative;
  z-index: 0;
  flex: 0 0 auto;
  width: calc(var(--spacing-12) * 5.5);
  min-width: 0;
}

.wl-hero .wl-hero-tab {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  -webkit-user-select: none;
  user-select: none;
  border-radius: var(--radius-container);
  border-color: color-mix(in srgb, var(--color-border) 80%, transparent);
  background: color-mix(in srgb, var(--color-background-surface) 78%, transparent);
  -webkit-backdrop-filter: blur(var(--spacing-3));
  backdrop-filter: blur(var(--spacing-3));
  box-shadow: 0 var(--spacing-2) var(--spacing-6) color-mix(in srgb, black 35%, transparent);
  animation: wl-rise var(--duration-slow) var(--ease-standard) both;
  animation-delay: calc(var(--duration-medium-max) + var(--duration-fast-min) * var(--wl-i, 0));
  transition:
    background-color var(--duration-medium) var(--ease-standard),
    border-color var(--duration-medium) var(--ease-standard),
    box-shadow var(--duration-medium) var(--ease-standard),
    translate var(--duration-medium) var(--ease-standard);
}

.wl-hero .wl-hero-tab:hover {
  border-color: color-mix(in srgb, var(--wl-tint-a) 50%, var(--color-border));
  background: color-mix(in srgb, var(--wl-tint-a) 10%, var(--color-background-surface));
  translate: var(--wl-tab-reach) 0;
}

/* The active tab fills with its gradient, lifts, and steps out of line. */
.wl-hero .wl-hero-tab[data-active] {
  --_card-ring: inset 0 0 0 var(--border-width) color-mix(in srgb, var(--color-text-primary) 20%, transparent);
  z-index: 1;
  border-color: color-mix(in srgb, var(--wl-tint-b) 60%, var(--color-border));
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--wl-tint-a) 82%, var(--color-background-surface)),
    color-mix(in srgb, var(--wl-tint-b) 72%, var(--color-background-surface))
  );
  box-shadow:
    0 var(--spacing-3) var(--spacing-8) color-mix(in srgb, var(--wl-tint-a) 40%, transparent),
    0 0 0 var(--border-width) color-mix(in srgb, var(--wl-tint-a) 40%, transparent);
  translate: calc(var(--wl-tab-reach) * 2) 0;
}

.wl-hero .wl-hero-tab[data-active] .wl-hero-tab-label {
  color: var(--color-on-accent);
}

.wl-hero-tab-label {
  min-width: 0;
  line-height: 1.2;
  transition: color var(--duration-medium) var(--ease-standard);
}

.wl-hero-tab-icon {
  flex-shrink: 0;
  width: var(--spacing-9);
  height: var(--spacing-9);
  border-radius: var(--radius-element);
  color: var(--wl-tint-a);
  background: color-mix(in srgb, var(--wl-tint-a) 12%, var(--color-background-surface));
  box-shadow: inset 0 0 0 var(--border-width) color-mix(in srgb, var(--wl-tint-a) 30%, transparent);
  transition:
    background var(--duration-medium) var(--ease-standard),
    color var(--duration-medium) var(--ease-standard),
    box-shadow var(--duration-medium) var(--ease-standard),
    transform var(--duration-medium) var(--ease-standard);
}

.wl-hero .wl-hero-tab:hover .wl-hero-tab-icon {
  transform: scale(1.05);
}

.wl-hero .wl-hero-tab[data-active] .wl-hero-tab-icon {
  color: var(--color-on-accent);
  background: color-mix(in srgb, var(--color-text-primary) 18%, transparent);
  box-shadow: inset 0 0 0 var(--border-width) color-mix(in srgb, var(--color-text-primary) 30%, transparent);
  transform: scale(1.06) rotate(-3deg);
}

/* Import is one short pill under the stage: a smaller icon, no progress
   rail, and it never takes a turn in the rotation or steps out of line. */
.wl-hero .wl-hero-import-bar {
  width: auto;
  border-radius: var(--radius-full);
  translate: none;
}

.wl-hero .wl-hero-import-bar .wl-hero-tab-icon {
  width: var(--spacing-7);
  height: var(--spacing-7);
  border-radius: var(--radius-full);
}

.wl-hero .wl-hero-import-bar:hover .wl-hero-tab-icon,
.wl-hero .wl-hero-import-bar[data-active] .wl-hero-tab-icon {
  transform: none;
}

.wl-hero-import-bar .wl-hero-tab-body::after {
  content: none;
}

/* The progress rail along the bottom edge of the active tab. It belongs
   to the body, not the card: the card's own pseudo-element paints press
   feedback. */
.wl-hero-tab-body {
  position: static;
}

.wl-hero-tab-body::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: var(--spacing-0-5);
  transform: scaleX(0);
  transform-origin: left center;
  background: linear-gradient(90deg, var(--wl-tint-a), var(--wl-tint-b));
  pointer-events: none;
}

.wl-hero-tabs[data-autoplay] .wl-hero-tab[data-active] .wl-hero-tab-body::after {
  animation: wl-tab-progress var(--wl-hero-dwell) linear forwards;
}

/* Hovering or focusing the tabs holds the rail, and with it the rotation. */
.wl-hero-tabs[data-autoplay]:hover .wl-hero-tab[data-active] .wl-hero-tab-body::after,
.wl-hero-tabs[data-autoplay]:focus-within .wl-hero-tab[data-active] .wl-hero-tab-body::after {
  animation-play-state: paused;
}

.wl-hero .wl-hero-import-bar:hover {
  translate: none;
}

/* Side by side, the tab column slides in under the preview's right edge
   by the tuck, so each tab peeks out from behind it, and the stage leaves
   room on the right for the active tab to step out. After the base rules
   above so it wins on order. */
@container (min-width: 62.5rem) {
  .wl-hero .wl-hero-tabs {
    margin-inline-start: calc(-1 * var(--wl-tab-tuck));
    padding-inline-end: calc(var(--wl-tab-reach) * 2);
  }

  .wl-hero .wl-hero-tab .wl-hero-tab-body {
    padding-inline-start: var(--wl-tab-tuck);
  }
}

/* Stacked under the preview, the tabs form a two-by-two grid with
   nothing hidden, and the active one no longer steps out of line. */
@container (max-width: 62.49rem) {
  .wl-hero .wl-hero-stage-row {
    flex-wrap: wrap;
    gap: var(--spacing-4);
  }

  .wl-hero .wl-hero-stage-shot {
    flex-basis: 100%;
  }

  .wl-hero .wl-hero-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .wl-hero .wl-hero-tab,
  .wl-hero .wl-hero-tab[data-active],
  .wl-hero .wl-hero-tab:hover {
    translate: none;
  }

  .wl-hero .wl-hero-shot-stand,
  .wl-hero .wl-hero-shot-stand:hover {
    transform: none;
  }
}

/* ---------- Carry bar ---------- */

/* The bar sits outside the hero, which clips its overflow, and is centred
   on the midline of the hero's wavy bottom edge, half over the hero and
   half over the section below. Frosted like the hero tabs so the sky shows
   through it. */
.wl-hero-frame {
  --wl-wave: var(--spacing-12);
  position: relative;
}

.wl-hero-frame > .wl-carry {
  position: absolute;
  top: calc(100% - var(--wl-wave) / 2);
  left: 50%;
  translate: -50% -50%;
  z-index: 2;
  width: calc(100% - var(--spacing-6) * 2);
  box-sizing: border-box;
  padding: var(--spacing-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-container);
  background: color-mix(in srgb, var(--color-background-surface) 90%, transparent);
  -webkit-backdrop-filter: blur(var(--spacing-3));
  backdrop-filter: blur(var(--spacing-3));
  box-shadow: var(--shadow-high);
  animation: wl-rise var(--duration-slow) var(--ease-standard) both;
  animation-delay: var(--duration-slow-min);
}

/* The label takes its own line until the row is wide enough to sit beside
   the tiles, so a phone does not get a tall stack next to a short label. */
.wl-carry-label {
  flex: 1 0 100%;
}

/* On one row the bar becomes a pill, and its tiles follow its curve. */
@media (min-width: 64rem) {
  .wl-carry-label {
    flex: 0 1 auto;
  }
  .wl-hero-frame > .wl-carry {
    padding: var(--spacing-2) var(--spacing-2) var(--spacing-2) var(--spacing-6);
    border-radius: var(--radius-full);
  }

  .wl-carry .wl-app-tile,
  .wl-carry .wl-platform-tile {
    --_card-radius: var(--radius-full);
  }
}

/* ---------- Carry tiles ---------- */

.wl-app-tile,
.wl-platform-tile {
  height: 100%;
  background: var(--color-background-surface);
  transition:
    transform var(--duration-medium) var(--ease-standard),
    box-shadow var(--duration-medium) var(--ease-standard);
}

.wl-app-tile:hover,
.wl-app-tile:focus-within,
.wl-platform-tile:hover,
.wl-platform-tile:focus-within {
  transform: translateY(calc(-1 * var(--spacing-0-5)));
  box-shadow: var(--shadow-med);
}

/* ---------- Globe ---------- */

.wl-globe {
  position: relative;
  width: 100%;
  max-width: calc(var(--spacing-12) * 11);
  aspect-ratio: 1;
  margin-inline: auto;
  animation: wl-globe-in calc(var(--duration-slow-max) * 1.5) var(--ease-standard) both;
  animation-delay: var(--duration-medium);
}

/* A soft halo behind the sphere in the section's scene colors; the canvas
   itself stays transparent. */
.wl-globe::before {
  content: "";
  position: absolute;
  inset: 16%;
  z-index: -1;
  border-radius: var(--radius-full);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--wl-scene-b) 36%, transparent),
    color-mix(in srgb, var(--wl-scene-a) 16%, transparent) 55%,
    transparent 72%
  );
  filter: blur(var(--spacing-10));
}

.wl-globe-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: pan-y;
}

.wl-globe-canvas[data-dragging] {
  cursor: grabbing;
}

.wl-wordmark {
  width: min(100%, calc(var(--spacing-12) * 7));
  height: auto;
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

/* Meta product names: Facebook blue gradient, underline on hover only. */
.wl-meta-link {
  color: var(--color-data-blue-3);
}

/* The external icon is announced to screen readers. Keep the sentence as text. */
.wl-meta-link > .astryx-icon {
  display: none;
}

.wl-meta-link .astryx-text {
  background-image: linear-gradient(
    90deg,
    var(--color-data-categorical-blue),
    var(--color-data-blue-3),
    var(--color-data-blue-2),
    var(--color-data-blue-3),
    var(--color-data-categorical-blue)
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: wl-shimmer calc(var(--duration-slow-max) * 6) linear infinite;
}

/* ---------- Wavy bands ---------- */

/* Both edges are waves rather than straight lines. The mask keeps the band
   below the top curve and above the bottom one; the two run out of phase so
   the band reads as a ribbon. StudiosEdge traces the same curves. */
.wl-studios,
.wl-stack {
  --wl-edge: var(--spacing-12);
  --wl-edge-mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 48' preserveAspectRatio='none'%3E%3Cpath d='M0 24C240 0 480 0 720 24C960 48 1200 48 1440 24V48H0Z'/%3E%3C/svg%3E")
      top / 100% var(--wl-edge) no-repeat,
    linear-gradient(black, black)
      center / 100% calc(100% - var(--wl-edge) * 2 + var(--border-width) * 2) no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 48' preserveAspectRatio='none'%3E%3Cpath d='M0 24C240 48 480 48 720 24C960 0 1200 0 1440 24V0H0Z'/%3E%3C/svg%3E")
      bottom / 100% var(--wl-edge) no-repeat;
  position: relative;
  isolation: isolate;
  -webkit-mask: var(--wl-edge-mask);
  mask: var(--wl-edge-mask);
}

/* Periwinkle, the quietest brand pastel, so the white studio cards lift off
   it. StudiosEdge traces only the top curve. The bottom edge is the band's
   own pastel, with no stroke. */
.wl-studios {
  background: var(--color-brand-pastel-indigo);
}

/* Sky. The hackathon band is pulled up under this one, so the bottom curve
   is the seam between them instead of a straight cut. */
.wl-stack {
  z-index: 1;
  background: var(--color-brand-pastel-blue);
}

.wl-studios-edge {
  --wl-edge: var(--spacing-12);
  position: absolute;
  inset-inline: 0;
  z-index: 1;
  width: 100%;
  height: var(--wl-edge);
  pointer-events: none;
}

.wl-studios-edge[data-edge="top"] {
  top: 0;
}

.wl-studios-edge[data-edge="bottom"] {
  bottom: 0;
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

/* ---------- Dotted bands ---------- */

/* A dot grid behind a band. The dots are holes in a mask over a slowly
   drifting brand gradient, so their color shifts across the band over time;
   the second mask layer fades the grid out toward the edges. */
.wl-dots {
  position: relative;
  isolation: isolate;
}

.wl-dots::before {
  --wl-dot-mask:
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
  background: linear-gradient(
    120deg,
    var(--wl-indigo),
    var(--wl-purple),
    var(--wl-teal),
    var(--wl-blue),
    var(--wl-indigo)
  );
  background-size: 300% 300%;
  opacity: 0.35;
  -webkit-mask: var(--wl-dot-mask);
  mask: var(--wl-dot-mask);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
  animation: wl-dots-drift calc(var(--duration-slow-max) * 24) var(--ease-standard) infinite alternate;
}

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
  /* Sit under the sky band's bottom wave. The padding keeps the copy where
     it was before the overlap. */
  margin-top: calc(-1 * var(--spacing-12));
  padding-top: var(--spacing-12);
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

  .wl-hero,
  .wl-hero-sky .wl-blob,
  .wl-hero-sky .wl-node,
  .wl-hero-sky .wl-sweep,
  .wl-hero-wave .wl-wave-flow,
  .wl-hero-copy > *,
  .wl-hero-panels > .wl-hero-panel,
  .wl-hero-shot-stand,
  .wl-hero-shot > .wl-hero-shot-image,
  .wl-hero-tab,
  .wl-hero-tab-icon,
  .wl-hero-tab-body::after,
  .wl-carry,
  .wl-app-tile,
  .wl-platform-tile,
  .wl-globe,
  .wl-wordmark,
  .wl-gradient-text,
  .wl-meta-link .astryx-text,
  .wl-track .wl-runner,
  .wl-marquee-track,
  .wl-step,
  .wl-step-icon,
  .wl-feature,
  .wl-integration,
  .wl-dots::before {
    animation: none;
    transition: none;
  }

  .wl-hero-sky .wl-net-link,
  .wl-track .wl-glow {
    animation: none;
    stroke-dashoffset: 0;
  }

  .wl-track .wl-runner,
  .wl-hero-sky .wl-shooting-star,
  .wl-hero-sky .wl-net-pulse {
    animation: none;
    opacity: 0;
  }

  /* The sweep still lights one spot on the grid; it just stays put. */
  .wl-hero-sky .wl-sweep {
    transform: translate(700px, 400px);
  }

  /* The stand keeps its resting tilt without the entrance. */
  .wl-hero-shot-stand {
    transform: perspective(1600px) rotateY(-5deg);
  }
}
`;
