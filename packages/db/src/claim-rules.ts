// Pure rules about claiming, safe to import from client components: no
// database client is loaded here.
import type { Project, ProjectMember } from "./build-schema";
import type { Idea, IdeaMember } from "./schema";

type IdeaLike = Pick<Idea, "origin"> & { members: Pick<IdeaMember, "role">[] };
type ProjectLike = Pick<Project, "origin"> & {
  members: Pick<ProjectMember, "role">[];
};

/** An imported idea nobody has taken as founder yet. */
export function isClaimableIdea(idea: IdeaLike): boolean {
  return (
    idea.origin === "IMPORT" &&
    !idea.members.some((member) => member.role === "FOUNDER")
  );
}

/** An imported project nobody owns yet. */
export function isClaimableProject(project: ProjectLike): boolean {
  return (
    project.origin === "IMPORT" &&
    !project.members.some((member) => member.role === "OWNER")
  );
}
