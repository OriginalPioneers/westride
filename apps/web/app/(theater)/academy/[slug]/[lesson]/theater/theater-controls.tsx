"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack } from "@astryxdesign/core/Stack";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";

/**
 * Theater-mode chrome: exit, previous/next, fullscreen, and the keyboard
 * shortcuts behind them (Esc, ←/→, F).
 */
export function TheaterControls({
  exitHref,
  previousHref,
  nextHref,
}: {
  exitHref: string;
  previousHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement !== null);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      // Leave typing and media controls alone.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "VIDEO", "AUDIO"].includes(
            target.tagName,
          ))
      ) {
        return;
      }

      switch (event.key) {
        case "Escape":
          if (document.fullscreenElement) {
            // The browser already leaves fullscreen on Escape.
            return;
          }
          event.preventDefault();
          router.push(exitHref);
          break;
        case "ArrowLeft":
          if (previousHref) {
            event.preventDefault();
            router.push(previousHref);
          }
          break;
        case "ArrowRight":
          if (nextHref) {
            event.preventDefault();
            router.push(nextHref);
          }
          break;
        case "f":
        case "F":
          event.preventDefault();
          void toggleFullscreen();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitHref, nextHref, previousHref, router]);

  useEffect(() => {
    // Prefetch neighbours so arrow keys feel instant.
    if (previousHref) router.prefetch(previousHref);
    if (nextHref) router.prefetch(nextHref);
  }, [nextHref, previousHref, router]);

  return (
    <HStack gap={2} vAlign="center">
      {previousHref ? (
        <IconButton
          label="Previous lesson"
          tooltip="Previous lesson (←)"
          variant="ghost"
          icon={<Icon icon="chevronLeft" />}
          onClick={() => router.push(previousHref)}
        />
      ) : null}
      {nextHref ? (
        <IconButton
          label="Next lesson"
          tooltip="Next lesson (→)"
          variant="ghost"
          icon={<Icon icon="chevronRight" />}
          onClick={() => router.push(nextHref)}
        />
      ) : null}
      <IconButton
        label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        tooltip={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
        variant="ghost"
        icon={
          <Icon
            icon={isFullscreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon}
          />
        }
        clickAction={toggleFullscreen}
      />
      <Button
        label="Exit theater"
        tooltip="Back to the lesson page (Esc)"
        variant="secondary"
        icon={<Icon icon="close" />}
        href={exitHref}
      />
    </HStack>
  );
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Fullscreen can be refused (iframes, some mobile browsers); the page
    // still works without it.
  }
}
