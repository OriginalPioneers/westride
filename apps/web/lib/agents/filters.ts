import type { AgentStatus } from "@westride/db";
import { isAgentSort, type AgentFilters } from "@westride/db/agents";
import {
  collectionPath,
  DEFAULT_COLLECTION_SORT,
  parseStatusSlug,
  resolveCollection,
  type Collection,
  type CollectionFilterValues,
  type CollectionView,
} from "@/lib/collections/filters";
import { AGENT_STATUS_LABELS } from "./labels";

export const AGENT_VIEW_LABELS: Record<CollectionView, string> = {
  mine: "Your Agents",
  all: "All Agents",
};

export type AgentCollection = Collection<AgentStatus>;

export function parseAgentStatus(slug: string): AgentStatus | undefined {
  return parseStatusSlug(slug, AGENT_STATUS_LABELS);
}

export function resolveAgentCollection(
  values: CollectionFilterValues,
  isSignedIn: boolean,
): AgentCollection {
  return resolveCollection(values, isSignedIn, parseAgentStatus);
}

export function toAgentFilters(
  values: CollectionFilterValues,
  isSignedIn: boolean,
): AgentFilters {
  const collection = resolveAgentCollection(values, isSignedIn);
  return {
    query: collection.kind === "search" ? collection.query : undefined,
    status: collection.kind === "status" ? collection.status : undefined,
    mineOnly: collection.kind === "view" && collection.view === "mine",
    sort: isAgentSort(values.sort) ? values.sort : DEFAULT_COLLECTION_SORT,
  };
}

export function agentsCollectionPath(values: Partial<CollectionFilterValues> = {}): string {
  return collectionPath("/agents", values);
}
