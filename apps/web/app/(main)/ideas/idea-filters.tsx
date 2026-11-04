"use client";

import { useRouter } from "next/navigation";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { CategoryOption, IdeaView, SupportWant } from "@westride/db/ideas";
import { IDEA_VIEWS, SUPPORT_WANTS, isSupportWant } from "@westride/db/ideas";
import {
  DEFAULT_IDEA_SORT,
  IDEA_SORT_OPTIONS,
  IDEA_VIEW_LABELS,
  SUPPORT_WANT_LABELS,
  ideasPath,
  resolveIdeaCollection,
  type IdeaFilterValues,
} from "@/lib/ideas/filters";
import { CollectionSearchBar, CollectionTabs } from "../collection-filters";

const ANY_SUPPORT = "any";

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

  const viewHref = (view: IdeaView) =>
    ideasPath({ view, sort, wants: values.wants });
  const categoryHref = (slug: string) =>
    ideasPath({ category: slug, sort, wants: values.wants });

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

/**
 * Narrows the current collection to ideas asking for one kind of support.
 * "Any" clears it. The choice stays in the URL, and it survives switching
 * collections and searching.
 */
export function IdeaSupportFilter({ values }: { values: IdeaFilterValues }) {
  const router = useRouter();
  const selected: SupportWant | typeof ANY_SUPPORT = isSupportWant(values.wants)
    ? values.wants
    : ANY_SUPPORT;

  return (
    <HStack gap={3} vAlign="center" wrap="wrap">
      <Text weight="semibold">Needing</Text>
      <SegmentedControl
        label="Filter by what an idea needs"
        value={selected}
        onChange={(next) => {
          const wants = isSupportWant(next) ? next : "";
          router.replace(ideasPath({ ...values, wants }), { scroll: false });
        }}
      >
        <SegmentedControlItem value={ANY_SUPPORT} label="Any" />
        {SUPPORT_WANTS.map((want) => (
          <SegmentedControlItem
            key={want}
            value={want}
            label={SUPPORT_WANT_LABELS[want]}
          />
        ))}
      </SegmentedControl>
    </HStack>
  );
}
