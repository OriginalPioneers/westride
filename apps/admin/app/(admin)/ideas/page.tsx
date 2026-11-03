import type { Metadata } from "next";
import { listIdeasForAdmin } from "@westride/db/admin";
import { resolveProfiles } from "@/lib/clerk-users";
import { plural } from "@/lib/format";
import { IDEA_TYPE_LABELS, ORIGIN_LABELS } from "@/lib/labels";
import { siteIdeaUrl } from "@/lib/paths";
import { ContentTable, type ContentRow } from "../content-table";
import { ListPagination, ListSearch } from "../list-controls";
import { PageFrame } from "../page-frame";
import { readListParams, type ListSearchParams } from "../search-params";

export const metadata: Metadata = { title: "Ideas" };

export const dynamic = "force-dynamic";

const FILTER = {
  key: "show",
  label: "Show",
  options: [
    { value: "all", label: "All ideas" },
    { value: "featured", label: "Featured only" },
  ],
};

export default async function IdeasPage({ searchParams }: { searchParams: ListSearchParams }) {
  const { query, page, filter } = await readListParams(searchParams, FILTER.key);
  const result = await listIdeasForAdmin({ query, page, featuredOnly: filter === "featured" });
  const profiles = await resolveProfiles(result.rows.map((row) => row.founderClerkUserId));

  const rows: ContentRow[] = result.rows.map((row) => {
    const founder = row.founderClerkUserId ? profiles.get(row.founderClerkUserId) : null;
    return {
      id: row.id,
      name: row.name,
      detail: `${IDEA_TYPE_LABELS[row.type]} · ${ORIGIN_LABELS[row.origin]}`,
      status: null,
      statusVariant: "neutral",
      owner: founder ? { clerkUserId: founder.clerkUserId, name: founder.name, email: founder.email } : null,
      activity: `${plural(row.memberCount, "member")} · ${plural(row.followerCount, "follower")}`,
      isPublic: row.isPublic,
      isFeatured: row.isFeatured,
      siteUrl: siteIdeaUrl(row.id),
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  });

  return (
    <PageFrame
      title="Ideas"
      description="Every idea in the Idea Workshop. Featured ideas lead the Best of WeStride collection on the member site."
    >
      <ListSearch placeholder="Search by name, description, or idea id" filter={FILTER} />
      <ContentTable
        kind="idea"
        rows={rows}
        emptyTitle={query ? "No ideas match" : "No ideas yet"}
        emptyDescription={query ? "Try another word, or clear the search." : "Ideas show here as members create them."}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
      <ListPagination page={result.page} pageSize={result.pageSize} total={result.total} noun="ideas" />
    </PageFrame>
  );
}
