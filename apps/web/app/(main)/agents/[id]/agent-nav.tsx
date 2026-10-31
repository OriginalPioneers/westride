"use client";

import { useRouter } from "next/navigation";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import {
  agentJobsPath,
  agentLogPath,
  agentPath,
  agentSettingsPath,
  agentTicketsPath,
  agentUsagePath,
} from "@/lib/agents/labels";

export type AgentSection = "overview" | "tickets" | "jobs" | "log" | "usage" | "settings";

export function AgentNav({
  agentId,
  selected,
  openTicketCount,
  canEdit,
}: {
  agentId: string;
  selected: AgentSection;
  openTicketCount: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const hrefs: Record<AgentSection, string> = {
    overview: agentPath(agentId),
    tickets: agentTicketsPath(agentId),
    jobs: agentJobsPath(agentId),
    log: agentLogPath(agentId),
    usage: agentUsagePath(agentId),
    settings: agentSettingsPath(agentId),
  };
  return (
    <TabList
      value={selected}
      hasDivider
      onChange={(value) => {
        if (value in hrefs) {
          router.push(hrefs[value as AgentSection]);
        }
      }}
    >
      <Tab value="overview" label="Overview" href={hrefs.overview} />
      <Tab
        value="tickets"
        label={openTicketCount > 0 ? `Tickets (${openTicketCount})` : "Tickets"}
        href={hrefs.tickets}
      />
      <Tab value="jobs" label="Jobs" href={hrefs.jobs} />
      <Tab value="log" label="Log" href={hrefs.log} />
      <Tab value="usage" label="Usage" href={hrefs.usage} />
      {canEdit ? <Tab value="settings" label="Settings" href={hrefs.settings} /> : null}
    </TabList>
  );
}
