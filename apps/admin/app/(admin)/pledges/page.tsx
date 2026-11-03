import type { Metadata } from "next";
import type { PledgeStatus } from "@westride/db";
import { listPledgesForAdmin, type AdminPledgeRow } from "@westride/db/admin";
import { resolveProfiles } from "@/lib/clerk-users";
import { formatMicros, plural, shortId } from "@/lib/format";
import { PLEDGE_KIND_LABELS, PLEDGE_STATUS } from "@/lib/labels";
import { siteIdeaUrl } from "@/lib/paths";
import { ListPagination, ListSearch } from "../list-controls";
import { PageFrame } from "../page-frame";
import { readListParams, type ListSearchParams } from "../search-params";
import { PledgesTable, type PledgeRow } from "./pledges-table";

export const metadata: Metadata = { title: "Supporter pledges" };

export const dynamic = "force-dynamic";

const STATUSES: PledgeStatus[] = ["ACTIVE", "PAUSED", "REVOKED"];

const FILTER = {
  key: "status",
  label: "Status",
  options: [{ value: "all", label: "All pledges" }, ...STATUSES.map((status) => ({ value: status, label: PLEDGE_STATUS[status].label }))],
};

function terms(pledge: AdminPledgeRow): string {
  if (pledge.kind === "COMPUTE") {
    return "Their linked devices run jobs";
  }
  if (pledge.capMicros === null) {
    return "No limit";
  }
  return pledge.resetsMonthly ? `Up to ${formatMicros(pledge.capMicros)} a month` : `Up to ${formatMicros(pledge.capMicros)} in total`;
}

function usage(pledge: AdminPledgeRow): string {
  const jobs = plural(pledge.jobsTotal, "job");
  if (pledge.kind === "COMPUTE") {
    return jobs;
  }
  const parts = [`${formatMicros(pledge.spentMicrosTotal)} lifetime`, jobs];
  if (pledge.resetsMonthly) {
    parts.unshift(`${formatMicros(pledge.spentMicrosThisPeriod)} this period`);
  }
  return parts.join(" · ");
}

export default async function PledgesPage({ searchParams }: { searchParams: ListSearchParams }) {
  const { query, page, filter } = await readListParams(searchParams, FILTER.key);
  const status = STATUSES.find((entry) => entry === filter);
  const result = await listPledgesForAdmin({ query, page, status });
  const profiles = await resolveProfiles(result.rows.map((row) => row.clerkUserId));

  const rows: PledgeRow[] = result.rows.map((row) => {
    const supporter = profiles.get(row.clerkUserId);
    const tone = PLEDGE_STATUS[row.status];
    return {
      id: row.id,
      ideaId: row.ideaId,
      ideaName: row.ideaIsPublic ? row.ideaName : `${row.ideaName} (private)`,
      ideaUrl: siteIdeaUrl(row.ideaId),
      supporter: {
        clerkUserId: row.clerkUserId,
        name: supporter?.name ?? shortId(row.clerkUserId),
        email: supporter?.email ?? null,
      },
      kind: PLEDGE_KIND_LABELS[row.kind],
      status: tone.label,
      statusVariant: tone.tone,
      terms: terms(row),
      usage: usage(row),
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  });

  return (
    <PageFrame
      title="Supporter pledges"
      description="Members backing an idea with their Meta key (tokens) or their own computers (compute). WeStride never holds the money."
    >
      <ListSearch placeholder="Search by idea name, note, or supporter id" filter={FILTER} />
      <PledgesTable
        rows={rows}
        emptyTitle={query || status ? "No pledges match" : "No pledges yet"}
        emptyDescription={query || status ? "Try another word or status." : "Pledges show here as supporters back ideas."}
      />
      <ListPagination page={result.page} pageSize={result.pageSize} total={result.total} noun="pledges" />
    </PageFrame>
  );
}
