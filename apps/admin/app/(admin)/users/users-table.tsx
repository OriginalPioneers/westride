"use client";

import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { AdminUserProfile } from "@/lib/clerk-users";
import { formatMicros, shortId } from "@/lib/format";
import { userPath } from "@/lib/paths";

export type UserRow = AdminUserProfile & {
  /** Null when the member has no WeStride Cloud ledger. */
  balanceMicros: number | null;
  /** Has an idea, build, agent, pledge, or device. */
  isActiveOnWeStride: boolean;
};

export function UsersTable({ rows, emptyTitle, emptyDescription }: { rows: UserRow[]; emptyTitle: string; emptyDescription: string }) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <Table
      data={rows}
      idKey="clerkUserId"
      density="compact"
      hasHover
      textOverflow="truncate"
      columns={[
        {
          key: "name",
          header: "Member",
          width: proportional(3, { minWidth: 220 }),
          renderCell: (row) => (
            <HStack gap={3} vAlign="center">
              <Avatar name={row.name} src={row.imageUrl ?? undefined} size="sm" tooltip={false} />
              <VStack gap={0}>
                <HStack gap={2} vAlign="center">
                  <Link href={userPath(row.clerkUserId)}>{row.name}</Link>
                  {row.isAdmin ? <Badge variant="info" label="Admin" /> : null}
                  {row.isBanned ? <Badge variant="error" label="Banned" /> : null}
                  {row.isLocked ? <Badge variant="warning" label="Locked" /> : null}
                </HStack>
                <Text type="supporting" maxLines={1}>
                  {row.email ?? shortId(row.clerkUserId)}
                  {row.username ? ` · @${row.username}` : ""}
                </Text>
              </VStack>
            </HStack>
          ),
        },
        {
          key: "isActiveOnWeStride",
          header: "On WeStride",
          width: pixel(110),
          renderCell: (row) => <Text type="supporting">{row.isActiveOnWeStride ? "Active" : "Signed up only"}</Text>,
        },
        {
          key: "balanceMicros",
          header: "Cloud balance",
          width: pixel(110),
          align: "end",
          renderCell: (row) =>
            row.balanceMicros === null ? <Text type="supporting">—</Text> : <Text weight="medium">{formatMicros(row.balanceMicros)}</Text>,
        },
        {
          key: "lastActiveAt",
          header: "Last active",
          width: pixel(110),
          renderCell: (row) =>
            row.lastActiveAt ? <Timestamp value={row.lastActiveAt} format="auto" /> : <Text type="supporting">Never</Text>,
        },
        {
          key: "createdAt",
          header: "Joined",
          width: pixel(110),
          renderCell: (row) => <Timestamp value={row.createdAt} format="auto" />,
        },
      ]}
    />
  );
}
