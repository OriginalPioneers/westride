import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUserSummaryForAdmin } from "@westride/db/admin";
import { getAdminViewer } from "@/lib/admin-auth";
import { getUserProfile } from "@/lib/clerk-users";
import { formatMicros, plural } from "@/lib/format";
import {
  AGENT_SCHEDULE_LABELS,
  AGENT_STATUS,
  DEVICE_STATUS,
  LEDGER_KIND_LABELS,
  PLEDGE_KIND_LABELS,
  PLEDGE_STATUS,
  PROJECT_STATUS,
} from "@/lib/labels";
import { siteAgentUrl, siteIdeaUrl, siteProjectUrl } from "@/lib/paths";
import { UserDetail, type UserDetailData } from "./user-detail";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const profile = await getUserProfile(decodeURIComponent(id));
  return { title: profile?.name ?? "Member" };
}

export default async function UserPage({ params }: { params: Params }) {
  const { id } = await params;
  const clerkUserId = decodeURIComponent(id);
  const [profile, summary, viewer] = await Promise.all([
    getUserProfile(clerkUserId),
    getUserSummaryForAdmin(clerkUserId),
    getAdminViewer(),
  ]);
  if (!profile) {
    notFound();
  }

  const data: UserDetailData = {
    profile,
    isSelf: viewer.userId === clerkUserId,
    cloud: {
      hasAccount: summary.cloud.account !== null,
      balanceMicros: summary.cloud.balanceMicros,
      creditedMicros: summary.cloud.totals.creditedMicros,
      aiSpentMicros: summary.cloud.totals.aiSpentMicros,
      computeSpentMicros: summary.cloud.totals.computeSpentMicros,
      providerPreference: summary.cloud.account?.providerPreference ?? "OWN",
      ledger: summary.cloud.ledger.map((entry) => ({
        id: entry.id,
        kind: LEDGER_KIND_LABELS[entry.kind],
        amountMicros: entry.amountMicros,
        description: entry.description,
        model: entry.model,
        createdAt: entry.createdAt.toISOString(),
      })),
      redemptions: summary.cloud.redemptions.map((redemption) => ({
        code: redemption.code,
        amountMicros: redemption.amountMicros,
        createdAt: redemption.createdAt.toISOString(),
      })),
    },
    ideas: summary.ideas.map((idea) => ({
      id: idea.id,
      name: idea.name,
      detail: idea.role === "FOUNDER" ? "Founder" : "Member",
      status: null,
      isPublic: idea.isPublic,
      isFeatured: idea.isFeatured,
      siteUrl: siteIdeaUrl(idea.id),
      createdAt: idea.createdAt.toISOString(),
    })),
    projects: summary.projects.map((project) => ({
      id: project.id,
      name: project.name,
      detail: project.role === "OWNER" ? "Owner" : "Member",
      status: PROJECT_STATUS[project.status],
      isPublic: project.isPublic,
      isFeatured: project.isFeatured,
      siteUrl: siteProjectUrl(project.id),
      createdAt: project.createdAt.toISOString(),
    })),
    agents: summary.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      detail: AGENT_SCHEDULE_LABELS[agent.schedule],
      status: AGENT_STATUS[agent.status],
      isPublic: agent.isPublic,
      isFeatured: agent.isFeatured,
      siteUrl: siteAgentUrl(agent.id),
      createdAt: agent.createdAt.toISOString(),
    })),
    pledges: summary.pledges.map((pledge) => ({
      id: pledge.id,
      name: pledge.ideaIsPublic ? pledge.ideaName : `${pledge.ideaName} (private)`,
      detail:
        pledge.kind === "COMPUTE"
          ? `${PLEDGE_KIND_LABELS.COMPUTE} · ${plural(pledge.jobsTotal, "job")}`
          : `${PLEDGE_KIND_LABELS.TOKENS} · ${formatMicros(pledge.spentMicrosTotal)} lifetime · ${plural(pledge.jobsTotal, "job")}`,
      status: PLEDGE_STATUS[pledge.status],
      isPublic: pledge.ideaIsPublic,
      isFeatured: false,
      siteUrl: siteIdeaUrl(pledge.ideaId),
      createdAt: pledge.createdAt.toISOString(),
    })),
    devices: summary.devices.map((device) => ({
      id: device.id,
      name: device.name,
      detail: [[device.os, device.arch].filter(Boolean).join(" "), plural(device.jobsCompleted, "job")].filter(Boolean).join(" · "),
      status: DEVICE_STATUS[device.status],
      isPublic: true,
      isFeatured: false,
      siteUrl: null,
      createdAt: device.createdAt.toISOString(),
    })),
    connections: [
      { label: "GitHub", value: summary.connections.github ? `@${summary.connections.github}` : null },
      { label: "Meta", value: summary.connections.meta },
      { label: "Vercel", value: summary.connections.vercel },
      { label: "Modal", value: summary.connections.modal ? "Connected" : null },
      { label: "Chat", value: summary.connections.chat.length > 0 ? summary.connections.chat.join(", ") : null },
    ],
  };

  return <UserDetail data={data} />;
}
