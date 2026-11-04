import type { MetadataRoute } from "next";
import { listTracksForAcademy } from "@westride/db/academy";
import { listAgents } from "@westride/db/agents";
import { listProjects } from "@westride/db/build";
import { listPublicIdeaAddresses } from "@westride/db/ideas";
import { listMentors } from "@westride/db/mentorship";
import { PRODUCTION_ORIGIN } from "@/lib/crawl-policy";
import { ideaPath } from "@/lib/ideas/filters";

// Only production is crawlable (see robots.ts), so every address is given on
// the production host whichever deployment served the file. Rebuilt hourly.
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

const STATIC_PAGES: [path: string, priority: number][] = [
  ["/", 1],
  ["/ideas", 0.9],
  ["/build", 0.8],
  ["/agents", 0.8],
  ["/academy", 0.9],
  ["/mentorship", 0.7],
  ["/mentorship/mentors", 0.7],
  ["/mentorship/become", 0.5],
  ["/wepledge", 0.7],
  ["/cloud", 0.6],
  ["/pricing", 0.6],
  ["/mobile-apps", 0.6],
  ["/mobile-apps/ios", 0.5],
  ["/mobile-apps/android", 0.5],
  ["/our-story", 0.6],
  ["/our-story/tech-stack", 0.5],
  ["/our-story/design", 0.5],
  ["/privacy", 0.2],
  ["/terms", 0.2],
];

function entry(path: string, priority: number, lastModified?: Date): Entry {
  return { url: `${PRODUCTION_ORIGIN}${path}`, priority, lastModified };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Visitors' view: public ideas, projects, and agents only.
  const [ideas, tracks, mentors, projects, agents] = await Promise.all([
    listPublicIdeaAddresses(),
    listTracksForAcademy(),
    listMentors(),
    listProjects(),
    listAgents(),
  ]);

  return [
    ...STATIC_PAGES.map(([path, priority]) => entry(path, priority)),
    ...ideas.map((idea) => entry(ideaPath(idea.slug), 0.7, idea.updatedAt)),
    ...tracks.flatMap((track) => [
      entry(`/academy/${track.slug}`, 0.7),
      ...track.lessons.map((lesson) =>
        entry(`/academy/${track.slug}/${lesson.slug}`, 0.6),
      ),
    ]),
    ...mentors.map((mentor) =>
      entry(`/mentorship/mentors/${mentor.id}`, 0.4, mentor.updatedAt),
    ),
    ...projects.map((project) =>
      entry(`/build/${project.id}`, 0.5, project.updatedAt),
    ),
    ...agents.map((agent) => entry(`/agents/${agent.id}`, 0.4, agent.updatedAt)),
  ];
}
