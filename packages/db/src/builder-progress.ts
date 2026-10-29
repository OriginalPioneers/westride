/** Only normal web links can be shared as prototypes. No remote fetch is needed. */
export function prototypeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname.includes(".")
      ? url.href
      : null;
  } catch {
    return null;
  }
}
const words = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function changedPitch(before: string, after: string) {
  return Boolean(words(after)) && words(before) !== words(after);
}
export const builderSteps = [
  {
    slug: "idea-refiner",
    title: "Give your idea another draft",
    description:
      "Open an idea you founded and save a changed description: make the problem, audience, or first version clearer.",
    label: "Refine an idea",
  },
  {
    slug: "team-builder",
    title: "Bring someone into your idea",
    description:
      "In Edit idea, add a teammate who has a WeStride account. Choose Member, or Founder if they should also edit the idea.",
    label: "Build your team",
  },
  {
    slug: "prototype-shared",
    title: "Give people something to try",
    description:
      "In Edit idea, add your tested prototype link and one thing to try. It follows your idea’s existing visibility.",
    label: "Share a prototype",
  },
] as const;
