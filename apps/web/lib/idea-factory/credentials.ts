/**
 * Where a member's Meta credential lives: their own browser, and nowhere
 * else. WeStride never writes it to a database. Each request to Muse carries
 * the key from here to the server, which uses it once and forgets it.
 */

export type MuseCredentialKind = "meta-account" | "api-key";

export type MuseCredential = {
  kind: MuseCredentialKind;
  /** The Model API key, `LLM_...`. */
  apiKey: string;
  /**
   * Device-flow identity token. Minted keys last about a day; this re-mints
   * one without asking the member to sign in again.
   */
  identityToken: string | null;
  /** Epoch milliseconds after which `apiKey` should be re-minted. */
  expiresAt: number | null;
  /** Short label for the header, e.g. "Meta account" or "Key …LJY". */
  label: string;
  connectedAt: number;
};

/** What the server needs for one call. Never persisted. */
export type MuseAccess = { apiKey: string };

const STORAGE_PREFIX = "westride.muse-credential.";

function storageKey(clerkUserId: string): string {
  return `${STORAGE_PREFIX}${clerkUserId}`;
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readMuseCredential(clerkUserId: string): MuseCredential | null {
  if (!hasStorage()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(clerkUserId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<MuseCredential>;
    if (
      (parsed.kind !== "meta-account" && parsed.kind !== "api-key") ||
      typeof parsed.apiKey !== "string" ||
      !parsed.apiKey
    ) {
      return null;
    }
    return {
      kind: parsed.kind,
      apiKey: parsed.apiKey,
      identityToken:
        typeof parsed.identityToken === "string" ? parsed.identityToken : null,
      expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : null,
      label: typeof parsed.label === "string" ? parsed.label : "Meta",
      connectedAt:
        typeof parsed.connectedAt === "number" ? parsed.connectedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeMuseCredential(
  clerkUserId: string,
  credential: MuseCredential,
): void {
  if (!hasStorage()) {
    return;
  }
  window.localStorage.setItem(
    storageKey(clerkUserId),
    JSON.stringify(credential),
  );
}

export function clearMuseCredential(clerkUserId: string): void {
  if (!hasStorage()) {
    return;
  }
  window.localStorage.removeItem(storageKey(clerkUserId));
}

/** Minted keys are refreshed a little early so a long evaluation never trips over expiry. */
const REFRESH_MARGIN_MS = 15 * 60 * 1000;

export function needsKeyRefresh(credential: MuseCredential): boolean {
  return (
    credential.kind === "meta-account" &&
    credential.identityToken !== null &&
    credential.expiresAt !== null &&
    Date.now() + REFRESH_MARGIN_MS >= credential.expiresAt
  );
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
