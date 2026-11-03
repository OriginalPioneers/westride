"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import { VStack } from "@astryxdesign/core/Stack";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { OwnerCell, type OwnerCellData } from "../owner-cell";

export type PledgeRow = {
  id: string;
  ideaId: string;
  ideaName: string;
  ideaUrl: string;
  supporter: OwnerCellData;
  kind: string;
  status: string;
  statusVariant: "neutral" | "success" | "warning" | "info";
  /** "Up to $20.00 a month", "Linked devices". */
  terms: string;
  /** "$4.12 this period · $31.00 lifetime · 12 jobs" */
  usage: string;
  note: string;
  createdAt: string;
};

export function PledgesTable({ rows, emptyTitle, emptyDescription }: { rows: PledgeRow[]; emptyTitle: string; emptyDescription: string }) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <Table
      data={rows}
      idKey="id"
      density="compact"
      hasHover
      textOverflow="truncate"
      columns={[
        {
          key: "ideaName",
          header: "Idea",
          width: proportional(3, { minWidth: 170 }),
          renderCell: (row) => (
            <VStack gap={0}>
              <Link href={row.ideaUrl} isExternalLink newTabLabel="Opens on WeStride in a new tab">
                {row.ideaName}
              </Link>
              {row.note ? (
                <Text type="supporting" maxLines={1}>
                  “{row.note}”
                </Text>
              ) : null}
            </VStack>
          ),
        },
        {
          key: "supporter",
          header: "Supporter",
          width: proportional(2, { minWidth: 140 }),
          renderCell: (row) => <OwnerCell owner={row.supporter} />,
        },
        {
          key: "kind",
          header: "Kind",
          width: pixel(80),
          renderCell: (row) => <Text type="supporting">{row.kind}</Text>,
        },
        {
          key: "status",
          header: "Status",
          width: pixel(90),
          renderCell: (row) => <Badge variant={row.statusVariant} label={row.status} />,
        },
        {
          key: "terms",
          header: "Terms",
          width: proportional(2, { minWidth: 120 }),
          renderCell: (row) => <Text type="supporting">{row.terms}</Text>,
        },
        {
          key: "usage",
          header: "Used",
          width: proportional(2, { minWidth: 140 }),
          renderCell: (row) => <Text type="supporting">{row.usage}</Text>,
        },
        {
          key: "createdAt",
          header: "Pledged",
          width: pixel(110),
          renderCell: (row) => <Timestamp value={row.createdAt} format="auto" />,
        },
      ]}
    />
  );
}
