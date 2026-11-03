import type { Metadata } from "next";
import { listProjectsForAdmin } from "@westride/db/admin";
import { resolveProfiles } from "@/lib/clerk-users";
import { plural } from "@/lib/format";
import { ORIGIN_LABELS, PROJECT_STATUS } from "@/lib/labels";
import { siteProjectUrl } from "@/lib/paths";
import { ContentTable, type ContentRow } from "../content-table";
import { ListPagination, ListSearch } from "../list-controls";
import { PageFrame } from "../page-frame";
import { readListParams, type ListSearchParams } from "../search-params";

export const metadata: Metadata = { title: "Builds" };

export const dynamic = "force-dynamic";

const FILTER = {
  key: "show",
  label: "Show",
  options: [
    { value: "all", label: "All builds" },
    { value: "featured", label: "Featured only" },
  ],
};

export default async function ProjectsPage({ searchParams }: { searchParams: ListSearchParams }) {
  const { query, page, filter } = await readListParams(searchParams, FILTER.key);
  const result = await listProjectsForAdmin({ query, page, featuredOnly: filter === "featured" });
  const profiles = await resolveProfiles(result.rows.map((row) => row.ownerClerkUserId));

  const rows: ContentRow[] = result.rows.map((row) => {
    const owner = row.ownerClerkUserId ? profiles.get(row.ownerClerkUserId) : null;
    const status = PROJECT_STATUS[row.status];
    return {
      id: row.id,
      name: row.name,
      detail: row.ideaName ? `From the idea “${row.ideaName}” · ${ORIGIN_LABELS[row.origin]}` : ORIGIN_LABELS[row.origin],
      status: status.label,
      statusVariant: status.tone,
      owner: owner ? { clerkUserId: owner.clerkUserId, name: owner.name, email: owner.email } : null,
      activity: plural(row.memberCount, "member"),
      isPublic: row.isPublic,
      isFeatured: row.isFeatured,
      siteUrl: siteProjectUrl(row.id),
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  });

  return (
    <PageFrame
      title="Builds"
      description="Every project in the Build Studio. Featured builds are called out on the member site."
    >
      <ListSearch placeholder="Search by name, description, or project id" filter={FILTER} />
      <ContentTable
        kind="project"
        rows={rows}
        emptyTitle={query ? "No builds match" : "No builds yet"}
        emptyDescription={query ? "Try another word, or clear the search." : "Builds show here as members start them."}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
      <ListPagination page={result.page} pageSize={result.pageSize} total={result.total} noun="builds" />
    </PageFrame>
  );
}
