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

function themeColors(element: Element): Partial<COBEOptions> {
  const probeCanvas = document.createElement("canvas");
  probeCanvas.width = 1;
  probeCanvas.height = 1;
  const probe = probeCanvas.getContext("2d", { willReadFrequently: true });
  if (probe == null) return {};
  return {
    baseColor: tokenRgb(element, probe, "--wl-indigo", 0.55),
    markerColor: tokenRgb(element, probe, "--wl-teal"),
    glowColor: tokenRgb(element, probe, "--wl-purple", 0.85),
    arcColor: tokenRgb(element, probe, "--wl-orange"),
  };
}

export function HeroGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let size = canvas.offsetWidth;
    let phi = START_PHI;

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
      glowColor: [0.6, 0.4, 1],
      opacity: 0.72,
      markers: MARKERS,
      markerElevation: 0.01,
      arcs: ARCS,
      arcColor: [1, 0.6, 0.3],
      arcWidth: 0.5,
      arcHeight: 0.14,
      ...themeColors(canvas),
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
      globe.update({ phi });

      if (reduceMotion && drag == null && --settle <= 0) {
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
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      globe.destroy();
    };
  }, []);

  return (
    <Center className="wl-globe">
      <canvas ref={canvasRef} className="wl-globe-canvas" aria-hidden="true" />
    </Center>
  );
}
