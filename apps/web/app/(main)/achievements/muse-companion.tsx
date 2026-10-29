"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
export function MuseCompanion() {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    if (!preference.matches)
      animation = ref.current?.animate(
        [
          { transform: "translateY(0) rotate(0deg)" },
          {
            transform: "translateY(calc(-1 * var(--spacing-1))) rotate(-3deg)",
          },
          { transform: "translateY(0) rotate(0deg)" },
        ],
        { duration: 1200, iterations: 2, easing: "ease-in-out" },
      );
    const stop = () => {
      if (preference.matches) animation?.cancel();
    };
    preference.addEventListener("change", stop);
    return () => {
      animation?.cancel();
      preference.removeEventListener("change", stop);
    };
  }, []);
  return (
    <Image
      ref={ref}
      src="/achievements/muse-companion.png"
      alt="A friendly white, shaggy Muse"
      width={1086}
      height={1448}
      unoptimized
      style={{
        width: "calc(var(--spacing-12) * 2)",
        height: "calc(var(--spacing-12) * 2)",
        flexShrink: 0,
        objectFit: "contain",
      }}
    />
  );
}
