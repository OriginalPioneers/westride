import type { IdeaMemberRole, IdeaType } from "@westride/db";
import {
  isIdeaSort,
  isIdeaView,
  type IdeaFilters,
  type IdeaSort,
  type IdeaView,
} from "@westride/db/ideas";

export const IDEA_TYPE_LABELS: Record<IdeaType, string> = {
  BUSINESS: "Business",
  NON_PROFIT: "Non-Profit",
  GAME: "Game",
  OPEN_SOURCE: "Open Source",
  WEBSITE: "Website",
  MOBILE_APP: "Mobile App",
};

export const IDEA_ROLE_LABELS: Record<IdeaMemberRole, string> = {
  FOUNDER: "Founder",
  MEMBER: "Member",
};

export const IDEA_VIEW_LABELS: Record<IdeaView, string> = {
  mine: "Your Ideas",
  following: "Following",
  featured: "Best of WeStride",
};

export const IDEA_SORT_OPTIONS: { value: IdeaSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "updated", label: "Recently updated" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
];

export const DEFAULT_IDEA_SORT: IdeaSort = "newest";

/**
 * Raw values as they appear in the URL. Empty string means unset.
 *
 * `view` and `category` are the pills under the search bar; at most one of
 * them applies, and `category` wins when both are present. `q` searches
 * every idea the viewer can see, so while it is set the pills are ignored
 * (they stay in the URL so clearing the search returns to the same pill).
 * `country` is only reachable from an idea's geography links.
 */
export type IdeaFilterValues = {
  q: string;
  view: string;
  category: string;
  country: string;
  sort: string;
};

export const EMPTY_IDEA_FILTERS: IdeaFilterValues = {
  q: "",
  view: "",
  category: "",
  country: "",
  sort: "",
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: SearchParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function readIdeaFilterValues(params: SearchParams): IdeaFilterValues {
  return {
    q: firstParam(params, "q"),
    view: firstParam(params, "view"),
    category: firstParam(params, "category"),
    country: firstParam(params, "country"),
    sort: firstParam(params, "sort"),
  };
}

/**
 * Which collection the page shows. Signed-in members land on their own
 * ideas; visitors have none, so they land on the best of WeStride.
 */
export type IdeaCollection =
  | { kind: "search"; query: string }
  | { kind: "category"; slug: string }
  | { kind: "view"; view: IdeaView };

export function defaultIdeaView(isSignedIn: boolean): IdeaView {
  return isSignedIn ? "mine" : "featured";
}

export function resolveIdeaCollection(
  values: IdeaFilterValues,
  isSignedIn: boolean,
): IdeaCollection {
  const query = values.q.trim();
  if (query) {
    return { kind: "search", query };
  }
  if (values.category) {
    return { kind: "category", slug: values.category };
  }
  return {
    kind: "view",
    view: isIdeaView(values.view) ? values.view : defaultIdeaView(isSignedIn),
  };
}

export function toIdeaFilters(
  values: IdeaFilterValues,
  isSignedIn: boolean,
): IdeaFilters {
  const collection = resolveIdeaCollection(values, isSignedIn);
  return {
    query: collection.kind === "search" ? collection.query : undefined,
    tagSlug: collection.kind === "category" ? collection.slug : undefined,
    view: collection.kind === "view" ? collection.view : undefined,
    countryCode: values.country || undefined,
    sort: isIdeaSort(values.sort) ? values.sort : DEFAULT_IDEA_SORT,
  };
}

export function ideaFiltersQuery(values: IdeaFilterValues): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value && !(key === "sort" && value === DEFAULT_IDEA_SORT)) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export function ideasPath(values: Partial<IdeaFilterValues> = {}): string {
  const query = ideaFiltersQuery({ ...EMPTY_IDEA_FILTERS, ...values });
  return query ? `/ideas?${query}` : "/ideas";
}

export function ideaPath(id: string): string {
  return `/ideas/${id}`;
}
