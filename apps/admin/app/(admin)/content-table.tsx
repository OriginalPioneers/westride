"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import { VStack } from "@astryxdesign/core/Stack";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { FeaturedKind } from "./actions";
import { FeaturedSwitch } from "./featured-switch";
import { OwnerCell, VisibilityText, type OwnerCellData } from "./owner-cell";

/**
 * One row of the ideas, builds, or agents table. The pages map their
 * database rows to this shape, so the three lists share one table.
 */
export type ContentRow = {
  id: string;
  name: string;
  /** The line under the name: type, status, links to its idea or build. */
  detail: string;
  /** A status word, when the kind has one (builds, agents). */
  status: string | null;
  statusVariant: "neutral" | "success" | "warning" | "info";
  owner: OwnerCellData | null;
  /** "3 members · 12 followers", "4 jobs". */
  activity: string;
  isPublic: boolean;
  isFeatured: boolean;
  /** Where to see it on the member-facing site. */
  siteUrl: string;
  updatedAt: string;
  createdAt: string;
};

export function ContentTable({
  kind,
  rows,
  emptyTitle,
  emptyDescription,
  page,
  pageSize,
  total,
}: {
  kind: FeaturedKind;
  rows: ContentRow[];
  emptyTitle: string;
  emptyDescription: string;
  page: number;
  pageSize: number;
  total: number;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  const columns: TableColumn<ContentRow>[] = [
    {
      key: "name",
      header: "Name",
      width: proportional(3, { minWidth: 180 }),
      renderCell: (row) => (
        <VStack gap={0}>
          <Link href={row.siteUrl} isExternalLink newTabLabel="Opens on WeStride in a new tab">
            {row.name}
          </Link>
          <Text type="supporting" maxLines={1}>
            {row.detail}
          </Text>
        </VStack>
      ),
    },
    {
      key: "owner",
      header: kind === "idea" ? "Founder" : "Owner",
      width: proportional(2, { minWidth: 140 }),
      renderCell: (row) => <OwnerCell owner={row.owner} />,
    },
    {
      key: "activity",
      header: "Activity",
      width: proportional(2, { minWidth: 120 }),
      renderCell: (row) => <Text type="supporting">{row.activity}</Text>,
    },
    {
      key: "isPublic",
      header: "Visibility",
      width: pixel(80),
      renderCell: (row) => <VisibilityText isPublic={row.isPublic} />,
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: pixel(110),
      renderCell: (row) => <Timestamp value={row.updatedAt} format="auto" />,
    },
    {
      key: "isFeatured",
      header: "Featured",
      width: pixel(80),
      align: "end",
      renderCell: (row) => <FeaturedSwitch kind={kind} id={row.id} name={row.name} isFeatured={row.isFeatured} />,
    },
  ];
  if (kind !== "idea") {
    columns.splice(2, 0, {
      key: "status",
      header: "Status",
      width: pixel(100),
      renderCell: (row) => (row.status ? <Badge variant={row.statusVariant} label={row.status} /> : null),
    });
  }
  return (
    <Table
      data={rows}
      idKey="id"
      columns={columns}
      density="compact"
      hasHover
      textOverflow="truncate"
      rowIndexStart={(page - 1) * pageSize + 1}
      rowCount={total}
    />
  );
}
