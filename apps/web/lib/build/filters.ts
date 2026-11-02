import type { ProjectStatus } from "@westride/db";
import { isProjectSort, type ProjectFilters } from "@westride/db/build";
import {
  collectionPath,
  DEFAULT_COLLECTION_SORT,
  parseStatusSlug,
  resolveCollection,
  type Collection,
  type CollectionFilterValues,
  type CollectionView,
} from "@/lib/collections/filters";
import { PROJECT_STATUS_LABELS } from "./labels";

export const PROJECT_VIEW_LABELS: Record<CollectionView, string> = {
  mine: "Your Projects",
  all: "All Projects",
};

export type ProjectCollection = Collection<ProjectStatus>;

export function parseProjectStatus(slug: string): ProjectStatus | undefined {
  return parseStatusSlug(slug, PROJECT_STATUS_LABELS);
}

export function resolveProjectCollection(
  values: CollectionFilterValues,
  isSignedIn: boolean,
): ProjectCollection {
  return resolveCollection(values, isSignedIn, parseProjectStatus);
}

export function toProjectFilters(
  values: CollectionFilterValues,
  isSignedIn: boolean,
): ProjectFilters {
  const collection = resolveProjectCollection(values, isSignedIn);
  return {
    query: collection.kind === "search" ? collection.query : undefined,
    status: collection.kind === "status" ? collection.status : undefined,
    mineOnly: collection.kind === "view" && collection.view === "mine",
    sort: isProjectSort(values.sort) ? values.sort : DEFAULT_COLLECTION_SORT,
  };
}

export function projectsPath(values: Partial<CollectionFilterValues> = {}): string {
  return collectionPath("/build", values);
}
