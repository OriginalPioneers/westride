import type { IdeaMemberRole, IdeaType } from "@westride/db";
import { isIdeaSort, type IdeaFilters, type IdeaSort } from "@westride/db/ideas";

export const IDEA_TYPE_LABELS: Record<IdeaType, string> = {
  BUSINESS: "Business",
  NON_PROFIT: "Non-Profit",
};

export const IDEA_ROLE_LABELS: Record<IdeaMemberRole, string> = {
  FOUNDER: "Founder",
  MEMBER: "Member",
};

/** URL-friendly spellings of the type enum. */
const TYPE_PARAMS: Record<IdeaType, string> = {
  BUSINESS: "business",
  NON_PROFIT: "non-profit",
};

export function ideaTypeParam(type: IdeaType): string {
  return TYPE_PARAMS[type];
}

export function parseIdeaType(value: string): IdeaType | undefined {
  const match = (Object.keys(TYPE_PARAMS) as IdeaType[]).find(
    (type) => TYPE_PARAMS[type] === value,
  );
  return match;
}

export const IDEA_SORT_OPTIONS: { value: IdeaSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "updated", label: "Recently updated" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
];

export const DEFAULT_IDEA_SORT: IdeaSort = "newest";

/** Raw values as they appear in the URL. Empty string means unset. */
export type IdeaFilterValues = {
  q: string;
  type: string;
  country: string;
  tag: string;
  sort: string;
};

export const EMPTY_IDEA_FILTERS: IdeaFilterValues = {
  q: "",
  type: "",
  country: "",
  tag: "",
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
    type: firstParam(params, "type"),
    country: firstParam(params, "country"),
    tag: firstParam(params, "tag"),
    sort: firstParam(params, "sort"),
  };
}

export function toIdeaFilters(values: IdeaFilterValues): IdeaFilters {
  return {
    query: values.q || undefined,
    type: parseIdeaType(values.type),
    countryCode: values.country || undefined,
    tagSlug: values.tag || undefined,
    sort: isIdeaSort(values.sort) ? values.sort : DEFAULT_IDEA_SORT,
  };
}

/** True when anything narrows the list. Sorting alone does not. */
export function hasIdeaFilters(values: IdeaFilterValues): boolean {
  return Boolean(values.q || values.type || values.country || values.tag);
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
