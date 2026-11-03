"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { RecentContentKind } from "@westride/db/admin";
import { ADMIN_PATHS } from "@/lib/paths";
import { FeaturedSwitch } from "./featured-switch";

export type RecentRow = {
  kind: RecentContentKind;
  id: string;
  name: string;
  isPublic: boolean;
  isFeatured: boolean;
  createdAt: string;
};

const KIND_LABELS: Record<RecentContentKind, string> = {
  idea: "Idea",
  project: "Build",
  agent: "Agent",
};

const KIND_PATHS: Record<RecentContentKind, string> = {
  idea: ADMIN_PATHS.ideas,
  project: ADMIN_PATHS.projects,
  agent: ADMIN_PATHS.agents,
};

export function RecentContentTable({ rows }: { rows: RecentRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="Nothing yet" description="Ideas, builds, and agents show here as members create them." />;
  }
  return (
    <Table
      data={rows}
      idKey={(row) => `${row.kind}:${row.id}`}
      density="compact"
      hasHover
      textOverflow="truncate"
      columns={[
        {
          key: "name",
          header: "Name",
          width: proportional(3, { minWidth: 200 }),
          renderCell: (row) => (
            <Link href={`${KIND_PATHS[row.kind]}?q=${encodeURIComponent(row.id)}`}>{row.name}</Link>
          ),
        },
        {
          key: "kind",
          header: "Kind",
          width: pixel(90),
          renderCell: (row) => <Text type="supporting">{KIND_LABELS[row.kind]}</Text>,
        },
        {
          key: "isPublic",
          header: "Visibility",
          width: pixel(110),
          renderCell: (row) =>
            row.isPublic ? <Badge variant="success" label="Public" /> : <Badge variant="neutral" label="Private" />,
        },
        {
          key: "createdAt",
          header: "Created",
          width: pixel(150),
          renderCell: (row) => <Timestamp value={row.createdAt} format="auto" />,
        },
        {
          key: "isFeatured",
          header: "Featured",
          width: pixel(90),
          align: "end",
          renderCell: (row) => <FeaturedSwitch kind={row.kind} id={row.id} name={row.name} isFeatured={row.isFeatured} />,
        },
      ]}
    />
  );
}
