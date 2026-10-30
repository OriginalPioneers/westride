import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { AGENTS } from "@/lib/idea-factory/agents";
import { getConnectionStatuses } from "./home/connection-status";
import { Landing } from "./home/landing";

export const metadata: Metadata = {
  title: {
    absolute: "WeStride · Shape an idea, build it for real, give it AI agents",
  },
  description:
    "An open-source platform where Meta's models pressure-test your idea, build it with you in a real GitHub repository, and give it AI agents of its own. Built at the 2026 Meta Global AI Developer Hackathon.",
};

export default async function Home() {
  const user = await currentUser();
  const connections = await getConnectionStatuses(user?.id ?? null);

  return (
    <Landing
      firstName={user?.firstName ?? null}
      isSignedIn={user != null}
      stats={{ advisors: AGENTS.length }}
      connections={connections}
    />
  );
}
