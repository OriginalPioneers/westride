import {
  MAX_IDEA_DESCRIPTION,
  MAX_IDEA_NAME,
} from "@/lib/ideas/create-schema";

/** `tool-library` reads as "Tool library". Names without separators stay as typed. */
export function ideaNameFromRepo(repoName: string): string {
  const name = /[-_]/.test(repoName)
    ? repoName.replace(/[-_]+/g, " ").trim()
    : repoName;
  const titled = name.charAt(0).toUpperCase() + name.slice(1);
  return titled.slice(0, MAX_IDEA_NAME).trim();
}

/** A line of nothing but HTML tags, e.g. `<div align="center">` or a linked logo. */
const TAG_ONLY_LINE = /^\s*(?:<[^>]+>\s*)+$/;
/** A line of nothing but (linked) images, which is how READMEs show badges. */
const BADGE_LINE = /^\s*(?:\[?!\[[^\]]*\]\([^)]*\)\]?(?:\([^)]*\))?\s*)+$/;
const HTML_TITLE = /^\s*<h1[^>]*>[\s\S]*<\/h1>\s*$/i;

/**
 * Keeps the prose. Comments, logo and badge rows, and the title heading go:
 * the idea page shows the name already.
 */
function tidyReadme(readme: string): string {
  const lines = readme
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<picture>[\s\S]*?<\/picture>/gi, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !TAG_ONLY_LINE.test(line) && !BADGE_LINE.test(line));
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first !== -1) {
    const line = lines[first] ?? "";
    const next = lines[first + 1] ?? "";
    if (/^#\s/.test(line) || HTML_TITLE.test(line)) {
      lines.splice(first, 1);
    } else if (/^=+\s*$/.test(next)) {
      lines.splice(first, 2);
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Cuts at a paragraph break so Markdown is not left half open. */
function fit(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const slice = text.slice(0, max - 1);
  const breakAt = slice.lastIndexOf("\n\n");
  return `${(breakAt > max / 2 ? slice.slice(0, breakAt) : slice).trimEnd()}…`;
}

export function ideaDescriptionFromRepo(
  repoDescription: string | null,
  readme: string | null,
): string {
  const parts = [repoDescription?.trim(), readme ? tidyReadme(readme) : ""]
    .filter((part): part is string => Boolean(part));
  return fit(parts.join("\n\n"), MAX_IDEA_DESCRIPTION);
}
