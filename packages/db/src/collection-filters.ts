// Shared pieces for the browsable collections (projects, agents): the sort
// vocabulary and the search pattern. Ideas have their own, older copy in
// ideas.ts with the same values.
import { asc, desc, type AnyColumn, type SQL } from "drizzle-orm";

export const COLLECTION_SORTS = [
  "updated",
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
] as const;

export type CollectionSort = (typeof COLLECTION_SORTS)[number];

export function isCollectionSort(value: string): value is CollectionSort {
  return (COLLECTION_SORTS as readonly string[]).includes(value);
}

export type SortableColumns = {
  name: AnyColumn;
  createdAt: AnyColumn;
  updatedAt: AnyColumn;
};

export function collectionOrder(sort: CollectionSort, columns: SortableColumns): SQL[] {
  switch (sort) {
    case "newest":
      return [desc(columns.createdAt), asc(columns.name)];
    case "oldest":
      return [asc(columns.createdAt), asc(columns.name)];
    case "name-asc":
      return [asc(columns.name), desc(columns.updatedAt)];
    case "name-desc":
      return [desc(columns.name), desc(columns.updatedAt)];
    case "updated":
      return [desc(columns.updatedAt), asc(columns.name)];
  }
}

/** Escapes the LIKE wildcards so a search for "100%" means the characters. */
export function likePattern(query: string): string {
  const escaped = query.trim().replace(/[\\%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}
