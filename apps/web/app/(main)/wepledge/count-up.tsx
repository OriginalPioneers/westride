"use client";

import { useEffect, useRef } from "react";
import { Text } from "@astryxdesign/core/Text";
import { formatMicros, formatSeconds } from "@/lib/support/schema";

export type CountFormat = "int" | "dollars" | "seconds" | "gb";

export function formatCount(value: number, format: CountFormat): string {
  switch (format) {
    case "dollars":
      return formatMicros(value);
    case "seconds":
      return formatSeconds(Math.round(value));
    case "gb":
      return `${Math.round(value / 1024).toLocaleString()} GB`;
    default:
      return Math.round(value).toLocaleString();
  }
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * A number that counts up from zero the first time it scrolls into view.
 * The final value is in the markup from the start, so without JavaScript,
 * for reduced motion, and for search engines the number is simply there.
 */
export function CountUp({
  value,
  format = "int",
  duration = 1400,
  type = "display-3",
  weight = "bold",
}: {
  value: number;
  format?: CountFormat;
  /** Milliseconds for the whole climb. */
  duration?: number;
  type?: "display-1" | "display-2" | "display-3" | "large";
  weight?: "bold" | "semibold";
}) {
  const ref = useRef<HTMLElement>(null);
  const final = formatCount(value, format);

  // The climb writes straight to the DOM: React renders the final number
  // once, and the animation is a visual overlay on it, never state.
  useEffect(() => {
    const node = ref.current;
    if (node == null || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      return;
    }

    let frame = 0;
    let started = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((entry) => entry.isIntersecting)) return;
        started = true;
        observer.disconnect();
        const begin = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - begin) / duration);
          node.textContent = t < 1 ? formatCount(value * easeOut(t), format) : final;
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        node.textContent = formatCount(0, format);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.textContent = final;
    };
  }, [value, duration, format, final]);

  return (
    <Text ref={ref} className="sp-stat-value" type={type} weight={weight} textWrap="nowrap">
      {final}
    </Text>
  );
}
