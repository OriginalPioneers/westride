"use client";

import { useRouter } from "next/navigation";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { projectPath, projectSettingsPath, ticketsPath } from "@/lib/build/labels";

export type ProjectSection = "overview" | "tickets" | "settings";

export function ProjectNav({
  projectId,
  selected,
  openTicketCount,
  canEdit,
}: {
  projectId: string;
  selected: ProjectSection;
  openTicketCount: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const hrefs: Record<ProjectSection, string> = {
    overview: projectPath(projectId),
    tickets: ticketsPath(projectId),
    settings: projectSettingsPath(projectId),
  };
  return (
    <TabList
      value={selected}
      hasDivider
      onChange={(value) => {
        if (value in hrefs) {
          router.push(hrefs[value as ProjectSection]);
        }
      }}
    >
      <Tab value="overview" label="Overview" href={hrefs.overview} />
      <Tab
        value="tickets"
        label={openTicketCount > 0 ? `Tickets (${openTicketCount})` : "Tickets"}
        href={hrefs.tickets}
      />
      {canEdit ? <Tab value="settings" label="Settings" href={hrefs.settings} /> : null}
    </TabList>
  );
}
