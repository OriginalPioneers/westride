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
