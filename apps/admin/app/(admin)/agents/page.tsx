import type { Metadata } from "next";
import { listAgentsForAdmin } from "@westride/db/admin";
import { resolveProfiles } from "@/lib/clerk-users";
import { plural } from "@/lib/format";
import { AGENT_SCHEDULE_LABELS, AGENT_STATUS } from "@/lib/labels";
import { siteAgentUrl } from "@/lib/paths";
import { ContentTable, type ContentRow } from "../content-table";
import { ListPagination, ListSearch } from "../list-controls";
import { PageFrame } from "../page-frame";
import { readListParams, type ListSearchParams } from "../search-params";

export const metadata: Metadata = { title: "Agents" };

export const dynamic = "force-dynamic";

const FILTER = {
  key: "show",
  label: "Show",
  options: [
    { value: "all", label: "All agents" },
    { value: "featured", label: "Featured only" },
  ],
};

export default async function AgentsPage({ searchParams }: { searchParams: ListSearchParams }) {
  const { query, page, filter } = await readListParams(searchParams, FILTER.key);
  const result = await listAgentsForAdmin({ query, page, featuredOnly: filter === "featured" });
  const profiles = await resolveProfiles(result.rows.map((row) => row.ownerClerkUserId));

  const rows: ContentRow[] = result.rows.map((row) => {
    const owner = profiles.get(row.ownerClerkUserId);
    const status = AGENT_STATUS[row.status];
    const attached = row.projectName
      ? `Build “${row.projectName}”`
      : row.ideaName
        ? `Idea “${row.ideaName}”`
        : "Not attached";
    return {
      id: row.id,
      name: row.name,
      detail: `${attached} · ${AGENT_SCHEDULE_LABELS[row.schedule]} · ${row.model}`,
      status: status.label,
      statusVariant: status.tone,
      owner: owner ? { clerkUserId: owner.clerkUserId, name: owner.name, email: owner.email } : null,
      activity: plural(row.jobCount, "job"),
      isPublic: row.isPublic,
      isFeatured: row.isFeatured,
      siteUrl: siteAgentUrl(row.id),
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  });

  return (
    <PageFrame
      title="Agents"
      description="Every agent in the Agent Studio. Featured agents are called out on the member site."
    >
      <ListSearch placeholder="Search by name, description, owner id, or agent id" filter={FILTER} />
      <ContentTable
        kind="agent"
        rows={rows}
        emptyTitle={query ? "No agents match" : "No agents yet"}
        emptyDescription={query ? "Try another word, or clear the search." : "Agents show here as members create them."}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
      <ListPagination page={result.page} pageSize={result.pageSize} total={result.total} noun="agents" />
    </PageFrame>
  );
}
