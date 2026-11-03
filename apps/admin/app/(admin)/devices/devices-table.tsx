"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { OwnerCell, type OwnerCellData } from "../owner-cell";

export type DeviceRow = {
  id: string;
  name: string;
  owner: OwnerCellData;
  status: string;
  statusVariant: "neutral" | "success" | "warning" | "info";
  isOnline: boolean;
  /** "macOS arm64 · 8 CPUs · 16 GB · runner 0.4.1" */
  hardware: string;
  /** Ollama tags, or "". */
  models: string;
  hasMetaKey: boolean;
  isBusy: boolean;
  jobsCompleted: number;
  lastSeenAt: string | null;
  createdAt: string;
};

export function DevicesTable({ rows, emptyTitle, emptyDescription }: { rows: DeviceRow[]; emptyTitle: string; emptyDescription: string }) {
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
          key: "name",
          header: "Computer",
          width: proportional(3, { minWidth: 180 }),
          renderCell: (row) => (
            <VStack gap={0}>
              <HStack gap={2} vAlign="center">
                <StatusDot
                  variant={row.isOnline ? "success" : "neutral"}
                  label={row.isOnline ? "Online" : "Offline"}
                  isPulsing={row.isBusy}
                />
                <Text weight="medium" maxLines={1}>
                  {row.name}
                </Text>
              </HStack>
              <Text type="supporting" maxLines={1}>
                {row.hardware}
              </Text>
            </VStack>
          ),
        },
        {
          key: "owner",
          header: "Supporter",
          width: proportional(2, { minWidth: 140 }),
          renderCell: (row) => <OwnerCell owner={row.owner} />,
        },
        {
          key: "status",
          header: "Status",
          width: pixel(90),
          renderCell: (row) => <Badge variant={row.statusVariant} label={row.status} />,
        },
        {
          key: "models",
          header: "Models",
          width: proportional(2, { minWidth: 120 }),
          renderCell: (row) => (
            <Text type="supporting" maxLines={1}>
              {row.models || "—"}
              {row.hasMetaKey ? " · own Meta key" : ""}
            </Text>
          ),
        },
        {
          key: "jobsCompleted",
          header: "Jobs",
          width: pixel(70),
          align: "end",
          renderCell: (row) => (
            <Text type="supporting">
              {row.isBusy ? `${row.jobsCompleted} · busy` : row.jobsCompleted}
            </Text>
          ),
        },
        {
          key: "lastSeenAt",
          header: "Last seen",
          width: pixel(110),
          renderCell: (row) =>
            row.lastSeenAt ? <Timestamp value={row.lastSeenAt} format="auto" /> : <Text type="supporting">Never</Text>,
        },
      ]}
    />
  );
}
