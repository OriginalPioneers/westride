import { useEffect, useState, useSyncExternalStore } from "react";
import type { OpenApiDocument } from "./openapi";

export type Route = { page: "overview" } | { page: "operation"; id: string };

export const overviewHref = "#/";

export function operationHref(id: string): string {
  return `#/operations/${encodeURIComponent(id)}`;
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash);
  const match = /^#\/operations\/(.+)$/.exec(hash);
  return match?.[1]
    ? { page: "operation", id: decodeURIComponent(match[1]) }
    : { page: "overview" };
}

// ---------------------------------------------------------------------------
// The bearer token the Try it panel sends. Kept in sessionStorage so it
// survives navigating between endpoints but is gone when the tab closes, and
// shared across panels through a tiny store so every console shows the same
// value.
// ---------------------------------------------------------------------------

const TOKEN_KEY = "westride-api-explorer-token";
const tokenListeners = new Set<() => void>();

function readToken(): string {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribeToToken(onChange: () => void) {
  tokenListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    tokenListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setToken(value: string) {
  try {
    if (value) {
      window.sessionStorage.setItem(TOKEN_KEY, value);
    } else {
      window.sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Private mode may refuse storage; the in-memory listeners still update.
  }
  for (const listener of tokenListeners) {
    listener();
  }
}

export function useToken(): [string, (value: string) => void] {
  const token = useSyncExternalStore(subscribeToToken, readToken, () => "");
  return [token, setToken];
}

export type DocumentState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; doc: OpenApiDocument };

export function useOpenApiDocument(url: string): DocumentState {
  const [state, setState] = useState<DocumentState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`The spec request returned ${response.status}.`);
        }
        setState({ status: "ready", doc: (await response.json()) as OpenApiDocument });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => controller.abort();
  }, [url]);

  return state;
}
