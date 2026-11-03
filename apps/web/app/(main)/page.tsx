import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { brandTagline } from "@westride/theme";
import { AGENTS } from "@/lib/idea-factory/agents";
import type { ImportResume } from "./home/import-repo-form";
import { Landing } from "./home/landing";

export const metadata: Metadata = {
  title: {
    absolute: `WeStride · ${brandTagline}`,
  },
  description:
    "An open-source platform where Meta's models pressure-test your idea, build it with you in a real GitHub repository, and give it AI agents of its own. Built at the 2026 Meta Global AI Developer Hackathon.",
};

const MAX_IMPORT_URL = 500;

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    import?: string | string[];
    github?: string | string[];
  }>;
}) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  const importUrl = first(params.import)?.slice(0, MAX_IMPORT_URL) ?? null;
  const importResume: ImportResume | null = importUrl
    ? { url: importUrl, githubOutcome: first(params.github) }
    : null;

  return (
    <Landing
      firstName={user?.firstName ?? null}
      importResume={importResume}
      stats={{ advisors: AGENTS.length }}
    />
  );
}
