"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { collectAchievementCelebrations } from "./actions";
export function AchievementCelebration() {
  const pathname = usePathname();
  const [names, setNames] = useState<string[]>([]);
  // Dismiss independently of navigation so a route change can't strand the banner.
  useEffect(() => {
    if (!names.length) return;
    const timer = setTimeout(() => setNames([]), 10_000);
    return () => clearTimeout(timer);
  }, [names]);
  useEffect(() => {
    async function collect() {
      try {
        const earned = await collectAchievementCelebrations();
        if (!earned.length) return;
        setNames(earned);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const { default: confetti } = await import("canvas-confetti");
          void confetti({
            particleCount: 60,
            spread: 65,
            ticks: 120,
            origin: { y: 0.65 },
            disableForReducedMotion: true,
          });
        }
      } catch {
        /* A celebration must never interrupt the learner. */
      }
    }
    void collect();
    window.addEventListener("westride:achievements", collect);
    return () => window.removeEventListener("westride:achievements", collect);
  }, [pathname]);
  return names.length ? (
    <Banner
      key={names.join()}
      role="status"
      status="success"
      title={
        names.length === 1
          ? `Achievement unlocked: ${names[0]}`
          : `${names.length} achievements unlocked!`
      }
      description={
        names.length > 1
          ? names.join(" · ")
          : "One more step on your learning journey."
      }
      isDismissable
    />
  ) : null;
}
