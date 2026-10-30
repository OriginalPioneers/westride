"use client";

import { useRouter } from "next/navigation";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import {
  activityPath,
  boardPath,
  projectPath,
  projectSettingsPath,
  runsPath,
  ticketsPath,
} from "@/lib/build/labels";

export type ProjectSection =
  | "overview"
  | "board"
  | "tickets"
  | "activity"
  | "runs"
  | "settings";

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
    board: boardPath(projectId),
    tickets: ticketsPath(projectId),
    activity: activityPath(projectId),
    runs: runsPath(projectId),
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
      <Tab value="board" label="Board" href={hrefs.board} />
      <Tab
        value="tickets"
        label={openTicketCount > 0 ? `Tickets (${openTicketCount})` : "Tickets"}
        href={hrefs.tickets}
      />
      <Tab value="activity" label="Activity" href={hrefs.activity} />
      <Tab value="runs" label="Agent runs" href={hrefs.runs} />
      {canEdit ? <Tab value="settings" label="Settings" href={hrefs.settings} /> : null}
    </TabList>
  );
}
