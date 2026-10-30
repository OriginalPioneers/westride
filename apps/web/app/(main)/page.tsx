import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { mainAchievementCatalog } from "@westride/db";
import { AGENTS } from "@/lib/idea-factory/agents";
import { Landing } from "./home/landing";

export const metadata: Metadata = {
  title: "WeStride · Learn AI, find a mentor, build what's next",
  description:
    "An open-source platform for learning AI, mentorship, and entrepreneurship, built at the 2026 Meta Global AI Developer Hackathon and powered by Meta's models.",
};

// The Academy ships ten seeded tracks (packages/db/src/academy-tracks).
const ACADEMY_TRACK_COUNT = 10;

export default async function Home() {
  const user = await currentUser();

  return (
    <Landing
      firstName={user?.firstName ?? null}
      isSignedIn={user != null}
      stats={{
        advisors: AGENTS.length,
        achievements: mainAchievementCatalog.length,
        tracks: ACADEMY_TRACK_COUNT,
      }}
    />
  );
}
