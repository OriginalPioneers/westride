"use client";

import type { ComponentProps } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import {
  BanknotesIcon,
  BoltIcon,
  ClockIcon,
  ComputerDesktopIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const GLYPHS = {
  sparkles: SparklesIcon,
  computer: ComputerDesktopIcon,
  banknotes: BanknotesIcon,
  bolt: BoltIcon,
  clock: ClockIcon,
  lightbulb: LightBulbIcon,
  arrowRight: ArrowRightIcon,
} as const;

export type GlyphName = keyof typeof GLYPHS;

/**
 * Icon takes a component, which a server component cannot hand across the
 * client boundary. The page names the glyph instead and this picks it.
 */
export function Glyph({
  name,
  ...props
}: { name: GlyphName } & Omit<ComponentProps<typeof Icon>, "icon">) {
  return <Icon icon={GLYPHS[name]} {...props} />;
}
