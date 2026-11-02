"use client";

import type { CategoryOption, IdeaView } from "@westride/db/ideas";
import { IDEA_VIEWS } from "@westride/db/ideas";
import {
  DEFAULT_IDEA_SORT,
  IDEA_SORT_OPTIONS,
  IDEA_VIEW_LABELS,
  ideasPath,
  resolveIdeaCollection,
  type IdeaFilterValues,
} from "@/lib/ideas/filters";
import { CollectionSearchBar, CollectionTabs } from "../collection-filters";

/** The search box, with sort beside it. Searching looks across every idea. */
export function IdeaSearchBar({ values }: { values: IdeaFilterValues }) {
  return (
    <CollectionSearchBar
      label="Search ideas"
      placeholder="Search ideas..."
      query={values.q}
      sort={values.sort || DEFAULT_IDEA_SORT}
      sortOptions={IDEA_SORT_OPTIONS}
      toHref={(next) => ideasPath({ ...values, ...next })}
    />
  );
}

/**
 * The pills under the search bar: the viewer's collections first, then one
 * per category that has an idea in it. No pill is selected while a search
 * is open, since a search looks across every collection.
 */
export function IdeaCollectionTabs({
  values,
  isSignedIn,
  categories,
}: {
  values: IdeaFilterValues;
  isSignedIn: boolean;
  categories: CategoryOption[];
}) {
  const collection = resolveIdeaCollection(values, isSignedIn);
  const sort = values.sort;

  const viewHref = (view: IdeaView) => ideasPath({ view, sort });
  const categoryHref = (slug: string) => ideasPath({ category: slug, sort });

  const selected =
    collection.kind === "view"
      ? viewHref(collection.view)
      : collection.kind === "category"
        ? categoryHref(collection.slug)
        : "";

  return (
    <CollectionTabs
      selected={selected}
      tabs={[
        ...IDEA_VIEWS.map((view) => ({ href: viewHref(view), label: IDEA_VIEW_LABELS[view] })),
        ...categories.map((category) => ({
          href: categoryHref(category.slug),
          label: category.name,
        })),
      ]}
    />
  );
}
