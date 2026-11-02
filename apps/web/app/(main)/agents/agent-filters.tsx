"use client";

import type { AgentStatus } from "@westride/db";
import { AGENT_VIEW_LABELS, agentsCollectionPath, resolveAgentCollection } from "@/lib/agents/filters";
import { AGENT_STATUS_LABELS } from "@/lib/agents/labels";
import {
  COLLECTION_SORT_OPTIONS,
  COLLECTION_VIEWS,
  DEFAULT_COLLECTION_SORT,
  statusSlug,
  type CollectionFilterValues,
  type CollectionView,
} from "@/lib/collections/filters";
import { CollectionSearchBar, CollectionTabs } from "../collection-filters";

export function AgentSearchBar({ values }: { values: CollectionFilterValues }) {
  return (
    <CollectionSearchBar
      label="Search agents"
      placeholder="Search agents..."
      query={values.q}
      sort={values.sort || DEFAULT_COLLECTION_SORT}
      sortOptions={COLLECTION_SORT_OPTIONS}
      toHref={(next) => agentsCollectionPath({ ...values, ...next })}
    />
  );
}

/**
 * The pills under the search bar: the viewer's collections first, then one
 * per status that has an agent in it.
 */
export function AgentCollectionTabs({
  values,
  isSignedIn,
  statuses,
}: {
  values: CollectionFilterValues;
  isSignedIn: boolean;
  statuses: AgentStatus[];
}) {
  const collection = resolveAgentCollection(values, isSignedIn);
  const sort = values.sort;

  const viewHref = (view: CollectionView) => agentsCollectionPath({ view, sort });
  const statusHref = (status: AgentStatus) =>
    agentsCollectionPath({ status: statusSlug(status), sort });

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
        ...COLLECTION_VIEWS.map((view) => ({ href: viewHref(view), label: AGENT_VIEW_LABELS[view] })),
        ...statuses.map((status) => ({
          href: statusHref(status),
          label: AGENT_STATUS_LABELS[status],
        })),
      ]}
    />
  );
}
