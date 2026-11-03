import type { Metadata } from "next";
import { Banner } from "@astryxdesign/core/Banner";
import { listActiveClerkUserIds, sumCloudBalances } from "@westride/db/admin";
import { listUsers } from "@/lib/clerk-users";
import { ListPagination, ListSearch } from "../list-controls";
import { PageFrame } from "../page-frame";
import { readListParams, type ListSearchParams } from "../search-params";
import { UsersTable, type UserRow } from "./users-table";

export const metadata: Metadata = { title: "Users" };

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: ListSearchParams }) {
  const { query, page } = await readListParams(searchParams);

  let result: Awaited<ReturnType<typeof listUsers>> | null = null;
  try {
    result = await listUsers({ query, page });
  } catch (error) {
    console.error("Listing Clerk users failed", error);
  }

  const ids = result?.users.map((user) => user.clerkUserId) ?? [];
  const [balances, activeIds] = await Promise.all([sumCloudBalances(ids), listActiveClerkUserIds()]);

  const rows: UserRow[] =
    result?.users.map((user) => ({
      ...user,
      balanceMicros: balances.get(user.clerkUserId) ?? null,
      isActiveOnWeStride: activeIds.has(user.clerkUserId),
    })) ?? [];

  return (
    <PageFrame
      title="Users"
      description="Every account in Clerk, newest first. Open a member to see their ideas, builds, agents, pledges, devices, and WeStride Cloud balance."
    >
      <ListSearch placeholder="Search by name, email, username, or Clerk id" />
      {result === null ? (
        <Banner status="error" title="Clerk did not answer" description="The user list could not be loaded. Reload the page in a moment." />
      ) : (
        <>
          <UsersTable
            rows={rows}
            emptyTitle={query ? "No users match" : "No users yet"}
            emptyDescription={query ? "Clerk matches on name, email, username, phone, and id." : "Accounts show here as people sign up."}
          />
          <ListPagination page={result.page} pageSize={result.pageSize} total={result.total} noun="users" />
        </>
      )}
    </PageFrame>
  );
}
