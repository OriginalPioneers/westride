"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { VStack } from "@astryxdesign/core/Stack";
import { SUPPORTING_STYLES } from "./supporting-styles";

/**
 * Wraps the supporting page: injects its styles once and reveals
 * `.sp-reveal` blocks as they scroll into view. Without JavaScript nothing
 * is ever hidden, because the hiding rule only applies under `[data-js]`.
 */
export function SupportingRoot({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root == null) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(".sp-reveal"));
    root.dataset.js = "";

    // Anything already on screen shows at once, so the first paint never
    // flashes empty space where content was a moment ago.
    const viewportHeight = window.innerHeight;
    const pending = targets.filter((target) => {
      if (target.getBoundingClientRect().top < viewportHeight) {
        target.dataset.visible = "";
        return false;
      }
      return true;
    });

    if (pending.length === 0 || !("IntersectionObserver" in window)) {
      pending.forEach((target) => {
        target.dataset.visible = "";
      });
      return () => {
        delete root.dataset.js;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "";
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    pending.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      delete root.dataset.js;
    };
  }, []);

  return (
    <>
      <style>{SUPPORTING_STYLES}</style>
      <VStack className="sp-root" gap={0} ref={rootRef}>
        {children}
      </VStack>
    </>
  );
}