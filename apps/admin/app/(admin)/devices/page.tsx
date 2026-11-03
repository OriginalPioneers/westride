import type { Metadata } from "next";
import type { Device } from "@westride/db";
import { listDevicesForAdmin } from "@westride/db/admin";
import { isDeviceOnline } from "@westride/db/devices";
import { resolveProfiles } from "@/lib/clerk-users";
import { shortId } from "@/lib/format";
import { DEVICE_STATUS } from "@/lib/labels";
import { ListPagination, ListSearch } from "../list-controls";
import { PageFrame } from "../page-frame";
import { readListParams, type ListSearchParams } from "../search-params";
import { DevicesTable, type DeviceRow } from "./devices-table";

export const metadata: Metadata = { title: "Devices" };

export const dynamic = "force-dynamic";

const FILTER = {
  key: "show",
  label: "Show",
  options: [
    { value: "linked", label: "Linked only" },
    { value: "all", label: "Including unlinked" },
  ],
};

function hardware(device: Device): string {
  const parts = [[device.os, device.arch].filter(Boolean).join(" ")];
  if (device.cpus > 0) {
    parts.push(`${device.cpus} CPUs`);
  }
  if (device.memoryMb > 0) {
    parts.push(`${Math.round(device.memoryMb / 1024)} GB`);
  }
  if (device.runnerVersion) {
    parts.push(`runner ${device.runnerVersion}`);
  }
  return parts.filter(Boolean).join(" · ") || "No heartbeat yet";
}

export default async function DevicesPage({ searchParams }: { searchParams: ListSearchParams }) {
  const { query, page, filter } = await readListParams(searchParams, FILTER.key);
  const result = await listDevicesForAdmin({ query, page, activeOnly: filter !== "all" });
  const profiles = await resolveProfiles(result.rows.map((row) => row.clerkUserId));

  const rows: DeviceRow[] = result.rows.map((device) => {
    const owner = profiles.get(device.clerkUserId);
    const status = DEVICE_STATUS[device.status];
    return {
      id: device.id,
      name: device.name,
      owner: {
        clerkUserId: device.clerkUserId,
        name: owner?.name ?? shortId(device.clerkUserId),
        email: owner?.email ?? null,
      },
      status: status.label,
      statusVariant: status.tone,
      isOnline: isDeviceOnline(device),
      hardware: hardware(device),
      models: device.models.join(", "),
      hasMetaKey: device.hasMetaKey,
      isBusy: device.currentJobId !== null,
      jobsCompleted: device.jobsCompleted,
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
      createdAt: device.createdAt.toISOString(),
    };
  });

  return (
    <PageFrame
      title="Devices"
      description="Computers supporters linked by running the WeStride runner. Online means a heartbeat in the last few minutes."
    >
      <ListSearch placeholder="Search by computer name, OS, or supporter id" filter={FILTER} />
      <DevicesTable
        rows={rows}
        emptyTitle={query ? "No devices match" : "No devices yet"}
        emptyDescription={query ? "Try another word, or clear the search." : "Devices show here as supporters link them."}
      />
      <ListPagination page={result.page} pageSize={result.pageSize} total={result.total} noun="devices" />
    </PageFrame>
  );
}
