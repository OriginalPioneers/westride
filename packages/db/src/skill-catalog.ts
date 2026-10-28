/**
 * Folds spelling variants ("Next.js", "next js", "NEXT.JS") onto one key.
 * Symbols that carry meaning in tech names are spelled out first, so "C",
 * "C++", and "C#" stay distinct. Returns "" when nothing usable is left.
 */
export function skillSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/#/g, "-sharp")
    .replace(/&/g, "-and-")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Starter list offered to every mentor. Mentors can add their own. */
export const skillCatalog = [
  "AI Fundamentals",
  "Prompt Engineering",
  "AI Agents",
  "Machine Learning",
  "Data Analysis",
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Web Development",
  "Mobile Development",
  "Databases",
  "Cloud & DevOps",
  "Cybersecurity",
  "UI/UX Design",
  "Product Management",
  "Entrepreneurship",
  "Startup Strategy",
  "Fundraising",
  "Marketing",
  "Sales",
  "Nonprofit Leadership",
  "Grant Writing",
  "Leadership",
  "Public Speaking",
  "Career Growth",
] as const;
