"use client";

import { ProgressBar } from "@astryxdesign/core/ProgressBar";

/**
 * Lessons-complete bar. Lives on the client so the label formatter can be a
 * function; server pages pass plain numbers.
 */
export function LessonProgress({
  label,
  done,
  total,
  suffix,
  isLabelHidden = false,
}: {
  label: string;
  done: number;
  total: number;
  /** Extra text after the count, e.g. "2 tracks finished". */
  suffix?: string;
  isLabelHidden?: boolean;
}) {
  const isFinished = total > 0 && done === total;
  return (
    <ProgressBar
      label={label}
      value={done}
      max={Math.max(total, 1)}
      hasValueLabel
      isLabelHidden={isLabelHidden}
      formatValueLabel={(value, max) =>
        `${value} of ${max} lessons${suffix ? ` · ${suffix}` : ""}`
      }
      variant={isFinished ? "success" : "accent"}
    />
  );
}
