/**
 * Browser-side Idea Factory state. The member's Meta credential is no longer
 * here: it is kept encrypted on their WeStride account (see `lib/meta`).
 */

const LEGACY_CREDENTIAL_PREFIX = "westride.muse-credential.";

function hasStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

/** Removes a key an earlier version of WeStride kept in this browser. */
export function forgetBrowserMuseCredential(clerkUserId: string): void {
  if (!hasStorage()) {
    return;
  }
  window.localStorage.removeItem(`${LEGACY_CREDENTIAL_PREFIX}${clerkUserId}`);
}

export function keyLabel(apiKey: string): string {
  const tail = apiKey.slice(-4);
  return `Key …${tail}`;
}

const PREFERENCES_PREFIX = "westride.idea-factory.prefs.";

export type FactoryPreferences = {
  model: string;
  webSearch: boolean;
};

export function readFactoryPreferences(
  clerkUserId: string,
  fallback: FactoryPreferences,
): FactoryPreferences {
  if (!hasStorage()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(`${PREFERENCES_PREFIX}${clerkUserId}`);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<FactoryPreferences>;
    return {
      model: typeof parsed.model === "string" ? parsed.model : fallback.model,
      webSearch:
        typeof parsed.webSearch === "boolean"
          ? parsed.webSearch
          : fallback.webSearch,
    };
  } catch {
    return fallback;
  }
}

export function writeFactoryPreferences(
  clerkUserId: string,
  preferences: FactoryPreferences,
): void {
  if (!hasStorage()) {
    return;
  }
  window.localStorage.setItem(
    `${PREFERENCES_PREFIX}${clerkUserId}`,
    JSON.stringify(preferences),
  );
}
