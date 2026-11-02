"use client";

import type { ProjectStatus } from "@westride/db";
import { PROJECT_VIEW_LABELS, projectsPath, resolveProjectCollection } from "@/lib/build/filters";
import { PROJECT_STATUS_LABELS } from "@/lib/build/labels";
import {
  COLLECTION_SORT_OPTIONS,
  COLLECTION_VIEWS,
  DEFAULT_COLLECTION_SORT,
  statusSlug,
  type CollectionFilterValues,
  type CollectionView,
} from "@/lib/collections/filters";
import { CollectionSearchBar, CollectionTabs } from "../collection-filters";

export function ProjectSearchBar({ values }: { values: CollectionFilterValues }) {
  return (
    <CollectionSearchBar
      label="Search projects"
      placeholder="Search projects..."
      query={values.q}
      sort={values.sort || DEFAULT_COLLECTION_SORT}
      sortOptions={COLLECTION_SORT_OPTIONS}
      toHref={(next) => projectsPath({ ...values, ...next })}
    />
  );
}

/**
 * The pills under the search bar: the viewer's collections first, then one
 * per status that has a project in it.
 */
export function ProjectCollectionTabs({
  values,
  isSignedIn,
  statuses,
}: {
  values: CollectionFilterValues;
  isSignedIn: boolean;
  statuses: ProjectStatus[];
}) {
  const collection = resolveProjectCollection(values, isSignedIn);
  const sort = values.sort;

  const viewHref = (view: CollectionView) => projectsPath({ view, sort });
  const statusHref = (status: ProjectStatus) => projectsPath({ status: statusSlug(status), sort });

  const selected =
    collection.kind === "view"
      ? viewHref(collection.view)
      : collection.kind === "status"
        ? statusHref(collection.status)
        : "";

  return (
    <CollectionTabs
      selected={selected}
      tabs={[
        ...COLLECTION_VIEWS.map((view) => ({ href: viewHref(view), label: PROJECT_VIEW_LABELS[view] })),
        ...statuses.map((status) => ({
          href: statusHref(status),
          label: PROJECT_STATUS_LABELS[status],
        })),
      ]}
    />
  );
}
