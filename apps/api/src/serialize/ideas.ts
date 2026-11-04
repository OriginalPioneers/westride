import type { AgentSummary, Idea, IdeaDetail, Person, ProjectSummary } from "@westride/api-client";
import type { AgentWithDetails } from "@westride/db/agents";
import type { ProjectWithDetails } from "@westride/db/build";
import type { IdeaWithDetails } from "@westride/db/ideas";
import { resolvePeople } from "../people";

export function ideaPeopleIds(idea: IdeaWithDetails): string[] {
  return idea.members.map((member) => member.clerkUserId);
}

export function toIdea(
  idea: IdeaWithDetails,
  people: Map<string, Person>,
  viewerId: string | null,
): Idea {
  const members = idea.members.map((member) => ({
    ...(people.get(member.clerkUserId) ?? {
      id: member.clerkUserId,
      name: "WeStride member",
      username: null,
      imageUrl: null,
    }),
    role: member.role,
  }));
  return {
    id: idea.id,
    slug: idea.slug,
    name: idea.name,
    description: idea.description,
    type: idea.type,
    imageUrl: idea.imageUrl,
    isPublic: idea.isPublic,
    isFeatured: idea.isFeatured,
    origin: idea.origin,
    prototypeUrl: idea.prototypeUrl,
    prototypeInstructions: idea.prototypeInstructions,
    wants: {
      tokens: idea.wantsTokens,
      compute: idea.wantsCompute,
      capital: idea.wantsCapital,
    },
    categories: idea.tags.map((tag) => ({ slug: tag.slug, name: tag.name })),
    countries: idea.countries.map((country) => ({ code: country.code, name: country.name })),
    members,
    githubRepo: idea.githubRepo
      ? {
          owner: idea.githubRepo.owner,
          name: idea.githubRepo.name,
          htmlUrl: idea.githubRepo.htmlUrl,
          defaultBranch: idea.githubRepo.defaultBranch,
          isPrivate: idea.githubRepo.isPrivate,
        }
      : null,
    capitalLinks: idea.capitalLinks.map((link) => ({ url: link.url, label: link.label })),
    followerCount: idea.followerCount,
    isFollowing: idea.isFollowing,
    viewerRole:
      viewerId === null
        ? null
        : (idea.members.find((member) => member.clerkUserId === viewerId)?.role ?? null),
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
  };
}

export async function toIdeas(ideas: IdeaWithDetails[], viewerId: string | null): Promise<Idea[]> {
  const people = await resolvePeople(ideas.flatMap(ideaPeopleIds));
  return ideas.map((idea) => toIdea(idea, people, viewerId));
}

export function toProjectSummary(project: ProjectWithDetails): ProjectSummary {
  return { id: project.id, name: project.name, status: project.status, isPublic: project.isPublic };
}

export function toAgentSummary(agent: AgentWithDetails): AgentSummary {
  return { id: agent.id, name: agent.name, status: agent.status, isPublic: agent.isPublic };
}

export async function toIdeaDetail(
  idea: IdeaWithDetails,
  projects: ProjectWithDetails[],
  agents: AgentWithDetails[],
  viewerId: string | null,
): Promise<IdeaDetail> {
  const people = await resolvePeople(ideaPeopleIds(idea));
  return {
    ...toIdea(idea, people, viewerId),
    projects: projects.map(toProjectSummary),
    agents: agents.map(toAgentSummary),
  };
}
