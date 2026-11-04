import type { CollectionSort } from "@westride/db/collection-filters";

/**
 * The URL contract shared by the browsable studios (Project Factory, Agent
 * Studio). Empty string means unset.
 *
 * `view` and `status` are the pills under the search bar; at most one of
 * them applies, and `status` wins when both are present. `q` searches every
 * item the viewer can see, so while it is set the pills are ignored (they
 * stay in the URL so clearing the search returns to the same pill).
 */
export type CollectionFilterValues = {
  q: string;
  view: string;
  status: string;
  sort: string;
};

export const EMPTY_COLLECTION_FILTERS: CollectionFilterValues = {
  q: "",
  view: "",
  status: "",
  sort: "",
};

export const COLLECTION_SORT_OPTIONS: { value: CollectionSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
];

export const DEFAULT_COLLECTION_SORT: CollectionSort = "updated";

/** The two pills every studio has: the viewer's own items, and everything visible. */
export const COLLECTION_VIEWS = ["mine", "all"] as const;

export type CollectionView = (typeof COLLECTION_VIEWS)[number];

export function isCollectionView(value: string): value is CollectionView {
  return (COLLECTION_VIEWS as readonly string[]).includes(value);
}

/** Signed-in members land on their own items; visitors have none, so they see everything. */
export function defaultCollectionView(isSignedIn: boolean): CollectionView {
  return isSignedIn ? "mine" : "all";
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: SearchParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function readCollectionFilterValues(params: SearchParams): CollectionFilterValues {
  return {
    q: firstParam(params, "q"),
    view: firstParam(params, "view"),
    status: firstParam(params, "status"),
    sort: firstParam(params, "sort"),
  };
}

/** Which collection the page shows. */
export type Collection<Status extends string> =
  | { kind: "search"; query: string }
  | { kind: "status"; status: Status }
  | { kind: "view"; view: CollectionView };

/**
 * Statuses travel in the URL as lowercase slugs (`building`), so each studio
 * passes a parser from slug to its enum value.
 */
export function resolveCollection<Status extends string>(
  values: CollectionFilterValues,
  isSignedIn: boolean,
  parseStatus: (slug: string) => Status | undefined,
): Collection<Status> {
  const query = values.q.trim();
  if (query) {
    return { kind: "search", query };
  }
  const status = values.status ? parseStatus(values.status) : undefined;
  if (status) {
    return { kind: "status", status };
  }
  return {
    kind: "view",
    view: isCollectionView(values.view) ? values.view : defaultCollectionView(isSignedIn),
  };
}

/** `BUILDING` → `building`, the form a status takes in the URL. */
export function statusSlug(status: string): string {
  return status.toLowerCase();
}

/** Reads a lowercase URL slug back into one of the known enum values. */
export function parseStatusSlug<Status extends string>(
  slug: string,
  labels: Record<Status, string>,
): Status | undefined {
  const upper = slug.toUpperCase();
  return upper in labels ? (upper as Status) : undefined;
}

export function collectionQuery(values: CollectionFilterValues): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value && !(key === "sort" && value === DEFAULT_COLLECTION_SORT)) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export function collectionPath(
  base: string,
  values: Partial<CollectionFilterValues> = {},
): string {
  const query = collectionQuery({ ...EMPTY_COLLECTION_FILTERS, ...values });
  return query ? `${base}?${query}` : base;
}
