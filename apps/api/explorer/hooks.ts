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
