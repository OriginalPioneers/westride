"use client";

import createGlobe, { type Arc, type COBEOptions, type Marker } from "cobe";
import { useEffect, useRef } from "react";
import { Center } from "@astryxdesign/core/Center";

type LatLng = [number, number];
type Rgb = [number, number, number];

/** Meta's home, then a ring of builder hubs that circles the globe. */
const HUBS: LatLng[] = [
  [37.4848, -122.1484], // Menlo Park
  [40.7128, -74.006], // New York
  [-23.5505, -46.6333], // São Paulo
  [6.5244, 3.3792], // Lagos
  [51.5074, -0.1278], // London
  [-1.2921, 36.8219], // Nairobi
  [12.9716, 77.5946], // Bengaluru
  [1.3521, 103.8198], // Singapore
  [-33.8688, 151.2093], // Sydney
  [35.6762, 139.6503], // Tokyo
];

const MARKERS: Marker[] = HUBS.map((location, index) => ({
  location,
  size: index === 0 ? 0.07 : 0.04,
}));

const ARCS: Arc[] = HUBS.map((from, index) => ({
  from,
  to: HUBS[(index + 1) % HUBS.length],
}));

/** Radians per millisecond: one full turn in about 70 seconds. */
const SPIN_SPEED = (Math.PI * 2) / 70_000;
/** Pixels of drag for one radian of spin. */
const DRAG_RATIO = 220;
const THETA = 0.28;
/** Opens on the Americas so Menlo Park is in view at first paint. */
const START_PHI = 0.4;
/**
 * How long a glow change takes to close most of its distance, in
 * milliseconds: an exponential ease, so a mid-flight change never jumps.
 */
const EASE_TIME = 420;
/** The glow is this fraction of its token: full brightness washes out the land. */
const GLOW_LEVEL = 0.85;
const DEFAULT_GLOW_TOKEN = "--wl-purple";

/**
 * Reads a color token as linear 0-1 RGB. Tokens may be any CSS color syntax,
 * so the browser rasterizes it rather than us parsing it.
 */
function tokenRgb(
  element: Element,
  probe: CanvasRenderingContext2D,
  token: string,
  scale = 1
): Rgb {
  const value = getComputedStyle(element).getPropertyValue(token).trim();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = value || "white";
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [(r / 255) * scale, (g / 255) * scale, (b / 255) * scale];
}

/** A one-pixel canvas that turns any token into RGB for the globe. */
function tokenReader(element: Element) {
  const probeCanvas = document.createElement("canvas");
  probeCanvas.width = 1;
  probeCanvas.height = 1;
  const probe = probeCanvas.getContext("2d", { willReadFrequently: true });
  if (probe == null) return null;
  return (token: string, scale = 1) => tokenRgb(element, probe, token, scale);
}

function themeColors(
  read: ReturnType<typeof tokenReader>,
  glowToken: string
): Partial<COBEOptions> {
  if (read == null) return {};
  return {
    baseColor: read("--wl-indigo", 0.55),
    markerColor: read("--wl-teal"),
    glowColor: read(glowToken, GLOW_LEVEL),
    arcColor: read("--wl-orange"),
  };
}

function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

function isCloseRgb(a: Rgb, b: Rgb) {
  return (
    Math.abs(a[0] - b[0]) < 0.002 &&
    Math.abs(a[1] - b[1]) < 0.002 &&
    Math.abs(a[2] - b[2]) < 0.002
  );
}

export function HeroGlobe({
  glowToken = DEFAULT_GLOW_TOKEN,
}: {
  /**
   * The token the atmosphere glows in, e.g. `--wl-purple`. A change eases
   * in over a few frames rather than cutting.
   */
  glowToken?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowTokenRef = useRef(glowToken);
  /** Set by the draw loop: retargets the glow and wakes it if it had stopped. */
  const retargetRef = useRef<(token: string) => void>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const read = tokenReader(canvas);
    let size = canvas.offsetWidth;
    let phi = START_PHI;
    let glow: Rgb = read?.(glowTokenRef.current, GLOW_LEVEL) ?? [
      0.6, 0.4, 1,
    ];
    let targetGlow = glow;

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: size,
      height: size,
      phi,
      theta: THETA,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 20_000,
      mapBrightness: 7,
      mapBaseBrightness: 0.06,
      baseColor: [0.3, 0.3, 0.45],
      markerColor: [0.3, 0.9, 0.9],
      glowColor: glow,
      opacity: 0.72,
      markers: MARKERS,
      markerElevation: 0.01,
      arcs: ARCS,
      arcColor: [1, 0.6, 0.3],
      arcWidth: 0.5,
      arcHeight: 0.14,
      ...themeColors(read, glowTokenRef.current),
    });

    // The land texture decodes after the first draw, so even a still globe
    // needs a handful of frames before it can stop.
    const SETTLE_FRAMES = 45;
    let settle = SETTLE_FRAMES;
    let frame = 0;
    let last = 0;
    let isVisible = true;
    let drag: { x: number; phi: number } | null = null;

    const tick = (now: number) => {
      const elapsed = Math.min(now - last, 64);
      last = now;
      if (!reduceMotion && drag == null) phi += elapsed * SPIN_SPEED;

      // Ease the glow toward its target. Reduced motion lands at once.
      const isSettled = isCloseRgb(glow, targetGlow);
      if (!isSettled) {
        const amount = reduceMotion ? 1 : 1 - Math.exp(-elapsed / EASE_TIME);
        glow = mixRgb(glow, targetGlow, amount);
        if (isCloseRgb(glow, targetGlow)) glow = targetGlow;
      }
      globe.update({ phi, glowColor: glow });

      if (reduceMotion && drag == null && isSettled && --settle <= 0) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      settle = SETTLE_FRAMES;
      if (frame !== 0 || !isVisible) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    retargetRef.current = (token) => {
      targetGlow = read?.(token, GLOW_LEVEL) ?? targetGlow;
      start();
    };

    const resizeObserver = new ResizeObserver(() => {
      const next = canvas.offsetWidth;
      if (next === size || next === 0) return;
      size = next;
      globe.update({ width: size, height: size });
      start();
    });
    resizeObserver.observe(canvas);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) start();
      else stop();
    });
    visibilityObserver.observe(canvas);

    const onPointerDown = (event: PointerEvent) => {
      drag = { x: event.clientX, phi };
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.dragging = "";
      start();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (drag == null) return;
      phi = drag.phi + (event.clientX - drag.x) / DRAG_RATIO;
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (drag == null) return;
      drag = null;
      delete canvas.dataset.dragging;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);

    start();

    return () => {
      stop();
      retargetRef.current = null;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      globe.destroy();
    };
  }, []);

  // The globe outlives the section it was mounted under; later sections
  // only retarget the running loop, so the sphere never rebuilds.
  useEffect(() => {
    glowTokenRef.current = glowToken;
    retargetRef.current?.(glowToken);
  }, [glowToken]);

  return (
    <Center className="wl-globe">
      <canvas ref={canvasRef} className="wl-globe-canvas" aria-hidden="true" />
    </Center>
  );
}
